/* Referencias: cartoes com selo, copiar citacao, DOI e o painel "defesa das fontes" (tecla R). */
import { $, $$ } from '../core/dom.js';
import { reduce } from '../core/env.js';
import { gsap, ScrollTrigger } from '../core/gsap.js';
import { registerKey, registerFx, setNavBlocker } from '../core/nav.js';

const icon = id => '<svg class="ic" aria-hidden="true"><use href="#' + id + '"/></svg>';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) { /* sem acesso a area de transferencia: usa o caminho antigo */ }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

export function initReferencias() {
  const list = $('.ref-list');
  const items = $$(':scope > li', list);
  const status = $('#copyStatus');

  /* Tudo vem dos proprios cartoes: a lista e o painel nunca ficam diferentes. */
  const refs = items.map(li => {
    const a = $('a', li);
    const whyEl = $('.why', li);
    const copy = li.cloneNode(true);
    copy.querySelector('.why').remove();
    const pmid = copy.querySelector('.id');
    const pmidText = pmid ? pmid.textContent.trim() : '';
    if (pmid) pmid.remove();
    const citation = copy.textContent.replace(/\s+/g, ' ').trim();
    const doi = a.href.replace('https://doi.org/', '');
    const head = citation.slice(0, citation.indexOf(')') + 1);
    return { li, title: a.textContent.trim(), href: a.href, doi, pmid: pmidText, head, citation, whyHtml: whyEl.innerHTML, full: citation + ' https://doi.org/' + doi + (pmidText ? ' ' + pmidText : '') };
  });

  refs.forEach(r => {
    r.li.classList.add('ref-card');
    r.li.insertAdjacentHTML('afterbegin', '<span class="seal">' + icon('i-seal') + 'Artigo revisado por pares</span>');
    r.li.insertAdjacentHTML('beforeend',
      '<div class="ref-act"><button type="button" class="mini-btn" data-copy>' + icon('i-copy') + '<span>Copiar citação</span></button>' +
      '<a class="mini-btn" href="' + r.href + '" target="_blank" rel="noopener">' + icon('i-link') + '<span>DOI: ' + esc(r.doi) + '</span></a></div>');
    const btn = $('[data-copy]', r.li), lbl = $('span', btn);
    let timer = 0;
    btn.addEventListener('click', async () => {
      const ok = await copyText(r.full);
      lbl.textContent = ok ? 'Citação copiada' : 'Não foi possível copiar';
      btn.classList.toggle('done', ok);
      status.textContent = ok ? 'Citação copiada' : 'Não foi possível copiar a citação';
      clearTimeout(timer);
      timer = setTimeout(() => { lbl.textContent = 'Copiar citação'; btn.classList.remove('done'); status.textContent = ''; }, 1800);
    });
  });

  /* ===== Painel de defesa das fontes ===== */
  const dlg = $('#defesa');
  $('#defesaN').textContent = refs.length + ' artigos científicos, todos revisados por pares. Cada número da apresentação vem de um deles. O contador de repetições do ciclo é só ilustrativo.';
  $('#defesaList').innerHTML = refs.map((r, i) =>
    '<li><span class="def-n">' + (i + 1) + '</span><div>' +
    '<strong>' + esc(r.head) + '</strong>' +
    '<a href="' + r.href + '" target="_blank" rel="noopener">' + esc(r.title) + '</a>' +
    '<p class="why">' + r.whyHtml + '</p>' +
    '<span class="id">DOI ' + esc(r.doi) + (r.pmid ? ' · ' + esc(r.pmid) : '') + '</span>' +
    '</div></li>').join('');

  let opener = null;
  const open = () => {
    if (dlg.open) return;
    opener = document.activeElement;
    dlg.showModal();
    $('#defesaList').scrollTop = 0;
    if (!reduce) gsap.fromTo(dlg, { opacity: 0, y: 26, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'power3.out', clearProps: 'all' });
  };
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => { if (opener && opener.focus) opener.focus({ preventScroll: true }); });
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  $('#defesaX').addEventListener('click', close);
  $('#defesaBtn').addEventListener('click', open);
  registerKey('r', () => { if (dlg.open) close(); else open(); });
  /* com o painel aberto, as teclas de navegacao rolam o painel e nao a apresentacao */
  setNavBlocker(e => dlg.open && e.key.toLowerCase() !== 'r');

  registerFx(() => {
    if (reduce) return;
    gsap.set(items, { autoAlpha: 0, y: 28 });
    ScrollTrigger.batch(items, {
      start: 'top 94%', once: true,
      onEnter: batch => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', stagger: 0.07 })
    });
  });
}
