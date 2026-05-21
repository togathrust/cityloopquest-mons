import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Vite ne sert pas les .js à la racine du projet : on les expose pour le dev. */
const ROOT_SCRIPTS = new Set(['api-base.js']);

function readGoogleMapsApiKey() {
  const envPath = path.join(__dirname, '.env');
  const envLocalPath = path.join(__dirname, '.env.local');
  for (const file of [envLocalPath, envPath]) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/GOOGLE_MAPS_API_KEY\s*=\s*([^\s#]+)/);
    if (m && m[1]) return m[1].trim().replace(/^['"]|['"]$/g, '');
  }
  const keyFile = path.join(__dirname, 'Clé API.txt');
  if (fs.existsSync(keyFile)) {
    const m = fs.readFileSync(keyFile, 'utf8').match(/AIza[A-Za-z0-9_-]+/);
    if (m) return m[0];
  }
  const distKey = path.join(__dirname, 'dist', 'api-key.js');
  if (fs.existsSync(distKey)) {
    const m = fs.readFileSync(distKey, 'utf8').match(/AIza[A-Za-z0-9_-]+/);
    if (m) return m[0];
  }
  return null;
}

function serveRootScriptsPlugin() {
  const attach = (server) => {
    server.middlewares.use((req, res, next) => {
      const name = (req.url || '').split('?')[0].replace(/^\//, '');

      if (name === 'api-key.js') {
        const key = readGoogleMapsApiKey();
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        if (key) {
          res.end(`window.__GOOGLE_MAPS_API_KEY__='${key}';`);
        } else {
          res.end('console.warn("[CLQ] api-key.js: définir GOOGLE_MAPS_API_KEY dans .env ou Clé API.txt");');
        }
        return;
      }

      if (!ROOT_SCRIPTS.has(name)) return next();
      const filePath = path.join(__dirname, name);
      if (!fs.existsSync(filePath)) return next();
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.end(fs.readFileSync(filePath, 'utf8'));
    });
  };
  return {
    name: 'clq-serve-root-scripts',
    configureServer: attach,
    configurePreviewServer: attach
  };
}

const apiProxy = {
  '/api': {
    target: 'https://cityloopquest-api.onrender.com',
    changeOrigin: true,
    secure: true
  }
};

export default defineConfig(({ mode }) => {
  loadEnv(mode, __dirname, '');
  const devHttp = process.env.CLQ_DEV_HTTP === '1';
  return {
    plugins: devHttp ? [serveRootScriptsPlugin()] : [basicSsl(), serveRootScriptsPlugin()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      https: !devHttp,
      proxy: apiProxy,
      hmr: devHttp
        ? undefined
        : {
            protocol: 'wss',
            host: 'localhost'
          }
    },
    preview: {
      host: true,
      port: 5173,
      strictPort: false,
      proxy: apiProxy
    }
  };
});
