// UI condivisa: tema, preferenza lingua, orologio, reveal, filtri archivio + anteprima flottante.
import './fx';
import './sound';

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage non disponibile */ } },
};


// La scelta manuale della lingua prevale sempre sul rilevamento dal browser.
document.querySelectorAll<HTMLAnchorElement>('[data-lang-switch]').forEach((a) =>
  a.addEventListener('click', () => store.set('wl-lang', a.dataset.langSwitch!)),
);

const clocks = document.querySelectorAll('[data-clock]');
if (clocks.length) {
  const fmt = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
  const tick = () => clocks.forEach((c) => { c.textContent = fmt.format(new Date()); });
  tick();
  setInterval(tick, 20000);
}

const rv = document.querySelectorAll('.rv');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  rv.forEach((el) => io.observe(el));
} else rv.forEach((el) => el.classList.add('in'));

// Archivio: filtro per categoria + vista griglia/lista + anteprima che segue il cursore (vista lista)
const arch = document.querySelector<HTMLElement>('[data-archive]');
if (arch) {
  const items = [...arch.querySelectorAll<HTMLElement>('[data-cats]')];
  const count = arch.querySelector<HTMLElement>('[data-count]')!;
  const empty = arch.querySelector<HTMLElement>('[data-empty]')!;
  const tpl = count.dataset.tpl!;
  const apply = (cat: string) => {
    let n = 0;
    items.forEach((it) => {
      const show = cat === 'all' || it.dataset.cats!.split(' ').includes(cat);
      it.hidden = !show;
      if (show) n++;
    });
    count.textContent = tpl.replace('{n}', String(n));
    empty.style.display = n ? 'none' : 'block';
  };
  arch.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) =>
    b.addEventListener('click', () => {
      arch.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      apply(b.dataset.filter!);
    }),
  );
  arch.querySelectorAll<HTMLButtonElement>('[data-view-btn]').forEach((b) =>
    b.addEventListener('click', () => {
      arch.dataset.view = b.dataset.viewBtn!;
      arch.querySelectorAll('[data-view-btn]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }),
  );

  if (matchMedia('(pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((it) => {
      it.addEventListener('pointermove', (e) => {
        if (arch.dataset.view === 'list') return;
        const r = it.getBoundingClientRect();
        it.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 7).toFixed(2)}deg`);
        it.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 7).toFixed(2)}deg`);
      });
      it.addEventListener('pointerleave', () => { it.style.setProperty('--ry', '0deg'); it.style.setProperty('--rx', '0deg'); });
    });
  }
  if (matchMedia('(pointer: fine)').matches) {
    const peek = document.createElement('div');
    peek.className = 'peek'; peek.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img'); img.alt = ''; peek.append(img);
    document.body.append(peek);
    let x = 0, y = 0, cx = 0, cy = 0, run = false;
    const loop = () => { cx += (x - cx) * 0.18; cy += (y - cy) * 0.18; peek.style.transform = `translate3d(${cx + 28}px,${cy - 140}px,0)`; if (run) requestAnimationFrame(loop); };
    items.forEach((it) => {
      it.addEventListener('pointerenter', () => {
        if (arch.dataset.view !== 'list') return;
        img.src = it.dataset.peek!; peek.classList.add('on'); if (!run) { run = true; loop(); }
      });
      it.addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; });
      it.addEventListener('pointerleave', () => { peek.classList.remove('on'); run = false; });
    });
  }
}
