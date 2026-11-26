import type { Engine } from "@babylonjs/core/Engines/engine";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createEngine } from "./engine-factory";
import { FixedTimestep } from "./fixed-timestep";
import { InputManager } from "./input/input-manager";
import { QUALITY_PROFILES, adaptScaling, detectQuality, profileFor, readDeviceInfo, type QualityId, type QualityProfile } from "./quality";
import { loadSettings } from "./settings";
import { buildZone1 } from "../game/levels/zone1-builder";
import { ZONE1 } from "../game/levels/zone1";
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
import { Android } from "../game/enemies/android";
import { buildZone1Nav } from "../game/levels/zone1-nav";
import type { Interactable } from "../game/interaction/interactable";

const REACH = 2.4;
/** Oggetti del livello → oggetti dell'inventario. */
const PICKUP_ITEM: Record<string, string> = { "key-warehouse": "key_warehouse", "med-1": "gauze", "can-1": "canned_food", "bat-1": "batteries", "alc-1": "alcohol" };
const AMMO_PER_BOX = 12;

export class Game {
  private engine!: Engine | WebGPUEngine;
  private input!: InputManager;
  private quality!: QualityProfile;
  private fpsAcc: number[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {}

  async start(): Promise<void> {
    const params = new URLSearchParams(location.search);
    this.engine = await createEngine(this.canvas, { preferWebGPU: params.get("gpu") === "1" });
    const dev = readDeviceInfo({ maxTextureSize: this.engine.getCaps().maxTextureSize });
    // Override: ?quality=low|medium|high oppure #low|#medium|#high (l'Artifact accetta solo l'hash)
    const hash = location.hash.slice(1);
    const forced = (params.get("quality") ?? hash) as QualityId;
    this.quality = profileFor(forced in QUALITY_PROFILES ? forced : detectQuality(dev), dev.isTouch);
    this.engine.setHardwareScalingLevel(this.quality.hardwareScaling);

    const settings = loadSettings();
    let inventoryUi: InventoryUI | undefined;
    this.input = new InputManager(this.canvas, dev.isTouch, settings, () => inventoryUi?.toggle());
    const look = pickLook(params.get("look") ?? location.hash.slice(1));
    const level = await buildZone1(this.engine, this.quality, look);
    const scene = level.scene;
    const envOk = params.get("env") === "0" ? false : await createEnvironment(scene, dev.isTouch ? 16 : 32);
    const player = new Player(scene, ZONE1.spawn, look.torchIntensity);
    const fx = params.get("fx") === "0" ? undefined : createPostFx(scene, player.camera, this.quality, dev.isTouch);
    void envOk; void fx;

    // --- audio, arma, nemici ---
    const sfx = new Sfx(); sfx.setVolume(settings.volume);
    const wake = () => sfx.resume();
    addEventListener("pointerdown", wake); addEventListener("keydown", wake); addEventListener("touchstart", wake);
    const grid = buildZone1Nav();
    const pistol = await Pistol.create(scene, player.camera, sfx, this.quality.maxDynamicLights);
    const androidModel = await loadModel(scene, "SM_Android");
    const enemies = [
      Android.create(scene, androidModel, 1, { x: -4.4, z: 9 }, [{ x: -4.4, z: -3 }, { x: -4.4, z: -8 }, { x: -8.8, z: -8 }, { x: -8.8, z: 9 }, { x: -8.8, z: 12.3 }, { x: -4.4, z: 12.3 }, { x: -4.4, z: 9 }], Math.PI),
      Android.create(scene, androidModel, 2, { x: 8.8, z: -4 }, [{ x: 8.8, z: 9 }, { x: 13.2, z: 9.5 }, { x: 13.2, z: -3 }, { x: 8.8, z: -8 }, { x: 4.4, z: -8 }], 0),
    ].slice(0, this.quality.maxActiveEnemies >= 2 ? 2 : 1);

    // --- HUD, inventario, obiettivi ---
    const hud = new Hud(document.body, dev.isTouch);
    const inventory = new Inventory(12), objectives = new Objectives();
    let paused = false, dead = false, dbgFire = false, dbgReload = false, shownObjective = "";
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
      hasItem: (id: string) => inventory.has(PICKUP_ITEM[id] ?? id),
      addItem: (id: string, label: string) => {
        if (id.startsWith("ammo")) { pistol.addAmmo(AMMO_PER_BOX); hud.message(`Munizioni +${AMMO_PER_BOX}`, "item"); return true; }
        const item = PICKUP_ITEM[id] ?? id;
        if (inventory.add(item, 1) === 0) { hud.message("Zaino pieno", "warn"); return false; }
        hud.message(`Raccolto: ${ITEMS[item]?.name ?? label}`, "item"); inventoryUi?.refresh();
        if (item === "key_warehouse") { objectives.complete("find_key"); syncObjective(); }
        return true;
      },
      message: (t: string) => hud.message(t),
      event: (name: string) => {
        if (name === "warehouse_unlocked") { const o = objectives.complete("open_warehouse"); if (o) hud.message(`Obiettivo completato: ${o.text}`, "ok"); syncObjective(); }
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
        enemies: () => enemies.map((e) => [e.state, e.hp, +e.position.x.toFixed(2), +e.position.z.toFixed(2)]),
        enemyTo: (i: number, x: number, z: number) => enemies[i]?.position.set(x, 0, z),
        setFire: (v: boolean) => { dbgFire = v; },
        setReload: (v: boolean) => { dbgReload = v; },
        ammo: () => [pistol.mag, pistol.reserve],
        health: () => player.health,
        toggleInventory: () => inventoryUi?.toggle(),
        paused: () => paused,
      });
    }

    const step = new FixedTimestep(1 / 60);
    const ray = new Ray(Vector3.Zero(), Vector3.Forward(), REACH);
    let target: Interactable | undefined;
    let interactHeld = false, torchHeld = false, time = 0;
    addEventListener("resize", () => this.engine.resize());

    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      const input = this.input.poll();
      if (!paused) {
        time += dt;
        const n = step.advance(dt);
        if (!dead) for (let i = 0; i < n; i++) player.update(input, step.stepSize);

        if (input.torch && !torchHeld) player.torch.setEnabled(!player.torch.isEnabled());
        torchHeld = input.torch;

        // Interazione: raggio dal centro della camera
        scene.activeCamera?.getForwardRayToRef(ray, REACH);
        const hit = scene.pickWithRay(ray, (m) => level.interactables.some((i) => i.mesh === m));
        target = hit?.pickedMesh ? level.interactables.find((i) => i.mesh === hit.pickedMesh) : undefined;
        hud.setPrompt(target && !dead ? target.prompt() : "");
        this.input.touch?.setInteractHint(!!target);
        if (input.interact && !interactHeld && target && !dead) target.interact(ctx);
        interactHeld = input.interact;

        // armi e nemici
        const moving = input.moveX !== 0 || input.moveY !== 0;
        const sprinting = moving && input.sprint && player.stamina.canSprint && !input.crouch;
        if (!dead) pistol.update(dt, { fire: input.fire || dbgFire, reload: input.reload || dbgReload }, { moving, sprinting }, {
          onShot: () => { const p = { x: player.position.x, z: player.position.z }; for (const e of enemies) if (Vector3.Distance(e.position, player.position) < 32) e.hear(p); },
          onRecoil: (p, y) => player.addRecoil(p, y),
          onReport: (r: HitReport) => {
            if (r.kind === "enemy" && r.enemy && r.part) { const killed = r.enemy.hit(r.part, { sfx, player: player.position }); hud.hitMarker(killed); }
          },
        });
        const ctxE = {
          player: player.position, grid, sfx, playerAlive: !dead,
          playerFlags: { torch: player.torch.isEnabled(), sprinting, crouching: player.isCrouching },
          hurtPlayer: (n: number, from: Vector3) => {
            player.damage(n); sfx.playerHurt();
            let a = Math.atan2(from.x - player.position.x, from.z - player.position.z) - player.yawAngle;
            while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
            hud.hurt(a);
            if (!player.alive && !dead) { dead = true; hud.showDeath(); hud.setPrompt(""); document.exitPointerLock?.(); }
          },
        };
        for (const e of enemies) e.update(dt, ctxE);
        hud.setAmmo(pistol.mag, pistol.reserve, pistol.reloading);
        hud.setHealth(player.health / player.maxHealth, player.health);
        hud.setStamina(player.stamina.ratio);
        hud.setCrosshair(Math.min(1, pistol.heat + (moving ? 0.3 : 0) + (sprinting ? 0.4 : 0)));
        level.flicker(time);
      }
      // Suggerimento "clicca per giocare" quando il mouse non è catturato (solo desktop)
      hud.setLockHint(!dev.isTouch && !paused && !dead && document.pointerLockElement !== this.canvas);
      scene.render();
      this.tickDebug(dt, scene.getActiveMeshes().length, hud);
    });
  }

  private tickDebug(dt: number, meshes: number, hud: Hud): void {
    this.fpsAcc.push(1 / Math.max(dt, 1e-4));
    if (this.fpsAcc.length < 60) return;
    const avg = this.fpsAcc.reduce((a, b) => a + b, 0) / this.fpsAcc.length;
    this.fpsAcc.length = 0;
    const cur = this.engine.getHardwareScalingLevel();
    const next = adaptScaling(cur, avg, this.quality.targetFps, 1, 3);
    if (next !== cur) this.engine.setHardwareScalingLevel(next);
    hud.setDebug(`${avg.toFixed(0)} fps | ${this.quality.id} | scala ${next} | mesh ${meshes}`);
  }
}
