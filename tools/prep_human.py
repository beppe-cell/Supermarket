"""Prepara l'uomo realistico (Character Creator, fornito dall'Art Director) come nemico "infetto umano".
Da 73k tri / 259 ossa / 23 materiali / texture 2-4K a ~12k tri (adatto alle orde) / ~27 ossa / 12 materiali / texture 256-1024, con animazioni
procedurali (Idle, Scan, Walk, Run, Attack, Hit, Death) da humanoid_anims.py.
Uso: python tools/prep_human.py <in.glb> <out.glb> <cartella tools>"""
import bpy, sys, os, math, json, bmesh
from mathutils import Vector

src, out, tools_dir = sys.argv[-3:]
sys.path.insert(0, tools_dir)
from humanoid_anims import build_animations

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
arm.animation_data_clear()
HEIGHT = 1.85

# --- 1. oggetti da scartare ------------------------------------------------------------------------------------------------------
DROP = ("Icosphere", "CC_Base_Teeth", "CC_Base_Tongue", "CC_Base_TearLine", "CC_Base_EyeOcclusion")
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name.startswith(DROP): bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
for o in meshes:
    if o.data.shape_keys: o.shape_key_clear()

# --- 2. materiali: toglie ciglia/cornee, unisce unghie→pelle e occhi, per ridurre draw call e texture ---------------------------------------------
def mat_index(o, name):
    for i, m in enumerate(o.data.materials):
        if m and m.name.startswith(name): return i
    return -1
for o in meshes:
    me = o.data; bm = bmesh.new(); bm.from_mesh(me)
    kill = [mat_index(o, n) for n in ("Std_Eyelash", "Std_Cornea_R", "Std_Cornea_L")]
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in [k for k in kill if k >= 0]], context="FACES")
    nails, skin_arm = mat_index(o, "Std_Nails"), mat_index(o, "Std_Skin_Arm")
    eye_r, eye_l = mat_index(o, "Std_Eye_R"), mat_index(o, "Std_Eye_L")
    for f in bm.faces:
        if nails >= 0 and skin_arm >= 0 and f.material_index == nails: f.material_index = skin_arm
        if eye_r >= 0 and eye_l >= 0 and f.material_index == eye_r: f.material_index = eye_l
    bm.to_mesh(me); bm.free()

# --- 3. decimazione (prima dell'Armature) ---------------------------------------------------------------------------------------------
TARGET = {"Buzz_Cut": 1800, "CC_Base_Body": 5200, "Chachi_Momma_Pants": 900, "Jacket": 1500, "Vest": 1100, "Sneaker": 700}   # orda: ~12k tri a nemico
before = 0
for o in meshes:
    o.data.calc_loop_triangles(); n = len(o.data.loop_triangles); before += n
    t = next((v for k, v in TARGET.items() if o.name.startswith(k)), None)
    if t and n > t:
        bpy.context.view_layer.objects.active = o
        d = o.modifiers.new("Decimate", "DECIMATE"); d.ratio = t / n
        bpy.ops.object.modifier_move_to_index(modifier=d.name, index=0); bpy.ops.object.modifier_apply(modifier=d.name)

# --- 4. riduzione delle ossa: pesi delle ossa non essenziali passano al più vicino antenato mantenuto -------------------------------------
KEEP_EXACT = {"root.x", "spine_01.x", "spine_02.x", "spine_03.x", "neck.x", "head.x"}
KEEP_PREFIX = ("shoulder.", "arm_stretch.", "forearm_stretch.", "hand.", "thigh_stretch.", "leg_stretch.", "foot.", "toes_01.")
keep = {b.name for b in arm.data.bones if b.name in KEEP_EXACT or b.name.startswith(KEEP_PREFIX)}
def kept_ancestor(bone):
    b = bone
    while b is not None and b.name not in keep: b = b.parent
    return b.name if b else "root.x"
target = {b.name: (b.name if b.name in keep else kept_ancestor(b)) for b in arm.data.bones}
for o in [x for x in bpy.data.objects if x.type == "MESH"]:
    me = o.data; names = [vg.name for vg in o.vertex_groups]
    new = [dict() for _ in me.vertices]
    for v in me.vertices:
        for g in v.groups:
            t = target.get(names[g.group], "root.x"); new[v.index][t] = new[v.index].get(t, 0.0) + g.weight
    o.vertex_groups.clear()
    groups = {n: o.vertex_groups.new(name=n) for n in sorted(keep)}
    for i, w in enumerate(new):
        for n, val in w.items(): groups[n].add([i], min(1.0, val), "REPLACE")
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
eb = arm.data.edit_bones
for b in list(eb):
    if b.name in keep:
        p = b.parent
        while p is not None and p.name not in keep: p = p.parent
        b.parent = p
for b in list(eb):
    if b.name not in keep: eb.remove(b)
bpy.ops.object.mode_set(mode="OBJECT")

# --- 5. unione in un'unica mesh skinnata ----------------------------------------------------------------------------------------------
meshes = [o for o in bpy.data.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = next(o for o in meshes if o.name.startswith("CC_Base_Body"))
bpy.ops.object.join()
body = bpy.context.active_object; body.name = "SM_Infected"
body.data.calc_loop_triangles(); tris = len(body.data.loop_triangles)

# --- 6. scala/altezza e piedi a terra --------------------------------------------------------------------------------------------------
bpy.context.view_layer.update()
zs = [(body.matrix_world @ v.co).z for v in body.data.vertices]
k = HEIGHT / (max(zs) - min(zs))
arm.scale = arm.scale * k
bpy.context.view_layer.update()
dz = -min((body.matrix_world @ v.co).z for v in body.data.vertices)
arm.location.z += dz
bpy.context.view_layer.update()

# --- 7. texture: ridimensionamento, JPEG dove non serve l'alpha ---------------------------------------------------------------------------
SIZE = [("Std_Skin_Head", 1024), ("Std_Skin_Body", 512), ("Jacket", 512), ("Vest", 512), ("Chachi", 512), ("Std_Skin_Arm", 256), ("Std_Skin_Leg", 256),
        ("Sneaker", 256), ("Hair", 512), ("Scalp", 128), ("Std_Eye", 128)]
used = set()
for m in body.data.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image: used.add(n.image)
for im in used:
    if im.size[0] <= 4: continue
    size = next((s for k_, s in SIZE if im.name.startswith(k_)), 512)
    if im.size[0] > size: im.scale(size, size)
    alpha = ("Hair" in im.name) or ("Scalp" in im.name)
    im.file_format = "PNG" if alpha else "JPEG"
print("IMAGES", len(used))

# --- 7b. niente metallo: le mappe Metallic di CC4 non sono affidabili e rendono nera la pelle (solo roughness dalla texture) ----------------------------
for m in body.data.materials:
    if not (m and m.use_nodes): continue
    for n in m.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            sock = n.inputs["Metallic"]
            for l in list(sock.links): m.node_tree.links.remove(l)
            sock.default_value = 0.0

# --- 8. posa base: misura l'inclinazione delle braccia (A-pose) e la riporta lungo i fianchi --------------------------------------------------
up = Vector((0, 0, 1))
def wpos(n): return arm.matrix_world @ arm.pose.bones[n].head
v = (wpos("hand.l") - wpos("arm_stretch.l")).normalized()
ang = math.degrees(math.acos(max(-1, min(1, v.dot(-up)))))      # angolo dalla verticale
drop = max(0.0, ang - 10.0)
print("ARM angle", round(ang, 1), "drop", round(drop, 1))
speeds = build_animations(arm)
arm.animation_data.action = bpy.data.actions["Idle"]

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=False, export_skins=True, export_animations=True,
                          export_animation_mode="ACTIONS", export_force_sampling=True, export_image_format="WEBP", export_image_quality=78)
print("HUMAN tris", before, "->", tris, "bones", len(arm.data.bones), "actions", [a.name for a in bpy.data.actions], "speeds", speeds, os.path.getsize(out) // 1024, "KB")
