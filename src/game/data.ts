// Datos del juego: clubes, ligas y marcas inventadas. Las selecciones usan nombres de países (sin escudos reales).

export type Pos = "DC" | "EXT" | "ENG";
export type Foot = "der" | "izq" | "ambi";
export type StatKey = "tiro" | "pase" | "regate" | "velocidad" | "fisico";
export type Stats = Record<StatKey, number>;

export type Look = {
  skin: number;
  hair: number;
  hairColor: number;
  beard: number;
  eyes: number;
  boots: number;
  band?: number; // vincha (índice de color) o undefined
};

export type CrestPattern = "stripes" | "half" | "band" | "cross" | "plain" | "hoops" | "flag";

/** Equipo genérico: club o selección. */
export type Team = {
  id: string;
  name: string;
  short: string;
  c1: string;
  c2: string;
  alt: [string, string]; // camiseta alternativa
  pattern: CrestPattern;
  strength: number;
  star: string;
  league: string; // id de liga, o "nac" para selecciones
  city: string;
  stadium: string;
};
export type Club = Team;

export type League = { id: string; name: string; country: string; flag: string; vibe: string };

export const POS_INFO: Record<Pos, { name: string; desc: string }> = {
  DC: { name: "Delantero centro", desc: "Vive en el área. Más mano a mano y definiciones." },
  EXT: { name: "Extremo", desc: "Rápido por la banda. Más contraataques y desbordes." },
  ENG: { name: "Enganche", desc: "La pausa y el último pase. Más paredes y remates de afuera." },
};

export const STAT_INFO: Record<StatKey, { name: string; short: string; desc: string; train: string; icon: string }> = {
  tiro: { name: "Tiro", short: "TIR", desc: "Potencia y precisión del remate", train: "Definición", icon: "🎯" },
  pase: { name: "Pase", short: "PAS", desc: "Precisión de pases y centros", train: "Rondos de pase", icon: "🎯" },
  regate: { name: "Regate", short: "REG", desc: "Pelota pegada al pie, amagues", train: "Conos y gambeta", icon: "🌀" },
  velocidad: { name: "Velocidad", short: "VEL", desc: "Velocidad máxima", train: "Pasadas de sprint", icon: "⚡" },
  fisico: { name: "Físico", short: "FIS", desc: "Energía para correr y resistencia", train: "Gimnasio", icon: "💪" },
};
STAT_INFO.pase.icon = "🦶";

export const STAT_KEYS: StatKey[] = ["tiro", "pase", "regate", "velocidad", "fisico"];

export const SKINS = ["#f8d5b8", "#eebc94", "#d39a6e", "#a86e45", "#7a4a2b", "#4e2f1d"];
export const HAIR_COLORS = ["#1d1410", "#4a2c17", "#8a5a2b", "#d9a441", "#c2410c", "#e5e7eb", "#2563eb"];
export const HAIR_NAMES = ["Rapado", "Corto", "Jopo", "Rulos", "Melena", "Cresta", "Rodete"];
export const BEARD_NAMES = ["Sin barba", "Bigote", "Candado", "Barba"];
export const EYES_NAMES = ["Tranquilo", "Picante", "Feliz"];
// 0–6 normales, 7 = sponsor horrible, 8 = dorados, 9 = arcoíris
export const BOOTS = ["#111827", "#f8fafc", "#ef4444", "#22d3ee", "#facc15", "#a3e635", "#f472b6"];
export const UGLY_BOOTS = 7;
export const GOLD_BOOTS = 8;
export const RAINBOW_BOOTS = 9;
export const BAND_COLORS = ["#ef4444", "#f8fafc", "#111827", "#22d3ee", "#facc15"];

export const CELEBRATIONS: Record<string, string> = {
  salto: "Salto con puño",
  avion: "Avioncito",
  rodilla: "Rodilla al piso",
  oido: "Mano al oído",
  baile: "Bailecito",
  corazon: "Corazón con las manos",
};

// ---------- Ligas y clubes (todo inventado) ----------

export const LEAGUES: League[] = [
  { id: "ita", name: "Lega Stivale", country: "Italia", flag: "🇮🇹", vibe: "Táctica, pasta y catenaccio" },
  { id: "esp", name: "Liga Siesta", country: "España", flag: "🇪🇸", vibe: "Toque, toque y siesta" },
  { id: "eng", name: "Premier Pudding", country: "Inglaterra", flag: "🇬🇧", vibe: "Lluvia, barro y pelotazos" },
];

const T = (league: string, id: string, name: string, short: string, city: string, stadium: string, c1: string, c2: string, pattern: CrestPattern, strength: number, star: string, alt?: [string, string]): Team => ({
  id, name, short, city, stadium, c1, c2, pattern, strength, star, league, alt: alt ?? [c2, c1],
});

export const CLUBS: Team[] = [
  // Lega Stivale
  T("ita", "ves", "Vesuvio Calcio", "VES", "Nápoles", "Stadio del Vulcano", "#1e3a8a", "#38bdf8", "band", 84, "Gennaro Esposito", ["#f8fafc", "#1e3a8a"]),
  T("ita", "tor", "Torre Pendente FC", "TOR", "Pisa", "Arena Inclinata", "#f8fafc", "#dc2626", "cross", 80, "Matteo Pendolino", ["#111827", "#dc2626"]),
  T("ita", "gon", "Gondolieri Venezia", "GON", "Venecia", "Stadio sull'Acqua", "#065f46", "#f97316", "hoops", 77, "Luca Remaioli", ["#f8fafc", "#065f46"]),
  T("ita", "esp", "Atletico Espresso", "ESP", "Turín", "Caffè Arena", "#3f2a1d", "#f5e6c8", "stripes", 74, "Carlo Moka", ["#f5e6c8", "#3f2a1d"]),
  T("ita", "tlt", "Real Tortellini", "TLT", "Bolonia", "Stadio Ripieno", "#facc15", "#1d4ed8", "half", 70, "Bruno Ripieno", ["#1d4ed8", "#facc15"]),
  T("ita", "lam", "Dinamo Lambretta", "LAM", "Milán", "Motodromo", "#15803d", "#f8fafc", "stripes", 66, "Enzo Vespucci", ["#f8fafc", "#15803d"]),
  T("ita", "moz", "Sporting Mozzarella", "MOZ", "Salerno", "Campo Bufala", "#f8fafc", "#0ea5e9", "plain", 61, "Ciro Bufala", ["#0ea5e9", "#f8fafc"]),
  T("ita", "pom", "Unione Pomodoro", "POM", "Parma", "Orto Stadium", "#dc2626", "#16a34a", "half", 57, "Dino Passata", ["#f8fafc", "#dc2626"]),
  // Liga Siesta
  T("esp", "pae", "Real Paella CF", "PAE", "Valencia", "La Paellera", "#f97316", "#facc15", "band", 85, "Paco Arroz", ["#111827", "#f97316"]),
  T("esp", "chu", "Atlético Churros", "CHU", "Madrid", "Estadio Chocolate", "#b45309", "#fef3c7", "stripes", 81, "Manolo Azúcar", ["#fef3c7", "#b45309"]),
  T("esp", "sev", "Sevillanas FC", "SEV", "Sevilla", "Coliseo del Olé", "#f8fafc", "#dc2626", "plain", 76, "Curro Palmas", ["#dc2626", "#f8fafc"]),
  T("esp", "sie", "Deportivo Siesta", "SIE", "Galicia", "Estadio Hamaca", "#1d4ed8", "#f8fafc", "half", 72, "Iker Bostezo", ["#f8fafc", "#1d4ed8"]),
  T("esp", "gaz", "Racing Gazpacho", "GAZ", "Cádiz", "El Frigorífico", "#dc2626", "#16a34a", "hoops", 68, "Juanjo Pepino", ["#16a34a", "#f8fafc"]),
  T("esp", "fla", "Unión Flamenco", "FLA", "Granada", "Tablao Arena", "#7c3aed", "#facc15", "cross", 64, "Lolo Taconeo", ["#facc15", "#7c3aed"]),
  T("esp", "tor2", "CD Tortilla", "TOT", "Bilbao", "La Sartén", "#fde68a", "#92400e", "plain", 60, "Aitor Patata", ["#92400e", "#fde68a"]),
  T("esp", "san", "Sporting Sangría", "SAN", "Málaga", "Estadio Jarra", "#9f1239", "#f8fafc", "stripes", 56, "Toni Hielo", ["#f8fafc", "#9f1239"]),
  // Premier Pudding
  T("eng", "tea", "Teacup United", "TEA", "Teaford", "The Kettle", "#1e3a8a", "#f8fafc", "plain", 86, "Harry Biscuit", ["#f8fafc", "#1e3a8a"]),
  T("eng", "cru", "Royal Crumpets", "CRU", "Butterham", "Crumpet Park", "#dc2626", "#facc15", "cross", 82, "Ollie Butter", ["#facc15", "#dc2626"]),
  T("eng", "fch", "Fish & Chips Rovers", "FCR", "Portsalt", "The Chippy", "#0ea5e9", "#fde047", "hoops", 77, "Jack Vinegar", ["#fde047", "#0ea5e9"]),
  T("eng", "dd", "Double Decker FC", "DDK", "Londinium", "Bus Station Ground", "#b91c1c", "#111827", "half", 73, "Tommy Ticket", ["#111827", "#b91c1c"]),
  T("eng", "cor", "Queen's Corgis", "COR", "Waggington", "Kennel Road", "#7c3aed", "#f8fafc", "band", 69, "Rex Woofington", ["#f8fafc", "#7c3aed"]),
  T("eng", "fog", "Foggy Town", "FOG", "Mistbury", "Cloud Lane", "#64748b", "#f8fafc", "stripes", 65, "Neil Drizzle", ["#f8fafc", "#64748b"]),
  T("eng", "bis", "Biscuit Albion", "BIS", "Crumbleton", "The Tin", "#a16207", "#f8fafc", "stripes", 60, "Gary Dunk", ["#f8fafc", "#a16207"]),
  T("eng", "rai", "Rainy City", "RAI", "Puddleford", "Umbrella Arena", "#0f766e", "#f8fafc", "plain", 56, "Danny Puddle", ["#f8fafc", "#0f766e"]),
];

export const NATIONS: Team[] = [
  ["arg", "Argentina", "ARG", "#75aadb", "#f8fafc", 84, "Lucho Gambeta"],
  ["ita", "Italia", "ITA", "#1d4ed8", "#f8fafc", 82, "Marco Muraglia"],
  ["bra", "Brasil", "BRA", "#facc15", "#16a34a", 85, "Joãozinho Samba"],
  ["esp", "España", "ESP", "#dc2626", "#facc15", 83, "Pedro Rondo"],
  ["fra", "Francia", "FRA", "#1e3a8a", "#f8fafc", 84, "Hugo Baguette"],
  ["uru", "Uruguay", "URU", "#38bdf8", "#111827", 78, "Nacho Garra"],
  ["ger", "Alemania", "GER", "#f8fafc", "#111827", 82, "Klaus Präzision"],
  ["eng", "Inglaterra", "ENG", "#f8fafc", "#dc2626", 81, "Wes Header"],
  ["por", "Portugal", "POR", "#991b1b", "#16a34a", 80, "Rui Bacalhau"],
  ["ned", "Países Bajos", "NED", "#f97316", "#f8fafc", 79, "Daan Molino"],
  ["col", "Colombia", "COL", "#facc15", "#1d4ed8", 77, "Juancho Cumbia"],
  ["mex", "México", "MEX", "#166534", "#f8fafc", 76, "Chuy Picante"],
].map(([id, name, short, c1, c2, strength, star]) => ({
  id: `n-${id}`, name: name as string, short: short as string, c1: c1 as string, c2: c2 as string, alt: [c2 as string, c1 as string] as [string, string],
  pattern: "flag" as const, strength: strength as number, star: star as string, league: "nac", city: name as string, stadium: "Estadio Nacional",
}));

const ALL = [...CLUBS, ...NATIONS];
export const club = (id: string): Team => ALL.find((c) => c.id === id)!;
export const league = (id: string) => LEAGUES.find((l) => l.id === id)!;
export const clubsOf = (leagueId: string) => CLUBS.filter((c) => c.league === leagueId);
export const nation = (id: string) => NATIONS.find((n) => n.id === id)!;

// ---------- Tienda ----------

export type ShopItem = {
  id: string;
  name: string;
  emoji: string;
  price: number; // miles de €
  kind: "botines" | "festejo" | "vincha" | "vida";
  desc: string;
  value?: string | number; // botín/festejo/vincha que aplica
};

export const SHOP: ShopItem[] = [
  { id: "b-dorados", name: "Botines dorados", emoji: "👟", price: 400, kind: "botines", value: GOLD_BOOTS, desc: "Brillan con el sol. Pura facha." },
  { id: "b-arcoiris", name: "Botines arcoíris", emoji: "🌈", price: 250, kind: "botines", value: RAINBOW_BOOTS, desc: "Para que te vean desde la tribuna." },
  { id: "v-roja", name: "Vincha roja", emoji: "🎽", price: 15, kind: "vincha", value: 0, desc: "Estilo guerrero." },
  { id: "v-blanca", name: "Vincha blanca", emoji: "🎽", price: 15, kind: "vincha", value: 1, desc: "Clásica de los 90." },
  { id: "v-negra", name: "Vincha negra", emoji: "🎽", price: 15, kind: "vincha", value: 2, desc: "Seria y elegante." },
  { id: "v-celeste", name: "Vincha celeste", emoji: "🎽", price: 15, kind: "vincha", value: 3, desc: "Fresca." },
  { id: "f-avion", name: "Festejo: Avioncito", emoji: "✈️", price: 30, kind: "festejo", value: "avion", desc: "Brazos abiertos y a volar." },
  { id: "f-rodilla", name: "Festejo: Rodilla al piso", emoji: "🧎", price: 60, kind: "festejo", value: "rodilla", desc: "Deslizarse de rodillas al córner." },
  { id: "f-oido", name: "Festejo: Mano al oído", emoji: "👂", price: 45, kind: "festejo", value: "oido", desc: "\"No los escucho...\"" },
  { id: "f-baile", name: "Festejo: Bailecito", emoji: "🕺", price: 80, kind: "festejo", value: "baile", desc: "Coreografía ensayada en el vestuario." },
  { id: "f-corazon", name: "Festejo: Corazón", emoji: "🫶", price: 40, kind: "festejo", value: "corazon", desc: "Para tu gente." },
  { id: "chef", name: "Chef personal", emoji: "👨‍🍳", price: 60, kind: "vida", desc: "Recuperás más energía entre partidos." },
  { id: "pf", name: "Preparador físico privado", emoji: "🏋️", price: 150, kind: "vida", desc: "Tus entrenamientos rinden 50% más." },
  { id: "depto", name: "Departamento con vista", emoji: "🏙️", price: 350, kind: "vida", desc: "La moral nunca baja de 40." },
  { id: "psico", name: "Psicólogo deportivo", emoji: "🧠", price: 200, kind: "vida", desc: "Rendís mejor en los partidos importantes." },
  { id: "auto", name: "Auto deportivo", emoji: "🏎️", price: 900, kind: "vida", desc: "+10 de fama al instante. Ojo con las multas." },
  { id: "mansion", name: "Mansión con pileta", emoji: "🏰", price: 4000, kind: "vida", desc: "+15 de fama y +10 de moral. Leyenda." },
  { id: "barrio", name: "Comprar el club de tu barrio", emoji: "🏟️", price: 20000, kind: "vida", desc: "Le devolvés al potrero lo que te dio. +20 de fama." },
  { id: "isla", name: "Isla privada", emoji: "🏝️", price: 60000, kind: "vida", desc: "Vacaciones eternas: tu moral nunca baja de 60." },
];

// ---------- Azar y utilidades ----------

export function rand() {
  return Math.random();
}
export const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const shuffle = <T,>(xs: T[]): T[] => [...xs].sort(() => Math.random() - 0.5);

/** RNG con semilla (caras estables de los rivales). */
export function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
