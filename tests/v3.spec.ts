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

test('shelf progetti: il track scorre con lo scroll e la slide centrale è in focus', async ({ page }) => {
  await page.goto('');
  await page.waitForTimeout(1200);
  const geo = await page.evaluate(() => { const s = document.querySelector('[data-pin]') as HTMLElement; return { top: s.getBoundingClientRect().top + scrollY, h: s.offsetHeight, vh: innerHeight }; });
  const xs: number[] = [];
  for (const p of [0.05, 0.35, 0.65]) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), geo.top + (geo.h - geo.vh) * p);
    await page.waitForTimeout(500);
    xs.push(await page.locator('[data-track]').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41));
  }
  expect(xs[1]).toBeLessThan(xs[0]);
  expect(xs[2]).toBeLessThan(xs[1]);
  const sc = await page.locator('[data-slide]').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).style.getPropertyValue('--sc'))));
  expect(Math.max(...sc) - Math.min(...sc)).toBeGreaterThan(0.04);
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

test('reduced-motion: shelf impilata e nessun lenis', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('');
  await expect(page.locator('[data-pin]')).toHaveClass(/no-pin/);
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
