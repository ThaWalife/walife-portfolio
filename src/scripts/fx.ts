// Effetti "Framer": smooth scroll, cursore custom, bottoni magnetici, reveal per riga, wipe di pagina a 43°.
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

// ── cursore custom (solo mouse)
if (fine && !reduced) {
  html.classList.add('has-cursor');
  const cur = document.querySelector<HTMLElement>('.cursor')!;
  const lab = cur.querySelector<HTMLElement>('[data-cursor-label]')!;
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  cur.classList.add('hide');
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; cur.classList.remove('hide'); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('hide'));
  const tick = () => { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(tick); };
  tick();
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
    if (t) { lab.textContent = t.dataset.cursor!; cur.classList.add('big'); } else cur.classList.remove('big');
  });
}

// ── wipe di pagina a 43° (uscita: copre; ingresso: scopre)
const wipe = document.querySelector<HTMLElement>('.wipe')!;
const SLANT = 1 / Math.tan((43 * Math.PI) / 180); // dx per dy
const EMPTY = 'polygon(0 0, 0 0, 0 100%, 0 100%)';
// cover(p): 0 → nulla, 1 → copre tutto (bordo destro inclinato a 43° che avanza da sinistra)
const cover = (p: number) => {
  const h = innerHeight, w = innerWidth, run = h * SLANT;
  const edge = -run + p * (w + run * 2);
  wipe.style.clipPath = `polygon(0 0, ${edge + run}px 0, ${edge}px 100%, 0 100%)`;
};
// uncover(q): 0 → copre tutto, 1 → nulla (bordo sinistro inclinato che avanza verso destra)
const uncover = (q: number) => {
  const h = innerHeight, w = innerWidth, run = h * SLANT;
  const e = -run + q * (w + run * 2);
  wipe.style.clipPath = `polygon(${e + run}px 0, 100% 0, 100% 100%, ${e}px 100%)`;
};
const ease = (t: number) => 1 - Math.pow(1 - t, 4);
function animate(fn: (v: number) => void, ms: number, done?: () => void) {
  const t0 = performance.now();
  const step = (now: number) => {
    const k = Math.min((now - t0) / ms, 1);
    fn(ease(k));
    if (k < 1) requestAnimationFrame(step); else done?.();
  };
  requestAnimationFrame(step);
}
let cameFrom = false;
try { cameFrom = sessionStorage.getItem('wl-wipe') === '1'; sessionStorage.removeItem('wl-wipe'); } catch { /* sessionStorage non disponibile */ }
if (cameFrom && !reduced) {
  uncover(0);
  requestAnimationFrame(() => animate(uncover, 750, () => { wipe.style.clipPath = EMPTY; }));
}
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
    animate(cover, 550, () => { location.href = a.href; });
  });
  addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) wipe.style.clipPath = EMPTY; });
}
