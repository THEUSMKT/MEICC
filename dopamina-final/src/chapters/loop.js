/* Capitulo 5: Loop. O celular sobe em 3D e o app pode se demonstrar sozinho (tecla D).
   A demonstracao clica nos botoes de verdade, mas roda em memoria: nada e gravado. */
import { $, $$ } from '../core/dom.js';
import { reduce } from '../core/env.js';
import { gsap, ScrollTrigger } from '../core/gsap.js';
import { registerFx, registerKey, goToChapter } from '../core/nav.js';
import { revealLines, revealBlur } from '../core/fx.js';
import { initLoopApp } from './loop-app.js';

const DEMO_PAUSE = 4.5; /* segundos: a contagem mostra de 10 a 1, acelerada */

export function initLoop() {
  const el = $('#loop');
  const app = initLoopApp();
  const screen = $('.screen', el);
  const finger = $('#tap');
  const btn = $('#demoBtn');
  const tag = $('#autoTag');
  let run = 0; /* token: cada demonstracao tem o seu; trocar o token cancela a anterior */
  let active = false;

  const wait = (ms, id) => new Promise(res => setTimeout(() => res(id === run), ms));

  async function tap(sel, id) {
    if (id !== run) return false;
    const target = typeof sel === 'string' ? $(sel, screen) : sel;
    if (!target) return false;
    const s = screen.getBoundingClientRect(), r = target.getBoundingClientRect();
    const x = r.left - s.left + r.width / 2, y = r.top - s.top + r.height / 2;
    if (reduce) {
      gsap.set(finger, { x, y, opacity: 0.9 });
    } else {
      gsap.to(finger, { x, y, opacity: 0.9, duration: 0.42, ease: 'power3.inOut', overwrite: 'auto' });
      await wait(440, id);
      if (id !== run) return false;
      gsap.fromTo(finger, { scale: 1 }, { scale: 0.62, duration: 0.09, yoyo: true, repeat: 1 });
      await wait(120, id);
    }
    if (id !== run) return false;
    target.click();
    return true;
  }

  const until = async (fn, id, limit = 9000) => {
    const t0 = performance.now();
    while (id === run && !fn() && performance.now() - t0 < limit) await wait(60, id);
  };

  function setUi(on) {
    active = on;
    tag.hidden = !on;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('.lbl', btn).textContent = on ? 'Parar demonstração' : 'Demonstração automática';
    gsap.to(finger, { opacity: 0, duration: 0.2, overwrite: 'auto' });
  }

  function stop() {
    if (!active) return;
    run++;
    setUi(false);
    app.sandboxOff();
  }

  async function start() {
    const id = ++run;
    setUi(true);
    app.sandboxOn(DEMO_PAUSE);
    await wait(500, id);
    if (!await tap('#btnWant', id)) return;
    await wait(420, id);
    if (!await tap('[data-chip="trigger"][data-val="tedio"]', id)) return;
    await wait(260, id);
    if (!await tap('[data-chip="app"][data-val="Instagram"]', id)) return;
    await wait(300, id);
    if (!await tap('#btnTrigNext', id)) return;
    await until(() => !$('#btnOpen').disabled, id);
    await wait(420, id);
    if (!await tap('#btnOpen', id)) return;
    app.fakeUse(12);
    await wait(1700, id);
    if (!await tap('[data-act="finish"]', id)) return;
    await wait(650, id);
    if (!await tap('[data-act="feel"][data-val="tempo"]', id)) return;
    await wait(900, id);
    if (!await tap('[data-act="toPattern"]', id)) return;
    /* o resumo fica na tela enquanto a pessoa fala; sai com D, Esc, um clique ou ao mudar de capitulo */
    gsap.to(finger, { opacity: 0, duration: 0.3, overwrite: 'auto' });
  }

  function toggle() {
    if (active) { stop(); return; }
    const r = el.getBoundingClientRect();
    if (Math.abs(r.top) > window.innerHeight * 0.3) goToChapter(4);
    start();
  }

  btn.addEventListener('click', toggle);
  registerKey('d', toggle);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') stop(); });
  /* um clique de verdade no celular encerra a demonstracao e volta ao modo real */
  app.root.addEventListener('click', e => {
    if (active && e.isTrusted) { e.stopPropagation(); e.preventDefault(); stop(); }
  }, true);

  const phone = $('.phone-lift', el);
  const copy = $('.loop-copy', el);
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
