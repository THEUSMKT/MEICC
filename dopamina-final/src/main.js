import './styles/index.css';
import { $$ } from './core/dom.js';
import { reduce } from './core/env.js';
import { initTeam } from './core/team.js';
import { initClock, clkRender } from './core/clock.js';
import { initNav } from './core/nav.js';
import { initNetFallback } from './chapters/abertura-fallback.js';
import { initLoopApp } from './chapters/loop-app.js';

initTeam();
initClock();
initNav();

/* Entrada suave ao rolar: tudo comeca visivel, so ganha um pequeno movimento */
const revIO = new IntersectionObserver(es => {
  es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); revIO.unobserve(en.target); } });
}, { threshold: 0.25 });
$$('.reveal, .chart').forEach(el => revIO.observe(el));

/* Inclinacao 3D dos paineis */
if (!reduce) {
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

initNetFallback();
initLoopApp();
clkRender();
