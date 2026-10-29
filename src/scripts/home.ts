// Home: logo (WebGL lazy / SVG), parallasse hero, shelf progetti pinned con focus, vista esplosa dei servizi + callout.
const html = document.documentElement;
const canvas = document.getElementById('logo-canvas') as HTMLCanvasElement | null;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const stack = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const W = window as any;
W.__wl3d = W.__wl3d ?? { explode: 0, active: -1 };

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

if (!canvas || reduced || !webglOk()) {
  html.dataset.logo = 'svg';
} else {
  import('./logo3d')
    .then((m) => m.initLogo(canvas))
    .then(() => { html.dataset.logo = 'webgl'; })
    .catch(() => { html.dataset.logo = 'svg'; });
}

const clamp = (v: number, a = 0, b = 1) => Math.min(Math.max(v, a), b);
const smooth = (t: number) => t * t * (3 - 2 * t);

// ── sfondo hero: mesh gradient verde/bianco (shader Paper), caricato lazy
const shaderEl = document.querySelector<HTMLElement>('[data-shader]');
if (shaderEl) import('./bg').then((m) => m.mountHeroShader(shaderEl, reduced)).catch(() => { /* resta il verde piatto */ });

// ── CTA hero in liquid glass: solo mouse + niente reduced-motion, dopo che il resto della scena è pronto
const glassSlot = document.querySelector<HTMLElement>('[data-glass]');
if (glassSlot && fine && !reduced && !stack) {
  setTimeout(() => import('./glass').then((m) => m.mountGlass(glassSlot)).catch(() => { /* resta il bottone normale */ }), 2200);
}

// ── parallasse dello sfondo hero (puntatore)
const hero = document.querySelector<HTMLElement>('[data-hero]');
if (hero && fine && !reduced) {
  let tx = 0, ty = 0, x = 0, y = 0;
  addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth) * 2 - 1; ty = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  const loop = () => { x += (tx - x) * 0.06; y += (ty - y) * 0.06; hero.style.setProperty('--px', x.toFixed(3)); hero.style.setProperty('--py', y.toFixed(3)); requestAnimationFrame(loop); };
  loop();
}

// ── shelf progetti: orizzontale pinned, la card centrale è in focus (scala 1), le altre ≈0.86 e meno opache
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
      const top = wrap.getBoundingClientRect().top;
      const p = clamp(-top / Math.max(1, dist));
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

// ── servizi: vista esplosa pinned. Scroll → explode 0..1 + pezzo attivo 0..3; hover/focus su una riga forza il pezzo.
const sec = document.querySelector<HTMLElement>('[data-svc-section]');
const rows = [...document.querySelectorAll<HTMLElement>('[data-svc]')];
const svg = document.querySelector<SVGElement>('[data-callouts]');
let forced = -1;
const setActive = (n: number) => {
  W.__wl3d.active = n;
  rows.forEach((r, i) => r.classList.toggle('on', i === n));
};
if (sec && !reduced && !stack) {
  const lines = [...document.querySelectorAll<SVGPathElement>('[data-line]')];
  const dots = [...document.querySelectorAll<SVGCircleElement>('[data-dot]')];
  const frame = () => {
    const top = sec.getBoundingClientRect().top;
    const p = clamp(-top / Math.max(1, sec.offsetHeight - innerHeight));
    const inside = top < innerHeight * 0.4 && p < 0.995;
    const ex = smooth(clamp(p / 0.16)) * (1 - smooth(clamp((p - 0.93) / 0.07)));
    W.__wl3d.explode = inside ? ex : 0;
    const seg = clamp((p - 0.16) / 0.77) * 4;
    const auto = inside && p > 0.14 && p < 0.95 ? Math.min(3, Math.floor(seg)) : -1;
    const act = forced >= 0 && inside ? forced : auto;
    if (W.__wl3d.active !== act) setActive(act);
    // callout: linea dal pezzo (coordinate a schermo dal canvas) al bordo sinistro della riga
    const on = inside && ex > 0.35;
    svg?.classList.toggle('on', on);
    if (on) {
      const pcs = W.__wlPieces as { x: number; y: number }[];
      rows.forEach((r, i) => {
        const pc = pcs[i]; if (!pc) return;
        const rr = r.getBoundingClientRect();
        const x2 = rr.left - 18, y2 = rr.top + 30;
        const mx = pc.x + (x2 - pc.x) * 0.5;
        lines[i].setAttribute('d', `M${pc.x.toFixed(1)} ${pc.y.toFixed(1)} L${mx.toFixed(1)} ${y2.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`);
        lines[i].classList.toggle('on', i === W.__wl3d.active);
        dots[i].setAttribute('cx', pc.x.toFixed(1)); dots[i].setAttribute('cy', pc.y.toFixed(1));
      });
    }
    requestAnimationFrame(frame);
  };
  frame();
  rows.forEach((row, i) => {
    row.addEventListener('pointerenter', () => { forced = i; });
    row.addEventListener('pointerleave', () => { forced = -1; });
    row.addEventListener('focus', () => { forced = i; });
    row.addEventListener('blur', () => { forced = -1; });
  });
} else if (sec) {
  sec.classList.add('no-pin-svc');
}

export {};
