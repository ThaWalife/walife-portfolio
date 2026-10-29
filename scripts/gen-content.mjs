// Esegue data.js (sito attuale) in un vm e scrive src/content/site.json. UTF-8 esplicito.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const src = readFileSync(new URL('./data.source.js', import.meta.url), 'utf8');
const ctx = { window: {} };
vm.runInNewContext(src, ctx);
const { PROJECTS, CATEGORIES, ABOUT, SOCIALS, DICT } = ctx.window.WALIFE;
writeFileSync(new URL('../src/content/site.json', import.meta.url), JSON.stringify({ PROJECTS, CATEGORIES, ABOUT, SOCIALS, DICT }, null, 2), 'utf8');
console.log('projects', PROJECTS.length, 'tools', ABOUT.tools.length, 'dict keys', Object.keys(DICT.it).length, Object.keys(DICT.en).length);
