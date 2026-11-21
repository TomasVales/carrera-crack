// Datos del juego: todo inventado (clubes, liga, nombres). Nada real.

export type Pos = "DC" | "EXT" | "ENG";
export type Foot = "der" | "izq" | "ambi";
export type StatKey = "tiro" | "pase" | "regate" | "velocidad" | "fisico";
export type Stats = Record<StatKey, number>;

export type Look = {
  skin: number;
  hair: number; // estilo
  hairColor: number;
  beard: number;
  eyes: number;
  boots: number;
};

export type CrestPattern = "stripes" | "half" | "band" | "cross" | "plain" | "hoops";

export type Club = {
  id: string;
  name: string;
  short: string; // 3 letras
  city: string;
  c1: string; // color principal
  c2: string; // color secundario
  pattern: CrestPattern;
  strength: number; // 55–86
  star: string; // goleador del club (para la tabla de goleadores)
};

export const POS_INFO: Record<Pos, { name: string; desc: string }> = {
  DC: { name: "Delantero centro", desc: "Vive en el área. Más mano a mano y definiciones." },
  EXT: { name: "Extremo", desc: "Rápido por la banda. Más contraataques y desbordes." },
  ENG: { name: "Enganche", desc: "La pausa y el último pase. Más paredes y remates de afuera." },
};

export const STAT_INFO: Record<StatKey, { name: string; short: string; desc: string }> = {
  tiro: { name: "Tiro", short: "TIR", desc: "Potencia y precisión del remate" },
  pase: { name: "Pase", short: "PAS", desc: "Precisión de pases y centros" },
  regate: { name: "Regate", short: "REG", desc: "Pelota pegada al pie, amagues" },
  velocidad: { name: "Velocidad", short: "VEL", desc: "Velocidad máxima" },
  fisico: { name: "Físico", short: "FIS", desc: "Energía para correr y resistencia" },
};

export const STAT_KEYS: StatKey[] = ["tiro", "pase", "regate", "velocidad", "fisico"];

export const SKINS = ["#f8d5b8", "#eebc94", "#d39a6e", "#a86e45", "#7a4a2b", "#4e2f1d"];
export const HAIR_COLORS = ["#1d1410", "#4a2c17", "#8a5a2b", "#d9a441", "#c2410c", "#e5e7eb", "#2563eb"];
export const HAIR_NAMES = ["Rapado", "Corto", "Jopo", "Rulos", "Melena", "Cresta", "Rodete"];
export const BEARD_NAMES = ["Sin barba", "Bigote", "Candado", "Barba"];
export const EYES_NAMES = ["Tranquilo", "Picante", "Feliz"];
export const BOOTS = ["#111827", "#f8fafc", "#ef4444", "#22d3ee", "#facc15", "#a3e635", "#f472b6"];
export const UGLY_BOOTS = 7; // índice especial: los botines del sponsor

export const LEAGUE_NAME = "Lega Stivale";

export const CLUBS: Club[] = [
  { id: "ves", name: "Vesuvio Calcio", short: "VES", city: "Nápoles", c1: "#1e3a8a", c2: "#38bdf8", pattern: "band", strength: 84, star: "Gennaro Esposito" },
  { id: "tor", name: "Torre Pendente FC", short: "TOR", city: "Pisa", c1: "#f8fafc", c2: "#dc2626", pattern: "cross", strength: 80, star: "Matteo Pendolino" },
  { id: "gon", name: "Gondolieri Venezia", short: "GON", city: "Venecia", c1: "#065f46", c2: "#f97316", pattern: "hoops", strength: 77, star: "Luca Remaioli" },
  { id: "esp", name: "Atletico Espresso", short: "ESP", city: "Turín", c1: "#3f2a1d", c2: "#f5e6c8", pattern: "stripes", strength: 74, star: "Carlo Moka" },
  { id: "tlt", name: "Real Tortellini", short: "TLT", city: "Bolonia", c1: "#facc15", c2: "#1d4ed8", pattern: "half", strength: 70, star: "Bruno Ripieno" },
  { id: "lam", name: "Dinamo Lambretta", short: "LAM", city: "Milán", c1: "#15803d", c2: "#f8fafc", pattern: "stripes", strength: 66, star: "Enzo Vespucci" },
  { id: "moz", name: "Sporting Mozzarella", short: "MOZ", city: "Salerno", c1: "#f8fafc", c2: "#0ea5e9", pattern: "plain", strength: 61, star: "Ciro Bufala" },
  { id: "pom", name: "Unione Pomodoro", short: "POM", city: "Parma", c1: "#dc2626", c2: "#16a34a", pattern: "half", strength: 57, star: "Dino Passata" },
];

export const club = (id: string) => CLUBS.find((c) => c.id === id)!;

// ---------- Azar con semilla (para que los partidos simulados sean consistentes) ----------

export function rand() {
  return Math.random();
}
export const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Poisson simple para goles simulados. */
export function poisson(lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/** Valoración general según la posición. */
export function overall(s: Stats, pos: Pos) {
  const w: Record<Pos, Stats> = {
    DC: { tiro: 0.36, pase: 0.12, regate: 0.2, velocidad: 0.2, fisico: 0.12 },
    EXT: { tiro: 0.18, pase: 0.2, regate: 0.24, velocidad: 0.3, fisico: 0.08 },
    ENG: { tiro: 0.2, pase: 0.36, regate: 0.26, velocidad: 0.1, fisico: 0.08 },
  };
  let t = 0;
  for (const k of STAT_KEYS) t += s[k] * w[pos][k];
  return Math.round(t);
}

export function fmtMoney(k: number) {
  if (k >= 1000) return `€${(k / 1000).toFixed(k >= 10000 ? 0 : 1)}M`;
  return `€${Math.round(k)}k`;
}
