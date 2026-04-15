import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'extension'),
    emptyOutDir: false,
    cssCodeSplit: false,
    assetsDir: 'assets',
    lib: {
      entry: resolve(__dirname, 'src/chrome-extension-entry.ts'),
      formats: ['iife'],
      name: 'ElensChromeExtension',
      fileName: () => 'inspector.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
