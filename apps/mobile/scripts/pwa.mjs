// Runs after `expo export --platform web`. Turns the export into an installable offline web app:
//   - dist/manifest.webmanifest (name, icons, standalone display) under the right base URL
//   - the manifest and iPhone/iPad icon links in dist/index.html pointed at the base URL
//   - dist/sw.js with the full list of files to download at install and a build id
// Usage: node scripts/pwa.mjs [distDir]   (EXPO_BASE_URL sets the base, e.g. /app)
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const manifest = {
  name: 'PictoTalk',
  short_name: 'PictoTalk',
  description: 'Free picture communication board for every age. Works offline.',
  id: `${base}/`,
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'any',
  background_color: '#F2F5F4',
  theme_color: '#1E5C73',
  categories: ['education', 'medical', 'accessibility'],
  icons: [
    { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: `${base}/icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
await writeFile(join(dist, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// public/index.html already has the manifest and icon tags, written for the site root.
const indexPath = join(dist, 'index.html');
const html = await readFile(indexPath, 'utf8');
if (!html.includes('rel="manifest"')) throw new Error('pwa: public/index.html is missing <link rel="manifest">');
await writeFile(indexPath, html
  .replace('href="/manifest.webmanifest"', `href="${base}/manifest.webmanifest"`)
  .replace('href="/icons/apple-touch-icon.png"', `href="${base}/icons/apple-touch-icon.png"`));

const skip = (rel) => rel === 'sw.js' || rel.endsWith('.map') || rel.endsWith('.br') || rel.endsWith('.gz') || rel.split('/').some((x) => x.startsWith('.'));
const files = (await walk(dist)).map((f) => relative(dist, f).split(sep).join('/')).filter((r) => !skip(r)).sort();
const hash = createHash('sha256');
let bytes = 0;
for (const f of files) {
  const buf = await readFile(join(dist, f));
  bytes += buf.length;
  hash.update(f).update(buf);
}
const build = hash.digest('hex').slice(0, 12);
const swPath = join(dist, 'sw.js');
const sw = (await readFile(swPath, 'utf8'))
  .replace("'__PICTOTALK_BUILD__'", JSON.stringify(build))
  .replace('/* __PICTOTALK_PRECACHE__ */ []', JSON.stringify(files));
await writeFile(swPath, sw);
const s = await stat(swPath);
console.log(`pwa: ${files.length} files (${(bytes / 1e6).toFixed(1)} MB) precached, build ${build}, sw.js ${s.size} B`);
