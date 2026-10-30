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

const C = { abyss: '#071218', orbit: '#0F2129', starlight: '#F2F4F7' };
const rel = (f) => `img/projects/${SLUG}/${f}`;
const save = async (img, name, q = 84) => {
  const { info } = await img.webp({ quality: q, effort: 5 }).toFile(join(OUT, name)).then((i) => ({ info: i }));
  return { src: rel(name), w: info.width, h: info.height };
};
const photo = async (p, name, w, q = 84) => save(sharp(join(SRC, p), { limitInputPixels: false }).flatten({ background: C.abyss }).resize({ width: w, withoutEnlargement: true }), name, q);

// tavola: logo trasparente centrato su un colore (tile W×H, il logo occupa `fill` della larghezza/altezza)
const tile = async (p, name, bg, W, H, fill = 0.72) => {
  const logo = await sharp(join(SRC, p), { limitInputPixels: false }).trim().toBuffer();
  const fit = await sharp(logo).resize({ width: Math.round(W * fill), height: Math.round(H * fill), fit: 'inside' }).toBuffer();
  // filetto interno: la tavola chiara non si perde sullo sfondo della pagina
  const edge = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="rgba(7,18,24,0.18)" stroke-width="2"/></svg>`);
  return save(sharp({ create: { width: W, height: H, channels: 3, background: bg } }).composite([{ input: fit, gravity: 'centre' }, ...(bg === C.starlight ? [{ input: edge }] : [])]), name, 90);
};

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
for (let i = 1; i <= 8; i++) mood.push(await save(sharp(join(tmp, `p-${i}.png`)), `moodboard-${i}.webp`, 86));

// campagna
const banner = await photo(`${K}/banner.png`, 'campagna-banner.webp', 2400);
const glitch = await photo(`${K}/LOGO_GLITCH.png`, 'campagna-glitch.webp', 1600);
const frame = await photo(`${R}/16-9.png`, 'campagna-griglia.webp', 1920);
const reveal = await photo(`${R}/logo&community.png`, 'campagna-svelata.webp', 2400);

// versioni del logo: tavole su Abyss / Deep Orbit / Starlight
const lt = [
  await tile(`${D}/l_N.png`, 'logotype-chrome.webp', C.abyss, 1600, 1000),
  await tile(`${D}/L_W.png`, 'logotype-bianco.webp', C.orbit, 1600, 1000),
  await tile(`${D}/L_B.png`, 'logotype-nero.webp', C.starlight, 1600, 1000),
];
const sy = [
  await tile(`${D}/Simbolo@4096x.png`, 'simbolo-chrome.webp', C.abyss, 1200, 1200, 0.6),
  await tile(`${D}/S_B@4096x.png`, 'simbolo-bianco.webp', C.orbit, 1200, 1200, 0.6),
  await tile(`${D}/S_N@4096x.png`, 'simbolo-nero.webp', C.starlight, 1200, 1200, 0.6),
];
const render = await photo(`${D}/render_logo.png`, 'logo-3d.webp', 2400, 88);

// halloween
const hLogo = await tile(`${D}/logo_halloween.png`, 'halloween-logotype.webp', C.abyss, 2000, 1055, 0.9);
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
  p('Celestia è la community italiana di VRChat: serate, mondi da esplorare e nuove persone ogni notte. Per il rilascio della sua nuova mappa ho seguito tutto il percorso di comunicazione, dalla campagna che ne ha costruito l’attesa fino all’identità visiva con cui Celestia si presenta oggi.',
    'Celestia is the Italian VRChat community: nights out, worlds to explore and new people every evening. For the release of its new map I followed the whole communication path, from the campaign that built the anticipation to the visual identity Celestia presents today.'),

  label('01 — La campagna', '01 — The campaign'),
  h('Prima l’attesa', 'Anticipation first'),
  p('Prima del rilascio della mappa serviva creare attesa e hype. L’idea è stata partire da un’identità volutamente confusionaria e glitchata, con frame disturbati, il simbolo che si scompone e messaggi come “Restate in attesa”, per poi presentare la nuova identity e subito dopo rilasciare la mappa nuova. Il teaser dura 15 secondi e chiude annunciando il trailer di lancio del 18 settembre 2026 e il sito celestiaita.it.',
    'Before the map release the goal was to build anticipation and hype. The idea was to start from a deliberately confusing, glitched identity, with disturbed frames, the symbol breaking apart and messages like “Stay tuned”, and then reveal the new identity and release the new map right after. The teaser runs 15 seconds and ends by announcing the launch trailer on 18 September 2026 and the celestiaita.it website.'),
  { type: 'youtube', id: YT },
  gal([banner, glitch, frame], [[0], [1, 2]]),
  p('Il glitch vive solo dentro le immagini: è un linguaggio della fase di attesa. Con l’arrivo della nuova identity i colori tornano piatti e il logo non viene più disturbato.',
    'The glitch lives only inside the images: it is the language of the waiting phase. When the new identity arrives the colors go flat again and the logo is never disturbed.'),
  gal([reveal]),

  label('02 — L’identity', '02 — The identity'),
  h('Notturno, chrome, orbita', 'Night, chrome, orbit'),
  p('La nuova identity segue la moodboard: luce fredda, ombre profonde e fondo scuro, con logotype e simbolo trattati come oggetti chrome in 3D dentro i mondi VR. Il sistema è costruito su colori piatti e su una griglia in prospettiva desaturata, senza mai ricorrere a neon rosa o viola. Le otto tavole qui sotto sono la moodboard che ha guidato il progetto: versione notte, versione giorno, logotype, simbolo, colore e tipografia, applicazioni e brand tokens.',
    'The new identity follows the moodboard: cold light, deep shadows and a dark ground, with the logotype and symbol treated as 3D chrome objects inside the VR worlds. The system is built on flat colors and a desaturated perspective grid, never relying on neon pink or purple. The eight boards below are the moodboard that guided the project: night version, day version, logotype, symbol, color and typography, applications and brand tokens.'),
  { type: 'player', items: mood },

  h('Logotype e simbolo', 'Logotype and symbol'),
  p('Il logotype è un lettering corsivo e pesante, con un doppio contorno. Sopra la “s” compare il razzo, lo stesso del simbolo, e lo swoosh disegna la sua traiettoria. Il simbolo da solo è la versione compatta per gli spazi quadrati e tondi, come l’avatar del server Discord o le icone dei social, e non compare mai insieme al logotype.',
    'The logotype is a heavy italic lettering with a double outline. Above the “s” sits the rocket, the same one as in the symbol, and the swoosh draws its trajectory. The symbol alone is the compact version for square and round spaces, like the Discord server avatar or social icons, and it never appears together with the logotype.'),
  gal(lt, [[0], [1, 2]]),
  gal(sy, [[0, 1, 2]]),
  p('Le regole d’uso sono semplici: area di rispetto pari a 1x (la x è l’altezza della “c”), logotype minimo 120 px (30 mm in stampa) e sotto quella misura si passa al simbolo. Mai il logotype su Chrome Silver o grigi medi, perché lo swoosh si confonde, e mai ridisegnarlo, ruotarlo, deformarlo o ricolorarlo fuori palette. Le versioni sono quattro: su Abyss, su Starlight, bianca per le immagini scure e nera solo per stampa e monocromia.',
    'The usage rules are simple: clear space of 1x (x being the height of the “c”), logotype minimum 120 px (30 mm in print), and below that size you switch to the symbol. Never the logotype on Chrome Silver or mid greys, because the swoosh gets lost, and never redraw, rotate, distort or recolor it outside the palette. There are four versions: on Abyss, on Starlight, white for dark images and black only for print and monochrome.'),
  gal([render]),
  p('Per VRChat e YouTube il simbolo e il logotype diventano render 3D chrome, mentre per Discord e social si usano le versioni piatte. Il 3D resta riservato a key visual, miniature e campagne.',
    'For VRChat and YouTube the symbol and logotype become 3D chrome renders, while the flat versions are used for Discord and social. 3D is reserved for key visuals, thumbnails and campaigns.'),

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
  gal([hLogo, hSym], [[0], [1]]),

  label('03 — Il mondo', '03 — The world'),
  h('Dove vive l’identity', 'Where the identity lives'),
  p('Il mondo è il punto di ritrovo della community di Celestia. La mappa è stata realizzata da Kaira S e la versione mostrata qui è quella di Halloween. Queste immagini servono da contesto per mostrare il resto del mio lavoro, quindi non sono il lavoro principale di questo progetto: sono il posto in cui logotype, colori e interfacce prendono vita.',
    'The world is the meeting point of the Celestia community. The map was made by Kaira S and the version shown here is the Halloween one. These images are context to show the rest of my work, so they are not the main work of this project: they are the place where the logotype, colors and interfaces come to life.'),
  gal(thumbs, [[0, 1]]),
  gal(shots, [[0], [1, 2], [3, 4], [5, 6]]),

  label('04 — Poster e volantini', '04 — Posters and flyers'),
  h('Un layout per riconoscersi', 'A layout to be recognized'),
  p('Poster e volantini seguono un layout specifico per mantenere l’identità: logotype in alto, etichette in JetBrains Mono, titoli in Unbounded, un QR code per entrare nella community e la call to action in Pulsar Cyan. Per l’evento di Halloween il layout resta lo stesso e cambia solo l’accento, che diventa Ember.',
    'Posters and flyers follow a specific layout to keep the identity consistent: logotype at the top, JetBrains Mono labels, Unbounded titles, a QR code to join the community and the call to action in Pulsar Cyan. For the Halloween event the layout stays the same and only the accent changes, becoming Ember.'),
  gal(posters, [[0, 1, 2, 3]]),

  label('Credits', 'Credits'),
  p('Mappa: Kaira S. Logotype, simbolo, key visual, campagna, poster e volantini: Federico.',
    'Map: Kaira S. Logotype, symbol, key visual, campaign, posters and flyers: Federico.'),
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
