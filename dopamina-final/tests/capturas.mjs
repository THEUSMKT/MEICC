/* Ferramenta de ensaio: abre o build, percorre as paradas e salva capturas de tela.
   Uso: node tests/capturas.mjs <pasta> <LxA> [query] [--paradas=a,b,c] [--sem-movimento] */
import { chromium } from '@playwright/test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [outDir, size = '1366x768', query = 'forcar3d'] = args.filter(a => !a.startsWith('--'));
const [width, height] = size.split('x').map(Number);
const only = (flags.find(f => f.startsWith('--paradas=')) || '').split('=')[1];
const reduced = flags.includes('--sem-movimento');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge', headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']
});
const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const problems = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => problems.push('pageerror: ' + e.message));
page.on('request', r => { if (/^https?:/.test(r.url())) problems.push('externa: ' + r.url()); });

const url = pathToFileURL(path.resolve('dist/index.html')).href + (query ? '?' + query : '');
await page.goto(url);
await page.waitForFunction(() => document.documentElement.dataset.mode, null, { timeout: 30000 });
await page.waitForTimeout(2500);

const stops = await page.evaluate(() => window.__paradas ? window.__paradas() : []);
console.log('modo', await page.evaluate(() => document.documentElement.dataset.mode), 'paradas', stops.length, 'qualidade', await page.evaluate(() => document.documentElement.dataset.quality), 'classe', await page.evaluate(() => document.documentElement.className));
const wanted = only ? only.split(',').map(Number) : stops.map((_, i) => i);
let at = 0;
for (let i = 0; i < stops.length; i++) {
  if (wanted.includes(i)) {
    await page.waitForFunction(y => Math.abs(window.scrollY - y) < 3, stops[i].y, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(i === 0 ? 300 : 5000);
    await page.screenshot({ path: path.join(outDir, String(i).padStart(2, '0') + '.png') });
    const st = await page.evaluate(() => ({ y: Math.round(scrollY), w: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    console.log('parada', i, JSON.stringify(stops[i]), JSON.stringify(st));
  }
  if (i < stops.length - 1) { await page.keyboard.press('PageDown'); await page.waitForFunction(y => Math.abs(window.scrollY - y) < 3, stops[i + 1].y, { timeout: 20000 }).catch(() => {}); at = i + 1; }
}
console.log('problemas:', problems.length ? '\n' + [...new Set(problems)].slice(0, 30).join('\n') : 'nenhum');
await browser.close();
