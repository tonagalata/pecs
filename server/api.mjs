// Board sharing API. A parent shares a board; therapists, teachers and family join with a
// one-time invite code and can view it or edit it. Every device keeps its own full copy and works
// offline; this API only exchanges changes when a device is online.
//
// Auth is a bearer token per member (only its SHA-256 is stored). There are no accounts and no
// passwords. Roles: owner (the parent who shared it), edit, view.
//
//   POST   /api/boards                        create a shared board            → owner token
//   GET    /api/boards/:id[?rev=n]            the board (or {unchanged} when still at rev n)
//   PUT    /api/boards/:id                    {doc, baseRev} → new rev, or 409 with the latest
//   DELETE /api/boards/:id                    owner: stop sharing (deletes the server copy)
//   POST   /api/boards/:id/invites            owner: {role} → one-time code, 7 days
//   POST   /api/join                          {code, name} → member token and the board
//   GET    /api/boards/:id/members            everyone on the board
//   PATCH  /api/boards/:id/members/:mid       owner: {role}
//   DELETE /api/boards/:id/members/:mid       owner removes someone, or a member leaves
//   PUT    /api/boards/:id/media/:mediaId     edit/owner: upload a photo or recording (raw body)
//   GET    /api/boards/:id/media/:mediaId     any member
import { createHash, randomBytes, randomInt } from 'node:crypto';

const DOC_LIMIT = 8 * 1024 * 1024;
const MEDIA_LIMIT = 6 * 1024 * 1024;
const INVITE_DAYS = 7;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const newId = (prefix) => `${prefix}_${randomBytes(12).toString('base64url')}`;
const newToken = () => `ptk_${randomBytes(32).toString('base64url')}`;
const normCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
function newCode() {
  let c = '';
  for (let i = 0; i < 8; i++) c += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'Too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(req, limit = 64 * 1024) {
  const buf = await readBody(req, limit);
  try { return buf.length ? JSON.parse(buf.toString('utf8')) : {}; } catch { throw new HttpError(400, 'Invalid JSON'); }
}

function cleanName(n) {
  const s = String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!s) throw new HttpError(400, 'A name is needed so others know who you are');
  return s;
}

function checkDoc(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new HttpError(400, 'doc must be an object');
  if (typeof doc.words !== 'object' || !Array.isArray(doc.pages)) throw new HttpError(400, 'doc must have words and pages');
  return doc;
}

// Simple per-IP limiter for invite codes (8 random characters is already ~10^12 combinations).
const attempts = new Map();
function limitJoin(req) {
  // The load balancer appends the real client address last; earlier entries can be made up.
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',').pop().trim() || req.socket.remoteAddress || '?';
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now - a.start > 60_000) { attempts.set(ip, { start: now, n: 1 }); return; }
  if (++a.n > 10) throw new HttpError(429, 'Too many tries. Wait a minute and try again.');
  if (attempts.size > 10_000) attempts.clear();
}

async function auth(pool, req, boardId) {
  const h = String(req.headers.authorization ?? '');
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) throw new HttpError(401, 'Missing token');
  const { rows } = await pool.query(
    'SELECT id, board_id, role, name, last_seen FROM members WHERE token_hash = $1', [sha(token)]);
  const m = rows[0];
  // Same answer for "no such board" and "not a member", so ids can't be probed.
  if (!m || m.board_id !== boardId) throw new HttpError(403, 'No access to this board');
  if (Date.now() - new Date(m.last_seen).getTime() > 60_000) {
    pool.query('UPDATE members SET last_seen = now() WHERE id = $1', [m.id]).catch(() => {});
  }
  return m;
}

const canEdit = (m) => m.role === 'owner' || m.role === 'edit';
const owner = (m) => { if (m.role !== 'owner') throw new HttpError(403, 'Only the person who shared this board can do that'); };

async function members(pool, boardId, me) {
  const { rows } = await pool.query(
    'SELECT id, name, role, created_at, last_seen FROM members WHERE board_id = $1 ORDER BY created_at', [boardId]);
  return rows.map((r) => ({ id: r.id, name: r.name, role: r.role, joinedAt: r.created_at, lastSeen: r.last_seen, me: r.id === me.id }));
}

async function route(pool, req, res, parts) {
  const method = req.method;
  // /api/boards
  if (parts[0] === 'boards' && parts.length === 1 && method === 'POST') {
    const body = await readJson(req, DOC_LIMIT);
    const doc = checkDoc(body.doc);
    const name = cleanName(body.name);
    const boardId = newId('b'), memberId = newId('m'), token = newToken();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO boards (id, doc) VALUES ($1, $2)', [boardId, doc]);
      await client.query('INSERT INTO members (id, board_id, token_hash, role, name) VALUES ($1, $2, $3, $4, $5)',
        [memberId, boardId, sha(token), 'owner', name]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return json(res, 201, { boardId, token, role: 'owner', rev: 1, me: { id: memberId, name } });
  }

  // /api/join
  if (parts[0] === 'join' && parts.length === 1 && method === 'POST') {
    limitJoin(req);
    const body = await readJson(req);
    const code = normCode(body.code);
    const name = cleanName(body.name);
    if (code.length !== 8) throw new HttpError(400, 'Codes have 8 letters and numbers, like K7PQ-4XM2');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'SELECT board_id, role FROM invites WHERE code_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE', [sha(code)]);
      if (!rows[0]) { await client.query('ROLLBACK'); throw new HttpError(404, 'That code is not valid. It may have expired or been used already. Ask for a new one.'); }
      const { board_id: boardId, role } = rows[0];
      const memberId = newId('m'), token = newToken();
      await client.query('INSERT INTO members (id, board_id, token_hash, role, name) VALUES ($1, $2, $3, $4, $5)',
        [memberId, boardId, sha(token), role, name]);
      await client.query('UPDATE invites SET used_at = now(), used_by = $1 WHERE code_hash = $2', [memberId, sha(code)]);
      const b = await client.query('SELECT doc, rev FROM boards WHERE id = $1', [boardId]);
      await client.query('COMMIT');
      return json(res, 200, { boardId, token, role, rev: b.rows[0].rev, doc: b.rows[0].doc, me: { id: memberId, name } });
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  if (parts[0] !== 'boards' || !parts[1]) throw new HttpError(404, 'Not found');
  const boardId = parts[1];
  const me = await auth(pool, req, boardId);

  if (parts.length === 2) {
    if (method === 'GET') {
      const url = new URL(req.url, 'http://x');
      const since = Number(url.searchParams.get('rev'));
      const { rows } = await pool.query('SELECT doc, rev, updated_at FROM boards WHERE id = $1', [boardId]);
      if (!rows[0]) throw new HttpError(403, 'No access to this board');
      if (since && since === rows[0].rev) return json(res, 200, { rev: rows[0].rev, unchanged: true, role: me.role });
      return json(res, 200, { doc: rows[0].doc, rev: rows[0].rev, updatedAt: rows[0].updated_at, role: me.role, me: { id: me.id, name: me.name } });
    }
    if (method === 'PUT') {
      if (!canEdit(me)) throw new HttpError(403, 'You can view this board but not change it');
      const body = await readJson(req, DOC_LIMIT);
      const doc = checkDoc(body.doc);
      const baseRev = Number(body.baseRev);
      const up = await pool.query(
        'UPDATE boards SET doc = $1, rev = rev + 1, updated_at = now() WHERE id = $2 AND rev = $3 RETURNING rev', [doc, boardId, baseRev]);
      if (up.rows[0]) return json(res, 200, { rev: up.rows[0].rev });
      const cur = await pool.query('SELECT doc, rev FROM boards WHERE id = $1', [boardId]);
      return json(res, 409, { error: 'Changed elsewhere', doc: cur.rows[0].doc, rev: cur.rows[0].rev });
    }
    if (method === 'DELETE') {
      owner(me);
      await pool.query('DELETE FROM boards WHERE id = $1', [boardId]);
      return json(res, 200, { ok: true });
    }
  }

  if (parts[2] === 'invites' && parts.length === 3 && method === 'POST') {
    owner(me);
    const body = await readJson(req);
    const role = body.role === 'view' ? 'view' : 'edit';
    const code = newCode();
    const { rows } = await pool.query(
      `INSERT INTO invites (code_hash, board_id, role, created_by, expires_at)
       VALUES ($1, $2, $3, $4, now() + ($5 || ' days')::interval) RETURNING expires_at`,
      [sha(normCode(code)), boardId, role, me.id, String(INVITE_DAYS)]);
    return json(res, 201, { code, role, expiresAt: rows[0].expires_at });
  }

  if (parts[2] === 'members') {
    if (parts.length === 3 && method === 'GET') return json(res, 200, { members: await members(pool, boardId, me) });
    const mid = parts[3];
    if (parts.length === 4 && method === 'PATCH') {
      owner(me);
      if (mid === me.id) throw new HttpError(400, 'You can’t change your own access');
      const body = await readJson(req);
      if (body.role !== 'edit' && body.role !== 'view') throw new HttpError(400, 'role must be edit or view');
      const r = await pool.query('UPDATE members SET role = $1 WHERE id = $2 AND board_id = $3 AND role <> $4', [body.role, mid, boardId, 'owner']);
      if (!r.rowCount) throw new HttpError(404, 'No such person on this board');
      return json(res, 200, { members: await members(pool, boardId, me) });
    }
    if (parts.length === 4 && method === 'DELETE') {
      if (mid === me.id) {
        if (me.role === 'owner') throw new HttpError(400, 'To stop sharing, use Stop sharing instead');
      } else owner(me);
      const r = await pool.query("DELETE FROM members WHERE id = $1 AND board_id = $2 AND role <> 'owner'", [mid, boardId]);
      if (!r.rowCount) throw new HttpError(404, 'No such person on this board');
      return json(res, 200, { ok: true });
    }
  }

  if (parts[2] === 'media' && parts.length === 4) {
    const mediaId = parts[3];
    if (!/^[a-z0-9]{8,64}$/.test(mediaId)) throw new HttpError(400, 'Bad media id');
    if (method === 'PUT') {
      if (!canEdit(me)) throw new HttpError(403, 'You can view this board but not change it');
      const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      // No SVG: it can carry scripts.
      if (!/^(image|audio)\/[a-z0-9.+-]+$/.test(mime) || mime.includes('svg')) throw new HttpError(415, 'Only images and audio');
      const data = await readBody(req, MEDIA_LIMIT);
      if (!data.length) throw new HttpError(400, 'Empty');
      await pool.query('INSERT INTO media (board_id, id, mime, data) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [boardId, mediaId, mime, data]);
      return json(res, 200, { ok: true });
    }
    if (method === 'GET' || method === 'HEAD') {
      const { rows } = await pool.query('SELECT mime, data FROM media WHERE board_id = $1 AND id = $2', [boardId, mediaId]);
      if (!rows[0]) throw new HttpError(404, 'Not found');
      res.writeHead(200, { 'Content-Type': rows[0].mime, 'Content-Length': rows[0].data.length, 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'", ...CORS });
      return res.end(method === 'HEAD' ? undefined : rows[0].data);
    }
  }

  throw new HttpError(404, 'Not found');
}

/** Handles /api/*. Returns 503 when the app has no database. */
export async function handleApi(pool, req, res, pathname) {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (!pool) return json(res, 503, { error: 'Sharing is not set up on this server (no database).' });
  const parts = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  try {
    await route(pool, req, res, parts);
  } catch (err) {
    if (err instanceof HttpError) return json(res, err.status, { error: err.message });
    console.error('api:', err);
    return json(res, 500, { error: 'Server error' });
  }
}
