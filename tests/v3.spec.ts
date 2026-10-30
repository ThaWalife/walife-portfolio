import { test, expect } from '@playwright/test';

test('hero: nessuna immagine di sfondo, nav a pillole fissa, hero >= viewport', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.hero img.hero-bg')).toHaveCount(0);
  expect(await page.locator('.hero').evaluate((e) => getComputedStyle(e).backgroundImage)).toBe('none');
  expect(await page.locator('.hero').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(13, 158, 91)');
  expect(await page.locator('.pillbar').evaluate((e) => getComputedStyle(e).position)).toBe('fixed');
  const vh = page.viewportSize()!.height;
  expect(await page.locator('.hero').evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(vh - 1);
});

test('progetti: 4 card sticky impilate, le precedenti si rimpiccioliscono scrollando', async ({ page }) => {
  await page.goto('');
  await page.waitForTimeout(1000);
  const y0 = await page.evaluate(() => document.querySelector('[data-stack]')!.getBoundingClientRect().top + scrollY - 100);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y0);
  await page.waitForTimeout(400);
  const sc = () => page.locator('[data-pcard]').evaluateAll((els) => els.map((e) => new DOMMatrix(getComputedStyle(e).transform).a));
  const before = await sc();
  expect(before).toHaveLength(4);
  await page.evaluate((y) => window.scrollTo({ top: y + innerHeight * 2.4, behavior: 'instant' }), y0);
  await page.waitForTimeout(500);
  const after = await sc();
  expect(after[0]).toBeLessThan(before[0]);
  expect(after[0]).toBeGreaterThanOrEqual(0.9 - 0.001);
  expect(after[3]).toBeGreaterThan(after[0]);
  expect(await page.locator('[data-pcard]').first().evaluate((e) => getComputedStyle(e).position)).toBe('sticky');
});

test('hero: titolo enorme a una riga (desktop) e logo piatto al centro, nessun logo 3D', async ({ page }) => {
  await page.goto('');
  const h = page.locator('.hero-h');
  const box = await h.boundingBox();
  const fs = await h.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(fs).toBeGreaterThan(page.viewportSize()!.width * 0.09);
  expect(box!.height).toBeLessThan(fs * 1.2); // una sola riga
  await expect(page.locator('.hero-logo svg')).toBeVisible();
  await expect(page.locator('#logo-canvas')).toHaveCount(0);
});

test('chi sono (home): il testo si rivela scrollando, grigio con contrasto leggibile', async ({ page }) => {
  await page.goto('');
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-scrub]')!.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(600);
  const on1 = await page.locator('[data-scrub] .on').count();
  expect(await page.locator('[data-scrub] .sw span:not(.on)').last().evaluate((e) => getComputedStyle(e).color)).toBe('rgb(107, 107, 107)');
  await page.evaluate(() => scrollBy({ top: 500, behavior: 'instant' }));
  await page.waitForTimeout(600);
  expect(await page.locator('[data-scrub] .on').count()).toBeGreaterThan(on1);
});

test('cursore custom: compare col mouse, assente su touch', async ({ browser }) => {
  const a = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await a.newPage();
  await p.goto('archivio/');
  await expect(p.locator('html')).toHaveClass(/has-cursor/);
  await p.mouse.move(300, 300);
  await expect(p.locator('.cursor')).not.toHaveClass(/hide/);
  await a.close();
  const b = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const q = await b.newPage();
  await q.goto('archivio/');
  await expect(q.locator('html')).not.toHaveClass(/has-cursor/);
  await b.close();
});

test.describe('suono opt-in', () => {
  test('OFF: nessun pluck (hover e tastiera), nessun AudioContext', async ({ page }) => {
    await page.goto('archivio/');
    await page.locator('.pill a[data-snd]').first().hover();
    await page.locator('.card').first().hover();
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    const w = await page.evaluate(() => (window as any).__wlSound);
    expect(w.plays).toBe(0);
    expect(w.ctx).toBe(0);
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('ON dopo gesto: hover e focus da tastiera suonano, un solo AudioContext, preferenza persistente', async ({ page }) => {
    await page.goto('archivio/');
    await page.locator('[data-sound-toggle]').click();
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true');
    const base = await page.evaluate(() => (window as any).__wlSound.plays);
    await page.waitForTimeout(150);
    await page.locator('.card').first().hover();
    await expect.poll(() => page.evaluate(() => (window as any).__wlSound.plays)).toBeGreaterThan(base);
    const mid = await page.evaluate(() => (window as any).__wlSound.plays);
    await page.waitForTimeout(150);
    await page.locator('.pill a[data-snd]').first().focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => (window as any).__wlSound.plays)).toBeGreaterThan(mid);
    expect(await page.evaluate(() => (window as any).__wlSound.ctx)).toBe(1);
    await page.reload();
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => (window as any).__wlSound.ctx)).toBe(0); // nessun contesto prima di un gesto
  });

  test('reduced-motion: toggle disabilitato, 0 pluck e nessun contesto anche con ON salvato', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('wl-sound', '1'));
    await page.goto('archivio/');
    await expect(page.locator('[data-sound-toggle]')).toBeDisabled();
    await page.locator('.card').first().hover();
    await page.keyboard.press('Tab');
    const w = await page.evaluate(() => (window as any).__wlSound);
    expect(w.plays).toBe(0);
    expect(w.ctx).toBe(0);
    await ctx.close();
  });

  test('touch: nessun suono su hover', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('archivio/');
    await page.locator('[data-sound-toggle]').click();
    await page.waitForTimeout(150);
    const before = await page.evaluate(() => (window as any).__wlSound.plays);
    await page.locator('.card').first().dispatchEvent('pointerenter');
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => (window as any).__wlSound.plays)).toBe(before);
    await ctx.close();
  });
});

test('card progetto: link reale /p/<slug>.html', async ({ page }) => {
  await page.goto('archivio/');
  const hrefs = await page.locator('.card').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
  expect(hrefs).toHaveLength(11);
  for (const h of hrefs) expect(h).toMatch(/^https:\/\/thawalife\.com\/p\/[a-z0-9-]+\.html$/);
});

test('sfondo foglie: canvas dietro al contenuto, disegna pixel, statico con reduced-motion', async ({ page, browser }) => {
  await page.goto('archivio/');
  await page.waitForTimeout(1200);
  const z = await page.locator('.leaf-bg').evaluate((c) => getComputedStyle(c).zIndex);
  expect(z).toBe('1');
  const ink = await page.locator('.leaf-bg').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n;
  });
  expect(ink).toBeGreaterThan(500);
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const p2 = await ctx.newPage();
  await p2.goto('archivio/');
  await p2.waitForTimeout(800);
  const a = await p2.locator('.leaf-bg').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await p2.waitForTimeout(700);
  expect(await p2.locator('.leaf-bg').evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(a);
  await ctx.close();
});

test('reduced-motion: nessun lenis, card statiche', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('');
  expect(await page.locator('[data-pcard]').first().evaluate((e) => (e as HTMLElement).style.transform)).toBe('');
  expect(await page.locator('html').evaluate((e) => e.classList.contains('lenis'))).toBe(false);
  await ctx.close();
});

test('nessun logo 3D: niente canvas WebGL né chunk three', async ({ page }) => {
  const reqs: string[] = [];
  page.on('request', (r) => reqs.push(r.url()));
  await page.goto('');
  await page.waitForTimeout(1500);
  await expect(page.locator('#logo-canvas')).toHaveCount(0);
  expect(reqs.filter((u) => /logo3d|three/i.test(u))).toEqual([]);
});

for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080]]) {
  test(`home ${w}px: titolo, logo, tagline e CTA dentro la zona sicura e centrati`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'it-IT' });
    const page = await ctx.newPage();
    await page.goto('');
    await page.waitForTimeout(2800); // font + fit + CTA in vetro
    const m = Math.min(Math.max(20, w * 0.05), 96);
    const box = async (sel: string) => (await page.locator(sel).first().boundingBox())!;
    const hh = page.locator('.hero-h');
    const range = await hh.evaluate((e) => { const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect(); return { l: b.left, r: b.right }; });
    expect(range.l).toBeGreaterThanOrEqual(m - 2);
    expect(range.r).toBeLessThanOrEqual(w - m + 2);
    expect(Math.abs(range.l - (w - range.r))).toBeLessThanOrEqual(6); // margini sx/dx uguali
    const logo = await box('.hero-logo svg');
    expect(Math.abs(logo.x + logo.width / 2 - w / 2)).toBeLessThanOrEqual(2);
    for (const sel of ['.hero-bar .lead', '.hero-bar .glass-slot', '.hero-bar .btn, .hero-bar .glass-container', '.hero-sub']) {
      const b = await box(sel);
      expect(b.x, sel).toBeGreaterThanOrEqual(m - 2);
      expect(b.x + b.width, sel).toBeLessThanOrEqual(w - m + 2);
    }
    await ctx.close();
  });
}
