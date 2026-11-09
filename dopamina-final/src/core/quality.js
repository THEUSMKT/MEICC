/* Qualidade adaptativa: mede o FPS e reduz resolucao, bloom e particulas quando cai.
   Comeca em "medio", sobe uma vez se sobrar folga e nunca oscila depois de cair. */
import { debug } from './env.js';

const LEVELS = [
  /* pixels: orcamento de GPU. Em tela pequena e densa ele rende mais pixels por ponto. */
  { name: 'minimo', dpr: 0.6, pixels: 4e5, bloom: false, msaa: 0, particles: 0.2 },
  { name: 'baixo', dpr: 0.75, pixels: 8e5, bloom: false, msaa: 0, particles: 0.4 },
  { name: 'medio', dpr: 1, pixels: 1.4e6, bloom: true, msaa: 0, particles: 0.7 },
  { name: 'alto', dpr: 1.5, pixels: 2.6e6, bloom: true, msaa: 4, particles: 1 }
];

const forced = LEVELS.findIndex(l => l.name === debug.quality);
const listeners = new Set();
const giveUp = new Set();

let index = forced >= 0 ? forced : 2;
let frames = 0, spent = 0, skip = 30;
let slow = 0, good = 0, awful = 0, climbed = false, fell = false;

function publish() {
  document.documentElement.dataset.quality = LEVELS[index].name;
  skip = 45; frames = 0; spent = 0; slow = 0; good = 0;
  listeners.forEach(fn => fn(LEVELS[index]));
}

export const quality = {
  get level() { return LEVELS[index]; },
  onChange(fn) { listeners.add(fn); },
  onGiveUp(fn) { giveUp.add(fn); },
  init() { document.documentElement.dataset.quality = LEVELS[index].name; },
  /* chamada a cada quadro desenhado, com o intervalo em milissegundos */
  sample(ms) {
    if (forced >= 0 || ms > 250) return;
    if (skip > 0) { skip--; return; }
    frames++; spent += ms;
    if (spent < 800) return;
    const fps = frames / spent * 1000;
    frames = 0; spent = 0;
    if (fps < 48) {
      slow++; good = 0;
      if (index === 0 && fps < 22) {
        awful++;
        if (awful >= 4) giveUp.forEach(fn => fn());
        return;
      }
      if ((slow >= 2 || fps < 30) && index > 0) { index--; fell = true; publish(); }
    } else if (fps >= 57) {
      good++; slow = 0; awful = 0;
      if (good >= 8 && !climbed && !fell && index < LEVELS.length - 1) { climbed = true; index++; publish(); }
    } else { slow = 0; good = 0; awful = 0; }
  }
};
