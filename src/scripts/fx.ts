// Effetti "Framer": smooth scroll, reveal per riga, transizione di pagina in vetro + prato.
import Lenis from 'lenis';

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;

// ── smooth scroll
export let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  const raf = (t: number) => { lenis!.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')!;
      const el = id === '#' ? null : document.querySelector<HTMLElement>(id);
      e.preventDefault();
      lenis!.scrollTo(el ?? 0, { duration: 1.2 });
    }),
  );
}

// ── reveal per riga/parola dei titoli
function splitWords(root: Node, counter = { i: 0 }) {
  [...root.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? '').split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((p) => {
        if (!p) return;
        if (/^\s+$/.test(p)) { frag.append(' '); return; }
        const w = document.createElement('span'); w.className = 'w';
        const s = document.createElement('span'); s.textContent = p; s.style.setProperty('--i', String(counter.i++));
        w.append(s); frag.append(w);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) splitWords(node, counter);
  });
}
const splits = [...document.querySelectorAll<HTMLElement>('[data-split]')];
if (!reduced) {
  html.classList.add('js-split');
  splits.forEach((el) => splitWords(el)); // le parole restano nel DOM come testo normale: lettori di schermo OK
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
  splits.forEach((el) => io.observe(el));
}

// ── transizione di pagina: foglio di vetro con il prato che sale (uscita) e riscende (ingresso). ~0,35 s + ~0,45 s.
const wipe = document.querySelector<HTMLElement>('.wipe')!;
const sheet = wipe.querySelector<HTMLElement>('.wp-sheet')!;
const glass = wipe.querySelector<HTMLElement>('.wp-glass')!;
const SHOW = 'translateY(-17vh)';     // il foglio copre tutto lo schermo (il bordo irregolare resta sopra)
const HIDE = 'translateY(100vh)';    // il foglio è sotto lo schermo
const play = (from: string, to: string, ms: number, g0: number, g1: number) => {
  wipe.style.visibility = 'visible';
  html.classList.add('wl-busy'); // ferma foglie e altri lavori sotto la copertura: tutta la GPU alla transizione
  const o = { duration: ms, fill: 'forwards' as const };
  glass.animate([{ opacity: g0 }, { opacity: g1 }], { ...o, easing: 'ease-out' });
  return sheet.animate([{ transform: from }, { transform: to }], { ...o, easing: 'cubic-bezier(0.65, 0, 0.25, 1)' }).finished;
};
// le illustrazioni del foglio si caricano a riposo (o subito se la pagina nasce coperta): niente peso sul primo caricamento
const field = wipe.querySelector<HTMLElement>('.wp-field')!;
let loaded = false;
let fieldReady: Promise<unknown> = Promise.resolve();
const loadField = () => {
  if (loaded) return;
  loaded = true;
  // il simbolo compare solo quando tutti gli strati sono pronti: mai davanti a un'illustrazione incompleta
  fieldReady = Promise.all((field.dataset.wipeSrcs ?? '').split(',').filter(Boolean).map((src) => {
    const im = new Image();
    im.className = 'fl'; im.alt = ''; im.decoding = 'async'; im.src = src;
    field.append(im);
    return im.decode().catch(() => { /* il browser la decodifica comunque al primo uso */ }); // già decodificata prima del primo fotogramma
  })).then(() => wipe.classList.add('rdy'));
};
const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1200));
const clear = () => {
  sheet.getAnimations().concat(glass.getAnimations()).forEach((a) => a.cancel());
  html.classList.remove('wl-in', 'wl-busy');
  wipe.style.visibility = 'hidden';
};
let cameFrom = false;
try { cameFrom = sessionStorage.getItem('wl-wipe') === '1'; sessionStorage.removeItem('wl-wipe'); } catch { /* sessionStorage non disponibile */ }
if (!reduced) { if (cameFrom) loadField(); else idle(loadField); }
if (cameFrom && !reduced) {
  // la pagina nasce già coperta (classe .wl-in); parte da lì e riscende
  // si scopre solo quando la pagina ha finito di caricare (al massimo 700 ms): così la discesa non compete con il lavoro di avvio
  const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise<void>((r) => addEventListener('load', () => r(), { once: true }));
  Promise.race([Promise.all([loaded, fieldReady]), new Promise((r) => setTimeout(r, 700))]).then(() =>
    requestAnimationFrame(() => requestAnimationFrame(() => { html.classList.remove('wl-in'); play(SHOW, HIDE, 460, 1, 0).then(clear); })));
} else clear();
if (!reduced) {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (a.hasAttribute('data-lang-switch') && u.pathname === location.pathname) return;
    e.preventDefault();
    try { sessionStorage.setItem('wl-wipe', '1'); } catch { /* ok */ }
    loadField();
    play(HIDE, SHOW, 360, 0, 1).then(() => { location.href = a.href; });
  });
  addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) clear(); });
}
