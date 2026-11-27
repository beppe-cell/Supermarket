import type { Engine } from "@babylonjs/core/Engines/engine";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createEngine } from "./engine-factory";
import { Loader } from "./loader";
import { FixedTimestep } from "./fixed-timestep";
import { InputManager } from "./input/input-manager";
import { QUALITY_PROFILES, adaptScaling, detectQuality, profileFor, readDeviceInfo, type QualityId, type QualityProfile } from "./quality";
import { loadSettings } from "./settings";
import { buildZone1, type Movable } from "../game/levels/zone1-builder";
import { ZONE1, zone1Obstacles } from "../game/levels/zone1";
import { pickLook } from "../game/levels/look";
import { Player } from "../game/player/player";
import { Hud } from "../game/ui/hud";
import { InventoryUI } from "../game/ui/inventory-ui";
import { ITEMS, Inventory } from "../game/inventory/inventory";
import { Objectives } from "../game/inventory/objectives";
import { createEnvironment } from "./environment";
import { createPostFx } from "./postfx";
import { Sfx } from "./audio/sfx";
import { loadModel } from "../game/assets";
import { Pistol, type HitReport } from "../game/weapons/pistol";
import { Horde } from "../game/enemies/horde";
import { buildZone1Nav } from "../game/levels/zone1-nav";
import type { Interactable } from "../game/interaction/interactable";

/** Oggetti del livello → oggetti dell'inventario. */
/** Tipo di oggetto (prefisso dell'id) → oggetto dell'inventario. */
const PICKUP_ITEM: Record<string, string> = { key: "key_warehouse", gauze: "gauze", can: "canned_food", alcohol: "alcohol", tape: "tape", rags: "rags" };
const itemFor = (id: string): string => PICKUP_ITEM[id.split("-")[0] as string] ?? id;
const AMMO_PER_BOX = 15;

export class Game {
  private engine!: Engine | WebGPUEngine;
  private input!: InputManager;
  private quality!: QualityProfile;
  private fpsAcc: number[] = [];
  private touch = false;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  async start(): Promise<void> {
    const params = new URLSearchParams(location.search);
    const loader = new Loader(); loader.set(0.05, "Motore grafico");
    this.engine = await createEngine(this.canvas, { preferWebGPU: params.get("gpu") === "1" });
    const dev = readDeviceInfo({ maxTextureSize: this.engine.getCaps().maxTextureSize });
    // Override: ?quality=low|medium|high oppure #low|#medium|#high (l'Artifact accetta solo l'hash)
    const hash = location.hash.slice(1);
    const forced = (params.get("quality") ?? hash) as QualityId;
    this.quality = profileFor(forced in QUALITY_PROFILES ? forced : detectQuality(dev), dev.isTouch);
    this.engine.setHardwareScalingLevel(this.quality.hardwareScaling);
    this.touch = dev.isTouch;

    const settings = loadSettings();
    let inventoryUi: InventoryUI | undefined;
    this.input = new InputManager(this.canvas, dev.isTouch, settings, () => inventoryUi?.toggle());
    loader.set(0.15, "Livello e oggetti");
    const look = pickLook(params.get("look") ?? location.hash.slice(1));
    const level = await buildZone1(this.engine, this.quality, look);
    const scene = level.scene;
    loader.set(0.5, "Illuminazione e riflessi");
    const envOk = params.get("env") === "0" ? false : await createEnvironment(scene, dev.isTouch ? 16 : 32);
    const player = new Player(scene, ZONE1.spawn, look.torchIntensity);
    const fx = params.get("fx") === "0" ? undefined : createPostFx(scene, player.camera, this.quality, dev.isTouch);
    void envOk; void fx;

    // --- audio, arma, nemici ---
    const sfx = new Sfx(); sfx.setVolume(settings.volume);
    const wake = () => sfx.resume();
    addEventListener("pointerdown", wake); addEventListener("keydown", wake); addEventListener("touchstart", wake);
    const grid = buildZone1Nav();
    loader.set(0.65, "Arma");
    const pistol = await Pistol.create(scene, player.camera, sfx, this.quality.maxDynamicLights);
    const pistolRef = pistol;
    loader.set(0.75, "Nemici");
    const infectedModel = await loadModel(scene, "SM_Infected");
    // Orde a gruppi di 3–4: PC alta 6 gruppi (max 24 vivi), media/telefono 4 (14), bassa 2 (8)
    const hc = this.quality.id === "low" ? { groups: 2, maxAlive: 8, interval: 25 } : this.touch || this.quality.id === "medium" ? { groups: 4, maxAlive: 14, interval: 22 } : { groups: 6, maxAlive: 24, interval: 20 };
    const horde = new Horde(scene, infectedModel, grid, hc);
    const enemies = horde.list;

    // --- HUD, inventario, obiettivi ---
    const hud = new Hud(document.body, dev.isTouch);
    const inventory = new Inventory(12), objectives = new Objectives();
    let time = 0, runTime = 0, begun = false, phase: "dark" | "live" | "won" = "dark", darkLeft = 30, lightsOnT = -1, ambienceT = 3, kills = 0, unlocked = false;
    let paused = false, dead = false, dbgFire = false, dbgAim = false, dbgReload = false, shownObjective = "";
    const syncObjective = () => { const c = objectives.current; const t = c?.text ?? "Obiettivo completato"; if (t !== shownObjective) { shownObjective = t; hud.setObjective(t, !c); } };
    inventoryUi = new InventoryUI({
      inventory, objectives, settings, qualityLabel: `${this.quality.id === "high" ? "Alta" : this.quality.id === "medium" ? "Media" : "Bassa"}${dev.isTouch ? " (30 fps adattivi)" : ""}`,
      getAmmo: () => ({ mag: pistol.mag, reserve: pistol.reserve }),
      getHealth: () => ({ hp: player.health, max: player.maxHealth }),
      useItem: (id) => {
        const def = ITEMS[id];
        if (!def?.heal) return { ok: false, message: "Non utilizzabile." };
        if (player.health >= player.maxHealth) return { ok: false, message: "Salute già al massimo." };
        player.heal(def.heal); hud.message(`${def.name}: +${def.heal} salute`, "ok"); return { ok: true, message: "" };
      },
      onSettings: (s) => sfx.setVolume(s.volume),
      onToggle: (open) => {
        paused = open; scene.animationTimeScale = open ? 0 : 1; hud.setVisible(!open); this.input.touch?.setVisible(!open);
        if (open) document.exitPointerLock?.();
      },
    });
    addEventListener("keydown", (e) => { if ((e.code === "KeyI" || e.code === "Tab") && !dead) { e.preventDefault(); inventoryUi?.toggle(); } });
    syncObjective();

    const ctx = {
      hasItem: (id: string) => inventory.has(itemFor(id)),
      addItem: (id: string, label: string) => {
        if (id.startsWith("ammo")) { pistol.addAmmo(AMMO_PER_BOX); hud.message(`Munizioni +${AMMO_PER_BOX}`, "item"); return true; }
        if (id.startsWith("pistol")) {
          if (inventory.add("pistol", 1) === 0) { hud.message("Zaino pieno", "warn"); return false; }
          pistol.setOwned(true); hud.setWeaponVisible(true); hud.message("Raccolto: Beretta M9 (15 colpi)", "item"); inventoryUi?.refresh(); return true;
        }
        const item = itemFor(id);
        if (inventory.add(item, 1) === 0) { hud.message("Zaino pieno", "warn"); return false; }
        hud.message(`Raccolto: ${ITEMS[item]?.name ?? label}`, "item"); inventoryUi?.refresh();
        if (item === "key_warehouse") { objectives.complete("find_key"); syncObjective(); }
        return true;
      },
      message: (t: string) => hud.message(t),
      event: (name: string) => {
        if (name === "warehouse_unlocked") { unlocked = true; const o = objectives.complete("open_warehouse"); if (o) hud.message(`Obiettivo completato: ${o.text}`, "ok"); syncObjective(); }
      },
    };

    if (params.get("debug") === "1") {
      // Hook solo per i test QA (?debug=1)
      const w = window as unknown as { __dbg?: object };
      w.__dbg = Object.assign(w.__dbg ?? {}, {
        pos: () => [player.position.x, player.position.y, player.position.z],
        inventory: () => inventory.slots.filter(Boolean).map((s) => s?.id),
        teleport: (x: number, z: number) => player.teleport(x, z),
        look: (yaw: number, pitch: number) => player.setLook(yaw, pitch),
        top: (x: number, z: number, h: number) => {
          scene.fogMode = 0;
          const c = new FreeCamera("top", new Vector3(x, h, z), scene);
          c.rotation.set(Math.PI / 2, 0, 0); c.fov = 0.9; scene.activeCamera = c; scene.ambientColor.set(1, 1, 1);
          scene.lights.forEach((l) => { l.intensity = Math.max(l.intensity, 1.2); });
        },
        meshes: (re: string) => scene.meshes.filter((m) => new RegExp(re).test(m.name)).slice(0, 12).map((m) => [m.name, m.isVisible, m.isEnabled(), m.getBoundingInfo().boundingBox.centerWorld.asArray().map((v) => +v.toFixed(1))]),
        mat: (re: string, prop: string, v: unknown) => scene.materials.filter((m) => new RegExp(re).test(m.name)).map((m) => { const o = m as unknown as Record<string, unknown>; if (Array.isArray(v)) (o[prop] as { copyFromFloats(r: number, g: number, b: number): void }).copyFromFloats(v[0], v[1], v[2]); else if (v !== undefined) o[prop] = v; return [m.name, String(o[prop])]; }),
        enemies: () => enemies.map((e) => [e.state, e.hp, +e.position.x.toFixed(2), +e.position.z.toFixed(2)]),
        enemyTo: (i: number, x: number, z: number) => enemies[i]?.position.set(x, 0, z),
        gridInfo: (x0: number, z0: number, x1: number, z1: number) => [grid.lineClear({ x: x0, z: z0 }, { x: x1, z: z1 }), grid.isBlocked(x0, z0), grid.isBlocked(x1, z1)],
        startHorde: () => startHorde(),
        devLive: () => { phase = "live"; darkLeft = 0; level.setLight(1); hud.setCountdown(undefined); objectives.complete("scavenge"); syncObjective(); pistol.setOwned(true); hud.setWeaponVisible(true); },
        phase: () => [phase, +darkLeft.toFixed(1), begun],
        skipCountdown: () => { darkLeft = 0.01; },
        hordeInfo: () => [horde.isStarted, horde.aliveCount, horde.groupCount, horde.alertedCount],
        enemyPlay: (i: number, name: string, loop: boolean, yaw?: number, frac?: number) => enemies[i]?.debugPlay(name, loop, yaw, frac),
        setFire: (v: boolean) => { dbgFire = v; },
        setAim: (v: boolean) => { dbgAim = v; },
        setReload: (v: boolean) => { dbgReload = v; },
        ammo: () => [pistol.mag, pistol.reserve],
        health: () => player.health,
        carts: () => level.movables.map((m) => [m.kind, +m.slider.x.toFixed(2), +m.slider.z.toFixed(2), +m.slider.yaw.toFixed(2)]),
        toggleInventory: () => inventoryUi?.toggle(),
        paused: () => paused,
      });
    }

    loader.set(0.9, "Compilazione shader");
    pistol.warmUp(); horde.warm(ZONE1.spawn.x, ZONE1.spawn.z + 2.6);
    await scene.whenReadyAsync();
    /** L'ingresso cede: la porta si apre e l'orda entra dalla bussola vicino alle casse. */
    const startHorde = (): void => {
      if (horde.isStarted) return;
      const door = scene.getMeshByName("door-entrance"); if (door) { door.setEnabled(false); door.checkCollisions = false; }
      const ii = level.interactables.findIndex((i) => i.mesh === door); if (ii >= 0) level.interactables.splice(ii, 1);
      sfx.clank(3, 0); sfx.rattle(2); hud.message("L'ingresso cede: stanno entrando!", "item");
      horde.start();
    };
    const step = new FixedTimestep(1 / 60);
    const obstacles = zone1Obstacles();
    const autoCool = new Map<Interactable, number>();
    level.setLight(0);                                   // si parte al buio: solo la torcia
    hud.setWeaponVisible(false); hud.setCountdown(undefined);
    addEventListener("resize", () => this.engine.resize());

    let framesShown = 0;
    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      const input = this.input.poll();
      if (pistolRef && pistolRef.aiming) { input.lookDX *= 0.6; input.lookDY *= 0.6; } // sensibilità ridotta in mira
      if (!paused && begun) {
        time += dt; runTime += dt;
        if (phase === "dark") {
          darkLeft -= dt; const sec = Math.max(0, Math.ceil(darkLeft));
          hud.setCountdown(`APERTURA TRA 0:${String(sec).padStart(2, "0")}`, darkLeft < 10);
          ambienceT -= dt;                                  // fuori dalle porte: ringhi e colpi, sempre più frequenti
          if (ambienceT <= 0) { ambienceT = 1.2 + 3.2 * (darkLeft / 30) + Math.random() * 1.5; if (Math.random() < 0.5) sfx.growl(24, Math.random() * 2 - 1); else sfx.clank(1.6 + (1 - darkLeft / 30) * 2, 22); }
          if (darkLeft <= 0) {
            phase = "live"; lightsOnT = 0; hud.setCountdown(undefined); objectives.complete("scavenge"); syncObjective();
            hud.message("Si accendono le luci: i clienti sfondano l'ingresso!", "warn"); startHorde();
          }
        }
        if (lightsOnT >= 0) {                               // accensione a scatti, come un neon difettoso
          lightsOnT += dt; const k = lightsOnT < 0.15 ? 0 : lightsOnT < 0.35 ? 0.9 : lightsOnT < 0.6 ? 0.05 : lightsOnT < 0.8 ? 1 : lightsOnT < 1.1 ? 0.25 : 1;
          level.setLight(k); if (lightsOnT > 1.3) { level.setLight(1); lightsOnT = -1; }
        }
        hud.setWeaponVisible(pistol.owned);
        const n = step.advance(dt);
        if (!dead) for (let i = 0; i < n; i++) player.update(input, step.stepSize);

        // raccolta e porte automatiche: basta passarci vicino (con pausa per evitare messaggi ripetuti)
        if (!dead) for (let ii = level.interactables.length - 1; ii >= 0; ii--) {
          const it = level.interactables[ii] as Interactable; const a = it.auto; if (!a || (a.ready && !a.ready())) continue;
          if ((autoCool.get(it) ?? 0) > time) continue;
          if (Math.hypot(player.position.x - a.x, player.position.z - a.z) < a.r) { autoCool.set(it, time + 2); it.interact(ctx); }
        }

        // armi e nemici
        const moving = input.moveX !== 0 || input.moveY !== 0;
        const sprinting = moving && input.sprint && !input.crouch;
        if (!dead) pistol.update(dt, { fire: input.fire || dbgFire, reload: input.reload || dbgReload, aim: dbgAim }, { moving, sprinting }, {
          onShot: () => horde.alertNear(player.position.x, player.position.z, 24),
          onRecoil: (p, y) => player.addRecoil(p, y),
          onReport: (r: HitReport) => {
            if (r.kind === "enemy" && r.enemy && r.part) { const killed = r.enemy.hit(r.part, { sfx, player: player.position }); hud.hitMarker(killed); if (killed) kills++; }
            const mv = r.mesh?.metadata?.movable as Movable | undefined;
            if (mv && r.point && r.dir) { mv.hit(r.dir.x, r.dir.z, r.point.x, r.point.z); sfx.rattle(Vector3.Distance(mv.collider.position, player.position)); }
          },
        });
        horde.update(dt, player.position, {
          playerAlive: !dead, sfx, flags: { moving, sprinting, crouching: player.isCrouching },
          hurtPlayer: (n: number, from: Vector3) => {
            player.damage(n); sfx.playerHurt();
            let a = Math.atan2(from.x - player.position.x, from.z - player.position.z) - player.yawAngle;
            while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
            hud.hurt(a);
          },
        });
        // oggetti mobili (carrelli): fisica semplice, ostacoli = muri/scaffali/altri carrelli
        for (const m of level.movables) {
          // spinta: camminandoci contro il carrello si sposta (come nella realtà)
          if (!dead && player.intentSpeed > 0) {
            const dx = m.slider.x - player.position.x, dz = m.slider.z - player.position.z, d = Math.hypot(dx, dz) || 1;
            if (d < m.reach + 0.3 + 0.4 && (dx * player.intent.x + dz * player.intent.z) / d > 0.3) m.push(player.intent.x, player.intent.z, player.intentSpeed, player.position.x, player.position.z, dt);
          }
          if (!m.moving) continue;
          const others = level.movables.filter((o) => o !== m).map((o) => ({ x: o.slider.x, z: o.slider.z, w: 0.7, d: 0.7 }));
          const impact = m.step(dt, [...obstacles, ...others]);
          if (impact > 0.4) sfx.clank(impact, Vector3.Distance(m.collider.position, player.position));
        }
        if (phase === "live" && unlocked && !dead && player.position.x > 31 && Math.abs(player.position.z) < 2.8) {
          phase = "won"; dead = true; objectives.complete("reach_warehouse"); syncObjective(); document.exitPointerLock?.();
          const m = Math.floor(runTime / 60), s2 = Math.floor(runTime % 60);
          hud.showEnd("LIVELLO COMPLETATO", `Sei sopravvissuto: ${m}:${String(s2).padStart(2, "0")} · Zombie eliminati: ${kills} · Prossimo livello in arrivo`);
        }
        if (!player.alive && !dead) { dead = true; hud.showDeath(); hud.setPrompt(""); document.exitPointerLock?.(); }
        hud.setAmmo(pistol.mag, pistol.reserve, pistol.reloading);
        hud.setHealth(player.health / player.maxHealth, player.health);
        hud.setCrosshair(Math.min(1, pistol.heat + (moving ? 0.3 : 0) + (sprinting ? 0.4 : 0)));
        level.flicker(time); level.tick(time, player.position.x, player.position.z);
      }
      // Suggerimento "clicca per giocare" quando il mouse non è catturato (solo desktop)
      hud.setLockHint(!dev.isTouch && !paused && !dead && document.pointerLockElement !== this.canvas);
      scene.render();
      if (framesShown < 3 && ++framesShown === 3) { if (params.get("debug") === "1") { loader.close(); begun = true; } else void loader.ready(this.canvas).then(() => { begun = true; }); horde.endWarm(); } // dopo i primi frame (shader e texture già pronti)
      this.tickDebug(dt, scene.getActiveMeshes().length, hud);
    });
  }

  private tickDebug(dt: number, meshes: number, hud: Hud): void {
    this.fpsAcc.push(1 / Math.max(dt, 1e-4));
    if (this.fpsAcc.length < 60) return;
    const avg = this.fpsAcc.reduce((a, b) => a + b, 0) / this.fpsAcc.length;
    this.fpsAcc.length = 0;
    const cur = this.engine.getHardwareScalingLevel();
    // sul telefono si può salire sopra i pixel CSS (min <1) quando c'è margine: immagine più nitida
    const minScale = this.touch ? 1 / Math.min(window.devicePixelRatio || 1, 1.5) : 1;
    const next = adaptScaling(cur, avg, this.quality.targetFps, minScale, 3);
    if (next !== cur) this.engine.setHardwareScalingLevel(next);
    hud.setDebug(`${avg.toFixed(0)} fps | ${this.quality.id} | scala ${next} | mesh ${meshes}`);
  }
}
