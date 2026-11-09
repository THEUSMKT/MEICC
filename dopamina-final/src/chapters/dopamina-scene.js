/* Cena 3D da sinapse: vesiculas liberam dopamina, receptores recebem.
   Depois as mesmas particulas sao atraidas pela esfera "Querer"; "Gostar" e pequena. */
import * as THREE from 'three';
import { addLayer, aimCamera, view } from '../core/stage.js';
import { quality } from '../core/quality.js';
import { shellMaterial, orbMaterial, pointScale, makeRng, placeLabels } from '../core/materiais.js';

const COUNT = 520;
const QUERER = { c: new THREE.Vector3(-0.56, 0.14, 0), r: 1.3 };
const GOSTAR = { c: new THREE.Vector3(1.5, -1.14, 0), r: 0.52 };

const particleV = /* glsl */`
  attribute vec4 aSeed;
  uniform float uTime, uMorph, uScale, uDpr, uFade;
  uniform vec3 uQ, uG;
  uniform float uQr, uGr;
  varying float vA;
  float ease(float t) { return t * t * (3.0 - 2.0 * t); }
  void main() {
    /* na sinapse: sai em rajadas de seis pontos de liberacao e cruza a fenda */
    float cluster = floor(aSeed.x * 6.0);
    float t = fract(uTime * 0.2 + cluster / 6.0 + aSeed.y * 0.28);
    float site = (cluster - 2.5) / 2.5;
    vec3 a0 = vec3(site * 0.62 + (aSeed.z - 0.5) * 0.12, 0.3, (aSeed.w - 0.5) * 0.6);
    vec3 a1 = vec3(site * 0.82 + (aSeed.z - 0.5) * 0.7, -0.6, (aSeed.w - 0.5) * 1.0);
    vec3 A = mix(a0, a1, ease(t));
    A.x += sin(t * 9.0 + aSeed.w * 6.28) * 0.05;
    float alphaA = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.82, t);

    /* na atracao: espiral para dentro da esfera */
    float toSmall = step(0.88, aSeed.y);
    vec3 C = mix(uQ, uG, toSmall);
    float R = mix(uQr, uGr, toSmall);
    float s = fract(uTime * 0.16 + aSeed.x);
    float r = mix(R + 1.5, R * 1.03, pow(s, 0.7));
    float th = aSeed.z * 6.283 + s * 4.5;
    float ph = acos(2.0 * aSeed.w - 1.0);
    vec3 B = C + r * vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th));
    float alphaB = smoothstep(0.0, 0.2, s) * smoothstep(1.0, 0.94, s);

    float m = smoothstep(aSeed.y * 0.5, aSeed.y * 0.5 + 0.5, uMorph);
    vec3 p = mix(A, B, m);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min((0.05 + aSeed.w * 0.05) * uScale / max(-mv.z, 0.1), 40.0 * uDpr);
    vA = mix(alphaA, alphaB, m) * uFade;
  }
`;
const particleF = /* glsl */`
  uniform vec3 uColor;
  varying float vA;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    gl_FragColor = vec4(uColor * (smoothstep(0.5, 0.2, r) * 1.2 + pow(1.0 - r, 2.0) * 0.6) * vA, 1.0);
  }
`;

export function createDopaminaLayer(section, host, labelEls) {
  const rnd = makeRng(23);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0, 7);
  const root = new THREE.Group();
  scene.add(root);

  /* ===== Sinapse ===== */
  const syn = new THREE.Group();
  root.add(syn);
  const mem = shellMaterial({ rim: '#9fb3d6', core: '#05080f', power: 2.1 });
  const memBack = shellMaterial({ rim: '#55668a', power: 3.2, side: THREE.BackSide });
  const bulbGeo = new THREE.SphereGeometry(1, 56, 40);
  const pre = new THREE.Mesh(bulbGeo, mem); pre.position.set(0, 1.05, 0); pre.scale.set(1.2, 0.86, 1.02);
  const preB = new THREE.Mesh(bulbGeo, memBack); preB.position.copy(pre.position); preB.scale.copy(pre.scale);
  const post = new THREE.Mesh(bulbGeo, mem); post.position.set(0, -2.42, 0); post.scale.set(2.5, 1.82, 1.6);
  const postB = new THREE.Mesh(bulbGeo, memBack); postB.position.copy(post.position); postB.scale.copy(post.scale);
  const axonCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 1.72, 0), new THREE.Vector3(0.28, 2.3, 0), new THREE.Vector3(-0.1, 3.0, 0)]);
  const axon = new THREE.Mesh(new THREE.TubeGeometry(axonCurve, 24, 0.24, 18), mem);
  syn.add(pre, preB, post, postB, axon);

  /* vesiculas dentro do terminal */
  const VES = 18;
  const vesMat = shellMaterial({ core: '#3a1a06', rim: '#ffb27e', hot: '#ffd6b0', power: 1.7 });
  const vesGeo = new THREE.SphereGeometry(1, 20, 14);
  vesGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(VES).map(() => rnd() * 6.28), 1));
  const ves = new THREE.InstancedMesh(vesGeo, vesMat, VES);
  ves.frustumCulled = false;
  const vesData = [];
  for (let i = 0; i < VES; i++) {
    const docked = i < 6;
    const x = docked ? ((i - 2.5) / 2.5) * 0.62 : (rnd() - 0.5) * 1.6;
    const y = docked ? 0.46 : 0.75 + rnd() * 0.8;
    const z = docked ? (rnd() - 0.5) * 0.5 : (rnd() - 0.5) * 1.1;
    vesData.push({ x, y, z, r: 0.11 + rnd() * 0.075, ph: rnd() * 6.28 });
  }
  syn.add(ves);

  /* receptores na membrana de baixo */
  const REC = 24;
  const recMat = shellMaterial({ core: '#0a1324', rim: '#c9d7f0', hot: '#ff8a3d', power: 1.5 });
  const recGeo = new THREE.CylinderGeometry(0.075, 0.05, 0.26, 12, 1);
  recGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(new Float32Array(REC).map(() => rnd() * 6.28), 1));
  const rec = new THREE.InstancedMesh(recGeo, recMat, REC);
  rec.frustumCulled = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3(), pV = new THREE.Vector3(), sV = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < REC; i++) {
    const row = i % 3, col = Math.floor(i / 3);
    const x = (col - 3.5) / 3.5 * 1.32 + (row - 1) * 0.06;
    const z = (row - 1) * 0.42;
    const yc = Math.sqrt(Math.max(0.02, 1 - (x * x) / (2.5 * 2.5) - (z * z) / (1.6 * 1.6))) * 1.82;
    pV.set(x, -2.42 + yc + 0.07, z);
    n.set(x / (2.5 * 2.5), yc / (1.82 * 1.82), z / (1.6 * 1.6)).normalize();
    q.setFromUnitVectors(yAxis, n);
    m4.compose(pV, q, sV);
    rec.setMatrixAt(i, m4);
  }
  rec.instanceMatrix.needsUpdate = true;
  syn.add(rec);

  /* ===== Querer e Gostar ===== */
  const orbs = new THREE.Group();
  root.add(orbs);
  const sphere = new THREE.SphereGeometry(1, 64, 48);
  const qMat = orbMaterial('#7d3008', '#ff8a3d', '#ffd6b0');
  const gMat = orbMaterial('#1a2336', '#7488ad', '#dbe5f7');
  const qM = new THREE.Mesh(sphere, qMat); qM.position.copy(QUERER.c); qM.scale.setScalar(QUERER.r);
  const gM = new THREE.Mesh(sphere, gMat); gM.position.copy(GOSTAR.c); gM.scale.setScalar(GOSTAR.r);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#9aa8c2', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(QUERER.r * 1.26, 0.009, 8, 120), ringMat);
  ring.position.copy(QUERER.c);
  ring.rotation.x = 1.25;
  orbs.add(qM, gM, ring);

  /* ===== Particulas de dopamina ===== */
  const seeds = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT * 4; i++) seeds[i] = rnd();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  const pu = {
    uTime: { value: 0 }, uMorph: { value: 0 }, uScale: { value: 500 }, uDpr: { value: 1 }, uFade: { value: 1 },
    uQ: { value: QUERER.c }, uG: { value: GOSTAR.c }, uQr: { value: QUERER.r }, uGr: { value: GOSTAR.r },
    uColor: { value: new THREE.Color('#ff9d5c') }
  };
  const pm = new THREE.ShaderMaterial({
    vertexShader: particleV, fragmentShader: particleF, uniforms: pu,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true
  });
  const pts = new THREE.Points(geo, pm);
  pts.frustumCulled = false;
  root.add(pts);
  const applyCount = () => geo.setDrawRange(0, Math.round(COUNT * Math.max(0.35, quality.level.particles)));
  applyCount();
  quality.onChange(applyCount);

  const labels = [
    { el: labelEls.ves, pos: new THREE.Vector3(0.05, 1.5, 0.3), set: 0 },
    { el: labelEls.dop, pos: new THREE.Vector3(1.32, -0.14, 0.3), set: 0 },
    { el: labelEls.rec, pos: new THREE.Vector3(-1.12, -1.2, 0.3), set: 0 },
    { el: labelEls.querer, pos: QUERER.c.clone(), set: 1 },
    { el: labelEls.gostar, pos: GOSTAR.c.clone(), set: 1 }
  ];

  let morph = 0, morphT = 0, dim = 0, dimT = 0, px = 0;
  window.addEventListener('pointermove', e => { px = e.clientX / window.innerWidth - 0.5; }, { passive: true });
  const dummy = new THREE.Object3D();

  addLayer({
    name: 'sinapse', scene, camera, el: section, bloom: true,
    resize() { pu.uDpr.value = view.dpr; },
    update(dt, t) {
      morph += (morphT - morph) * (1 - Math.exp(-dt * 5));
      dim += (dimT - dim) * (1 - Math.exp(-dt * 5));
      root.rotation.y = Math.sin(t * 0.22) * 0.1 + px * 0.22;
      root.rotation.x = Math.cos(t * 0.17) * 0.035;

      const rect = host.getBoundingClientRect();
      aimCamera(camera, rect, 1, Math.min(rect.width, rect.height) / view.h * 1.02);
      camera.updateProjectionMatrix();
      pu.uScale.value = pointScale(camera, view);
      pu.uTime.value = t;
      pu.uMorph.value = morph;

      const on = 1 - dim * 0.82;
      const fadeSyn = (1 - morph) * on;
      [mem, memBack, vesMat, recMat].forEach(m => { m.uniforms.uOp.value = fadeSyn; m.uniforms.uTime.value = t; });
      syn.visible = fadeSyn > 0.01;
      const fadeOrb = morph * on;
      qMat.uniforms.uOp.value = fadeOrb; gMat.uniforms.uOp.value = fadeOrb; ringMat.opacity = 0.5 * fadeOrb;
      orbs.visible = fadeOrb > 0.01;
      pu.uFade.value = on;
      ring.rotation.z = t * 0.5;

      if (syn.visible) {
        for (let i = 0; i < VES; i++) {
          const d = vesData[i];
          dummy.position.set(d.x + Math.sin(t * 0.5 + d.ph) * 0.04, d.y + Math.cos(t * 0.6 + d.ph) * 0.04, d.z);
          dummy.scale.setScalar(d.r);
          dummy.updateMatrix();
          ves.setMatrixAt(i, dummy.matrix);
        }
        ves.instanceMatrix.needsUpdate = true;
      }

      camera.updateMatrixWorld();
      root.updateMatrixWorld();
      placeLabels(labels, camera, rect, root, view);
      labels.forEach(l => { l.el.style.opacity = l.set === 0 ? fadeSyn : fadeOrb; });
    }
  });

  return {
    setProgress(p) {
      morphT = THREE.MathUtils.smoothstep(p, 0.12, 0.42);
      dimT = THREE.MathUtils.smoothstep(p, 0.62, 0.9);
    }
  };
}
