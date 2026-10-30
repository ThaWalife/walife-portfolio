// Genera illustrazioni "incise" di un prato (colline a tratteggio, alberi, cespugli, fiori, erba) in src/assets/<nome>.svg.
// Uso: node scripts/gen-meadow.mjs <nome> <seme> <altezza> <bande> <collinetta: c|r|0> [strati]
//   strati > 1 → file <nome>-1.svg … <nome>-N.svg (dal fondo al primo piano), animati a parte con CSS.
//   c = collinetta al centro (hero, il logo HTML ci poggia sopra), r = a destra con simbolo inciso (footer), 0 = nessuna.
// Deterministico (PRNG con seme). Colori: verde del brand (sfondo), bianco (fiori), nero (tratto).
import { readFileSync, writeFileSync } from 'node:fs';

const [NAME = 'meadow', SEED = '5', HEIGHT = '460', BANDS = '5', MOUND = '0', LAYERS = '1'] = process.argv.slice(2);
const W = 1600, H = Number(HEIGHT), N = Number(BANDS);
const INK = '#1a1a1a', PAPER = '#f4f4f4', BG = '#0d9e5b';
let seed = Number(SEED);
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const f = (n) => n.toFixed(1);
const logo = readFileSync(new URL('../src/assets/walife-logo.svg', import.meta.url), 'utf8');
const logoPaths = [...logo.matchAll(/<path[^>]* d="([^"]+)"/g)].map((m) => m[1]);

const TOP = H * 0.34;
const GAP = (H - TOP - 30) / N;
const MX = MOUND === 'c' ? 800 : 1215;
const MOUND_BAND = Math.min(1, N - 1);
const hill = (i, x) => {
  let y = TOP + i * GAP + (10 + i * 3.5) * Math.sin(x * (0.0042 + i * 0.0005) + i * 2.1) + (5 + i * 1.5) * Math.sin(x * 0.011 + i);
  if (MOUND !== '0' && i === MOUND_BAND) y -= 70 * Math.exp(-(((x - MX) / 150) ** 2));
  return y;
};
const MOUND_TOP = hill(MOUND_BAND, MX);

let out = [];
let cid = 0;
const bandOut = Array.from({ length: N }, () => []);
const fg = [];

// chioma/cespuglio: unione di cerchi (contorno nero esterno, tratteggio a 43° dentro, qualche foglia bianca)
function blob(cx, cy, r, n, hatch = true) {
  const cs = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2 + rnd();
    const d = k === 0 ? 0 : r * (0.45 + rnd() * 0.4);
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, r * (0.5 + rnd() * 0.45)];
  });
  const id = 'c' + cid++;
  out.push(...cs.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${INK}"/>`));
  out.push(...cs.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(Math.max(rr - 1.6, 1))}" fill="${BG}"/>`));
  if (hatch) {
    const clip = `<clipPath id="${id}">${cs.map(([x, y, rr]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}"/>`).join('')}</clipPath>`;
    const k = Math.tan((43 * Math.PI) / 180);
    let d = '';
    for (let x = cx - r * 1.6; x < cx + r * 1.6; x += 5.5) d += `M${f(x)} ${f(cy + r)} L${f(x + (r * 2) / k)} ${f(cy - r)} `;
    out.push(`<g clip-path="url(#${id})"><defs>${clip}</defs></g>`);
    out.push(`<defs>${clip}</defs><path d="${d}" clip-path="url(#${id})" stroke="${INK}" stroke-width="0.9" fill="none"/>`);
    for (let j = 0; j < Math.ceil(n * 1.4); j++) {
      const [x, y, rr] = cs[Math.floor(rnd() * cs.length)];
      out.push(`<circle cx="${f(x + (rnd() - 0.5) * rr)}" cy="${f(y - rnd() * rr * 0.6)}" r="${f(1.4 + rnd() * 2.2)}" fill="${PAPER}"/>`);
    }
  }
}

function tree(x, y, s) {
  const th = 46 * s, tw = 7 * s;
  out.push(`<path d="M${f(x - tw)} ${f(y + 3)} L${f(x - tw * 0.55)} ${f(y - th)} L${f(x + tw * 0.55)} ${f(y - th)} L${f(x + tw)} ${f(y + 3)} Z" fill="${BG}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`);
  for (let j = -2; j <= 2; j++) out.push(`<path d="M${f(x + j * tw * 0.35)} ${f(y)} L${f(x + j * tw * 0.2)} ${f(y - th)}" stroke="${INK}" stroke-width="0.8"/>`);
  out.push(`<path d="M${f(x)} ${f(y - th * 0.55)} l${f(-16 * s)} ${f(-14 * s)} M${f(x)} ${f(y - th * 0.7)} l${f(15 * s)} ${f(-16 * s)}" stroke="${INK}" stroke-width="${f(2 * s)}" stroke-linecap="round" fill="none"/>`);
  blob(x, y - th - 30 * s, 34 * s, 6 + Math.floor(rnd() * 3));
}
const bush = (x, y, s) => blob(x, y - 9 * s, 17 * s, 4 + Math.floor(rnd() * 2));

function flower(x, y, s) {
  const h = (26 + rnd() * 26) * s, lean = (rnd() - 0.5) * 14 * s, hx = x + lean, hy = y - h;
  out.push(`<path d="M${f(x)} ${f(y + 2)} Q${f(x + lean * 0.2)} ${f(y - h * 0.5)} ${f(hx)} ${f(hy)}" stroke="${INK}" stroke-width="${f(1.5 * s)}" fill="none"/>`);
  out.push(`<path d="M${f(x + lean * 0.25)} ${f(y - h * 0.35)} q${f(-10 * s)} ${f(-3 * s)} ${f(-12 * s)} ${f(-11 * s)} q${f(9 * s)} ${f(2 * s)} ${f(12 * s)} ${f(11 * s)}" fill="${PAPER}" stroke="${INK}" stroke-width="1"/>`);
  const petals = 5 + Math.floor(rnd() * 3), pr = (6 + rnd() * 3.5) * s, rot = rnd() * 360;
  for (let k = 0; k < petals; k++) out.push(`<ellipse cx="${f(hx)}" cy="${f(hy - pr)}" rx="${f(pr * 0.62)}" ry="${f(pr)}" transform="rotate(${f(rot + (k * 360) / petals)} ${f(hx)} ${f(hy)})" fill="${PAPER}" stroke="${INK}" stroke-width="1.1"/>`);
  out.push(`<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(pr * 0.42)}" fill="${INK}"/>`);
}
function grass(x, y, s) {
  let d = '';
  for (let k = -3; k <= 3; k++) d += `M${f(x + k * 3 * s)} ${f(y + 1)} q${f(k * 1.5 * s)} ${f(-9 * s)} ${f(k * 4.2 * s + (rnd() - 0.5) * 5)} ${f(-(13 + rnd() * 9) * s)} `;
  out.push(`<path d="${d}" stroke="${INK}" stroke-width="${f(1.1 * s)}" fill="none" stroke-linecap="round"/>`);
}

for (let i = 0; i < N; i++) {
  out = bandOut[i];
  const depth = N === 1 ? 1 : 0.55 + (i / (N - 1)) * 0.5; // bande lontane più piccole
  let poly = `M0 ${H} `;
  for (let x = 0; x <= W; x += 8) poly += `L${f(x)} ${f(hill(i, x))} `;
  out.push(`<path d="${poly}L${W} ${H} Z" fill="${BG}"/>`);
  // tratteggio dei pendii
  for (let j = 0; j < 5 + i; j++) {
    let d = '';
    for (let x = 0; x <= W; x += 10) d += `${x === 0 ? 'M' : 'L'}${f(x)} ${f(hill(i, x) + 8 + j * (5.2 - i * 0.15) + 1.3 * Math.sin(x * 0.04 + j))} `;
    out.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${f(0.6 + j * 0.1)}" stroke-linecap="round" opacity="0.9"/>`);
  }
  let c = '';
  for (let x = 0; x <= W; x += 6) c += `${x === 0 ? 'M' : 'L'}${f(x)} ${f(hill(i, x))} `;
  out.push(`<path d="${c}" fill="none" stroke="${INK}" stroke-width="${f(1.4 + i * 0.2)}"/>`);
  // decorazioni sul crinale: alberi e cespugli indietro, fiori e erba avanti
  for (let x = 30; x < W - 30; x += 22 + rnd() * 40) {
    if (MOUND !== '0' && i === MOUND_BAND && Math.abs(x - MX) < 100) continue;
    const y = hill(i, x), r = rnd();
    if (i < N - 1 && r < 0.17) tree(x, y, depth * (0.7 + rnd() * 0.5));
    else if (r < 0.34) bush(x, y, depth * (0.8 + rnd() * 0.6));
    else if (r < 0.78) flower(x, y, depth * (0.75 + rnd() * 0.5));
    else grass(x, y, depth);
  }
  if (MOUND === 'r' && i === MOUND_BAND) {
    const s = 0.62, ty = MOUND_TOP;
    out.push(`<g transform="translate(${f(MX - 135 * s)} ${f(ty - 414 * s + 6)}) scale(${s})" fill="${PAPER}" stroke="${INK}" stroke-width="${f(3.4 / s)}" stroke-linejoin="round">${logoPaths.map((d) => `<path d="${d}"/>`).join('')}</g>`);
  }
}
// erba e fiori in primissimo piano, sopra l'ultima banda
out = fg;
for (let x = 10; x < W; x += 16 + rnd() * 26) {
  const y = hill(N - 1, x) + 6 + rnd() * 6;
  if (rnd() < 0.5) grass(x, y, 1.05); else flower(x, y, 0.9 + rnd() * 0.5);
}

if (MOUND === 'c') {
  for (let x = MX - 80; x <= MX + 80; x += 16 + rnd() * 10) {
    const y = hill(MOUND_BAND, x) + 4;
    if (rnd() < 0.45) flower(x, y, 0.85 + rnd() * 0.3); else grass(x, y, 1.1);
  }
}
if (MOUND !== '0') console.log('MOUNDTOP', Math.round(MOUND_TOP), 'H', H);
const L = Number(LAYERS);
const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="">${body.join('\n')}</svg>`;
for (let k = 0; k < L; k++) {
  const from = Math.floor((k * N) / L), to = Math.floor(((k + 1) * N) / L);
  const body = bandOut.slice(from, to).flat();
  if (k === L - 1) body.push(...fg);
  const file = L === 1 ? NAME : `${NAME}-${k + 1}`;
  const svg = wrap(body);
  writeFileSync(new URL(`../src/assets/${file}.svg`, import.meta.url), svg, 'utf8');
  console.log(file + '.svg', Math.round(svg.length / 1024) + ' KB');
}
