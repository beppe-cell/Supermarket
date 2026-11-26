// Smoke test M0: carica la build, verifica rendering, HUD e assenza di errori. Uso: node tests/e2e/smoke.mjs <url>
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const url = process.argv[2] ?? "http://localhost:4173/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });
let failed = false;

for (const [name, ctxOpts] of [["desktop", { viewport: { width: 1280, height: 720 } }], ["mobile", { ...devices["Pixel 7"] }]]) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url);
  await page.waitForFunction(() => document.body.innerText.includes("fps"), null, { timeout: 90000 }).catch(() => {});
  const hud = (await page.evaluate(() => document.body.innerText)).trim();
  const px = await page.evaluate(() => { const c = document.getElementById("game"); return c ? [c.width, c.height] : null; });
  await page.screenshot({ path: `tests/e2e/out-${name}.png` });
  const ok = /fps/.test(hud) && errors.length === 0;
  console.log(`[${name}] ${ok ? "OK" : "FAIL"} canvas=${px} hud="${hud.replace(/\n/g, " ")}" errors=${JSON.stringify(errors)}`);
  failed ||= !ok;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
