import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* O resultado e um unico dist/index.html com JS, CSS e fontes embutidos: abre com duplo clique, sem servidor. */
export default defineConfig({
  root: 'src',
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 5000
  },
  server: { host: '127.0.0.1', port: 5173 }
});
