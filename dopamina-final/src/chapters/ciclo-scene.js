/* Cena 3D do ciclo do habito: o anel gira e cada etapa vem para a frente.
   No fim, a pausa de 10 segundos quebra o anel entre a consequencia e o gatilho. */
import * as THREE from 'three';
import { addLayer, aimCamera, view } from '../core/stage.js';
import { quality } from '../core/quality.js';
import { orbMaterial, pointScale, makeRng, placeLabels } from '../core/materiais.js';

const R = 1.78, COUNT = 340, GAP = 0.27;
const deg = d => d * Math.PI / 180;
const nodeAngle = k => deg(-90 + k * 120);
const CALM = new THREE.Color('#8fa3c7'), DIM = new THREE.Color('#3a4a6c'), AMBER = new THREE.Color('#ff8a3d');

const flowV = /* glsl */`
  attribute vec3 aSeed;
  uniform float uPhase, uBreak, uScale, uDpr, uR, uActive;
  varying float vA;
  void main() {
    float a = mod(aSeed.x * 6.283 + uPhase, 6.283);
    float r = uR + (aSeed.y - 0.5) * 0.13;
    vec3 p = vec3(cos(a) * r, sin(a) * r, (aSeed.z - 0.5) * 0.13);
    /* trecho entre consequencia e gatilho: as particulas se soltam quando o anel quebra */
    float gap = smoothstep(2.55, 2.75, a) * smoothstep(4.78, 4.58, a);
    float s = uBreak * gap;
    p += vec3(cos(a), sin(a), 0.7) * s * (0.3 + aSeed.y * 1.7);
    float d = abs(mod(a - uActive + 3.1416, 6.283) - 3.1416);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min((0.06 + aSeed.z * 0.05) * uScale / max(-mv.z, 0.1), 30.0 * uDpr);
    vA = (0.34 + 0.9 * smoothstep(1.7, 0.1, d)) * (1.0 - s) * (1.0 - uBreak * 0.45);
  }
`;
const flowF = /* glsl */`
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(uColor * (smoothstep(0.55, 0.2, r) + pow(1.0 - r, 2.0) * 0.55) * vA, 1.0);
  }
`;

function arcMesh(start, span, mat) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, 0.023, 10, 56, span), mat);
  m.rotation.z = start;
  return m;
}

export function createCicloLayer(section, host, labelEls) {
  const rnd = makeRng(41);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0, 7.4);
  const tilt = new THREE.Group();
  tilt.rotation.x = -0.95;
  const ring = new THREE.Group();
  tilt.add(ring);
  scene.add(tilt);

  /* tres arcos com seta; o terceiro e feito de duas metades, que se separam na quebra */
  const arcMats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: CALM.clone(), transparent: true }));
  const cone = new THREE.ConeGeometry(0.1, 0.24, 14);
  const arrow = (angle, mat) => {
    const m = new THREE.Mesh(cone, mat);
    m.position.set(Math.cos(angle) * R, Math.sin(angle) * R, 0);
    m.rotation.z = angle; /* a ponta do cone (eixo Y) segue a tangente do anel */
    return m;
  };
  const halves = [new THREE.Group(), new THREE.Group()];
  [0, 1].forEach(k => {
    const a = nodeAngle(k) + GAP, span = deg(120) - GAP * 2;
    ring.add(arcMesh(a, span, arcMats[k]), arrow(a + span, arcMats[k]));
  });
  {
    const a = nodeAngle(2) + GAP, span = deg(120) - GAP * 2, half = span / 2 - 0.07;
    halves[0].add(arcMesh(a, half, arcMats[2]));
    halves[1].add(arcMesh(a + span - half, half, arcMats[2]), arrow(a + span, arcMats[2]));
    ring.add(halves[0], halves[1]);
  }
  const gapMid = nodeAngle(2) + deg(60);
  const radial = new THREE.Vector3(Math.cos(gapMid), Math.sin(gapMid), 0);

  /* nos: gatilho, comportamento e consequencia */
  const sphere = new THREE.SphereGeometry(1, 48, 32);
  const nodes = [0, 1, 2].map(k => {
    const mat = orbMaterial('#1a2336', '#46597f', '#c7d4ec');
    const m = new THREE.Mesh(sphere, mat);
    const a = nodeAngle(k);
    m.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    m.scale.setScalar(0.3);
    ring.add(m);
    return m;
  });
  /* no da pausa: nasce no meio do trecho quebrado */
  const pauseMat = orbMaterial('#7d3008', '#ff8a3d', '#ffd6b0');
  const pause = new THREE.Mesh(sphere, pauseMat);
  pause.position.set(Math.cos(gapMid) * R, Math.sin(gapMid) * R, 0);
  pause.scale.setScalar(0.001);
  ring.add(pause);

  /* particulas fluindo pelas setas */
  const seeds = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT * 3; i++) seeds[i] = rnd();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const fu = {
    uPhase: { value: 0 }, uBreak: { value: 0 }, uScale: { value: 500 }, uDpr: { value: 1 }, uR: { value: R }, uActive: { value: nodeAngle(0) },
    uColor: { value: new THREE.Color('#ff9d5c') }
  };
  const flow = new THREE.Points(geo, new THREE.ShaderMaterial({
    vertexShader: flowV, fragmentShader: flowF, uniforms: fu,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true
  }));
  flow.frustumCulled = false;
  ring.add(flow);
  const applyCount = () => geo.setDrawRange(0, Math.round(COUNT * Math.max(0.35, quality.level.particles)));
  applyCount();
  quality.onChange(applyCount);

  const labelOffset = 0.56;
  const labels = [0, 1, 2].map(k => ({
    el: labelEls[k],
    pos: new THREE.Vector3(Math.cos(nodeAngle(k)) * R, Math.sin(nodeAngle(k)) * R, labelOffset)
  }));
  labels.push({ el: labelEls[3], pos: new THREE.Vector3(Math.cos(gapMid) * R, Math.sin(gapMid) * R, 0) });

  let target = 0, p = 0, phase = 0, px = 0;
  window.addEventListener('pointermove', e => { px = e.clientX / window.innerWidth - 0.5; }, { passive: true });

  addLayer({
    name: 'ciclo', scene, camera, el: section, bloom: true,
    resize() { fu.uDpr.value = view.dpr; },
    update(dt, t) {
      p += (target - p) * (1 - Math.exp(-dt * 4.5));
      const s = p * 3;
      /* 0 a 2: uma etapa por vez (120 graus); 2 a 3: traz o trecho quebrado para a frente */
      const spin = s <= 2 ? -s * 120 : -(240 + (s - 2) * 60);
      ring.rotation.z = deg(spin);
      tilt.rotation.y = px * 0.18;
      tilt.rotation.x = -0.95 + Math.sin(t * 0.3) * 0.025;

      const brk = THREE.MathUtils.smoothstep(s, 2.15, 2.85);
      nodes.forEach((n, k) => {
        const w = Math.max(0, 1 - Math.abs(Math.min(s, 2) - k) * 1.5) * (1 - brk);
        n.material.uniforms.uBase.value.lerpColors(DIM, AMBER, w);
        n.scale.setScalar(0.3 + w * 0.09);
        arcMats[k].color.lerpColors(DIM, CALM, 0.35 + (1 - brk) * 0.65);
      });
      arcMats[2].opacity = 1 - brk * 0.5;
      halves[0].position.copy(radial).multiplyScalar(brk * 0.5).add(new THREE.Vector3(Math.cos(gapMid - 0.9) * brk * 0.2, Math.sin(gapMid - 0.9) * brk * 0.2, 0));
      halves[1].position.copy(radial).multiplyScalar(brk * 0.5).add(new THREE.Vector3(Math.cos(gapMid + 0.9) * brk * 0.2, Math.sin(gapMid + 0.9) * brk * 0.2, 0));
      pause.scale.setScalar(0.001 + brk * 0.46);

      phase += dt * 0.95 * (1 - brk * 0.95);
      fu.uPhase.value = phase;
      fu.uBreak.value = brk;
      fu.uActive.value = deg(-90) - deg(spin);

      const rect = host.getBoundingClientRect();
      aimCamera(camera, rect, 1, Math.min(rect.width, rect.height) / view.h * 0.96);
      camera.updateProjectionMatrix();
      fu.uScale.value = pointScale(camera, view);
      camera.updateMatrixWorld();
      tilt.updateMatrixWorld(true);
      placeLabels(labels, camera, rect, ring, view);
    }
  });

  return { setProgress(v) { target = v; } };
}
