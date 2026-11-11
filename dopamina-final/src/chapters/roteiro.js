/* Roteiro de fala (N), perguntas provaveis (Q) e limites (L), em um painel ao lado da apresentacao. */
import { $, $$ } from '../core/dom.js';
import { registerKey } from '../core/nav.js';
import { nomeDe, testouN, onTeamChange } from '../core/team.js';

const ROTEIRO = [
  {
    titulo: 'Abertura e dados', tempo: '0:00 a 1:30',
    itens: [
      ['0:00', 'Pergunta de abertura: "Por que é tão difícil largar o celular?" Contar a cena: abrir o Instagram para responder uma mensagem e, 40 minutos depois, ainda estar rolando. Perguntar quem já passou por isso (opcional, 10 s).'],
      ['0:20', 'Apresentar a equipe, a turma e o tema: dopamina e dependência de telas. Dizer que o grupo investigou o que a ciência diz e criou uma ferramenta, o Loop, que será mostrada no final.'],
      ['0:35', 'Dados, um por vez. "27%: meta-análise de 2022 com 2,1 milhões de pessoas em 64 países; é uso problemático medido por escalas de triagem, não diagnóstico." "Mais 2,8 pontos percentuais: entre adolescentes de 28 países, o uso problemático de redes sociais aumentou de 2018 para 2022." "70%: numa amostra de 286 estudantes de Fortaleza; vale só para essa amostra."'],
      ['1:20', 'Fechar: "Os números não se comparam entre si; mostram que o problema aparece em estudos diferentes." Passar a palavra: "Para entender por que acontece, vamos ao cérebro."']
    ],
    diga: '"uso problemático", "medido por escalas de triagem", "numa amostra de Fortaleza".',
    evite: '"70% dos jovens brasileiros são viciados"; "a OMS mostrou que subiu de 7% para 11%" (essa fonte não é artigo e não está na página); "isso é um diagnóstico".'
  },
  {
    titulo: 'Dopamina e ciclo', tempo: '1:30 a 3:10',
    itens: [
      ['1:30', '"Dopamina não é o hormônio da felicidade." Ela empurra a buscar a recompensa e ajuda o cérebro a aprender com o resultado; o prazer vem de outros sistemas.'],
      ['1:50', 'Três ideias: Querer (Berridge e Robinson, 2016); Gostar (o prazer em si não depende da dopamina); Aprender (Schultz, Dayan e Montague, 1997: neurônios dopaminérgicos sinalizam erros de previsão da recompensa).'],
      ['2:15', 'O ciclo: gatilho, comportamento, consequência; o cérebro aprende e repete. Em adolescentes, curtidas ativam o circuito de recompensa (Sherman et al., 2016). Quanto mais inesperada a recompensa, maior o sinal de aprendizagem. Dizer: "os modelos científicos indicam que isso ajuda a fixar o hábito".'],
      ['2:45', 'Alívio do desconforto: usar o celular para aliviar tédio ou ansiedade (Brand et al., 2016). Mito do detox de dopamina: não dá para eliminá-la; o que muda são os hábitos.'],
      ['3:05', 'Passar a palavra: "Se o hábito se aprende, dá para observar e interromper. É o que o Loop faz."']
    ],
    diga: '"está associado a", "os modelos indicam", "o prazer vem de outros sistemas".',
    evite: '"dopamina é o hormônio do prazer"; "o Instagram funciona como um caça-níquel, está comprovado"; "vídeo curto destrói a atenção"; "faça um detox de dopamina".'
  },
  {
    titulo: 'Loop e conclusão', tempo: '3:10 a 5:00',
    itens: [
      ['3:10', 'O Loop é uma ferramenta de autoconhecimento com quatro passos: registrar, pausar 10 segundos, usar e avaliar. Cada passo se inspira em estudos: monitorar o comportamento (Harkin et al., 2016) e pausar antes de abrir (Grüning et al., 2023).'],
      ['3:35', 'Demonstração (tecla D, ou ao vivo com um voluntário do público). Ler a legenda de cada passo sem correr. Terminar mostrando "Seu padrão".'],
      ['4:25', 'Conclusão, três aprendizados: a dopamina move a motivação e não é sinônimo de prazer; o cérebro aprende com expectativas e consequências; recuperar o controle é mais realista do que tentar eliminar a dopamina.'],
      ['4:40', 'Limites e próximos passos: "É uma ferramenta de autoconhecimento e ainda não foi validada." Citar quantos colegas testaram, se houver. Próximos passos: relatório semanal, lembrete para contar como foi, exportar registros, desafios em grupo e app instalável.'],
      ['4:55', 'Frase final: "O celular volta a ser uma ferramenta, não a resposta automática ao tédio." Agradecer.']
    ],
    diga: '"inspirado em", "ainda não foi validada", "ferramenta de autoconhecimento".',
    evite: '"o Loop trata a dependência"; "o Loop reduz o uso em 57%" (o 57% é do estudo de Grüning e colegas com outro aplicativo, não do Loop); "comprovamos que funciona".'
  }
];

const PERGUNTAS = [
  ['Dopamina é o hormônio do prazer?', 'Não só isso. Segundo Berridge e Robinson (2016), ela move o querer e a busca; o gostar, o prazer em si, envolve outros sistemas. Schultz et al. (1997) mostram o papel dela no aprendizado por erro de previsão.'],
  ['Vocês estão dizendo que celular vicia?', 'Dependência de smartphone não é um diagnóstico oficial (Montag et al., 2019). Os estudos medem uso problemático com escalas de triagem. O que dizemos é que muita gente tem dificuldade de controlar o uso.'],
  ['De onde vem o 70%?', 'De Nunes et al. (2021): 286 estudantes de 15 a 19 anos de Fortaleza, com escala de triagem e ponto de corte. Não representa o Brasil.'],
  ['Por que o 27% e o 70% são tão diferentes?', 'Amostras, idades e escalas diferentes. Por isso os números não se comparam.'],
  ['Vídeos curtos destroem a atenção?', 'Em uma meta-análise de 71 estudos (Nguyen et al., 2025), mais uso esteve associado a pior atenção, mas os dados são correlacionais: não provam que o vídeo causa o problema.'],
  ['O Loop funciona?', 'Ainda não foi validado. Ele combina duas ideias com apoio científico: monitorar o comportamento (Harkin et al., 2016) e criar uma pausa antes de abrir o app (Grüning et al., 2023). Testamos com {N}.'],
  ['Detox de dopamina funciona?', 'Não no sentido literal: a dopamina é necessária para querer e buscar qualquer recompensa (Berridge e Robinson, 1998). O que muda são hábitos e ambiente.'],
  ['Essas fontes são artigos científicos de verdade?', 'Sim. Tecla R abre o painel com revista, DOI, PMID e a justificativa de cada uma.'],
  ['O que o tédio tem a ver com isso?', 'Em 11 estudos (Wilson et al., 2014), muita gente não gostou de ficar sozinha só pensando. Esse trabalho não envolve celular; ele ajuda a entender por que aliviar o tédio é tão atraente.']
];

const LIMITES = [
  'Os estudos citados mostram associações e usam escalas de triagem, não diagnóstico.',
  'O 70% de Fortaleza vem de uma só cidade e não representa o Brasil.',
  'O Loop é uma ferramenta de autoconhecimento, inspirada em estudos sobre monitoramento e pausa, e ainda não foi validada cientificamente.'
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colegas = () => { const n = testouN(); return n > 0 ? (n === 1 ? '1 colega' : n + ' colegas') : 'alguns colegas'; };

const htmlRoteiro = () => ROTEIRO.map((b, i) =>
  '<section class="rt-bloco" data-p="' + i + '"><h3>' + esc(nomeDe(i)) + '. ' + b.titulo + ' (' + b.tempo + ')</h3><ol>' +
  b.itens.map(([t, x]) => '<li><b>(' + t + ')</b> ' + esc(x) + '</li>').join('') + '</ol>' +
  '<p class="rt-diga"><b>Diga:</b> ' + esc(b.diga) + '</p><p class="rt-evite"><b>Evite:</b> ' + esc(b.evite) + '</p></section>').join('');

const htmlPerguntas = () => '<ol class="rt-perg">' + PERGUNTAS.map(([p, r]) =>
  '<li><b>"' + esc(p) + '"</b> ' + esc(r.replace('{N}', colegas())) + '</li>').join('') + '</ol>';

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
