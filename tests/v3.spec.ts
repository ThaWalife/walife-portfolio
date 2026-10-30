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
    for (const sel of ['.hero-bar .lead', '.hero-bar .btn', '.hero-sub']) {
      const b = await box(sel);
      expect(b.x, sel).toBeGreaterThanOrEqual(m - 2);
      expect(b.x + b.width, sel).toBeLessThanOrEqual(w - m + 2);
    }
    await ctx.close();
  });
}

test('footer stile tide: 4 colonne, guide tratteggiate, incisione caricata, colori solo brand', async ({ page }) => {
  await page.goto('archivio/');
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.site-footer .fcol')).toHaveCount(4);
  await expect(page.locator('.site-footer .foot-lines span')).toHaveCount(4);
  expect(await page.locator('.guides span').first().evaluate((e) => getComputedStyle(e).borderLeftStyle)).toBe('dashed');
  await expect.poll(() => page.locator('.site-footer .engr img').first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator('.site-footer').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(13, 158, 91)');
  const links = await page.locator('.site-footer a').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).textContent));
  expect(links).toEqual(expect.arrayContaining(['Privacy e condizioni', 'Discord', 'Bluesky']));
});

test('stile tide esteso: prato in hero, linee tratteggiate tra sezioni, card con bordo tratteggiato', async ({ page }) => {
  await page.goto('');
  await expect.poll(() => page.locator('.hero-field img').first().evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator('.hero-field').evaluate((e) => getComputedStyle(e).zIndex)).toBe('5');
  expect(await page.locator('.about').evaluate((e) => getComputedStyle(e, '::before').borderTopStyle)).toBe('dashed');
  expect(await page.locator('.pcard').first().evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
  await page.goto('archivio/');
  expect(await page.locator('.card').first().evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
});

test('prato sui bordi delle sezioni verdi: home (servizi e contatti) e chi sono', async ({ page }) => {
  await page.goto('');
  const loaded = async (sel: string) => page.locator(sel + ' img').evaluateAll((els) => els.map((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  expect(await page.locator('.field-top').count()).toBe(2);
  expect((await loaded('.field-top')).every(Boolean)).toBe(true);
  expect(await page.locator('#services .field-top').evaluate((e) => getComputedStyle(e).bottom)).not.toBe('auto');
  await page.goto('chi-sono/');
  await expect(page.locator('.field-top')).toHaveCount(1);
});

for (const [w, h] of [[1440, 900], [1280, 640], [1920, 1080], [1024, 768], [2560, 1080]]) {
  test(`logo hero ${w}x${h}: centrato, sotto la barra, senza coprire testi o CTA`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'it-IT' });
    const page = await ctx.newPage();
    await page.goto('');
    await page.waitForTimeout(1500);
    const r = async (s: string) => (await page.locator(s).first().boundingBox())!;
    const logo = await r('.hero-logo svg');
    expect(Math.abs(logo.x + logo.width / 2 - w / 2)).toBeLessThanOrEqual(1);
    const bar = await r('.pillbar .center');
    expect(logo.y).toBeGreaterThanOrEqual(bar.y + bar.height + 8);
    const hit = (a: any, b: any) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const text = async (s: string) => page.locator(s).first().evaluate((e) => { const g = document.createRange(); g.selectNodeContents(e); const b = g.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
    for (const s of ['.hero-sub', '.hero-bar .lead']) expect(hit(logo, await text(s)), s).toBe(false);
    expect(hit(logo, await r('.hero-bar .btn')), '.btn').toBe(false);
    await expect(page.locator('.glass-container')).toHaveCount(0);
    await ctx.close();
  });
}

test('prato animato: gli strati ondeggiano (non quello della collinetta) e con reduced-motion restano fermi', async ({ page, browser }) => {
  await page.goto('');
  await page.waitForTimeout(500);
  const names = await page.locator('.hero-field img').evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));
  expect(names).toEqual(['none', 'sway', 'sway']);
  const tf = async () => page.locator('.hero-field .l3').evaluate((e) => getComputedStyle(e).transform);
  const a = await tf();
  await page.waitForTimeout(1500);
  expect(await tf()).not.toBe(a); // si muove davvero
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const p2 = await ctx.newPage();
  await p2.goto('');
  expect(await p2.locator('.hero-field .l3').evaluate((e) => getComputedStyle(e).animationName)).toBe('none');
  await ctx.close();
});

test('home: logo brand bianco solo in home, CTA hero in vetro come le pillole, logo senza tratteggio interno', async ({ page }) => {
  await page.goto('');
  expect(await page.locator('.brand img').getAttribute('src')).toContain('horizontal-white');
  await page.goto('archivio/');
  expect(await page.locator('.brand img').getAttribute('src')).toContain('horizontal-green');
  await page.goto('');
  const a = await page.locator('.hero .btn').evaluate((e) => { const s = getComputedStyle(e); return { r: s.borderRadius, bf: s.backdropFilter, clip: s.clipPath }; });
  const b = await page.locator('.pillbar .pill').first().evaluate((e) => { const s = getComputedStyle(e); return { bf: s.backdropFilter }; });
  expect(a.clip).toBe('none');
  expect(a.bf).toBe(b.bf);
  expect(parseFloat(a.r)).toBeGreaterThan(20);
  await expect(page.locator('.hero-logo .shade')).toHaveCount(0);
  // il logo emerge dalla collina: il suo centro sta alla cima della collina (metà superiore visibile)
  const lg = (await page.locator('.hero-logo').boundingBox())!;
  const fld = (await page.locator('.hero-field').boundingBox())!;
  // la parte bassa del logo sta dietro il prato (il fondo scende dentro la fascia) e la cima resta sotto la barra in alto
  expect(lg.y + lg.height).toBeGreaterThan(fld.y + fld.height * 0.3);
  expect(lg.y).toBeGreaterThan(80);
});
