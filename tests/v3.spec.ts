import { readFileSync } from 'node:fs';
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

test('card progetto: link alle pagine dettaglio interne (IT e EN)', async ({ page }) => {
  await page.goto('archivio/');
  const hrefs = await page.locator('.card').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
  expect(hrefs).toHaveLength(11);
  for (const h of hrefs) expect(h).toMatch(/\/walife-portfolio\/progetti\/[a-z0-9-]+\/$/);
  await page.addInitScript(() => localStorage.setItem('wl-lang', 'en'));
  await page.goto('en/archive/');
  for (const h of await page.locator('.card').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href))) expect(h).toMatch(/\/walife-portfolio\/en\/projects\/[a-z0-9-]+\/$/);
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
  expect(await page.locator('.pcard').first().evaluate((e) => getComputedStyle(e).backdropFilter)).toContain('blur(22px)');
  await page.goto('archivio/');
  expect(await page.locator('.card').first().evaluate((e) => getComputedStyle(e).backdropFilter)).toContain('blur(22px)');
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
  const shown = () => page.locator('.brand img:visible').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src')));
  expect((await shown())[0]).toContain('horizontal-white');
  await page.evaluate(() => scrollTo({ top: document.querySelector('#about')!.getBoundingClientRect().top + scrollY - 200, behavior: 'instant' }));
  await page.waitForTimeout(500);
  expect((await shown())[0]).toContain('horizontal-green'); // sopra la sezione bianca torna verde
  await page.goto('archivio/');
  expect(await shown()).toHaveLength(1);
  expect((await shown())[0]).toContain('horizontal-green');
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

for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080], [2560, 1080], [390, 844]]) {
  test(`footer ${w}px: testo centrato nelle celle della griglia, nessun simbolo bianco`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'it-IT' });
    const page = await ctx.newPage();
    await page.goto('archivio/');
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const cells = await page.locator('.site-footer .foot-lines span:visible').evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right }; }));
    const cols = await page.locator('.site-footer .fcol').evaluateAll((els) => els.map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right }; }));
    const n = w < 900 ? 2 : 4;
    expect(cells).toHaveLength(n);
    for (let i = 0; i < cols.length; i++) {
      const cell = cells[i % n];
      expect(Math.abs((cols[i].l + cols[i].r) / 2 - (cell.l + cell.r) / 2), `colonna ${i}`).toBeLessThanOrEqual(2);
    }
    const imgs = await page.locator('.site-footer .engr img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));
    expect(imgs).toHaveLength(3);
    await ctx.close();
  });
}

test('tutti i bottoni (.btn, .chip) hanno lo stile delle pillole dell\'header', async ({ page }) => {
  const style = (sel: string) => page.locator(sel).first().evaluate((e) => { const s = getComputedStyle(e); return { fs: s.fontSize, fw: s.fontWeight, tt: s.textTransform, ls: s.letterSpacing, ff: s.fontFamily, bf: s.backdropFilter, clip: s.clipPath, r: parseFloat(s.borderRadius) > 20 }; });
  let seen = 0;
  for (const path of ['', 'chi-sono/', 'archivio/', 'en/']) {
    await page.goto(path);
    const ref = { ...(await style('.pill .cta')), bf: await page.locator('.pillbar .pill').first().evaluate((e) => getComputedStyle(e).backdropFilter) };
    for (const sel of ['.btn', '.chip']) {
      const n = await page.locator(sel).count();
      for (let i = 0; i < n; i++) {
        const s = await page.locator(sel).nth(i).evaluate((e) => { const c = getComputedStyle(e); return { fs: c.fontSize, fw: c.fontWeight, tt: c.textTransform, ls: c.letterSpacing, ff: c.fontFamily, bf: c.backdropFilter, clip: c.clipPath, r: parseFloat(c.borderRadius) > 20 }; });
        expect(s, `${path} ${sel}[${i}]`).toEqual(ref);
        seen++;
      }
    }
  }
  expect(seen).toBeGreaterThan(8);
});

test('nessuna citazione di "Marini" nelle pagine', async ({ page }) => {
  for (const path of ['', 'archivio/', 'chi-sono/', 'contatti/', 'privacy/', 'en/', 'en/archive/', 'en/about/', 'en/contact/', 'en/privacy/']) {
    await page.goto(path);
    const html = await page.content();
    expect(html.includes('Marini'), path).toBe(false);
  }
});

test('illustrazione animata anche nelle singole parti: stile interno, farfalle, petali; fermo con reduced-motion', async ({ page, request }) => {
  await page.goto('');
  const srcs = await page.locator('.hero-field img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));
  const top = await (await request.get(srcs[2])).text();
  expect(top).toContain('@keyframes swf');
  expect(top).toContain('@keyframes flyx');
  expect((top.match(/class="fw"/g) ?? []).length).toBeGreaterThan(10);
  expect((top.match(/class="tr"/g) ?? []).length).toBeGreaterThan(2);
  expect((top.match(/class="fly"/g) ?? []).length).toBe(3);
  expect(top).toContain('@keyframes gust');   // vento: i livelli si piegano a raffiche
  expect((top.match(/class="ws"/g) ?? []).length).toBeGreaterThan(3); // tratti di vento
  expect(top).toContain('class="wob"');         // le api ondeggiano mentre volano
  expect(top).toContain('prefers-reduced-motion');
  // il livello del puntatore: parallasse sui tre strati
  await page.mouse.move(1300, 400);
  await page.waitForTimeout(1500);
  const tr = await page.locator('.hero-field .l3').evaluate((e) => getComputedStyle(e).translate);
  expect(tr).not.toBe('none');
});

test('chi sono senza i tre badge e home senza la sezione "superficie"', async ({ page }) => {
  await page.goto('chi-sono/');
  await expect(page.locator('.facts')).toHaveCount(0);
  const items = await page.locator('main li, main button, main .btn').allInnerTexts(); // la biografia resta; spariscono solo i badge
  for (const w of ['21 anni', 'Italia', 'Tecnico grafico']) expect(items.map((x) => x.trim()).includes(w), w).toBe(false);
  await page.goto('');
  await expect(page.locator('#archive-cta')).toHaveCount(0);
  expect((await page.locator('main').innerText()).includes('solo la superficie')).toBe(false);
  await page.goto('en/');
  expect((await page.locator('main').innerText()).includes('only the surface')).toBe(false);
});

test('home: il pattern sta prima della sezione Progetti (non dopo)', async ({ page }) => {
  await page.goto('');
  const y = async (s: string) => (await page.locator(s).first().boundingBox())!.y + (await page.evaluate(() => scrollY));
  expect(await y('.pat')).toBeLessThan(await y('#work'));
  expect(await y('#services')).toBeLessThan(await y('.pat'));
  expect(await y('#work')).toBeLessThan(await y('#contact'));
  // tra Progetti e Contatti non c'è più il pattern
  const between = await page.evaluate(() => { const w = document.querySelector('#work')!; const c = document.querySelector('#contact')!; let n = w.nextElementSibling; while (n && n !== c) { if (n.querySelector('.pat') || n.classList.contains('pat')) return true; n = n.nextElementSibling; } return false; });
  expect(between).toBe(false);
});

for (const [w, h] of [[1440, 900], [1280, 720], [1920, 1080]]) {
  test(`chi sono ${w}px: box e testi allineati alle celle della griglia di sfondo`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'it-IT' });
    const page = await ctx.newPage();
    await page.goto('chi-sono/');
    await page.waitForTimeout(600);
    const cells = await page.locator('.guides span').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
    expect(cells).toHaveLength(4);
    const near = (x: number, arr: number[]) => Math.min(...arr.map((a) => Math.abs(a - x)));
    const lefts = (sel: string) => page.locator(sel).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().left * 10) / 10));
    // strumenti: ogni box inizia su una linea della griglia
    for (const x of await lefts('.tools-grid li')) expect(near(x, cells), `tool ${x}`).toBeLessThanOrEqual(1.5);
    // formazione/esperienze: la colonna destra parte dalla 2ª linea; anno e testo (con 20px di respiro interno) partono dalla 2ª e 3ª
    for (const x of await lefts('.two-col > .tl')) expect(Math.abs(x - cells[1])).toBeLessThanOrEqual(1.5);
    const years = await lefts('.tl .y');
    for (const x of years) expect(Math.abs(x - cells[1])).toBeLessThanOrEqual(2);
    const body = await lefts('.tl li > div');
    for (const x of body) expect(Math.abs(x - cells[2]), `testo ${x}`).toBeLessThanOrEqual(2);
    await ctx.close();
  });
}

const SLUGS = JSON.parse(readFileSync(new URL('../src/content/site.json', import.meta.url), 'utf8')).PROJECTS.map((p: any) => p.slug) as string[];
for (const slug of SLUGS) {
  for (const [lang, path] of [['it', `progetti/${slug}/`], ['en', `en/projects/${slug}/`]] as const) {
    test(`pagina dettaglio ${lang}/${slug}: carica, immagini ok, nessuna richiesta esterna prima del click`, async ({ page }) => {
      const errs: string[] = [];
      const ext: string[] = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', (e) => errs.push(String(e)));
      page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost') && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
      await page.addInitScript((v) => localStorage.setItem('wl-lang', v), lang);
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('link[rel=alternate][hreflang=it]')).toHaveAttribute('href', new RegExp(`/progetti/${slug}/$`));
      await expect(page.locator('link[rel=alternate][hreflang=en]')).toHaveAttribute('href', new RegExp(`/en/projects/${slug}/$`));
      // scorre tutta la pagina per far caricare le immagini lazy, poi verifica che nessuna sia rotta
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
      await page.waitForTimeout(600);
      const broken = await page.locator('main img:not([data-dlg-img])').evaluateAll((els) => els.filter((e) => { const i = e as HTMLImageElement; return i.complete && i.naturalWidth === 0; }).map((e) => (e as HTMLImageElement).src));
      expect(broken).toEqual([]);
      expect(ext, 'richieste esterne').toEqual([]);
      expect(errs).toEqual([]);
      expect(await page.locator('.pj-title').innerText()).toBeTruthy();
    });
  }
}

test('dettaglio: lightbox, YouTube solo al click, libro sfogliabile', async ({ page }) => {
  await page.goto('progetti/club-italia-flyers/');
  await page.locator('.pj-zoom').first().click();
  await expect(page.locator('dialog[open] img')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('dialog img').getAttribute('src')).toContain('02.webp');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.goto('progetti/dragone7-identity/');
  expect(await page.locator('iframe').count()).toBe(0);
  await page.locator('[data-yt]').first().click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/"]')).toHaveCount(1);
  await page.goto('progetti/elaborato-conclusivo-del-percorso-scolastico/');
  const c0 = await page.locator('[data-book-count]').innerText();
  await page.locator('[data-book-next]').click();
  await expect.poll(() => page.locator('[data-book-count]').innerText()).not.toBe(c0);
});

test('archivio: miniature in 4:3', async ({ page }) => {
  await page.goto('archivio/');
  const r = await page.locator('.card .img').first().evaluate((e) => { const b = e.getBoundingClientRect(); return b.width / b.height; });
  expect(Math.abs(r - 4 / 3)).toBeLessThan(0.02);
});

test('lightbox con lente: click zoom 2,5x, rotella fino a 6x, pan limitato, bottoni, tasti, reset al cambio immagine', async ({ page }) => {
  await page.goto('progetti/club-italia-flyers/');
  await page.locator('.pj-zoom').first().click();
  const img = page.locator('[data-dlg-img]');
  const scale = async () => img.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
  expect(Math.abs((await scale()) - 1)).toBeLessThan(0.01);
  const box = (await page.locator('[data-stage]').boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  expect(await scale()).toBeCloseTo(2.5, 1);
  await expect(page.locator('[data-zoom-level]')).toHaveText('250%');
  await page.mouse.click(cx, cy);
  expect(Math.abs((await scale()) - 1)).toBeLessThan(0.01);
  await page.mouse.move(cx, cy);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -300);
  await page.waitForTimeout(200);
  expect(await scale()).toBeCloseTo(6, 1);
  const t0 = await img.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).e);
  await page.mouse.down();
  await page.mouse.move(cx + 120, cy + 60, { steps: 5 });
  await page.mouse.up();
  const t1 = await img.evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).e);
  expect(t1).not.toBe(t0);
  const lim = await img.evaluate((e) => ((e as HTMLElement).offsetWidth * 6 - (e.parentElement as HTMLElement).clientWidth) / 2);
  expect(Math.abs(t1)).toBeLessThanOrEqual(lim + 1);
  await page.locator('[data-zoom-reset]').click();
  expect(Math.abs((await scale()) - 1)).toBeLessThan(0.01);
  await page.locator('[data-zoom-in]').click();
  expect(await scale()).toBeGreaterThan(1.5);
  await page.keyboard.press('ArrowRight');
  expect(Math.abs((await scale()) - 1)).toBeLessThan(0.01);
  await page.keyboard.press('+');
  expect(await scale()).toBeGreaterThan(1.3);
  await page.keyboard.press('0');
  expect(Math.abs((await scale()) - 1)).toBeLessThan(0.01);
  await page.keyboard.press('Escape');
});

test('YouTube: anteprima locale caricata e pulsante play centrato; nessuna richiesta esterna prima del click', async ({ page }) => {
  const ext: string[] = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith('http://localhost') && !u.startsWith('data:')) ext.push(u); });
  for (const slug of ['dragone7-identity', 'edits']) {
    await page.goto(`progetti/${slug}/`);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
    await page.waitForTimeout(500);
    const boxes = await page.locator('.pj-yt').evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect(); const b = e.querySelector('.pj-play')!.getBoundingClientRect(); const im = e.querySelector('img') as HTMLImageElement;
      return { dx: Math.abs(b.left + b.width / 2 - (r.left + r.width / 2)), dy: Math.abs(b.top + b.height / 2 - (r.top + r.height / 2)), nw: im.naturalWidth };
    }));
    expect(boxes.length).toBeGreaterThan(0);
    for (const b of boxes) { expect(b.dx).toBeLessThanOrEqual(1.5); expect(b.dy).toBeLessThanOrEqual(1.5); expect(b.nw).toBeGreaterThan(300); }
  }
  expect(ext).toEqual([]);
});

test('chi sono: foto nelle colonne 3-4 e indicatori di livello (3 trattini per ognuno dei 10 strumenti)', async ({ page }) => {
  await page.goto('chi-sono/');
  await expect.poll(() => page.locator('.about-photo img').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(300);
  const cells = await page.locator('.guides span').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().left));
  const fx = (await page.locator('.about-photo').boundingBox())!.x;
  expect(Math.abs(fx - cells[2])).toBeLessThanOrEqual(2);
  await expect(page.locator('.tools-grid li .lvl')).toHaveCount(10);
  const lit = await page.locator('.tools-grid li .lvl').evaluateAll((els) => els.map((e) => [...e.querySelectorAll('i')].filter((i) => getComputedStyle(i).backgroundColor === 'rgb(13, 158, 91)').length));
  expect(lit.filter((n) => n === 3)).toHaveLength(4); // avanzato: 4 strumenti
  expect(lit.filter((n) => n === 2)).toHaveLength(6); // intermedio: 6 strumenti
});

test('libro: due pagine affiancate, avanza di due, e si apre nella lente', async ({ page }) => {
  await page.goto('progetti/elaborato-conclusivo-del-percorso-scolastico/');
  const visible = async () => page.locator('.pj-book-track li').evaluateAll((els) => { const t = els[0].parentElement!.getBoundingClientRect(); return els.filter((e) => { const r = e.getBoundingClientRect(); return r.left >= t.left - 2 && r.right <= t.right + 2; }).length; });
  await expect(page.locator('[data-book-count]')).toHaveText('1 / 62'); // copertina da sola
  expect(await visible()).toBe(2);   // segnaposto + copertina
  await page.locator('[data-book-next]').click();
  await expect(page.locator('[data-book-count]')).toHaveText('2–3 / 62'); // due pagine affiancate
  await page.waitForTimeout(1200);
  expect(await visible()).toBe(2);
  await page.locator('[data-book-next]').click();
  await expect(page.locator('[data-book-count]')).toHaveText('4–5 / 62');
  await page.locator('[data-book-prev]').click();
  await page.locator('[data-book-prev]').click();
  await expect(page.locator('[data-book-count]')).toHaveText('1 / 62');
  await page.locator('.pj-book-track .pj-zoom').first().click();
  await expect(page.locator('dialog[open] [data-dlg-img]')).toBeVisible();
});

test('foto profilo incorniciata: vetro, due anelli tratteggiati animati, 4 segni d\'angolo, inclinazione col mouse', async ({ page }) => {
  await page.goto('chi-sono/');
  await expect(page.locator('.ph-ring')).toHaveCount(2);
  await expect(page.locator('.ph-c')).toHaveCount(4);
  expect(await page.locator('.ph-glass').evaluate((e) => getComputedStyle(e).backdropFilter)).toContain('blur');
  expect(await page.locator('.ph-ring.r1').evaluate((e) => getComputedStyle(e).animationName)).toBe('phA');
  const box = (await page.locator('.about-photo').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.2);
  await page.waitForTimeout(600);
  const m = await page.locator('.ph-glass').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m13);
  expect(m).not.toBe(0);
});

test('transizione di pagina: foglio di vetro + prato, veloce (<1,6 s), la nuova pagina nasce coperta e poi si scopre', async ({ page }) => {
  await page.goto('archivio/');
  await page.waitForTimeout(800);
  // struttura: vetro sfocato, bordo con l'illustrazione, simbolo
  await expect(page.locator('.wipe .wp-glass')).toHaveCount(1);
  expect(await page.locator('.wp-glass').evaluate((e) => getComputedStyle(e).backdropFilter)).toContain('blur');
  await expect(page.locator('.wp-edge')).toHaveCount(1);
  await expect(page.locator('.wp-badge svg')).toHaveCount(1);
  expect(await page.locator('.wipe').evaluate((e) => getComputedStyle(e).visibility)).toBe('hidden');
  const t0 = Date.now();
  const seen: boolean[] = [];
  page.on('framenavigated', () => {});
  await page.locator('.pill a', { hasText: 'Chi sono' }).first().click();
  await page.waitForTimeout(120);
  seen.push((await page.locator('.wipe').evaluate((e) => getComputedStyle(e).visibility)) === 'visible'); // in uscita è visibile
  await page.waitForURL(/chi-sono\/$/);
  const covered = await page.evaluate(() => document.documentElement.classList.contains('wl-in') || getComputedStyle(document.querySelector('.wipe')!).visibility === 'visible');
  seen.push(covered);                                            // la nuova pagina parte coperta
  await expect.poll(() => page.locator('.wipe').evaluate((e) => getComputedStyle(e).visibility), { timeout: 3000 }).toBe('hidden');
  expect(Date.now() - t0).toBeLessThan(1600);
  expect(seen).toEqual([true, true]);
  expect(await page.evaluate(() => document.documentElement.classList.contains('wl-in'))).toBe(false);
});

test('transizione: nessuna con reduced-motion', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto('archivio/');
  expect(await p.locator('.wipe').evaluate((e) => getComputedStyle(e).display)).toBe('none');
  const t0 = Date.now();
  await p.locator('.pill a', { hasText: 'Chi sono' }).first().click();
  await p.waitForURL(/chi-sono\/$/);
  expect(Date.now() - t0).toBeLessThan(900);
  await ctx.close();
});

test('home: progetti in evidenza = Tower, Octopus, Club Italia, elaborato conclusivo (in quest\'ordine); edits: video fissato sostituito', async ({ page }) => {
  await page.goto('');
  const hrefs = await page.locator('[data-pcard]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')));
  expect(hrefs.map((h) => h!.split('/').filter(Boolean).pop())).toEqual(['the-tower-official-merch-design', 'octopus-brand-collab', 'club-italia-flyers', 'elaborato-conclusivo-del-percorso-scolastico']);
  await page.goto('progetti/edits/');
  const ids = await page.locator('[data-yt]').evaluateAll((els) => els.map((e) => e.getAttribute('data-yt')));
  expect(ids.slice(0, 3)).toEqual(['pbYsQ5UtWS4', 'ISTYdVXpEP8', 'U9tj412zsnU']);   // i tre fissati
  expect(ids).toContain('5jSXj0SQZP0');                                              // il vecchio è tra gli altri edit
  expect(ids.indexOf('5jSXj0SQZP0')).toBeGreaterThan(2);
  const html = await page.content();
  expect(html.includes('David Martinez')).toBe(true);
});

const ALL_PATHS = ['', 'archivio/', 'chi-sono/', 'contatti/', 'privacy/', 'en/', 'en/archive/', 'en/about/', 'en/contact/', ...SLUGS.map((s) => `progetti/${s}/`)];
for (const w of [360, 412]) {
  test(`telefono ${w}px: nessun overflow orizzontale su tutte le pagine (anche dopo lo scroll)`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true, locale: 'it-IT' });
    const page = await ctx.newPage();
    for (const path of ALL_PATHS) {
      await page.goto(path);
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); } });
      await page.waitForTimeout(250);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(o, `${path} @${w}`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
}

for (const [slug, n] of [['club-italia-flyers', 0], ['club-italia-flyers', 13], ['the-tower-official-merch-design', 0]] as const) {
  test(`lightbox ${slug}#${n}: l'immagine intera entra nel riquadro (proporzioni corrette, nessun taglio)`, async ({ page }) => {
    await page.goto(`progetti/${slug}/`);
    await page.locator('.pj-zoom').nth(n).scrollIntoViewIfNeeded();
    await page.locator('.pj-zoom').nth(n).click();
    await page.waitForTimeout(600);
    const r = await page.evaluate(() => { const i = document.querySelector('[data-dlg-img]') as HTMLImageElement; const s = document.querySelector('[data-stage]')!.getBoundingClientRect(); const b = i.getBoundingClientRect(); return { ar: b.width / b.height, nat: i.naturalWidth / i.naturalHeight, inside: b.top >= s.top - 1 && b.bottom <= s.bottom + 1 && b.left >= s.left - 1 && b.right <= s.right + 1 }; });
    expect(Math.abs(r.ar - r.nat)).toBeLessThan(0.02);
    expect(r.inside).toBe(true);
  });
}

test('Edits: video secondari in 2 colonne grandi (>= 560px)', async ({ page }) => {
  await page.goto('progetti/edits/');
  await page.waitForTimeout(800);
  const w = await page.locator('.pj-ytgrid:not(.vert) .pj-yt').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(w.length).toBeGreaterThan(5);
  await expect(page.locator('.pj-ytgrid.vert .pj-yt')).toHaveCount(1); // il solo edit verticale sta in una riga a parte
  for (const x of w) expect(x).toBeGreaterThanOrEqual(560);
});

test('Octopus: player artwork (frecce, anteprime, contatore, tastiera) e anteprime Instagram al posto dei bottoni', async ({ page }) => {
  await page.goto('progetti/octopus-brand-collab/');
  const pl = page.locator('[data-player]');
  await pl.scrollIntoViewIfNeeded();
  await expect(pl.locator('[data-pl-count]')).toHaveText('1 / 5');
  await pl.locator('[data-pl-next]').click();
  await expect(pl.locator('[data-pl-count]')).toHaveText('2 / 5');
  await pl.locator('[data-pl-go="4"]').click();
  await expect(pl.locator('[data-pl-count]')).toHaveText('5 / 5');
  await pl.locator('[data-pl-next]').click();
  await expect(pl.locator('[data-pl-count]')).toHaveText('1 / 5');   // giro continuo
  expect(await pl.locator('.pj-pl-slide:not([hidden])').count()).toBe(1);
  // l'immagine sta tutta dentro il riquadro
  const inside = await pl.evaluate((e) => { const s = e.querySelector('.pj-pl-stage')!.getBoundingClientRect(); const i = e.querySelector('.pj-pl-slide:not([hidden]) img')!.getBoundingClientRect(); return i.top >= s.top - 1 && i.bottom <= s.bottom + 1; });
  expect(inside).toBe(true);
  // Instagram: 4 anteprime locali e nessun bottone testuale puro
  const igs = page.locator('.pj-igs .pj-ig-card img');
  await expect(igs).toHaveCount(4);
  await page.locator('.pj-igs').first().scrollIntoViewIfNeeded();
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
  await page.waitForTimeout(500);
  for (const n of await igs.evaluateAll((els) => els.map((e) => (e as HTMLImageElement).naturalWidth))) expect(n).toBeGreaterThan(500);
  // video verticali Summer Sales grandi
  const vw = await page.locator('.pj-ytgrid.vert .pj-yt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  for (const x of vw) expect(x).toBeGreaterThanOrEqual(340); // 88vh*9/16 su 1280x720
});

for (const slug of ['cloud-paradise', 'visual-experiments-2']) {
  test(`${slug}: risorse in righe ordinate (stessa altezza in riga, ordine di lettura, nessuna fuori colonna)`, async ({ page }) => {
    await page.goto(`progetti/${slug}/`);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
    await page.waitForTimeout(600);
    const rows = await page.locator('.pj-row').evaluateAll((els) => els.map((r) => { const b = [...r.querySelectorAll('img')].map((i) => i.getBoundingClientRect()); return { n: b.length, tops: b.map((x) => Math.round(x.top)), hs: b.map((x) => Math.round(x.height)), l: Math.round(b[0].left), r: Math.round(b.at(-1)!.right), srcs: [...r.querySelectorAll('img')].map((i) => (i as HTMLImageElement).src.split('/').pop()) }; }));
    const body = await page.locator('.pj-body').evaluate((e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right) }; });
    for (const r of rows) {
      expect(new Set(r.tops).size).toBe(1);                                  // stessa riga
      expect(Math.max(...r.hs) - Math.min(...r.hs)).toBeLessThanOrEqual(2); // stessa altezza
      expect(r.l).toBeGreaterThanOrEqual(body.l - 1); expect(r.r).toBeLessThanOrEqual(body.r + 1);
    }
    const order = rows.flatMap((r) => r.srcs);
    expect(order).toEqual([...order].sort());                              // 01, 02, 03… in ordine
    const ys = rows.map((r) => r.tops[0]);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });
}
