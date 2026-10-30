import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const site = JSON.parse(readFileSync(new URL('../src/content/site.json', import.meta.url), 'utf8'));
const BASE = '/walife-portfolio/';
const PAGES = [
  { path: '', lang: 'it', title: /Walife/ }, { path: 'archivio/', lang: 'it', title: /Archivio/ },
  { path: 'chi-sono/', lang: 'it', title: /Chi sono/ }, { path: 'contatti/', lang: 'it', title: /Contattami/ },
  { path: 'en/', lang: 'en', title: /Walife/ }, { path: 'en/archive/', lang: 'en', title: /archive/i },
  { path: 'en/about/', lang: 'en', title: /About/ }, { path: 'en/contact/', lang: 'en', title: /Contact me/ },
  { path: 'privacy/', lang: 'it', title: /Privacy/ }, { path: 'en/privacy/', lang: 'en', title: /Privacy/ },
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

test('archivio: 12 progetti, filtri per categoria coerenti con data.js, vista lista', async ({ page }) => {
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

test('archivio EN: stessi 12 progetti con testi EN', async ({ page }) => {
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
    await expect(page.locator(`main a[href="${s.url}"]`)).toHaveCount(1);
});

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
