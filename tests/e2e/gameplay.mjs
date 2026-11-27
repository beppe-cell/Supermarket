// Test M1: movimento, collisioni e interazione. Uso: node tests/e2e/gameplay.mjs <url>
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const url = (process.argv[2] ?? "http://localhost:4173/") + "?debug=1&quality=low";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url);
await page.waitForFunction(() => window.__dbg, null, { timeout: 30000 });
const results = [];
const check = (name, ok, info = "") => { results.push(ok); console.log(`${ok ? "OK  " : "FAIL"} ${name} ${info}`); };

const p0 = await page.evaluate(() => window.__dbg.pos());
await page.keyboard.down("KeyW");
await page.waitForFunction((z) => window.__dbg.pos()[2] - z > 0.8, p0[2], { timeout: 40000 }).catch(() => {});
await page.keyboard.up("KeyW");
const p1 = await page.evaluate(() => window.__dbg.pos());
check("cammina avanti (+z)", p1[2] - p0[2] > 0.8, `z ${p0[2].toFixed(1)} -> ${p1[2].toFixed(1)}`);

// collisione col muro sud: teletrasporto vicino al muro e spinta indietro
await page.evaluate(() => window.__dbg.teleport(-5.75, -22.8));
await page.waitForTimeout(300);
await page.keyboard.down("KeyS"); await page.waitForTimeout(2500); await page.keyboard.up("KeyS");
const p2 = await page.evaluate(() => window.__dbg.pos());
check("muro sud blocca", p2[2] > -24, `z=${p2[2].toFixed(2)}`);

// corsia tra due blocchi di scaffali (x=-13.2): si deve poter percorrere in lunghezza
await page.evaluate(() => { window.__dbg.teleport(-13.2, -5.5); window.__dbg.look(0, 0); });
await page.waitForTimeout(300);
const a0 = await page.evaluate(() => window.__dbg.pos());
await page.keyboard.down("KeyW");
await page.waitForFunction((z) => window.__dbg.pos()[2] - z > 1.0, a0[2], { timeout: 40000 }).catch(() => {});
await page.keyboard.up("KeyW");
const a1 = await page.evaluate(() => window.__dbg.pos());
check("percorre la corsia scaffali", a1[2] - a0[2] > 1.0 && Math.abs(a1[0] + 13.2) < 0.5, `z ${a0[2].toFixed(1)} -> ${a1[2].toFixed(1)}, x ${a1[0].toFixed(2)}`);

// pickup: vicino alla batteria, guardando avanti (+z) -> pickup a (3,1.2,-4)
await page.evaluate(() => window.__dbg.teleport(-13.2, -3.5));
await page.evaluate(() => window.__dbg.look(0, 0));
await page.waitForTimeout(500);
await page.waitForTimeout(500);
const inv = await page.evaluate(() => window.__dbg.inventory());
check("raccoglie oggetto passandoci vicino", inv.includes("gauze"), JSON.stringify(inv));
// carrello colpito da un proiettile: si deve muovere
await page.evaluate(() => { window.__dbg.teleport(4.4, -4.9); window.__dbg.look(0, Math.atan2(1.65 - 0.5, 3.0)); });
await page.waitForTimeout(400);
const c0 = (await page.evaluate(() => window.__dbg.carts())).find((c) => c[0] === "SM_Trolley" && Math.abs(c[1] - 4.4) < 0.3);
await page.evaluate(() => window.__dbg.setFire(true)); await page.waitForTimeout(300); await page.evaluate(() => window.__dbg.setFire(false));
await page.waitForFunction((z0) => window.__dbg.carts().some((c) => c[0] === "SM_Trolley" && c[2] - z0 > 0.4), c0[2], { timeout: 40000 }).catch(() => {});
const c1 = (await page.evaluate(() => window.__dbg.carts())).find((c) => c[0] === "SM_Trolley" && Math.abs(c[1] - 4.4) < 1.5);
check("carrello colpito si muove", c1[2] - c0[2] > 0.4, `z ${c0[2]} -> ${c1[2]}`);
// spinta: camminando contro un carrello (x=-17.6,z=1.6) lo si sposta
await page.evaluate(() => { window.__dbg.teleport(-17.6, -0.2); window.__dbg.look(0, 0); });
await page.waitForTimeout(400);
const q0 = (await page.evaluate(() => window.__dbg.carts())).find((c) => c[0] === "SM_Trolley" && Math.abs(c[1] + 17.6) < 0.5);
await page.keyboard.down("KeyW");
await page.waitForFunction((z0) => window.__dbg.carts().some((c) => c[0] === "SM_Trolley" && c[2] - z0 > 0.8), q0[2], { timeout: 40000 }).catch(() => {});
await page.keyboard.up("KeyW");
const q1 = (await page.evaluate(() => window.__dbg.carts())).find((c) => c[0] === "SM_Trolley" && Math.abs(c[1] + 17.6) < 1.5);
check("il carrello si sposta spingendolo camminando", q1[2] - q0[2] > 0.8, `z ${q0[2]} -> ${q1[2]}`);
check("nessun errore console", errors.length === 0, JSON.stringify(errors));
await page.screenshot({ path: "tests/e2e/out-gameplay.png" });
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
