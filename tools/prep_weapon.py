"""Prepara la pistola (Beretta M9, vedi ASSET_REGISTRY T10): scala reale (21.7 cm), canna verso -Y (Blender) = +Z glTF,
origine sull'impugnatura, materiale PBR da m9_*.jpg/png. Scrive anche il punto della bocca di fuoco (JSON, coordinate glTF).
Uso: python tools/prep_weapon.py <in.fbx> <tex_dir> <out.glb> <out.json>"""
import bpy, sys, os, json, math
from mathutils import Vector

fbx, tex, out, out_json = sys.argv[-4:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=fbx)
o = [x for x in bpy.data.objects if x.type == "MESH"][0]
bpy.context.view_layer.objects.active = o; o.select_set(True)
o.animation_data_clear()
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = o.data
ys = [v.co.y for v in me.vertices]; k = 0.217 / (max(ys) - min(ys))     # lunghezza reale M9
for v in me.vertices: v.co *= k
# canna +Y -> -Y (ruota 180° attorno a Z)
for v in me.vertices: v.co.x, v.co.y = -v.co.x, -v.co.y
zs = [v.co.z for v in me.vertices]; ys = [v.co.y for v in me.vertices]
zmin, zmax = min(zs), max(zs)
grip = [v for v in me.vertices if v.co.z < zmin + 0.35 * (zmax - zmin)]
gy = sum(v.co.y for v in grip) / len(grip); gz = zmin + 0.45 * (zmax - zmin)      # impugnatura = origine
for v in me.vertices: v.co.y -= gy; v.co.z -= gz
tip = min(me.vertices, key=lambda v: v.co.y)                                         # bocca: Y più negativo
muzzle_b = Vector((0.0, tip.co.y, tip.co.z))
me.update()
# materiale PBR
m = bpy.data.materials.new("M_M9"); m.use_nodes = True
nt = m.node_tree; pb = nt.nodes["Principled BSDF"]
def img(n, cs):
    i = bpy.data.images.load(os.path.join(tex, n)); i.colorspace_settings.name = cs; i.pack(); return i
tb = nt.nodes.new("ShaderNodeTexImage"); tb.image = img("m9_albedo.jpg", "sRGB")
to = nt.nodes.new("ShaderNodeTexImage"); to.image = img("m9_orm.jpg", "Non-Color")
tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img("m9_normal.png", "Non-Color")
sep = nt.nodes.new("ShaderNodeSeparateColor"); nm = nt.nodes.new("ShaderNodeNormalMap")
nt.links.new(tb.outputs["Color"], pb.inputs["Base Color"]); nt.links.new(to.outputs["Color"], sep.inputs["Color"])
nt.links.new(sep.outputs["Green"], pb.inputs["Roughness"]); nt.links.new(sep.outputs["Blue"], pb.inputs["Metallic"])
nt.links.new(tn.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], pb.inputs["Normal"])
me.materials.clear(); me.materials.append(m)
o.name = "SM_Pistol_M9"; me.name = "SM_Pistol_M9"
bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True)
me.calc_loop_triangles()
# coordinate glTF: (x, z, -y)
json.dump({"muzzle": [round(muzzle_b.x, 4), round(muzzle_b.z, 4), round(-muzzle_b.y, 4)], "length": 0.217}, open(out_json, "w"))
print("WEAPON tris", len(me.loop_triangles), "dims", tuple(round(d, 3) for d in o.dimensions), "muzzle(gltf)", [round(muzzle_b.x, 3), round(muzzle_b.z, 3), round(-muzzle_b.y, 3)])
