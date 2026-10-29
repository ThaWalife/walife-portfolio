// AC5: confronta src/content/site.json con data.js LIVE di thawalife.com (eseguito in vm).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const live = await (await fetch('https://thawalife.com/data.js')).text();
const ctx = { window: {} };
vm.runInNewContext(live, ctx);
const L = ctx.window.WALIFE;
const mine = JSON.parse(readFileSync(new URL('../src/content/site.json', import.meta.url), 'utf8'));
for (const k of ['PROJECTS', 'CATEGORIES', 'ABOUT', 'SOCIALS', 'DICT'])
  assert.deepEqual(JSON.parse(JSON.stringify(L[k])), mine[k], `${k} differs from live data.js`);
console.log('OK: site.json == live data.js (projects %d, tools %d, edu %d, exp %d, socials %d, dict it/en %d/%d)',
  mine.PROJECTS.length, mine.ABOUT.tools.length, mine.ABOUT.education.length, mine.ABOUT.experience.length, mine.SOCIALS.length,
  Object.keys(mine.DICT.it).length, Object.keys(mine.DICT.en).length);
