// Trasforma gli strati SVG (sorgenti in scripts/meadow-wipe/, generati da gen-meadow.mjs) della transizione in immagini webp statiche (src/assets/meadow-wipe-N.webp).
// Gli SVG hanno animazioni interne (api, vento, alberi) che il browser ridisegna a ogni fotogramma: durante la transizione scattavano.
// Gli strati continuano a ondeggiare con CSS (transform, sul compositor), che costa quasi nulla.
// Uso: node scripts/raster-wipe.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

for (const n of [1, 2, 3]) {
  const svg = readFileSync(new URL(`./meadow-wipe/meadow-wipe-${n}.svg`, import.meta.url));
  const info = await sharp(svg, { density: 90 }).resize({ width: 1800 }).webp({ quality: 82, alphaQuality: 92, effort: 5 }).toFile(new URL(`../src/assets/meadow-wipe-${n}.webp`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
  console.log(n, info.width, info.height, Math.round(info.size / 1024) + ' KB');
}
