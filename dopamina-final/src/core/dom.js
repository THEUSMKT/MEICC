/* Atalhos de DOM usados em toda a pagina. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const pad = n => String(n).padStart(2, '0');
