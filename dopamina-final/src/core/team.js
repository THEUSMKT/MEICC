/* Nomes da equipe e dados do teste (chave dd-team-v1). */
import { $, $$ } from './dom.js';
import { store } from './store.js';
import { CONFIG } from './config.js';

export function initTeam() {
const TEAM_KEY = 'dd-team-v1';
const team = Object.assign({ n1: '', n2: '', n3: '', escola: '', testou: '', quote: '' }, store.get(TEAM_KEY) || {});
const nameOf = i => String(team['n' + (i + 1)] || '').trim() || CONFIG.equipe[i].nome;
function applyTeam() {
  $$('[data-nome]').forEach(el => { el.textContent = nameOf(+el.dataset.nome); });
  $$('[data-inicial]').forEach(el => { el.textContent = nameOf(+el.dataset.inicial).charAt(0).toUpperCase(); });
  const escola = String(team.escola || '').trim();
  $('#eyebrow').textContent = escola ? 'Feira científica, ' + escola : 'Feira científica';
  const n = parseInt(team.testou, 10);
  const box = $('#testedBox');
  if (n > 0) {
    box.hidden = false;
    $('#testedN').textContent = 'Testado com ' + n + (n === 1 ? ' pessoa' : ' pessoas');
    const q = String(team.quote || '').trim();
    $('#testedQuote').textContent = q;
    $('#testedQuote').hidden = !q;
  } else { box.hidden = true; }
}
['n1', 'n2', 'n3', 'escola', 'testou', 'quote'].forEach(k => {
  const el = $('#ed-' + k);
  el.value = team[k] || '';
  el.addEventListener('input', () => { team[k] = el.value; store.set(TEAM_KEY, team); applyTeam(); });
});
applyTeam();
}
