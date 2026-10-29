// Suono opt-in: pluck di vetro sintetizzato (Web Audio, scala pentatonica). Default OFF, mai autoplay,
// nessun AudioContext prima di un gesto utente sul toggle. Disattivato con prefers-reduced-motion.
declare global {
  interface Window { __wlSound: { plays: number; ctx: number } }
}
window.__wlSound = { plays: 0, ctx: 0 };

const NOTES = [392, 440, 523.25, 587.33, 659.25, 784, 880, 1046.5];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const toggle = document.querySelector<HTMLButtonElement>('[data-sound-toggle]');
let enabled = false;
let armed = false; // true solo dopo un gesto utente reale (click/tasto)
let ctx: AudioContext | null = null;
let last = 0;
let n = 0;

const read = () => { try { return localStorage.getItem('wl-sound') === '1'; } catch { return false; } };
const write = (v: boolean) => { try { localStorage.setItem('wl-sound', v ? '1' : '0'); } catch { /* storage non disponibile */ } };

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC();
    window.__wlSound.ctx++;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function pluck() {
  const c = ensureCtx();
  const f = NOTES[n++ % NOTES.length];
  const t = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  g.connect(c.destination);
  for (const [mul, type, vol] of [[1, 'sine', 1], [2.01, 'triangle', 0.35], [3.99, 'sine', 0.12]] as const) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = type; o.frequency.value = f * mul; og.gain.value = vol;
    o.connect(og); og.connect(g);
    o.start(t); o.stop(t + 1.4);
  }
}

/** Unico punto di emissione: guardie + contatore di test. */
function trigger() {
  if (!enabled || !armed || reduced) return;
  const now = performance.now();
  if (now - last < 90) return;
  last = now;
  window.__wlSound.plays++;
  pluck();
}

function setEnabled(v: boolean) {
  enabled = v && !reduced;
  toggle?.setAttribute('aria-pressed', String(enabled));
}

if (toggle) {
  if (reduced) { toggle.disabled = true; setEnabled(false); }
  else {
    // La preferenza salvata ripristina solo lo stato visivo; l'AudioContext nasce al primo gesto/trigger.
    setEnabled(read());
    toggle.addEventListener('click', () => {
      armed = true;
      setEnabled(!enabled);
      write(enabled);
      if (enabled) { ensureCtx(); trigger(); }
    });
  }
}

document.querySelectorAll<HTMLElement>('[data-snd]').forEach((el) => {
  if (finePointer) el.addEventListener('pointerenter', trigger);
  el.addEventListener('focus', () => { if (el.matches(':focus-visible')) trigger(); });
});
document.addEventListener('wl:snd', trigger);
for (const ev of ['pointerdown', 'keydown'] as const) document.addEventListener(ev, () => { armed = true; }, { capture: true, once: true });

export {};
