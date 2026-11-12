/* Capitulo 5: Loop. O celular sobe em 3D e o app pode se demonstrar sozinho (tecla D), em ritmo de fala.
   A demonstracao usa as telas e os botoes de verdade, mas roda em memoria: nada e gravado. */
import { $, $$ } from '../core/dom.js';
import { reduce, debug } from '../core/env.js';
import { gsap, ScrollTrigger } from '../core/gsap.js';
import { registerFx, registerKey, goToChapterId, setNavBlocker, getMode } from '../core/nav.js';
import { revealLines, revealBlur } from '../core/fx.js';
import { initLoopApp } from './loop-app.js';
import { topoLivre } from '../core/trilho.js';

const TRANS = 600, RING = 550, SCROLL = 700; /* milissegundos na velocidade Normal */
const SPEEDS = { 1: { f: 1.5, nome: 'Lento' }, 2: { f: 1, nome: 'Normal' }, 3: { f: 0.75, nome: 'Rápido' } };
const FAST = debug.demoSpeed === 'fast'; /* so para testes automatizados */

/* ms: tempo minimo na tela, na velocidade Normal. No passo 3, o relogio so anda depois dos 10 s reais do anel. */
const STEPS = [
  /* cada legenda liga o passo do app a uma etapa do ciclo do habito */
  { view: 'home', ms: 6000, btn: '#btnWant', cap: 'Gatilho: você sente a vontade e registra.' },
  {
    view: 'trigger', ms: 7000, btn: '#btnTrigNext', cap: 'Gatilho: o que você sente e em qual app.',
    at: [[1900, '[data-chip="trigger"][data-val="tedio"]'], [3800, '[data-chip="app"][data-val="Instagram"]']]
  },
  { view: 'pause', ms: 2000, btn: '#btnOpen', cap: 'Antes do comportamento: a pausa de 10 segundos.', until: () => !$('#btnOpen').disabled },
  { view: 'using', ms: 7000, btn: '[data-act="finish"]', cap: 'Comportamento: você usa o celular.' },
  { view: 'feel', ms: 7000, btn: '[data-act="feel"][data-val="tempo"]', cap: 'Consequência: como foi?' },
  { view: 'done', ms: 4000, btn: '[data-act="toPattern"]', cap: 'Registro salvo.' },
  { view: 'pattern', cap: 'O padrão fica visível.' }
];
const LAST = STEPS.length - 1;

export function initLoop() {
  const el = $('#loop');
  const app = initLoopApp();
  const screen = $('.screen', el);
  const finger = $('#tap');
  const btn = $('#demoBtn');
  const tag = $('#autoTag');
  const copy = $('.loop-copy', el);
  const panel = $('#demoPanel');
  const ticks = STEPS.map(() => $('#dpTicks').appendChild(document.createElement('i')));
  let token = 0; /* cada passo tem o seu; trocar o token cancela o que estava esperando */
  let active = false, cur = 0, paused = false, manual = false, speed = 2, leaving = false;

  const factor = () => (FAST ? 0.05 : SPEEDS[speed].f);
  const target = s => (s.btn ? $(s.btn, screen) : null);

  /* em tela grande a legenda ocupa o lugar do texto, ao lado do celular */
  function place() {
    if (getMode() !== 'pin') { panel.style.cssText = ''; return; }
    const c = copy.getBoundingClientRect(), b = btn.getBoundingClientRect();
    const top = Math.max(topoLivre(), c.top);
    panel.style.left = c.left + 'px';
    panel.style.top = top + 'px';
    panel.style.width = c.width + 'px';
    panel.style.height = Math.max(240, b.top - top - 14) + 'px';
  }

  function seals() {
    $('#dpSpeed').textContent = SPEEDS[speed].nome;
    $('#dpMode').textContent = manual ? 'Manual' : 'Automático';
    $('#dpPaused').hidden = !paused;
  }

  function paint() {
    const s = STEPS[cur], src = $('#dpSrc');
    $('#dpStep').textContent = (cur + 1) + ' de ' + STEPS.length;
    $('#dpCap').textContent = s.cap;
    src.textContent = s.src || '';
    src.hidden = !s.src;
    ticks.forEach((t, k) => t.classList.toggle('on', k <= cur));
    tag.hidden = cur === LAST; /* no resumo, a etiqueta que importa e "Dados de exemplo" */
    seals();
    place();
  }

  /* anel que se expande sobre o botao que a demonstracao vai apertar */
  function ringAt(button) {
    if (reduce || !button) return;
    const s = screen.getBoundingClientRect(), r = button.getBoundingClientRect();
    gsap.fromTo(finger,
      { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2, scale: 0.3, opacity: 1 },
      { scale: 2, opacity: 0, duration: RING / 1000 * factor(), ease: 'power2.out', overwrite: 'auto' });
  }

  /* Antes de tocar, rola a tela do celular ate o botao. Se ele faz parte de uma pergunta
     ("Qual app?"), a pergunta sobe junto, para a plateia ver as opcoes. */
  const views = $('#views', screen);
  function reveal(b) {
    if (!b) return false;
    const v = views.getBoundingClientRect(), r = b.getBoundingClientRect();
    const group = b.closest('.chips');
    const lead = group && /^H[34]$/.test((group.previousElementSibling || {}).tagName || '') ? group.previousElementSibling : null;
    const top = lead ? lead.getBoundingClientRect().top : r.top;
    if (top >= v.top - 1 && r.bottom <= v.bottom + 1) return false;
    let d;
    if (lead && r.bottom - top <= v.height - 20) d = top - v.top - 8;
    else d = r.bottom > v.bottom ? r.bottom - v.bottom + 12 : r.top - v.top - 8;
    if (Math.abs(d) < 2) return false;
    views.scrollTo({ top: views.scrollTop + d, behavior: reduce ? 'auto' : 'smooth' });
    return true;
  }

  async function press(sel, t) {
    const b = $(sel, screen);
    if (reveal(b) && !await clock(SCROLL, t, { always: true })) return;
    ringAt(b);
    setTimeout(() => { if (t === token && b && !b.disabled) b.click(); }, Math.min(260, RING * factor() / 2));
  }

  /* Relogio da demonstracao: para com a pausa, segue a velocidade e, no modo manual, nao encerra o passo. */
  function clock(ms, t, opts = {}) {
    const at = opts.at || [];
    return new Promise(res => {
      let el2 = 0, last = performance.now(), fired = 0;
      const id = setInterval(() => {
        if (t !== token) { clearInterval(id); res(false); return; }
        const now = performance.now(), dt = now - last;
        last = now;
        place();
        if (paused && !opts.always) return;
        if (opts.until && !opts.until()) return;
        el2 += dt / factor();
        while (fired < at.length && el2 >= at[fired][0]) press(at[fired++][1], t);
        if (el2 >= ms && !(opts.gate && manual)) { clearInterval(id); res(true); }
      }, 30);
    });
  }

  async function leave(i, t, always) {
    leaving = true;
    if (reveal(target(STEPS[i])) && !await clock(SCROLL, t, { always })) return;
    ringAt(target(STEPS[i]));
    if (!await clock(RING, t, { always })) return;
    const b = target(STEPS[i]), next = STEPS[i + 1];
    if (b && !b.disabled && b.offsetParent) {
      b.click();
      if (next.view === 'using') app.fakeUse(12);
    } else {
      /* o apresentador pulou o passo antes de o botao ficar disponivel */
      app.demoState(next.view);
    }
    run(i + 1);
  }

  async function run(i) {
    const t = ++token;
    cur = i;
    leaving = false;
    paint();
    app.freeze(paused);
    if (!reduce) gsap.fromTo(app.viewEl(), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: TRANS / 1000 * factor(), ease: 'power2.out', clearProps: 'all' });
    if (!await clock(TRANS, t)) return;
    if (i === LAST) return; /* o resumo fica na tela ate o apresentador avancar */
    const s = STEPS[i];
    if (!await clock(s.ms, t, { until: s.until, at: s.at, gate: true })) return;
    leave(i, t, false);
  }

  function next() {
    if (!leaving) leave(cur, ++token, true);
  }

  function prev() {
    if (cur === 0) return;
    app.demoState(STEPS[cur - 1].view);
    run(cur - 1);
  }

  function setUi(on) {
    active = on;
    tag.hidden = !on;
    panel.hidden = !on;
    el.classList.toggle('demo-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('.lbl', btn).textContent = on ? 'Parar demonstração' : 'Ver demonstração';
    gsap.set(finger, { opacity: 0 });
  }

  function stop() {
    if (!active) return;
    token++;
    setUi(false);
    gsap.killTweensOf(app.viewEl());
    gsap.set(app.viewEl(), { clearProps: 'all' });
    app.sandboxOff();
  }

  function start() {
    paused = false; manual = false; speed = 2; leaving = false;
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    setUi(true);
    app.sandboxOn(FAST ? 0.5 : 10);
    run(0);
  }

  function toggle() {
    if (active) { stop(); return; }
    if (getMode() === 'pin') {
      if (Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 0.3) goToChapterId('loop');
    } else {
      /* no celular o que importa e ver o aparelho, logo abaixo da barra */
      const y = $('.phone-wrap', el).getBoundingClientRect().top + window.scrollY - topoLivre();
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
    start();
  }

  btn.addEventListener('click', toggle);
  registerKey('d', toggle);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') stop(); });
  window.addEventListener('resize', () => { if (active) place(); });
  /* o Espaco nao pode ativar o botao que estiver em foco */
  document.addEventListener('keyup', e => { if (active && e.key === ' ') e.preventDefault(); }, true);

  setNavBlocker(e => {
    if (!active || document.querySelector('dialog[open]')) return false;
    const k = e.key;
    const forward = k === 'PageDown' || k === 'ArrowRight' || k === 'ArrowDown';
    const back = k === 'PageUp' || k === 'ArrowLeft' || k === 'ArrowUp';
    if (forward && cur === LAST) { stop(); return false; } /* depois do resumo, a apresentacao segue */
    if (forward || back || k === ' ') {
      e.preventDefault();
      if (e.repeat) return true;
      if (forward) next();
      else if (back) prev();
      else { paused = !paused; app.freeze(paused); seals(); }
      return true;
    }
    if (SPEEDS[k]) { speed = +k; seals(); return true; }
    if (k.toLowerCase() === 'm') { manual = !manual; seals(); return true; }
    return false;
  });

  /* um clique de verdade no celular encerra a demonstracao e volta ao modo real */
  app.root.addEventListener('click', e => {
    if (active && e.isTrusted) { e.stopPropagation(); e.preventDefault(); stop(); }
  }, true);

  /* O celular endireita ao receber o ponteiro. Se o botao sair de baixo do dedo nesse instante, o navegador
     entrega o clique ao fundo da tela e o toque se perde. Um toque sem arrasto sempre vale para o botao pressionado. */
  let pressed = null, downX = 0, downY = 0;
  app.root.addEventListener('pointerdown', e => {
    pressed = e.target.closest('button');
    downX = e.clientX; downY = e.clientY;
  }, true);
  app.root.addEventListener('click', e => {
    const b = pressed;
    pressed = null;
    if (!e.isTrusted || e.defaultPrevented || !b || b.disabled) return;
    if (b.contains(e.target) || !e.target.contains(b)) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
    e.stopPropagation();
    b.click();
  }, true);

  const phone = $('.phone-lift', el);
  registerFx(mode => {
    revealLines($('h2', el), { trigger: el, start: 'top 72%' });
    revealBlur($('.lead', el), { trigger: el, start: 'top 58%' });
    ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onLeave: stop, onLeaveBack: stop });
    if (reduce) return;
    gsap.fromTo(phone,
      { y: 300, rotationX: 40, rotationY: -28, z: -300, autoAlpha: 0.2 },
      { y: 0, rotationX: 0, rotationY: 0, z: 0, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 98%', end: mode === 'pin' ? 'top 6%' : 'top 30%', scrub: 0.4 } });
    gsap.fromTo(copy, { y: 70 }, { y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: 0.4 } });
    gsap.from($$('.verbs li', el), {
      autoAlpha: 0, x: -30, duration: 0.7, ease: 'power3.out', stagger: 0.12,
      scrollTrigger: { trigger: el, start: 'top 45%', once: true }
    });
  });
}
