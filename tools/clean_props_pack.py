"""Pulisce il pack AspectStudios (CC-BY): origine al centro-base di ogni pezzo, transform applicati,
tutti i pezzi all'origine (usati come sorgenti per istanze), export GLB Y-up + JSON dimensioni (m).
Uso: python tools/clean_props_pack.py <in.glb> <out.glb> <out.json>"""
import bpy, sys, json
from mathutils import Vector

src, out, out_json = sys.argv[-3:]
KEEP = ["Fridge", "Shelf", "Shelf2", "Rack", "DisplayShelf1", "DisplayShelf2", "Counter", "Counter_Corner",
        "Register", "Box_Open", "Box_Closed", "Snacks1", "Snacks2", "Snacks3", "Snacks4", "Soda1", "Soda2", "Soda3"]
ORIENT = {"Fridge", "Shelf", "Shelf2", "Rack", "DisplayShelf1", "DisplayShelf2", "Counter", "Counter_Corner"}
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = {o.name.replace("_Palette_0", ""): o for o in bpy.data.objects if o.type == "MESH"}
dims = {}
for name in list(meshes):
    o = meshes[name]
    if name not in KEEP:
        bpy.data.objects.remove(o, do_unlink=True)
        continue
    mw = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = mw
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = o.data
    bb = [Vector(c) for c in o.bound_box]
    wx = max(c.x for c in bb) - min(c.x for c in bb); wy = max(c.y for c in bb) - min(c.y for c in bb)
    if name in ORIENT and wy > wx:
        import math
        o.rotation_mode = "XYZ"
        o.rotation_euler = (0, 0, -math.pi / 2)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    cx, cy, zmin = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)
    for v in me.vertices:
        v.co.x -= cx; v.co.y -= cy; v.co.z -= zmin
    o.location = Vector((0, 0, 0))
    o.name = "SM_" + name.replace("-", "_")
    me.calc_loop_triangles()
    dims[o.name] = {"x": round(max(xs) - min(xs), 3), "y": round(max(ys) - min(ys), 3), "z": round(max(zs) - min(zs), 3), "tris": len(me.loop_triangles)}
    o.select_set(False)
for e in [o for o in bpy.data.objects if o.type == "EMPTY"]:
    bpy.data.objects.remove(e, do_unlink=True)
# Adatta la palette al look C: desatura ~70% e tinta fredda (il pack è lowpoly a colori vivaci)
import numpy as np
for img in bpy.data.images:
    if img.size[0] == 0: continue
    px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
    lum = px[:, :3].mean(axis=1, keepdims=True)
    px[:, :3] = (lum * 0.7 + px[:, :3] * 0.3) * np.array([0.92, 0.97, 1.04], dtype=np.float32) * 0.9
    img.pixels.foreach_set(px.ravel()); img.update(); img.pack()
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True)
# dims: x=larghezza, y=profondita (Blender), z=altezza
json.dump(dims, open(out_json, "w"), indent=1)
print("EXPORTED", len(dims), "objects")
