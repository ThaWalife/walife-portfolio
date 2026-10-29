// Converte le foto mood (Renewal/DD) in WebP ottimizzati per il sito. Uso: node scripts/optimize-images.mjs <cartella-DD>
import sharp from 'sharp';
import { statSync } from 'node:fs';
const dd = process.argv[2] ?? '../Renewal/DD';
const jobs = [
];
for (const [src, out, w, q] of jobs) {
  await sharp(`${dd}/${src}`).resize({ width: w }).webp({ quality: q }).toFile(out);
  console.log(out, Math.round(statSync(out).size / 1024) + ' KB');
}
