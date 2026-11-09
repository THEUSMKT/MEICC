/* Abertura: rede neural em WebGL com brilho, pulsos de dopamina e orbita com inercia.
   Ao rolar, a camera entra na rede e leva ao proximo capitulo. */
import * as THREE from 'three';
import { addLayer, aimCamera, view } from '../core/stage.js';
import { quality } from '../core/quality.js';

const N = 260, PULSES = 34, TRAIL = 6, SEG = 6, SIDES = 3, RADIUS = 0.0052;
const COOL = '#a9bcdd', WARM = '#ff8a3d';

const edgeV = /* glsl */`
  attribute float aPhase;
  uniform float uTime, uFade;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = -mv.z;
    vA = clamp(1.32 - (d - 1.8) * 0.5, 0.1, 1.0) * (0.72 + 0.28 * sin(uTime * 0.8 + aPhase)) * uFade;
  }
`;
const edgeF = /* glsl */`
  uniform vec3 uColor;
  varying float vA;
  void main() { gl_FragColor = vec4(uColor * vA * 0.34, 1.0); }
`;
const pointV = /* glsl */`
  attribute float aSize;
  attribute float aE;
  uniform float uScale, uFade, uDpr;
  varying float vE;
  varying float vD;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = max(-mv.z, 0.05);
    gl_PointSize = min(aSize * uScale / d * (1.0 + aE * 0.45), 150.0 * uDpr);
    vD = clamp(1.34 - (d - 1.8) * 0.5, 0.16, 1.0) * uFade * smoothstep(0.05, 0.4, d);
    vE = aE;
  }
`;
const pointF = /* glsl */`
  uniform vec3 uCool, uWarm;
  uniform float uHot;
  varying float vE;
  varying float vD;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float core = smoothstep(0.42, 0.28, r);
    float halo = pow(1.0 - r, 2.4);
    float e = clamp(vE + uHot, 0.0, 1.0);
    vec3 c = mix(uCool, uWarm, e);
    gl_FragColor = vec4(c * (core * (0.62 + e * 0.9) + halo * (0.15 + e * 0.75)) * vD, 1.0);
  }
`;

function points(count, uniforms) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), size = new Float32Array(count), e = new Float32Array(count);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aE', new THREE.BufferAttribute(e, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: pointV, fragmentShader: pointF, uniforms,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true
  });
  const obj = new THREE.Points(geo, mat);
  obj.frustumCulled = false;
  return { obj, geo, pos, size, e };
}

export function createNetLayer(section, hit) {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  /* ===== Neuronios ===== */
  const P = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const inner = rnd() < 0.2;
    const k = inner ? 0.18 + rnd() * 0.42 : 0.72 + rnd() * 0.32;
    P.push(new THREE.Vector3(Math.cos(th) * r * k * 1.14, y * k * 0.96, Math.sin(th) * r * k));
  }

  /* ===== Sinapses: cada ligacao e um tubo fino e curvo ===== */
  const edges = [];
  const adj = P.map(() => []);
  const seen = new Set();
  const link = (a, b) => {
    const key = Math.min(a, b) * 1000 + Math.max(a, b);
    if (seen.has(key)) return;
    seen.add(key);
    const mid = P[a].clone().add(P[b]).multiplyScalar(0.5);
    const len = P[a].distanceTo(P[b]);
    const c = mid.add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(len * 0.55));
    const id = edges.length;
    edges.push({ a, b, c });
    adj[a].push(id); adj[b].push(id);
  };
  for (let i = 0; i < N; i++) {
    const near = [];
    for (let j = 0; j < N; j++) if (j !== i) near.push([P[i].distanceToSquared(P[j]), j]);
    near.sort((x, y) => x[0] - y[0]);
    for (let k = 0; k < 3; k++) link(i, near[k][1]);
    if (i % 9 === 0) link(i, near[6 + (i % 5)][1]);
  }

  const v = new THREE.Vector3();
  const bez = (e, t, out) => {
    const a = P[e.a], b = P[e.b], c = e.c, s = 1 - t;
    return out.set(
      s * s * a.x + 2 * s * t * c.x + t * t * b.x,
      s * s * a.y + 2 * s * t * c.y + t * t * b.y,
      s * s * a.z + 2 * s * t * c.z + t * t * b.z
    );
  };

  const vCount = edges.length * (SEG + 1) * SIDES;
  const tube = new Float32Array(vCount * 3), phase = new Float32Array(vCount);
  const index = new Uint16Array(edges.length * SEG * SIDES * 6);
  const T = new THREE.Vector3(), A = new THREE.Vector3(), B = new THREE.Vector3(), up = new THREE.Vector3(0.3, 1, 0.2).normalize();
  let vi = 0, ii = 0;
  edges.forEach((e, ei) => {
    T.copy(P[e.b]).sub(P[e.a]).normalize();
    A.crossVectors(T, up).normalize();
    B.crossVectors(T, A).normalize();
    const ph = rnd() * 6.28;
    const base = vi;
    for (let s = 0; s <= SEG; s++) {
      bez(e, s / SEG, v);
      for (let j = 0; j < SIDES; j++) {
        const ang = j / SIDES * Math.PI * 2;
        const ca = Math.cos(ang) * RADIUS, sa = Math.sin(ang) * RADIUS;
        tube[vi * 3] = v.x + A.x * ca + B.x * sa;
        tube[vi * 3 + 1] = v.y + A.y * ca + B.y * sa;
        tube[vi * 3 + 2] = v.z + A.z * ca + B.z * sa;
        phase[vi] = ph;
        vi++;
      }
    }
    for (let s = 0; s < SEG; s++) {
      for (let j = 0; j < SIDES; j++) {
        const a = base + s * SIDES + j, b = base + s * SIDES + (j + 1) % SIDES;
        const c = a + SIDES, d = b + SIDES;
        index[ii++] = a; index[ii++] = c; index[ii++] = b;
        index[ii++] = b; index[ii++] = c; index[ii++] = d;
      }
    }
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(tube, 3));
  edgeGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  edgeGeo.setIndex(new THREE.BufferAttribute(index, 1));
  const fade = { value: 1 };
  const edgeMat = new THREE.ShaderMaterial({
    vertexShader: edgeV, fragmentShader: edgeF,
    uniforms: { uTime: { value: 0 }, uFade: fade, uColor: { value: new THREE.Color(COOL) } },
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide
  });
  const edgeMesh = new THREE.Mesh(edgeGeo, edgeMat);
  edgeMesh.frustumCulled = false;

  const shared = {
    uScale: { value: 500 }, uFade: fade, uDpr: { value: 1 },
    uCool: { value: new THREE.Color(COOL) }, uWarm: { value: new THREE.Color(WARM) }
  };
  const nodes = points(N, { ...shared, uHot: { value: 0 } });
  P.forEach((p, i) => {
    p.toArray(nodes.pos, i * 3);
    nodes.size[i] = 0.07 + rnd() * 0.075;
  });
  const pulses = points(PULSES * TRAIL, { ...shared, uHot: { value: 1 } });

  /* ===== Pulsos de dopamina ===== */
  const walkers = [];
  for (let i = 0; i < PULSES; i++) {
    const id = Math.floor(rnd() * edges.length);
    walkers.push({ id, rev: rnd() < 0.5, t: rnd(), v: 0.55 + rnd() * 0.75 });
  }
  const nextEdge = (w, node) => {
    const opts = adj[node].filter(x => x !== w.id);
    const id = opts.length ? opts[Math.floor(Math.random() * opts.length)] : w.id;
    w.rev = edges[id].b === node;
    w.id = id;
  };
  const applyPulses = () => pulses.geo.setDrawRange(0, Math.round(PULSES * Math.max(0.4, quality.level.particles)) * TRAIL);
  applyPulses();
  quality.onChange(applyPulses);

  const group = new THREE.Group();
  group.add(edgeMesh, nodes.obj, pulses.obj);
  const scene = new THREE.Scene();
  scene.add(group);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.02, 30);
  camera.position.set(0, 0, 3.05);

  /* ===== Orbita com inercia ===== */
  let ry = 0.6, rx = -0.22, vy = 0, vx = 0, dragging = false, lx = 0, ly = 0, lt = 0;
  hit.addEventListener('pointerdown', e => {
    dragging = true; lx = e.clientX; ly = e.clientY; lt = performance.now(); vy = 0; vx = 0;
    try { hit.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
  });
  hit.addEventListener('pointermove', e => {
    if (!dragging) return;
    const now = performance.now();
    const dtp = Math.max(8, now - lt) / 1000;
    const dx = (e.clientX - lx) * 0.0075, dy = (e.clientY - ly) * 0.0075;
    ry += dx; rx = Math.max(-1.1, Math.min(1.1, rx + dy));
    vy = vy * 0.6 + dx / dtp * 0.4; vx = vx * 0.6 + dy / dtp * 0.4;
    lx = e.clientX; ly = e.clientY; lt = now;
  });
  const end = () => { dragging = false; };
  hit.addEventListener('pointerup', end);
  hit.addEventListener('pointercancel', end);

  let dive = 0, diveTarget = 0, total = 1;
  const SPIN = 0.13;
  const energy = new Float32Array(N);

  const layer = {
    name: 'rede', scene, camera, el: section, bloom: true,
    resize() { shared.uDpr.value = view.dpr; },
    update(dt, t, y) {
      diveTarget = Math.max(0, Math.min(1, y / total));
      dive += (diveTarget - dive) * (1 - Math.exp(-dt * 7));
      const e = dive * dive * (3 - 2 * dive);

      if (!dragging) {
        ry += (SPIN + vy) * dt;
        rx += vx * dt;
        const k = Math.exp(-dt * 1.9);
        vy *= k; vx *= k;
        rx += (-0.22 - rx) * (1 - Math.exp(-dt * 0.5));
      }
      group.rotation.set(rx, ry, 0);

      /* pulsos percorrem as sinapses e acendem o neuronio de chegada */
      const count = pulses.geo.drawRange.count / TRAIL;
      for (let i = 0; i < count; i++) {
        const w = walkers[i];
        w.t += w.v * dt;
        while (w.t >= 1) {
          const edge = edges[w.id];
          const node = w.rev ? edge.a : edge.b;
          energy[node] = 1;
          w.t -= 1;
          nextEdge(w, node);
        }
        const edge = edges[w.id];
        for (let k = 0; k < TRAIL; k++) {
          const tt = Math.max(0, w.t - k * 0.055);
          bez(edge, w.rev ? 1 - tt : tt, v);
          const idx = i * TRAIL + k;
          v.toArray(pulses.pos, idx * 3);
          pulses.size[idx] = k === 0 ? 0.1 : 0.075 - k * 0.009;
          pulses.e[idx] = 1 - k / TRAIL;
        }
      }
      pulses.geo.attributes.position.needsUpdate = true;
      pulses.geo.attributes.aSize.needsUpdate = true;
      pulses.geo.attributes.aE.needsUpdate = true;

      const decay = Math.exp(-dt * 3.2);
      for (let i = 0; i < N; i++) { energy[i] *= decay; nodes.e[i] = energy[i]; }
      nodes.geo.attributes.aE.needsUpdate = true;

      /* a camera avanca para dentro da rede; no fim, a cena se apaga */
      const rect = hit.getBoundingClientRect();
      /* no celular a rede encolhe um pouco para nao encostar no botao nem nas laterais */
      const fit = Math.min(rect.width, rect.height) / view.h * (view.w < 560 ? 0.88 : 1);
      camera.position.z = 3.05 - e * 2.95;
      aimCamera(camera, rect, 1 - e, fit + (1 - fit) * e);
      camera.updateProjectionMatrix();
      shared.uScale.value = view.h * view.dpr * camera.zoom / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      fade.value = 1 - THREE.MathUtils.smoothstep(dive, 0.78, 1);
      edgeMat.uniforms.uTime.value = t;
    }
  };
  addLayer(layer);

  return {
    /* distancia de scroll (em px) que corresponde ao mergulho inteiro; 0 desliga o mergulho */
    setDiveDistance(px) { total = px > 0 ? px : Infinity; }
  };
}
