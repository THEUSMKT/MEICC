import { defineConfig } from '@playwright/test';

/* Testa o arquivo entregue (dist/index.html) aberto direto do disco, como no duplo clique.
   Usa o Edge ja instalado no Windows. So o arquivo apresentacao-3d liga o WebGL por software. */
export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.mjs/,
  timeout: 240000,
  workers: 1,
  reporter: [['list']],
  use: {
    channel: 'msedge',
    headless: true
  },
  projects: [
    { name: '1366x768', use: { viewport: { width: 1366, height: 768 } } },
    { name: '1920x1080', use: { viewport: { width: 1920, height: 1080 } } },
    { name: '390x844', use: { viewport: { width: 390, height: 844 } } }
  ]
});
