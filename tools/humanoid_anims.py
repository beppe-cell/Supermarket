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
    def gait(ph, k_hip, k_knee, bob, lean, elbow, arm_sw, pelv_yaw, pelv_obl, torso_ctr, shoulder_sway, lift, arm_bias, head_roll, flight=0.0, limp=0.0, head_drop=0.0, arm_asym=0.0):
        for sd, off in (("l", 0.0), ("r", 0.5)):
            p = ph + off
            w = (1 - 0.34 * limp) if sd == "l" else 1.0                 # gamba sinistra "debole": passo corto, ginocchio meno flesso, piede che striscia
            flex(f"thigh_stretch.{sd}", cr(HIP, p) * k_hip * w)
            flex(f"leg_stretch.{sd}", -cr(KNEE, p) * k_knee * (w if sd == "l" else 1.0))
            flex(f"foot.{sd}", cr(ANKLE, p) * (0.8 + 0.2 * k_hip) - (9 * limp * max(0.0, math.sin(2 * math.pi * p)) if sd == "l" else 0.0))
            # braccia in opposizione alle gambe: avanti quando la gamba opposta è avanti
            c = math.cos(2 * math.pi * (p + 0.5))                     # + = braccio avanti
            fwd_amt = c
            asym = (1 - arm_asym) if sd == "r" else 1.0                  # braccio destro più pendente e meno mosso
            flex(f"arm_stretch.{sd}", arm_bias + (14 * arm_asym if sd == "r" else 0) + arm_sw * fwd_amt * asym)
            flex(f"forearm_stretch.{sd}", elbow + elbow * 0.45 * max(0.0, fwd_amt) * asym + 6 + (22 * arm_asym if sd == "r" else 0))
            abd(f"arm_stretch.{sd}", sd, 3 + 2 * abs(fwd_amt))
        s = math.cos(2 * math.pi * ph); sn = math.sin(2 * math.pi * ph)
        yaw("root.x", -pelv_yaw * s)                                    # a tallone sinistro a terra l'anca sinistra è avanti (bacino ruota a destra)
        roll("root.x", pelv_obl * sn)                                   # basculamento: scende il lato della gamba in volo
        yaw("spine_01.x", torso_ctr * 0.4 * s); yaw("spine_02.x", torso_ctr * 0.6 * s); yaw("spine_03.x", torso_ctr * 0.5 * s)   # controrotazione torace
        roll("spine_02.x", -pelv_obl * 0.8 * sn)
        tilt("spine_01.x", lean * 0.6); tilt("spine_02.x", lean * 0.4)
        yaw("head.x", (pelv_yaw - torso_ctr * 1.5) * s * 0.9)           # la testa resta ferma nello spazio
        roll("head.x", head_roll * math.sin(2 * math.pi * ph * 2) + head_drop * 0.9 * math.sin(2 * math.pi * ph + 0.7))
        tilt("neck.x", head_drop * 1.4); roll("root.x", 3.5 * limp * math.sin(2 * math.pi * ph + 1.2))
        shift("root.x", right * (-shoulder_sway * sn))   # sposta il peso sul piede d'appoggio
        ground(lift * (0.5 + 0.5 * math.cos(4 * math.pi * ph)) if flight else 0.0)
    def walk(ph, f, n): gait(ph, 0.9, 0.95, 0, 4, 10, 17, 4.5, 2.6, 5.5, 0.018, 0, 6, 1.2)
    def run(ph, f, n): gait(ph, 1.45, 1.55, 0, 16, 52, 38, 8, 3, 9, 0.012, 0.05, 6, 1.5, flight=1.0)
    def shamble(ph, f, n): gait(ph, 0.78, 0.8, 0, 13, 14, 12, 5.5, 4.0, 4.0, 0.03, 0, 10, 2.5, limp=1.0, head_drop=7, arm_asym=0.55)

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

    def swipe(ph, f, n):
        # graffio laterale con il braccio destro: carica verso l'esterno e indietro, poi spazza davanti al busto da destra a sinistra (impatto ≈ fase 0.46)
        wind = ease(ph, 0.0, 0.30) * (1 - ease(ph, 0.34, 0.44))
        strike = ease(ph, 0.34, 0.47) * (1 - ease(ph, 0.56, 0.95))
        back = ease(ph, 0.0, 0.30) * (1 - ease(ph, 0.34, 0.47))
        flex("arm_stretch.r", -28 * back + 78 * strike); abd("arm_stretch.r", "r", 46 * back - 6 * strike); yaw("arm_stretch.r", -10 * back + 16 * strike)
        flex("forearm_stretch.r", 70 * back + 24 * strike)
        flex("arm_stretch.l", -14 * back + 28 * strike); flex("forearm_stretch.l", 30 + 10 * strike)
        yaw("spine_02.x", -22 * back + 20 * strike); yaw("spine_03.x", -10 * back + 12 * strike); yaw("root.x", -8 * back + 10 * strike); yaw("head.x", 8 * back - 12 * strike)
        tilt("spine_01.x", -4 * back + 10 * strike); tilt("spine_02.x", -4 * back + 12 * strike); tilt("neck.x", 4 * strike)
        flex("thigh_stretch.l", 24 * strike - 4 * back); flex("leg_stretch.l", -(14 * strike + 6 * back))
        flex("thigh_stretch.r", -12 * strike + 4 * back); flex("leg_stretch.r", -(10 * strike + 3 * back)); flex("foot.r", 8 * strike)
        shift("root.x", fwd * (0.14 * strike - 0.04 * back))
        ground()
    def death_f(ph, f, n):
        # le ginocchia cedono, il busto crolla in avanti, le braccia cercano di attutire la caduta, la testa gira di lato
        buck = ease(ph, 0.05, 0.38); fall = ease(ph, 0.25, 0.66); settle = math.sin(max(0.0, ph - 0.72) / 0.28 * math.pi * 2) * (1 - ease(ph, 0.72, 1.0))
        tilt("spine_02.x", 10 * buck + 18 * fall); tilt("spine_03.x", 8 * fall); tilt("neck.x", 6 * buck)
        flex("thigh_stretch.l", 34 * buck); flex("leg_stretch.l", -(80 * buck)); flex("thigh_stretch.r", 26 * buck); flex("leg_stretch.r", -(72 * buck))
        flex("foot.l", -22 * buck); flex("foot.r", -18 * buck)
        flex("root.x", -(80 * fall) + 1.2 * settle); yaw("root.x", -8 * fall)
        for sd, k in (("l", 1), ("r", -1)):
            flex(f"arm_stretch.{sd}", 40 * ease(ph, 0.1, 0.45) + 52 * fall); flex(f"forearm_stretch.{sd}", 30 * (1 - fall) + 10 * fall); abd(f"arm_stretch.{sd}", sd, 12 * fall)
        yaw("head.x", 38 * fall)
        upd()
        low = min(min(wh(pb.name).z, wt(pb.name).z) for pb in arm.pose.bones)
        shift("root.x", up * (GROUND + 0.12 * fall - low)); upd()

    make_action("Idle", 96, idle)
    make_action("Walk", 26, walk); make_action("Shamble", 32, shamble, slump=1.3); make_action("Run", 18, run)
    make_action("Attack", 30, attack); make_action("Swipe", 30, swipe); make_action("Hit", 14, hit); make_action("Death", 48, death); make_action("DeathF", 54, death_f)

    def fix_ground(action_name, n, margin_fn):
        """Rivaluta l'azione COME FARÀ L'ESPORTATORE (frame_set) e corregge l'altezza della radice frame per frame: il punto più basso
        resta a `margin_fn(fase)` dal pavimento. Necessario per le cadute, dove la posa registrata e quella valutata possono differire."""
        act = bpy.data.actions[action_name]; arm.animation_data.action = act
        if getattr(act, "slots", None) and len(act.slots): arm.animation_data.action_slot = act.slots[0]
        root = arm.pose.bones["root.x"]
        for f in range(1, n + 2):
            sc.frame_set(f); upd()
            low = min(min(wh(pb.name).z, wt(pb.name).z) for pb in arm.pose.bones)
            dz = GROUND + margin_fn((f - 1) / n) - low
            if abs(dz) > 1e-4:
                root.location = root.location + REST["root.x"].inverted() @ (up * dz); root.keyframe_insert("location", frame=f)
        reset()
    fix_ground("Death", 48, lambda ph: 0.14 * ease(ph, 0.3, 0.82))
    fix_ground("DeathF", 54, lambda ph: 0.16 * ease(ph, 0.25, 0.66))

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
    SPEEDS = {"walk": round(stride_speed("Walk", 26), 3), "shamble": round(stride_speed("Shamble", 32), 3), "run": round(stride_speed("Run", 18), 3)}
    print("SPEEDS", SPEEDS)
    reset(); arm.animation_data.action = bpy.data.actions["Idle"]
    return SPEEDS
