// Sonidos sintetizados con Web Audio (sin archivos: funciona offline).

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let crowd: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let muted = (() => {
  try {
    return localStorage.getItem("crack-mute") === "1";
  } catch {
    return false;
  }
})();

function ctx() {
  if (!ac) {
    ac = new AudioContext();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ac.destination);
  }
  if (ac.state === "suspended") void ac.resume();
  return ac;
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem("crack-mute", m ? "1" : "0");
  } catch {
    /* sin almacenamiento */
  }
  if (master) master.gain.value = m ? 0 : 0.6;
}

function noiseBuffer(seconds: number) {
  const a = ctx();
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq: number, dur: number, type: OscillatorType, peak = 0.3, slideTo?: number, delay = 0) {
  const a = ctx();
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  env(g, t, peak, 0.005, dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function burst(dur: number, filterFreq: number, peak: number, q = 1, type: BiquadFilterType = "bandpass", delay = 0) {
  const a = ctx();
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(dur + 0.1);
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  f.Q.value = q;
  const g = a.createGain();
  env(g, t, peak, 0.01, dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
}

// ---------- Hinchada que alienta ----------
// Cánticos lejanos: muchas voces suaves, filtradas y con eco de estadio, sobre un murmullo de tribuna.
// Melodías originales y simples, en corcheas. n = semitonos sobre la nota base, d = duración, v = vocal ("-" = silencio).
type Syl = { n: number; d: number; v: "o" | "a" | "e" | "u" | "-" };
const S = (n: number, d: number, v: Syl["v"]): Syl => ({ n, d, v });
const PHRASES: Syl[][] = [
  // "Va-mos, va-mos, que es-ta no-che..."
  [S(0, 2, "a"), S(0, 1, "o"), S(3, 1, "o"), S(5, 2, "a"), S(3, 2, "o"), S(0, 1, "e"), S(0, 1, "e"), S(-2, 2, "a"), S(0, 4, "o")],
  // "O-o-o-o, o-o-o..."
  [S(5, 2, "o"), S(7, 2, "o"), S(5, 1, "o"), S(3, 1, "o"), S(0, 2, "o"), S(0, 2, "-"), S(3, 2, "e"), S(5, 2, "o")],
  // "Da-le, da-le, da-le..."
  [S(0, 1, "a"), S(0, 1, "e"), S(0, 1, "a"), S(0, 1, "e"), S(3, 1, "a"), S(3, 1, "e"), S(5, 2, "a"), S(7, 1, "e"), S(5, 1, "o"), S(3, 2, "o"), S(0, 4, "o")],
  // "Siem-pre te va-mos a se-guir"
  [S(-2, 2, "e"), S(0, 2, "e"), S(3, 1, "a"), S(3, 1, "o"), S(5, 2, "a"), S(3, 1, "e"), S(0, 1, "e"), S(3, 2, "u"), S(0, 4, "o")],
];
const VOWELS: Record<Exclude<Syl["v"], "-">, [number, number]> = { a: [750, 1150], o: [480, 850], e: [420, 1800], u: [340, 680] };

let chant: { timer: number; bus: GainNode; level: GainNode; out: GainNode; murmur: AudioBufferSourceNode; lfo: OscillatorNode; next: number; phrase: number; left: number; reps: number; mood: number; base: number } | null = null;

/** Eco de estadio: ruido que se apaga de a poco, en estéreo. */
function stadiumReverb(a: AudioContext, seconds = 2.6) {
  const len = Math.floor(a.sampleRate * seconds);
  const buf = a.createBuffer(2, len, a.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  const conv = a.createConvolver();
  conv.buffer = buf;
  return conv;
}

/** Una sílaba cantada por la tribuna: voces desafinadas que entran a destiempo, pasando por los formantes de la vocal. */
function voces(t: number, freq: number, dur: number, v: Exclude<Syl["v"], "-">) {
  const a = ctx();
  const g = a.createGain();
  const peak = 0.03;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.1);
  g.gain.setValueAtTime(peak, t + Math.max(0.11, dur - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.18);
  const [f1, f2] = VOWELS[v];
  for (const [fq, q, k] of [[f1, 4, 1], [f2, 6, 0.45]] as const) {
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = fq;
    bp.Q.value = q;
    const kg = a.createGain();
    kg.gain.value = k;
    bp.connect(kg).connect(g);
    for (let i = 0; i < 5; i++) {
      const o = a.createOscillator();
      o.type = "sawtooth";
      const oct = i === 4 ? 2 : 1; // algunos cantan una octava arriba
      o.frequency.value = freq * oct * Math.pow(2, ((Math.random() - 0.5) * 0.5) / 12);
      const st = t + Math.random() * 0.08; // la tribuna nunca entra toda junta
      o.connect(bp);
      o.start(st);
      o.stop(t + dur + 0.25);
    }
  }
  g.connect(chant!.bus);
}

function scheduleChant() {
  if (!chant) return;
  const a = ctx();
  const eighth = 60 / 104 / 2;
  if (chant.next < a.currentTime) chant.next = a.currentTime + 0.05; // volvió de segundo plano
  while (chant.next < a.currentTime + 0.4) {
    const t = chant.next;
    if (chant.left <= 0) {
      let pos = 0;
      for (const syl of PHRASES[chant.phrase]) {
        if (syl.v !== "-") voces(t + pos * eighth, chant.base * Math.pow(2, syl.n / 12), syl.d * eighth, syl.v);
        pos += syl.d;
      }
      chant.left = Math.ceil(pos / 8) * 8;
      chant.reps--;
      if (chant.reps <= 0) {
        chant.phrase = (chant.phrase + 1 + Math.floor(Math.random() * (PHRASES.length - 1))) % PHRASES.length;
        chant.reps = 2 + Math.floor(Math.random() * 2);
        chant.left += 16 + Math.floor(Math.random() * 3) * 8; // un rato de murmullo entre canción y canción
      }
    }
    chant.left--;
    chant.next += eighth;
  }
}

export const sfx = {
  kick(power = 0.6) {
    tone(150, 0.12, "sine", 0.5 * (0.5 + power), 50);
    burst(0.05, 1800, 0.25 * power, 0.8);
  },
  pass() {
    tone(220, 0.08, "sine", 0.3, 90);
  },
  post() {
    tone(880, 0.5, "triangle", 0.25, 860);
    tone(1320, 0.35, "sine", 0.12);
  },
  save() {
    burst(0.12, 900, 0.35, 0.7);
    tone(120, 0.1, "sine", 0.3, 60);
  },
  whistle(long = false) {
    const a = ctx();
    const t = a.currentTime;
    const o = a.createOscillator();
    const lfo = a.createOscillator();
    const lg = a.createGain();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.value = 2900;
    lfo.frequency.value = 38;
    lg.gain.value = 140;
    lfo.connect(lg).connect(o.frequency);
    const d = long ? 0.9 : 0.35;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.setValueAtTime(0.18, t + d - 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(master!);
    o.start(t);
    lfo.start(t);
    o.stop(t + d + 0.05);
    lfo.stop(t + d + 0.05);
  },
  goal() {
    burst(2.2, 700, 0.5, 0.4);
    burst(1.8, 1400, 0.25, 0.6, "bandpass", 0.1);
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "square", 0.07, undefined, i * 0.09));
  },
  /** Silbidos y abucheos de la tribuna. */
  boo() {
    burst(2.6, 260, 0.35, 0.7, "lowpass");
    burst(2.2, 2600, 0.06, 6, "bandpass", 0.2);
    [2400, 2750, 2100].forEach((f, i) => tone(f, 0.5, "sine", 0.04, f * 0.92, 0.3 + i * 0.35));
  },
  ooh() {
    burst(1, 500, 0.3, 0.5);
  },
  click() {
    tone(660, 0.05, "triangle", 0.12);
  },
  levelUp() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, "triangle", 0.15, undefined, i * 0.07));
  },
  coins() {
    [988, 1318].forEach((f, i) => tone(f, 0.12, "square", 0.06, undefined, i * 0.08));
  },
  crowdStart() {
    if (crowd) return;
    const a = ctx();
    const src = a.createBufferSource();
    src.buffer = noiseBuffer(3);
    src.loop = true;
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 600;
    const gain = a.createGain();
    gain.gain.value = 0.06;
    src.connect(f).connect(gain).connect(master!);
    src.start();
    crowd = { src, gain };
  },
  crowdStop() {
    if (!crowd) return;
    crowd.src.stop();
    crowd = null;
  },
  /** Arranca la hinchada que alienta. mood: 1 normal, más alto en clásicos y finales. */
  chantStart(mood = 1) {
    const a = ctx();
    if (chant) {
      chant.mood = mood;
      chant.out.gain.setTargetAtTime(0.9 * mood, a.currentTime, 0.5);
      return;
    }
    // voces → filtro (suena lejos) → nivel → poco directo + mucho eco → salida
    const bus = a.createGain();
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1500;
    const level = a.createGain();
    level.gain.value = 1;
    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, a.currentTime);
    out.gain.linearRampToValueAtTime(0.9 * mood, a.currentTime + 2);
    const dry = a.createGain();
    dry.gain.value = 0.35;
    const wet = a.createGain();
    wet.gain.value = 0.9;
    const rev = stadiumReverb(a);
    bus.connect(lp).connect(level);
    level.connect(dry).connect(out);
    level.connect(rev).connect(wet).connect(out);
    out.connect(master!);
    // murmullo de tribuna que sube y baja solo
    const murmur = a.createBufferSource();
    murmur.buffer = noiseBuffer(4);
    murmur.loop = true;
    const mf = a.createBiquadFilter();
    mf.type = "bandpass";
    mf.frequency.value = 650;
    mf.Q.value = 0.7;
    const mg = a.createGain();
    mg.gain.value = 0.05;
    const lfo = a.createOscillator();
    lfo.frequency.value = 0.12;
    const lg = a.createGain();
    lg.gain.value = 0.025;
    lfo.connect(lg).connect(mg.gain);
    murmur.connect(mf).connect(mg).connect(level);
    murmur.start();
    lfo.start();
    chant = { timer: 0, bus, level, out, murmur, lfo, next: a.currentTime + 0.5, phrase: Math.floor(Math.random() * PHRASES.length), left: 8, reps: 2, mood, base: 185 + Math.random() * 25 };
    chant.timer = window.setInterval(scheduleChant, 100);
    scheduleChant();
  },
  /** La tribuna se viene abajo un rato (gol, jugada clave). */
  chantBoost(seconds = 6) {
    if (!chant) return;
    const t = ctx().currentTime;
    chant.level.gain.cancelScheduledValues(t);
    chant.level.gain.setTargetAtTime(2, t, 0.15);
    chant.level.gain.setTargetAtTime(1, t + seconds, 1.5);
  },
  chantStop() {
    if (!chant) return;
    const c = chant;
    chant = null;
    clearInterval(c.timer);
    const a = ctx();
    c.out.gain.cancelScheduledValues(a.currentTime);
    c.out.gain.setValueAtTime(c.out.gain.value, a.currentTime);
    c.out.gain.linearRampToValueAtTime(0, a.currentTime + 0.8);
    setTimeout(() => { c.murmur.stop(); c.lfo.stop(); c.out.disconnect(); }, 1000);
  },
};
