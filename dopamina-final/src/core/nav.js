/* Capitulos, apresentador ativo e navegacao por teclado. */
import { $$ } from './dom.js';
import { reduce } from './env.js';
import { CONFIG } from './config.js';
import { curS, clockRunning, clkToggle, setDueHandler } from './clock.js';

export function initNav() {
  const chapters = $$('.chapter');
  const who = $$('.who');
  let curIdx = 0;
  const presenterNow = () => +chapters[curIdx].dataset.p;
  const shouldBe = e => e < CONFIG.cortes[0] ? 0 : e < CONFIG.cortes[1] ? 1 : 2;
  function updateDue(e) {
    const p = presenterNow();
    const want = shouldBe(e);
    who.forEach((w, i) => w.classList.toggle('due', clockRunning() && p >= 0 && i === want && want > p));
  }
  setDueHandler(updateDue);
  function onChapter() {
    const p = presenterNow();
    who.forEach((w, i) => w.setAttribute('aria-current', i === p ? 'true' : 'false'));
    updateDue(curS());
  }
  const chapIO = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) { curIdx = chapters.indexOf(en.target); onChapter(); } });
  }, { rootMargin: '-45% 0px -50% 0px' });
  chapters.forEach(c => chapIO.observe(c));
  function go(i) {
    i = Math.max(0, Math.min(chapters.length - 1, i));
    chapters[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  who.forEach((w, i) => w.addEventListener('click', () => go([0, 2, 4][i])));
  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t && t.closest && t.closest('input,textarea,select,details,[data-nonav]')) return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === 'ArrowRight') { e.preventDefault(); go(curIdx + 1); }
    else if (k === 'ArrowUp' || k === 'PageUp' || k === 'ArrowLeft') { e.preventDefault(); go(curIdx - 1); }
    else if (k === 't' || k === 'T') { clkToggle(); }
  });
  onChapter();
}
