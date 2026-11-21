// Motor arcade de las "jugadas clave": cancha vista de arriba, tu jugador con WASD,
// compañero, defensores y arquero con IA simple, física de pelota y efectos.
import { sfx } from "./audio";
import { clamp, pick, rand, type Look, type Stats } from "./data";
import { drawBall, drawPlayer, drawShadow, type Kit } from "./draw";

export type PlayKind = "mano" | "contra" | "pared" | "afuera" | "banda";
export type PlayOutcome = "gol" | "asist" | "atajada" | "palo" | "afuera" | "perdida" | "tiempo";
export type PlayResult = { outcome: PlayOutcome; good: number; bad: number };

export type PlaySetup = {
  kind: PlayKind;
  epic: boolean;
  minute: number;
  look: Look;
  num: number;
  stats: Stats;
  kit: Kit;
  rivalKit: Kit;
  rival: number; // 0..1 nivel del rival
  energy: number; // 0..100 energía del jugador
};

export const PLAY_NAMES: Record<PlayKind, string> = {
  mano: "MANO A MANO",
  contra: "CONTRAATAQUE 2 vs 1",
  pared: "PARED EN LA PUERTA DEL ÁREA",
  afuera: "REMATE DE AFUERA",
  banda: "DESBORDE Y CENTRO",
};

export const PLAY_TIPS: Record<PlayKind, string> = {
  mano: "Escapate del defensor y definí ante el arquero",
  contra: "Pasale a tu compañero (E) o definí vos",
  pared: "Tocá con tu compañero (E) y pedísela de vuelta (E)",
  afuera: "Buscá el hueco y sacá un zapatazo",
  banda: "Desbordá y tirá el centro (E): tu compañero cabecea",
};

// ---------- Mundo ----------
const W = 1000;
const H = 640;
const GX = 960; // línea de gol
const GY = 320; // centro del arco
const GW = 62; // medio ancho del arco
const BAR = 46; // altura del travesaño
const TOP = 24;
const BOT = 616;
const GRAV = 900;

type Role = "me" | "mate" | "def" | "gk";
type Ent = {
  role: Role;
  x: number; y: number; vx: number; vy: number;
  kit: Kit; look: Look;
  face: number; phase: number;
  stun: number;
  dive: number;
  laneY: number;
  hold: number; // tiempo con la pelota (IA)
  celebrate: boolean;
};
type Ball = { x: number; y: number; z: number; vx: number; vy: number; vz: number; owner: Ent | null; last: Ent | null; shot: boolean; spin: number; byMate: boolean };
type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; color: string; size: number; confetti: boolean };

const len = (x: number, y: number) => Math.hypot(x, y);

function randomLook(): Look {
  return { skin: Math.floor(rand() * 6), hair: Math.floor(rand() * 7), hairColor: Math.floor(rand() * 5), beard: rand() < 0.35 ? 1 + Math.floor(rand() * 3) : 0, eyes: Math.floor(rand() * 2), boots: Math.floor(rand() * 7) };
}

// carteles de publicidad inventados
const ADS = ["ZAPATTINO", "PIZZA ROCCO", "FERNET VOLARE", "MOTO LAMBRETTA", "GELATO NONNA", "BANCO DEL STIVALE"];

export class Arcade {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private t = 0; // tiempo de juego
  private intro = 1.1;
  private timeLeft: number;
  private totalTime: number;
  private timeScale = 1;
  private shake = 0;
  private netWave = 0;
  private ents: Ent[] = [];
  private me!: Ent;
  private mate: Ent | null = null;
  private gk!: Ent;
  private ball!: Ball;
  private parts: Particle[] = [];
  private cam = { x: 500, y: 320 };
  private sprint = 1;
  private charge = -1; // -1 sin cargar
  private feintCd = 0;
  private result: PlayOutcome | null = null;
  private endTimer = 0;
  private banner: { text: string; sub?: string; t: number; color: string } | null = null;
  private good = 0;
  private bad = 0;
  private wantPared = 0;
  private shotT = 0;
  private crowd: { x: number; y: number; c: string; p: number }[] = [];
  private keys = new Set<string>();
  joy = { x: 0, y: 0 };
  private touchSprint = false;
  private done = false;

  constructor(private canvas: HTMLCanvasElement, private s: PlaySetup, private onEnd: (r: PlayResult) => void) {
    this.ctx = canvas.getContext("2d")!;
    this.totalTime = this.timeLeft = { mano: 9, contra: 11, pared: 12, afuera: 8, banda: 12 }[s.kind] + (s.epic ? 2 : 0);
    this.setup();
    for (let i = 0; i < 260; i++) {
      const c = rand() < 0.5 ? s.kit.c1 : rand() < 0.5 ? s.kit.c2 : pick(["#e5e7eb", "#94a3b8", "#fbbf24", "#f87171"]);
      this.crowd.push({ x: -200 + rand() * (W + 400), y: -150 + rand() * 120, c, p: rand() * 6 });
    }
    window.addEventListener("keydown", this.kd);
    window.addEventListener("keyup", this.ku);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    sfx.whistle();
    this.banner = { text: s.epic ? "¡MINUTO 90!" : PLAY_NAMES[s.kind], sub: s.epic ? "Última chance. Todo o nada." : PLAY_TIPS[s.kind], t: 0, color: s.epic ? "#f97316" : "#fde047" };
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.kd);
    window.removeEventListener("keyup", this.ku);
  }

  // ---------- Entrada ----------
  private kd = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (e.repeat) return;
    this.keys.add(k);
    if (k === " ") this.pressShoot(true);
    if (k === "e") this.pressPass();
    if (k === "q") this.pressFeint();
  };
  private ku = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    if (k === " ") this.pressShoot(false);
  };

  pressShoot(down: boolean) {
    if (this.intro > 0 || this.result) return;
    if (this.ball.owner === this.me) {
      if (down) this.charge = 0;
      else if (this.charge >= 0) {
        this.shoot(this.me, this.charge);
        this.charge = -1;
      }
    } else if (down && this.ball.owner === this.mate) {
      this.mateShoot(); // "¡pateá!"
    } else if (!down) this.charge = -1;
  }
  pressPass() {
    if (this.intro > 0 || this.result) return;
    if (this.ball.owner === this.me) this.pass(this.me);
    else if (this.ball.owner === this.mate) this.wantPared = 1; // pedirla de vuelta
  }
  pressFeint() {
    if (this.intro > 0 || this.result || this.feintCd > 0 || this.ball.owner !== this.me) return;
    this.feintCd = 1;
    const st = this.s.stats;
    const side = this.joy.y !== 0 || this.keyDir().y !== 0 ? Math.sign(this.keyDir().y || this.joy.y) : rand() < 0.5 ? -1 : 1;
    this.me.vy += side * 260;
    this.me.vx += 40;
    let fooled = false;
    for (const d of this.ents) {
      if (d.role !== "def") continue;
      if (len(d.x - this.me.x, d.y - this.me.y) < 90 && rand() < 0.3 + st.regate / 120) {
        d.stun = 0.35 + st.regate / 220;
        d.vx *= -0.3;
        fooled = true;
      }
    }
    if (fooled) {
      this.good++;
      this.popText("¡AMAGUE!", "#a5f3fc");
      sfx.ooh();
    }
  }
  setTouchSprint(on: boolean) {
    this.touchSprint = on;
  }

  private keyDir() {
    let x = 0, y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    return { x, y };
  }

  // ---------- Armado de la jugada ----------
  private ent(role: Role, x: number, y: number, kit: Kit, look: Look): Ent {
    const e: Ent = { role, x, y, vx: 0, vy: 0, kit, look, face: role === "gk" ? -1 : 1, phase: rand() * 6, stun: 0, dive: 0, laneY: y, hold: 0, celebrate: false };
    this.ents.push(e);
    return e;
  }

  private setup() {
    const { kind, kit, rivalKit, look, num } = this.s;
    const myKit = { ...kit, num };
    const mateKit = { ...kit, num: pick([7, 9, 10, 11, 8, 19]) };
    const gkKit: Kit = { c1: "#bef264", c2: "#1f2937", num: 1 };
    const j = () => (rand() - 0.5) * 60;
    let bx = 0, by = 0;
    switch (kind) {
      case "mano":
        this.me = this.ent("me", 520, GY + j(), myKit, look);
        this.ent("def", 455, this.me.y + 45, rivalKit, randomLook());
        break;
      case "contra":
        this.me = this.ent("me", 420, 240 + j() * 0.5, myKit, look);
        this.mate = this.ent("mate", 430, 430, mateKit, randomLook());
        this.ent("def", 660, 330, rivalKit, randomLook());
        break;
      case "pared":
        this.me = this.ent("me", 560, GY + j(), myKit, look);
        this.mate = this.ent("mate", 720, 210, mateKit, randomLook());
        this.ent("def", 640, GY + 20, rivalKit, randomLook());
        this.ent("def", 780, 250, rivalKit, randomLook());
        break;
      case "afuera":
        this.me = this.ent("me", 640, GY + j(), myKit, look);
        this.ent("def", 745, GY - 40, rivalKit, randomLook());
        this.ent("def", 760, GY + 60, rivalKit, randomLook());
        break;
      case "banda":
        this.me = this.ent("me", 600, 92, myKit, look);
        this.mate = this.ent("mate", 740, 380, mateKit, randomLook());
        this.ent("def", 720, 160, rivalKit, randomLook());
        this.ent("def", 830, 360, rivalKit, randomLook());
        break;
    }
    if (this.mate) this.mate.laneY = this.mate.y;
    this.gk = this.ent("gk", GX - 16, GY, gkKit, randomLook());
    bx = this.me.x + 14;
    by = this.me.y + 2;
    this.ball = { x: bx, y: by, z: 0, vx: 0, vy: 0, vz: 0, owner: this.me, last: this.me, shot: false, spin: 0, byMate: false };
    this.cam = { x: this.me.x + 120, y: this.me.y };
  }

  // ---------- Acciones ----------
  private shoot(who: Ent, charge: number) {
    const st = this.s.stats;
    const isMe = who === this.me;
    const tiro = isMe ? st.tiro : 70;
    // dirección: hacia donde vas, con ayuda hacia el arco
    let dx: number, dy: number;
    const kd = isMe ? this.moveDir() : { x: 0, y: 0 };
    const toGoalX = GX - who.x;
    if (kd.x > 0.2 || (kd.x === 0 && kd.y === 0) || !isMe) {
      // apuntar a un punto del arco según el movimiento vertical
      // si no apuntás para arriba/abajo, la cruza al palo lejano
      const vert = isMe ? (kd.y !== 0 ? kd.y : -Math.sign(who.y - GY || 1) * 0.8) : (rand() < 0.5 ? -0.8 : 0.8);
      const aimY = GY + clamp(vert, -1, 1) * GW * 0.72;
      dx = toGoalX;
      dy = aimY - who.y;
    } else {
      dx = kd.x;
      dy = kd.y;
    }
    const n = len(dx, dy) || 1;
    dx /= n; dy /= n;
    const c = clamp(charge, 0.15, 1.15);
    const over = Math.max(0, c - 0.9);
    const spread = Math.max(0.025, 0.16 - tiro / 650) * (1 + over * 6) + (this.s.energy < 30 && isMe ? 0.04 : 0);
    const ang = Math.atan2(dy, dx) + (rand() - 0.5) * 2 * spread;
    const power = 480 + c * 560 + tiro * 2.5;
    this.ball.owner = null;
    this.ball.last = who;
    this.ball.vx = Math.cos(ang) * power;
    this.ball.vy = Math.sin(ang) * power;
    this.ball.vz = 70 + c * 150 + over * 420;
    this.ball.shot = true;
    this.shotT = this.t;
    this.ball.byMate = !isMe;
    this.ball.x = who.x + Math.cos(ang) * 16;
    this.ball.y = who.y + Math.sin(ang) * 16;
    sfx.kick(c);
    this.burstGrass(who.x + 10, who.y, 10);
    this.shake = Math.max(this.shake, 3 + c * 4);
    this.timeScale = this.s.epic ? 0.4 : 0.7;
  }

  private mateShoot() {
    if (!this.mate || this.ball.owner !== this.mate) return;
    this.shoot(this.mate, 0.75 + rand() * 0.2);
  }

  private moveDir() {
    const k = this.keyDir();
    let x = k.x + this.joy.x;
    let y = k.y + this.joy.y;
    const n = len(x, y);
    if (n > 1) { x /= n; y /= n; }
    return { x, y };
  }

  private pass(from: Ent) {
    const isMe = from === this.me;
    const target = isMe ? this.mate : this.me;
    if (!target) {
      // sin compañero: un toque largo hacia adelante
      this.kickTo(from, from.x + 140, from.y, 0.5);
      return;
    }
    const st = this.s.stats;
    const pase = isMe ? st.pase : 72;
    const d = len(target.x - from.x, target.y - from.y);
    const speed = 420 + pase * 2;
    const tLead = d / speed;
    // pase filtrado: adelante del compañero
    let tx = target.x + target.vx * tLead + (isMe ? 30 : 20);
    let ty = target.y + target.vy * tLead;
    const err = (1 - pase / 110) * 40;
    tx += (rand() - 0.5) * err;
    ty += (rand() - 0.5) * err;
    if (this.s.kind === "banda" && isMe) {
      // centro: va por el aire al punto penal
      tx = clamp(target.x + 20, 840, 905);
      ty = clamp(target.y, GY - 80, GY + 80);
      this.kickTo(from, tx, ty, 0.9, true);
    } else this.kickTo(from, tx, ty, 0.55);
    sfx.pass();
    if (isMe) this.good++;
  }

  private kickTo(from: Ent, tx: number, ty: number, power: number, lofted = false) {
    const dx = tx - from.x;
    const dy = ty - from.y;
    const d = len(dx, dy) || 1;
    // velocidad para llegar justo (fricción ≈ 1.1/s)
    const sp = clamp(d * 1.55 + 120, 240, 820) * (0.8 + power * 0.3);
    this.ball.owner = null;
    this.ball.last = from;
    this.ball.shot = false;
    this.ball.vx = (dx / d) * sp;
    this.ball.vy = (dy / d) * sp;
    this.ball.vz = lofted ? 260 : 20;
    if (lofted) {
      // centro: tiempo de vuelo ≈ distancia/vel
      const t = d / sp;
      this.ball.vz = (GRAV * t) / 2;
    }
  }

  // ---------- Bucle ----------
  private loop = (now: number) => {
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const dt = raw * this.timeScale;
    this.update(dt, raw);
    this.render();
    if (!this.done) this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number, raw: number) {
    this.t += dt;
    if (this.banner) this.banner.t += raw;
    if (this.intro > 0) {
      this.intro -= raw;
      if (this.intro <= 0) this.banner = null;
    }
    this.shake = Math.max(0, this.shake - raw * 30);
    this.netWave = Math.max(0, this.netWave - raw * 1.2);
    this.feintCd = Math.max(0, this.feintCd - dt);
    if (this.charge >= 0) this.charge = Math.min(1.15, this.charge + dt * 1.3);

    if (this.result) {
      this.endTimer -= raw;
      this.timeScale = Math.min(1, this.timeScale + raw * 0.5);
      if (this.endTimer <= 0 && !this.done) {
        this.done = true;
        this.onEnd({ outcome: this.result, good: this.good, bad: this.bad });
      }
    } else if (this.intro <= 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0 && !this.ballInFlight()) this.finish("tiempo", "¡SE ACABÓ EL TIEMPO!", "La defensa se acomodó", "#e5e7eb");
    }

    if (this.intro <= 0) {
      this.updateMe(dt);
      this.updateAI(dt);
    }
    for (const e of this.ents) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = clamp(e.x, -40, W + 20);
      e.y = clamp(e.y, TOP - 6, BOT + 6);
      const sp = len(e.vx, e.vy);
      e.phase += sp * dt * 0.09;
      if (Math.abs(e.vx) > 8) e.face = Math.sign(e.vx);
      e.stun = Math.max(0, e.stun - dt);
      if (e.celebrate) e.phase += dt * 10;
    }
    this.updateBall(dt);
    this.updateParticles(dt);

    // cámara: sigue a la pelota con suavidad
    const tx = this.ball.x + 60;
    const ty = this.ball.y;
    this.cam.x += (tx - this.cam.x) * Math.min(1, raw * 3.2);
    this.cam.y += (ty - this.cam.y) * Math.min(1, raw * 3.2);
  }

  private ballInFlight() {
    return !this.ball.owner && this.ball.shot;
  }

  private updateMe(dt: number) {
    const me = this.me;
    if (this.result === "gol" || this.result === "asist") return;
    const st = this.s.stats;
    const d = this.moveDir();
    const wantSprint = this.keys.has("shift") || this.touchSprint || len(this.joy.x, this.joy.y) > 0.92;
    const moving = d.x !== 0 || d.y !== 0;
    if (wantSprint && moving && this.sprint > 0) this.sprint = Math.max(0, this.sprint - dt * (0.55 - st.fisico / 400));
    else this.sprint = Math.min(1, this.sprint + dt * 0.25);
    const sprinting = wantSprint && moving && this.sprint > 0.02;
    let max = 150 + st.velocidad * 1.45;
    if (sprinting) max *= 1.32;
    if (this.ball.owner === me) max *= 0.84 + st.regate / 700;
    if (this.s.energy < 30) max *= 0.9;
    if (this.charge >= 0) max *= 0.55;
    const acc = 9;
    me.vx += (d.x * max - me.vx) * Math.min(1, acc * dt);
    me.vy += (d.y * max - me.vy) * Math.min(1, acc * dt);
  }

  private updateAI(dt: number) {
    const b = this.ball;
    const lvl = this.s.rival;
    const carrier = b.owner;
    for (const e of this.ents) {
      if (e.role === "me") continue;
      if (e.celebrate) { e.vx *= 0.9; e.vy *= 0.9; continue; }
      let tx = e.x, ty = e.y, sp = 200;
      if (e.role === "mate") {
        if (b.owner === e) {
          e.hold += dt;
          // con pelota: avanza al arco; si se la pedís, la devuelve; si está cerca, patea
          tx = GX - 60; ty = GY + (e.laneY > GY ? 40 : -40); sp = 190;
          const dGoal = len(GX - e.x, GY - e.y);
          const near = this.closestDef(e);
          if (this.wantPared > 0 && e.hold > 0.12) { this.wantPared = 0; this.pass(e); this.good++; }
          else if (this.s.kind === "banda" && e.x > 800) { this.mateShoot(); }
          else if (dGoal < 230 && e.hold > 0.35) this.mateShoot();
          else if (near < 30 && e.hold > 0.5) { this.pass(e); }
        } else if (b.owner === this.me || !b.owner) {
          // corre al hueco por su carril, un poco adelante tuyo
          tx = Math.min(this.me.x + 150, GX - 90);
          ty = e.laneY + Math.sin(this.t * 1.5) * 20;
          if (!b.owner && b.last === this.me && !b.shot) { tx = b.x + b.vx * 0.25; ty = b.y + b.vy * 0.25; sp = 260; }
          else sp = 215;
        }
      } else if (e.role === "def") {
        if (e.stun > 0 || this.t < 0.55) { e.vx *= 0.85; e.vy *= 0.85; continue; }
        sp = 165 + lvl * 95;
        const defs = this.ents.filter((d) => d.role === "def");
        const idx = defs.indexOf(e);
        const target = carrier ?? (b.shot ? null : b);
        if (target && (idx === 0 || !this.mate || carrier !== this.me)) {
          // presiona: se pone entre la pelota y el arco
          const gx = GX - target.x, gy = GY - target.y;
          const gl = len(gx, gy) || 1;
          const off = carrier && carrier !== e ? 18 : 0;
          tx = target.x + (gx / gl) * off;
          ty = target.y + (gy / gl) * off;
          if (idx === 1 && this.mate && carrier === this.me) { tx = this.mate.x + (b.x - this.mate.x) * 0.35; ty = this.mate.y + (b.y - this.mate.y) * 0.35; }
        } else if (this.mate) {
          // marca al compañero: corta la línea de pase
          tx = this.mate.x + (b.x - this.mate.x) * 0.35;
          ty = this.mate.y + (b.y - this.mate.y) * 0.35;
        }
        if (idx === 1 && this.mate && carrier === this.me) { tx = this.mate.x + (b.x - this.mate.x) * 0.35; ty = this.mate.y + (b.y - this.mate.y) * 0.35; sp *= 0.95; }
        // quite
        if (carrier && carrier.role !== "def" && carrier.role !== "gk") {
          const dd = len(carrier.x - e.x, carrier.y - e.y);
          if (dd < 20) {
            const reg = carrier === this.me ? this.s.stats.regate : 65;
            const p = (0.9 + lvl * 1.3) * (1.15 - reg / 120) * dt * 2.2;
            if (rand() < p) this.steal(e);
          }
        }
      } else if (e.role === "gk") {
        this.updateGK(e, dt, lvl);
        continue;
      }
      const dx = tx - e.x, dy = ty - e.y;
      const dl = len(dx, dy);
      const want = dl > 4 ? Math.min(sp, dl * 5) : 0;
      const ax = dl ? (dx / dl) * want : 0;
      const ay = dl ? (dy / dl) * want : 0;
      e.vx += (ax - e.vx) * Math.min(1, 6 * dt);
      e.vy += (ay - e.vy) * Math.min(1, 6 * dt);
    }
  }

  private closestDef(p: Ent) {
    let m = Infinity;
    for (const d of this.ents) if (d.role === "def") m = Math.min(m, len(d.x - p.x, d.y - p.y));
    return m;
  }

  private updateGK(g: Ent, dt: number, lvl: number) {
    const b = this.ball;
    if (this.result) { g.vx *= 0.9; g.vy *= 0.9; return; }
    if (b.shot && b.vx > 0 && !b.owner) {
      // se tira: predice dónde cruza
      const tHit = (g.x - b.x) / b.vx;
      const react = 0.22 - lvl * 0.08;
      if (tHit > 0 && this.t - this.shotT > react) {
        const ty = clamp(b.y + b.vy * tHit, GY - GW - 20, GY + GW + 20);
        const sp = 200 + lvl * 120;
        const dy = ty - g.y;
        g.vy = clamp(dy * 10, -sp, sp);
        g.vx = 0;
        g.dive = clamp(dy / 70, -1, 1);
      }
      return;
    }
    g.dive *= 0.9;
    // posición: sobre la línea, sale si el atacante entra al área
    const carrier = b.owner ?? b;
    const dist = len(GX - carrier.x, GY - carrier.y);
    const out = dist < 260 ? clamp((260 - dist) * 0.32, 0, 70) : 0;
    const ang = Math.atan2(carrier.y - GY, carrier.x - GX);
    const tx = GX - 16 + Math.cos(ang) * out;
    const ty = clamp(GY + Math.sin(ang) * out + (carrier.y - GY) * 0.25, GY - GW + 8, GY + GW - 8);
    const sp = 150 + lvl * 70;
    const dx = tx - g.x, dy = ty - g.y;
    const dl = len(dx, dy);
    g.vx = dl > 2 ? (dx / dl) * Math.min(sp, dl * 6) : 0;
    g.vy = dl > 2 ? (dy / dl) * Math.min(sp, dl * 6) : 0;
    // achica: si el que tiene la pelota está encima, se la saca
    if (b.owner && b.owner.role !== "gk" && len(b.owner.x - g.x, b.owner.y - g.y) < 20 && rand() < dt * (1.2 + lvl)) {
      b.owner = g;
      this.finish("atajada", "¡SE LA SACÓ EL ARQUERO!", "Le achicó bien", "#93c5fd");
      sfx.save();
    }
  }

  private steal(d: Ent) {
    const b = this.ball;
    b.owner = null;
    b.vx = -120 + rand() * 80;
    b.vy = (rand() - 0.5) * 240;
    b.vz = 40;
    b.last = d;
    this.burstGrass(d.x, d.y, 8);
    sfx.save();
    this.bad++;
  }

  private updateBall(dt: number) {
    const b = this.ball;
    b.spin += (len(b.vx, b.vy) / 6) * dt * 0.1;
    if (b.owner) {
      const o = b.owner;
      const sp = len(o.vx, o.vy);
      const reg = o === this.me ? this.s.stats.regate : 70;
      const ahead = 11 + (sp / 300) * (16 - reg / 8);
      const dirx = sp > 10 ? o.vx / sp : o.face;
      const diry = sp > 10 ? o.vy / sp : 0;
      const tx = o.x + dirx * ahead;
      const ty = o.y + diry * ahead + 2;
      b.x += (tx - b.x) * Math.min(1, dt * 18);
      b.y += (ty - b.y) * Math.min(1, dt * 18);
      b.z = Math.abs(Math.sin(o.phase)) * 2;
      b.vx = o.vx; b.vy = o.vy; b.vz = 0;
      if (o.role === "def" && !this.result) this.finish("perdida", "¡LA PERDISTE!", "Te la robaron", "#fca5a5");
      return;
    }
    const prevX = b.x;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    if (b.z > 0 || b.vz > 0) b.vz -= GRAV * dt;
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -60) b.vz = -b.vz * 0.42;
      else b.vz = 0;
      const f = Math.pow(0.32, dt); // fricción en el césped
      b.vx *= f; b.vy *= f;
    } else {
      const f = Math.pow(0.9, dt);
      b.vx *= f; b.vy *= f;
    }

    if (this.result) return;

    // ¿cruzó la línea de gol?
    if (prevX < GX && b.x >= GX) {
      const inMouth = Math.abs(b.y - GY) < GW;
      const postHit = Math.abs(Math.abs(b.y - GY) - GW) < 5;
      if (postHit && b.z < BAR) {
        b.x = GX - 2;
        b.vx = -Math.abs(b.vx) * 0.5;
        b.vy += (rand() - 0.5) * 200;
        sfx.post();
        this.shake = 8;
        this.finish("palo", "¡PALO!", "Por centímetros...", "#e5e7eb", 1.6);
        sfx.ooh();
        return;
      }
      if (inMouth && b.z < BAR) {
        this.goal();
        return;
      }
      this.finish("afuera", b.z >= BAR && inMouth ? "¡POR ARRIBA!" : "¡AFUERA!", pick(["Se fue rozando el palo", "La tribuna se agarra la cabeza", "Uff, cerca"]), "#e5e7eb");
      sfx.ooh();
      return;
    }
    if (b.y < TOP - 10 || b.y > BOT + 10 || b.x > W + 30 || b.x < -60) {
      this.finish(b.shot ? "afuera" : "perdida", b.shot ? "¡AFUERA!" : "SE FUE AL LATERAL", undefined, "#e5e7eb");
      return;
    }

    // atajada
    const g = this.gk;
    if (b.shot && Math.abs(b.x - g.x) < 14 && b.vx > 0) {
      const reach = 15 + this.s.rival * 8 + Math.abs(g.dive) * 6;
      if (Math.abs(b.y - g.y) < reach && b.z < BAR + 6) {
        const strong = len(b.vx, b.vy) > 860;
        if (!strong || rand() < 0.55 + this.s.rival * 0.3) {
          b.vx = -Math.abs(b.vx) * 0.35;
          b.vy = (rand() - 0.5) * 400;
          b.vz = 120;
          b.shot = false;
          this.shake = 6;
          sfx.save();
          this.finish("atajada", pick(["¡QUÉ ATAJADA!", "¡LA SACÓ!", "¡MANOTAZO!"]), "El arquero se lució", "#93c5fd", 1.6);
          return;
        }
      }
    }

    // recepción y robos de pelota suelta
    if (b.z < 26) {
      for (const e of this.ents) {
        if (e === b.last && this.t < 0.2) continue;
        if (e.role === "gk") {
          if (len(b.x - e.x, b.y - e.y) < 18 && len(b.vx, b.vy) < 520 && !b.shot) {
            b.owner = e;
            this.finish("atajada", "¡LA AGARRÓ EL ARQUERO!", undefined, "#93c5fd");
            sfx.save();
            return;
          }
          continue;
        }
        const d = len(b.x - e.x, b.y - e.y);
        const r = e.role === "def" ? 17 : 20;
        if (d < r && !(b.shot && e.role !== "def") && !(b.last === e && len(b.vx, b.vy) > 200)) {
          if (e.role === "def") {
            if (b.shot && rand() > 0.35) continue; // los remates a veces pasan
            b.owner = e;
            this.finish(b.shot ? "atajada" : "perdida", b.shot ? "¡BLOQUEADO!" : "¡CORTADA!", b.shot ? "El defensor se tiró al piso" : "Te leyeron el pase", "#fca5a5");
            sfx.save();
            return;
          }
          b.owner = e;
          b.shot = false;
          e.hold = 0;
          if (e === this.mate && this.s.kind === "banda" && b.last === this.me) {
            // cabezazo automático
            this.mateShoot();
          }
          return;
        }
      }
    }
    // remate que se frena sin llegar
    if (b.shot && len(b.vx, b.vy) < 70 && b.z === 0) {
      b.shot = false;
      this.finish("afuera", "SIN FUERZA", "La pelota murió antes del arco", "#e5e7eb");
    }
  }

  private goal() {
    const byMate = this.ball.byMate;
    this.netWave = 1;
    this.shake = 16;
    this.timeScale = 0.35;
    sfx.goal();
    const scorer = byMate ? this.mate! : this.me;
    scorer.celebrate = true;
    this.me.celebrate = true;
    this.confetti();
    this.finish(byMate ? "asist" : "gol", byMate ? "¡GOOOL!" : pick(["¡GOOOLAZO!", "¡GOOOOL!", "¡A COBRAR!"]), byMate ? "¡Asistencia tuya!" : this.s.epic ? "¡EN EL MINUTO 90!" : "¡La metiste!", "#fde047", 2.6);
  }

  private finish(r: PlayOutcome, text: string, sub: string | undefined, color: string, wait = 1.4) {
    if (this.result) return;
    this.result = r;
    this.endTimer = wait;
    this.charge = -1;
    this.banner = { text, sub, t: 0, color };
    if (r !== "gol" && r !== "asist") sfx.whistle();
  }

  private popText(text: string, color: string) {
    if (this.result) return;
    this.banner = { text, t: 0, color };
    setTimeout(() => {
      if (this.banner?.text === text) this.banner = null;
    }, 700);
  }

  // ---------- Partículas ----------
  private burstGrass(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++)
      this.parts.push({ x, y, z: 2, vx: (rand() - 0.5) * 160, vy: (rand() - 0.5) * 80, vz: 80 + rand() * 120, life: 0.6, max: 0.6, color: rand() < 0.5 ? "#4ade80" : "#166534", size: 2 + rand() * 2, confetti: false });
  }
  private confetti() {
    const cols = [this.s.kit.c1, this.s.kit.c2, "#fde047", "#f8fafc"];
    for (let i = 0; i < 140; i++)
      this.parts.push({ x: GX - 60 + rand() * 80, y: GY + (rand() - 0.5) * 160, z: 20 + rand() * 40, vx: -rand() * 260, vy: (rand() - 0.5) * 300, vz: 200 + rand() * 320, life: 2.6, max: 2.6, color: pick(cols), size: 3 + rand() * 3, confetti: true });
  }
  private updateParticles(dt: number) {
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vz -= (p.confetti ? 260 : GRAV) * dt;
      if (p.confetti) { p.vx *= 0.98; p.vy *= 0.98; p.vz = Math.max(p.vz, -60); }
      if (p.z < 0) { p.z = 0; p.vx *= 0.5; p.vy *= 0.5; }
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  // ---------- Dibujo ----------
  private render() {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const cw = c.clientWidth, ch = c.clientHeight;
    if (c.width !== Math.round(cw * dpr) || c.height !== Math.round(ch * dpr)) {
      c.width = Math.round(cw * dpr);
      c.height = Math.round(ch * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(ch / 470, cw / 520);
    const viewW = cw / scale, viewH = ch / scale;
    const cx = clamp(this.cam.x, viewW / 2 - 120, Math.max(viewW / 2 - 120, W + 170 - viewW / 2));
    const cy = clamp(this.cam.y, viewH / 2 - 170, H + 40 - viewH / 2);
    const sx = (rand() - 0.5) * this.shake, sy = (rand() - 0.5) * this.shake;

    ctx.fillStyle = "#14532d";
    ctx.fillRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw / 2 + sx, ch / 2 + sy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    this.drawPitch(ctx, cx, viewW);
    this.drawGoalBack(ctx);

    // entidades ordenadas por profundidad
    type D = { y: number; draw: () => void };
    const list: D[] = [];
    for (const e of this.ents) {
      list.push({
        y: e.y,
        draw: () =>
          drawPlayer(ctx, {
            x: e.x, y: e.y, s: e.role === "me" ? 1.08 : 1, look: e.look, kit: e.kit, face: e.face, phase: e.phase,
            moving: clamp(len(e.vx, e.vy) / 120, 0, 1), ring: e.role === "me" ? "#fde047" : e.role === "mate" ? "rgba(255,255,255,.55)" : undefined,
            celebrate: e.celebrate, dive: e.role === "gk" ? e.dive : 0,
          }),
      });
    }
    const b = this.ball;
    list.push({ y: b.y + 0.5, draw: () => drawBall(ctx, b.x, b.y, b.z, 6, b.spin) });
    for (const p of this.parts) {
      list.push({
        y: p.y,
        draw: () => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.min(1, (p.life / p.max) * 2);
          if (p.confetti) ctx.fillRect(p.x, p.y - p.z, p.size, p.size * 0.6);
          else { ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1;
        },
      });
    }
    list.sort((a, b2) => a.y - b2.y).forEach((d) => d.draw());
    this.drawGoalFront(ctx);

    // marcador de carga sobre tu jugador
    if (this.charge >= 0) {
      const w = 40;
      const x = this.me.x - w / 2, y = this.me.y - 74;
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, 9, 4); ctx.fill();
      const ch2 = Math.min(1, this.charge);
      ctx.fillStyle = this.charge > 0.9 ? "#ef4444" : this.charge > 0.6 ? "#f59e0b" : "#22c55e";
      ctx.beginPath(); ctx.roundRect(x, y, w * ch2, 5, 3); ctx.fill();
    }
    // flecha sobre tu jugador
    if (!this.result) {
      const bob = Math.sin(this.t * 6) * 2;
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#161616";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.me.x - 5, this.me.y - 84 + bob);
      ctx.lineTo(this.me.x + 5, this.me.y - 84 + bob);
      ctx.lineTo(this.me.x, this.me.y - 77 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    this.drawHUD(ctx, cw, ch);
  }

  private drawPitch(ctx: CanvasRenderingContext2D, cx: number, viewW: number) {
    // tribuna
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-300, -260, W + 600, 250);
    for (const p of this.crowd) {
      const jump = this.result === "gol" || this.result === "asist" ? Math.abs(Math.sin(this.t * 9 + p.p)) * 6 : Math.abs(Math.sin(this.t * 2 + p.p)) * 1.2;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y - jump, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // carteles
    const adW = 170;
    for (let i = -2; i < 9; i++) {
      const x = i * adW;
      ctx.fillStyle = i % 2 ? "#0f172a" : "#1d4ed8";
      ctx.fillRect(x, -10, adW, 22);
      ctx.fillStyle = i % 2 ? "#fde047" : "#fff";
      ctx.font = "900 italic 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ADS[(i + 20) % ADS.length], x + adW / 2, 6);
    }
    // césped a franjas
    const stripe = 62;
    for (let i = -4; i < W / stripe + 6; i++) {
      ctx.fillStyle = i % 2 ? "#2f9e44" : "#37b24d";
      ctx.fillRect(i * stripe, 12, stripe, H);
    }
    // luz de estadio
    const grd = ctx.createRadialGradient(cx, 320, 50, cx, 320, viewW * 0.8);
    grd.addColorStop(0, "rgba(255,255,255,.07)");
    grd.addColorStop(1, "rgba(0,0,0,.18)");
    ctx.fillStyle = grd;
    ctx.fillRect(-300, 12, W + 600, H);
    // líneas
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-400, TOP, GX + 400, BOT - TOP);
    ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(0, BOT); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, GY, 90, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.strokeRect(GX - 165, GY - 165, 165, 330); // área grande
    ctx.strokeRect(GX - 55, GY - 75, 55, 150); // área chica
    ctx.beginPath(); ctx.arc(GX - 110, GY, 3, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(GX - 110, GY, 90, Math.PI * 0.705, Math.PI * 1.295); ctx.stroke();
    // banderines
    for (const y of [TOP, BOT]) {
      ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(GX, y); ctx.lineTo(GX, y - 26); ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.moveTo(GX, y - 26); ctx.lineTo(GX + 13, y - 21); ctx.lineTo(GX, y - 16); ctx.fill();
    }
    // fondo detrás del arco
    ctx.fillStyle = "rgba(0,0,0,.16)";
    ctx.fillRect(GX, -20, 600, H + 200);
  }

  private drawGoalBack(ctx: CanvasRenderingContext2D) {
    const depth = 34;
    const wave = this.netWave;
    // sombra del arco
    drawShadow(ctx, GX + depth / 2, GY, depth, GW + 6, 0.18);
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1;
    // red (malla) entre el fondo y el travesaño
    for (let i = 0; i <= 14; i++) {
      const y = GY - GW + (i / 14) * GW * 2;
      const bulge = wave * Math.sin(i * 0.9 + this.t * 18) * 6 * wave;
      ctx.beginPath();
      ctx.moveTo(GX, y - BAR);
      ctx.quadraticCurveTo(GX + depth + bulge, y - BAR / 2, GX + depth * 0.8 + bulge, y);
      ctx.stroke();
    }
    for (let k = 0; k <= 5; k++) {
      const f = k / 5;
      ctx.beginPath();
      ctx.moveTo(GX + depth * f * 0.9, GY - GW - BAR * (1 - f));
      ctx.lineTo(GX + depth * f * 0.9 + wave * 5, GY + GW - BAR * (1 - f));
      ctx.stroke();
    }
    // palo de atrás (el de arriba en pantalla)
    this.post(ctx, GX, GY - GW);
  }

  private drawGoalFront(ctx: CanvasRenderingContext2D) {
    this.post(ctx, GX, GY + GW);
    // travesaño
    ctx.strokeStyle = "#161616";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(GX, GY - GW - BAR); ctx.lineTo(GX, GY + GW - BAR); ctx.stroke();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(GX, GY - GW - BAR); ctx.lineTo(GX, GY + GW - BAR); ctx.stroke();
  }

  private post(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.strokeStyle = "#161616";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - BAR); ctx.stroke();
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - BAR); ctx.stroke();
  }

  private drawHUD(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    // reloj de la jugada
    const frac = clamp(this.timeLeft / this.totalTime, 0, 1);
    const bw = Math.min(260, cw * 0.5);
    const bx = (cw - bw) / 2;
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath(); ctx.roundRect(bx - 70, 10, bw + 140, 30, 15); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 15px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${this.s.minute}'`, bx - 56, 31);
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath(); ctx.roundRect(bx, 20, bw, 10, 5); ctx.fill();
    ctx.fillStyle = frac < 0.3 ? "#ef4444" : "#fde047";
    ctx.beginPath(); ctx.roundRect(bx, 20, bw * frac, 10, 5); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.font = "800 12px system-ui, sans-serif";
    ctx.fillText(this.s.epic ? "90'+" : "⏱", bx + bw + 56, 30);

    // energía para correr
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath(); ctx.roundRect(12, ch - 34, 150, 22, 11); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText("SPRINT", 22, ch - 19);
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath(); ctx.roundRect(72, ch - 27, 80, 8, 4); ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath(); ctx.roundRect(72, ch - 27, 80 * this.sprint, 8, 4); ctx.fill();

    // cartel grande
    if (this.banner) {
      const t = this.banner.t;
      const pop = Math.min(1, t * 6);
      const sc = 0.6 + 0.4 * (1 - Math.pow(1 - pop, 3)) + (t < 0.25 ? Math.sin(t * 25) * 0.04 : 0);
      ctx.save();
      ctx.translate(cw / 2, ch * 0.36);
      ctx.scale(sc, sc);
      ctx.rotate(-0.04);
      const big = Math.min(64, cw / 9);
      ctx.font = `900 italic ${big}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = big / 6;
      ctx.strokeStyle = "#161616";
      ctx.lineJoin = "round";
      ctx.strokeText(this.banner.text, 0, 0);
      ctx.fillStyle = this.banner.color;
      ctx.fillText(this.banner.text, 0, 0);
      if (this.banner.sub) {
        ctx.font = `800 ${Math.max(14, big / 3)}px system-ui, sans-serif`;
        ctx.lineWidth = 5;
        ctx.strokeText(this.banner.sub, 0, big * 0.7);
        ctx.fillStyle = "#fff";
        ctx.fillText(this.banner.sub, 0, big * 0.7);
      }
      ctx.restore();
    }
  }
}
