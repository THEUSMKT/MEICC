/* Cronometro de 5:00 (tecla T) e marcadores dos cortes entre apresentadores. */
import { $, pad } from './dom.js';
import { CONFIG } from './config.js';

let updateDue = () => {};
export const setDueHandler = fn => { updateDue = fn; };

const clk = { running: false, elapsed: 0, startedAt: 0 };
const nowS = () => performance.now() / 1000;
export const curS = () => clk.running ? clk.elapsed + (nowS() - clk.startedAt) : clk.elapsed;
export const clockRunning = () => clk.running;

export function clkRender() {
  const e = curS();
  const rem = CONFIG.total - e;
  const el = $('#clk');
  const shown = rem >= 0 ? Math.ceil(rem) : Math.floor(-rem);
  el.textContent = (rem < 0 ? '+' : '') + pad(Math.floor(shown / 60)) + ':' + pad(shown % 60);
  el.classList.toggle('warn', rem >= 0 && rem <= 30 && (clk.running || e > 0));
  el.classList.toggle('over', rem < 0);
  $('#trackFill').style.width = Math.min(100, (e / CONFIG.total) * 100) + '%';
  $('#clkIcon').setAttribute('href', clk.running ? '#i-pause' : '#i-play');
  $('#clkGo').setAttribute('aria-label', clk.running ? 'Pausar cronômetro (tecla T)' : 'Iniciar cronômetro (tecla T)');
  updateDue(e);
}
export function clkToggle() {
  if (clk.running) { clk.elapsed = curS(); clk.running = false; }
  else { clk.startedAt = nowS(); clk.running = true; }
  clkRender();
}
function clkReset() { clk.running = false; clk.elapsed = 0; clkRender(); }

export function initClock() {
  $('#tick1').style.left = (CONFIG.cortes[0] / CONFIG.total * 100) + '%';
  $('#tick2').style.left = (CONFIG.cortes[1] / CONFIG.total * 100) + '%';
  $('#clkGo').addEventListener('click', clkToggle);
  $('#clkReset').addEventListener('click', clkReset);
  $('#heroStart').addEventListener('click', () => { if (!clk.running && clk.elapsed === 0) clkToggle(); });
  setInterval(clkRender, 250);
}
