"""Genera SM_Shelf_Unit (scaffale gondola da supermercato, ~1.2 x 0.5 x 1.9 m) con bevel, materiali PBR e texture
baked (sporco/usura). Fronte verso -Y (Blender). Uso: SHELF_TEX_DIR=<dir con shelf_albedo.jpg/shelf_orm.jpg/shelf_normal.png> python tools/make_shelf.py <out.glb>"""
import bpy, bmesh, sys, math, os
from mathutils import Vector

out = sys.argv[-2] if len(sys.argv) > 2 and sys.argv[-1].endswith(".png") is False and sys.argv[-2].endswith(".glb") else sys.argv[-1]
tex_dir = os.path.dirname(out)
W, D, H = 1.2, 0.5, 1.9
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def box(name, sx, sy, sz, loc, bevel=0.004):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.location = loc
    if bevel:
        m = o.modifiers.new("bev", "BEVEL"); m.width = bevel; m.segments = 2; m.limit_method = "ANGLE"
    return o

parts = []
# montanti laterali
for sx in (-1, 1):
    parts.append(box("post", 0.03, D, H, (sx * (W / 2 - 0.015), 0, H / 2), 0.005))
# zoccolo (kick plate) rientrato
parts.append(box("kick", W - 0.06, 0.02, 0.14, (0, -D / 2 + 0.03, 0.07)))
parts.append(box("base", W - 0.06, D - 0.08, 0.04, (0, 0.0, 0.14)))
# pannello posteriore + 5 scanalature verticali (rail forati)
parts.append(box("back", W - 0.06, 0.015, H - 0.1, (0, D / 2 - 0.008, H / 2 + 0.02), 0.002))
for i in range(-2, 3):
    parts.append(box("rail", 0.022, 0.006, H - 0.3, (i * 0.22, D / 2 - 0.019, H / 2 + 0.03), 0.001))
# ripiani con labbro anteriore e inclinazione 3 gradi
for i, z in enumerate((0.26, 0.62, 0.98, 1.34, 1.70)):
    b = box("board", W - 0.07, D - 0.08, 0.018, (0, -0.01, z), 0.003)
    b.rotation_euler = (math.radians(3), 0, 0)
    lip = box("lip", W - 0.07, 0.014, 0.065, (0, -D / 2 + 0.035, z + 0.025), 0.003)
    lbl = box("label", W - 0.12, 0.004, 0.022, (0, -D / 2 + 0.026, z + 0.025), 0.0)
    lbl["is_label"] = True
    parts += [b, lip, lbl]
    # staffe di supporto sotto il ripiano
    for sx in (-1, 1):
        parts.append(box("brk", 0.012, D - 0.1, 0.05, (sx * (W / 2 - 0.05), -0.01, z - 0.034), 0.002))
# cappello superiore
parts.append(box("cap", W, D + 0.01, 0.05, (0, 0, H + 0.025), 0.01))
# insegna/header
parts.append(box("header", W - 0.04, 0.02, 0.18, (0, -D / 2 - 0.005, H + 0.14), 0.004))

# applica modificatori e unisci
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
paint = bpy.data.materials.new("M_ShelfPaint"); galv = bpy.data.materials.new("M_ShelfBoard"); lab = bpy.data.materials.new("M_PriceLabel")
for m in (paint, galv, lab): m.use_nodes = True
def setp(m, base, metal, rough):
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = base; p.inputs["Metallic"].default_value = metal; p.inputs["Roughness"].default_value = rough
setp(paint, (0.52, 0.55, 0.58, 1), 0.15, 0.42)
setp(galv, (0.70, 0.72, 0.74, 1), 0.85, 0.34)
setp(lab, (0.85, 0.85, 0.82, 1), 0.0, 0.6)
for o in parts:
    o.data.materials.clear()
    n = o.name
    o.data.materials.append(lab if o.get("is_label") else galv if n.startswith(("board", "lip", "brk")) else paint)
bpy.ops.object.select_all(action="DESELECT")
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
shelf = bpy.context.active_object; shelf.name = "SM_Shelf_Unit"
bpy.ops.object.shade_smooth(); 
me = shelf.data
# origine al centro-base, fronte -Y
for v in me.vertices: v.co.z -= 0.0
shelf.location = (0, 0, 0)

# UV a scala reale (cube projection: 1 tile = 0.8 m) + materiale acciaio zincato dalle texture scaricate
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.cube_project(cube_size=0.8, correct_aspect=True, clip_to_bounds=False, scale_to_bounds=False); bpy.ops.object.mode_set(mode="OBJECT")
TEX = os.environ.get("SHELF_TEX_DIR", tex_dir)
def img(name, cs):
    i = bpy.data.images.load(os.path.join(TEX, name)); i.colorspace_settings.name = cs; i.pack(); return i
steel = bpy.data.materials.new("M_ShelfSteel"); steel.use_nodes = True
nt = steel.node_tree; pb = nt.nodes["Principled BSDF"]
tb = nt.nodes.new("ShaderNodeTexImage"); tb.image = img("shelf_albedo.jpg", "sRGB")
to = nt.nodes.new("ShaderNodeTexImage"); to.image = img("shelf_orm.jpg", "Non-Color")
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img("shelf_normal.png", "Non-Color")
sep = nt.nodes.new("ShaderNodeSeparateColor"); nm = nt.nodes.new("ShaderNodeNormalMap")
nt.links.new(tb.outputs["Color"], pb.inputs["Base Color"])
nt.links.new(to.outputs["Color"], sep.inputs["Color"])
nt.links.new(sep.outputs["Green"], pb.inputs["Roughness"]); nt.links.new(sep.outputs["Blue"], pb.inputs["Metallic"])
nt.links.new(tn.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], pb.inputs["Normal"])
# materiali per faccia: etichette prezzo = materiale label (indice 1), il resto acciaio (indice 0)
names = [m.name for m in shelf.data.materials]
for poly in shelf.data.polygons:
    poly.material_index = 1 if names[poly.material_index] == "M_PriceLabel" else 0
shelf.data.materials.clear(); shelf.data.materials.append(steel); shelf.data.materials.append(lab)
# LOD1 (distanza): copia decimata ~0.3
bpy.ops.object.select_all(action="DESELECT"); shelf.select_set(True); bpy.context.view_layer.objects.active = shelf
bpy.ops.object.duplicate(); lod = bpy.context.active_object; lod.name = "SM_Shelf_Unit_LOD1"
dm = lod.modifiers.new("dec", "DECIMATE"); dm.ratio = 0.3
bpy.ops.object.modifier_apply(modifier="dec")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True)
sh = bpy.data.objects["SM_Shelf_Unit"]; sh.data.calc_loop_triangles()
lod.data.calc_loop_triangles(); print("LOD1 tris", len(lod.data.loop_triangles))
print("SHELF tris", len(sh.data.loop_triangles), "dims", tuple(round(d, 3) for d in sh.dimensions))
