"""Prepara l'androide nemico (vedi ASSET_REGISTRY T11): meshes rigide -> unica mesh skinnata, decimata (~14k tri), altezza 1.85 m,
rimozione dell'animazione originale (solo posa delle dita) e creazione di 4 animazioni procedurali: Idle, Walk, Attack, Death.
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

# --- 5. animazioni procedurali
sc = bpy.context.scene; sc.render.fps = 24
for pb in arm.pose.bones: pb.rotation_mode = "XYZ"
def wpos(name, tail=False):
    pb = arm.pose.bones[name]; return arm.matrix_world @ (pb.tail if tail else pb.head)
def reset():
    for pb in arm.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
fwd = wpos("toes_01.l") - wpos("foot.l"); fwd.z = 0; fwd.normalize()
up = Vector((0, 0, 1))
def axis_for(bone, tracked, direction, tail=False):
    """Trova (asse euler, segno) per cui una rotazione positiva sposta `tracked` verso `direction`."""
    best = (0, 1, 0.0); base = wpos(tracked, tail)
    for ax in range(3):
        for s in (1, -1):
            reset(); e = [0, 0, 0]; e[ax] = s * 0.3; arm.pose.bones[bone].rotation_euler = e
            bpy.context.view_layer.update()
            d = (wpos(tracked, tail) - base).dot(direction)
            if d > best[2]: best = (ax, s, d)
    reset(); return best[0], best[1]
AX = {}
for side in ("l", "r"):
    AX["thigh." + side] = axis_for(f"thigh_stretch.{side}", f"foot.{side}", fwd)
    AX["knee." + side] = axis_for(f"leg_stretch.{side}", f"foot.{side}", -fwd)
    AX["arm." + side] = axis_for(f"arm_stretch.{side}", f"hand.{side}", fwd)
    AX["elbow." + side] = axis_for(f"forearm_stretch.{side}", f"hand.{side}", fwd)
AX["spine1"] = axis_for("spine_01.x", "head.x", fwd)
AX["spine2"] = axis_for("spine_02.x", "head.x", fwd)
AX["root_back"] = axis_for("root.x", "head.x", -fwd)
print("AXES", AX)

def make_action(name, frames, pose_fn, loop=True):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    arm.animation_data_create(); arm.animation_data.action = act
    for f in range(frames + 1):
        reset(); pose_fn(f, frames)
        for pb in arm.pose.bones:
            if any(abs(v) > 1e-6 for v in pb.rotation_euler) or any(abs(v) > 1e-6 for v in pb.location):
                pb.keyframe_insert("rotation_euler", frame=f + 1); pb.keyframe_insert("location", frame=f + 1)
        for pb in arm.pose.bones:  # chiavi a zero per le ossa già animate (interpolazione corretta)
            pass
    return act
def rot(key, bone, ang):
    ax, s = AX[key]; e = list(arm.pose.bones[bone].rotation_euler); e[ax] += s * ang; arm.pose.bones[bone].rotation_euler = e
R = math.radians
def idle(f, n):
    p = 2 * math.pi * f / n
    rot("spine2", "spine_02.x", R(2.0) * math.sin(p)); rot("spine1", "spine_01.x", R(1.0) * math.sin(p))
    for s in ("l", "r"): rot("arm." + s, f"arm_stretch.{s}", R(3) * math.sin(p + 0.6)); rot("elbow." + s, f"forearm_stretch.{s}", R(8))
def walk(f, n):
    p = 2 * math.pi * f / n; sw = math.sin(p)
    for s, sg in (("l", 1), ("r", -1)):
        rot("thigh." + s, f"thigh_stretch.{s}", R(28) * sw * sg)
        rot("knee." + s, f"leg_stretch.{s}", R(38) * max(0.0, math.cos(p) * sg) + R(5))
        rot("arm." + s, f"arm_stretch.{s}", -R(20) * sw * sg)
        rot("elbow." + s, f"forearm_stretch.{s}", R(18) + R(8) * max(0.0, -sw * sg))
    rot("spine1", "spine_01.x", R(5))
def attack(f, n):
    t = f / n
    wind = max(0.0, min(1.0, t / 0.3)) * (1 if t < 0.45 else 0)            # carica
    hit = 0.0 if t < 0.3 else (min(1.0, (t - 0.3) / 0.15) if t < 0.5 else max(0.0, 1 - (t - 0.5) / 0.4))  # colpo
    rot("arm.r", "arm_stretch.r", -R(55) * wind + R(110) * hit); rot("elbow.r", "forearm_stretch.r", R(80) * wind - R(60) * hit)
    rot("arm.l", "arm_stretch.l", R(20) * hit); rot("spine1", "spine_01.x", R(14) * hit - R(6) * wind)
    for s in ("l", "r"): rot("thigh." + s, f"thigh_stretch.{s}", R(10) * hit * (1 if s == "l" else -1))
def death(f, n):
    t = f / n; e = t * t * (3 - 2 * t)
    rot("knee.l", "leg_stretch.l", R(50) * min(1, t * 2.2)); rot("knee.r", "leg_stretch.r", R(45) * min(1, t * 2.2))
    rot("thigh.l", "thigh_stretch.l", R(25) * min(1, t * 2.2)); rot("thigh.r", "thigh_stretch.r", R(20) * min(1, t * 2.2))
    rot("root_back", "root.x", R(86) * e)
    pb = arm.pose.bones["root.x"]; m = (arm.matrix_world @ pb.bone.matrix_local).to_3x3().inverted()
    pb.location = m @ Vector((0, 0, -0.80 * e))
make_action("Idle", 48, idle); make_action("Walk", 24, walk); make_action("Attack", 30, attack); make_action("Death", 36, death)
reset(); arm.animation_data.action = bpy.data.actions["Idle"]
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=False, export_skins=True,
                          export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True)
print("ANDROID tris", tris, "bones", len(arm.data.bones), "height", HEIGHT, "actions", [a.name for a in bpy.data.actions])
