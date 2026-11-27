"""Verifica sulla MESH deformata (non sulle ossa): quota minima dei vertici per ogni clip. Uso: python tools/check_mesh_ground.py <SM_Infected.glb>"""
import bpy, sys
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); ob = bpy.data.objects["SM_Infected"]; arm.animation_data_create()
for a in sorted(bpy.data.actions, key=lambda x: x.name):
    arm.animation_data.action = a
    if a.slots: arm.animation_data.action_slot = a.slots[0]
    f0, f1 = int(a.frame_range[0]), int(a.frame_range[1]); lo = (9, 0)
    for f in range(f0, f1 + 1, 2):
        bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
        z = min((ev.matrix_world @ v.co).z for v in m.vertices); ev.to_mesh_clear()
        if z < lo[0]: lo = (z, f)
    print("MESHGROUND", a.name, "min z %.3f @ frame %d" % lo)
