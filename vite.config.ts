import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Mode "single" : bundle sans React/Recharts (chargés en UMD), utilisé pour la version en ligne.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  const shim = (f: string) => fileURLToPath(new URL(`./src/shims/${f}`, import.meta.url));
  return {
    base: './',
    plugins: [react()],
    resolve: {
      alias: single
        ? [
            { find: /^react$/, replacement: shim('react.ts') },
            { find: /^react\/jsx-runtime$/, replacement: shim('jsx-runtime.ts') },
            { find: /^react-dom\/client$/, replacement: shim('react-dom-client.ts') },
            { find: /^react-dom$/, replacement: shim('react-dom.ts') },
            { find: /^recharts$/, replacement: shim('recharts.ts') },
          ]
        : [],
    },
    build: single
      ? {
          outDir: 'dist-single',
          cssCodeSplit: false,
          rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' } },
        }
      : { outDir: 'dist', chunkSizeWarningLimit: 1200 },
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  };
});
