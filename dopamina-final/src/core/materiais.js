/* Materiais compartilhados pelas cenas 3D. */
import * as THREE from 'three';

const shellV = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  #ifdef USE_INSTANCING
    attribute float aPhase;
    varying float vPhase;
  #endif
  void main() {
    vec4 p = vec4(position, 1.0);
    vec3 n = normal;
    #ifdef USE_INSTANCING
      p = instanceMatrix * p;
      n = mat3(instanceMatrix) * n;
      vPhase = aPhase;
    #endif
    vec4 mv = modelViewMatrix * p;
    vN = normalize(normalMatrix * n);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const shellF = /* glsl */`
  uniform vec3 uCore, uRim, uHot;
  uniform float uOp, uPow, uTime;
  varying vec3 vN;
  varying vec3 vV;
  #ifdef USE_INSTANCING
    varying float vPhase;
  #endif
  void main() {
    float nv = abs(dot(normalize(vN), normalize(vV)));
    float f = pow(1.0 - nv, uPow) * smoothstep(0.0, 0.1, nv);
    vec3 rim = uRim;
    float flash = 0.0;
    #ifdef USE_INSTANCING
      flash = pow(0.5 + 0.5 * sin(uTime * 1.5 + vPhase), 8.0);
      rim = mix(uRim, uHot, flash);
    #endif
    gl_FragColor = vec4((uCore * (1.0 + flash * 2.0) + rim * f * (1.0 + flash)) * uOp, 1.0);
  }
`;

/* Casca translucida com borda iluminada: membranas, vesiculas e receptores. */
export function shellMaterial({ core = '#000000', rim = '#8fa3c7', hot = '#ff8a3d', power = 2.6, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: shellV, fragmentShader: shellF, side,
    uniforms: {
      uCore: { value: new THREE.Color(core) }, uRim: { value: new THREE.Color(rim) }, uHot: { value: new THREE.Color(hot) },
      uOp: { value: 1 }, uPow: { value: power }, uTime: { value: 0 }
    },
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true
  });
}

const orbF = /* glsl */`
  uniform vec3 uDark, uBase, uLight;
  uniform float uOp;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 N = normalize(vN), V = normalize(vV);
    float d = max(dot(N, normalize(vec3(-0.5, 0.72, 0.62))), 0.0);
    float f = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 c = mix(uDark, uBase, smoothstep(0.0, 0.72, d));
    c = mix(c, uLight, pow(d, 7.0) * 0.9);
    c += uBase * f * 0.55;
    /* borda suave: evita o serrilhado sem custo de antialiasing */
    gl_FragColor = vec4(c, uOp * smoothstep(0.0, 0.14, max(dot(N, V), 0.0)));
  }
`;

/* Esfera solida com a mesma paleta das esferas aprovadas (claro no topo, escuro embaixo). */
export function orbMaterial(dark, base, light) {
  return new THREE.ShaderMaterial({
    vertexShader: shellV, fragmentShader: orbF,
    uniforms: {
      uDark: { value: new THREE.Color(dark) }, uBase: { value: new THREE.Color(base) }, uLight: { value: new THREE.Color(light) },
      uOp: { value: 1 }
    },
    transparent: true, depthWrite: true, depthTest: true
  });
}

/* Numero de pixels por unidade do mundo a distancia 1: usado para o tamanho dos pontos. */
export function pointScale(camera, view) {
  return view.h * view.dpr * camera.zoom / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
}

export function makeRng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/* Rotulos HTML presos a pontos 3D: texto sempre nitido, mesmo com a cena em baixa resolucao. */
const v = new THREE.Vector3();
export function placeLabels(labels, camera, rect, group, view) {
  for (const l of labels) {
    v.copy(l.pos);
    if (group) group.localToWorld(v);
    v.project(camera);
    let x = (v.x + 1) / 2 * view.w - rect.left;
    const y = (1 - v.y) / 2 * view.h - rect.top;
    /* em tela estreita o rotulo nao pode sair pela lateral */
    if (view.w < 560) {
      if (!l.half || document.fonts.status !== 'loaded') l.half = l.el.offsetWidth / 2;
      x = Math.max(8 + l.half - rect.left, Math.min(view.w - 8 - l.half - rect.left, x));
    }
    l.el.style.transform = 'translate(-50%,-50%) translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
  }
}
