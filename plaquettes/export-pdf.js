// ============================================================
// Export PDF — Cercle Horloger plaquettes
// Usage : node export-pdf.js [silver|gold|platinum|all]
// ============================================================

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const PAGE_W = 1316;
const PAGE_H = 924;

// Pré-cherche un binaire Chromium pré-installé (sinon Playwright en télécharge un)
function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    '/usr/bin/google-chrome',
  ].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}
const CHROMIUM = findChromium();

const COLLECTIONS = ['silver', 'gold', 'platinum'];

async function exportOne(name) {
  const htmlPath = path.resolve(__dirname, `${name}.html`);
  if (!fs.existsSync(htmlPath)) {
    console.log(`[skip] ${name}.html absent.`);
    return;
  }

  const outDir = path.resolve(__dirname, 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `plaquette_${name}_V2.pdf`);

  console.log(`[start] ${name} → ${outPath}`);

  const browser = await chromium.launch({
    executablePath: CHROMIUM,
  });
  const ctx = await browser.newContext({
    viewport: { width: PAGE_W, height: PAGE_H },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.evaluateHandle('document.fonts.ready');

  // Resize la mise en page pour que chaque .page tienne sur une page PDF
  await page.addStyleTag({
    content: `
      @page { size: ${PAGE_W}px ${PAGE_H}px; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; background: #0a0807 !important; }
      body > * { margin: 0 !important; }
      .page-shell { box-shadow: none !important; margin: 0 !important; }
      .page { margin: 0 !important; }
    `
  });

  await page.pdf({
    path: outPath,
    width: `${PAGE_W}px`,
    height: `${PAGE_H}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  await browser.close();
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[done]  ${name} — ${sizeKb} KB`);
}

(async () => {
  const arg = (process.argv[2] || 'all').toLowerCase();
  const targets = arg === 'all' ? COLLECTIONS : [arg];

  for (const t of targets) {
    if (!COLLECTIONS.includes(t)) {
      console.error(`Unknown collection: ${t}`);
      continue;
    }
    await exportOne(t);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
