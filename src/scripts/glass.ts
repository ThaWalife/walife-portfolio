// CTA della hero in "liquid glass" (dashersw/liquid-glass-js, MIT, vendorizzato in public/vendor/liquid-glass).
// La libreria cattura una volta il body con html2canvas (dipendenza installata da npm, non da CDN) e rifrange quello snapshot in WebGL.
// Se qualcosa non va resta il bottone normale (fallback accessibile e senza JS).
import html2canvas from 'html2canvas';

declare const Button: new (o: Record<string, unknown>) => { element: HTMLElement };

const loadScript = (src: string) =>
  new Promise<void>((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error('script ' + src));
    document.head.append(s);
  });

export async function mountGlass(slot: HTMLElement) {
  const base = slot.dataset.glassBase!;
  const fallback = slot.querySelector<HTMLAnchorElement>('a')!;
  (window as unknown as { html2canvas: typeof html2canvas }).html2canvas = html2canvas;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = base + 'glass.css';
  document.head.append(css);
  await loadScript(base + 'container.js');
  await loadScript(base + 'button.js');
  const btn = new Button({
    text: slot.dataset.glassText ?? fallback.textContent!.trim(),
    size: 22,
    type: 'pill',
    tintOpacity: 0.12,
    onClick: () => fallback.click(), // riusa il link reale (transizione di pagina inclusa)
  });
  btn.element.setAttribute('aria-hidden', 'true');
  slot.append(btn.element);
  // il bottone vero resta nel DOM per tastiera e lettori di schermo, ma fuori vista quando il vetro è attivo
  fallback.classList.add('glass-fallback');
  slot.classList.add('glass-on');
}
