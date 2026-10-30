// Articolo "Celestia Identity": ottimizza gli asset (webp, screenshot a 2K), compone le tavole dei loghi,
// e registra il progetto in site.json / pages.json. Idempotente. I testi IT/EN sono qui, il resto del sito li legge da pages.json.
// Rigenerando site.json / pages.json con gen-content / fetch-project-pages va rilanciato dopo.
// Uso: node scripts/celestia.mjs  (richiede la cartella sorgente sotto SRC)
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SRC = process.env.CELESTIA_SRC ?? 'C:/Users/ThaWa/Desktop/PORTFOLIO 2026/Celestia';
const THUMB = process.env.CELESTIA_THUMB ?? 'C:/Users/ThaWa/AppData/Local/Temp/claude/C--/faf2b735-8362-43d9-8e50-0e25810d0fe4/images/4.webp';
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const SLUG = 'celestia-identity';
const OUT = join(ROOT, 'public/img/projects', SLUG);
const YT = 'Ay9u3JlOiCM';
mkdirSync(OUT, { recursive: true });

const C = { abyss: '#071218' };
const rel = (f) => `img/projects/${SLUG}/${f}`;
const save = async (img, name, q = 84) => {
  const { info } = await img.webp({ quality: q, effort: 5 }).toFile(join(OUT, name)).then((i) => ({ info: i }));
  return { src: rel(name), w: info.width, h: info.height };
};
const photo = async (p, name, w, q = 84) => save(sharp(join(SRC, p), { limitInputPixels: false }).flatten({ background: C.abyss }).resize({ width: w, withoutEnlargement: true }), name, q);

const D = 'Identità', M = 'Mondo', K = 'Campagna pre rilascio mappa', V = 'Volantini', R = 'Risorse varie';

// copertina 4:3 (come le altre miniature) dall'immagine fornita
await sharp(THUMB).resize(1000, 750, { fit: 'cover' }).webp({ quality: 86 }).toFile(join(ROOT, `public/img/projects/${SLUG}.webp`));

// anteprima del teaser: un fotogramma del video (nessuna richiesta esterna prima del click)
const ytOut = join(ROOT, `public/img/yt/${YT}.jpg`);
if (!existsSync(ytOut)) {
  const r = spawnSync('ffmpeg', ['-y', '-ss', '13', '-i', join(SRC, K, 'Teaser.mp4'), '-frames:v', '1', '-vf', 'scale=1280:720', '-q:v', '3', '-update', '1', ytOut], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg: anteprima teaser non creata');
}

// moodboard: 8 pagine del PDF a 2400 px di larghezza
const tmp = join(tmpdir(), 'celestia-mb');
mkdirSync(tmp, { recursive: true });
spawnSync('pdftoppm', ['-png', '-scale-to-x', '2400', '-scale-to-y', '-1', join(SRC, D, 'Celestia Moodboard-selection.pdf'), join(tmp, 'p')], { stdio: 'inherit' });
const mood = [];
// tavole: 2 versione Day, 3 marchio primario, 5 marchio secondario, 6 colore e tipografia
for (const i of [2, 3, 5, 6]) mood.push(await save(sharp(join(tmp, `p-${i}.png`)), `moodboard-${i}.webp`, 86));

// campagna
const banner = await photo(`${K}/banner.png`, 'campagna-banner.webp', 2400);
const glitch = await photo(`${K}/LOGO_GLITCH.png`, 'campagna-glitch.webp', 1600);
const frame = await photo(`${R}/16-9.png`, 'campagna-griglia.webp', 1920);
const reveal = await photo(`${R}/logo&community.png`, 'campagna-svelata.webp', 2400);

// halloween
const hSym = await photo(`${D}/simbolo_halloween__p.png`, 'halloween-simbolo.webp', 1600, 86);

// mondo: miniature + screenshot a 2K (numerati: Principale, 2…7)
const thumbs = [await photo(`${M}/Miniatura_Mappa.png`, 'mondo-miniatura.webp', 1600), await photo(`${M}/Miniatura_Mappa_Halloween.png`, 'mondo-miniatura-halloween.webp', 1600)];
const shots = [];
for (const [i, n] of ['Principale', '2', '3', '4', '5', '6', '7'].entries()) shots.push(await photo(`${M}/Screen mappa/${n}.png`, `mondo-${i + 1}.webp`, 2560, 80));

// poster e volantini
const posters = [];
for (const [i, f] of ['Celestia_Poster_HalloweenEvent', 'Celestia_Volantino_Discord', 'Celestia_Volantino_FotoInMappa', 'Celestia_Volantino_SitoWeb'].entries())
  posters.push(await photo(`${V}/${f}.png`, `poster-${i + 1}.webp`, 1546, 86));

const L = (it, en) => ({ it, en });
const p = (it, en) => ({ type: 'p', ...L(it, en) });
const h = (it, en) => ({ type: 'h', ...L(it, en) });
const label = (it, en) => ({ type: 'label', ...L(it, en) });
const gal = (items, rows) => ({ type: 'gallery', items, ...(rows ? { rows } : {}) });

const blocks = [
  p('Celestia è una community italiana di VRChat: serate, mondi da esplorare e nuove persone da conoscere. Per il rilascio della sua nuova mappa ho seguito tutto il percorso di comunicazione, dalla campagna che ne ha costruito l’attesa fino all’identità visiva con cui Celestia si presenta oggi.',
    'Celestia is an Italian VRChat community: nights out, worlds to explore and new people to meet. For the release of its new map I followed the whole communication path, from the campaign that built the anticipation to the visual identity Celestia presents today.'),

  label('01 — La campagna', '01 — The campaign'),
  h('Prima l’attesa', 'Anticipation first'),
  p('Prima del rilascio della mappa serviva creare attesa e hype. L’idea è stata partire da un’identità volutamente confusionaria e glitchata, con frame disturbati, il simbolo che si scompone e messaggi come “Restate in attesa”, per poi presentare la nuova identity e subito dopo rilasciare la mappa nuova. Il teaser dura 15 secondi e chiude annunciando il trailer di lancio del 18 settembre 2026 e il sito celestiaita.it.',
    'Before the map release the goal was to build anticipation and hype. The idea was to start from a deliberately confusing, glitched identity, with disturbed frames, the symbol breaking apart and messages like “Stay tuned”, and then reveal the new identity and release the new map right after. The teaser runs 15 seconds and ends by announcing the launch trailer on 18 September 2026 and the celestiaita.it website.'),
  { type: 'youtube', id: YT },
  gal([banner, glitch, frame], [[0], [1, 2]]),
  gal([reveal]),

  label('02 — Il mondo', '02 — The world'),
  h('Il punto di ritrovo', 'The meeting point'),
  p('La mappa è stata progettata da Kaira S, la versione mostrata qui è quella di Halloween. Io mi sono occupato delle risorse grafiche.',
    'The map was designed by Kaira S and the version shown here is the Halloween one. I took care of the graphic resources.'),
  gal(thumbs, [[0, 1]]),
  gal(shots, [[0], [1, 2], [3, 4], [5, 6]]),

  label('03 — L’identity', '03 — The identity'),
  h('Moodboard identity', 'Moodboard identity'),
  p('La nuova identity segue la moodboard: luce fredda, ombre profonde e fondo scuro, con logotype e simbolo trattati come oggetti chrome in 3D dentro i mondi VR. Il sistema è costruito su colori piatti e su una griglia in prospettiva desaturata, senza mai ricorrere a neon rosa o viola. Qui sotto la moodboard in quattro tavole: la versione Day, il marchio primario, il marchio secondario e palette e tipografia.',
    'The new identity follows the moodboard: cold light, deep shadows and a dark ground, with the logotype and symbol treated as 3D chrome objects inside the VR worlds. The system is built on flat colors and a desaturated perspective grid, never relying on neon pink or purple. Below, the moodboard in four boards: the Day version, the primary mark, the secondary mark, and palette and typography.'),
  { type: 'player', items: mood },

  h('Colore e tipografia', 'Color and typography'),
  { type: 'swatches', items: [
    { name: 'Abyss', hex: '#071218', role: L('Ground principale', 'Main ground') },
    { name: 'Deep Orbit', hex: '#0F2129', role: L('Superfici, pannelli', 'Surfaces, panels') },
    { name: 'Orbit Teal', hex: '#1F3946', role: L('Griglia, bordi', 'Grid, borders') },
    { name: 'Signal Haze', hex: '#567481', role: L('Haze, guide', 'Haze, guides') },
    { name: 'Chrome Silver', hex: '#C2C7D0', role: L('Simbolo, swoosh', 'Symbol, swoosh') },
    { name: 'Starlight', hex: '#F2F4F7', role: L('Testo, versione Day', 'Text, Day version') },
    { name: 'Nebula Indigo', hex: '#3E3B53', role: L('Fill del logotype', 'Logotype fill') },
    { name: 'Pulsar Cyan', hex: '#7FE3F0', role: L('Accento, CTA', 'Accent, CTA') },
    { name: 'Ember', hex: '#FF6A1A', role: L('Solo Halloween', 'Halloween only') },
  ] },
  p('La palette segue una proporzione 70 / 25 / 5: il 70% è fondo scuro, il 25% toni, silver e testo, e il 5% è l’accento Pulsar Cyan per call to action e stati live. L’arancio Ember esiste soltanto nella stagione di Halloween. Per la tipografia ho scelto Unbounded per i titoli, largo e geometrico, così fa contrasto con il corsivo del logo invece di competere; Manrope per testi, didascalie e interfacce; JetBrains Mono per le etichette in stile HUD, le date e gli orari. Il lettering del logotype resta unico e nessun font lo imita.',
    'The palette follows a 70 / 25 / 5 ratio: 70% is dark ground, 25% tones, silver and text, and 5% is the Pulsar Cyan accent for calls to action and live states. The Ember orange exists only during the Halloween season. For typography I chose Unbounded for titles, wide and geometric, so it contrasts with the italic logo instead of competing with it; Manrope for texts, captions and interfaces; JetBrains Mono for HUD-style labels, dates and times. The logotype lettering stays unique and no typeface imitates it.'),

  h('La versione di Halloween', 'The Halloween version'),
  p('Per la stagione di Halloween l’identità si accende di arancio Ember, l’unico momento in cui il colore è ammesso. Oltre alla versione principale ho realizzato logotype e simbolo a tema, con fantasmi, zucche e lanterna.',
    'For the Halloween season the identity lights up in Ember orange, the only moment the color is allowed. Besides the main version I made themed versions of the logotype and symbol, with ghosts, pumpkins and a lantern.'),
  gal([thumbs[1], hSym], [[0], [1]]),

  label('04 — Poster e volantini', '04 — Posters and flyers'),
  h('Un layout per riconoscersi', 'A layout to be recognized'),
  p('Poster e volantini seguono un layout specifico per mantenere l’identità: logotype in alto, etichette in JetBrains Mono, titoli in Unbounded, un QR code per entrare nella community e la call to action in Pulsar Cyan. Per l’evento di Halloween il layout resta lo stesso e cambia solo l’accento, che diventa Ember.',
    'Posters and flyers follow a specific layout to keep the identity consistent: logotype at the top, JetBrains Mono labels, Unbounded titles, a QR code to join the community and the call to action in Pulsar Cyan. For the Halloween event the layout stays the same and only the accent changes, becoming Ember.'),
  { ...gal(posters, [[0, 1], [2, 3]]), max: 50 },

  { type: 'cta', ...L('Visita il sito di Celestia', 'Visit the Celestia website'), url: 'https://celestiaita.it' },

  label('Credits', 'Credits'),
  p('Mappa: Kaira S.', 'Map: Kaira S.'),
];

// registrazione nei contenuti (in testa: è il più recente)
const jp = (f) => join(ROOT, 'src/content', f);
const site = JSON.parse(readFileSync(jp('site.json'), 'utf8'));
const proj = {
  slug: SLUG,
  cats: ['identity', 'vr', 'events'],
  title: 'Celestia Identity',
  date: '2026-10-30',
  img: `img/projects/${SLUG}.webp`,
  tags: L('Identità / VR Integrated Works', 'Identity / VR Integrated Works'),
  desc: L('Dalla campagna di attesa con identità glitchata alla nuova identità visiva della community italiana di VRChat: logotype, simbolo, palette, versioni 3D, Halloween e poster.',
    'From the anticipation campaign with a glitched identity to the new visual identity of the Italian VRChat community: logotype, symbol, palette, 3D versions, Halloween and posters.'),
};
site.PROJECTS = [proj, ...site.PROJECTS.filter((x) => x.slug !== SLUG)];
writeFileSync(jp('site.json'), JSON.stringify(site, null, 2), 'utf8');
const pages = JSON.parse(readFileSync(jp('pages.json'), 'utf8'));
pages[SLUG] = { links: [{ ...L('Sito di Celestia', 'Celestia website'), url: 'https://celestiaita.it' }], blocks };
writeFileSync(jp('pages.json'), JSON.stringify(pages, null, 2), 'utf8');
console.log('celestia: ok,', blocks.length, 'blocchi');
