/* Navegacao: cenas presas ao scroll, paradas previsiveis para o controle remoto e apresentador ativo.
   Cada toque em PageDown ou PageUp vai exatamente para a proxima parada ou para a anterior. */
import { gsap, ScrollTrigger } from './gsap.js';
import { $$ } from './dom.js';
import { reduce, MQ_PIN, MQ_FLAT } from './env.js';
import { CONFIG } from './config.js';
import { curS, clockRunning, setDueHandler } from './clock.js';
import { refreshRanges } from './stage.js';

const scenes = [];
const fxList = [];
const keys = {};
const stops = [];
let chapters = [];
let mode = 'flat';
let tween = null, target = -1;
const proxy = { y: 0 };
let blocked = () => false;

export const registerScene = def => { scenes.push(def); };
export const registerFx = fn => { fxList.push(fn); };
export const registerKey = (k, fn) => { keys[k] = fn; };
export const setNavBlocker = fn => { blocked = fn; };
export const getStops = () => stops.slice();
export const getMode = () => mode;

/* ===== Cenas ===== */
function setupScene(def) {
  def.cur = -1;
  def.st = null;
  const n = def.steps;
  const apply = self => {
    const p = self.progress;
    if (def.onProgress) def.onProgress(p, self);
    const i = n > 1 ? Math.round(p * (n - 1)) : 0;
    if (i !== def.cur) {
      const prev = def.cur;
      def.cur = i;
      if (def.onStep) def.onStep(i, prev);
    }
  };
  if (mode === 'pin') {
    const per = def.perStep || 0.8;
    const distance = () => (n > 1 ? (n - 1) * per : def.hold || 0) * window.innerHeight;
    def.st = ScrollTrigger.create({
      trigger: def.el, start: 'top top', end: () => '+=' + distance(),
      pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: apply, onRefresh: apply
    });
  } else if (reduce || def.flatStatic) {
    def.cur = n - 1;
    if (def.onProgress) def.onProgress(1, null);
    if (def.onStep) def.onStep(n - 1, -1);
  } else {
    ScrollTrigger.create({
      trigger: def.el, start: def.flatStart || 'top 60%', end: def.flatEnd || 'bottom 40%',
      onUpdate: apply, onRefresh: apply
    });
  }
  if (def.setup) def.setup(mode);
}

function docTop(el) {
  const p = el.parentElement;
  const box = (p && p.classList.contains('pin-spacer') ? p : el).getBoundingClientRect();
  return Math.round(box.top + window.scrollY);
}

function rebuildStops() {
  stops.length = 0;
  chapters.forEach((ch, ci) => {
    const def = scenes.find(s => s.el === ch);
    if (def && def.st) {
      const n = def.steps, { start, end } = def.st;
      for (let i = 0; i < n; i++) {
        stops.push({ y: Math.round(n > 1 ? start + (end - start) * i / (n - 1) : start), ci, step: i });
      }
    } else {
      stops.push({ y: docTop(ch), ci, step: 0 });
    }
  });
  /* a ultima secao e longa (referencias): anda de tela em tela ate o fim */
  const last = stops[stops.length - 1];
  const max = Math.round(ScrollTrigger.maxScroll(window));
  const page = Math.round(window.innerHeight * 0.82);
  for (let y = last.y + page; y < max; y += page) stops.push({ y, ci: last.ci, step: 0 });
  if (max > stops[stops.length - 1].y + 8) stops.push({ y: max, ci: last.ci, step: 0 });
  refreshRanges();
}

/* ===== Movimento ===== */
function goToStop(idx) {
  idx = Math.max(0, Math.min(stops.length - 1, idx));
  const y = stops[idx].y;
  if (tween) tween.kill();
  if (reduce) { window.scrollTo(0, y); tween = null; target = -1; return; }
  target = idx;
  proxy.y = window.scrollY;
  const dist = Math.abs(y - proxy.y) / window.innerHeight;
  tween = gsap.to(proxy, {
    y, duration: Math.max(0.55, Math.min(1.5, 0.42 + dist * 0.5)), ease: 'power2.inOut',
    onUpdate: () => window.scrollTo(0, proxy.y),
    onComplete: () => { tween = null; target = -1; }
  });
}

function step(dir) {
  if (!stops.length) return;
  if (target >= 0) { goToStop(target + dir); return; }
  const y = window.scrollY;
  if (dir > 0) {
    const i = stops.findIndex(s => s.y > y + 4);
    if (i >= 0) goToStop(i);
  } else {
    let i = -1;
    stops.forEach((s, k) => { if (s.y < y - 4) i = k; });
    if (i >= 0) goToStop(i);
  }
}

const stopTween = () => { if (tween) { tween.kill(); tween = null; target = -1; } };

/* ===== Inicio ===== */
export function initNav() {
  chapters = $$('.chapter');
  const who = $$('.who');
  let curIdx = 0;
  const presenterNow = () => +chapters[curIdx].dataset.p;
  const shouldBe = e => e < CONFIG.cortes[0] ? 0 : e < CONFIG.cortes[1] ? 1 : 2;
  function updateDue(e) {
    const p = presenterNow();
    const want = shouldBe(e);
    who.forEach((w, i) => w.classList.toggle('due', clockRunning() && p >= 0 && i === want && want > p));
  }
  setDueHandler(updateDue);
  function onChapter() {
    const p = presenterNow();
    who.forEach((w, i) => w.setAttribute('aria-current', i === p ? 'true' : 'false'));
    updateDue(curS());
  }
  const chapIO = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) { curIdx = chapters.indexOf(en.target); onChapter(); } });
  }, { rootMargin: '-45% 0px -50% 0px' });
  chapters.forEach(c => chapIO.observe(c));

  who.forEach((w, i) => w.addEventListener('click', () => {
    const chapter = [0, 2, 4][i];
    const idx = stops.findIndex(s => s.ci === chapter);
    if (idx >= 0) goToStop(idx);
  }));

  window.addEventListener('wheel', stopTween, { passive: true });
  window.addEventListener('touchstart', stopTween, { passive: true });

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('input,textarea,select')) return;
    if (blocked(e)) return;
    const k = e.key;
    const next = k === 'ArrowDown' || k === 'PageDown' || k === 'ArrowRight';
    const prev = k === 'ArrowUp' || k === 'PageUp' || k === 'ArrowLeft';
    if (next || prev) {
      /* setas dentro do celular ficam com o app; PageUp e PageDown (controle remoto) sempre navegam */
      if (t && t.closest && t.closest('[data-nonav]') && k !== 'PageDown' && k !== 'PageUp') return;
      e.preventDefault();
      if (!e.repeat) step(next ? 1 : -1);
      return;
    }
    const fn = keys[k.toLowerCase()];
    if (fn && !e.repeat) fn(e);
  });
  onChapter();
}

export function startScenes() {
  window.__paradas = getStops; /* usado pelos testes */
  ScrollTrigger.addEventListener('refresh', rebuildStops);
  const mm = gsap.matchMedia();
  mm.add({ pin: MQ_PIN, flat: MQ_FLAT }, ctx => {
    mode = ctx.conditions.pin ? 'pin' : 'flat';
    document.documentElement.dataset.mode = mode;
    scenes.forEach(setupScene);
    fxList.forEach(fn => fn(mode));
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}
