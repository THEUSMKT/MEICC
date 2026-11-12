/* Capitulo 2: dados. Tres cartoes em profundidade, um por toque do controle remoto. */
import { $, $$ } from '../core/dom.js';
import { reduce } from '../core/env.js';
import { gsap, ScrollTrigger } from '../core/gsap.js';
import { registerScene } from '../core/nav.js';
import { countUp, revealLines } from '../core/fx.js';

const AMBER = '#ff8a3d', OFF = '#5a6d93';

export function initDados() {
  const el = $('#dados');
  const cards = $$('.card', el);
  const dots = $$('.deck-dots i', el);

  /* grade de 100 pessoas, 27 acesas (o estado final ja nasce pronto) */
  const grid = $('#people');
  for (let i = 0; i < 100; i++) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('class', 'ic person' + (i < 27 ? ' on' : ''));
    s.setAttribute('aria-hidden', 'true');
    const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    u.setAttribute('href', '#i-user');
    s.appendChild(u);
    grid.appendChild(s);
  }
  const lit = $$('.person.on', grid);
  const bars = $$('.cbar i', el);
  const plus = $('#cmpPlus');
  const nums = i => $$('[data-count]', cards[i]);
  const zero = e => { e.textContent = (e.dataset.pre || '') + '0' + (+e.dataset.dec ? ',0' : '') + (e.dataset.suf || ''); };

  const prep = [
    () => {
      gsap.set(lit, { color: OFF, opacity: 0.75, scale: 0.82, transformOrigin: '50% 50%' });
      gsap.set(bars, { scaleY: 0, transformOrigin: '50% 100%' });
    },
    () => gsap.set(plus, { scaleX: 0, transformOrigin: '0% 50%' })
  ];
  const play = [
    () => {
      countUp(nums(0)[0]);
      gsap.to(lit, { color: AMBER, opacity: 1, scale: 1, duration: 0.3, stagger: 0.03, ease: 'back.out(2.4)', delay: 0.15 });
      gsap.to(bars, { scaleY: 1, duration: 0.8, ease: 'expo.out', stagger: 0.17, delay: 0.5 });
      nums(0).slice(1).forEach((e, k) => countUp(e, { delay: 0.5 + k * 0.17, duration: 0.7 }));
    },
    () => {
      countUp(nums(1)[0]);
      gsap.to(plus, { scaleX: 1, duration: 1.3, ease: 'power3.out', delay: 0.15 });
      countUp(nums(1)[1], { delay: 0.15 });
    }
  ];

  const done = [false, false];
  let entered = false, cur = 0, pinned = false;
  const trigger = i => { if (!reduce && !done[i]) { done[i] = true; play[i](); } };

  function show(i, instant) {
    cards.forEach((c, k) => {
      const d = k - i;
      const to = {
        z: d < 0 ? 240 : d > 0 ? -380 : 0, y: d < 0 ? -46 : d > 0 ? 44 : 0, rotationX: d < 0 ? 7 : d > 0 ? -7 : 0,
        autoAlpha: d === 0 ? 1 : 0
      };
      if (instant) gsap.set(c, to);
      else gsap.to(c, { ...to, duration: 0.8, ease: 'expo.out', overwrite: 'auto' });
    });
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  }

  registerScene({
    el, steps: 2, perStep: 0.75,
    onStep(i) {
      cur = i;
      if (pinned) { show(i, false); if (entered) trigger(i); }
    },
    setup(mode) {
      pinned = mode === 'pin';
      done.fill(false);
      entered = false;
      revealLines($('h2', el), { trigger: el, start: 'top 72%' });
      if (reduce) return;
      prep.forEach(fn => fn());
      cards.forEach((c, i) => nums(i).forEach(zero));
      if (pinned) {
        show(0, true);
        ScrollTrigger.create({
          trigger: el, start: 'top 58%', once: true,
          onEnter: () => { entered = true; trigger(cur); }
        });
      } else {
        cards.forEach((c, i) => ScrollTrigger.create({
          trigger: c, start: 'top 78%', once: true, onEnter: () => trigger(i)
        }));
      }
    }
  });
}
