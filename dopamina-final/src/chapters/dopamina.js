/* Capitulo 3: dopamina. Tres momentos: sinapse, querer e gostar, erro de previsao. */
import { $, $$ } from '../core/dom.js';
import { has3D, reduce } from '../core/env.js';
import { gsap, ScrollTrigger } from '../core/gsap.js';
import { registerScene } from '../core/nav.js';
import { revealLines, revealBlur } from '../core/fx.js';
import { createDopaminaLayer } from './dopamina-scene.js';

/* Desenha o traco de atividade: linha de base com rajadas (altura positiva) ou queda (negativa). */
function trace(y0, events) {
  let d = '', seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = 28; x <= 512; x += 4) {
    let v = (rnd() - 0.5) * 2.4;
    for (const e of events) v += e.h * Math.exp(-((x - e.x) ** 2) / (2 * e.s * e.s));
    d += (d ? 'L' : 'M') + x + ' ' + (y0 - v).toFixed(1);
  }
  return d;
}

function buildRpe(svg) {
  const CS = 190, US = 390, BURST = 56, S = 9;
  const rows = [
    { t: 'Recompensa inesperada', n: 'Dispara na recompensa', cs: false, ev: [{ x: US, h: BURST, s: S }] },
    { t: 'Depois de aprender', n: 'Dispara no sinal', cs: true, ev: [{ x: CS, h: BURST, s: S }] },
    { t: 'A recompensa não vem', n: 'A atividade cai', cs: true, ev: [{ x: CS, h: BURST, s: S }, { x: US, h: -19, s: 17 }] }
  ];
  let h = '';
  rows.forEach((r, i) => {
    const top = i * 142, y0 = top + 100;
    h += '<text class="rt" x="0" y="' + (top + 18) + '">' + r.t + '</text>';
    h += '<text class="rn" x="520" y="' + (top + 18) + '" text-anchor="end">' + r.n + '</text>';
    h += '<line class="rb" x1="28" x2="512" y1="' + y0 + '" y2="' + y0 + '"/>';
    if (r.cs) h += '<line class="rv" x1="' + CS + '" x2="' + CS + '" y1="' + (top + 30) + '" y2="' + (y0 + 12) + '"/><text class="rl" x="' + CS + '" y="' + (y0 + 37) + '" text-anchor="middle">Sinal</text>';
    h += '<line class="rv" x1="' + US + '" x2="' + US + '" y1="' + (top + 30) + '" y2="' + (y0 + 12) + '"/><text class="rl" x="' + US + '" y="' + (y0 + 37) + '" text-anchor="middle">Recompensa</text>';
    h += '<path class="rp" pathLength="1" d="' + trace(y0, r.ev) + '"/>';
  });
  svg.innerHTML = h;
}

export function initDopamina() {
  const el = $('#dopamina');
  const host = $('.scene', el);
  const rpe = $('#rpe');
  const facts = $$('.facts li', el);
  buildRpe($('svg', rpe));
  const paths = $$('.rp', rpe);
  const extras = $$('.rt,.rn,.rl,.rv,.rb', rpe);

  let layer = null;
  if (has3D) {
    layer = createDopaminaLayer(el, host, {
      ves: $('[data-l="ves"]', el), dop: $('[data-l="dop"]', el), rec: $('[data-l="rec"]', el),
      querer: $('[data-l="querer"]', el), gostar: $('[data-l="gostar"]', el)
    });
  }

  let pinned = false, rpeOn = false;
  function showRpe(on) {
    if (on === rpeOn) return;
    rpeOn = on;
    if (on) {
      gsap.fromTo(rpe, { autoAlpha: 0, z: -220, rotationX: -8 }, { autoAlpha: 1, z: 0, rotationX: 0, duration: 0.75, ease: 'expo.out', overwrite: 'auto' });
      gsap.fromTo(extras, { opacity: 0 }, { opacity: 1, duration: 0.4, delay: 0.2 });
      gsap.fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.05, ease: 'power1.inOut', stagger: 0.42, delay: 0.25 });
    } else {
      gsap.to(rpe, { autoAlpha: 0, z: -160, duration: 0.4, ease: 'power2.in', overwrite: 'auto' });
    }
  }

  registerScene({
    el, steps: 3, perStep: 0.8, flatStatic: true,
    onProgress(p) { if (layer) layer.setProgress(p); },
    onStep(i) {
      facts.forEach(f => f.classList.toggle('on', pinned && f.dataset.on === String(i)));
      if (pinned) showRpe(i === 2);
    },
    setup(mode) {
      pinned = mode === 'pin';
      rpeOn = false;
      revealLines($('h2', el), { trigger: el, start: 'top 72%' });
      revealBlur($('.lead', el), { trigger: el, start: 'top 60%' });
      if (reduce) return;
      if (pinned) {
        gsap.set(rpe, { autoAlpha: 0 });
        gsap.from(facts, {
          autoAlpha: 0, x: -26, duration: 0.7, ease: 'power3.out', stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 50%', once: true }
        });
      } else {
        gsap.set(paths, { strokeDashoffset: 1 });
        ScrollTrigger.create({
          trigger: rpe, start: 'top 80%', once: true,
          onEnter: () => gsap.to(paths, { strokeDashoffset: 0, duration: 1, ease: 'power1.inOut', stagger: 0.35 })
        });
        /* no celular a cena acompanha o scroll do proprio capitulo */
        if (layer) {
          ScrollTrigger.create({
            trigger: host, start: 'top 75%', end: 'bottom 15%', scrub: true,
            onUpdate: self => layer.setProgress(self.progress * 0.55)
          });
        }
      }
    }
  });
}
