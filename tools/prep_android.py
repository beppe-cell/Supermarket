"""Prepara l'androide nemico (vedi ASSET_REGISTRY T11): meshes rigide -> unica mesh skinnata, decimata (~14k tri), altezza 1.85 m,
rimozione dell'animazione originale (solo posa delle dita) e creazione di 7 animazioni procedurali: Idle, Scan, Walk, Run, Attack, Hit, Death.
Uso: python tools/prep_android.py <ROBOT.fbx> <out.glb>"""
import bpy, sys, math, json
from mathutils import Vector

fbx, out = sys.argv[-2], sys.argv[-1]
TARGET_TRIS, HEIGHT = 14000, 1.85
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
arm.animation_data_clear()
meshes = [o for o in bpy.data.objects if o.type == "MESH"]

# --- 1. skinning uniforme: i mesh parentati a un osso diventano pesati 100% su quell'osso
for o in meshes:
    if o.parent_type == "BONE" and o.parent_bone:
        bone = o.parent_bone; mw = o.matrix_world.copy()
        o.parent = arm; o.parent_type = "OBJECT"; o.matrix_world = mw
        vg = o.vertex_groups.new(name=bone); vg.add(range(len(o.data.vertices)), 1.0, "REPLACE")
        m = o.modifiers.new("Armature", "ARMATURE"); m.object = arm
# --- 2. decimazione per oggetto (rapporto fisso) e unione
tot = 0
for o in meshes:
    o.data.calc_loop_triangles(); tot += len(o.data.loop_triangles)
ratio = min(1.0, TARGET_TRIS / tot)
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    bpy.context.view_layer.objects.active = o
    n = len(o.data.polygons)
    if n * ratio >= 60:
        d = o.modifiers.new("Decimate", "DECIMATE"); d.ratio = ratio
        # i modificatori Decimate vanno applicati prima dell'Armature (ordine): sposta in testa
        bpy.ops.object.modifier_move_to_index(modifier=d.name, index=0)
        bpy.ops.object.modifier_apply(modifier=d.name)
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = next(o for o in meshes if o.name == "BODY.002")
bpy.ops.object.join()
body = bpy.context.active_object; body.name = "SM_Android"
for m in list(body.modifiers):
    if m.type != "ARMATURE": body.modifiers.remove(m)
body.data.calc_loop_triangles(); tris = len(body.data.loop_triangles)
# --- 3. materiali: nessun logo, occhi/visiera emissivi
for mat in body.data.materials:
    p = mat.node_tree.nodes.get("Principled BSDF")
    if p is None: continue
    if mat.name == "GLOW":
        p.inputs["Emission Color"].default_value = (0.0, 0.5, 1.0, 1); p.inputs["Emission Strength"].default_value = 3.0
    if mat.name == "GLASS":
        p.inputs["Emission Color"].default_value = (1.0, 0.05, 0.05, 1); p.inputs["Emission Strength"].default_value = 2.5
    if mat.name.startswith("LOGO"):
        p.inputs["Base Color"].default_value = (0.02, 0.02, 0.02, 1)
# --- 4. scala: altezza reale 1.85 m (la scala va sull'armatura: i figli la seguono)
bpy.context.view_layer.update()
zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]
k = HEIGHT / (max(zs) - min(zs))
arm.scale = arm.scale * k
bpy.context.view_layer.update()

# --- 5. animazioni procedurali (Idle, Scan, Walk, Run, Attack, Hit, Death) ---------------------------------------------
sc = bpy.context.scene; sc.render.fps = 24
for pb in arm.pose.bones: pb.rotation_mode = "XYZ"
def wpos(name, tail=False):
    pb = arm.pose.bones[name]; return arm.matrix_world @ (pb.tail if tail else pb.head)
def reset():
    for pb in arm.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
reset()
fwd = wpos("toes_01.l") - wpos("foot.l"); fwd.z = 0; fwd.normalize()
up = Vector((0, 0, 1)); side = fwd.cross(up).normalized()
def axis_for(bone, tracked, direction, tail=False):
    """(asse euler, segno): rotazione positiva sposta `tracked` verso `direction`."""
    best = (0, 1, 0.0); base = wpos(tracked, tail)
    for ax in range(3):
        for sg in (1, -1):
            reset(); e = [0, 0, 0]; e[ax] = sg * 0.3; arm.pose.bones[bone].rotation_euler = e
            bpy.context.view_layer.update()
            d = (wpos(tracked, tail) - base).dot(direction)
            if d > best[2]: best = (ax, sg, d)
    reset(); return best[0], best[1]
def axis_world(bone, vec):
    """(asse euler, segno): rotazione positiva = rotazione destrorsa attorno al vettore mondo `vec`."""
    M = (arm.matrix_world @ arm.data.bones[bone].matrix_local).to_3x3()
    best = (0, 1, 0.0)
    for ax in range(3):
        d = M.col[ax].normalized().dot(vec)
        if abs(d) > abs(best[2]): best = (ax, 1 if d > 0 else -1, d)
    return best[0], best[1]
AX = {}
for sd in ("l", "r"):
    AX["thigh." + sd] = axis_for(f"thigh_stretch.{sd}", f"foot.{sd}", fwd)
    AX["knee." + sd] = axis_for(f"leg_stretch.{sd}", f"foot.{sd}", -fwd)
    AX["foot." + sd] = axis_for(f"foot.{sd}", f"toes_01.{sd}", up)
    AX["arm." + sd] = axis_for(f"arm_stretch.{sd}", f"hand.{sd}", fwd)
    AX["elbow." + sd] = axis_for(f"forearm_stretch.{sd}", f"hand.{sd}", fwd)
    AX["shoulder_fwd." + sd] = axis_for("spine_02.x", f"shoulder.{sd}", fwd)
    AX["arm_down." + sd] = axis_for(f"arm_stretch.{sd}", f"hand.{sd}", -up)           # + = braccio verso il basso
AX["spine1"] = axis_for("spine_01.x", "head.x", fwd)
AX["spine2"] = axis_for("spine_02.x", "head.x", fwd)
AX["neck"] = axis_for("neck.x", "head.x", fwd)
AX["root_back"] = axis_for("root.x", "head.x", -fwd)
AX["pelvis_twist"] = axis_for("root.x", "thigh_stretch.l", fwd)        # + = anca sinistra avanti
AX["spine_roll"] = axis_for("spine_01.x", "head.x", side)
AX["head_yaw"] = axis_world("head.x", up)
AX["spine2_yaw"] = axis_world("spine_02.x", up)
print("AXES", AX)

R = math.radians
def rot(key, bone, ang):
    ax, sg = AX[key]; e = list(arm.pose.bones[bone].rotation_euler); e[ax] += sg * ang; arm.pose.bones[bone].rotation_euler = e
def loc_w(bone, vec):
    pb = arm.pose.bones[bone]; m = (arm.matrix_world @ pb.bone.matrix_local).to_3x3().inverted(); pb.location = pb.location + m @ vec
def base_pose():
    """Il modello nasce in T-pose: braccia rilassate lungo i fianchi, gomiti leggermente flessi, ginocchia appena morbide."""
    for sd in ("l", "r"):
        rot("arm_down." + sd, f"arm_stretch.{sd}", R(66)); rot("arm." + sd, f"arm_stretch.{sd}", R(6)); rot("elbow." + sd, f"forearm_stretch.{sd}", R(14))
def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)

def make_action(name, frames, pose_fn):
    """Due passate: raccoglie le pose, poi chiavi su TUTTE le ossa toccate in ogni frame (interpolazione corretta e loop)."""
    rec, touched = [], set()
    for f in range(frames + 1):
        reset(); base_pose(); pose_fn(f, frames); cur = {}
        for pb in arm.pose.bones:
            r, l = tuple(pb.rotation_euler), tuple(pb.location)
            if any(abs(v) > 1e-7 for v in r + l): cur[pb.name] = (r, l); touched.add(pb.name)
        rec.append(cur)
    act = bpy.data.actions.new(name); act.use_fake_user = True
    arm.animation_data_create(); arm.animation_data.action = act
    for f, cur in enumerate(rec):
        for bn in touched:
            pb = arm.pose.bones[bn]; r, l = cur.get(bn, ((0, 0, 0), (0, 0, 0)))
            pb.rotation_euler = r; pb.location = l
            pb.keyframe_insert("rotation_euler", frame=f + 1); pb.keyframe_insert("location", frame=f + 1)
    reset(); return act

def gait(f, n, amp, knee, bob, lean, elbow, swing_arm, twist, sway):
    p = 2 * math.pi * f / n; s = math.sin(p); c = math.cos(p)
    for sd, sg in (("l", 1), ("r", -1)):
        ss, cc = s * sg, c * sg                                   # fase della gamba (sinistra: s, destra: -s)
        rot("thigh." + sd, f"thigh_stretch.{sd}", R(amp) * ss)
        rot("knee." + sd, f"leg_stretch.{sd}", R(knee) * max(0.0, cc) ** 1.3 + R(9) * max(0.0, -cc) * max(0.0, 0.4 - ss))
        rot("foot." + sd, f"foot.{sd}", R(12) * cc - R(22) * max(0.0, -ss))        # punta su in volo, spinta a fine appoggio
        rot("arm." + sd, f"arm_stretch.{sd}", -R(swing_arm) * ss)
        rot("elbow." + sd, f"forearm_stretch.{sd}", R(elbow) + R(elbow * 0.35) * max(0.0, -ss))
    ax, sg = AX["pelvis_twist"]; e = list(arm.pose.bones["root.x"].rotation_euler); e[ax] += sg * R(twist) * s; arm.pose.bones["root.x"].rotation_euler = e
    rot("shoulder_fwd.l", "spine_02.x", -R(twist * 1.3) * s)                         # controtorsione delle spalle
    rot("spine_roll", "spine_01.x", R(sway) * s)
    rot("spine1", "spine_01.x", R(lean))
    ax, sg = AX["head_yaw"]; e = list(arm.pose.bones["head.x"].rotation_euler); e[ax] += sg * R(twist * 0.6) * s; arm.pose.bones["head.x"].rotation_euler = e   # testa stabilizzata
    loc_w("root.x", up * (-bob * s * s) + side * (bob * 0.4 * s))                  # corpo più basso a gambe divaricate
def walk(f, n): gait(f, n, amp=32, knee=58, bob=0.035, lean=5, elbow=25, swing_arm=22, twist=6, sway=2.5)
def run(f, n): gait(f, n, amp=47, knee=100, bob=0.075, lean=17, elbow=85, swing_arm=45, twist=10, sway=3.5)

def idle(f, n):
    p = 2 * math.pi * f / n; b = math.sin(p)
    rot("spine2", "spine_02.x", R(1.4) * b); rot("spine1", "spine_01.x", R(0.8) * b)
    for sd in ("l", "r"):
        rot("arm." + sd, f"arm_stretch.{sd}", R(2.5) * math.sin(p + 0.8)); rot("elbow." + sd, f"forearm_stretch.{sd}", R(10) + R(2) * b)
    t = f / n; tw = smooth((t - 0.62) / 0.03) - smooth((t - 0.70) / 0.05)         # scatto meccanico della testa
    ax, sg = AX["head_yaw"]; e = list(arm.pose.bones["head.x"].rotation_euler); e[ax] += sg * R(11) * tw; arm.pose.bones["head.x"].rotation_euler = e
    loc_w("root.x", up * (0.004 * b))
def scan(f, n):
    p = 2 * math.pi * f / n; idle(f, 72 if False else n)
    ax, sg = AX["head_yaw"]; e = list(arm.pose.bones["head.x"].rotation_euler); e[ax] += sg * R(52) * math.sin(p); arm.pose.bones["head.x"].rotation_euler = e
    ax, sg = AX["spine2_yaw"]; e = list(arm.pose.bones["spine_02.x"].rotation_euler); e[ax] += sg * R(14) * math.sin(p - 0.4); arm.pose.bones["spine_02.x"].rotation_euler = e
    rot("spine1", "spine_01.x", R(4))
def hit(f, n):
    t = f / n; env = math.sin(math.pi * min(1.0, t * 1.15)) ** 0.8
    rot("spine1", "spine_01.x", -R(20) * env); rot("spine2", "spine_02.x", -R(10) * env); rot("neck", "neck.x", -R(16) * env)
    rot("arm.l", "arm_stretch.l", R(35) * env); rot("elbow.l", "forearm_stretch.l", R(40) * env); rot("arm.r", "arm_stretch.r", R(20) * env)
    ax, sg = AX["pelvis_twist"]; e = list(arm.pose.bones["root.x"].rotation_euler); e[ax] += sg * R(8) * env; arm.pose.bones["root.x"].rotation_euler = e
    rot("knee.l", "leg_stretch.l", R(14) * env); rot("knee.r", "leg_stretch.r", R(10) * env); loc_w("root.x", up * (-0.04 * env))
def attack(f, n):
    t = f / n
    wind = smooth(t / 0.28) * (1 - smooth((t - 0.34) / 0.10))                          # carica del braccio destro
    strike = smooth((t - 0.30) / 0.14) * (1 - smooth((t - 0.58) / 0.34))                # colpo (picco ≈ frame 13-14)
    rot("arm.r", "arm_stretch.r", -R(80) * wind + R(125) * strike); rot("elbow.r", "forearm_stretch.r", R(95) * wind - R(65) * strike)
    rot("arm.l", "arm_stretch.l", R(25) * strike - R(15) * wind); rot("elbow.l", "forearm_stretch.l", R(50) * strike)
    rot("shoulder_fwd.r", "spine_02.x", -R(18) * wind + R(26) * strike)
    rot("spine1", "spine_01.x", R(20) * strike - R(8) * wind); rot("neck", "neck.x", R(10) * strike)
    rot("thigh.l", "thigh_stretch.l", R(26) * strike); rot("knee.l", "leg_stretch.l", R(28) * strike)
    rot("thigh.r", "thigh_stretch.r", -R(14) * strike); rot("knee.r", "leg_stretch.r", R(16) * strike)
    loc_w("root.x", up * (-0.07 * strike - 0.03 * wind))
def death(f, n):
    t = f / n
    jerk = math.sin(math.pi * min(1.0, t / 0.18)) if t < 0.18 else 0.0
    buckle = smooth((t - 0.08) / 0.34)
    fall = smooth((t - 0.30) / 0.52)
    settle = math.sin(max(0.0, t - 0.86) / 0.14 * math.pi * 2) * 0.03 * (1 - smooth((t - 0.86) / 0.14))
    rot("spine1", "spine_01.x", -R(14) * jerk); rot("neck", "neck.x", -R(25) * jerk - R(18) * fall)
    rot("knee.l", "leg_stretch.l", R(75) * buckle); rot("knee.r", "leg_stretch.r", R(68) * buckle)
    rot("thigh.l", "thigh_stretch.l", R(30) * buckle); rot("thigh.r", "thigh_stretch.r", R(22) * buckle)
    rot("root_back", "root.x", R(88) * fall + settle)
    ax, sg = AX["pelvis_twist"]; e = list(arm.pose.bones["root.x"].rotation_euler); e[ax] += sg * R(14) * fall; arm.pose.bones["root.x"].rotation_euler = e
    for sd, k in (("l", 1), ("r", -1)):
        rot("arm." + sd, f"arm_stretch.{sd}", R(70) * math.sin(min(1.0, t * 2.2) * math.pi) * (1 - fall * 0.4) + R(25) * fall * k)
        rot("elbow." + sd, f"forearm_stretch.{sd}", R(40) * (1 - fall) + R(15) * fall)
    # contatto col suolo: la radice si abbassa/alza in modo che il punto più basso resti sul pavimento
    bpy.context.view_layer.update()
    low = min(min((arm.matrix_world @ pb.head).z, (arm.matrix_world @ pb.tail).z) for pb in arm.pose.bones)
    loc_w("root.x", up * (REST_LOW - low))
reset(); bpy.context.view_layer.update()
REST_LOW = min(min((arm.matrix_world @ pb.head).z, (arm.matrix_world @ pb.tail).z) for pb in arm.pose.bones)

make_action("Idle", 72, idle); make_action("Scan", 96, scan)
make_action("Walk", 24, walk); make_action("Run", 16, run)
make_action("Attack", 30, attack); make_action("Hit", 14, hit); make_action("Death", 48, death)

# velocità di riferimento delle andature (m/s) per sincronizzare i piedi: 2 * escursione del piede / durata del ciclo
def stride_speed(action_name, n):
    arm.animation_data.action = bpy.data.actions[action_name]; xs = []
    for f in range(1, n + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        xs.append((wpos("foot.l") - wpos("root.x")).dot(fwd))
    return 2 * (max(xs) - min(xs)) / (n / 24.0)
print("SPEEDS walk", round(stride_speed("Walk", 24), 3), "run", round(stride_speed("Run", 16), 3))
reset(); arm.animation_data.action = bpy.data.actions["Idle"]
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=False, export_skins=True,
                          export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True)
print("ANDROID tris", tris, "bones", len(arm.data.bones), "height", HEIGHT, "actions", [a.name for a in bpy.data.actions])
