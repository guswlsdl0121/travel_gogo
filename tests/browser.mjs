import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// Pass a local Playwright module path when it is installed outside this project.
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [width, height] of [[320, 640], [360, 780], [390, 844], [402, 874], [768, 1024], [844, 390], [1440, 1000]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript({ path: new URL('./fixtures/google-maps.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') });
    await page.route('**/config.local.js', (route) => route.fulfill({ contentType: 'text/javascript', body: 'window.TRIP_CONFIG = { googleMapsApiKey: "test-key" };' }));
    await page.goto('http://127.0.0.1:4173');
    await page.waitForSelector('.map-pin');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.day-tab').count(), 5);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.ok(await page.locator('.day-tabs').evaluate((node) => node.scrollWidth <= node.clientWidth));
    const mapBefore = await page.locator('#map').boundingBox();
    const zoomBefore = await page.evaluate(() => window.__maps.zoom);
    if (width <= 900 && height > 500) {
      const toggle = page.locator('#map-tools-toggle');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator('#map-tools-actions').isVisible(), false);
      await toggle.click();
      assert.equal(await page.locator('#map-tools-actions').isVisible(), true);
      await page.locator('#map-size-toggle').click();
      assert.ok((await page.locator('#map').boundingBox()).height > mapBefore.height);
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.click();
      await page.locator('#map-size-toggle').click();
      const mapPanel = await page.locator('.map-panel').boundingBox();
      const itinerary = await page.locator('.itinerary-panel').boundingBox();
      assert.ok(itinerary.y - (mapPanel.y + mapPanel.height) >= 7);
      assert.ok(await page.locator('.map-pin').first().evaluate((pin) => pin.getBoundingClientRect().width <= 29));
    }
    await page.locator('.course-options summary').click();
    const trigger = page.locator('.choice-control__trigger').first();
    await trigger.click();
    await page.locator('.choice-control__option.is-selected').first().click();
    assert.equal(await page.locator('.stop.is-active').count(), 1);
    const selectedZoom = width <= 900 ? Math.max(zoomBefore, 15) : zoomBefore;
    assert.equal(await page.evaluate(() => window.__maps.zoom), selectedZoom);
    assert.equal(await page.evaluate(() => Math.max(...window.__maps.markers.filter((marker) => marker.map).map((marker) => marker.zIndex))), 1000000);
    const requestsBefore = await page.evaluate(() => window.__maps.requests);
    const fitsBefore = await page.evaluate(() => window.__maps.fits);
    await trigger.click();
    await page.locator('.choice-control__option.is-selected').first().click();
    await page.waitForTimeout(60);
    assert.equal(await page.evaluate(() => window.__maps.requests), requestsBefore);
    assert.equal(await page.evaluate(() => window.__maps.fits), fitsBefore);
    await trigger.click();
    await page.locator('.choice-control__list:not([hidden]) .choice-control__option').nth(1).click();
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => window.__maps.fits), fitsBefore);
    assert.equal(await page.evaluate(() => window.__maps.zoom), selectedZoom);
    if (width <= 900) {
      assert.equal(await page.evaluate(() => window.__maps.infoOpen), false);
      const mapAfter = await page.locator('#map').boundingBox();
      assert.equal(mapAfter.y, mapBefore.y);
      assert.equal(mapAfter.height, mapBefore.height);
    }
    await page.locator('#map').click({ position: { x: 5, y: 60 } });
    assert.equal(await page.locator('.stop.is-active').count(), 0);
    assert.equal(await page.locator('.map-pin.is-active').count(), 0);
    await trigger.click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    for (let day = 1; day < 5; day++) {
      await page.locator('.day-tab').nth(day).click();
      assert.ok(await page.locator('.stop').count() > 0);
    }
    await page.locator('.day-tab').nth(1).click();
    await page.locator('.plan-tab').nth(1).click();
    assert.ok(await page.locator('[data-stop-id="02-07-1"]').count());
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}×${height}: layout, repeated selection, zoom, marker stacking, dismiss, keyboard, days, Plan B`);
    await page.close();
  }
} finally { await browser.close(); }
