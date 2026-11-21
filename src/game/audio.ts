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
};
