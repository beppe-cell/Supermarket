"""Genera i prodotti da scaffale (lattine, bottiglie, scatole, buste, barattoli) con etichette INVENTATE dall'atlante
assets/source/labels_atlas.png. Origine al centro-base, fronte -Y. Uso: python tools/make_products.py <atlas.png> <out.glb>"""
import bpy, bmesh, sys, math, os

atlas, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
img = bpy.data.images.load(atlas); img.pack()
mat = bpy.data.materials.new("M_Products"); mat.use_nodes = True
nt = mat.node_tree; p = nt.nodes["Principled BSDF"]; t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
nt.links.new(t.outputs["Color"], p.inputs["Base Color"]); p.inputs["Roughness"].default_value = 0.5; p.inputs["Metallic"].default_value = 0.0

def tile_uv(tile, u, v):
    """u,v in [0,1] dentro il tile -> UV atlas (origine in basso)."""
    col, row = tile % 4, tile // 4
    return ((col + u) / 4.0, 1.0 - (row + 1 - v) / 4.0 - 0.0)

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); me.materials.append(mat)
    for poly in me.polygons: poly.use_smooth = name.split("_")[2] in ("Can", "Bottle", "Jar")
    return o

def lathe(name, profile, seg, tile, label_span):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    rings = []
    for (r, h) in profile:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * i / seg), -r * math.sin(2 * math.pi * i / seg), h)) for i in range(seg)] if r > 0 else [bm.verts.new((0, 0, h))]
        rings.append(ring)
    for k in range(len(profile) - 1):
        a, b = rings[k], rings[k + 1]
        is_label = (k == label_span)
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1: vs = [a[0], b[j], b[i]]
            elif len(b) == 1: vs = [a[i], a[j], b[0]]
            else: vs = [a[i], a[j], b[j], b[i]]
            try: f = bm.faces.new(vs)
            except ValueError: continue
            for loop in f.loops:
                vi = loop.vert
                if is_label and len(a) > 1 and len(b) > 1:
                    idx = a.index(vi) if vi in a else b.index(vi)
                    frac = (idx / seg) if not (idx == 0 and i == seg - 1) else 1.0
                    hv = (vi.co.z - profile[k][1]) / (profile[k + 1][1] - profile[k][1])
                    loop[uvl].uv = tile_uv(tile, 0.0625 + 0.9375 * (1 - frac), hv)
                else:
                    loop[uvl].uv = tile_uv(tile, 0.02, 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def box(name, w, d, h, tile, taper=1.0):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    x, y = w / 2, d / 2
    def vtx(px, py, pz): s = taper if pz > 0 else 1.0; return bm.verts.new((px * s, py * s if pz > 0 else py, pz))
    b = [bm.verts.new((-x, -y, 0)), bm.verts.new((x, -y, 0)), bm.verts.new((x, y, 0)), bm.verts.new((-x, y, 0))]
    tp = [bm.verts.new((-x * taper, -y * taper, h)), bm.verts.new((x * taper, -y * taper, h)), bm.verts.new((x * taper, y * taper, h)), bm.verts.new((-x * taper, y * taper, h))]
    faces = {"front": (b[0], b[1], tp[1], tp[0]), "back": (b[2], b[3], tp[3], tp[2]), "right": (b[1], b[2], tp[2], tp[1]), "left": (b[3], b[0], tp[0], tp[3]), "top": (tp[0], tp[1], tp[2], tp[3]), "bottom": (b[3], b[2], b[1], b[0])}
    quad = [(0.0625, 0), (1, 0), (1, 1), (0.0625, 1)]
    for fname, vs in faces.items():
        f = bm.faces.new(vs)
        for n, loop in enumerate(f.loops):
            if fname == "front": uv = quad[n]
            elif fname == "back": uv = quad[n]
            else: uv = (0.02, 0.5)
            loop[uvl].uv = tile_uv(tile, *uv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

CAN = [(0, 0), (0.030, 0), (0.033, 0.004), (0.033, 0.118), (0.030, 0.122), (0, 0.122)]
BOTTLE = [(0, 0), (0.028, 0), (0.0325, 0.006), (0.0325, 0.14), (0.026, 0.17), (0.012, 0.19), (0.012, 0.225), (0.014, 0.228), (0.014, 0.24), (0, 0.24)]
JAR = [(0, 0), (0.034, 0), (0.0375, 0.004), (0.0375, 0.085), (0.034, 0.09), (0.032, 0.095), (0.032, 0.11), (0, 0.11)]
objs = []
for tile in (0, 1, 2): objs.append(lathe(f"SM_P_Can_{tile}", CAN, 12, tile, 2))
for tile in (3, 4, 14): objs.append(lathe(f"SM_P_Bottle_{tile}", BOTTLE, 12, tile, 2))
for tile in (9, 10): objs.append(lathe(f"SM_P_Jar_{tile}", JAR, 12, tile, 2))
for tile in (5, 6, 13): objs.append(box(f"SM_P_Cereal_{tile}", 0.20, 0.07, 0.30, tile))
for tile in (7, 8, 15): objs.append(box(f"SM_P_Bag_{tile}", 0.20, 0.05, 0.28, tile, 0.85))
objs.append(box("SM_P_Carton_11", 0.07, 0.07, 0.24, 11))
objs.append(box("SM_P_Pasta_12", 0.10, 0.04, 0.26, 12))
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_yup=True, export_apply=True)
for o in objs:
    o.data.calc_loop_triangles(); print("PROD", o.name, len(o.data.loop_triangles))
