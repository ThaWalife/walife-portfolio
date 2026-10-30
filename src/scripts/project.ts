// Pagina progetto: lightbox sulle immagini, YouTube caricato solo al click (nessuna richiesta esterna prima), sfogliatore del libro.
const zooms = [...document.querySelectorAll<HTMLButtonElement>('[data-zoom]')];
const dlg = document.querySelector<HTMLDialogElement>('[data-dlg]');
const dimg = document.querySelector<HTMLImageElement>('[data-dlg-img]');
let cur = 0;
const show = (i: number) => {
  cur = (i + zooms.length) % zooms.length;
  const z = zooms[cur];
  dimg!.src = z.dataset.zoom!;
  dimg!.alt = z.querySelector('img')?.alt ?? '';
};
if (dlg && dimg && zooms.length) {
  zooms.forEach((z, i) => z.addEventListener('click', () => { show(i); dlg.showModal(); }));
  dlg.querySelector('[data-dlg-close]')!.addEventListener('click', () => dlg.close());
  dlg.querySelector('[data-dlg-prev]')!.addEventListener('click', () => show(cur - 1));
  dlg.querySelector('[data-dlg-next]')!.addEventListener('click', () => show(cur + 1));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
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
