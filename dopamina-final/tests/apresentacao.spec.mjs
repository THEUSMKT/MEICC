import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const URL_BASE = pathToFileURL(path.resolve('dist/index.html')).href;
const LOOP = 'dd-loop-v1', TEAM = 'dd-team-v1';
const CAP = { abertura: 0, dados: 1, dopamina: 2, ciclo: 3, ponte: 4, loop: 5, conclusao: 6 };

/* Registra erros de console e qualquer requisicao que saia do arquivo local. */
function watch(page) {
  const log = { errors: [], external: [] };
  page.on('console', m => { if (m.type() === 'error') log.errors.push(m.text()); });
  page.on('pageerror', e => log.errors.push(e.message));
  page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) log.external.push(r.url()); });
  return log;
}

async function open(page, query = '') {
  await page.goto(URL_BASE + (query ? '?' + query : ''));
  await page.waitForFunction(() => document.documentElement.dataset.mode && window.__paradas && window.__paradas().length > 3, null, { timeout: 60000 });
}

const stops = page => page.evaluate(() => window.__paradas());
const isDesktop = testInfo => testInfo.project.name !== '390x844';
const settle = (page, y) => page.waitForFunction(v => Math.abs(window.scrollY - Math.min(v, document.documentElement.scrollHeight - window.innerHeight)) < 3, y, { timeout: 30000 });

/* Clica como uma pessoa. No desktop usa o mouse de verdade: o click() do Playwright rola a pagina
   ao tentar enxergar botoes dentro do celular em 3D, coisa que uma pessoa nao faz. */
async function press(page, loc) {
  await expect(loc).toBeVisible();
  await expect(loc).toBeEnabled();
  if (page.viewportSize().width < 900) { await loc.click(); return; }
  await loc.evaluate(el => {
    const v = el.closest('.views');
    if (!v) return;
    const r = el.getBoundingClientRect(), b = v.getBoundingClientRect();
    if (r.bottom > b.bottom || r.top < b.top) v.scrollTop += r.top - b.top - 24;
  });
  const box = await loc.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
}

async function goToLoop(page) {
  const list = await stops(page);
  const y = list.find(s => s.ci === CAP.loop).y;
  await page.evaluate(v => window.scrollTo(0, v), y);
  await settle(page, y);
  /* como um mouse de verdade: passa por cima do celular, que endireita, e so depois clica */
  await page.locator('.phone').hover({ position: { x: 14, y: 60 } });
  await page.waitForTimeout(600);
}

/* Percorre todas as paradas conferindo erros e scroll horizontal. */
async function walk(page) {
  const list = await stops(page);
  for (let i = 0; i < list.length; i++) {
    await page.evaluate(v => window.scrollTo(0, v), list[i].y);
    await page.waitForTimeout(120);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, 'scroll horizontal na parada ' + i).toBeLessThanOrEqual(0);
  }
}

test('modo padrao: sem erros, sem rede externa, sem scroll horizontal', async ({ page }) => {
  const log = watch(page);
  await open(page);
  await walk(page);
  expect(log.errors).toEqual([]);
  expect(log.external).toEqual([]);
});

test('fontes e bibliotecas sao locais', async ({ page }) => {
  await open(page);
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')));
  for (const fam of ['Sora', 'IBM Plex Sans', 'JetBrains Mono']) expect(loaded.join('|')).toContain(fam);
  const remote = await page.evaluate(() => [...document.querySelectorAll('link[href^="http"],script[src^="http"]')].length);
  expect(remote).toBe(0);
});

test('fluxo completo do Loop, com a pausa encurtada', async ({ page }) => {
  const log = watch(page);
  const antigo = { entries: [{ trigger: 'tedio', dec: 'outra', dur: 0, feel: null, app: 'TikTok', t: 1 }], pending: null };
  await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seed')) { localStorage.setItem(k, JSON.stringify(v)); sessionStorage.setItem('seed', '1'); } }, [LOOP, antigo]);
  await open(page, 'pausa=0.4');
  await goToLoop(page);
  const yLoop = await page.evaluate(() => window.scrollY);
  const app = page.locator('#app');
  const homeCount = await page.locator('#homeCount').textContent();
  expect(homeCount).toContain('1 registro');

  await press(page, page.locator('#btnWant'));
  await press(page, app.locator('[data-chip="trigger"][data-val="ansiedade"]'));
  await press(page, app.locator('[data-chip="app"][data-val="TikTok"]'));
  await press(page, page.locator('#btnTrigNext'));
  await expect(page.locator('#btnOpen')).toBeEnabled({ timeout: 5000 });
  await expect(page.locator('#ringNum')).toHaveText('Escolha');
  await press(page, page.locator('#btnOpen'));
  await expect(page.locator('[data-view="using"]')).toBeVisible();
  let dados = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP);
  expect(dados.pending.trigger).toBe('ansiedade');

  await press(page, app.locator('[data-act="finish"]'));
  await press(page, app.locator('[data-act="feel"][data-val="arrependi"]'));
  await expect(page.locator('#doneTitle')).toHaveText('Registro salvo');
  dados = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP);
  expect(dados.entries.length).toBe(2);
  expect(dados.entries[0].app).toBe('TikTok');
  expect(dados.entries[1].feel).toBe('arrependi');
  expect(dados.pending).toBeNull();

  await press(page, app.locator('[data-act="toPattern"]'));
  await expect(page.locator('#patBody')).toContainText('O gatilho que mais aparece');

  /* dados de exemplo */
  await press(page, page.locator('#btnDemo'));
  await expect(page.locator('#demoTag')).toBeVisible();
  await expect(page.locator('#patBody .stat b').first()).toHaveText('24');
  await press(page, page.locator('#btnDemo'));

  /* caminho "fazer outra coisa" */
  await press(page, app.locator('[data-tab="home"]'));
  await press(page, page.locator('#btnWant'));
  await press(page, app.locator('[data-chip="trigger"][data-val="tedio"]'));
  await press(page, page.locator('#btnTrigNext'));
  await expect(page.locator('#btnOther')).toBeEnabled({ timeout: 5000 });
  await press(page, page.locator('#btnOther'));
  await expect(page.locator('#doneTitle')).toHaveText('Boa escolha');
  dados = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP);
  expect(dados.entries.length).toBe(3);

  if (page.viewportSize().width >= 900) expect(Math.abs(await page.evaluate(() => window.scrollY) - yLoop)).toBeLessThan(3);

  /* os dados sobrevivem a um recarregamento */
  await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.mode);
  await goToLoop(page);
  await expect(page.locator('#homeCount')).toContainText('3 registros');

  /* apagar pede dois toques */
  await press(page, app.locator('[data-tab="pattern"]'));
  await press(page, page.locator('#btnWipe'));
  await expect(page.locator('#btnWipe')).toHaveText('Toque de novo para apagar');
  await press(page, page.locator('#btnWipe'));
  dados = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP);
  expect(dados.entries.length).toBe(0);
  expect(log.errors).toEqual([]);
});

test('um clique direto, com o celular ainda se endireitando, nao se perde', async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'no celular a cena nao inclina');
  await open(page);
  const list = await stops(page);
  const y = list.find(s => s.ci === CAP.loop).y;
  await page.evaluate(v => window.scrollTo(0, v), y);
  await settle(page, y);
  await page.waitForTimeout(800);
  await page.mouse.move(5, 300);
  await page.waitForTimeout(500);
  const r = await page.locator('#btnWant').boundingBox();
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('[data-view="trigger"]')).toBeVisible();
});

test('sem o parametro de teste, a pausa continua sendo de 10 s', async ({ page }) => {
  await open(page);
  await goToLoop(page);
  await press(page, page.locator('#btnWant'));
  await press(page, page.locator('[data-chip="trigger"][data-val="tedio"]'));
  await press(page, page.locator('#btnTrigNext'));
  await expect(page.locator('#ringNum')).toHaveText('10');
  await page.waitForTimeout(8000);
  await expect(page.locator('#btnOpen')).toBeDisabled();
  await expect(page.locator('#btnOpen')).toBeEnabled({ timeout: 4000 });
});

test('demonstracao automatica nao grava nada e devolve os dados', async ({ page }) => {
  const salvo = { entries: [{ trigger: 'habito', dec: 'outra', dur: 0, feel: null, app: null, t: 7 }], pending: null };
  await page.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [LOOP, salvo]);
  await open(page, 'demoSpeed=fast');
  await goToLoop(page);
  await page.keyboard.press('d');
  await expect(page.locator('#autoTag')).toBeVisible();
  await expect(page.locator('#demoPanel')).toBeVisible();
  await expect(page.locator('[data-view="pattern"]')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#dpStep')).toHaveText('7 de 7');
  await expect(page.locator('#demoTag')).toBeVisible();
  await expect(page.locator('#patBody .stat b').first()).toHaveText('25');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP)).toEqual(salvo);
  await page.keyboard.press('d');
  await expect(page.locator('#autoTag')).toBeHidden();
  await expect(page.locator('#demoPanel')).toBeHidden();
  await expect(page.locator('#homeCount')).toContainText('1 registro');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP)).toEqual(salvo);
});

test('demonstracao no ritmo padrao: tempos minimos e 10 s reais', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== '1366x768', 'cronometra uma vez so');
  await open(page);
  await goToLoop(page);
  await page.evaluate(() => {
    const views = [...document.querySelectorAll('#app [data-view]')];
    const now = () => views.find(v => !v.hidden).dataset.view;
    let cur = now();
    window.__tempos = [];
    new MutationObserver(() => { const v = now(); if (v !== cur) { cur = v; window.__tempos.push([v, performance.now()]); } })
      .observe(document.getElementById('views'), { subtree: true, attributes: true, attributeFilter: ['hidden'] });
    new MutationObserver(() => { if (document.getElementById('ringNum').textContent === 'Escolha') window.__escolha = window.__escolha || performance.now(); })
      .observe(document.getElementById('ringNum'), { childList: true, characterData: true, subtree: true });
  });
  const t0 = await page.evaluate(() => { window.__t0 = performance.now(); return window.__t0; });
  await page.keyboard.press('d');
  await expect(page.locator('[data-view="pattern"]')).toBeVisible({ timeout: 90000 });
  const r = await page.evaluate(() => ({ t: window.__tempos, escolha: window.__escolha }));
  const marcas = [['home', t0], ...r.t];
  const nomes = marcas.map(m => m[0]);
  expect(nomes).toEqual(['home', 'trigger', 'pause', 'using', 'feel', 'done', 'pattern']);
  const duracoes = marcas.slice(0, -1).map((m, i) => [m[0], Math.round(marcas[i + 1][1] - m[1])]);
  const total = Math.round(marcas[marcas.length - 1][1] - t0);
  const pausa = Math.round(r.escolha - marcas[2][1]);
  console.log('TEMPOS DA DEMONSTRACAO (ms): ' + JSON.stringify({ duracoes, ateSeuPadrao: total, contagemDaPausa: pausa }));
  duracoes.forEach(([v, d]) => expect(d, 'tempo na tela: ' + v).toBeGreaterThanOrEqual(4000));
  expect(total).toBeGreaterThanOrEqual(45000);
  expect(pausa).toBeGreaterThanOrEqual(9950);
  expect(pausa).toBeLessThan(10600);
});

test('controles da demonstracao: manual, passos, velocidade, pausa e Esc', async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'teclas do projetor');
  await open(page);
  await goToLoop(page);
  await page.keyboard.press('d');
  await expect(page.locator('#dpStep')).toHaveText('1 de 7');
  await expect(page.locator('#dpCap')).toContainText('Gatilho: você sente a vontade e registra');
  await expect(page.locator('#dpSrc')).toBeHidden();
  const fonte = await page.locator('#dpCap').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  expect(fonte).toBeGreaterThanOrEqual(testInfo.project.name === '1920x1080' ? 24 : 23.5);
  await page.keyboard.press('m');
  await expect(page.locator('#dpMode')).toHaveText('Manual');
  /* no manual nada avanca sozinho, mesmo depois do tempo do passo */
  await page.waitForTimeout(7600);
  await expect(page.locator('#dpStep')).toHaveText('1 de 7');
  await page.keyboard.press('PageDown');
  await expect(page.locator('#dpStep')).toHaveText('2 de 7');
  await expect(page.locator('[data-view="trigger"]')).toBeVisible();
  await page.keyboard.press('PageUp');
  await expect(page.locator('#dpStep')).toHaveText('1 de 7');
  await expect(page.locator('[data-view="home"]')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#dpStep')).toHaveText('2 de 7');
  await page.keyboard.press('PageDown');
  await expect(page.locator('#dpStep')).toHaveText('3 de 7');
  await expect(page.locator('[data-view="pause"]')).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.locator('#dpSpeed')).toHaveText('Lento');
  await page.keyboard.press('3');
  await expect(page.locator('#dpSpeed')).toHaveText('Rápido');
  await page.keyboard.press('2');
  await expect(page.locator('#dpSpeed')).toHaveText('Normal');
  /* Espaco congela a contagem do anel */
  await page.keyboard.press(' ');
  await expect(page.locator('#dpPaused')).toBeVisible();
  const antes = await page.locator('#ringNum').textContent();
  await page.waitForTimeout(1800);
  await expect(page.locator('#ringNum')).toHaveText(antes);
  await page.keyboard.press(' ');
  await expect(page.locator('#dpPaused')).toBeHidden();
  await expect.poll(() => page.locator('#ringNum').textContent(), { timeout: 4000 }).not.toBe(antes);
  await page.keyboard.press('Escape');
  await expect(page.locator('#demoPanel')).toBeHidden();
  await expect(page.locator('[data-view="home"]')).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), LOOP)).toBeNull();
});

test('demonstracao rola a tela do celular ate a pergunta do app', async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'no celular a tela do app ja mostra as opcoes');
  /* altura real de uma janela do Edge em 1366x768, com barra de endereco e barra de tarefas */
  await page.setViewportSize({ width: page.viewportSize().width, height: 657 });
  await open(page);
  await goToLoop(page);
  await page.keyboard.press('d');
  const insta = page.locator('[data-chip="app"][data-val="Instagram"]');
  await expect(insta).toHaveAttribute('aria-checked', 'true', { timeout: 30000 });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const v = document.getElementById('views'), r = v.getBoundingClientRect();
    const chip = document.querySelector('[data-chip="app"][data-val="Instagram"]').getBoundingClientRect();
    const h4 = document.querySelector('[data-view="trigger"] h4').getBoundingClientRect();
    return { cabe: v.scrollHeight <= v.clientHeight, rolou: v.scrollTop, chipDentro: chip.top >= r.top - 1 && chip.bottom <= r.bottom + 1, perguntaDentro: h4.top >= r.top - 1 && h4.bottom <= r.bottom + 1 };
  });
  expect(m.cabe, 'nesta altura as opcoes nao cabem sem rolar').toBe(false);
  expect(m.rolou).toBeGreaterThan(0);
  expect(m.chipDentro, 'o chip do app tocado aparece na tela do celular').toBe(true);
  expect(m.perguntaDentro, 'a pergunta "Qual app?" aparece junto').toBe(true);
  await page.keyboard.press('Escape');
});

test('roteiro, perguntas e limites (N, Q e L)', async ({ page }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [TEAM, { n1: 'Bia', testou: '12' }]);
  await open(page);
  const cola = page.locator('#cola');
  await expect(cola).toBeHidden();
  await page.keyboard.press('n');
  await expect(cola).toBeVisible();
  await expect(page.locator('#colaT')).toHaveText('Roteiro');
  await expect(cola.locator('.rt-bloco')).toHaveCount(3);
  await expect(cola.locator('.rt-bloco h3').first()).toHaveText('Bia. Problema (0:00 a 1:30)');
  await expect(cola).not.toContainText('—');
  await page.keyboard.press('h');
  await expect(cola).toBeHidden();
  await page.keyboard.press('h');
  await page.keyboard.press('q');
  await expect(page.locator('#colaT')).toHaveText('Perguntas prováveis');
  await expect(cola.locator('.rt-perg > li')).toHaveCount(9);
  await expect(cola).toContainText('Testamos com 12 colegas.');
  await page.keyboard.press('l');
  await expect(page.locator('#colaT')).toHaveText('Limites deste trabalho');
  await expect(cola).toContainText('12 colegas testaram a ferramenta.');
  await page.keyboard.press('Escape');
  await expect(cola).toBeHidden();
  await expect(page.locator('#limTest')).toHaveText(' 12 colegas testaram a ferramenta.');
  /* o editor de nomes e o botao de imprimir sairam da pagina */
  await expect(page.locator('.editor')).toHaveCount(0);
  await expect(page.getByText('Roteiro e perguntas (imprimir)')).toHaveCount(0);
});

test('dados revelam um quadro por vez e nada avanca sozinho', async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'no celular os quadros ficam empilhados');
  await open(page);
  const list = await stops(page);
  const quadros = list.filter(s => s.ci === CAP.dados);
  expect(quadros.length).toBe(2);
  const visiveis = () => page.locator('#dados .card').evaluateAll(cs => cs.map(c => getComputedStyle(c).visibility === 'visible' && +getComputedStyle(c).opacity > 0.5));
  for (let i = 0; i < 2; i++) {
    await page.evaluate(v => window.scrollTo(0, v), quadros[i].y);
    await settle(page, quadros[i].y);
    await expect.poll(visiveis, { timeout: 8000 }).toEqual([0, 1].map(k => k === i));
  }
  await page.waitForTimeout(3500);
  expect(await visiveis()).toEqual([false, true]);
  expect(await page.evaluate(() => window.scrollY)).toBe(quadros[1].y);
});

test('capitulos cabem na tela de 1366x768 sem rolagem interna', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== '1366x768', 'medida especifica do projetor');
  await open(page);
  const list = await stops(page);
  for (const ci of [1, 2, 3, 4, 5, 6]) {
    const s = list.find(x => x.ci === ci);
    await page.evaluate(v => window.scrollTo(0, v), s.y);
    await settle(page, s.y);
    await page.waitForTimeout(500);
    const m = await page.evaluate(i => {
      const sec = document.querySelectorAll('.chapter')[i], w = sec.querySelector('.wrap').getBoundingClientRect();
      return { top: w.top, bottom: w.bottom, extra: sec.scrollHeight - sec.clientHeight, vh: window.innerHeight };
    }, ci);
    expect(m.extra, 'rolagem interna no capitulo ' + ci).toBeLessThanOrEqual(0);
    expect(m.top, 'topo do capitulo ' + ci).toBeGreaterThanOrEqual(96);
    expect(m.bottom, 'fim do capitulo ' + ci).toBeLessThanOrEqual(m.vh);
  }
});

test('nomes da equipe e turma aparecem sem editar nada', async ({ page }) => {
  await open(page);
  const nomes = ['Antony', 'Davi', 'Edson'];
  for (let i = 0; i < nomes.length; i++) {
    const barra = page.locator(`.who[data-who="${i}"] .nm`);
    await expect(barra).toBeVisible();
    await expect(barra).toHaveText(nomes[i]);
    await expect(page.locator('.team-list strong').nth(i)).toHaveText(nomes[i]);
    await expect(page.locator('.team-list .av').nth(i)).toHaveText(nomes[i][0]);
  }
  const cortado = await page.locator('.who .nm').evaluateAll(els => els.some(el => el.scrollWidth > el.clientWidth));
  expect(cortado).toBe(false);
  await expect(page.locator('#eyebrow')).toHaveText('Feira científica, Turma 2312');
  await expect(page.locator('[data-turma]')).toHaveText('Turma 2312');
});

test('barra do topo: cronometro, marcadores, tecla H e nomes', async ({ page }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [TEAM, { n2: 'Bia' }]);
  await open(page);
  await expect(page.locator('.who[data-who="1"] .nm')).toHaveText('Bia');
  await expect(page.locator('#clk')).toHaveText('05:00');
  await page.keyboard.press('t');
  await page.waitForTimeout(1600);
  await expect(page.locator('#clk')).not.toHaveText('05:00');
  await page.keyboard.press('t');
  const left = await page.evaluate(() => [document.getElementById('tick1').style.left, document.getElementById('tick2').style.left]);
  expect(parseFloat(left[0])).toBeCloseTo(30, 1);
  expect(parseFloat(left[1])).toBeCloseTo(63.33, 1);
  const barra = () => page.evaluate(() => { const r = document.getElementById('bar').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; });
  await page.keyboard.press('h');
  await expect.poll(async () => (await barra()).bottom, { timeout: 10000 }).toBeLessThanOrEqual(0);
  await page.keyboard.press('h');
  await expect.poll(async () => (await barra()).top, { timeout: 10000 }).toBe(0);
});

test('PageDown e PageUp andam exatamente uma parada por toque', async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'controle remoto so se aplica ao projetor');
  await open(page);
  const list = await stops(page);
  /* no maximo 3 momentos por capitulo */
  const porCap = {};
  list.filter(s => s.ci < 7).forEach(s => { porCap[s.ci] = (porCap[s.ci] || 0) + 1; });
  Object.values(porCap).forEach(n => expect(n).toBeLessThanOrEqual(3));
  for (let i = 1; i < list.length; i++) {
    await page.keyboard.press('PageDown');
    await settle(page, list[i].y);
  }
  for (let i = list.length - 2; i >= 0; i--) {
    await page.keyboard.press('PageUp');
    await settle(page, list[i].y);
  }
  /* espera a ultima animacao de scroll acabar antes do salto */
  await page.waitForTimeout(900);
  /* o apresentador ativo acompanha o capitulo */
  const dop = list.find(s => s.ci === 2).y;
  await page.evaluate(v => window.scrollTo(0, v), dop);
  await settle(page, dop);
  await expect(page.locator('.who[data-who="1"]')).toHaveAttribute('aria-current', 'true');
  /* com o foco dentro do celular, o controle remoto continua navegando */
  const loop = list.find(s => s.ci === CAP.loop);
  await page.evaluate(v => window.scrollTo(0, v), loop.y);
  await settle(page, loop.y);
  await page.locator('#btnWant').focus();
  await page.keyboard.press('PageDown');
  await settle(page, list.find(s => s.ci === CAP.conclusao).y);
});

test('painel de defesa das fontes e copiar citacao', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await open(page);
  await page.keyboard.press('r');
  const dlg = page.locator('#defesa');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.def-list > li')).toHaveCount(15);
  await expect(dlg.locator('.why', { hasText: 'Por que é artigo científico' })).toHaveCount(15);
  const y = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => document.getElementById('defesaList').scrollTop), { timeout: 5000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
  await page.keyboard.press('r');
  await expect(dlg).toBeHidden();
  await page.keyboard.press('r');
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();

  const cards = page.locator('.ref-card');
  await expect(cards).toHaveCount(15);
  await expect(page.locator('.ref-card .seal')).toHaveCount(15);
  const first = cards.first();
  await first.scrollIntoViewIfNeeded();
  /* os cartoes entram com animacao: clica depois que o cartao apareceu */
  await expect.poll(() => first.evaluate(e => getComputedStyle(e).visibility + ':' + getComputedStyle(e).opacity), { timeout: 10000 }).toBe('visible:1');
  await first.locator('[data-copy]').click();
  await expect(first.locator('[data-copy] span:not(.ripple)')).toHaveText('Citação copiada');
  await expect(first.locator('a.mini-btn')).toHaveAttribute('href', 'https://doi.org/10.1016/j.cpr.2022.102128');
});

test('conteudo: sem travessao, numeros e justificativas', async ({ page }) => {
  await open(page);
  /* os numeros contam a partir de zero ao entrar: confere depois de percorrer a apresentacao */
  const list = await stops(page);
  for (const s of list) {
    await page.evaluate(v => window.scrollTo(0, v), s.y);
    await settle(page, s.y);
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.locator('#dados [data-card="0"] .n').textContent(), { timeout: 15000 }).toBe('27%');
  await expect.poll(() => page.locator('#dados [data-card="1"] .n').textContent(), { timeout: 15000 }).toBe('+2,8');
  /* os dados de apoio vivem no painel Q; o texto conferido inclui roteiro, perguntas e limites */
  let text = await page.evaluate(() => document.body.textContent);
  for (const k of ['n', 'q', 'l']) {
    await page.keyboard.press(k);
    text += await page.locator('#colaBody').textContent();
  }
  await page.keyboard.press('Escape');
  expect(text).not.toMatch(/[—–]/);
  expect(text).not.toMatch(/INSTRUÇÕES PARA O CLAUDE/);
  for (const n of ['27%', '17%', '14%', '6%', '+2,8', '70%', '57%', '2,1 milhões', '64 países', '326.397', '286 estudantes']) expect(text).toContain(n);
  expect(text).toContain('Cada estudo usa amostras e escalas diferentes');
  expect(text).toContain('Ilustração do conceito de Schultz et al., 1997');
  await expect(page.locator('.ref-list .why', { hasText: 'Por que é artigo científico:' })).toHaveCount(15);
  const emoji = await page.evaluate(() => /\p{Extended_Pictographic}/u.test(document.body.textContent.replace(/[©®™]/g, '')));
  expect(emoji).toBe(false);
});

test.describe('movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });
  test('sem cenas presas, sem 3D, conteudo completo e sem contraste ruim', async ({ page }) => {
    const log = watch(page);
    await open(page);
    expect(await page.evaluate(() => document.documentElement.classList.contains('no3d'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe('flat');
    expect(await page.locator('.pin-spacer').count()).toBe(0);
    await expect(page.locator('#dados [data-card="0"] .n')).toHaveText('27%');
    await expect(page.locator('#dados [data-card="1"] .n')).toHaveText('+2,8');
    await expect(page.locator('#ponte .cy-fallback')).toBeVisible();
    await expect(page.locator('#rpe')).toBeVisible();
    await expect(page.locator('#cyCap')).toBeVisible();
    expect(await page.locator('.person.on').first().evaluate(e => getComputedStyle(e).color)).toBe('rgb(255, 138, 61)');
    expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect.getTiming().iterations === Infinity).length)).toBe(0);
    const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(axe.violations.flatMap(v => v.nodes.map(n => n.target.join(' ') + ': ' + (n.any[0] && n.any[0].message)))).toEqual([]);
    expect(log.errors).toEqual([]);
  });
});

test('linha narrativa: ordem, no maximo 3 passos e o elo no ultimo passo', async ({ page }, testInfo) => {
  test.skip(!isDesktop(testInfo), 'os passos presos so existem na tela grande');
  await open(page);
  const ids = await page.evaluate(() => [...document.querySelectorAll('.chapter')].map(c => c.id));
  expect(ids.slice(0, 7)).toEqual(['abertura', 'dados', 'dopamina', 'ciclo', 'ponte', 'loop', 'conclusao']);
  const list = await stops(page);
  for (const id of ['dados', 'dopamina', 'ciclo', 'ponte', 'loop']) {
    const passos = list.filter(s => s.ci === CAP[id]);
    expect(passos.length, 'passos em ' + id).toBeLessThanOrEqual(3);
    const elo = page.locator('#' + id + ' .elo');
    await expect(elo).toHaveCount(1);
    if (passos.length > 1) {
      await page.evaluate(v => window.scrollTo(0, v), passos[0].y);
      await settle(page, passos[0].y);
      await expect.poll(() => elo.evaluate(e => +getComputedStyle(e).opacity), { timeout: 5000 }).toBeLessThan(0.1);
    }
    const ultimo = passos[passos.length - 1];
    await page.evaluate(v => window.scrollTo(0, v), ultimo.y);
    await settle(page, ultimo.y);
    await expect.poll(() => elo.evaluate(e => +getComputedStyle(e).opacity), { timeout: 5000 }).toBeGreaterThan(0.9);
  }
  /* a conclusao fecha a linha e nao tem elo */
  await expect(page.locator('#conclusao .elo')).toHaveCount(0);
});

test('trilho: no ativo por capitulo, clique leva ao capitulo e a tecla H nao o esconde', async ({ page }) => {
  await open(page);
  const list = await stops(page);
  const nomes = { dados: 'Problema', dopamina: 'Cérebro', ciclo: 'Hábito', ponte: 'Interromper', loop: 'Loop beta', conclusao: 'Loop beta' };
  for (const [id, no] of Object.entries(nomes)) {
    const s = list.find(x => x.ci === CAP[id]);
    await page.evaluate(v => window.scrollTo(0, v), s.y);
    await settle(page, s.y);
    await expect(page.locator('#trilho button.on')).toHaveText(no);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 0);
  await page.locator('#trilho [data-ir="ponte"]').click();
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 8000 }).toBe(list.find(x => x.ci === CAP.ponte).y);
  await expect(page.locator('#trilho button.on')).toHaveText('Interromper');
  await page.keyboard.press('h');
  await expect.poll(() => page.evaluate(() => document.getElementById('bar').getBoundingClientRect().bottom), { timeout: 5000 }).toBeLessThanOrEqual(0);
  await expect(page.locator('#trilho')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('trilho').getBoundingClientRect().top), { timeout: 5000 }).toBe(0);
  await page.keyboard.press('h');
});
