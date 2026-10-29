import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('../src/content/site.json', import.meta.url), 'utf8'));
const BASE = '/walife-portfolio/';
const PAGES = [
  { path: '', lang: 'it', title: /Walife/ }, { path: 'archivio/', lang: 'it', title: /Archivio/ },
  { path: 'chi-sono/', lang: 'it', title: /Chi sono/ }, { path: 'contatti/', lang: 'it', title: /Contattami/ },
  { path: 'en/', lang: 'en', title: /Walife/ }, { path: 'en/archive/', lang: 'en', title: /archive/i },
  { path: 'en/about/', lang: 'en', title: /About/ }, { path: 'en/contact/', lang: 'en', title: /Contact me/ },
];

const errorsOf = (page: Page) => {
  const errs: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  return errs;
};

for (const p of PAGES) {
  test(`pagina ${p.path || 'home'} (${p.lang}): carica, lang/hreflang/title, nessun errore`, async ({ page }) => {
    const errs = errorsOf(page);
    const pref = p.lang;
    await page.addInitScript((v) => localStorage.setItem('wl-lang', v), pref);
    await page.goto(p.path);
    await expect(page.locator('html')).toHaveAttribute('lang', p.lang);
    await expect(page).toHaveTitle(p.title);
    await expect(page.locator('link[rel=alternate][hreflang=it]')).toHaveCount(1);
    await expect(page.locator('link[rel=alternate][hreflang=en]')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.waitForTimeout(800);
    expect(errs).toEqual([]);
  });
}

test.describe('AC3b redirect lingua sotto il base path', () => {
  test('en-US, nessuna preferenza → /en/', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-US' });
    const page = await ctx.newPage();
    await page.goto('');
    await expect(page).toHaveURL(new RegExp(`${BASE}en/$`));
    await ctx.close();
  });
  test('it-IT → resta sulla radice', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'it-IT' });
    const page = await ctx.newPage();
    await page.goto('');
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname).toBe(BASE);
    await ctx.close();
  });
  test('preferenza it salvata + en-US → resta IT', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-US' });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('wl-lang', 'it'));
    await page.goto('');
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname).toBe(BASE);
    await ctx.close();
  });
  test('preferenza en salvata + it-IT → /en/', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'it-IT' });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('wl-lang', 'en'));
    await page.goto('');
    await expect(page).toHaveURL(new RegExp(`${BASE}en/$`));
    await ctx.close();
  });
  test('switch manuale IT/EN salva la scelta e prevale', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'it-IT' });
    const page = await ctx.newPage();
    await page.goto('');
    await page.locator('[data-lang-switch=en]').click();
    await expect(page).toHaveURL(new RegExp(`${BASE}en/$`));
    expect(await page.evaluate(() => localStorage.getItem('wl-lang'))).toBe('en');
    await page.goto('');
    await expect(page).toHaveURL(new RegExp(`${BASE}en/$`)); // it-IT ma preferenza en
    await ctx.close();
  });
  test('User-Agent bot non viene reindirizzato', async ({ browser }) => {
    const ctx = await browser.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' });
    const page = await ctx.newPage();
    await page.goto('');
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname).toBe(BASE);
    await ctx.close();
  });
});

test('archivio: 11 progetti, filtri per categoria coerenti con data.js, vista lista', async ({ page }) => {
  await page.goto('archivio/');
  const cards = page.locator('.card');
  await expect(cards).toHaveCount(site.PROJECTS.length);
  await expect(page.locator('[data-count]')).toHaveText(`${site.PROJECTS.length} progetti`);
  for (const cat of Object.keys(site.CATEGORIES)) {
    const n = site.PROJECTS.filter((p: any) => p.cats.includes(cat)).length;
    await page.locator(`[data-filter=${cat}]`).click();
    await expect(page.locator('.card:not([hidden])')).toHaveCount(n);
    await expect(page.locator('[data-count]')).toHaveText(`${n} progetti`);
  }
  await page.locator('[data-filter=all]').click();
  await page.locator('[data-view-btn=list]').click();
  await expect(page.locator('[data-archive]')).toHaveAttribute('data-view', 'list');
});

test('archivio EN: stessi 11 progetti con testi EN', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wl-lang', 'en'));
  await page.goto('en/archive/');
  await expect(page.locator('.card')).toHaveCount(site.PROJECTS.length);
  await expect(page.locator('[data-count]')).toHaveText(`${site.PROJECTS.length} projects`);
  await expect(page.getByText(site.PROJECTS[0].desc.en)).toHaveCount(1);
});

test('chi sono: 10 software, 2 formazioni, 2 esperienze da data.js', async ({ page }) => {
  await page.goto('chi-sono/');
  await expect(page.locator('.tools-grid li')).toHaveCount(site.ABOUT.tools.length);
  const tl = page.locator('.tl');
  await expect(tl.nth(0).locator('li')).toHaveCount(site.ABOUT.education.length);
  await expect(tl.nth(1).locator('li')).toHaveCount(site.ABOUT.experience.length);
});

test('contatti: email e social corretti', async ({ page }) => {
  await page.goto('contatti/');
  await expect(page.locator('a.mail')).toHaveAttribute('href', 'mailto:thawalife@gmail.com');
  for (const s of site.SOCIALS.filter((x: any) => x.name !== 'Email'))
    await expect(page.locator(`a[href="${s.url}"]`)).toHaveCount(1);
});

test('home: logo 3D in WebGL, opaco, verde brand sui fondi scuri, si muove con lo scroll', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-logo', 'webgl', { timeout: 15_000 });
  await page.waitForTimeout(2500); // intro completata
  const px = () => page.evaluate(() => {
    const c = document.getElementById('logo-canvas') as HTMLCanvasElement;
    const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    const x = t.getContext('2d')!; x.drawImage(c, 0, 0);
    const d = x.getImageData(0, 0, t.width, t.height).data;
    let opaque = 0, green = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 250) continue;
      opaque++;
      if (d[i + 1] > d[i] + 40 && d[i + 1] > d[i + 2] + 25) green++;
    }
    return { opaque, green };
  });
  expect((await px()).opaque).toBeGreaterThan(3000); // hero: logo opaco
  const state = () => page.evaluate(() => ({ ...(document.getElementById('logo-canvas') as HTMLCanvasElement).dataset }));
  const s0 = await state();
  expect(s0.stop).toBe('hero');
  expect(Number(s0.tone)).toBeGreaterThan(0.9); // hero verde ⇒ logo bianco (reverse)
  const seen: string[] = [JSON.stringify([s0.x, s0.y, s0.h, s0.ry])];
  for (const id of ['services', 'archive-cta', 'contact']) {
    await page.evaluate((i) => window.scrollTo({ top: document.getElementById(i)!.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' }), id);
    await page.waitForTimeout(2200);
    const s = await state();
    seen.push(JSON.stringify([s.x, s.y, s.h, s.ry]));
    const green = id !== 'archive-cta'; // services e contact sono verdi, archive è bianco
    if (green) expect(Number(s.tone), `tone @${id}`).toBeGreaterThan(0.85); else expect(Number(s.tone), `tone @${id}`).toBeLessThan(0.15);
  }
  expect(new Set(seen).size).toBe(4);
});

test('home: prefers-reduced-motion → fallback SVG, nessun chunk three', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const reqs: string[] = [];
  page.on('request', (r) => reqs.push(r.url()));
  await page.goto('');
  await expect(page.locator('html')).toHaveAttribute('data-logo', 'svg');
  await expect(page.locator('.hero-fallback svg')).toBeVisible();
  expect(reqs.filter((u) => /logo3d/.test(u))).toEqual([]);
  await ctx.close();
});

test('pagine non-home non caricano three', async ({ page }) => {
  const reqs: string[] = [];
  page.on('request', (r) => reqs.push(r.url()));
  for (const p of ['archivio/', 'chi-sono/', 'contatti/']) await page.goto(p);
  expect(reqs.filter((u) => /logo3d/.test(u))).toEqual([]);
});

for (const w of [375, 768, 1440]) {
  test(`nessun overflow orizzontale a ${w}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, locale: 'it-IT' });
    const page = await ctx.newPage();
    for (const p of PAGES.filter((x) => x.lang === 'it')) {
      await page.goto(p.path);
      await page.waitForTimeout(300);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(o, `${p.path} @${w}`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
}

test('tutti i link interni e gli asset rispondono 200 sotto il base path', async ({ page, request }) => {
  const urls = new Set<string>();
  await page.addInitScript(() => localStorage.setItem('wl-lang', 'it'));
  for (const p of PAGES) {
    await page.goto(p.path);
    const found = await page.evaluate(() => [
      ...[...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href),
      ...[...document.querySelectorAll('img[src]')].map((a) => (a as HTMLImageElement).src),
      ...[...document.querySelectorAll('link[href]')].map((a) => (a as HTMLLinkElement).href),
    ]);
    found.filter((u) => u.startsWith('http://localhost:4321')).forEach((u) => urls.add(u.split('#')[0]));
  }
  expect(urls.size).toBeGreaterThan(20);
  for (const u of urls) {
    expect(u, 'fuori dal base path').toContain(BASE);
    const r = await request.get(u);
    expect(r.status(), u).toBe(200);
  }
});

test('nessuna richiesta runtime verso il sito vecchio (solo link "Apri progetto")', async ({ page }) => {
  const ext: string[] = [];
  page.on('request', (r) => { if (/thawalife\.com/.test(r.url())) ext.push(r.url()); });
  await page.goto('archivio/');
  await page.waitForTimeout(800);
  expect(ext).toEqual([]);
});
