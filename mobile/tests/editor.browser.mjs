import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';

const { outputFiles } = await build({
  entryPoints: ['src/editorHtml.ts'],
  bundle: true,
  format: 'esm',
  write: false,
});
const { editorHtml } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64')
);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
  for (const [width, height] of [
    [390, 844],
    [1024, 768],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const initialCode = '# 한글 </script> & "🌿"';
    await page.evaluate(() => {
      window.messages = [];
      window.ReactNativeWebView = { postMessage: (raw) => window.messages.push(JSON.parse(raw)) };
    });
    await page.setContent(
      editorHtml({ id: 1000, title: '테스트', lang: 'Python', code: initialCode }),
    );
    await page.waitForFunction(() => window.messages.some((m) => m.kind === 'ready'));
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('print(123)');
    const snap = await page.evaluate(() => {
      window.snapshot(3);
      return window.messages.at(-1);
    });
    assert.equal(snap.code, initialCode + '\nprint(123)');
    assert.equal(snap.ticket, 3);
    assert.ok(await page.evaluate(() => window.messages.some((m) => m.kind === 'change')));
    assert.deepEqual(errors, []);
    await page.close();
    console.log('CodeMirror input and snapshot passed at ' + width + ' × ' + height);
  }
} finally {
  await browser.close();
}
