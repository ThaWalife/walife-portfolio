// Home: sfondo hero (gradiente Paper), CTA in liquid glass, parallasse, shelf progetti pinned con focus.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const stack = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b);

const shaderEl = document.querySelector<HTMLElement>('[data-shader]');
if (shaderEl) import('./bg').then((m) => m.mountHeroShader(shaderEl, reduced)).catch(() => { /* resta il verde piatto */ });

// CTA hero in liquid glass: solo mouse, senza reduced-motion, dopo che la scena è pronta
const glassSlot = document.querySelector<HTMLElement>('[data-glass]');
if (glassSlot && fine && !reduced && !stack) {
  setTimeout(() => import('./glass').then((m) => m.mountGlass(glassSlot)).catch(() => { /* resta il bottone normale */ }), 2200);
}

const hero = document.querySelector<HTMLElement>('[data-hero]');
if (hero && fine && !reduced) {
  let tx = 0, ty = 0, x = 0, y = 0;
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const loop = () => { x += (tx - x) * 0.06; y += (ty - y) * 0.06; hero.style.setProperty('--px', x.toFixed(3)); hero.style.setProperty('--py', y.toFixed(3)); requestAnimationFrame(loop); };
  loop();
}

// shelf progetti: orizzontale pinned, la card centrale è in focus (scala 1), le altre ≈0.86 e più scure
const wrap = document.querySelector<HTMLElement>('[data-pin]');
const track = document.querySelector<HTMLElement>('[data-track]');
if (wrap && track) {
  if (reduced || stack) {
    wrap.classList.add('no-pin');
  } else {
    const slides = [...track.querySelectorAll<HTMLElement>('[data-slide]')];
    let dist = 0;
    const measure = () => {
      dist = Math.max(0, track.scrollWidth - innerWidth);
      wrap.style.height = `${dist + innerHeight}px`;
    };
    measure();
    addEventListener('resize', measure);
    addEventListener('load', measure);
    const frame = () => {
      const p = clamp(-wrap.getBoundingClientRect().top / Math.max(1, dist));
      track.style.transform = `translate3d(${-p * dist}px,0,0)`;
      for (const s of slides) {
        const r = s.getBoundingClientRect();
        const c = (r.left + r.width / 2 - innerWidth / 2) / innerWidth; // -1..1
        const d = clamp(Math.abs(c) * 1.6);
        s.style.setProperty('--shift', `${(-c * 70).toFixed(1)}px`);
        s.style.setProperty('--sc', (1 - 0.14 * d).toFixed(3));
        s.style.setProperty('--br', (1 - 0.45 * d).toFixed(3));
      }
      track.dataset.p = p.toFixed(3);
      requestAnimationFrame(frame);
    };
    frame();
  }
  if (fine && !reduced) {
    track.querySelectorAll<HTMLElement>('[data-slide]').forEach((s) => {
      const im = s.querySelector<HTMLElement>('.im')!;
      s.addEventListener('pointermove', (e) => {
        const r = s.getBoundingClientRect();
        im.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
        im.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 8).toFixed(2)}deg`);
      });
      s.addEventListener('pointerleave', () => { im.style.setProperty('--ry', '0deg'); im.style.setProperty('--rx', '0deg'); });
    });
  }
}

export {};
