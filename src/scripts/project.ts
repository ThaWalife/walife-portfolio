// Pagina progetto: lightbox con lente di ingrandimento, YouTube caricato solo al click (nessuna richiesta esterna prima), sfogliatore del libro.
const zooms = [...document.querySelectorAll<HTMLButtonElement>('[data-zoom]')];
const dlg = document.querySelector<HTMLDialogElement>('[data-dlg]');
const dimg = document.querySelector<HTMLImageElement>('[data-dlg-img]');
const stage = document.querySelector<HTMLElement>('[data-stage]');
const level = document.querySelector<HTMLElement>('[data-zoom-level]');
const MAX = 6;
let cur = 0;
let sc = 1, tx = 0, ty = 0;

const apply = () => {
  if (!dimg || !stage) return;
  // l'immagine ingrandita non può uscire dal riquadro: pan limitato ai bordi
  const mx = Math.max(0, (dimg.offsetWidth * sc - stage.clientWidth) / 2);
  const my = Math.max(0, (dimg.offsetHeight * sc - stage.clientHeight) / 2);
  tx = Math.min(Math.max(tx, -mx), mx);
  ty = Math.min(Math.max(ty, -my), my);
  dimg.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
  stage.classList.toggle('zoomed', sc > 1.001);
  if (level) level.textContent = `${Math.round(sc * 100)}%`;
};

/** zoom verso il punto (px, py) in coordinate della finestra; senza punto, verso il centro */
const zoomTo = (next: number, px?: number, py?: number) => {
  if (!stage) return;
  const s2 = Math.min(Math.max(next, 1), MAX);
  const r = stage.getBoundingClientRect();
  const cx = (px ?? r.left + r.width / 2) - (r.left + r.width / 2);
  const cy = (py ?? r.top + r.height / 2) - (r.top + r.height / 2);
  tx = cx - (cx - tx) * (s2 / sc);
  ty = cy - (cy - ty) * (s2 / sc);
  sc = s2;
  if (sc === 1) { tx = 0; ty = 0; }
  apply();
};
const reset = () => { sc = 1; tx = 0; ty = 0; apply(); };

const show = (i: number) => {
  cur = (i + zooms.length) % zooms.length;
  const z = zooms[cur];
  reset();
  dimg!.src = z.dataset.zoom!;
  dimg!.alt = z.querySelector('img')?.alt ?? '';
};

if (dlg && dimg && stage && zooms.length) {
  zooms.forEach((z, i) => z.addEventListener('click', () => { show(i); dlg.showModal(); }));
  dlg.querySelector('[data-dlg-close]')!.addEventListener('click', () => dlg.close());
  dlg.querySelector('[data-dlg-prev]')!.addEventListener('click', () => show(cur - 1));
  dlg.querySelector('[data-dlg-next]')!.addEventListener('click', () => show(cur + 1));
  dlg.querySelector('[data-zoom-in]')!.addEventListener('click', () => zoomTo(sc * 1.6));
  dlg.querySelector('[data-zoom-out]')!.addEventListener('click', () => zoomTo(sc / 1.6));
  dlg.querySelector('[data-zoom-reset]')!.addEventListener('click', reset);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
    if (e.key === '+' || e.key === '=') zoomTo(sc * 1.4);
    if (e.key === '-') zoomTo(sc / 1.4);
    if (e.key === '0') reset();
  });

  // rotella: zoom verso il cursore (lente)
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomTo(sc * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY); }, { passive: false });

  // trascinamento (pan), pizzico a due dita, click/tocco: da 1× a 2,5× sul punto, ancora per tornare a 1×
  const ptrs = new Map<number, { x: number; y: number }>();
  let moved = 0, pinch = 0;
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    pinch = ptrs.size === 2 ? dist() : 0;
  });
  stage.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = dist();
      if (pinch) zoomTo(sc * (d / pinch), (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = d; moved = 99;
      return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    if (sc > 1) { tx += dx; ty += dy; apply(); }
  });
  stage.addEventListener('pointerup', (e) => {
    const had = ptrs.delete(e.pointerId);
    if (had && ptrs.size === 0 && moved < 6) zoomTo(sc > 1.001 ? 1 : 2.5, e.clientX, e.clientY);
  });
  stage.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); });
  addEventListener('resize', apply);
}

document.querySelectorAll<HTMLButtonElement>('[data-yt]').forEach((b) =>
  b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.title = 'YouTube';
    f.className = 'pj-iframe';
    b.parentElement!.replaceChildren(f);
    f.focus();
  }),
);

document.querySelectorAll<HTMLElement>('[data-book]').forEach((book) => {
  const track = book.querySelector<HTMLElement>('.pj-book-track')!;
  const count = book.querySelector<HTMLElement>('[data-book-count]')!;
  const n = track.children.length;
  const w = () => (track.firstElementChild as HTMLElement).offsetWidth;
  const idx = () => Math.round(track.scrollLeft / w());
  const go = (i: number) => track.scrollTo({ left: Math.min(Math.max(i, 0), n - 1) * w(), behavior: 'smooth' });
  book.querySelector('[data-book-prev]')!.addEventListener('click', () => go(idx() - 1));
  book.querySelector('[data-book-next]')!.addEventListener('click', () => go(idx() + 1));
  track.addEventListener('scroll', () => { count.textContent = `${idx() + 1} / ${n}`; }, { passive: true });
});

export {};
