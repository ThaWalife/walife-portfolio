// Home: CTA in vetro, righe di anteprime guidate dallo scroll, testo che si rivela scrollando, card progetti impilate.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const stack = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b);

// CTA hero in liquid glass: solo mouse, senza reduced-motion
const glassSlot = document.querySelector<HTMLElement>('[data-glass]');
if (glassSlot && fine && !reduced && !stack) {
  setTimeout(() => import('./glass').then((m) => m.mountGlass(glassSlot)).catch(() => { /* resta il bottone normale */ }), 1800);
}

// titolo hero: font-size calcolato perché il testo occupi esattamente la larghezza della zona sicura
const heroH = document.querySelector<HTMLElement>('.hero-h');
if (heroH) {
  const fit = () => {
    if (innerWidth <= 900) { heroH.style.fontSize = ''; return; }
    heroH.style.fontSize = '100px';
    const r = document.createRange();
    r.selectNodeContents(heroH);
    const w = r.getBoundingClientRect().width;
    heroH.style.fontSize = `${(100 * heroH.clientWidth / w * 0.998).toFixed(2)}px`;
  };
  fit();
  document.fonts?.ready.then(fit);
  addEventListener('resize', fit);
}

// righe di anteprime: scorrono in senso opposto con lo scroll (offset = (scroll - top + vh) * 0.3)
const strip = document.querySelector<HTMLElement>('.strip');
const rows = [...document.querySelectorAll<HTMLElement>('[data-strip]')];
if (strip && rows.length && !reduced) {
  const move = () => {
    const off = (scrollY - (strip.getBoundingClientRect().top + scrollY) + innerHeight) * 0.3;
    for (const r of rows) r.style.transform = `translate3d(${Number(r.dataset.strip) * (off - 200)}px,0,0)`;
  };
  addEventListener('scroll', move, { passive: true });
  move();
}

// testo che si rivela scrollando: ogni carattere passa dal grigio all'inchiostro (grigio con contrasto ≥ 4.5:1)
const scrub = document.querySelector<HTMLElement>('[data-scrub]');
if (scrub && !reduced) {
  const words = scrub.textContent!.trim().split(/\s+/);
  scrub.textContent = '';
  const chars: HTMLSpanElement[] = [];
  words.forEach((w, wi) => {
    const wEl = document.createElement('span');
    wEl.className = 'sw';
    for (const ch of w) { const c = document.createElement('span'); c.textContent = ch; wEl.append(c); chars.push(c); }
    scrub.append(wEl, wi < words.length - 1 ? ' ' : '');
  });
  const paint = () => {
    const r = scrub.getBoundingClientRect();
    const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.45));
    const k = p * (chars.length + 24);
    chars.forEach((c, i) => c.classList.toggle('on', k > i + 12));
  };
  addEventListener('scroll', paint, { passive: true });
  addEventListener('resize', paint);
  paint();
}

// card progetti impilate: ogni card, mentre la successiva sale, si rimpicciolisce (1 → 1 - 0.03·(n-1-i))
const cards = [...document.querySelectorAll<HTMLElement>('[data-pcard]')];
if (cards.length && !reduced && !stack) {
  const n = cards.length;
  const frame = () => {
    cards.forEach((c, i) => {
      const slot = c.parentElement!;
      const r = slot.getBoundingClientRect();
      const done = clamp(-r.top / Math.max(1, r.height)); // quanto lo slot è già "passato"
      const to = 1 - (n - 1 - i) * 0.03;
      c.style.transform = `scale(${(1 - (1 - to) * done).toFixed(4)})`;
    });
    requestAnimationFrame(frame);
  };
  frame();
}

export {};
