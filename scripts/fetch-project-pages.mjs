// Scarica il contenuto delle pagine progetto da thawalife.com (project-pages.js) in src/content/pages.json
// e copia le immagini/video referenziati in public/img/projects/<slug>/. Uso: node scripts/fetch-project-pages.mjs
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import vm from 'node:vm';

const H = { 'User-Agent': 'Mozilla/5.0 Chrome/120' };
const src = await (await fetch('https://thawalife.com/project-pages.js', { headers: H })).text();
const ctx = { window: { WALIFE: {} } };
vm.runInNewContext(src, ctx);
const PAGES = ctx.window.WALIFE.PAGES;
writeFileSync(new URL('../src/content/pages.json', import.meta.url), JSON.stringify(PAGES, null, 2), 'utf8');

const assets = new Set();
for (const v of Object.values(PAGES))
  for (const b of v.blocks) {
    for (const it of b.items ?? []) if (it.src) assets.add(it.src);
    for (const it of b.pages ?? []) if (it.src) assets.add(it.src);
    if (b.type === 'video') { assets.add(b.src); assets.add(b.poster); }
  }
let n = 0, bytes = 0;
const list = [...assets];
const work = async () => {
  for (let a; (a = list.pop()); ) {
    const out = new URL(`../public/${a}`, import.meta.url);
    if (existsSync(out)) continue;
    mkdirSync(dirname(out.pathname.replace(/^\//, '')), { recursive: true });
    const r = await fetch('https://thawalife.com/' + a, { headers: H });
    if (!r.ok) throw new Error(a + ' ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(out, buf);
    n++; bytes += buf.length;
  }
};
await Promise.all([work(), work(), work(), work(), work(), work()]);
const ids = new Set();
for (const v of Object.values(PAGES)) for (const b of v.blocks) { if (b.type === 'youtube') ids.add(b.id); if (b.type === 'ytgrid') b.items.forEach((i) => ids.add(i.id)); }
mkdirSync(new URL('../public/img/yt/', import.meta.url), { recursive: true });
for (const id of ids) {
  const out = new URL(`../public/img/yt/${id}.jpg`, import.meta.url);
  if (existsSync(out)) continue;
  for (const q of ['maxresdefault', 'hqdefault']) {
    const r = await fetch(`https://i.ytimg.com/vi/${id}/${q}.jpg`, { headers: H });
    if (r.ok) { writeFileSync(out, Buffer.from(await r.arrayBuffer())); break; }
  }
}
console.log('pages', Object.keys(PAGES).length, 'assets scaricati', n, Math.round(bytes / 1e6) + ' MB');
