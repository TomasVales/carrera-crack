// Motor arcade de las "jugadas clave": cancha vista de arriba, tu jugador con WASD,
// compañero, defensores (con barridas avisadas), barrera, arquero, física de pelota,
// mira, vaselina, comba, repetición del gol, clima y modo práctica.
import { sfx } from "./audio";
import { clamp, pick, rand, seeded, type Look, type Stats } from "./data";
import { drawBall, drawPlayer, drawShadow, type Kit } from "./draw";

export type PlayKind = "mano" | "contra" | "pared" | "afuera" | "banda" | "libre" | "penal" | "practica" | "defensa" | "posesion" | "corner";
export type PlayOutcome = "gol" | "asist" | "atajada" | "palo" | "afuera" | "perdida" | "tiempo" | "recupero" | "golrival" | "posesion";
export type Weather = "sol" | "noche" | "lluvia";
export type PlayResult = { outcome: PlayOutcome; good: number; bad: number; shots?: number; goals?: number };

export type PlaySetup = {
  kind: PlayKind;
  epic: boolean;
  minute: number;
  look: Look;
  num: number;
  stats: Stats;
  kit: Kit;
  rivalKit: Kit;
  rival: number; // 0..1
  energy: number;
  celebration: string;
  rivalSeed: string;
  crowd: [string, string];
  weather: Weather;
  decisive?: boolean; // penal decisivo de una tanda
};

export const PLAY_NAMES: Record<PlayKind, string> = {
  mano: "MANO A MANO",
  contra: "CONTRAATAQUE 2 vs 1",
  pared: "PARED EN LA PUERTA DEL ÁREA",
  afuera: "REMATE DE AFUERA",
  banda: "DESBORDE Y CENTRO",
  libre: "TIRO LIBRE",
  penal: "¡PENAL!",
  practica: "ENTRENAMIENTO",
  defensa: "¡CONTRAATAQUE RIVAL!",
  posesion: "TOQUE EN MITAD DE CANCHA",
  corner: "TIRO DE ESQUINA",
};

export const PLAY_TIPS: Record<PlayKind, string> = {
  mano: "Escapate del defensor y definí ante el arquero",
  contra: "Pasale a tu compañero (E) o definí vos",
  pared: "Tocá con tu compañero (E) y pedísela de vuelta (E)",
  afuera: "Buscá el hueco y sacá un zapatazo",
  banda: "Desbordá y tirá el centro (E): tu compañero cabecea",
  libre: "Apuntá con W/S · Shift+Espacio para la comba",
  penal: "Apuntá con W/S y elegí la potencia",
  practica: "Probá todo sin presión",
  defensa: "Alcanzalo: Espacio = barrida · E = meter la pierna",
  posesion: "Aguantá la pelota tocando con tus compañeros (E)",
  corner: "Andá al círculo y cabeceá con Espacio cuando llegue",
};

// ---------- Mundo ----------
const W = 1000;
const H = 640;
const GX = 960;
const GY = 320;
const GW = 62;
const BAR = 46;
const TOP = 24;
const BOT = 616;
const GRAV = 900;
const GK_REACH_Z = 26;

type Role = "me" | "mate" | "def" | "gk" | "wall" | "att";
type Tackle = "none" | "wind" | "slide" | "down";
type Ent = {
  role: Role;
  x: number; y: number; vx: number; vy: number;
  kit: Kit; look: Look;
  face: number; phase: number;
  stun: number; dive: number; laneY: number; hold: number;
  celebrate: string | false;
  kick: number;
  hz: number; hvz: number; // salto
  tk: Tackle; tt: number; sdx: number; sdy: number; cd: number; close: number;
  homeX: number; homeY: number;
};
type ShotKind = "normal" | "chip" | "curve";
type Ball = {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  owner: Ent | null; last: Ent | null; shot: boolean; spin: number; byMate: boolean; byRival: boolean;
  ax: number; ay: number; curveT: number; kind: ShotKind;
};
type Particle = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; color: string; size: number; type: "grass" | "confetti" | "smoke" | "spark" };
type Snap = { t: number; e: number[][]; b: number[] };

const len = (x: number, y: number) => Math.hypot(x, y);
const ADS = ["ZAPATTINO", "PIZZA ROCCO", "FERNET VOLARE", "MOTO LAMBRETTA", "GELATO NONNA", "BANCO DEL STIVALE", "TEA & CO", "CHURROS PACO"];

function lookFrom(r: () => number): Look {
  const i = (n: number) => Math.floor(r() * n);
  return { skin: i(6), hair: i(7), hairColor: i(5), beard: r() < 0.35 ? 1 + i(3) : 0, eyes: i(2), boots: i(7) };
}

export class Arcade {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private t = 0;
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
  private charge = -1;
  private feintCd = 0;
  private result: PlayOutcome | null = null;
  private endTimer = 0;
  private banner: { text: string; sub?: string; t: number; color: string } | null = null;
  private good = 0;
  private bad = 0;
  private wantPared = 0;
  private shotT = 0;
  private jumpT = 0;
  private crowd: { x: number; y: number; c: string; p: number }[] = [];
  private rain: { x: number; y: number; s: number }[] = [];
  private keys = new Set<string>();
  joy = { x: 0, y: 0 };
  private touchSprint = false;
  private done = false;
  // pelota parada
  private setPiece = false;
  private aim = 0;
  private penGuess: number | null = null;
  // repetición
  private snaps: Snap[] = [];
  private goalT = 0;
  private replay: { start: number; end: number; clock: number } | null = null;
  private replayDone = false;
  // práctica
  private practice = false;
  private pShots = 0;
  private pGoals = 0;
  private rng: () => number;
  private passes = 0;
  private cross: { x: number; y: number; t: number } | null = null;
  private crossDone = false;
  private recoverT = -1;

  constructor(private canvas: HTMLCanvasElement, private s: PlaySetup, private onEnd: (r: PlayResult) => void) {
    this.ctx = canvas.getContext("2d")!;
    this.practice = s.kind === "practica";
    this.setPiece = s.kind === "libre" || s.kind === "penal";
    this.totalTime = this.timeLeft = ({ mano: 9, contra: 11, pared: 12, afuera: 8, banda: 12, libre: 10, penal: 8, practica: 60, defensa: 9, posesion: 10, corner: 8 } as const)[s.kind] + (s.epic ? 2 : 0);
    this.rng = seeded(s.rivalSeed);
    this.setup();
    for (let i = 0; i < 300; i++) {
      const c = rand() < 0.45 ? s.crowd[0] : rand() < 0.6 ? s.crowd[1] : pick(["#e5e7eb", "#94a3b8", "#fbbf24", "#1e293b"]);
      this.crowd.push({ x: -300 + rand() * (W + 600), y: -160 + rand() * 135, c, p: rand() * 6 });
    }
    if (s.weather === "lluvia") for (let i = 0; i < 140; i++) this.rain.push({ x: rand(), y: rand(), s: 0.7 + rand() * 0.6 });
    window.addEventListener("keydown", this.kd);
    window.addEventListener("keyup", this.ku);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    sfx.whistle();
    this.banner = {
      text: s.decisive ? "¡PENAL DECISIVO!" : s.epic ? "¡MINUTO 90!" : PLAY_NAMES[s.kind],
      sub: s.decisive ? "Si lo metés, pasan de ronda" : s.epic ? "Última chance. Todo o nada." : PLAY_TIPS[s.kind],
      t: 0,
      color: s.epic || s.decisive ? "#f97316" : "#fde047",
    };
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.kd);
    window.removeEventListener("keyup", this.ku);
  }

  /** Para la práctica: terminar cuando el jugador quiera. */
  quit() {
    if (this.done) return;
    this.done = true;
    this.onEnd({ outcome: "tiempo", good: this.good, bad: this.bad, shots: this.pShots, goals: this.pGoals });
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

  private canShootNow() {
    if (this.setPiece) return !this.ball.shot && !this.ball.owner && len(this.ball.vx, this.ball.vy) < 1;
    return this.ball.owner === this.me;
  }

  pressShoot(down: boolean) {
    if (this.replay || (this.result && (this.result === "gol" || this.result === "asist"))) {
      if (down && !this.practice) this.skipToEnd();
      return;
    }
    if (this.intro > 0 || this.result) return;
    if (down && this.tryHeader()) return;
    if (down && this.ball.owner !== this.me && this.ball.owner !== this.mate && !this.setPiece) {
      this.meSlide();
      return;
    }
    if (this.canShootNow()) {
      if (down) this.charge = 0;
      else if (this.charge >= 0) {
        const colocado = this.keys.has("shift") || this.touchSprint;
        this.shoot(this.me, this.charge, colocado);
        this.charge = -1;
      }
    } else if (down && this.ball.owner === this.mate) {
      this.mateShoot();
    } else if (!down) this.charge = -1;
  }
  pressPass() {
    if (this.intro > 0 || this.result || this.setPiece) return;
    const o = this.ball.owner;
    if (o && (o.role === "def" || o.role === "att")) {
      // meter la pierna
      if (len(o.x - this.me.x, o.y - this.me.y) < 24 && this.me.tk === "none") {
        this.me.kick = 1;
        if (rand() < 0.4 + this.s.stats.fisico / 300) this.recover(o);
        else { this.me.stun = 0.35; this.popText("¡NO LLEGÓ!", "#fca5a5"); }
      }
      return;
    }
    if (this.ball.owner === this.me) this.pass(this.me);
    else if (this.ball.owner === this.mate) this.wantPared = 1;
  }
  pressFeint() {
    if (this.intro > 0 || this.result || this.setPiece) return;
    const slider = this.ents.find((d) => d.role === "def" && (d.tk === "slide" || d.tk === "wind") && len(d.x - this.me.x, d.y - this.me.y) < 90);
    if (slider && this.me.hz === 0) {
      this.me.hvz = 240;
      this.jumpT = 0.42;
      this.good++;
      this.popText("¡LO SALTÓ!", "#a5f3fc");
      sfx.ooh();
      return;
    }
    if (this.feintCd > 0 || this.ball.owner !== this.me) return;
    this.feintCd = 1;
    const st = this.s.stats;
    const dir = this.moveDir();
    const side = dir.y !== 0 ? Math.sign(dir.y) : rand() < 0.5 ? -1 : 1;
    this.me.vy += side * 260;
    this.me.vx += 40;
    let fooled = false;
    for (const d of this.ents) {
      if (d.role !== "def") continue;
      if (len(d.x - this.me.x, d.y - this.me.y) < 95 && rand() < 0.3 + st.regate / 120 + (d.tk === "wind" ? 0.3 : 0)) {
        d.stun = 0.35 + st.regate / 220;
        d.tk = "none";
        d.cd = 1;
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

  /** Barrida tuya hacia donde te movés (o hacia la pelota). */
  private meSlide() {
    const me = this.me;
    if (me.tk !== "none" || me.stun > 0) return;
    const d = this.moveDir();
    let dx = d.x, dy = d.y;
    if (!dx && !dy) { dx = this.ball.x - me.x; dy = this.ball.y - me.y; }
    const l = len(dx, dy) || 1;
    const sp = 400 + this.s.stats.velocidad;
    me.sdx = (dx / l) * sp; me.sdy = (dy / l) * sp;
    me.face = Math.sign(dx) || 1;
    me.tk = "slide"; me.tt = 0.32;
    sfx.pass();
  }

  /** Recuperaste la pelota. */
  private recover(from: Ent | null) {
    const b = this.ball;
    if (from) { from.tk = "down"; from.tt = 0.8; from.hold = 0; }
    b.owner = this.me;
    b.shot = false;
    b.curveT = 0;
    this.good++;
    this.popText("¡RECUPERADA!", "#86efac");
    sfx.ooh();
    if (this.s.kind === "defensa") this.recoverT = this.t;
  }

  /** Cabezazo en el córner (o cualquier pelota alta cerca). */
  private tryHeader() {
    const b = this.ball;
    if (b.owner || b.shot || this.result) return false;
    if (b.z < 8 || b.z > 48 || len(b.x - this.me.x, b.y - this.me.y) > 26) return false;
    const plan = this.shotPlan(this.me);
    const tiro = this.s.stats.tiro;
    const a0 = Math.atan2(plan.ty - b.y, GX + 6 - b.x) + (rand() - 0.5) * 2 * Math.max(0.04, 0.2 - tiro / 600);
    const power = 520 + tiro * 2;
    b.vx = Math.cos(a0) * power; b.vy = Math.sin(a0) * power; b.vz = -40;
    b.shot = true; b.kind = "normal"; b.byMate = false; b.byRival = false; b.last = this.me; b.ax = 0; b.ay = 0; b.curveT = 0;
    this.me.hvz = 200;
    this.shotT = this.t;
    this.pShots++;
    this.cross = null;
    sfx.kick(0.6);
    this.popText("¡CABEZAZO!", "#fde68a");
    this.timeScale = 0.6;
    return true;
  }

  private keyDir() {
    let x = 0, y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    return { x, y };
  }
  private moveDir() {
    const k = this.keyDir();
    let x = k.x + this.joy.x;
    let y = k.y + this.joy.y;
    const n = len(x, y);
    if (n > 1) { x /= n; y /= n; }
    return { x, y };
  }

  // ---------- Armado ----------
  private ent(role: Role, x: number, y: number, kit: Kit, look: Look): Ent {
    const e: Ent = {
      role, x, y, vx: 0, vy: 0, kit, look, face: role === "gk" || role === "wall" ? -1 : 1, phase: rand() * 6, stun: 0, dive: 0, laneY: y, hold: 0,
      celebrate: false, kick: 0, hz: 0, hvz: 0, tk: "none", tt: 0, sdx: 0, sdy: 0, cd: 0.6, close: 0, homeX: x, homeY: y,
    };
    this.ents.push(e);
    return e;
  }

  private setup() {
    const { kind, kit, rivalKit, look, num } = this.s;
    this.ents = [];
    this.mate = null;
    const r = this.rng;
    const rl = () => lookFrom(r);
    const myKit = { ...kit, num };
    const mateKit = { ...kit, num: 9 };
    const gkKit: Kit = { c1: "#bef264", c2: "#1f2937", num: 1 };
    const j = () => (rand() - 0.5) * 70;
    switch (kind) {
      case "mano":
        this.me = this.ent("me", 520, GY + j(), myKit, look);
        this.ent("def", 450, this.me.y + 50, rivalKit, rl());
        break;
      case "contra":
        this.me = this.ent("me", 420, 240 + j() * 0.5, myKit, look);
        this.mate = this.ent("mate", 430, 430, mateKit, rl());
        this.ent("def", 670, 330, rivalKit, rl());
        break;
      case "pared":
        this.me = this.ent("me", 560, GY + j(), myKit, look);
        this.mate = this.ent("mate", 720, 210, mateKit, rl());
        this.ent("def", 650, GY + 20, rivalKit, rl());
        this.ent("def", 790, 250, rivalKit, rl());
        break;
      case "afuera":
        this.me = this.ent("me", 640, GY + j(), myKit, look);
        this.ent("def", 750, GY - 40, rivalKit, rl());
        this.ent("def", 770, GY + 60, rivalKit, rl());
        break;
      case "banda":
        this.me = this.ent("me", 600, 92, myKit, look);
        this.mate = this.ent("mate", 740, 380, mateKit, rl());
        this.ent("def", 730, 165, rivalKit, rl());
        this.ent("def", 830, 360, rivalKit, rl());
        break;
      case "libre": {
        const bx = GX - 200 - rand() * 60;
        const by = GY + (rand() - 0.5) * 220;
        this.me = this.ent("me", bx - 26, by + 4, myKit, look);
        const dx = GX - bx, dy = GY - by;
        const d = len(dx, dy);
        const ux = dx / d, uy = dy / d;
        for (let i = -1; i <= 1; i++) {
          const w = this.ent("wall", bx + ux * 70 - uy * i * 15, by + uy * 70 + ux * i * 15, rivalKit, rl());
          w.face = -1;
        }
        break;
      }
      case "penal":
        this.me = this.ent("me", GX - 140, GY + 6, myKit, look);
        break;
      case "practica":
        this.me = this.ent("me", 560, GY, myKit, look);
        break;
      case "defensa": {
        // el rival arranca lejos; vos estás entre él y tu arco
        const y = GY + j();
        const a = this.ent("att", 330, y, rivalKit, rl());
        a.face = 1;
        this.ent("att", 290, y + (y > GY ? -150 : 150), rivalKit, rl());
        this.me = this.ent("me", 470, y + (y > GY ? -50 : 50), myKit, look);
        break;
      }
      case "posesion":
        this.me = this.ent("me", 430, GY + j() * 0.5, myKit, look);
        this.mate = this.ent("mate", 520, GY - 130, mateKit, rl());
        this.ent("mate", 520, GY + 130, { ...kit, num: 8 }, rl());
        this.ent("def", 520, GY - 20, rivalKit, rl());
        this.ent("def", 560, GY + 40, rivalKit, rl());
        break;
      case "corner": {
        const top = rand() < 0.5;
        this.me = this.ent("me", GX - 210, GY + (top ? 40 : -40), myKit, look);
        this.mate = this.ent("mate", GX - 150, GY + (top ? -60 : 60), mateKit, rl());
        this.ent("def", GX - 120, GY + (top ? 10 : -10), rivalKit, rl());
        this.ent("def", GX - 90, GY + (top ? -40 : 40), rivalKit, rl());
        this.cross = { x: GX - 70 - rand() * 60, y: GY + (rand() - 0.5) * 120, t: 0 };
        this.ball = { x: GX - 4, y: top ? TOP + 6 : BOT - 6, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, shot: false, spin: 0, byMate: false, byRival: false, ax: 0, ay: 0, curveT: 0, kind: "normal" };
        break;
      }
    }
    if (!this.setPiece && kind !== "practica" && kind !== "corner" && rand() < 0.5) for (const e of this.ents) { e.y = 2 * GY - e.y; e.laneY = e.y; }
    for (const e of this.ents) { e.homeX = e.x; e.homeY = e.y; }
    if (this.mate) this.mate.laneY = this.mate.y;
    this.gk = this.ent("gk", GX - 16, GY, kind === "defensa" ? { c1: "#38bdf8", c2: "#0f172a", num: 1 } : gkKit, rl());
    if (kind === "libre") {
      const walls = this.ents.filter((e) => e.role === "wall");
      const wallY = walls.reduce((a, e) => a + e.y, 0) / walls.length;
      this.gk.y = GY + (wallY > GY ? -22 : 22);
    }
    if (kind === "corner") { this.cam = { x: GX - 150, y: GY }; return; }
    const att = this.ents.find((e) => e.role === "att");
    const bx = kind === "libre" ? this.me.x + 26 : kind === "penal" ? GX - 110 : att ? att.x + 14 : this.me.x + 14;
    const by = kind === "libre" ? this.me.y - 4 : kind === "penal" ? GY : att ? att.y + 2 : this.me.y + 2;
    this.ball = { x: bx, y: by, z: 0, vx: 0, vy: 0, vz: 0, owner: this.setPiece ? null : att ?? this.me, last: att ?? this.me, shot: false, spin: 0, byMate: false, byRival: false, ax: 0, ay: 0, curveT: 0, kind: "normal" };
    this.cam = { x: this.me.x + 120, y: this.me.y };
  }

  // ---------- Disparo ----------
  /** Hacia dónde iría el remate ahora mismo. */
  private shotPlan(who: Ent): { toGoal: boolean; ox: number; oy: number; ty: number; dx?: number; dy?: number } {
    const isMe = who === this.me;
    const ox = this.setPiece ? this.ball.x : who.x;
    const oy = this.setPiece ? this.ball.y : who.y;
    if (this.setPiece && isMe) return { toGoal: true, ox, oy, ty: GY + this.aim * GW * 0.92 };
    const kd = isMe ? this.moveDir() : { x: 0, y: 0 };
    if (isMe && kd.x < -0.2) return { toGoal: false, ox, oy, ty: oy, dx: kd.x, dy: kd.y };
    const vert = isMe ? (kd.y !== 0 ? kd.y : -Math.sign(oy - GY || 1) * 0.8) : rand() < 0.5 ? -0.8 : 0.8;
    return { toGoal: true, ox, oy, ty: GY + clamp(vert, -1, 1) * GW * 0.72 };
  }

  private shoot(who: Ent, charge: number, colocado = false) {
    const st = this.s.stats;
    const isMe = who === this.me;
    const tiro = isMe ? st.tiro : who.role === "att" ? 55 + this.s.rival * 30 : 70;
    const plan = this.shotPlan(who);
    const c = clamp(charge, 0.05, 1.15);
    const over = Math.max(0, c - 0.9);
    let kind: ShotKind = "normal";
    if (isMe && plan.toGoal && c < 0.14 && !this.setPiece) kind = "chip";
    else if (isMe && colocado) kind = "curve";
    let tx: number, ty: number;
    if (plan.toGoal) { tx = GX + 6; ty = plan.ty; }
    else { tx = plan.ox + (plan.dx ?? 1) * 200; ty = plan.oy + (plan.dy ?? 0) * 200; }
    let spread = Math.max(0.025, 0.16 - tiro / 650) * (1 + over * 6) + (this.s.energy < 30 && isMe ? 0.04 : 0);
    if (kind === "curve") spread *= 0.45;
    if (kind === "chip") spread *= 0.6;
    if (this.s.weather === "lluvia") spread *= 1.15;
    const a0 = Math.atan2(ty - plan.oy, tx - plan.ox) + (rand() - 0.5) * 2 * spread;
    const dist = len(tx - plan.ox, ty - plan.oy);
    let power = 480 + c * 560 + tiro * 2.5;
    let vz = 70 + c * 150 + over * 420;
    let launch = a0;
    const b = this.ball;
    b.ax = 0; b.ay = 0; b.curveT = 0;
    if (kind === "chip") {
      power = 330 + tiro;
      const t = dist / power;
      vz = ((GRAV * t) / 2) * 1.04;
    } else if (kind === "curve") {
      power *= 0.8;
      vz = 55 + c * 90 + over * 300;
      // sale por afuera y se cierra hacia el palo (rodea la barrera)
      const side = Math.sign(ty - GY) || 1;
      launch = a0 + side * (this.setPiece ? 0.36 : 0.2);
      const t = dist / power;
      const ex = plan.ox + Math.cos(a0) * dist, ey = plan.oy + Math.sin(a0) * dist;
      const lx = plan.ox + Math.cos(launch) * power * t, ly = plan.oy + Math.sin(launch) * power * t;
      b.ax = (2 * (ex - lx)) / (t * t);
      b.ay = (2 * (ey - ly)) / (t * t);
      b.curveT = t;
    }
    b.owner = null;
    b.last = who;
    b.vx = Math.cos(launch) * power;
    b.vy = Math.sin(launch) * power;
    b.vz = vz;
    b.shot = plan.toGoal;
    b.kind = kind;
    b.byMate = who.role === "mate";
    b.byRival = who.role === "att";
    if (!this.setPiece) { b.x = who.x + Math.cos(launch) * 16; b.y = who.y + Math.sin(launch) * 16; }
    this.shotT = this.t;
    who.kick = 1;
    if (isMe) this.pShots++;
    sfx.kick(c);
    this.burstGrass(b.x, b.y, 10);
    this.shake = Math.max(this.shake, 3 + c * 4);
    this.timeScale = this.s.epic || this.s.decisive ? 0.4 : 0.7;
    // la barrera salta... si lee bien el remate
    for (const w of this.ents) if (w.role === "wall" && rand() < 0.55) w.hvz = 170 + rand() * 40;
    if (this.s.kind === "penal") {
      const sideAim = Math.sign(plan.ty - GY);
      const strong = Math.abs(plan.ty - GY) > GW * 0.3;
      const right = rand() < 0.3 + this.s.rival * 0.25;
      this.penGuess = strong ? (right ? plan.ty : GY - sideAim * GW * 0.6) : pick([GY, GY - GW * 0.6, GY + GW * 0.6]);
    }
    if (kind === "chip") this.popText("¡VASELINA!", "#fde68a");
  }

  private mateShoot() {
    if (!this.mate || this.ball.owner !== this.mate) return;
    this.shoot(this.mate, 0.75 + rand() * 0.2);
  }

  private pass(from: Ent) {
    const isMe = from === this.me;
    const target = isMe ? this.mate : this.me;
    from.kick = 0.8;
    if (!target) {
      this.kickTo(from, from.x + 140, from.y, 0.5);
      return;
    }
    const pase = isMe ? this.s.stats.pase : 72;
    const d = len(target.x - from.x, target.y - from.y);
    const speed = 420 + pase * 2;
    const tLead = d / speed;
    let tx = target.x + target.vx * tLead + (isMe ? 30 : 20);
    let ty = target.y + target.vy * tLead;
    const err = (1 - pase / 110) * 40;
    tx += (rand() - 0.5) * err;
    ty += (rand() - 0.5) * err;
    if (this.s.kind === "banda" && isMe) {
      tx = clamp(target.x + 20, 840, 905);
      ty = clamp(target.y, GY - 80, GY + 80);
      this.kickTo(from, tx, ty, 0.9, true);
    } else this.kickTo(from, tx, ty, 0.55);
    sfx.pass();
    if (isMe) { this.good++; if (this.s.kind === "posesion") this.passes++; }
  }

  private kickTo(from: Ent, tx: number, ty: number, power: number, lofted = false) {
    const dx = tx - from.x, dy = ty - from.y;
    const d = len(dx, dy) || 1;
    const sp = clamp(d * 1.55 + 120, 240, 820) * (0.8 + power * 0.3);
    const b = this.ball;
    b.owner = null;
    b.last = from;
    b.shot = false;
    b.kind = "normal";
    b.byRival = from.role === "att";
    b.ax = 0; b.ay = 0; b.curveT = 0;
    b.vx = (dx / d) * sp;
    b.vy = (dy / d) * sp;
    b.vz = lofted ? (GRAV * (d / sp)) / 2 : 20;
  }

  // ---------- Bucle ----------
  private loop = (now: number) => {
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.replay) this.updateReplay(raw);
    else this.update(raw * this.timeScale, raw);
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
    this.jumpT = Math.max(0, this.jumpT - dt);
    if (this.charge >= 0) this.charge = Math.min(1.15, this.charge + dt * 1.3);

    if (this.result) {
      this.endTimer -= raw;
      this.timeScale = Math.min(1, this.timeScale + raw * 0.5);
      if (this.practice && this.endTimer <= 0) this.resetPractice();
      else if (this.endTimer <= 0 && !this.done) {
        if ((this.result === "gol" || this.result === "asist") && !this.replayDone) this.startReplay();
        else this.finishNow();
        return;
      }
    } else if (this.intro <= 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0 && !this.ballInFlight()) {
        if (this.practice) { this.quit(); return; }
        const ours = this.ball.owner === this.me || this.ball.owner === this.mate || this.ball.owner?.role === "mate";
        if (this.s.kind === "posesion" && ours) this.finish("posesion", "¡QUÉ TOQUE!", `Aguantaste la pelota (${this.passes} pases)`, "#86efac");
        else if (this.s.kind === "defensa") this.finish("tiempo", "¡LLEGÓ EL APOYO!", "Lo demoraste hasta que volvió la defensa", "#e5e7eb");
        else this.finish("tiempo", "¡SE ACABÓ EL TIEMPO!", "La defensa se acomodó", "#e5e7eb");
      }
    }

    if (this.intro <= 0) {
      this.updateMe(dt);
      this.updateAI(dt);
      // córner: el centro sale solo
      if (this.cross && !this.crossDone && this.t > 0.5) {
        this.crossDone = true;
        const b = this.ball;
        const dx = this.cross.x - b.x, dy = this.cross.y - b.y;
        const d = len(dx, dy);
        const sp = 430;
        b.vx = (dx / d) * sp; b.vy = (dy / d) * sp;
        b.vz = (GRAV * (d / sp)) / 2 + 30;
        b.last = null;
        sfx.kick(0.6);
      }
      // defensa: si la recuperaste y la aguantás, ganaste
      if (this.recoverT >= 0 && this.ball.owner === this.me && this.t - this.recoverT > 0.6 && !this.result) this.finish("recupero", "¡RECUPERADA!", "Cortaste el contraataque", "#86efac");
      // posesión: aguantar hasta el final
      if (this.s.kind === "posesion" && !this.result && this.passes >= 7) this.finish("posesion", "¡QUÉ TOQUE!", `${this.passes} pases seguidos: ¡olé, olé!`, "#86efac");
    }
    for (const e of this.ents) {
      if (e.tk !== "slide") { e.x += e.vx * dt; e.y += e.vy * dt; }
      e.x = clamp(e.x, -40, W + 20);
      e.y = clamp(e.y, TOP - 6, BOT + 6);
      const sp = len(e.vx, e.vy);
      e.phase += sp * dt * 0.09;
      if (Math.abs(e.vx) > 8 && e.tk === "none" && e.role !== "wall") e.face = Math.sign(e.vx);
      e.stun = Math.max(0, e.stun - dt);
      e.kick = Math.max(0, e.kick - dt * 5);
      if (e.celebrate) e.phase += dt * 10;
      if (e.hz > 0 || e.hvz > 0) {
        e.hz += e.hvz * dt;
        e.hvz -= GRAV * dt;
        if (e.hz <= 0) { e.hz = 0; e.hvz = 0; }
      }
    }
    this.updateBall(dt);
    this.updateParticles(dt);
    this.record();

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
    if (me.tk === "slide") {
      me.x += me.sdx * dt; me.y += me.sdy * dt;
      me.sdx *= Math.pow(0.25, dt); me.sdy *= Math.pow(0.25, dt);
      me.vx = me.sdx; me.vy = me.sdy;
      me.tt -= dt;
      const b = this.ball;
      const o = b.owner;
      if (len(b.x - me.x, b.y - me.y) < 20 && b.z < 14 && o !== me) {
        if (!o || o.role === "def" || o.role === "att") this.recover(o);
      }
      if (me.tt <= 0) { me.tk = "down"; me.tt = 0.4; me.vx = 0; me.vy = 0; }
      return;
    }
    if (me.tk === "down") {
      me.tt -= dt; me.vx *= 0.8; me.vy *= 0.8;
      if (me.tt <= 0) me.tk = "none";
      return;
    }
    if (me.stun > 0) { me.vx *= 0.85; me.vy *= 0.85; return; }
    const d = this.moveDir();
    if (this.setPiece && !this.ball.shot && !this.result) {
      this.aim = clamp(this.aim + d.y * dt * 1.3, -1, 1);
      me.vx = 0; me.vy = 0;
      me.face = 1;
      return;
    }
    const st = this.s.stats;
    const wantSprint = this.keys.has("shift") || this.touchSprint || len(this.joy.x, this.joy.y) > 0.92;
    const moving = d.x !== 0 || d.y !== 0;
    if (wantSprint && moving && this.sprint > 0) this.sprint = Math.max(0, this.sprint - dt * (0.55 - st.fisico / 400));
    else this.sprint = Math.min(1, this.sprint + dt * 0.25);
    const sprinting = wantSprint && moving && this.sprint > 0.02;
    let max = 150 + st.velocidad * 1.45;
    if (sprinting) max *= 1.32;
    if (this.ball.owner === me) max *= 0.84 + st.regate / 700;
    if (this.s.kind === "defensa" && this.ball.owner !== me) max *= 1.06;
    if (this.s.energy < 30) max *= 0.9;
    if (this.charge >= 0) max *= 0.55;
    const acc = this.s.weather === "lluvia" ? 6 : 9;
    me.vx += (d.x * max - me.vx) * Math.min(1, acc * dt);
    me.vy += (d.y * max - me.vy) * Math.min(1, acc * dt);
  }

  private updateAI(dt: number) {
    const b = this.ball;
    const lvl = this.s.rival;
    const carrier = b.owner;
    const defs = this.ents.filter((d) => d.role === "def");
    for (const e of this.ents) {
      if (e.role === "me" || e.role === "wall") continue;
      if (e.celebrate) { e.vx *= 0.9; e.vy *= 0.9; continue; }
      if (e.role === "gk") { this.updateGK(e, dt, lvl); continue; }
      let tx = e.x, ty = e.y, sp = 200;
      if (e.tk === "down") { e.vx *= 0.8; e.vy *= 0.8; e.tt -= dt; if (e.tt <= 0) { e.tk = "none"; e.cd = 1.3; } continue; }
      if (e.role === "att") {
        // atacante rival: encara hacia tu arco
        if (b.owner === e) {
          e.hold += dt;
          const dme = len(this.me.x - e.x, this.me.y - e.y);
          tx = GX - 40; ty = GY + Math.sin(this.t * 2 + e.homeY) * 70;
          sp = 150 + lvl * 60;
          if (dme < 45 && this.me.tk === "none") ty = e.y + (this.me.y > e.y ? -90 : 90); // te esquiva
          const partner = this.ents.find((x) => x.role === "att" && x !== e);
          if (partner && dme < 40 && e.hold > 0.6 && rand() < dt * 2) { this.kickTo(e, partner.x + 40, partner.y, 0.5); e.hold = 0; }
          else if (e.x > GX - 175 && e.hold > 0.3) this.shoot(e, 0.7 + rand() * 0.3);
        } else {
          tx = Math.min((b.owner ?? b).x + 60, GX - 120); ty = e.homeY; sp = 190;
          if (!b.owner && !b.shot && b.last?.role === "att") { tx = b.x; ty = b.y; sp = 230; }
        }
      } else if (e.role === "mate") {
        if (this.s.kind === "posesion") {
          // ofrecerse como descarga y devolverla rápido
          const side = e.homeY > GY ? 1 : -1;
          tx = this.me.x + 70 + Math.sin(this.t + side) * 30;
          ty = clamp(this.me.y + side * 120, TOP + 30, BOT - 30);
          sp = 210;
          if (b.owner === e) {
            e.hold += dt;
            tx = e.x; ty = e.y;
            if ((this.wantPared > 0 && e.hold > 0.12) || e.hold > 0.7 || this.closestDef(e) < 35) { this.wantPared = 0; this.pass(e); this.passes++; }
          }
        } else if (b.owner === e) {
          e.hold += dt;
          tx = GX - 60; ty = GY + (e.laneY > GY ? 40 : -40); sp = 190;
          const dGoal = len(GX - e.x, GY - e.y);
          const near = this.closestDef(e);
          if (this.wantPared > 0 && e.hold > 0.12) { this.wantPared = 0; this.pass(e); this.good++; }
          else if (this.s.kind === "banda" && e.x > 800) this.mateShoot();
          else if (dGoal < 230 && e.hold > 0.35) this.mateShoot();
          else if (near < 30 && e.hold > 0.5) this.pass(e);
        } else {
          tx = Math.min(this.me.x + 150, GX - 90);
          ty = e.laneY + Math.sin(this.t * 1.5) * 20;
          sp = 215;
          if (!b.owner && b.last === this.me && !b.shot) { tx = b.x + b.vx * 0.25; ty = b.y + b.vy * 0.25; sp = 260; }
        }
      } else {
        // ----- defensor -----
        e.cd = Math.max(0, e.cd - dt);
        if (e.tk === "slide") {
          e.x += e.sdx * dt; e.y += e.sdy * dt;
          e.sdx *= Math.pow(0.25, dt); e.sdy *= Math.pow(0.25, dt);
          e.vx = e.sdx; e.vy = e.sdy;
          e.tt -= dt;
          const victim = b.owner && b.owner.role !== "def" && b.owner.role !== "gk" ? b.owner : null;
          const jumping = victim === this.me && this.jumpT > 0;
          if (!jumping && len(b.x - e.x, b.y - e.y) < 19 && b.z < 12 && (victim || (!b.shot && !b.owner))) {
            this.steal(e, true);
            e.tk = "down"; e.tt = 0.7;
            continue;
          }
          if (e.tt <= 0) { e.tk = "down"; e.tt = 0.85; e.vx = 0; e.vy = 0; }
          continue;
        }
        if (e.tk === "wind") {
          e.vx *= 0.6; e.vy *= 0.6; e.tt -= dt;
          if (e.tt <= 0) {
            const tgt = carrier ?? b;
            const px = tgt.x + tgt.vx * 0.22, py = tgt.y + tgt.vy * 0.22;
            const dx = px - e.x, dy = py - e.y;
            const dl = len(dx, dy) || 1;
            const ssp = 420 + lvl * 90;
            e.sdx = (dx / dl) * ssp; e.sdy = (dy / dl) * ssp;
            e.face = Math.sign(dx) || -1;
            e.tk = "slide"; e.tt = 0.34;
            sfx.pass();
          }
          continue;
        }
        if (e.stun > 0 || this.t < 0.55) { e.vx *= 0.85; e.vy *= 0.85; continue; }
        sp = 165 + lvl * 95;
        if (b.owner === e) {
          // te la sacó: intenta despejar antes de que se la recuperes
          e.hold += dt;
          tx = e.x - 200; ty = e.y + (e.y > GY ? 60 : -60); sp = 170;
          if (e.hold > 1.0) {
            this.kickTo(e, e.x - 420, e.y + (rand() - 0.5) * 200, 1);
            this.finish("perdida", "¡DESPEJÓ!", "El rival la sacó lejos", "#fca5a5");
          }
          const dx0 = tx - e.x, dy0 = ty - e.y, dl0 = len(dx0, dy0) || 1;
          e.vx += ((dx0 / dl0) * sp - e.vx) * Math.min(1, 6 * dt);
          e.vy += ((dy0 / dl0) * sp - e.vy) * Math.min(1, 6 * dt);
          continue;
        }
        const idx = defs.indexOf(e);
        const marking = idx === 1 && this.mate && carrier === this.me;
        if (marking && this.mate) {
          tx = this.mate.x + (b.x - this.mate.x) * 0.35;
          ty = this.mate.y + (b.y - this.mate.y) * 0.35;
          sp *= 0.95;
        } else {
          const target = carrier ?? (b.shot ? null : b);
          if (target) {
            const gx = GX - target.x, gy = GY - target.y;
            const gl = len(gx, gy) || 1;
            const off = carrier && carrier !== e ? 18 : 0;
            tx = target.x + (gx / gl) * off;
            ty = target.y + (gy / gl) * off;
          }
        }
        if (carrier && (carrier === this.me || carrier === this.mate)) {
          const dd = len(carrier.x - e.x, carrier.y - e.y);
          if (dd < 75 && dd > 20 && e.cd <= 0 && rand() < dt * (0.9 + lvl * 1.6)) {
            e.tk = "wind";
            e.tt = 0.42 - lvl * 0.1;
            continue;
          }
          if (dd < 14) {
            e.close += dt;
            if (e.close > 1.1) { e.close = 0; this.steal(e, false); }
          } else e.close = Math.max(0, e.close - dt);
        }
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
    for (const d of this.ents) if (d.role === "def" && d.tk !== "down") m = Math.min(m, len(d.x - p.x, d.y - p.y));
    return m;
  }

  private updateGK(g: Ent, dt: number, lvl: number) {
    const b = this.ball;
    if (this.result) { g.vx *= 0.9; g.vy *= 0.9; return; }
    if (b.shot && b.vx > 0 && !b.owner) {
      const react = this.s.kind === "penal" ? 0.12 : 0.22 - lvl * 0.08;
      if (this.t - this.shotT > react) {
        let ty: number;
        if (this.penGuess !== null) ty = this.penGuess;
        else {
          const tHit = (g.x - b.x) / b.vx;
          if (tHit <= 0) return;
          ty = clamp(b.y + b.vy * tHit, GY - GW - 20, GY + GW + 20);
        }
        const sp = (this.s.kind === "penal" ? 260 : 200) + lvl * 120;
        const dy = ty - g.y;
        g.vy = clamp(dy * 10, -sp, sp);
        g.vx = 0;
        g.dive = clamp(dy / 70, -1, 1);
      } else { g.vx = 0; g.vy = 0; }
      return;
    }
    g.dive *= 0.9;
    if (this.setPiece) { g.vx = 0; g.vy = 0; return; }
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
    if (b.owner && b.owner.role !== "gk" && len(b.owner.x - g.x, b.owner.y - g.y) < 20 && rand() < dt * (1.2 + lvl)) {
      b.owner = g;
      this.finish("atajada", "¡SE LA SACÓ EL ARQUERO!", "Le achicó bien", "#93c5fd");
      sfx.save();
    }
  }

  private steal(d: Ent, slide: boolean) {
    const b = this.ball;
    const victim = b.owner;
    b.owner = null;
    const dir = slide ? Math.atan2(d.sdy, d.sdx) : Math.PI + (rand() - 0.5);
    b.vx = Math.cos(dir) * 260;
    b.vy = Math.sin(dir) * 260;
    b.vz = 50;
    b.last = d;
    b.shot = false;
    this.burstGrass(d.x, d.y, 12);
    if (victim) victim.stun = 0.5;
    sfx.save();
    this.bad++;
    this.popText(slide ? "¡QUÉ BARRIDA!" : "¡TE LA ROBARON!", "#fca5a5");
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
      b.z = o.hz + Math.abs(Math.sin(o.phase)) * 2;
      b.vx = o.vx; b.vy = o.vy; b.vz = 0;
      if (o.role === "gk" && !this.result) this.finish("atajada", "¡LA AGARRÓ EL ARQUERO!", undefined, "#93c5fd");
      return;
    }
    const prevX = b.x;
    if (b.curveT > 0) {
      b.vx += b.ax * dt;
      b.vy += b.ay * dt;
      b.curveT -= dt;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    if (b.z > 0 || b.vz > 0) b.vz -= GRAV * dt;
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -60) b.vz = -b.vz * 0.42;
      else b.vz = 0;
      if (b.curveT <= 0) {
        const f = Math.pow(this.s.weather === "lluvia" ? 0.45 : 0.32, dt);
        b.vx *= f; b.vy *= f;
      }
    } else if (b.curveT <= 0) {
      const f = Math.pow(0.9, dt);
      b.vx *= f; b.vy *= f;
    }
    if (this.result) return;

    if (prevX < GX && b.x >= GX) {
      const inMouth = Math.abs(b.y - GY) < GW;
      const postHit = Math.abs(Math.abs(b.y - GY) - GW) < 5;
      if (postHit && b.z < BAR) {
        b.x = GX - 2;
        b.vx = -Math.abs(b.vx) * 0.5;
        b.vy += (rand() - 0.5) * 200;
        b.curveT = 0;
        sfx.post();
        this.shake = 8;
        this.finish("palo", "¡PALO!", "Por centímetros...", "#e5e7eb", 1.6);
        sfx.ooh();
        return;
      }
      if (inMouth && b.z < BAR) { this.goal(); return; }
      this.finish("afuera", b.z >= BAR && inMouth ? "¡POR ARRIBA!" : "¡AFUERA!", pick(["Se fue rozando el palo", "La tribuna se agarra la cabeza", "Uff, cerca"]), "#e5e7eb");
      sfx.ooh();
      return;
    }
    if (b.y < TOP - 10 || b.y > BOT + 10 || b.x > W + 30 || b.x < -60) {
      this.finish(b.shot ? "afuera" : "perdida", b.shot ? "¡AFUERA!" : "SE FUE AL LATERAL", undefined, "#e5e7eb");
      return;
    }

    if (b.shot) {
      for (const w of this.ents) {
        if (w.role !== "wall") continue;
        if (Math.abs(b.x - w.x) < 9 && Math.abs(b.y - w.y) < 9 && b.z < 28 + w.hz) {
          b.vx = -Math.abs(b.vx) * 0.3;
          b.vy = (rand() - 0.5) * 300;
          b.vz = 140;
          b.shot = false;
          b.curveT = 0;
          sfx.save();
          this.finish("atajada", "¡LA BARRERA!", "Pegó en la barrera", "#fca5a5");
          return;
        }
      }
    }

    const g = this.gk;
    if (b.shot && Math.abs(b.x - g.x) < 14 && b.vx > 0) {
      const reach = 15 + this.s.rival * 8 + Math.abs(g.dive) * 6;
      if (Math.abs(b.y - g.y) < reach && b.z < GK_REACH_Z + Math.abs(g.dive) * 6) {
        const strong = len(b.vx, b.vy) > 860;
        if (!strong || rand() < 0.55 + this.s.rival * 0.3) {
          b.vx = -Math.abs(b.vx) * 0.35;
          b.vy = (rand() - 0.5) * 400;
          b.vz = 120;
          b.shot = false;
          b.curveT = 0;
          this.shake = 6;
          sfx.save();
          this.finish("atajada", pick(["¡QUÉ ATAJADA!", "¡LA SACÓ!", "¡MANOTAZO!"]), "El arquero se lució", "#93c5fd", 1.6);
          return;
        }
      }
    }

    if (this.cross && !b.shot && b.z > 8 && b.z < 46) {
      for (const d of this.ents) {
        if (d.role !== "def" || len(b.x - d.x, b.y - d.y) > 17) continue;
        b.vx = -380; b.vy = (rand() - 0.5) * 300; b.vz = 160; b.last = d;
        d.hvz = 180;
        this.cross = null;
        sfx.save();
        this.finish("perdida", "¡DESPEJÓ DE CABEZA!", "El central ganó arriba", "#fca5a5");
        return;
      }
    }
    if (b.z < 26) {
      for (const e of this.ents) {
        if (e.role === "wall" || e.tk === "slide" || e.tk === "down") continue;
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
        if (d < r && !(b.shot && e.role !== "def" && e.role !== "att") && !(b.last === e && len(b.vx, b.vy) > 200)) {
          if (e === this.me && b.owner === null && b.last && (b.last.role === "def" || b.last.role === "att") && b.last.tk !== "slide") this.recover(null);
          if (e.role === "def") {
            if (b.shot && rand() > 0.35) continue;
            if (b.shot) {
              b.owner = e;
              this.bad++;
              this.finish("atajada", "¡BLOQUEADO!", "El defensor se tiró al piso", "#fca5a5");
              sfx.save();
              return;
            }
            b.owner = e;
            e.hold = 0;
            if (b.last === this.me || b.last === this.mate || b.last?.role === "mate") { this.bad++; this.popText("¡CORTADA!", "#fca5a5"); }
            sfx.save();
            return;
          }
          if (e.role === "att") {
            if (b.shot) continue;
            b.owner = e;
            e.hold = 0;
            return;
          }
          b.owner = e;
          b.shot = false;
          e.hold = 0;
          if (e === this.mate && this.s.kind === "banda" && b.last === this.me) this.mateShoot();
          return;
        }
      }
    }
    if (b.shot && len(b.vx, b.vy) < 70 && b.z === 0) {
      b.shot = false;
      this.finish("afuera", "SIN FUERZA", "La pelota murió antes del arco", "#e5e7eb");
    }
  }

  private goal() {
    const b = this.ball;
    if (b.byRival) {
      this.shake = 10;
      sfx.ooh();
      this.finish("golrival", "GOL DEL RIVAL", "No llegaste a cortarlo...", "#fca5a5", 1.6);
      return;
    }
    const byMate = b.byMate;
    this.netWave = 1;
    this.shake = 16;
    this.timeScale = 0.35;
    this.goalT = this.t;
    sfx.goal();
    if (byMate && this.mate) this.mate.celebrate = "salto";
    this.me.celebrate = byMate ? "salto" : this.s.celebration || "salto";
    this.confetti();
    this.flares();
    if (!byMate) this.pGoals++;
    const sub = byMate ? "¡Asistencia tuya!" : b.kind === "chip" ? "¡Qué vaselina!" : b.kind === "curve" ? "¡Con comba al ángulo!" : this.s.epic ? "¡EN EL MINUTO 90!" : this.setPiece ? "¡Golazo de pelota parada!" : "¡La metiste!";
    this.finish(byMate ? "asist" : "gol", byMate ? "¡GOOOL!" : pick(["¡GOOOLAZO!", "¡GOOOOL!", "¡A COBRAR!"]), sub, "#fde047", this.practice ? 1.6 : 2.2);
  }

  private finish(r: PlayOutcome, text: string, sub: string | undefined, color: string, wait = 1.4) {
    if (this.result) return;
    this.result = r;
    this.endTimer = this.practice ? Math.min(wait, 1.2) : wait;
    this.charge = -1;
    this.banner = { text, sub, t: 0, color };
    if (r !== "gol" && r !== "asist") sfx.whistle();
  }

  private finishNow() {
    if (this.done) return;
    this.done = true;
    this.onEnd({ outcome: this.result ?? "tiempo", good: this.good, bad: this.bad, shots: this.pShots, goals: this.pGoals });
  }

  private skipToEnd() {
    if (this.practice) return;
    this.replay = null;
    this.replayDone = true;
    this.finishNow();
  }

  private resetPractice() {
    this.result = null;
    this.banner = null;
    this.replay = null;
    this.timeScale = 1;
    this.me.x = 480 + rand() * 200;
    this.me.y = GY + (rand() - 0.5) * 300;
    this.me.vx = 0; this.me.vy = 0; this.me.celebrate = false;
    this.gk.x = GX - 16; this.gk.y = GY; this.gk.dive = 0; this.gk.vx = 0; this.gk.vy = 0;
    Object.assign(this.ball, { x: this.me.x + 14, y: this.me.y + 2, z: 0, vx: 0, vy: 0, vz: 0, owner: this.me, last: this.me, shot: false, byMate: false, ax: 0, ay: 0, curveT: 0, kind: "normal" });
  }

  private popText(text: string, color: string) {
    if (this.result) return;
    this.banner = { text, t: 0, color };
    setTimeout(() => {
      if (this.banner?.text === text) this.banner = null;
    }, 700);
  }

  // ---------- Repetición ----------
  private record() {
    if (this.replay) return;
    const e = this.ents.map((x) => [x.x, x.y, x.face, x.phase, x.dive, x.kick, x.hz, x.tk === "slide" ? 1 : 0, x.tk === "down" ? 1 : 0, x.celebrate ? 1 : 0, x.tk === "wind" ? 1 : 0, x.vx, x.vy]);
    const b = this.ball;
    this.snaps.push({ t: this.t, e, b: [b.x, b.y, b.z, b.spin] });
    while (this.snaps.length && this.snaps[0].t < this.t - 3.4) this.snaps.shift();
  }

  private startReplay() {
    if (this.practice || !this.snaps.length) { this.finishNow(); return; }
    const start = Math.max(this.snaps[0].t, this.goalT - 2.6);
    if (this.goalT - start < 0.6) { this.finishNow(); return; }
    this.replay = { start, end: this.goalT + 0.35, clock: 0 };
    this.banner = null;
  }

  private updateReplay(raw: number) {
    const r = this.replay!;
    r.clock += raw * 0.45;
    const t = r.start + r.clock;
    const snap = this.snaps.find((s) => s.t >= t) ?? this.snaps[this.snaps.length - 1];
    snap.e.forEach((v, i) => {
      const e = this.ents[i];
      if (!e) return;
      [e.x, e.y, e.face, e.phase, e.dive, e.kick, e.hz] = v;
      e.tk = v[7] ? "slide" : v[8] ? "down" : v[10] ? "wind" : "none";
      e.celebrate = v[9] ? e.celebrate || "salto" : false;
      e.vx = v[11]; e.vy = v[12];
    });
    [this.ball.x, this.ball.y, this.ball.z, this.ball.spin] = snap.b;
    this.cam.x += (this.ball.x + 40 - this.cam.x) * Math.min(1, raw * 4);
    this.cam.y += (this.ball.y - this.cam.y) * Math.min(1, raw * 4);
    this.netWave = t >= this.goalT ? Math.max(this.netWave, 1 - (t - this.goalT)) : 0;
    this.updateParticles(raw * 0.3);
    if (t >= r.end) {
      this.replay = null;
      this.replayDone = true;
      this.finishNow();
    }
  }

  // ---------- Partículas ----------
  private burstGrass(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++)
      this.parts.push({ x, y, z: 2, vx: (rand() - 0.5) * 160, vy: (rand() - 0.5) * 80, vz: 80 + rand() * 120, life: 0.6, max: 0.6, color: rand() < 0.5 ? "#4ade80" : "#166534", size: 2 + rand() * 2, type: "grass" });
  }
  private confetti() {
    const cols = [this.s.kit.c1, this.s.kit.c2, "#fde047", "#f8fafc"];
    for (let i = 0; i < 140; i++)
      this.parts.push({ x: GX - 60 + rand() * 80, y: GY + (rand() - 0.5) * 160, z: 20 + rand() * 40, vx: -rand() * 260, vy: (rand() - 0.5) * 300, vz: 200 + rand() * 320, life: 2.6, max: 2.6, color: pick(cols), size: 3 + rand() * 3, type: "confetti" });
  }
  private flares() {
    for (let i = 0; i < 6; i++) {
      const x = this.cam.x - 300 + rand() * 600;
      for (let k = 0; k < 14; k++)
        this.parts.push({ x: x + (rand() - 0.5) * 20, y: -60 - rand() * 60, z: 0, vx: (rand() - 0.5) * 30, vy: -20 - rand() * 30, vz: 0, life: 2.5 + rand(), max: 3.5, color: pick(["rgba(239,68,68,.5)", "rgba(249,115,22,.45)", "rgba(148,163,184,.35)"]), size: 10 + rand() * 18, type: "smoke" });
    }
  }
  private updateParticles(dt: number) {
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === "smoke") { p.size += dt * 12; p.life -= dt; continue; }
      p.z += p.vz * dt;
      p.vz -= (p.type === "confetti" ? 260 : GRAV) * dt;
      if (p.type === "confetti") { p.vx *= 0.98; p.vy *= 0.98; p.vz = Math.max(p.vz, -60); }
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
    this.drawCrossMark(ctx);
    this.drawAim(ctx);

    type D = { y: number; draw: () => void };
    const list: D[] = [];
    for (const e of this.ents) {
      list.push({
        y: e.y,
        draw: () =>
          drawPlayer(ctx, {
            x: e.x, y: e.y, s: e.role === "me" ? 1.08 : 1, look: e.look, kit: e.kit, face: e.face, phase: e.phase,
            moving: clamp(len(e.vx, e.vy) / 120, 0, 1), ring: e.role === "me" ? "#fde047" : e.role === "mate" ? "rgba(255,255,255,.55)" : undefined,
            celebrate: e.celebrate, dive: e.role === "gk" ? e.dive : 0, kick: e.kick, slide: e.tk === "slide", down: e.tk === "down",
            alert: e.tk === "wind", wind: e.tk === "wind", hop: e.hz,
          }),
      });
    }
    const b = this.ball;
    list.push({ y: b.y + 0.5, draw: () => drawBall(ctx, b.x, b.y, b.z, 6, b.spin) });
    for (const p of this.parts) {
      list.push({
        y: p.type === "smoke" ? -999 : p.y,
        draw: () => {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.min(1, (p.life / p.max) * 2);
          if (p.type === "confetti") ctx.fillRect(p.x, p.y - p.z, p.size, p.size * 0.6);
          else { ctx.beginPath(); ctx.arc(p.x, p.y - p.z, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
          ctx.globalAlpha = 1;
        },
      });
    }
    list.sort((a, b2) => a.y - b2.y).forEach((d) => d.draw());
    this.drawGoalFront(ctx);

    if (this.charge >= 0) {
      const w = 40;
      const x = this.me.x - w / 2, y = this.me.y - 78;
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, 9, 4); ctx.fill();
      const ch2 = Math.min(1, this.charge);
      ctx.fillStyle = this.charge < 0.14 && !this.setPiece ? "#fde68a" : this.charge > 0.9 ? "#ef4444" : this.charge > 0.6 ? "#f59e0b" : "#22c55e";
      ctx.beginPath(); ctx.roundRect(x, y, w * ch2, 5, 3); ctx.fill();
    }
    if (!this.result && !this.replay) {
      const bob = Math.sin(this.t * 6) * 2;
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#161616";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.me.x - 5, this.me.y - 88 + bob - this.me.hz);
      ctx.lineTo(this.me.x + 5, this.me.y - 88 + bob - this.me.hz);
      ctx.lineTo(this.me.x, this.me.y - 81 + bob - this.me.hz);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    this.drawWeather(ctx, cw, ch);
    if (this.replay) this.drawReplayOverlay(ctx, cw, ch);
    else this.drawHUD(ctx, cw, ch);
  }

  /** Córner: dónde cae el centro. */
  private drawCrossMark(ctx: CanvasRenderingContext2D) {
    if (!this.cross || this.result || this.ball.shot) return;
    const pulse = 1 + Math.sin(this.t * 10) * 0.12;
    ctx.save();
    ctx.strokeStyle = "#fde047";
    ctx.fillStyle = "rgba(253,224,71,.18)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(this.cross.x, this.cross.y, 24 * pulse, 10 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** Mira: dónde va a ir el remate. */
  private drawAim(ctx: CanvasRenderingContext2D) {
    if (this.result || this.replay || this.intro > 0) return;
    const canAim = this.canShootNow() && (this.setPiece || this.charge >= 0 || len(GX - this.me.x, GY - this.me.y) < 430);
    if (!canAim) return;
    const plan = this.shotPlan(this.me);
    if (!plan.toGoal) return;
    const charging = this.charge >= 0;
    const chip = charging && this.charge < 0.14 && !this.setPiece;
    const curve = this.keys.has("shift") || this.touchSprint;
    const col = this.charge > 0.9 ? "#ef4444" : chip ? "#fde68a" : "#fde047";
    const ty = plan.ty;
    const tz = chip ? 30 : 16;
    ctx.save();
    ctx.globalAlpha = charging || this.setPiece ? 0.95 : 0.45;
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plan.ox, plan.oy - 6);
    if (chip) ctx.quadraticCurveTo((plan.ox + GX) / 2, (plan.oy + ty) / 2 - 90, GX, ty - tz);
    else if (curve) ctx.quadraticCurveTo((plan.ox + GX) / 2, (plan.oy + ty) / 2 + (Math.sign(ty - GY) || 1) * 70, GX, ty - tz);
    else ctx.lineTo(GX, ty - tz);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(GX, ty - tz, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(GX - 14, ty - tz); ctx.lineTo(GX - 5, ty - tz);
    ctx.moveTo(GX + 5, ty - tz); ctx.lineTo(GX + 14, ty - tz);
    ctx.moveTo(GX, ty - tz - 14); ctx.lineTo(GX, ty - tz - 5);
    ctx.moveTo(GX, ty - tz + 5); ctx.lineTo(GX, ty - tz + 14);
    ctx.stroke();
    ctx.restore();
  }

  private drawPitch(ctx: CanvasRenderingContext2D, cx: number, viewW: number) {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-400, -280, W + 800, 270);
    const party = this.result === "gol" || this.result === "asist" || (!!this.replay && this.t >= this.goalT);
    for (const p of this.crowd) {
      const jump = party ? Math.abs(Math.sin(this.t * 9 + p.p)) * 6 : Math.abs(Math.sin(this.t * 2 + p.p)) * 1.2;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y - jump, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      const x = -60 + i * 210;
      const wave = Math.sin(this.t * 3 + i) * 6;
      ctx.fillStyle = i % 2 ? this.s.crowd[0] : this.s.crowd[1];
      ctx.beginPath();
      ctx.moveTo(x, -150);
      ctx.quadraticCurveTo(x + 30, -150 + wave, x + 60, -150);
      ctx.lineTo(x + 60, -110);
      ctx.quadraticCurveTo(x + 30, -110 + wave, x, -110);
      ctx.closePath();
      ctx.fill();
    }
    const adW = 170;
    for (let i = -3; i < 9; i++) {
      const x = i * adW;
      ctx.fillStyle = i % 2 ? "#0f172a" : "#1d4ed8";
      ctx.fillRect(x, -10, adW, 22);
      ctx.fillStyle = i % 2 ? "#fde047" : "#fff";
      ctx.font = "900 italic 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(ADS[(i + 24) % ADS.length], x + adW / 2, 6);
    }
    const stripe = 62;
    const wet = this.s.weather === "lluvia";
    for (let i = -5; i < W / stripe + 8; i++) {
      ctx.fillStyle = i % 2 ? (wet ? "#2b8a3e" : "#2f9e44") : wet ? "#2f9e44" : "#37b24d";
      ctx.fillRect(i * stripe, 12, stripe, H);
    }
    const grd = ctx.createRadialGradient(cx, 320, 50, cx, 320, viewW * 0.8);
    grd.addColorStop(0, "rgba(255,255,255,.07)");
    grd.addColorStop(1, "rgba(0,0,0,.18)");
    ctx.fillStyle = grd;
    ctx.fillRect(-400, 12, W + 800, H);
    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-400, TOP, GX + 400, BOT - TOP);
    ctx.beginPath(); ctx.moveTo(0, TOP); ctx.lineTo(0, BOT); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, GY, 90, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.strokeRect(GX - 165, GY - 165, 165, 330);
    ctx.strokeRect(GX - 55, GY - 75, 55, 150);
    ctx.beginPath(); ctx.arc(GX - 110, GY, 3, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.arc(GX - 110, GY, 90, Math.PI * 0.705, Math.PI * 1.295); ctx.stroke();
    for (const y of [TOP, BOT]) {
      ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(GX, y); ctx.lineTo(GX, y - 26); ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.moveTo(GX, y - 26); ctx.lineTo(GX + 13, y - 21); ctx.lineTo(GX, y - 16); ctx.fill();
    }
    ctx.fillStyle = "rgba(0,0,0,.16)";
    ctx.fillRect(GX, -20, 600, H + 200);
  }

  private drawGoalBack(ctx: CanvasRenderingContext2D) {
    const depth = 34;
    const wave = this.netWave;
    drawShadow(ctx, GX + depth / 2, GY, depth, GW + 6, 0.18);
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 1;
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
    this.post(ctx, GX, GY - GW);
  }

  private drawGoalFront(ctx: CanvasRenderingContext2D) {
    this.post(ctx, GX, GY + GW);
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

  private drawWeather(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    if (this.s.weather === "noche") {
      ctx.fillStyle = "rgba(8,15,40,.38)";
      ctx.fillRect(0, 0, cw, ch);
      for (const [x, y] of [[0, 0], [cw, 0]]) {
        const g = ctx.createRadialGradient(x, y, 10, x, y, cw * 0.55);
        g.addColorStop(0, "rgba(255,250,220,.28)");
        g.addColorStop(1, "rgba(255,250,220,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
      }
    } else if (this.s.weather === "lluvia") {
      ctx.fillStyle = "rgba(30,41,59,.22)";
      ctx.fillRect(0, 0, cw, ch);
      ctx.strokeStyle = "rgba(226,232,240,.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const d of this.rain) {
        d.y += 0.025 * d.s;
        d.x -= 0.004 * d.s;
        if (d.y > 1) { d.y -= 1; d.x = rand(); }
        if (d.x < 0) d.x += 1;
        const x = d.x * cw, y = d.y * ch;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 14 * d.s);
      }
      ctx.stroke();
    }
  }

  private drawReplayOverlay(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const bar = Math.min(60, ch * 0.09);
    ctx.fillStyle = "rgba(0,0,0,.8)";
    ctx.fillRect(0, 0, cw, bar);
    ctx.fillRect(0, ch - bar, cw, bar);
    if (Math.floor(performance.now() / 500) % 2) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(28, bar / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "900 italic 20px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("REPETICIÓN", 44, bar / 2 + 7);
    ctx.font = "700 12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.fillText("Espacio / PATEAR para saltar", cw - 16, ch - bar / 2 + 4);
  }

  private drawHUD(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const frac = clamp(this.timeLeft / this.totalTime, 0, 1);
    const bw = Math.min(260, cw * 0.5);
    const bx = (cw - bw) / 2;
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath(); ctx.roundRect(bx - 70, 10, bw + 140, 30, 15); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 15px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(this.practice ? `⚽ ${this.pGoals}/${this.pShots}` : `${this.s.minute}'`, bx - 60, 31);
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath(); ctx.roundRect(bx, 20, bw, 10, 5); ctx.fill();
    ctx.fillStyle = frac < 0.3 ? "#ef4444" : "#fde047";
    ctx.beginPath(); ctx.roundRect(bx, 20, bw * frac, 10, 5); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.fillText(this.s.weather === "noche" ? "🌙" : this.s.weather === "lluvia" ? "🌧️" : "☀️", bx + bw + 56, 31);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,.55)";
    ctx.beginPath(); ctx.roundRect(12, ch - 34, 150, 22, 11); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(this.setPiece ? "MIRA" : "SPRINT", 22, ch - 19);
    ctx.fillStyle = "rgba(255,255,255,.2)";
    ctx.beginPath(); ctx.roundRect(72, ch - 27, 80, 8, 4); ctx.fill();
    ctx.fillStyle = "#38bdf8";
    if (this.setPiece) { ctx.beginPath(); ctx.roundRect(72 + 40 + this.aim * 36 - 4, ch - 29, 8, 12, 3); ctx.fill(); }
    else { ctx.beginPath(); ctx.roundRect(72, ch - 27, 80 * this.sprint, 8, 4); ctx.fill(); }

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
