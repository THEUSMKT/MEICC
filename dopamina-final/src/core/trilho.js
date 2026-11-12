/* Trilho de progresso: os cinco passos da historia (Problema, Cerebro, Habito, Interromper, Loop beta).
   O no atual fica em ambar, os anteriores preenchidos. Clicar leva ao capitulo (o clique e tratado em nav.js).
   Fica fora da barra do topo, entao a tecla H nao o esconde. */
import { $, $$ } from './dom.js';

const NO = { dados: 0, dopamina: 1, ciclo: 2, ponte: 3, loop: 4, conclusao: 4, equipe: 4 };

export function initTrilho() {
  const trilho = $('#trilho');
  if (!trilho) return;
  const nos = $$('[data-no]', trilho);
  const marcar = id => {
    const at = id in NO ? NO[id] : -1;
    nos.forEach((b, k) => {
      b.classList.toggle('on', k === at);
      b.classList.toggle('feito', k < at);
      if (k === at) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  };
  const io = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) marcar(en.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('.chapter').forEach(c => io.observe(c));
  marcar('abertura');
}

/* altura ocupada pela barra do topo e pelo trilho, para posicionar o que fica logo abaixo deles */
export const topoLivre = () => {
  const t = $('#trilho');
  return (t ? t.getBoundingClientRect().bottom : 68) + 8;
};
