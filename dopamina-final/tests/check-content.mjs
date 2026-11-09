/* Confere o HTML-fonte contra o backup: fontes, numeros, travessoes e o que nao pode mudar.
   Uso: node tests/check-content.mjs */
import fs from 'node:fs';

const original = fs.readFileSync('index.original.html', 'utf8');
const atual = fs.readFileSync('src/index.html', 'utf8');
const js = ['chapters/ciclo.js', 'chapters/dopamina.js', 'chapters/loop.js', 'chapters/referencias.js', 'chapters/loop-app.js', 'chapters/roteiro.js', 'core/team.js']
  .map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
const dist = fs.readFileSync('dist/index.html', 'utf8');

const erros = [];
const ok = (cond, msg) => { if (!cond) erros.push(msg); };

/* 1. As 11 referencias originais seguem identicas ao backup, e as 4 novas vem depois delas */
const refs = html => (html.match(/<ul class="ref-list">([\s\S]*?)<\/ul>/) || [])[1].split(/<\/li>/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
const a = refs(original), b = refs(atual);
ok(a.length === 11, 'backup deveria ter 11 referencias, tem ' + a.length);
ok(b.length === 15, 'pagina deveria ter 15 referencias, tem ' + b.length);
a.forEach((r, i) => ok(r === b[i], 'referencia ' + (i + 1) + ' mudou'));
const whys = (atual.match(/Por que é artigo científico:/g) || []).length;
ok(whys === 15, 'esperava 15 justificativas, achei ' + whys);
for (const doi of ['10.1037/bul0000498', '10.1126/science.1250830', '10.3390/ijerph16142612', '10.1038/npp.2009.129']) ok(atual.includes('https://doi.org/' + doi), 'DOI novo faltando: ' + doi);

/* 2. Numeros aprovados continuam no texto */
for (const n of ['27%', '17%', '14%', '6%', '+2,8', '70%', '57%']) ok(atual.includes(n), 'numero sumiu: ' + n);

/* 3. Frases novas: texto exato pedido, e cada fonte nova citada por uma frase visivel */
for (const f of [
  'Os estudos citados mostram associações e usam escalas de triagem, não diagnóstico.',
  'O 70% de Fortaleza vem de uma só cidade e não representa o Brasil.',
  'O Loop é uma ferramenta de autoconhecimento, inspirada em estudos sobre monitoramento e pausa, e ainda não foi validada cientificamente.',
  'Em uma meta-análise de 71 estudos, mais uso de vídeos curtos esteve associado a pior atenção. Os dados são correlacionais.',
  'Dependência de smartphone ainda não é um diagnóstico oficial, por isso os estudos usam escalas de triagem.',
  'O núcleo accumbens e os neurônios dopaminérgicos da área tegmental ventral estão no centro do circuito de recompensa.',
  'amostra de uma só cidade'
]) ok(atual.includes(f), 'frase faltando: ' + f);
for (const c of ['Nguyen et al., 2025', 'Wilson et al., 2014', 'Montag et al., 2019', 'Haber e Knutson, 2010']) ok(atual.includes('class="src"') && atual.includes(c), 'fonte nova sem citacao: ' + c);

/* 4. Toda frase com numero na pagina nova ja existia no backup (ou e rotulo conhecido). A lista de referencias foi conferida acima. */
const texto = html => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
const semRefs = texto(atual.replace(/<ul class="ref-list">[\s\S]*?<\/ul>/, ' '));
const permitidos = new Set(['27 em cada 100 pessoas', 'Grade de 100 pessoas com 27 acesas']);
const conhecidos = ['47', '100', '71', '2014', '2019', '2010'];
const numerosNovos = [...new Set((semRefs.match(/[+]?\d[\d.,]*\s?%?/g) || []).map(n => n.trim().replace(/[.,]$/, '')))].filter(n => !texto(original).includes(n.trim()) && !/^[01+23]+$/.test(n.trim()));
ok(numerosNovos.filter(n => !conhecidos.includes(n.trim())).length === 0, 'numeros novos no HTML: ' + numerosNovos.join(' | '));
ok([...permitidos].every(p => atual.includes(p)), 'rotulos da grade mudaram');

/* 5. Sem travessao em nenhum texto visivel do HTML ou dos scripts */
ok(!/[—–]/.test(texto(atual)), 'travessao no HTML');
ok(!/[—–]/.test(js), 'travessao nos scripts');

/* 6. Sem emoji */
ok(!/\p{Extended_Pictographic}/u.test(texto(atual).replace(/[©®™]/g, '')), 'emoji no HTML');
ok(!/\p{Extended_Pictographic}/u.test(js.replace(/[©®™]/g, '')), 'emoji nos scripts');

/* 7. Chaves e offline */
ok(js.includes("'dd-loop-v1'"), 'chave dd-loop-v1');
ok(js.includes("'dd-team-v1'"), 'chave dd-team-v1');
ok(!/googleapis|gstatic|cdn\.|unpkg|jsdelivr/.test(atual), 'referencia a CDN no HTML');
ok(!/fonts\.googleapis|fonts\.gstatic/.test(dist), 'Google Fonts no build');
ok(!/<script[^>]+src=/.test(dist) && !/<link[^>]+stylesheet/.test(dist), 'build nao e arquivo unico');
ok(!dist.includes('INSTRUÇÕES PARA O CLAUDE'), 'comentario de instrucoes no build');
ok(!original.includes('INSTRUÇÕES PARA O CLAUDE'), 'comentario de instrucoes no backup');

/* 8. Contraste WCAG AA dos pares de cor principais */
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (x, y) => { const [a1, b1] = [lum(x), lum(y)].sort((p, q) => q - p); return (a1 + 0.05) / (b1 + 0.05); };
const pares = [['#e9eef8', '#080c14'], ['#e9eef8', '#162033'], ['#9aa8c2', '#080c14'], ['#9aa8c2', '#0e1522'], ['#9aa8c2', '#162033'], ['#8fa3c7', '#0e1522'], ['#ff8a3d', '#080c14'], ['#ff8a3d', '#0e1522'], ['#1c0d03', '#ff8a3d'], ['#2a1202', '#ff8a3d'], ['#0b1220', '#7488ad']];
pares.forEach(([f, g]) => ok(ratio(f, g) >= 4.5, 'contraste baixo ' + f + ' sobre ' + g + ': ' + ratio(f, g).toFixed(2)));

if (erros.length) { console.error('FALHOU\n- ' + erros.join('\n- ')); process.exit(1); }
console.log('Conteudo OK: 11 referencias identicas, 4 novas, 15 justificativas, frases novas, numeros, sem travessao, sem CDN, contraste AA.');
