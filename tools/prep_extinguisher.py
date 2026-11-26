"""Prepara l'estintore (OBJ fornito dall'Art Director): origine al centro della base, decimazione (~3k tri), due materiali PBR
(smalto rosso + metallo per valvola/maniglia/tubo) e staffa a muro sul retro (+Y). Fronte -Y (Blender) = +Z glTF.
Uso: python tools/prep_extinguisher.py <in.obj> <out.glb>"""
import bpy, sys, math, bmesh
from mathutils import Vector

src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=src)
o = next(x for x in bpy.data.objects if x.type == "MESH")
bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = o.data
base = [v.co for v in me.vertices if v.co.z < 0.03]
cx = sum(v.x for v in base) / len(base); cy = sum(v.y for v in base) / len(base); zmin = min(v.co.z for v in me.vertices)
for v in me.vertices: v.co.x -= cx; v.co.y -= cy; v.co.z -= zmin
me.update(); me.calc_loop_triangles(); before = len(me.loop_triangles)
d = o.modifiers.new("dec", "DECIMATE"); d.ratio = 3000 / before
bpy.ops.object.modifier_apply(modifier="dec")
# materiali
red = bpy.data.materials.new("M_ExtRed"); red.use_nodes = True
p = red.node_tree.nodes["Principled BSDF"]; p.inputs["Base Color"].default_value = (0.55, 0.025, 0.03, 1); p.inputs["Metallic"].default_value = 0.25; p.inputs["Roughness"].default_value = 0.32
met = bpy.data.materials.new("M_ExtMetal"); met.use_nodes = True
p = met.node_tree.nodes["Principled BSDF"]; p.inputs["Base Color"].default_value = (0.42, 0.43, 0.45, 1); p.inputs["Metallic"].default_value = 0.9; p.inputs["Roughness"].default_value = 0.32
me.materials.clear(); me.materials.append(red); me.materials.append(met)
H = max(v.co.z for v in me.vertices)
for poly in me.polygons:
    c = poly.center
    top_part = c.z > 0.50 * H or c.x < -0.095                  # valvola, maniglia, tubo flessibile
    poly.material_index = 1 if top_part else 0
    poly.use_smooth = True
# staffa a muro sul retro (+Y) e fascetta
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0, matrix=__import__("mathutils").Matrix.Translation((0, 0.105, 0.30)) @ __import__("mathutils").Matrix.Diagonal((0.07, 0.012, 0.30, 1.0)))
bmesh.ops.create_cube(bm, size=1.0, matrix=__import__("mathutils").Matrix.Translation((0, 0.0, 0.34)) @ __import__("mathutils").Matrix.Diagonal((0.205, 0.205, 0.035, 1.0)))
sm = bpy.data.meshes.new("bracket"); bm.to_mesh(sm); bm.free()
bo = bpy.data.objects.new("bracket", sm); bpy.context.scene.collection.objects.link(bo); sm.materials.append(met)
bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bo.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.object.join()
o.name = "SM_Extinguisher"; o.data.name = "SM_Extinguisher"
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True)
o.data.calc_loop_triangles(); print("EXT tris", before, "->", len(o.data.loop_triangles), "dims", tuple(round(x, 3) for x in o.dimensions))
