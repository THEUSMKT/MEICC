/* Abrindo pelo link publico, a pagina fica guardada no aparelho e pode ir para a Tela de Inicio.
   Aberta do disco (duplo clique), nada disto roda: o arquivo unico continua sem pedir nenhum outro. */
import { debug } from './env.js';

export function initOffline() {
  const local = location.hostname === 'localhost' && debug.sw; /* so para os testes */
  if (!location.hostname.endsWith('github.io') && !local) return;
  if (!('serviceWorker' in navigator)) return;
  [['manifest', 'manifest.webmanifest'], ['apple-touch-icon', 'apple-touch-icon.png']].forEach(([rel, href]) => {
    const l = document.createElement('link');
    l.rel = rel;
    l.href = href;
    document.head.appendChild(l);
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
