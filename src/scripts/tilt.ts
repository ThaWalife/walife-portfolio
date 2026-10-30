// Foto profilo: inclinazione 3D leggera col puntatore (solo mouse, non con reduced-motion).
const fine = matchMedia('(pointer: fine)').matches;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (fine && !reduced) {
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    const g = el.querySelector<HTMLElement>('.ph-glass')!;
    let tx = 0, ty = 0, x = 0, y = 0, run = false;
    const loop = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      g.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`);
      g.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(x * 14).toFixed(1)}px`);
      el.style.setProperty('--gy', `${(y * 14).toFixed(1)}px`);
      if (run || Math.abs(tx - x) + Math.abs(ty - y) > 0.002) requestAnimationFrame(loop);
    };
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!run) { run = true; requestAnimationFrame(loop); }
    });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; run = false; requestAnimationFrame(loop); });
  });
}

export {};
