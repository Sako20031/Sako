import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Runs api/tulpar's handler inside `vite dev` / `vite preview`, so the site and
// the admin panel work locally (set POSTGRES_URL to use a database).
function localApi() {
  const mount = (server) => {
    server.middlewares.use('/api/tulpar', async (req, res) => {
      const { handle } = await import('./server/handler.js');
      const chunks = [];
      for await (const c of req) chunks.push(c);
      let body = {};
      try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch {}
      const url = new URL(req.url, 'http://localhost');
      const out = await handle({
        method: req.method,
        query: Object.fromEntries(url.searchParams),
        body,
        headers: req.headers,
        ip: req.socket.remoteAddress,
      });
      res.statusCode = out.status;
      for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
      res.end(out.body);
    });
  };
  return { name: 'tulpar-local-api', configureServer: mount, configurePreviewServer: mount };
}

// `npm run build`         → dist/ (site + /admin)
// `npm run build:single`  → dist-single/index.html (everything inlined, for previews)
export default defineConfig(({ mode }) => ({
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 900,
    rollupOptions: mode === 'single' ? undefined : {
      input: { main: resolve(import.meta.dirname, 'index.html'), admin: resolve(import.meta.dirname, 'admin.html') },
    },
  },
  plugins: mode === 'single' ? [viteSingleFile()] : [localApi()],
}));
