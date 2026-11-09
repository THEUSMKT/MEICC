/* Palco 3D: um unico contexto WebGL, fixo atras da pagina, desenha todas as cenas.
   Cada cena e uma "camada" que so atualiza e desenha quando o capitulo dela esta na tela. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { has3D, debug } from './env.js';
import { quality } from './quality.js';

const layers = [];
let renderer = null, composer = null, bloomPass = null, layersPass = null, canvas = null;
let raf = 0, last = 0, time = 0, alive = false, drawn = false;

export const view = { w: 1, h: 1, dpr: 1 };

class LayersPass extends Pass {
  constructor() { super(); this.needsSwap = false; this.list = []; }
  render(r, writeBuffer, readBuffer) {
    r.setRenderTarget(this.renderToScreen ? null : readBuffer);
    r.autoClear = false;
    r.clear();
    for (const l of this.list) {
      r.clearDepth();
      r.render(l.scene, l.camera);
    }
  }
}

export function addLayer(layer) {
  layer.from = -Infinity; layer.to = Infinity;
  layers.push(layer);
  if (alive && layer.resize) layer.resize(view);
}

/* Aponta a camera para o centro de um retangulo da tela: a cena "mora" naquele lugar da pagina. */
export function aimCamera(camera, rect, amount, zoomOut) {
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const ox = (view.w / 2 - cx) * amount, oy = (view.h / 2 - cy) * amount;
  camera.aspect = view.w / view.h;
  camera.zoom = zoomOut;
  camera.setViewOffset(view.w, view.h, ox, oy, view.w, view.h);
}

function applyQuality() {
  const q = quality.level;
  view.dpr = Math.min(window.devicePixelRatio || 1, q.dpr);
  renderer.setPixelRatio(view.dpr);
  renderer.setSize(view.w, view.h, false);
  composer.setPixelRatio(view.dpr);
  composer.setSize(view.w, view.h);
  [composer.renderTarget1, composer.renderTarget2].forEach(t => {
    if (t.samples !== q.msaa) { t.samples = q.msaa; t.dispose(); }
  });
  bloomPass.enabled = q.bloom;
  /* bloom em meia resolucao: quase o mesmo visual por uma fracao do custo */
  bloomPass.setSize(Math.round(view.w * view.dpr * 0.5), Math.round(view.h * view.dpr * 0.5));
  layers.forEach(l => { if (l.resize) l.resize(view); });
}

function resize() {
  const w = document.documentElement.clientWidth, h = window.innerHeight;
  /* a barra do navegador no celular muda a altura o tempo todo: ignora variacoes pequenas */
  if (w === view.w && Math.abs(h - view.h) < 120) return;
  view.w = w; view.h = h;
  applyQuality();
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  const ms = Math.min(250, now - last);
  last = now;
  const y = window.scrollY;
  const list = layers.filter(l => y >= l.from && y <= l.to && (!l.isOn || l.isOn()));
  if (!list.length) return; /* nada visivel: nao gasta GPU */
  const dt = Math.min(0.12, ms / 1000);
  time += dt;
  for (const l of list) l.update(dt, time, y);
  layersPass.list = list;
  composer.render(dt);
  drawn = true;
  quality.sample(ms);
}

function play() { if (alive && !raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }
function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

/* Desliga o 3D de vez e avisa os capitulos para mostrarem os visuais sem WebGL. */
export function killStage() {
  if (!alive) return;
  alive = false;
  pause();
  document.documentElement.classList.remove('is-3d');
  document.documentElement.classList.add('no3d');
  if (renderer) renderer.dispose();
  if (canvas) canvas.remove();
  window.dispatchEvent(new Event('no3d'));
}

export function startStage() {
  if (!has3D) return false;
  canvas = document.getElementById('gl');
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: !debug.forcar3d
    });
  } catch (e) {
    document.documentElement.classList.replace('is-3d', 'no3d');
    canvas.remove();
    window.dispatchEvent(new Event('no3d'));
    return false;
  }
  renderer.setClearColor(0x080c14, 1);
  renderer.toneMapping = THREE.NoToneMapping;
  const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: quality.level.msaa });
  composer = new EffectComposer(renderer, target);
  layersPass = new LayersPass();
  bloomPass = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.5, 0.1, 0.42);
  /* brilho concentrado perto da fonte: as camadas largas criavam uma nevoa sobre o texto */
  bloomPass.compositeMaterial.uniforms.bloomFactors.value = [1, 0.72, 0.36, 0.1, 0.03];
  composer.addPass(layersPass);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
  alive = true;
  view.w = document.documentElement.clientWidth;
  view.h = window.innerHeight;
  applyQuality();
  window.addEventListener('resize', resize);
  quality.onChange(applyQuality);
  quality.onGiveUp(killStage);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); killStage(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else play(); });
  play();
  return true;
}

export const stageDrawn = () => drawn;

/* Recalcula em qual trecho do scroll cada camada fica visivel (com os espacadores das cenas presas). */
export function refreshRanges() {
  const vh = window.innerHeight, y = window.scrollY;
  layers.forEach(l => {
    if (!l.el) return;
    const p = l.el.parentElement;
    const box = (p && p.classList.contains('pin-spacer') ? p : l.el).getBoundingClientRect();
    l.from = box.top + y - vh;
    l.to = box.bottom + y;
  });
}
