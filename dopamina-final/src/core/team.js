/* Nomes da equipe e dados do teste (chave dd-team-v1). */
import { $, $$ } from './dom.js';
import { store } from './store.js';
import { CONFIG } from './config.js';

const TEAM_KEY = 'dd-team-v1';
const team = Object.assign({ n1: '', n2: '', n3: '', escola: '', testou: '', quote: '' }, store.get(TEAM_KEY) || {});
const listeners = new Set();

export const nomeDe = i => String(team['n' + (i + 1)] || '').trim() || CONFIG.equipe[i].nome;
export const testouN = () => { const n = parseInt(team.testou, 10); return n > 0 ? n : 0; };
export const onTeamChange = fn => { listeners.add(fn); };

export function initTeam() {
function applyTeam() {
  $$('[data-nome]').forEach(el => { el.textContent = nomeDe(+el.dataset.nome); });
  $$('[data-inicial]').forEach(el => { el.textContent = nomeDe(+el.dataset.inicial).charAt(0).toUpperCase(); });
  const escola = String(team.escola || '').trim() || CONFIG.turma;
  $$('[data-turma]').forEach(el => { el.textContent = escola; });
  $('#eyebrow').textContent = escola ? 'Feira científica, ' + escola : 'Feira científica';
  const n = testouN();
  const box = $('#testedBox');
  if (n > 0) {
    box.hidden = false;
    $('#testedN').textContent = 'Testado com ' + n + (n === 1 ? ' pessoa' : ' pessoas');
    const q = String(team.quote || '').trim();
    $('#testedQuote').textContent = q;
    $('#testedQuote').hidden = !q;
  } else { box.hidden = true; }
  $('#limTest').textContent = n > 0 ? ' ' + (n === 1 ? '1 colega testou a ferramenta.' : n + ' colegas testaram a ferramenta.') : '';
  listeners.forEach(fn => fn());
}
['n1', 'n2', 'n3', 'escola', 'testou', 'quote'].forEach(k => {
  const el = $('#ed-' + k);
  if (!el) return; /* o editor saiu da pagina: os nomes vem de config.js */
  el.value = team[k] || '';
  el.addEventListener('input', () => { team[k] = el.value; store.set(TEAM_KEY, team); applyTeam(); });
});
applyTeam();
}
