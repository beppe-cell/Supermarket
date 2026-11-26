"""Animazioni procedurali "umane" per rig con ossa tipo Rigify/ARP ridotto (root.x=bacino, spine_01..03.x, neck.x, head.x,
shoulder/arm_stretch/forearm_stretch/hand, thigh_stretch/leg_stretch/foot/toes_01, suffisso .l/.r).

Tutte le rotazioni sono espresse in assi MONDO del personaggio (avanti / su / destra) e convertite nel sistema locale dell'osso, quindi non
dipendono dal roll delle ossa. La camminata/corsa usa curve articolari ricavate dalla biomeccanica (anca, ginocchio con picco di carico e di
oscillazione, caviglia con tallone-punta), rotazione/inclinazione del bacino, controrotazione del torace, braccia in opposizione, testa
stabilizzata, e il bacino viene sempre abbassato/alzato in modo che il piede d'appoggio tocchi il pavimento. Variante "infetto": postura curva,
testa piegata, braccia pendenti.
Uso: build_animations(arm, arm_drop_deg) -> {"walk": m/s, "run": m/s} (velocità di riferimento per sincronizzare i piedi)."""
import bpy, math
from mathutils import Vector, Quaternion

def build_animations(arm, arm_drop_deg=None):
    sc = bpy.context.scene; sc.render.fps = 24
    for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"
    def upd(): bpy.context.view_layer.update()
    def reset():
        for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
        upd()
    reset()
    def wh(n): return arm.matrix_world @ arm.pose.bones[n].head
    def wt(n): return arm.matrix_world @ arm.pose.bones[n].tail
    MW = arm.matrix_world.to_quaternion().to_matrix()

    fwd = wt("toes_01.l") - wh("foot.l"); fwd.z = 0; fwd.normalize()
    up = Vector((0, 0, 1)); right = fwd.cross(up).normalized(); left = -right
    # il lato "l" è davvero a sinistra?
    SL = 1.0 if (wh("foot.l") - wh("foot.r")).dot(left) > 0 else -1.0
    SIDE = {"l": SL, "r": -SL}
    print("FWD", tuple(fwd), "LEFT-is-.l", SL > 0)

    # orientamento di riposo di ogni osso in coordinate mondo (con il pose a zero)
    REST = {pb.name: (arm.matrix_world @ pb.bone.matrix_local).to_quaternion().to_matrix() for pb in arm.pose.bones}
    def rotw(bone, axis, ang_deg):
        """Compone una rotazione di ang_deg gradi attorno all'asse MONDO `axis` (regola della mano destra) sull'osso.
        Tiene conto della posa già applicata ai genitori (altrimenti, p.es., il gomito dopo l'abbassamento del braccio ruoterebbe attorno
        a un asse sbagliato e l'avambraccio si torcerebbe invece di piegarsi)."""
        pb = arm.pose.bones[bone]; par = pb.parent
        if par is not None:
            upd()
            Wp = (arm.matrix_world @ par.matrix).to_quaternion().to_matrix() @ REST[par.name].inverted()
            axis = Wp.inverted() @ axis
        a = (REST[bone].inverted() @ axis).normalized()
        pb.rotation_quaternion = Quaternion(a, math.radians(ang_deg)) @ pb.rotation_quaternion
    def flex(bone, deg): rotw(bone, right, deg)                 # + = l'estremità distale va in AVANTI (piede: punta in su)
    def tilt(bone, deg): rotw(bone, right, -deg)                # per ossa che puntano in SU (spina, collo, testa): + = si piega in AVANTI
    def yaw(bone, deg): rotw(bone, up, deg)                     # + = gira verso sinistra
    def roll(bone, deg): rotw(bone, fwd, deg)                   # + = l'estremità distale va a sinistra (inclinazione laterale)
    def abd(bone, sd, deg): rotw(bone, fwd, SIDE[sd] * deg)     # + = allontana l'arto dal corpo
    def shift(bone, vec):
        pb = arm.pose.bones[bone]; m = REST[bone].inverted(); pb.location = pb.location + m @ vec

    def cr(table, t):
        """Spline Catmull-Rom periodica su [(fase 0..1, valore)], fase t."""
        t %= 1.0; n = len(table)
        for i in range(n):
            t0, v0 = table[i]; t1, v1 = table[(i + 1) % n]
            if i == n - 1: t1 += 1.0
            if t0 <= t < t1 or i == n - 1:
                tm, vm = table[(i - 1) % n]; tp, vp = table[(i + 2) % n]
                if i == 0: tm -= 1.0
                if (i + 2) >= n: tp += 1.0
                if i == n - 1: tt = t if t >= t0 else t + 1.0
                else: tt = t
                u = (tt - t0) / (t1 - t0)
                m0 = (v1 - vm) / (t1 - tm) * (t1 - t0); m1 = (vp - v0) / (tp - t0) * (t1 - t0)
                u2, u3 = u * u, u * u * u
                return (2*u3 - 3*u2 + 1) * v0 + (u3 - 2*u2 + u) * m0 + (-2*u3 + 3*u2) * v1 + (u3 - u2) * m1
        return table[0][1]
    def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
    def ease(t, a, b): return smooth((t - a) / (b - a))

    # --- postura base "infetto": spalle cadenti, schiena curva, testa piegata, braccia lungo i fianchi con gomiti flessi ----------------
    arm_dir = (wt("arm_stretch.l") - wh("arm_stretch.l")).normalized()
    DROP = {}
    for sd in ("l", "r"):
        cur = (wh(f"hand.{sd}") - wh(f"arm_stretch.{sd}")).normalized()
        tgt = (-up * 0.985 + fwd * 0.08 + (left if SIDE[sd] > 0 else right) * 0.06).normalized()
        DROP[sd] = cur.rotation_difference(tgt)               # rotazione mondo che porta il braccio da T/A-pose a "giù"
    def base_pose(slump=1.0):
        for sd in ("l", "r"):
            pb = arm.pose.bones[f"arm_stretch.{sd}"]
            q = (REST[pb.name].inverted() @ DROP[sd].to_matrix()) @ REST[pb.name]
            pb.rotation_quaternion = pb.rotation_quaternion @ q.to_quaternion()
        tilt("spine_01.x", 4 * slump); tilt("spine_03.x", 5 * slump); tilt("neck.x", 9 * slump)
        roll("head.x", -6 * slump)                          # testa leggermente piegata di lato

    # punti della suola (tallone, avampiede, punta) agganciati alle ossa, nel riferimento locale dell'osso
    def _local(bone, P):
        return (arm.matrix_world @ arm.pose.bones[bone].matrix).inverted() @ P
    SOLE = []
    for sd in ("l", "r"):
        ank = wh(f"foot.{sd}"); ball = wh(f"toes_01.{sd}"); tip = wt(f"toes_01.{sd}")
        SOLE += [(f"foot.{sd}", _local(f"foot.{sd}", Vector((ank.x, ank.y, 0.0)) - fwd * 0.05)),         # tallone: sotto la caviglia, un po' dietro
                 (f"foot.{sd}", _local(f"foot.{sd}", ball - up * 0.025)), (f"toes_01.{sd}", _local(f"toes_01.{sd}", tip - up * 0.015))]
    def sole_z(sd=None):
        zs = []
        for i, (bn, Lp) in enumerate(SOLE):
            if sd is not None and bn.split(".")[-1] != sd: continue
            zs.append(((arm.matrix_world @ arm.pose.bones[bn].matrix) @ Lp).z)
        return zs
    def lowest(): return min(sole_z())
    GROUND = lowest()

    def ground(clearance=0.0):
        """Alza/abbassa il bacino finché il punto più basso dei piedi è a terra (+clearance)."""
        upd(); dz = GROUND + clearance - lowest(); shift("root.x", up * dz); upd()

    def make_action(name, frames, pose_fn, slump=1.0):
        rec, touched = [], set()
        for f in range(frames + 1):
            reset(); base_pose(slump); pose_fn(f / frames, f, frames); cur = {}
            for pb in arm.pose.bones:
                q, l = tuple(pb.rotation_quaternion), tuple(pb.location)
                if abs(q[0] - 1) > 1e-7 or any(abs(v) > 1e-7 for v in q[1:] + l): cur[pb.name] = (q, l); touched.add(pb.name)
            rec.append(cur)
        act = bpy.data.actions.new(name); act.use_fake_user = True
        arm.animation_data_create(); arm.animation_data.action = act
        for f, cur in enumerate(rec):
            for bn in touched:
                pb = arm.pose.bones[bn]; q, l = cur.get(bn, ((1, 0, 0, 0), (0, 0, 0)))
                pb.rotation_quaternion = q; pb.location = l
                pb.keyframe_insert("rotation_quaternion", frame=f + 1); pb.keyframe_insert("location", frame=f + 1)
        reset(); return act

    # ---------------------------------------------------------------------------------------------------------------------------
    # CICLO DI CAMMINATA (fase 0 = contatto del tallone sinistro). Curve in gradi; il piede destro è sfasato di mezzo ciclo.
    HIP = [(0.00, 24), (0.12, 19), (0.30, 4), (0.50, -12), (0.62, -9), (0.78, 8), (0.90, 20)]
    KNEE = [(0.00, 4), (0.10, 15), (0.28, 7), (0.45, 9), (0.60, 38), (0.72, 60), (0.84, 40), (0.94, 12)]
    ANKLE = [(0.00, 3), (0.08, -7), (0.28, 5), (0.46, 9), (0.60, -15), (0.70, -9), (0.84, 2), (0.94, 4)]
    def gait(ph, k_hip, k_knee, bob, lean, elbow, arm_sw, pelv_yaw, pelv_obl, torso_ctr, shoulder_sway, lift, arm_bias, head_roll, flight=0.0):
        for sd, off in (("l", 0.0), ("r", 0.5)):
            p = ph + off
            flex(f"thigh_stretch.{sd}", cr(HIP, p) * k_hip)
            flex(f"leg_stretch.{sd}", -cr(KNEE, p) * k_knee)
            flex(f"foot.{sd}", cr(ANKLE, p) * (0.8 + 0.2 * k_hip) )
            # braccia in opposizione alle gambe: avanti quando la gamba opposta è avanti
            c = math.cos(2 * math.pi * (p + 0.5))                     # + = braccio avanti
            fwd_amt = c
            flex(f"arm_stretch.{sd}", arm_bias + arm_sw * fwd_amt)
            flex(f"forearm_stretch.{sd}", elbow + elbow * 0.45 * max(0.0, fwd_amt) + 6)
            abd(f"arm_stretch.{sd}", sd, 3 + 2 * abs(fwd_amt))
        s = math.cos(2 * math.pi * ph); sn = math.sin(2 * math.pi * ph)
        yaw("root.x", -pelv_yaw * s)                                    # a tallone sinistro a terra l'anca sinistra è avanti (bacino ruota a destra)
        roll("root.x", pelv_obl * sn)                                   # basculamento: scende il lato della gamba in volo
        yaw("spine_01.x", torso_ctr * 0.4 * s); yaw("spine_02.x", torso_ctr * 0.6 * s); yaw("spine_03.x", torso_ctr * 0.5 * s)   # controrotazione torace
        roll("spine_02.x", -pelv_obl * 0.8 * sn)
        tilt("spine_01.x", lean * 0.6); tilt("spine_02.x", lean * 0.4)
        yaw("head.x", (pelv_yaw - torso_ctr * 1.5) * s * 0.9)           # la testa resta ferma nello spazio
        roll("head.x", head_roll * math.sin(2 * math.pi * ph * 2))
        shift("root.x", right * (-shoulder_sway * sn))   # sposta il peso sul piede d'appoggio
        ground(lift * (0.5 + 0.5 * math.cos(4 * math.pi * ph)) if flight else 0.0)
    def walk(ph, f, n): gait(ph, 0.9, 0.95, 0, 4, 10, 17, 4.5, 2.6, 5.5, 0.018, 0, 6, 1.2)
    def run(ph, f, n): gait(ph, 1.45, 1.55, 0, 16, 52, 38, 8, 3, 9, 0.012, 0.05, 6, 1.5, flight=1.0)

    # ---------------------------------------------------------------------------------------------------------------------------
    def idle(ph, f, n):
        b = math.sin(2 * math.pi * ph)                                   # respiro
        shiftw = math.sin(2 * math.pi * ph)                              # spostamento del peso da un piede all'altro (un ciclo ≈ 4 s)
        tilt("spine_03.x", 1.3 * b); tilt("spine_02.x", 0.8 * b); tilt("neck.x", -0.8 * b)
        abd("arm_stretch.l", "l", 1.5 * b); abd("arm_stretch.r", "r", 1.5 * b)           # le spalle si aprono un po' inspirando
        roll("root.x", 1.8 * shiftw); roll("spine_02.x", -1.2 * shiftw); roll("head.x", 0.8 * shiftw)
        shift("root.x", right * (0.018 * shiftw))
        flex("leg_stretch.l", -(4 + 3 * max(0.0, -shiftw))); flex("leg_stretch.r", -(4 + 3 * max(0.0, shiftw)))
        flex("thigh_stretch.l", 2 + 1.5 * max(0.0, -shiftw)); flex("thigh_stretch.r", 2 + 1.5 * max(0.0, shiftw))
        for sd, k in (("l", 0.0), ("r", 0.7)):
            flex(f"arm_stretch.{sd}", 3 + 1.8 * math.sin(2 * math.pi * ph + k + 1.0))
            flex(f"forearm_stretch.{sd}", 14 + 3 * math.sin(2 * math.pi * ph + k + 1.6))
        yaw("head.x", 2.5 * math.sin(2 * math.pi * ph * 2 + 0.4)); tilt("head.x", 1.2 * math.sin(2 * math.pi * ph * 3 + 1.1))
        ground()
    SCAN = [(0.00, 0), (0.14, 0), (0.30, 46), (0.44, 48), (0.56, 0), (0.64, -3), (0.80, -50), (0.92, -48)]      # gradi di rotazione della testa
    def scan(ph, f, n):
        idle(ph, f, n)
        a = cr(SCAN, ph)
        yaw("head.x", a * 0.62); yaw("neck.x", a * 0.2); yaw("spine_03.x", a * 0.14); yaw("spine_02.x", a * 0.1); yaw("root.x", a * 0.06)
        roll("head.x", -a * 0.06); tilt("head.x", -2 * abs(a) / 48.0)
        ground()
    def hit(ph, f, n):
        env = ease(ph, 0.0, 0.2) * (1 - ease(ph, 0.2, 1.0))
        env2 = ease(ph, 0.05, 0.3) * (1 - ease(ph, 0.3, 1.0))
        tilt("spine_01.x", -9 * env); tilt("spine_02.x", -9 * env); tilt("spine_03.x", -7 * env); tilt("neck.x", -14 * env2)
        yaw("spine_02.x", 8 * env); yaw("head.x", -10 * env2)
        for sd in ("l", "r"):
            flex(f"arm_stretch.{sd}", 28 * env); flex(f"forearm_stretch.{sd}", 35 * env); abd(f"arm_stretch.{sd}", sd, 14 * env)
        flex("thigh_stretch.l", 10 * env); flex("leg_stretch.l", -16 * env); flex("thigh_stretch.r", -6 * env); flex("leg_stretch.r", -12 * env)
        shift("root.x", fwd * (-0.05 * env))
        ground()
    def attack(ph, f, n):
        # aggressione dell'infetto: carica indietro il busto e le braccia, poi scatta in avanti afferrando/graffiando con entrambe le braccia
        # tese davanti a sé (altezza petto, mai sopra la testa); impatto ≈ fase 0.46
        wind = ease(ph, 0.0, 0.30) * (1 - ease(ph, 0.34, 0.44))
        strike = ease(ph, 0.34, 0.46) * (1 - ease(ph, 0.56, 0.95))
        for sd, k in (("r", 1.0), ("l", 0.85)):
            flex(f"arm_stretch.{sd}", -22 * wind + 95 * k * strike)
            flex(f"forearm_stretch.{sd}", 75 * wind + 14 * strike); abd(f"arm_stretch.{sd}", sd, 10 * wind + 6 * strike)
        tilt("spine_01.x", -7 * wind + 12 * strike); tilt("spine_02.x", -8 * wind + 14 * strike); tilt("spine_03.x", -5 * wind + 10 * strike)
        tilt("neck.x", -3 * wind + 14 * strike); tilt("head.x", 6 * strike)
        yaw("spine_02.x", 9 * wind - 7 * strike); yaw("root.x", 3 * wind - 3 * strike)
        flex("thigh_stretch.l", 28 * strike - 4 * wind); flex("leg_stretch.l", -(16 * strike + 8 * wind))
        flex("thigh_stretch.r", -14 * strike + 4 * wind); flex("leg_stretch.r", -(12 * strike + 4 * wind)); flex("foot.r", 8 * strike)
        shift("root.x", fwd * (0.18 * strike - 0.05 * wind))
        ground()
    def death(ph, f, n):
        # colpo: sussulto -> le ginocchia cedono -> il corpo cade all'indietro -> si assesta a terra
        jerk = math.sin(math.pi * min(1.0, ph / 0.16)) if ph < 0.16 else 0.0
        buck = ease(ph, 0.08, 0.40); fall = ease(ph, 0.28, 0.68); settle = math.sin(max(0.0, ph - 0.7) / 0.3 * math.pi * 2) * (1 - ease(ph, 0.7, 1.0))
        tilt("spine_01.x", -12 * jerk); tilt("spine_03.x", -10 * jerk); tilt("neck.x", -18 * jerk - 12 * fall)
        flex("thigh_stretch.l", 38 * buck); flex("leg_stretch.l", -(78 * buck)); flex("thigh_stretch.r", 30 * buck); flex("leg_stretch.r", -(70 * buck))
        flex("foot.l", -20 * buck); flex("foot.r", -16 * buck)
        flex("root.x", 84 * fall - 1.5 * settle); yaw("root.x", 14 * fall); roll("root.x", 6 * fall)
        for sd, k in (("l", 1), ("r", -1)):
            flex(f"arm_stretch.{sd}", 55 * math.sin(min(1.0, ph * 2.2) * math.pi) * (1 - fall * 0.5) + 20 * fall * k)
            flex(f"forearm_stretch.{sd}", 35 * (1 - fall) + 12 * fall); abd(f"arm_stretch.{sd}", sd, 22 * fall)
        yaw("head.x", 14 * fall * SL)
        # il corpo ha uno spessore: la schiena resta ~10 cm sopra il punto più basso degli ossi quando è sdraiato
        upd()
        low = min(min(wh(pb.name).z, wt(pb.name).z) for pb in arm.pose.bones)
        shift("root.x", up * (GROUND + 0.11 * fall - low)); upd()

    def aim_base(ph):
        """Posa di tiro a due mani: braccio destro teso verso il bersaglio con la pistola, sinistro piegato a sostenere, busto di tre quarti."""
        b = math.sin(2 * math.pi * ph)
        flex("arm_stretch.r", 88 + 0.8 * b); flex("forearm_stretch.r", 6); abd("arm_stretch.r", "r", -2); yaw("arm_stretch.r", 17)
        flex("arm_stretch.l", 74 + 0.6 * b); flex("forearm_stretch.l", 20); yaw("arm_stretch.l", -20)
        yaw("root.x", -6); yaw("spine_02.x", -8); yaw("spine_03.x", -4); tilt("spine_02.x", 3); tilt("neck.x", -10); tilt("head.x", -3); roll("head.x", 6)
        flex("thigh_stretch.l", 12); flex("leg_stretch.l", -9); flex("thigh_stretch.r", -9); flex("leg_stretch.r", -7)
        roll("spine_02.x", 0.6 * b); tilt("spine_03.x", 0.6 * b)
    def aim(ph, f, n):
        aim_base(ph); ground()
    def fire(ph, f, n):
        aim_base(0.0)
        e = (ph / 0.15 if ph < 0.15 else (1 - ph) ** 2 / (0.85 ** 2)) if ph > 0 else 0.0
        flex("arm_stretch.r", 10 * e); flex("forearm_stretch.r", 7 * e); flex("arm_stretch.l", 6 * e)
        tilt("spine_02.x", -3 * e); tilt("spine_03.x", -3 * e); tilt("neck.x", 2 * e); shift("root.x", fwd * (-0.015 * e))
        ground()

    make_action("Idle", 96, idle); make_action("Scan", 120, scan)
    make_action("Walk", 26, walk); make_action("Run", 18, run)
    make_action("Aim", 48, aim); make_action("Fire", 10, fire); make_action("Attack", 30, attack); make_action("Hit", 14, hit); make_action("Death", 48, death)

    # velocità di riferimento (m/s): velocità all'indietro (rispetto al bacino) del piede mentre è a terra = velocità di avanzamento del corpo
    def stride_speed(action_name, n):
        act = bpy.data.actions[action_name]; arm.animation_data.action = act
        if getattr(act, "slots", None) and len(act.slots): arm.animation_data.action_slot = act.slots[0]
        pos, gr = [], []
        for f in range(1, n + 2):
            sc.frame_set(f); upd(); row = {}; g = {}
            for sd in ("l", "r"):
                row[sd] = (wh(f"toes_01.{sd}") - wh("root.x")).dot(fwd)
                g[sd] = min(sole_z(sd)) < GROUND + 0.03
            pos.append(row); gr.append(g)
        vs = []
        for i in range(n):
            for sd in ("l", "r"):
                if gr[i][sd] and gr[i + 1][sd]: vs.append((pos[i][sd] - pos[i + 1][sd]) * 24.0)
        vs = sorted(v for v in vs if v > 0.2)                    # il piede in volo che sfiora il suolo va in avanti: scartato
        return vs[len(vs) // 2] if vs else 0.0                    # mediana (il rotolamento del tallone ha picchi)
    SPEEDS = {"walk": round(stride_speed("Walk", 26), 3), "run": round(stride_speed("Run", 18), 3)}
    print("SPEEDS", SPEEDS)
    reset(); arm.animation_data.action = bpy.data.actions["Idle"]
    return SPEEDS
