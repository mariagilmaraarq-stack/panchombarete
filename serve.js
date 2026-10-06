const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;
const ENV_FILE = path.join(PUBLIC_DIR, '.env');

function parseEnvFile() {
  const env = {};
  if (fs.existsSync(ENV_FILE)) {
    try {
      const content = fs.readFileSync(ENV_FILE, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          env[key] = val;
        }
      });
    } catch (e) {
      console.warn('Erro ao ler .env:', e);
    }
  }
  return env;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);

  // Endpoint dinâmico para carregar variáveis de ambiente no frontend
  if (reqPath === '/env.js' && req.method === 'GET') {
    const fileEnv = parseEnvFile();
    const anonKey = fileEnv.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || fileEnv.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
    const pubKey = fileEnv.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || anonKey;
    const envData = {
      SUPABASE_URL: fileEnv.SUPABASE_URL || process.env.SUPABASE_URL || 'https://vhhjbqkwvkktuahkqiwj.supabase.co',
      SUPABASE_ANON_KEY: anonKey,
      SUPABASE_PUBLISHABLE_KEY: pubKey,
      WHATSAPP_NUMBER: fileEnv.WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || '595983123456',
      GOOGLE_MAPS_URL: fileEnv.GOOGLE_MAPS_URL || process.env.GOOGLE_MAPS_URL || ''
    };
    const jsContent = `window.__ENV__ = ${JSON.stringify(envData, null, 2)};\n`;
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    return res.end(jsContent);
  }

  // Endpoint para salvar credenciais no arquivo .env
  if (reqPath === '/api/save-env' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const currentEnv = parseEnvFile();
        if (payload.SUPABASE_URL !== undefined) currentEnv.SUPABASE_URL = payload.SUPABASE_URL;
        if (payload.SUPABASE_ANON_KEY !== undefined) {
          if (payload.SUPABASE_ANON_KEY.startsWith('eyJ')) {
            currentEnv.SUPABASE_ANON_KEY = payload.SUPABASE_ANON_KEY;
          } else if (payload.SUPABASE_ANON_KEY.startsWith('sb_publishable_')) {
            currentEnv.SUPABASE_PUBLISHABLE_KEY = payload.SUPABASE_ANON_KEY;
          } else {
            currentEnv.SUPABASE_ANON_KEY = payload.SUPABASE_ANON_KEY;
          }
        }
        if (payload.SUPABASE_PUBLISHABLE_KEY !== undefined) {
          currentEnv.SUPABASE_PUBLISHABLE_KEY = payload.SUPABASE_PUBLISHABLE_KEY;
        }
        if (payload.WHATSAPP_NUMBER !== undefined) currentEnv.WHATSAPP_NUMBER = payload.WHATSAPP_NUMBER;
        if (payload.GOOGLE_MAPS_URL !== undefined) currentEnv.GOOGLE_MAPS_URL = payload.GOOGLE_MAPS_URL;

        const lines = Object.entries(currentEnv).map(([k, v]) => `${k}=${v}`);
        fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (reqPath === '/') reqPath = '/index.html';
  if (reqPath.endsWith('/')) reqPath += 'index.html';

  let filePath = path.join(PUBLIC_DIR, reqPath);

  // If path is a directory without trailing slash, redirect or append index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('500 Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      return res.end(content);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
});
