/* Efeitos globais: progresso do scroll, brilho no cursor, resposta tatil, entradas e parallax. */
import { gsap, ScrollTrigger, SplitText } from './gsap.js';
import { $, $$ } from './dom.js';
import { reduce, hover } from './env.js';
import { quality } from './quality.js';
import { registerFx, registerKey } from './nav.js';

/* Conta ate o valor final. O texto final ja esta no HTML: sem animacao, nada muda. */
export function countUp(el, opts = {}) {
  const to = parseFloat(el.dataset.count);
  const dec = +(el.dataset.dec || 0);
  const pre = el.dataset.pre || '', suf = el.dataset.suf || '';
  const fmt = v => pre + v.toFixed(dec).replace('.', ',') + suf;
  if (reduce) { el.textContent = fmt(to); return null; }
  const o = { v: 0 };
  return gsap.to(o, {
    v: to, duration: opts.duration || 1.3, delay: opts.delay || 0, ease: 'power2.out',
    onUpdate: () => { el.textContent = fmt(o.v); },
    onComplete: () => { el.textContent = fmt(to); }
  });
}

/* Texto que entra linha por linha, saindo de tras de uma mascara. */
export function revealLines(el, opts = {}) {
  if (reduce || !el) return;
  SplitText.create(el, {
    type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
    onSplit(self) {
      return gsap.from(self.lines, {
        yPercent: 112, duration: opts.duration || 0.95, ease: 'expo.out', stagger: 0.09, delay: opts.delay || 0,
        scrollTrigger: opts.immediate ? undefined : { trigger: opts.trigger || el, start: opts.start || 'top 80%', once: true }
      });
    }
  });
}

/* Paragrafo que sai do desfoque e fica nitido. */
export function revealBlur(el, opts = {}) {
  if (reduce || !el) return;
  gsap.from(el, {
    autoAlpha: 0, y: 18, filter: 'blur(8px)', duration: 0.9, ease: 'power3.out', delay: opts.delay || 0, clearProps: 'filter',
    scrollTrigger: opts.immediate ? undefined : { trigger: opts.trigger || el, start: opts.start || 'top 80%', once: true }
  });
}

function initProgress() {
  const bar = $('#progresso i');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => { bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; },
    onRefresh: self => { bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }
  });
}

function initGlow() {
  const glow = $('#brilho');
  if (reduce || !hover) { glow.remove(); return; }
  const x = gsap.quickTo(glow, 'x', { duration: 0.55, ease: 'power3' });
  const y = gsap.quickTo(glow, 'y', { duration: 0.55, ease: 'power3' });
  let on = false;
  window.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    if (!on) { on = true; glow.classList.add('on'); }
    x(e.clientX); y(e.clientY);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { on = false; glow.classList.remove('on'); });
}

function initTactile() {
  if (reduce) return;
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn,.chip,.feel-btn,.icon-btn,.who,.tabs button,.mini-btn');
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    const d = Math.max(r.width, r.height) * 1.3;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    b.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
    if (e.pointerType === 'touch' && navigator.vibrate) navigator.vibrate(8);
  }, { passive: true });
}

function initTilt() {
  if (reduce || !hover) return;
  $$('.tilt').forEach(el => {
    el.addEventListener('pointermove', ev => {
      if (ev.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width - 0.5;
      const py = (ev.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--ry', '0deg'); el.style.setProperty('--rx', '0deg'); });
  });
}

/* Transicao entre capitulos: o conteudo abre em clip-path e ganha profundidade; ao sair, afunda. */
function chapterTransitions(mode) {
  if (reduce) return;
  $$('.chapter:not(#abertura):not(.foot)').forEach(sec => {
    const wrap = $('.wrap', sec), depth = $('.depth', sec);
    if (!wrap) return;
    gsap.fromTo(wrap,
      { clipPath: 'inset(9% 5% 9% 5% round 28px)', scale: 0.94, autoAlpha: 0.1 },
      {
        clipPath: 'inset(-30% -30% -30% -30% round 0px)', scale: 1, autoAlpha: 1, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top 96%', end: mode === 'pin' ? 'top 22%' : 'top 62%', scrub: true }
      });
    if (!depth || mode !== 'pin') return;
    gsap.to(depth, {
      scale: 0.93, autoAlpha: 0, ease: 'power1.in',
      scrollTrigger: {
        trigger: sec,
        start: () => {
          const st = ScrollTrigger.getAll().find(s => s.pin === sec);
          return (st ? st.end : sec.offsetTop + sec.offsetHeight - window.innerHeight);
        },
        end: () => '+=' + window.innerHeight * 0.75, scrub: true, invalidateOnRefresh: true
      }
    });
  });
}

function parallax() {
  if (reduce) return;
  $$('[data-parallax]').forEach(el => {
    const k = parseFloat(el.dataset.parallax);
    const sec = el.closest('.chapter');
    gsap.fromTo(el, { y: () => window.innerHeight * k }, {
      y: () => -window.innerHeight * k, ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
    });
  });
}

function toggleBar() {
  const off = document.body.classList.toggle('bar-off');
  const b = $('#bar');
  if (off) b.setAttribute('inert', ''); else b.removeAttribute('inert');
  window.dispatchEvent(new Event('esconder-barra')); /* a tecla H tambem fecha o roteiro */
}

export function initFx() {
  initGlow();
  initTactile();
  initTilt();
  registerKey('h', toggleBar);
  const applyGlow = () => {
    const g = $('#brilho');
    if (g) g.hidden = quality.level.name === 'minimo' || quality.level.name === 'baixo';
  };
  applyGlow();
  quality.onChange(applyGlow);
  registerFx(mode => {
    initProgress();
    chapterTransitions(mode);
    parallax();
  });
}
