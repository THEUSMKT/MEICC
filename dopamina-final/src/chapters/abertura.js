/* Capitulo 1: abertura. */
import { $ } from '../core/dom.js';
import { has3D, reduce } from '../core/env.js';
import { gsap } from '../core/gsap.js';
import { registerScene } from '../core/nav.js';
import { revealLines, revealBlur } from '../core/fx.js';
import { createNetLayer } from './abertura-net.js';
import { initNetFallback } from './abertura-fallback.js';

export function initAbertura() {
  const el = $('#abertura');
  const hit = $('#net');
  const copy = $('.hero-copy');
  let net = null, fallbackOn = false;
  const startFallback = () => { if (!fallbackOn) { fallbackOn = true; initNetFallback(); } };

  if (has3D) {
    net = createNetLayer(el, hit);
    window.addEventListener('no3d', startFallback, { once: true });
  } else {
    startFallback();
  }

  registerScene({
    el, steps: 1, hold: 0.7, flatStatic: true,
    setup(mode) {
      if (net) net.setDiveDistance(mode === 'pin' ? window.innerHeight * 1.7 : 0);
      if (reduce) return;
      revealBlur($('.eyebrow', el), { immediate: true, delay: 0.1 });
      revealLines($('h1', el), { immediate: true, delay: 0.2, duration: 1.1 });
      revealBlur($('.lead', el), { immediate: true, delay: 0.55 });
      revealBlur($('#heroStart', el), { immediate: true, delay: 0.75 });
      if (mode !== 'pin') return;
      gsap.to(copy, {
        y: -70, autoAlpha: 0, ease: 'power1.in',
        scrollTrigger: { trigger: el, start: 'top top', end: () => '+=' + window.innerHeight * 0.55, scrub: true }
      });
    }
  });
}
