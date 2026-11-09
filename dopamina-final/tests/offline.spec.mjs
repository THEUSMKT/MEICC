import { test, expect } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/* Simula o link publico em um servidor local e depois derruba o servidor: a pagina tem que abrir sem rede. */
const BASE = '/MEICC/dopamina-final/dist/';
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

function servir() {
  return new Promise(res => {
    const s = http.createServer((req, r) => {
      const p = new URL(req.url, 'http://x').pathname;
      const nome = p.startsWith(BASE) ? p.slice(BASE.length) || 'index.html' : null;
      const f = nome && path.resolve('dist', nome);
      if (!f || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
      r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
      r.end(fs.readFileSync(f));
    });
    s.listen(0, 'localhost', () => res(s));
  });
}

const pronta = page => page.waitForFunction(() => document.documentElement.dataset.mode && window.__paradas && window.__paradas().length > 3, null, { timeout: 60000 });

test('depois da primeira visita, a pagina abre sem rede', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== '390x844', 'basta medir uma vez');
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  const s = await servir();
  const raiz = 'http://localhost:' + s.address().port + BASE;
  await page.goto(raiz + 'index.html?sw');
  await pronta(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(async () => (await (await caches.open('dopamina-v1')).keys()).length), { timeout: 15000 }).toBe(5);

  const m = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
  expect(m.display).toBe('standalone');
  expect(m.start_url).toBe('index.html');
  expect(await page.evaluate(async () => (await fetch(document.querySelector('link[rel="apple-touch-icon"]').href)).status)).toBe(200);

  await new Promise(r => { s.close(r); s.closeAllConnections(); });
  for (const destino of ['index.html?sw', 'index.html']) {
    await page.goto(raiz + destino);
    await pronta(page);
    await expect(page.locator('.ref-card')).toHaveCount(15);
    await expect(page.locator('.who[data-who="0"] .nm')).toHaveText('Antony');
    expect(await page.evaluate(() => typeof window.__paradas)).toBe('function');
  }
  /* a demonstracao e a parte mais pesada em scripts: tem que funcionar sem rede tambem */
  await page.keyboard.press('d');
  await expect(page.locator('#demoPanel')).toBeVisible();
  expect(erros).toEqual([]);
});

test('aberto do disco, nao pede manifesto nem cache offline', async ({ page }) => {
  const url = 'file:///' + path.resolve('dist/index.html').replace(/\\/g, '/');
  await page.goto(url);
  await pronta(page);
  expect(await page.locator('link[rel="manifest"]').count()).toBe(0);
  expect(await page.evaluate(() => navigator.serviceWorker ? navigator.serviceWorker.controller : null)).toBeNull();
});
