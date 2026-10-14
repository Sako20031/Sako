import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → dist/ (normal multi-file build for hosting)
// `npm run build:single`  → dist-single/index.html (everything inlined, for previews)
export default defineConfig(({ mode }) => ({
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 900,
  },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
}));
