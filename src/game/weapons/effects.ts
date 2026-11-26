import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import "@babylonjs/core/Particles/particleSystemComponent";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

function dotTexture(scene: Scene, name: string, hard: number): DynamicTexture {
  const t = new DynamicTexture(name, 64, scene, true), c = t.getContext();
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(hard, "rgba(255,255,255,0.6)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, 64, 64); t.update(); t.hasAlpha = true; return t;
}
function starTexture(scene: Scene): DynamicTexture {
  const t = new DynamicTexture("flashStar", 128, scene, true), c = t.getContext();
  c.translate(64, 64);
  for (let i = 0; i < 8; i++) {
    c.rotate(Math.PI / 4); const g = c.createLinearGradient(0, 0, 60, 0);
    g.addColorStop(0, "rgba(255,255,230,1)"); g.addColorStop(0.35, "rgba(255,190,90,0.8)"); g.addColorStop(1, "rgba(255,120,30,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -5); c.lineTo(i % 2 ? 40 : 62, 0); c.lineTo(0, 5); c.closePath(); c.fill();
  }
  const core = c.createRadialGradient(0, 0, 0, 0, 0, 26); core.addColorStop(0, "rgba(255,255,255,1)"); core.addColorStop(1, "rgba(255,200,120,0)");
  c.fillStyle = core; c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2); c.fill(); t.update(); t.hasAlpha = true; return t;
}

/** Effetti di sparo/impatto: lampo, luce, fumo, bossolo, scintille, tracciante e fori sui muri. Tutto in pool, senza allocazioni per colpo. */
export class WeaponEffects {
  private readonly flash: Mesh[] = [];
  private flashT = 0;
  private readonly light: PointLight;
  private readonly smoke: ParticleSystem;
  private readonly casing: ParticleSystem;
  private readonly sparks: ParticleSystem;
  private readonly oil: ParticleSystem;
  private readonly dust: ParticleSystem;
  private readonly emitter = new Vector3();
  private readonly tracers: { mesh: Mesh; t: number }[] = [];
  private readonly holes: InstancedMesh[] = [];
  private holeIdx = 0;

  constructor(private readonly scene: Scene, private readonly muzzle: TransformNode, maxLights: number) {
    // lampo: due piani incrociati additivi
    const fm = new StandardMaterial("flashMat", scene);
    fm.emissiveTexture = starTexture(scene); fm.opacityTexture = fm.emissiveTexture; fm.disableLighting = true; fm.backFaceCulling = false; fm.emissiveColor = new Color3(1, 0.9, 0.7);
    for (let i = 0; i < 2; i++) {
      const p = MeshBuilder.CreatePlane(`flash${i}`, { size: 0.16 }, scene);
      p.material = fm; p.parent = muzzle; p.rotation.z = i * 1.1; p.rotation.y = i * Math.PI / 2; p.isVisible = false; p.isPickable = false; p.renderingGroupId = 1; this.flash.push(p);
    }
    // luce del lampo: sempre accesa (intensità 0) per non far ricompilare gli shader; se il profilo non ha luci, resta spenta
    this.light = new PointLight("muzzleLight", Vector3.Zero(), scene);
    this.light.parent = muzzle; this.light.diffuse = new Color3(1, 0.72, 0.4); this.light.range = 9; this.light.intensity = 0;
    if (maxLights < 2) this.light.setEnabled(false);

    const soft = dotTexture(scene, "dotSoft", 0.3), hard = dotTexture(scene, "dotHard", 0.55);
    this.smoke = this.makeSystem("smoke", 60, soft, ParticleSystem.BLENDMODE_STANDARD);
    this.smoke.color1 = new Color4(0.6, 0.6, 0.62, 0.35); this.smoke.color2 = new Color4(0.45, 0.45, 0.5, 0.25); this.smoke.colorDead = new Color4(0.3, 0.3, 0.3, 0);
    this.smoke.minSize = 0.03; this.smoke.maxSize = 0.07; this.smoke.minLifeTime = 0.5; this.smoke.maxLifeTime = 1.1; this.smoke.gravity = new Vector3(0, 0.35, 0);
    this.smoke.minEmitPower = 0.1; this.smoke.maxEmitPower = 0.5; this.smoke.direction1 = new Vector3(-0.2, 0.3, 0.6); this.smoke.direction2 = new Vector3(0.2, 0.6, 1);

    this.casing = this.makeSystem("casing", 20, hard, ParticleSystem.BLENDMODE_STANDARD);
    this.casing.color1 = new Color4(1, 0.8, 0.3, 1); this.casing.color2 = new Color4(0.9, 0.65, 0.2, 1); this.casing.colorDead = new Color4(0.8, 0.55, 0.15, 0);
    this.casing.minSize = 0.01; this.casing.maxSize = 0.014; this.casing.minLifeTime = 0.6; this.casing.maxLifeTime = 0.9; this.casing.gravity = new Vector3(0, -9.8, 0);
    this.casing.minEmitPower = 1.4; this.casing.maxEmitPower = 2.2; this.casing.direction1 = new Vector3(0.7, 0.6, -0.2); this.casing.direction2 = new Vector3(1, 1, 0.1);

    this.sparks = this.makeSystem("sparks", 160, hard, ParticleSystem.BLENDMODE_ONEONE);
    this.sparks.color1 = new Color4(1, 0.85, 0.5, 1); this.sparks.color2 = new Color4(1, 0.5, 0.2, 1); this.sparks.colorDead = new Color4(0.4, 0.1, 0, 0);
    this.sparks.minSize = 0.008; this.sparks.maxSize = 0.02; this.sparks.minLifeTime = 0.12; this.sparks.maxLifeTime = 0.35; this.sparks.gravity = new Vector3(0, -9.8, 0);
    this.sparks.minEmitPower = 1.5; this.sparks.maxEmitPower = 4.5;

    this.oil = this.makeSystem("oil", 80, hard, ParticleSystem.BLENDMODE_STANDARD);
    this.oil.color1 = new Color4(0.03, 0.03, 0.04, 1); this.oil.color2 = new Color4(0.15, 0.02, 0.02, 1); this.oil.colorDead = new Color4(0.02, 0.02, 0.02, 0);
    this.oil.minSize = 0.015; this.oil.maxSize = 0.035; this.oil.minLifeTime = 0.3; this.oil.maxLifeTime = 0.7; this.oil.gravity = new Vector3(0, -7, 0);
    this.oil.minEmitPower = 1; this.oil.maxEmitPower = 3;

    this.dust = this.makeSystem("dust", 60, soft, ParticleSystem.BLENDMODE_STANDARD);
    this.dust.color1 = new Color4(0.5, 0.5, 0.52, 0.4); this.dust.color2 = new Color4(0.4, 0.4, 0.42, 0.3); this.dust.colorDead = new Color4(0.3, 0.3, 0.3, 0);
    this.dust.minSize = 0.04; this.dust.maxSize = 0.1; this.dust.minLifeTime = 0.4; this.dust.maxLifeTime = 0.9; this.dust.gravity = new Vector3(0, 0.1, 0);
    this.dust.minEmitPower = 0.1; this.dust.maxEmitPower = 0.6;

    // traccianti (pool)
    const tm = new StandardMaterial("tracerMat", scene); tm.emissiveColor = new Color3(1, 0.85, 0.5); tm.disableLighting = true; tm.alpha = 0.8;
    for (let i = 0; i < 6; i++) { const m = MeshBuilder.CreateBox(`tracer${i}`, { width: 0.006, height: 0.006, depth: 1 }, scene); m.material = tm; m.isVisible = false; m.isPickable = false; this.tracers.push({ mesh: m, t: 0 }); }
    // fori dei proiettili (pool di istanze)
    const hm = new StandardMaterial("holeMat", scene);
    const ht = new DynamicTexture("holeTex", 64, scene, true), hc = ht.getContext();
    const g = hc.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, "rgba(0,0,0,0.95)"); g.addColorStop(0.5, "rgba(10,10,10,0.7)"); g.addColorStop(1, "rgba(0,0,0,0)");
    hc.fillStyle = g; hc.fillRect(0, 0, 64, 64); ht.update(); ht.hasAlpha = true;
    hm.diffuseTexture = ht; hm.opacityTexture = ht; hm.disableLighting = true; hm.emissiveColor = new Color3(0.2, 0.2, 0.2); hm.zOffset = -2; hm.backFaceCulling = false;
    const hole = MeshBuilder.CreatePlane("holeSrc", { size: 0.07 }, scene); hole.material = hm; hole.isVisible = false; hole.isPickable = false;
    for (let i = 0; i < 28; i++) { const h = hole.createInstance(`hole${i}`); h.isVisible = false; h.isPickable = false; this.holes.push(h); }
  }

  private makeSystem(name: string, cap: number, tex: DynamicTexture, blend: number): ParticleSystem {
    const ps = new ParticleSystem(name, cap, this.scene);
    ps.particleTexture = tex; ps.emitter = this.emitter.clone(); ps.emitRate = 0; ps.blendMode = blend; ps.updateSpeed = 0.016;
    ps.minEmitBox = Vector3.Zero(); ps.maxEmitBox = Vector3.Zero(); ps.targetStopDuration = 0; ps.disposeOnStop = false; ps.start();
    return ps;
  }
  private burst(ps: ParticleSystem, at: Vector3, n: number): void { (ps.emitter as Vector3).copyFrom(at); ps.manualEmitCount = n; }

  /** Sparo dalla bocca di fuoco: lampo + luce + fumo + bossolo. */
  muzzleFlash(): void {
    for (const f of this.flash) { f.isVisible = true; f.scaling.setAll(0.7 + Math.random() * 0.7); f.rotation.z = Math.random() * 6.28; }
    this.flashT = 0.055; this.light.intensity = 3.2;
    const p = this.muzzle.getAbsolutePosition();
    this.burst(this.smoke, p, 5);
    // il bossolo esce da destra, leggermente indietro
    const right = this.scene.activeCamera?.getDirection(Vector3.Right()) ?? Vector3.Right();
    const fwd = this.scene.activeCamera?.getDirection(Vector3.Forward()) ?? Vector3.Forward();
    const port = p.add(fwd.scale(-0.07)).add(right.scale(0.02));
    this.casing.direction1 = right.scale(0.7).add(new Vector3(0, 0.6, 0)).subtract(fwd.scale(0.2)); this.casing.direction2 = right.scale(1).add(new Vector3(0, 1, 0));
    this.burst(this.casing, port, 1);
  }

  /** Impatto su geometria statica: scintille, polvere e foro. */
  impactWorld(point: Vector3, normal: Vector3): void {
    this.sparks.direction1 = normal.scale(1).add(new Vector3(-0.6, -0.1, -0.6)); this.sparks.direction2 = normal.scale(1.6).add(new Vector3(0.6, 0.7, 0.6));
    this.burst(this.sparks, point, 10); this.dust.direction1 = normal.scale(0.3).add(new Vector3(-0.2, 0, -0.2)); this.dust.direction2 = normal.scale(0.8).add(new Vector3(0.2, 0.3, 0.2));
    this.burst(this.dust, point, 3);
    const h = this.holes[this.holeIdx++ % this.holes.length] as InstancedMesh;
    h.position.copyFrom(point.add(normal.scale(0.004))); h.lookAt(point.add(normal)); h.rotation.z = Math.random() * 6.28; h.isVisible = true;
  }

  /** Impatto su nemico meccanico: scintille azzurre e olio nero. */
  impactEnemy(point: Vector3, dir: Vector3): void {
    this.sparks.direction1 = dir.scale(-1).add(new Vector3(-0.8, -0.2, -0.8)); this.sparks.direction2 = dir.scale(-2).add(new Vector3(0.8, 0.8, 0.8));
    this.burst(this.sparks, point, 18);
    this.oil.direction1 = dir.scale(0.6).add(new Vector3(-0.5, -0.1, -0.5)); this.oil.direction2 = dir.scale(1.4).add(new Vector3(0.5, 0.5, 0.5)); this.burst(this.oil, point, 8);
  }

  tracer(from: Vector3, to: Vector3): void {
    const t = this.tracers.find((x) => x.t <= 0) ?? this.tracers[0]; if (!t) return;
    const d = to.subtract(from), len = d.length(); if (len < 0.5) return;
    const start = from.add(d.scale(0.5 / len)); const seg = Math.min(len - 0.5, 9);
    t.mesh.scaling.z = seg; t.mesh.position.copyFrom(start.add(d.scale(seg / 2 / len))); t.mesh.lookAt(to); t.mesh.isVisible = true; t.t = 0.05;
  }

  update(dt: number): void {
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) for (const f of this.flash) f.isVisible = false; }
    this.light.intensity = Math.max(0, this.light.intensity - dt * 60);
    for (const t of this.tracers) if (t.t > 0) { t.t -= dt; if (t.t <= 0) t.mesh.isVisible = false; }
  }
}
