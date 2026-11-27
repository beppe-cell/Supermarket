"""Verifica automatica delle animazioni del nemico (Blender headless): angoli articolari e compenetrazioni fra parti del corpo.
Uso: python tools/check_anims.py <SM_Infected.glb>  → stampa, per ogni clip, i minimi/massimi e le violazioni."""
import bpy, sys, math
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[-1])
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE"); arm.animation_data_create()
fwd = Vector((0.027, -0.9996, 0))
def H(n): return arm.matrix_world @ arm.pose.bones[n].head
def T(n): return arm.matrix_world @ arm.pose.bones[n].tail
def d(n): return (T(n) - H(n)).normalized()
def seg_dist(a0, a1, b0, b1):
    u, v, w = a1 - a0, b1 - b0, a0 - b0
    a, b, c, dd, e = u.dot(u), u.dot(v), v.dot(v), u.dot(w), v.dot(w)
    D = a * c - b * b; sN, sD, tN, tD = 0.0, D, 0.0, D
    if D < 1e-9: sN, sD, tN, tD = 0.0, 1.0, e, c
    else:
        sN, tN = (b * e - c * dd), (a * e - b * dd)
        if sN < 0: sN, tN, tD = 0.0, e, c
        elif sN > sD: sN, tN, tD = sD, e + b, c
    if tN < 0:
        tN = 0.0; sN, sD = (0.0, 1.0) if -dd < 0 else ((sD, sD) if -dd > a else (-dd, a))
    elif tN > tD:
        tN = tD; sN, sD = (0.0, 1.0) if (-dd + b) < 0 else ((sD, sD) if (-dd + b) > a else (-dd + b, a))
    sc = 0.0 if abs(sN) < 1e-9 else sN / sD; tc = 0.0 if abs(tN) < 1e-9 else tN / tD
    return (w + sc * u - tc * v).length
# (nome, segmento A, segmento B, distanza minima ammessa [m] ≈ somma dei raggi del corpo)
def torso(): return (H("root.x"), H("neck.x"))
PAIRS = []
for sd in ("l", "r"):
    PAIRS += [(f"mano.{sd}-busto", lambda sd=sd: (H(f"hand.{sd}"), T(f"hand.{sd}")), torso, 0.16),
              (f"avambraccio.{sd}-busto", lambda sd=sd: (H(f"forearm_stretch.{sd}"), T(f"forearm_stretch.{sd}")), torso, 0.15),
              (f"mano.{sd}-coscia.{sd}", lambda sd=sd: (H(f"hand.{sd}"), T(f"hand.{sd}")), lambda sd=sd: (H(f"thigh_stretch.{sd}"), T(f"thigh_stretch.{sd}")), 0.09),
              (f"mano.{sd}-testa", lambda sd=sd: (H(f"hand.{sd}"), T(f"hand.{sd}")), lambda: (H("head.x"), T("head.x")), 0.14)]
PAIRS += [("coscia.l-coscia.r", lambda: (H("thigh_stretch.l"), T("thigh_stretch.l")), lambda: (H("thigh_stretch.r"), T("thigh_stretch.r")), 0.11),
          ("gamba.l-gamba.r", lambda: (H("leg_stretch.l"), T("leg_stretch.l")), lambda: (H("leg_stretch.r"), T("leg_stretch.r")), 0.10),
          ("piede.l-piede.r", lambda: (H("foot.l"), T("toes_01.l")), lambda: (H("foot.r"), T("toes_01.r")), 0.09),
          ("mano.l-mano.r", lambda: (H("hand.l"), T("hand.l")), lambda: (H("hand.r"), T("hand.r")), 0.06)]
LIMITS = {"elbow": 150, "knee": 140}
for a in sorted(bpy.data.actions, key=lambda x: x.name):
    arm.animation_data.action = a
    if a.slots: arm.animation_data.action_slot = a.slots[0]
    f0, f1 = int(a.frame_range[0]), int(a.frame_range[1]); worst = {}; ang = {"elbow": 0, "knee": 0, "hyper": 0, "ground": 9}
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f); bpy.context.view_layer.update()
        for name, A, B, lim in PAIRS:
            a0, a1 = A(); b0, b1 = B(); dist = seg_dist(a0, a1, b0, b1)
            if name not in worst or dist < worst[name][0]: worst[name] = (dist, f, lim)
        for sd in ("l", "r"):
            ang["elbow"] = max(ang["elbow"], math.degrees(math.acos(max(-1, min(1, d(f"arm_stretch.{sd}").dot(d(f"forearm_stretch.{sd}")))))))
            ang["knee"] = max(ang["knee"], math.degrees(math.acos(max(-1, min(1, d(f"thigh_stretch.{sd}").dot(d(f"leg_stretch.{sd}")))))))
            hip, k, an = H(f"thigh_stretch.{sd}"), H(f"leg_stretch.{sd}"), H(f"foot.{sd}")
            ang["hyper"] = max(ang["hyper"], -(k - (hip + an) / 2).dot(fwd) * 100)
        ang["ground"] = min(ang["ground"], min(min(H(p.name).z, T(p.name).z) for p in arm.pose.bones))
    bad = [f"{n}={w[0]:.2f}@{w[1]}(<{w[2]})" for n, w in worst.items() if w[0] < w[2]]
    print("ANIM", a.name, "elbow %d knee %d hyper %.1fcm ground %.3f" % (ang["elbow"], ang["knee"], ang["hyper"], ang["ground"]), "| PENETRAZIONI:", bad or "nessuna")
