import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const URL_BASE = pathToFileURL(path.resolve('dist/index.html')).href;
const LOOP = 'dd-loop-v1', TEAM = 'dd-team-v1';

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
  const y = list.find(s => s.ci === 4).y;
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
  const y = list.find(s => s.ci === 4).y;
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
  await open(page);
  await goToLoop(page);
  await page.keyboard.press('d');
  await expect(page.locator('#autoTag')).toBeVisible();
  await expect(page.locator('[data-view="trigger"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-view="pause"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('[data-view="using"]')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('[data-view="pattern"]')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('#patBody .stat b').first()).toHaveText('25');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP)).toEqual(salvo);
  await page.keyboard.press('d');
  await expect(page.locator('#autoTag')).toBeHidden();
  await expect(page.locator('#homeCount')).toContainText('1 registro');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOOP)).toEqual(salvo);
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
  /* no maximo 4 momentos por capitulo */
  const porCap = {};
  list.filter(s => s.ci < 6).forEach(s => { porCap[s.ci] = (porCap[s.ci] || 0) + 1; });
  Object.values(porCap).forEach(n => expect(n).toBeLessThanOrEqual(4));
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
  const loop = list.find(s => s.ci === 4);
  await page.evaluate(v => window.scrollTo(0, v), loop.y);
  await settle(page, loop.y);
  await page.locator('#btnWant').focus();
  await page.keyboard.press('PageDown');
  await settle(page, list.find(s => s.ci === 5).y);
});

test('painel de defesa das fontes e copiar citacao', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  await open(page);
  await page.keyboard.press('r');
  const dlg = page.locator('#defesa');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('.def-list > li')).toHaveCount(11);
  await expect(dlg.locator('.why', { hasText: 'Por que é artigo científico' })).toHaveCount(11);
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
  await expect(cards).toHaveCount(11);
  await expect(page.locator('.ref-card .seal')).toHaveCount(11);
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
  await expect.poll(() => page.locator('#dados [data-card="2"] .n').textContent(), { timeout: 15000 }).toBe('70%');
  const text = await page.evaluate(() => document.body.textContent);
  expect(text).not.toMatch(/[—–]/);
  expect(text).not.toMatch(/INSTRUÇÕES PARA O CLAUDE/);
  for (const n of ['27%', '17%', '14%', '6%', '+2,8', '70%', '57%', '2,1 milhões', '64 países', '326.397', '286 estudantes']) expect(text).toContain(n);
  expect(text).toContain('Cada estudo usa amostras e escalas diferentes');
  expect(text).toContain('Ilustração do conceito de Schultz et al., 1997');
  await expect(page.locator('.ref-list .why', { hasText: 'Por que é artigo científico:' })).toHaveCount(11);
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
    await expect(page.locator('#dados [data-card="2"]')).toBeVisible();
    await expect(page.locator('#rpe')).toBeVisible();
    await expect(page.locator('#cyCap')).toBeVisible();
    expect(await page.locator('.person.on').first().evaluate(e => getComputedStyle(e).color)).toBe('rgb(255, 138, 61)');
    expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect.getTiming().iterations === Infinity).length)).toBe(0);
    const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(axe.violations.flatMap(v => v.nodes.map(n => n.target.join(' ') + ': ' + (n.any[0] && n.any[0].message)))).toEqual([]);
    expect(log.errors).toEqual([]);
  });
});
