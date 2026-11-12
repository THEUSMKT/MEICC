/* Tela cheia com um clique (botao na barra) ou com a tecla F, sem depender do F11 do teclado.
   Quando o navegador permite, o Esc continua com a apresentacao (encerrar a demonstracao, fechar paineis):
   para sair da tela cheia, use o botao, a tecla F ou segure o Esc. */
import { $ } from './dom.js';
import { registerKey } from './nav.js';

export function initTelaCheia() {
  const btn = $('#telaCheia');
  if (!btn) return;
  if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) { btn.hidden = true; return; }

  const sync = () => {
    const on = !!document.fullscreenElement;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Sair da tela cheia (tecla F)' : 'Tela cheia (tecla F)');
    btn.title = on ? 'Sair da tela cheia (F)' : 'Tela cheia (F)';
    $('use', btn).setAttribute('href', on ? '#i-min' : '#i-max');
  };

  const alternar = () => {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      .then(() => {
        if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape']).catch(() => {});
      })
      .catch(() => {});
  };

  btn.addEventListener('click', alternar);
  registerKey('f', alternar);
  document.addEventListener('fullscreenchange', sync);
  sync();
}
