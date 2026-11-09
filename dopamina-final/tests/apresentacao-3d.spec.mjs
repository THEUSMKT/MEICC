import { test, expect } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/* Teste do caminho com WebGL. Sem GPU no ambiente de teste, liga o renderizador por software. */
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] } });

const URL_BASE = pathToFileURL(path.resolve('dist/index.html')).href;

test('modo 3D: sem erros, sem rede externa, sem scroll horizontal', async ({ page }) => {
  const errors = [], external = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });

  await page.goto(URL_BASE + '?forcar3d&q=minimo');
  await page.waitForFunction(() => document.documentElement.dataset.mode && window.__paradas && window.__paradas().length > 3, null, { timeout: 60000 });
  expect(await page.evaluate(() => document.documentElement.classList.contains('is-3d'))).toBe(true);
  await page.waitForTimeout(1500);

  const list = await page.evaluate(() => window.__paradas());
  for (let i = 0; i < list.length; i++) {
    await page.evaluate(v => window.scrollTo(0, v), list[i].y);
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, 'scroll horizontal na parada ' + i).toBeLessThanOrEqual(0);
  }
  /* a queda para o plano B nao pode ter acontecido com a qualidade travada */
  expect(await page.evaluate(() => document.documentElement.classList.contains('is-3d'))).toBe(true);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('qualidade adaptativa: FPS baixo reduz a qualidade sozinho', async ({ page }) => {
  await page.goto(URL_BASE + '?forcar3d');
  await page.waitForFunction(() => document.documentElement.dataset.mode, null, { timeout: 60000 });
  expect(await page.evaluate(() => document.documentElement.dataset.quality)).toBe('medio');
  /* por software o FPS e baixo: a qualidade tem que cair e, no limite, a pagina troca para o plano B */
  await expect.poll(async () => page.evaluate(() => {
    const h = document.documentElement;
    return h.classList.contains('no3d') || h.dataset.quality !== 'medio';
  }), { timeout: 90000, intervals: [1000] }).toBe(true);
});
