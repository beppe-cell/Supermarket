"""Genera i prodotti da scaffale (lattine, bottiglie, barattoli, scatole, buste) con etichette dall'atlante 4x4
(assets/source/labels/labels_atlas_gemini.jpg, ordine celle = id tile). Ogni prodotto usa un RETTANGOLO di etichetta
(ritaglio della zona stampata) mappato sulla parte frontale; lati, fondi e tappi usano il colore di sfondo della cella.
Origine al centro-base, fronte -Y. Uso: python tools/make_products.py <atlas.jpg> <out.glb>"""
import bpy, bmesh, sys, math, os

atlas, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
img = bpy.data.images.load(atlas); img.pack()
AW, AH = img.size
mat = bpy.data.materials.new("M_Products"); mat.use_nodes = True
nt = mat.node_tree; p = nt.nodes["Principled BSDF"]; t = nt.nodes.new("ShaderNodeTexImage"); t.image = img
nt.links.new(t.outputs["Color"], p.inputs["Base Color"]); p.inputs["Roughness"].default_value = 0.5; p.inputs["Metallic"].default_value = 0.0

# Zona stampata di ogni cella (px nell'atlante di riferimento 1024x1024): x0, y0, x1, y1 (origine in alto a sinistra)
RECTS = [(48, 45, 208, 215), (296, 45, 466, 215), (557, 45, 722, 215), (774, 72, 1018, 192),
         (48, 292, 208, 478), (302, 280, 466, 492), (524, 266, 758, 500), (814, 276, 972, 494),
         (44, 532, 212, 748), (302, 574, 466, 740), (560, 568, 720, 742), (824, 524, 970, 764),
         (6, 774, 250, 1018), (294, 792, 462, 1000), (570, 774, 712, 1018), (820, 792, 972, 1002)]
K = AW / 1024.0

def uv_label(tile, u, v):
    x0, y0, x1, y1 = RECTS[tile]
    x = (x0 + u * (x1 - x0)) * K; y = (y0 + (1 - v) * (y1 - y0)) * K
    return (x / AW, 1.0 - y / AH)
def uv_flat(tile):
    return ((tile % 4 * 256 + 5) * K / AW, 1.0 - ((tile // 4) * 256 + 5) * K / AH)

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); me.materials.append(mat)
    for poly in me.polygons: poly.use_smooth = name.split("_")[2] in ("Can", "Bottle", "Jar")
    return o

def lathe(name, profile, seg, tile, label_span, arc=math.pi):
    """Solido di rivoluzione. L'etichetta copre un arco frontale (≤180°) e un'altezza coerente con le proporzioni del ritaglio."""
    r = profile[label_span][0]; h0 = profile[label_span][1]; h1 = profile[label_span + 1][1]
    x0, y0, x1, y1 = RECTS[tile]; aspect = (x1 - x0) / (y1 - y0)
    W = r * arc; H = W / aspect
    if H > h1 - h0: H = h1 - h0; W = H * aspect; arc = W / r
    if H < (h1 - h0) - 1e-6:
        ha = h0 + ((h1 - h0) - H) / 2
        profile = profile[:label_span + 1] + [(r, ha), (r, ha + H)] + profile[label_span + 1:]
        label_span += 1
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    rings = [[bm.verts.new((rr * math.cos(2 * math.pi * i / seg), -rr * math.sin(2 * math.pi * i / seg), h)) for i in range(seg)] if rr > 0 else [bm.verts.new((0, 0, h))] for (rr, h) in profile]
    fc = math.pi / 2
    def delta(i):
        d = 2 * math.pi * i / seg - fc
        while d > math.pi: d -= 2 * math.pi
        while d < -math.pi: d += 2 * math.pi
        return d
    for k in range(len(profile) - 1):
        a, b = rings[k], rings[k + 1]; is_label = (k == label_span)
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1: vs = [a[0], b[j], b[i]]
            elif len(b) == 1: vs = [a[i], a[j], b[0]]
            else: vs = [a[i], a[j], b[j], b[i]]
            try: f = bm.faces.new(vs)
            except ValueError: continue
            in_arc = is_label and len(a) > 1 and len(b) > 1 and abs(delta(i)) <= arc / 2 + 1e-6 and abs(delta(j)) <= arc / 2 + 1e-6
            for loop in f.loops:
                if in_arc:
                    idx = a.index(loop.vert) if loop.vert in a else b.index(loop.vert)
                    hv = (loop.vert.co.z - profile[k][1]) / (profile[k + 1][1] - profile[k][1])
                    loop[uvl].uv = uv_label(tile, 0.5 - delta(idx) / arc, hv)
                else:
                    loop[uvl].uv = uv_flat(tile)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj(name, bm)

def box(name, w, d, h, tile, taper=1.0):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    x, y = w / 2, d / 2
    b = [bm.verts.new((-x, -y, 0)), bm.verts.new((x, -y, 0)), bm.verts.new((x, y, 0)), bm.verts.new((-x, y, 0))]
    tp = [bm.verts.new((-x * taper, -y * taper, h)), bm.verts.new((x * taper, -y * taper, h)), bm.verts.new((x * taper, y * taper, h)), bm.verts.new((-x * taper, y * taper, h))]
    faces = {"front": (b[0], b[1], tp[1], tp[0]), "back": (b[2], b[3], tp[3], tp[2]), "right": (b[1], b[2], tp[2], tp[1]), "left": (b[3], b[0], tp[0], tp[3]), "top": (tp[0], tp[1], tp[2], tp[3]), "bottom": (b[3], b[2], b[1], b[0])}
    quad = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for fname, vs in faces.items():
        f = bm.faces.new(vs)
        for n, loop in enumerate(f.loops):
            loop[uvl].uv = uv_label(tile, *quad[n]) if fname in ("front", "back") else uv_flat(tile)
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
