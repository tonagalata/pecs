// PictoTalk web server for Tona Deploy. One container serves:
//
//   /          landing site      (apps/web, Next.js static export)
//   /app/      web board         (apps/mobile, Expo web export with baseUrl /app)
//   /voice/    HD voice pack     (scripts/voice-pack, generated during the Docker build)
//   /healthz   health check for the load balancer
//
// It listens on $PORT, and when DATABASE_URL is set it runs migrations before taking traffic.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { connect, migrate } from './db.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const ROOT = process.env.STATIC_ROOT ?? join(here, 'public');
const SITE = join(ROOT, 'site');
const APP = join(ROOT, 'app');
const VOICE = join(ROOT, 'voice');
// Optional: redirect every other hostname (www, the default Tona URL) to this one.
const CANONICAL_HOST = process.env.CANONICAL_HOST;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
};

const pool = connect();

/** Resolves a URL path inside root. Directories resolve to their index.html. */
async function find(root, urlPath) {
  const file = normalize(join(root, urlPath));
  if (file !== root && !file.startsWith(root + sep)) return null;
  const s = await stat(file).catch(() => null);
  if (s?.isFile()) return { file, size: s.size };
  if (s?.isDirectory()) {
    const index = join(file, 'index.html');
    const si = await stat(index).catch(() => null);
    if (si?.isFile()) return { file: index, size: si.size, dir: true };
  }
  return null;
}

function cacheControl(file) {
  if (file.endsWith('.html')) return 'no-cache';
  // Content-hashed bundles and the versioned voice pack never change at the same URL.
  if (file.includes(`${sep}_next${sep}static${sep}`) || file.includes(`${sep}_expo${sep}static${sep}`) || file.startsWith(VOICE + sep)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

async function send(req, res, { file, size }, status = 200) {
  const headers = {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': cacheControl(file),
    'Vary': 'Accept-Encoding',
  };
  // Pre-compressed copies are written next to text files by precompress.mjs during the build.
  const accept = String(req.headers['accept-encoding'] ?? '');
  for (const [enc, ext] of [['br', '.br'], ['gzip', '.gz']]) {
    if (!accept.includes(enc)) continue;
    const s = await stat(file + ext).catch(() => null);
    if (s?.isFile()) {
      file += ext;
      size = s.size;
      headers['Content-Encoding'] = enc;
      break;
    }
  }
  headers['Content-Length'] = size;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

function text(res, status, body, extra = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(301, { Location: location, 'Cache-Control': 'public, max-age=3600' });
  res.end();
}

async function notFound(req, res) {
  const page = await find(SITE, '/404.html');
  if (page) return send(req, res, page, 404);
  text(res, 404, 'Not found');
}

async function health(res) {
  let db = 'none';
  if (pool) {
    // Reported, not enforced: a database blip shouldn't take the static site down.
    db = await pool.query('SELECT 1').then(() => 'up', () => 'down');
  }
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ ok: true, db }));
}

async function handle(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return text(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
  const url = new URL(req.url ?? '/', 'http://localhost');
  // Never echo a leading "//" back into a Location header (protocol-relative open redirect).
  const pathname = '/' + url.pathname.replace(/^\/+/, '');
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return text(res, 400, 'Bad request');
  }
  if (path === '/healthz') return health(res);

  const host = req.headers.host;
  if (CANONICAL_HOST && host && host !== CANONICAL_HOST) return redirect(res, `https://${CANONICAL_HOST}${pathname}${url.search}`);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (path === '/app') return redirect(res, `/app/${url.search}`);
  if (path.startsWith('/app/')) {
    const rel = path.slice('/app'.length);
    const found = await find(APP, rel);
    if (found) return send(req, res, found);
    // Single-page app: any route without a file extension gets the board's index.html.
    const index = !extname(rel) && (await find(APP, '/index.html'));
    return index ? send(req, res, index) : notFound(req, res);
  }

  if (path.startsWith('/voice/')) {
    const found = await find(VOICE, path.slice('/voice'.length));
    return found ? send(req, res, found) : notFound(req, res);
  }

  const found = await find(SITE, path);
  if (found?.dir && !path.endsWith('/')) return redirect(res, `${pathname}/${url.search}`);
  if (found) return send(req, res, found);
  return notFound(req, res);
}

if (pool) {
  // A failed migration exits before listening, so Tona marks the deploy failed and keeps the old one.
  await migrate(pool, join(here, 'migrations'));
  console.log('database ready');
} else {
  console.log('DATABASE_URL not set; running without a database');
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) text(res, 500, 'Server error');
    else res.destroy();
  });
});
server.listen(PORT, () => console.log(`listening on :${PORT}`));

process.on('SIGTERM', () => {
  server.close(() => (pool ? pool.end() : Promise.resolve()).finally(() => process.exit(0)));
});
