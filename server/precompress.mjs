// Writes .br and .gz copies of text files under the given directories, once, at build time,
// so the server can send compressed responses without compressing on every request.
//   node precompress.mjs public
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.map', '.svg', '.txt', '.xml', '.webmanifest', '.ttf', '.otf', '.wasm']);

let count = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (TEXT.has(extname(entry.name))) {
      const data = readFileSync(path);
      if (data.length < 1024) continue;
      writeFileSync(`${path}.br`, brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
      writeFileSync(`${path}.gz`, gzipSync(data, { level: 9 }));
      count += 1;
    }
  }
}

for (const dir of process.argv.slice(2)) walk(dir);
console.log(`precompressed ${count} files`);
