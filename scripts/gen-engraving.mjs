// Genera src/assets/engraving.svg: onde "incise" (tratteggio nero, schiuma bianca) con scogli e il simbolo Walife al posto del faro.
// Deterministico (PRNG con seme). Uso: node scripts/gen-engraving.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const W = 1600, H = 460;
const INK = '#1a1a1a', PAPER = '#f4f4f4', BG = '#0d9e5b';
let seed = 7;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const f = (n) => n.toFixed(1);

const logo = readFileSync(new URL('../src/assets/walife-logo.svg', import.meta.url), 'utf8');
const logoPaths = [...logo.matchAll(/<path[^>]* d="([^"]+)"/g)].map((m) => m[1]);

const out = [];
const defs = [];
const bands = 8;
const wave = (i, x) => {
  const base = 205 + i * 30;
  return base + (12 + i * 4.5) * Math.sin(x * (0.0105 + i * 0.0006) + i * 1.7) + (6 + i * 2) * Math.sin(x * 0.027 + i * 0.9) + 3 * Math.sin(x * 0.07 + i);
};

for (let i = 0; i < bands; i++) {
  // riempimento (occlude le bande dietro)
  let top = `M0 ${H} `;
  for (let x = 0; x <= W; x += 8) top += `L${f(x)} ${f(wave(i, x))} `;
  top += `L${W} ${H} Z`;
  out.push(`<path d="${top}" fill="${BG}"/>`);
  // tratteggio che segue il profilo, sempre più fitto verso il basso
  const lines = 9 + i;
  for (let j = 0; j < lines; j++) {
    let d = '';
    const off = 7 + j * (4.6 - i * 0.12);
    for (let x = 0; x <= W; x += 8) d += `${x === 0 ? 'M' : 'L'}${f(x)} ${f(wave(i, x) + off + 1.4 * Math.sin(x * 0.05 + j))} `;
    out.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(0.7 + j * 0.13 + i * 0.05)}" stroke-linecap="round"/>`);
  }
  // cresta
  let c = '';
  for (let x = 0; x <= W; x += 6) c += `${x === 0 ? 'M' : 'L'}${f(x)} ${f(wave(i, x))} `;
  out.push(`<path d="${c}" fill="none" stroke="${INK}" stroke-width="${f(1.6 + i * 0.18)}"/>`);
  // schiuma incisa: bordo a bozzi riempito di bianco + tratti curvi interni
  for (let x = 60; x < W - 60; x += 6) {
    const y = wave(i, x);
    if (y < wave(i, x - 6) && y < wave(i, x + 6) && y < wave(i, x - 18) && y < wave(i, x + 18) && rnd() > 0.2) {
      const half = 45 + rnd() * 55, hgt = (7 + rnd() * 11) * (0.75 + i * 0.1);
      let d = `M${f(x - half)} ${f(wave(i, x - half) + 5)} `;
      for (let px = x - half; px < x + half; px += 11) {
        const lift = hgt * Math.sin(((px - (x - half)) / (2 * half)) * Math.PI) * (0.5 + rnd() * 0.7);
        const mx = px + 5.5, my = wave(i, mx) - lift;
        d += `Q${f(mx)} ${f(my - 7 - rnd() * 6)} ${f(px + 11)} ${f(wave(i, px + 11) - lift * 0.6)} `;
      }
      for (let px = x + half; px >= x - half; px -= 8) d += `L${f(px)} ${f(wave(i, px) + 7)} `;
      d += 'Z';
      out.push(`<path d="${d}" fill="${PAPER}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`);
      for (let k = 0; k < 5; k++) {
        const sx = x - half + rnd() * 2 * half, sy = wave(i, sx) - rnd() * hgt * 0.5;
        out.push(`<path d="M${f(sx)} ${f(sy)} q${f(6 + rnd() * 8)} ${f(-4 - rnd() * 5)} ${f(14 + rnd() * 10)} ${f(rnd() * 4)}" fill="none" stroke="${INK}" stroke-width="1"/>`);
      }
      for (let k = 0; k < 18; k++) out.push(`<circle cx="${f(x + (rnd() - 0.5) * 2.4 * half)}" cy="${f(y - 14 - rnd() * 70)}" r="${f(0.7 + rnd() * 2)}" fill="${PAPER}"/>`);
    }
  }
  // scogli e simbolo dietro la 5ª banda (sopra le prime, sotto le ultime)
  if (i === 5) {
    const rx = 1215, ry = 345;
    const pts = [[-190, 130], [-150, 40], [-95, 10], [-60, -45], [-10, -85], [40, -70], [85, -20], [140, 20], [200, 130]]
      .map(([dx, dy]) => [rx + dx + (rnd() - 0.5) * 14, ry + dy + (rnd() - 0.5) * 12]);
    const poly = pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' ');
    defs.push(`<clipPath id="rock"><polygon points="${poly}"/></clipPath>`);
    out.push(`<polygon points="${poly}" fill="${BG}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`);
    let h = '';
    const k = Math.tan((43 * Math.PI) / 180);
    for (let x = rx - 260; x < rx + 260; x += 9) h += `M${x} ${ry + 140} L${f(x + 230 / k)} ${ry - 90} `;
    out.push(`<path d="${h}" clip-path="url(#rock)" stroke="${INK}" stroke-width="1.1" fill="none"/>`);
    // simbolo Walife (il "faro")
    const s = 0.62;
    out.push(`<g transform="translate(${f(rx - 135 * s)} ${f(ry - 90 - 414 * s + 22)}) scale(${s})" fill="${PAPER}" stroke="${INK}" stroke-width="${f(3.4 / s)}" stroke-linejoin="round">${logoPaths.map((d) => `<path d="${d}"/>`).join('')}</g>`);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" role="img" aria-label=""><defs>${defs.join('')}</defs>${out.join('\n')}</svg>`;
writeFileSync(new URL('../src/assets/engraving.svg', import.meta.url), svg, 'utf8');
console.log('engraving.svg', Math.round(svg.length / 1024) + ' KB');
