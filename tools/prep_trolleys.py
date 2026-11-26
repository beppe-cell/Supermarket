"""Prepara i carrelli (CC-BY, vedi ASSET_REGISTRY T05/T06): unisce le mesh, scala in metri, origine al centro-base,
decima, riduce le texture e esporta GLB. Uso: python tools/prep_trolleys.py <in_dir> <out_dir>"""
import bpy, sys, os
from mathutils import Vector

in_dir, out_dir = sys.argv[-2], sys.argv[-1]
JOBS = [  # file, nome oggetto, altezza target (m), triangoli target, texture max
    ("new_supermarket_trolley.glb", "SM_Trolley", 1.0, 7000, 512),
    ("supermarket_milk_trolley_free.glb", "SM_RollCage", 1.7, 9000, 1024),
]
for fname, outname, height, target, texmax in JOBS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(in_dir, fname))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for o in meshes:
        m = o.matrix_world.copy(); o.parent = None; o.matrix_world = m
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object; ob.name = outname
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    zs = [v.co.z for v in me.vertices]; xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]
    k = height / (max(zs) - min(zs))
    cx, cy, zmin = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs)
    for v in me.vertices:
        v.co.x = (v.co.x - cx) * k; v.co.y = (v.co.y - cy) * k; v.co.z = (v.co.z - zmin) * k
    me.update(); me.calc_loop_triangles(); before = len(me.loop_triangles)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=0.0004); bpy.ops.object.mode_set(mode="OBJECT")
    me.calc_loop_triangles(); cur = len(me.loop_triangles)
    if cur > target:
        d = ob.modifiers.new("dec", "DECIMATE"); d.ratio = target / cur
        bpy.ops.object.modifier_apply(modifier="dec")
    me.calc_loop_triangles()
    for img in bpy.data.images:
        if img.size[0] > texmax: img.scale(texmax, texmax)
    out = os.path.join(out_dir, outname + ".glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True)
    print("TROLLEY", outname, "tris", before, "->", len(me.loop_triangles), "size", tuple(round(d, 2) for d in ob.dimensions), os.path.getsize(out) // 1024, "KB")
