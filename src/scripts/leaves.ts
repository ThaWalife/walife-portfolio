// Campo di foglie: i 4 pezzi del logo (path originali) come sprite in profondità, verdi e bianchi, che salgono lenti,
// si girano (falso 3D: scaleX = cos) e si scansano dal cursore. Canvas 2D fisso dietro al contenuto, visibile attraverso il vetro.
import logoRaw from '../assets/walife-logo.svg?raw';

const paths = [...logoRaw.matchAll(/<path[^>]* d="([^"]+)"/g)].map((m) => new Path2D(m[1]));
const VW = 269.13, VH = 414.41;
const GREEN = '13,158,91', WHITE = '244,244,244';

type Leaf = { p: Path2D; x: number; y: number; z: number; s: number; vy: number; ph: number; spin: number; rot: number; rv: number; w: boolean };

export function mountLeaves(canvas: HTMLCanvasElement, reduced: boolean) {
  const ctx = canvas.getContext('2d');
  if (!ctx || !paths.length) return;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let w = 0, h = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
  };
  resize();
  addEventListener('resize', resize);

  const N = coarse || w < 900 ? 10 : 22;
  const leaves: Leaf[] = Array.from({ length: N }, (_, i) => {
    const z = 0.3 + Math.random() * 0.7; // profondità: 0.3 lontano … 1 vicino
    return {
      p: paths[i % paths.length], x: Math.random() * w, y: Math.random() * h, z,
      s: (140 + Math.random() * 260) * z, vy: -(6 + Math.random() * 16) * z,
      ph: Math.random() * 6.28, spin: 0.25 + Math.random() * 0.6, rot: Math.random() * 6.28, rv: (Math.random() - 0.5) * 0.25,
      w: i % 3 === 0,
    };
  });

  let mx = -9999, my = -9999;
  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

  const draw = (t: number, dt: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const sy = scrollY;
    for (const l of leaves) {
      l.y += l.vy * dt; l.rot += l.rv * dt;
      const pad = l.s * 1.2;
      if (l.y < -pad) { l.y = h + pad; l.x = Math.random() * w; }
      const px = l.x + Math.sin(t * 0.0003 + l.ph) * 40 * l.z;
      const py = ((l.y - sy * 0.25 * l.z) % (h + pad * 2) + (h + pad * 2)) % (h + pad * 2) - pad;
      // repulsione dal cursore (più forte sulle foglie vicine)
      let dx = px - mx, dy = py - my;
      const d = Math.hypot(dx, dy) + 0.01;
      const push = 180 * l.z * Math.exp(-d / 170);
      dx = (dx / d) * push; dy = (dy / d) * push;
      const flip = Math.cos(t * 0.001 * l.spin + l.ph);
      const sx = (Math.abs(flip) * 0.88 + 0.12) * (l.s / VH);
      const k = l.s / VH;
      ctx.save();
      ctx.translate(px + dx, py + dy);
      ctx.rotate(l.rot);
      ctx.scale(sx, k);
      ctx.translate(-VW / 2, -VH / 2);
      const rgb = l.w ? WHITE : GREEN;
      ctx.fillStyle = `rgba(${rgb},${(0.32 + 0.5 * l.z) * (flip > 0 ? 1 : 0.72)})`;
      ctx.fill(l.p);
      ctx.lineWidth = 1.2 / k;
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * l.z})`;
      ctx.stroke(l.p);
      ctx.restore();
    }
  };

  if (reduced) { draw(0, 0); return; }
  const busy = () => document.documentElement.classList.contains('wl-busy') || document.documentElement.classList.contains('wl-in');
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    // durante la transizione (e all'arrivo sotto la copertura) il canvas sta fermo: ogni suo ridisegno costringe il vetro sopra a ricalcolare la sfocatura
    if (!busy()) draw(now, dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
