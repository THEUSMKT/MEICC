/* Roteiro de fala (N), perguntas provaveis (Q) e limites (L), em um painel ao lado da apresentacao. */
import { $, $$ } from '../core/dom.js';
import { registerKey } from '../core/nav.js';
import { nomeDe, testouN, fraseTeste, onTeamChange } from '../core/team.js';

const ROTEIRO = [
  {
    titulo: 'Problema', tempo: '0:00 a 1:30',
    itens: [
      ['0:00', 'Pergunta de abertura: "Por que é tão difícil largar o celular?" Contar a cena: abrir o Instagram para responder uma mensagem e, 40 minutos depois, ainda estar rolando.'],
      ['0:20', 'Recorte e mapa: "Hoje vamos seguir um único hábito: pegar o celular sem decidir, o passatempo automático. Em cinco passos: o problema, o cérebro, o hábito, o que interrompe e uma ferramenta que a gente construiu." Apresentar a equipe, a turma e o tema.'],
      ['0:40', 'O problema, dois números. "27%: meta-análise de 2022 com 2,1 milhões de pessoas em 64 países, medido por escalas de triagem, não por diagnóstico." "Entre adolescentes de 28 países, o uso problemático de redes sociais aumentou 2,8 pontos percentuais de 2018 para 2022."'],
      ['1:15', 'Elo: "Mas por que isso acontece? Vamos olhar para o cérebro." Passar a palavra.']
    ],
    diga: '"passatempo automático", "uso problemático", "medido por escalas de triagem".',
    evite: '"viciados"; "isso é um diagnóstico"; "a OMS mostrou que subiu de 7% para 11%" (essa fonte não é artigo e não está na página); usar o 70% de Fortaleza no discurso principal (ele está nos dados de apoio, tecla Q).'
  },
  {
    titulo: 'Cérebro e hábito', tempo: '1:30 a 3:10',
    itens: [
      ['1:30', '"O que empurra a mão para o celular é o querer." A dopamina move o querer (ir atrás da recompensa) e o aprender; o prazer em si vem de outros sistemas (Berridge e Robinson, 2016).'],
      ['1:55', 'Aprender: a dopamina sinaliza erros de previsão (Schultz, Dayan e Montague, 1997); ela responde mais quando a recompensa é diferente do esperado. Dizer: "os modelos indicam que curtidas e novidades imprevisíveis reforçam o aprendizado". Em adolescentes, curtidas ativam o circuito de recompensa (Sherman et al., 2016).'],
      ['2:20', 'O ciclo: gatilho (a notificação), comportamento (abrir e rolar), consequência (alívio ou arrependimento). O cérebro aprende e repete. Alívio do tédio e do desconforto (Brand et al., 2016; Wilson et al., 2014).'],
      ['2:50', '"Eliminar a dopamina não é o caminho" (Berridge e Robinson, 1998): o que dá para mudar é o ciclo. Elo: "Um hábito automático só muda se ficar visível e ganhar uma pausa." Passar a palavra.']
    ],
    diga: '"o querer", "os modelos indicam", "está associado a".',
    evite: '"dopamina é o hormônio do prazer"; "o Instagram funciona como um caça-níquel, está comprovado"; "vídeo curto destrói a atenção"; "faça um detox de dopamina".'
  },
  {
    titulo: 'Solução: Loop beta', tempo: '3:10 a 5:00',
    itens: [
      ['3:10', 'A ponte: duas ideias com apoio científico para interromper o ciclo. Ver o hábito: monitorar o comportamento ajuda a atingir metas (Harkin et al., 2016). Pausar antes de agir: uma pausa de 10 segundos (Grüning et al., 2023, estudo com outro aplicativo). "Foi isso que a gente construiu."'],
      ['3:30', 'Loop beta, demonstração (tecla D, ou ao vivo com um voluntário). Cada passo do app tem um lugar no ciclo: registrar (gatilho), pausar (antes do comportamento), avaliar (consequência) e o padrão fica visível. Ler as legendas sem correr.'],
      ['4:20', 'Fase beta: já funciona no navegador e guarda os dados só no aparelho; citar quantos colegas testaram, se houver; ainda não foi validado cientificamente. Próximos passos: relatório semanal, lembrete, exportar registros, desafios em grupo e app instalável.'],
      ['4:45', 'Fecho: problema, mecanismo e solução em teste. Frase final: "O celular volta a ser uma ferramenta, não a resposta automática ao tédio." Agradecer.']
    ],
    diga: '"fase beta", "inspirado em", "ainda não foi validado", "ferramenta de autoconhecimento".',
    evite: '"o Loop trata a dependência"; "o Loop reduz o uso em 57%" (o 57% é de outro estudo, com outro aplicativo); "comprovamos que funciona".'
  }
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colegas = () => { const n = testouN(); return n > 0 ? (n === 1 ? '1 colega' : n + ' colegas') : 'alguns colegas'; };

/* resposta da pergunta 6: usa o numero e a frase dos testes, se o grupo tiver informado */
const testes = () => {
  const n = testouN(), f = fraseTeste();
  if (!n) return 'Alguns colegas testaram e a coleta formal é um próximo passo.';
  return (n === 1 ? '1 colega testou' : n + ' colegas testaram') + (f ? '. O que disseram: "' + f + '"' : '.');
};

const PERGUNTAS = [
  ['Por que vocês falam só do celular como passatempo?', 'Foi o recorte para caber em 5 minutos: o uso automático do celular, como o hábito se forma e como interrompê-lo. Não tratamos de diagnóstico nem de tratamento.'],
  ['Dopamina é o hormônio do prazer?', 'Não só isso. Segundo Berridge e Robinson (2016), ela move o querer e a busca; o gostar, o prazer em si, envolve outros sistemas. Schultz et al. (1997) mostram o papel dela no aprendizado por erro de previsão.'],
  ['Vocês estão dizendo que celular vicia?', 'Dependência de smartphone não é um diagnóstico oficial (Montag et al., 2019). Os estudos medem uso problemático com escalas de triagem. O que dizemos é que muita gente tem dificuldade de controlar o uso.'],
  ['Isso é um aplicativo de verdade?', 'É uma versão beta: já funciona no navegador e guarda os dados só no aparelho. O aplicativo instalável é um dos próximos passos.'],
  ['O Loop funciona?', 'Ainda não foi validado. Ele combina duas ideias com apoio científico: monitorar o comportamento (Harkin et al., 2016) e criar uma pausa antes de abrir o aplicativo (Grüning et al., 2023). Testamos com {N}.'],
  ['Quantas pessoas testaram e o que acharam?', testes],
  ['Detox de dopamina funciona?', 'Não no sentido literal: a dopamina é necessária para querer e buscar qualquer recompensa (Berridge e Robinson, 1998). O que muda são hábitos e ambiente.'],
  ['O que o tédio tem a ver com isso?', 'Em 11 estudos (Wilson et al., 2014), muita gente não gostou de ficar sozinha só pensando. Esse trabalho não envolve celular; ele ajuda a entender por que aliviar o tédio é tão atraente.'],
  ['Essas fontes são artigos científicos de verdade?', 'Sim. A tecla R abre o painel com revista, DOI, PMID e a justificativa de cada uma.']
];

/* fora do discurso principal: so para perguntas, cada um com a sua fonte */
const APOIO = [
  'Prevalência por tipo de uso (Meng et al., 2022): smartphone 27%, redes sociais 17%, internet 14%, jogos 6%.',
  'Fortaleza (Nunes et al., 2021): 70% dos 286 estudantes de 15 a 19 anos atingiram o critério de dependência de smartphone numa escala de triagem; vale para essa amostra e não representa o Brasil. Os números do 27% e do 70% não se comparam, porque as amostras, as idades e as escalas são diferentes.',
  'Vídeos curtos (Nguyen et al., 2025): numa meta-análise de 71 estudos, mais uso esteve associado a pior atenção; os dados são correlacionais e não provam que o vídeo causa o problema.',
  'Circuito de recompensa (Haber e Knutson, 2010): o núcleo accumbens e os neurônios dopaminérgicos da área tegmental ventral estão no centro do circuito de recompensa.'
];

const LIMITES = [
  'Os estudos citados mostram associações e usam escalas de triagem, não diagnóstico.',
  'O 70% de Fortaleza, que está nos dados de apoio, vem de uma só cidade e não representa o Brasil.',
  'O Loop é uma ferramenta de autoconhecimento em fase beta, inspirada em estudos sobre monitoramento e pausa, e ainda não foi validada cientificamente.'
];

const htmlRoteiro = () => ROTEIRO.map((b, i) =>
  '<section class="rt-bloco" data-p="' + i + '"><h3>' + esc(nomeDe(i)) + '. ' + b.titulo + ' (' + b.tempo + ')</h3><ol>' +
  b.itens.map(([t, x]) => '<li><b>(' + t + ')</b> ' + esc(x) + '</li>').join('') + '</ol>' +
  '<p class="rt-diga"><b>Diga:</b> ' + esc(b.diga) + '</p><p class="rt-evite"><b>Evite:</b> ' + esc(b.evite) + '</p></section>').join('');

const htmlPerguntas = () => '<ol class="rt-perg">' + PERGUNTAS.map(([p, r]) =>
  '<li><b>"' + esc(p) + '"</b> ' + esc(typeof r === 'function' ? r() : r.replace('{N}', colegas())) + '</li>').join('') + '</ol>' +
  '<section class="rt-apoio" id="dadosApoio"><h3>Dados de apoio</h3><p>Só para perguntas, fora do discurso principal.</p><ul>' +
  APOIO.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul></section>';

const htmlLimites = () => '<ul class="rt-lim">' + LIMITES.map((l, i) => {
  const n = testouN();
  const extra = i === 2 && n > 0 ? ' ' + (n === 1 ? '1 colega testou a ferramenta.' : n + ' colegas testaram a ferramenta.') : '';
  return '<li>' + esc(l + extra) + '</li>';
}).join('') + '</ul>';

const PANELS = {
  n: { tecla: 'Tecla N', titulo: 'Roteiro', html: htmlRoteiro },
  q: { tecla: 'Tecla Q', titulo: 'Perguntas prováveis', html: htmlPerguntas },
  l: { tecla: 'Tecla L', titulo: 'Limites deste trabalho', html: htmlLimites }
};

export function initRoteiro() {
  const cola = $('#cola'), body = $('#colaBody');
  let open = null;

  const close = () => { open = null; cola.hidden = true; };

  function show(k) {
    if (open === k) { close(); return; }
    open = k;
    const p = PANELS[k];
    $('#colaK').textContent = p.tecla;
    $('#colaT').textContent = p.titulo;
    body.innerHTML = p.html();
    cola.hidden = false;
    body.scrollTop = 0;
    if (k === 'n') {
      /* abre no trecho de quem esta falando agora */
      const who = $$('.who').findIndex(w => w.getAttribute('aria-current') === 'true');
      const bloco = $('.rt-bloco[data-p="' + Math.max(0, who) + '"]', body);
      if (bloco) body.scrollTop = bloco.offsetTop - body.offsetTop;
    }
  }

  Object.keys(PANELS).forEach(k => registerKey(k, () => show(k)));
  $('#colaX').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  window.addEventListener('esconder-barra', close);
  onTeamChange(() => { if (open) { const k = open; open = null; show(k); } });
}
