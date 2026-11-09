/* Fundo de particulas em profundidade, comum a pagina toda. Reage ao scroll avancando em Z. */
import * as THREE from 'three';
import { addLayer, view } from './stage.js';
import { quality } from './quality.js';

const MAX = 1500;

const vertex = /* glsl */`
  attribute vec3 aSeed;
  attribute float aWarm;
  uniform float uFlow, uTime, uDpr, uBoost;
  varying float vA;
  varying float vWarm;
  void main() {
    vec3 p = position;
    float z = mod(position.z - uFlow, 40.0);
    p.z = -(z + 0.6);
    p.x += sin(uTime * 0.11 + aSeed.x * 6.28) * 0.7;
    p.y += cos(uTime * 0.09 + aSeed.y * 6.28) * 0.7;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = min((1.0 + aSeed.z * 1.6) * uDpr * 34.0 / depth, 11.0 * uDpr);
    vA = smoothstep(0.6, 6.0, depth) * smoothstep(40.0, 16.0, depth) * (0.55 + uBoost);
    vWarm = aWarm;
  }
`;

const fragment = /* glsl */`
  uniform vec3 uCool, uWarm;
  varying float vA;
  varying float vWarm;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = pow(1.0 - d, 1.8) * vA;
    gl_FragColor = vec4(mix(uCool, uWarm, vWarm) * a, 1.0);
  }
`;

export function createFundo() {
  let seed = 11;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const pos = new Float32Array(MAX * 3), sd = new Float32Array(MAX * 3), warm = new Float32Array(MAX);
  for (let i = 0; i < MAX; i++) {
    pos[i * 3] = (rnd() - 0.5) * 46;
    pos[i * 3 + 1] = (rnd() - 0.5) * 28;
    pos[i * 3 + 2] = rnd() * 40;
    sd[i * 3] = rnd(); sd[i * 3 + 1] = rnd(); sd[i * 3 + 2] = rnd();
    warm[i] = rnd() < 0.11 ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 3));
  geo.setAttribute('aWarm', new THREE.BufferAttribute(warm, 1));
  const uniforms = {
    uFlow: { value: 0 }, uTime: { value: 0 }, uDpr: { value: 1 }, uBoost: { value: 0 },
    uCool: { value: new THREE.Color('#8fa3c7') }, uWarm: { value: new THREE.Color('#ff8a3d') }
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, uniforms,
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(pts);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 60);

  let flow = 0, lastY = window.scrollY, speed = 0;
  const applyCount = () => geo.setDrawRange(0, Math.round(MAX * quality.level.particles));
  applyCount();
  quality.onChange(applyCount);

  const foot = document.getElementById('equipe');
  addLayer({
    name: 'fundo', scene, camera,
    /* o rodape e opaco: quando ele cobre a tela, o fundo para de desenhar */
    isOn: () => !foot || foot.getBoundingClientRect().top > 0,
    resize() { camera.aspect = view.w / view.h; camera.updateProjectionMatrix(); uniforms.uDpr.value = view.dpr; },
    update(dt, t, y) {
      const dy = y - lastY; lastY = y;
      speed += (Math.min(1, Math.abs(dy) / 90) - speed) * (1 - Math.exp(-dt * 6));
      const target = y / view.h * 5.5 + t * 0.32;
      flow += (target - flow) * (1 - Math.exp(-dt * 5));
      uniforms.uFlow.value = flow;
      uniforms.uTime.value = t;
      uniforms.uBoost.value = speed * 0.6;
    }
  });
}
