/* Capitulo 4: ciclo do habito. Gatilho, comportamento, consequencia e a pausa que quebra o ciclo. */
import { $, $$ } from '../core/dom.js';
import { has3D, reduce } from '../core/env.js';
import { registerScene } from '../core/nav.js';
import { revealLines } from '../core/fx.js';
import { createCicloLayer } from './ciclo-scene.js';

const CAPS = [
  'Gatilho: uma notificação chama a sua atenção.',
  'Comportamento: você abre e o feed não acaba.',
  'Consequência: alívio ou arrependimento. O cérebro aprende e repete.'
];

export function initCiclo() {
  const el = $('#ciclo');
  const stage = $('#cyStage');
  const labels = $$('.cy-label', el);
  const widgets = $$('.cw', el);
  const blocks = $$('[data-cy]', el);
  const svgNodes = $$('.cy-node', el);
  const cap = $('#cyCap');
  const count = $('#cyN');
  const countLabel = $('#cyNL');

  const layer = has3D ? createCicloLayer(el, stage, labels) : null;
  let shown = -1;

  registerScene({
    /* no celular as quatro etapas acontecem enquanto o anel ainda esta na tela */
    el, steps: 3, perStep: 0.72, flatTrigger: $('.cycle-viz', el), flatStart: 'top 62%', flatEnd: 'bottom 40%',
    onProgress(p) {
      if (layer) layer.setProgress(p);
      /* contador ilustrativo: sobe enquanto o ciclo gira; a pausa que o quebra fica no capitulo seguinte */
      const n = 1 + Math.round(Math.min(1, p) * 46);
      if (count.textContent !== String(n)) count.textContent = n;
    },
    onStep(i) {
      if (i === shown) return;
      shown = i;
      widgets.forEach((w, k) => w.classList.toggle('on', k === i));
      labels.forEach((l, k) => l.classList.toggle('on', k === i));
      blocks.forEach(b => b.classList.toggle('on', b.dataset.cy.split(',').includes(String(i))));
      svgNodes.forEach((n, k) => n.classList.toggle('hot', k === i));
      cap.textContent = CAPS[i];
      countLabel.textContent = 'Repetições';
    },
    setup() {
      shown = -1;
      revealLines($('h2', el), { trigger: el, start: 'top 72%' });
      if (reduce) count.textContent = '47';
    }
  });
}
