// Lighthouse locale su `astro preview` (porta 4321): mediana di 3 esecuzioni per pagina, desktop e mobile.
// Uso: node scripts/lh-run.mjs  (richiede Edge: CHROME_PATH)  → stampa una tabella.
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:4321/';
const PAGES = process.env.LH_PAGES ? process.env.LH_PAGES.split(',') : ['', 'archivio/', 'chi-sono/', 'contatti/', 'progetti/the-tower-official-merch-design/', 'progetti/edits/', 'en/', 'privacy/'];
const dir = mkdtempSync(join(tmpdir(), 'wl-lh-'));
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const rows = [];
for (const form of (process.env.LH_FORMS ?? 'desktop,mobile').split(',')) {
  for (const path of PAGES) {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const out = join(dir, `${form}-${i}.json`);
      const args = ['lighthouse', BASE + path, '--only-categories=performance,accessibility,best-practices,seo', '--output=json', `--output-path=${out}`, '--chrome-flags=--headless=new', '--quiet'];
      if (form === 'desktop') args.push('--preset=desktop');
      spawnSync('npx', args, { shell: true, env: { ...process.env, CHROME_PATH: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' } });
      const d = JSON.parse(readFileSync(out, 'utf8'));
      const c = d.categories;
      runs.push({
        p: Math.round(c.performance.score * 100), a: Math.round(c.accessibility.score * 100), b: Math.round(c['best-practices'].score * 100), s: Math.round(c.seo.score * 100),
        lcp: Math.round(d.audits['largest-contentful-paint'].numericValue), cls: +d.audits['cumulative-layout-shift'].numericValue.toFixed(3), tbt: Math.round(d.audits['total-blocking-time'].numericValue),
        fails: Object.entries(d.audits).filter(([, v]) => v.scoreDisplayMode === 'binary' && v.score === 0).map(([k]) => k),
      });
    }
    rows.push({ form, path: path || '(home)', p: med(runs.map((r) => r.p)), a: med(runs.map((r) => r.a)), b: med(runs.map((r) => r.b)), s: med(runs.map((r) => r.s)), lcp: med(runs.map((r) => r.lcp)), cls: med(runs.map((r) => r.cls)), tbt: med(runs.map((r) => r.tbt)), fails: [...new Set(runs.flatMap((r) => r.fails))].join(',') });
    console.log(JSON.stringify(rows.at(-1)));
  }
}
