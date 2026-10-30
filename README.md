# Walife Portfolio

Sito portfolio di Federico "Wally" (Walife) — identità Renewal 2026.
Astro (static) + TypeScript + Three.js. IT/EN, tema scuro di default.

## Comandi

```bash
npm ci
npm run dev        # sviluppo
npm run build      # build statica in dist/
npm run check      # astro check
npm test           # Playwright (usa Edge; builda e serve su :4321)
npm run gen:content  # rigenera src/content/site.json da scripts/data.source.js
node scripts/verify-content.mjs   # confronta site.json con data.js live di thawalife.com
```

## Note

- Deploy: GitHub Pages (`.github/workflows/deploy.yml`), base path `/walife-portfolio/` (`astro.config.mjs`). In Settings → Pages la sorgente deve essere **GitHub Actions**.
- Logo 3D: i 4 path di `src/assets/walife-logo.svg` estrusi con Three.js (`src/scripts/logo3d.ts`), caricati solo in home. `prefers-reduced-motion` o assenza di WebGL → logo SVG statico.
- Lingua: IT di default; alla prima visita sulla radice, browser non italiano → `/en/`. Lo switch IT/EN prevale sempre (localStorage `wl-lang`).
- Font: Clash Display e General Sans (Fontshare, licenza gratuita anche commerciale), self-hosted in `src/assets/fonts/`.

## Librerie di terze parti

- `lenis` (smooth scroll).
