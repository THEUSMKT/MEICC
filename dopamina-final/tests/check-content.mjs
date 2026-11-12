/* Confere o HTML-fonte contra o backup: fontes, numeros, travessoes e o que nao pode mudar.
   Uso: node tests/check-content.mjs */
import fs from 'node:fs';
import crypto from 'node:crypto';

const original = fs.readFileSync('index.original.html', 'utf8');
const atual = fs.readFileSync('src/index.html', 'utf8');
const roteiro = fs.readFileSync('src/chapters/roteiro.js', 'utf8');
const js = ['chapters/ciclo.js', 'chapters/dopamina.js', 'chapters/loop.js', 'chapters/ponte.js', 'chapters/referencias.js', 'chapters/loop-app.js', 'chapters/roteiro.js', 'core/team.js', 'core/trilho.js']
  .map(f => fs.readFileSync('src/' + f, 'utf8')).join('\n');
const dist = fs.readFileSync('dist/index.html', 'utf8');

const erros = [];
const ok = (cond, msg) => { if (!cond) erros.push(msg); };
const texto = html => html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
const semRefsHtml = atual.replace(/<ul class="ref-list">[\s\S]*?<\/ul>/, ' ');
const visivel = texto(semRefsHtml) + '\n' + roteiro; /* capitulos + paineis N, Q e L */

/* 1. As 11 referencias originais seguem identicas ao backup, e as 4 novas vem depois delas */
const refs = html => (html.match(/<ul class="ref-list">([\s\S]*?)<\/ul>/) || [])[1].split(/<\/li>/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
const a = refs(original), b = refs(atual);
ok(a.length === 11, 'backup deveria ter 11 referencias, tem ' + a.length);
ok(b.length === 15, 'pagina deveria ter 15 referencias, tem ' + b.length);
a.forEach((r, i) => ok(r === b[i], 'referencia ' + (i + 1) + ' mudou'));
ok((atual.match(/Por que é artigo científico:/g) || []).length === 15, 'esperava 15 justificativas');

/* 2. Toda referencia da lista e citada em algum lugar visivel, e toda citacao aponta para a lista */
const lista = b.map(r => { const t = texto(r).trim(); return { autor: t.split(/[ ,]/)[0], ano: (t.match(/\((\d{4})\)/) || [])[1] }; });
lista.forEach(r => ok(new RegExp(r.autor + '[^\\d]{0,45}' + r.ano).test(visivel), 'referencia sem citacao visivel: ' + r.autor + ' ' + r.ano));
const ignorar = /^(De|Em|Entre|Para|Do|No|Na|Os|As|Fortaleza|Sinal|Recompensa|Turma)$/;
const citacoes = [...visivel.matchAll(/([A-ZÀ-Ü][a-zà-ü]+)(?: et al\.| e [A-ZÀ-Ü][a-zà-ü]+|, Dayan e Montague)?,? \(?(\d{4})\)?/g)]
  .map(m => [m[1], m[2]]).filter(([n, y]) => +y >= 1990 && +y <= 2026 && !ignorar.test(n));
citacoes.forEach(([n, y]) => ok(lista.some(r => r.autor === n && r.ano === y), 'citacao sem referencia na lista: ' + n + ' ' + y));

/* 3. Numeros aprovados continuam (na pagina ou nos dados de apoio do painel Q) */
for (const n of ['27%', '17%', '14%', '6%', '+2,8', '70%', '57%']) ok(atual.includes(n) || roteiro.includes(n), 'numero sumiu: ' + n);

/* 4. Frases da nova linha, no texto pedido */
for (const f of [
  'Vamos seguir um único hábito: pegar o celular sem decidir.',
  'Muita gente tem dificuldade de controlar o uso',
  'Por que isso acontece? Vamos olhar para o cérebro.',
  'O que empurra a mão para o celular é o querer',
  'A dopamina move o querer e o aprender. O prazer em si vem de outros sistemas.',
  'Querer e aprender, repetidos todos os dias, viram hábito.',
  'Eliminar a dopamina não é o caminho, porque ela é necessária para querer qualquer recompensa. O que dá para mudar é o ciclo.',
  'Um hábito automático só muda se ficar visível e ganhar uma pausa.',
  'O que interrompe o ciclo: ver e pausar',
  'Foi isso que a gente construiu: o Loop, em fase beta.',
  'Loop beta: o ciclo vira uma escolha',
  'Um aplicativo que ajuda a usar o celular como ferramenta, não como passatempo automático.',
  'Isso é só a fase beta. O que vem depois?',
  'Do hábito automático à escolha',
  'Já funciona no navegador e guarda os dados só no aparelho.',
  'Ferramenta de autoconhecimento. Não é diagnóstico nem tratamento.',
  'Os estudos citados mostram associações e usam escalas de triagem, não diagnóstico.',
  'O 70% de Fortaleza, que está nos dados de apoio, vem de uma só cidade e não representa o Brasil.',
  'O Loop é uma ferramenta de autoconhecimento em fase beta, inspirada em estudos sobre monitoramento e pausa, e ainda não foi validada cientificamente.',
  'Dependência de smartphone ainda não é um diagnóstico oficial, por isso os estudos usam escalas de triagem.',
  'com pausa de 10 s, as aberturas dos apps caíram 57% em 6 semanas'
]) ok(atual.toLowerCase().includes(f.toLowerCase()), 'frase faltando: ' + f);
for (const f of ['núcleo accumbens', 'meta-análise de 71 estudos', '286 estudantes']) ok(roteiro.includes(f), 'dado de apoio faltando: ' + f);

/* 5. Nenhum numero novo nos capitulos (a lista de referencias foi conferida acima) */
const conhecidos = ['47', '100', '2014', '2019', '2010'];
const numerosNovos = [...new Set((texto(semRefsHtml).match(/[+]?\d[\d.,]*\s?%?/g) || []).map(n => n.trim().replace(/[.,]$/, '')))]
  .filter(n => !texto(original).includes(n.trim()) && !/^[01+23]+$/.test(n.trim()));
ok(numerosNovos.filter(n => !conhecidos.includes(n.trim())).length === 0, 'numeros novos no HTML: ' + numerosNovos.join(' | '));

/* 6. Sem travessao e sem emoji em nenhum texto, inclusive roteiro, perguntas e legendas */
ok(!/[—–]/.test(texto(atual)), 'travessao no HTML');
ok(!/[—–]/.test(js), 'travessao nos scripts');
ok(!/\p{Extended_Pictographic}/u.test(texto(atual).replace(/[©®™]/g, '')), 'emoji no HTML');
ok(!/\p{Extended_Pictographic}/u.test(js.replace(/[©®™]/g, '')), 'emoji nos scripts');
ok(!/\bvicia(do|dos)?\b|\bvício\b/i.test(texto(semRefsHtml)), 'vocabulario: vicio ou viciado nos capitulos');

/* 7. Chaves, offline e backup intocado */
ok(js.includes("'dd-loop-v1'"), 'chave dd-loop-v1');
ok(js.includes("'dd-team-v1'"), 'chave dd-team-v1');
ok(!/googleapis|gstatic|cdn\.|unpkg|jsdelivr/.test(atual), 'referencia a CDN no HTML');
ok(!/fonts\.googleapis|fonts\.gstatic/.test(dist), 'Google Fonts no build');
ok(!/<script[^>]+src=/.test(dist) && !/<link[^>]+stylesheet/.test(dist), 'build nao e arquivo unico');
ok(!dist.includes('INSTRUÇÕES PARA O CLAUDE'), 'comentario de instrucoes no build');
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
ok(hash('dist/index.v2-backup.html') === '45f84f29104630dc11abe6a4c554b5a2713dd01ba0dcb5f9ba75d4ccefb6f411', 'o backup dist/index.v2-backup.html mudou');

/* 8. Contraste WCAG AA dos pares de cor principais */
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (x, y) => { const [a1, b1] = [lum(x), lum(y)].sort((p, q) => q - p); return (a1 + 0.05) / (b1 + 0.05); };
const pares = [['#e9eef8', '#080c14'], ['#e9eef8', '#162033'], ['#9aa8c2', '#080c14'], ['#9aa8c2', '#0e1522'], ['#9aa8c2', '#162033'], ['#8fa3c7', '#0e1522'], ['#ff8a3d', '#080c14'], ['#ff8a3d', '#0e1522'], ['#1c0d03', '#ff8a3d'], ['#2a1202', '#ff8a3d'], ['#0b1220', '#7488ad']];
pares.forEach(([f, g]) => ok(ratio(f, g) >= 4.5, 'contraste baixo ' + f + ' sobre ' + g + ': ' + ratio(f, g).toFixed(2)));

if (erros.length) { console.error('FALHOU\n- ' + erros.join('\n- ')); process.exit(1); }
console.log('Conteudo OK: 15 referencias, todas citadas, nenhuma citacao fora da lista, frases da nova linha, numeros, sem travessao, backup v2 intacto, contraste AA.');
