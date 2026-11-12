/* Capitulo 5: ponte. O mesmo ciclo do habito ganha o registro no gatilho e a pausa de 10 s
   entre o gatilho e o comportamento: as duas alavancas que o Loop beta coloca no bolso. */
import { $, $$ } from '../core/dom.js';
import { has3D } from '../core/env.js';
import { registerScene } from '../core/nav.js';
import { revealLines } from '../core/fx.js';
import { createCicloLayer } from './ciclo-scene.js';

const CAPS = [
  'Ver: o registro deixa o gatilho visível.',
  'Pausar: 10 segundos entre o gatilho e o comportamento.'
];

export function initPonte() {
  const el = $('#ponte');
  const stage = $('#pnStage');
  const labels = $$('.cy-label', stage);
  const cards = $$('[data-pn]', el);
  const pausa = $('.pn-pause', el);
  const cap = $('#pnCap');
  const layer = has3D ? createCicloLayer(el, stage, labels, { gap: 0, ponte: true }) : null;

  registerScene({
    el, steps: 2, perStep: 0.8, flatTrigger: $('.cycle-viz', el), flatStart: 'top 62%', flatEnd: 'bottom 40%',
    onProgress(p) { if (layer) layer.setProgress(p); },
    onStep(i) {
      cards.forEach(c => c.classList.toggle('on', +c.dataset.pn === i));
      labels.forEach(l => {
        const n = +l.dataset.n;
        l.classList.toggle('on', n === 4 || (n === 0 && i === 0) || (n === 3 && i === 1));
      });
      pausa.classList.toggle('on', i === 1);
      cap.textContent = CAPS[i];
      el.classList.toggle('pausada', i === 1);
    },
    setup() {
      revealLines($('h2', el), { trigger: el, start: 'top 72%' });
    }
  });
}
