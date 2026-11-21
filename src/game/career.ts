// Motor del modo carrera: temporada, tabla, simulación, progresión, eventos y mercado.
import {
  CLUBS, STAT_INFO, STAT_KEYS, UGLY_BOOTS, clamp, club, overall, pick, poisson, rand, randInt,
  type Foot, type Look, type Pos, type StatKey, type Stats,
} from "./data";

export type Player = {
  name: string;
  nick: string;
  number: number;
  pos: Pos;
  foot: Foot;
  look: Look;
  stats: Stats;
  age: number;
  xp: number;
  level: number;
  points: number;
  money: number; // en miles de €
  energy: number; // 0–100
  morale: number; // 0–100
  fame: number; // 0–100
  coach: number; // relación con el DT 0–100
  injured: number; // partidos afuera
  relapse: boolean;
  fire: number; // partidos con racha de fuego
};

export type Role = "titular" | "suplente";
export type Contract = { salary: number; years: number; role: Role };
export type Row = { pj: number; g: number; e: number; p: number; gf: number; gc: number };
export type Fixture = { home: string; away: string; hg?: number; ag?: number };
export type Offer = {
  clubId: string;
  salary: number;
  years: number;
  role: Role;
  max: number; // sueldo máximo oculto
  patience: number; // rondas de negociación ocultas
  status: "abierta" | "acuerdo" | "rota";
};
export type News = { season: number; round: number; text: string };
export type SeasonLog = { season: number; age: number; clubId: string; pj: number; goals: number; assists: number; avg: number; place: number; awards: string[] };

export type Career = {
  v: 1;
  player: Player;
  clubId: string;
  contract: Contract;
  season: number;
  round: number;
  fixtures: Fixture[][];
  table: Record<string, Row>;
  scorers: Record<string, number>;
  seasonStats: { pj: number; goals: number; assists: number; ratings: number[] };
  totals: { pj: number; goals: number; assists: number };
  trophies: string[];
  news: News[];
  history: SeasonLog[];
  offers: Offer[] | null;
  windowKind: "invierno" | "verano" | null;
  pendingEvent: string | null;
  seasonOver: boolean;
  retired: boolean;
};

export type MatchOutcome = {
  played: boolean; // jugado (true) o simulado (false)
  hg: number;
  ag: number;
  goals: number;
  assists: number;
  rating: number | null; // null si no jugaste (lesionado)
};

export type Report = MatchOutcome & {
  home: string;
  away: string;
  xp: number;
  money: number;
  levelUps: number;
  headline: string;
  outlet: string;
  mvp: string;
};

// ---------- Guardado ----------

const KEY = "crack-career";
const HOF = "crack-hof";

export function save(c: Career) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* sin almacenamiento: se juega igual */
  }
}
export function load(): Career | null {
  try {
    const s = localStorage.getItem(KEY);
    const c = s ? (JSON.parse(s) as Career) : null;
    return c && c.v === 1 ? c : null;
  } catch {
    return null;
  }
}
export function wipe() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}

export type HallEntry = { name: string; nick: string; pos: Pos; seasons: number; goals: number; assists: number; trophies: number; best: string; look: Look; c1: string; c2: string };
export function hallOfFame(): HallEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HOF) ?? "[]");
  } catch {
    return [];
  }
}
function addToHall(e: HallEntry) {
  try {
    localStorage.setItem(HOF, JSON.stringify([e, ...hallOfFame()].slice(0, 20)));
  } catch {
    /* nada */
  }
}

// ---------- Fixture ----------

function roundRobin(ids: string[]): Fixture[][] {
  const t = [...ids].sort(() => rand() - 0.5);
  const n = t.length;
  const rounds: Fixture[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i];
      const b = t[n - 1 - i];
      round.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    rounds.push(round);
    t.splice(1, 0, t.pop()!); // rotación del método del círculo
  }
  return rounds;
}

const emptyTable = () => Object.fromEntries(CLUBS.map((c) => [c.id, { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 }]));

export function newCareer(p: Omit<Player, "age" | "xp" | "level" | "points" | "money" | "energy" | "morale" | "fame" | "coach" | "injured" | "relapse" | "fire">, clubId: string): Career {
  return {
    v: 1,
    player: { ...p, age: 17, xp: 0, level: 1, points: 0, money: 5, energy: 100, morale: 70, fame: 5, coach: 55, injured: 0, relapse: false, fire: 0 },
    clubId,
    contract: { salary: 2, years: 2, role: "titular" },
    season: 1,
    round: 0,
    fixtures: roundRobin(CLUBS.map((c) => c.id)),
    table: emptyTable(),
    scorers: {},
    seasonStats: { pj: 0, goals: 0, assists: 0, ratings: [] },
    totals: { pj: 0, goals: 0, assists: 0 },
    trophies: [],
    news: [{ season: 1, round: 0, text: `${p.nick || p.name} firma su primer contrato con ${club(clubId).name}. "Vengo a hacer historia".` }],
    history: [],
    offers: null,
    windowKind: null,
    pendingEvent: null,
    seasonOver: false,
    retired: false,
  };
}

// ---------- Números del jugador ----------

export const ovr = (c: Career) => overall(c.player.stats, c.player.pos);
export const rounds = (c: Career) => c.fixtures.length;

/** Stats efectivas (con racha, moral y cansancio). */
export function effStats(c: Career): Stats {
  const p = c.player;
  const bonus = (p.fire > 0 ? 5 : 0) + (p.morale - 50) / 12 - (p.energy < 35 ? 6 : 0);
  return Object.fromEntries(STAT_KEYS.map((k) => [k, clamp(p.stats[k] + bonus, 20, 99)])) as Stats;
}

export function marketValue(c: Career) {
  const o = ovr(c);
  const age = c.player.age;
  const ageF = age <= 21 ? 1.25 : age <= 26 ? 1.1 : age <= 30 ? 0.85 : 0.5;
  return Math.round(250 * Math.pow(1.17, o - 50) * ageF * (1 + c.player.fame / 120));
}

export const xpNeeded = (level: number) => 80 + level * 20;

export function myFixture(c: Career): Fixture | null {
  if (c.round >= c.fixtures.length) return null;
  return c.fixtures[c.round].find((f) => f.home === c.clubId || f.away === c.clubId) ?? null;
}

export function standings(c: Career) {
  return CLUBS.map((cl) => {
    const r = c.table[cl.id];
    return { id: cl.id, ...r, dg: r.gf - r.gc, pts: r.g * 3 + r.e };
  }).sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
}

export function topScorers(c: Career) {
  const list = Object.entries(c.scorers).map(([name, goals]) => ({ name, goals }));
  const me = c.player.nick || c.player.name;
  list.push({ name: me, goals: c.seasonStats.goals });
  return list.sort((a, b) => b.goals - a.goals).slice(0, 6);
}

// ---------- Simulación ----------

function teamPower(c: Career, id: string, withMe: boolean) {
  const base = club(id).strength;
  if (!withMe) return base;
  const o = overall(effStats(c), c.player.pos);
  const share = c.contract.role === "titular" ? 0.16 : 0.07;
  return base * (1 - share) + o * share;
}

function simScore(hp: number, ap: number) {
  const d = (hp - ap) / 22;
  return [poisson(clamp(1.35 + d + 0.15, 0.25, 3.6)), poisson(clamp(1.2 - d, 0.2, 3.4))];
}

/** Intensidad del rival 0..1 (para el arcade). */
export function rivalLevel(c: Career) {
  const f = myFixture(c);
  if (!f) return 0.5;
  const rid = f.home === c.clubId ? f.away : f.home;
  return clamp((club(rid).strength - 50) / 40, 0, 1);
}

/** Resultado del resto del partido cuando jugás tus jugadas (lo que no depende de vos). */
export function backgroundScore(c: Career) {
  const f = myFixture(c)!;
  const home = f.home === c.clubId;
  const me = teamPower(c, c.clubId, false);
  const rv = club(home ? f.away : f.home).strength;
  // menos goles "de fondo": los goles importantes los hacés vos en las jugadas
  const d = (me - rv) / 25;
  const mine = poisson(clamp(0.55 + d + (home ? 0.12 : 0), 0.1, 2));
  const theirs = poisson(clamp(1.05 - d - (home ? 0.1 : 0), 0.2, 2.6));
  return { mine, theirs };
}

export function simulateMine(c: Career, injured: boolean): MatchOutcome {
  const f = myFixture(c)!;
  const home = f.home === c.clubId;
  const me = teamPower(c, c.clubId, !injured);
  const rv = teamPower(c, home ? f.away : f.home, false);
  // goles reales del local y del visitante
  const [hg, ag] = home ? simScore(me, rv) : simScore(rv, me);
  const mine = home ? hg : ag;
  if (injured) return { played: false, hg, ag, goals: 0, assists: 0, rating: null };
  const e = effStats(c);
  const share = { DC: 0.34, EXT: 0.22, ENG: 0.17 }[c.player.pos] * (e.tiro / 70) * (c.contract.role === "titular" ? 1 : 0.5);
  const ashare = { DC: 0.12, EXT: 0.22, ENG: 0.3 }[c.player.pos] * (e.pase / 70) * (c.contract.role === "titular" ? 1 : 0.5);
  let goals = 0;
  let assists = 0;
  for (let i = 0; i < mine; i++) {
    const r = rand();
    if (r < share) goals++;
    else if (r < share + ashare) assists++;
  }
  const res = Math.sign(mine - (home ? ag : hg));
  const noise = (rand() + rand() + rand() - 1.5) * 0.9;
  const rating = clamp(5.5 + goals * 1.1 + assists * 0.7 + (overall(e, c.player.pos) - 60) / 25 + res * 0.3 + noise, 3, 9.6);
  return { played: false, hg, ag, goals, assists, rating: Math.round(rating * 10) / 10 };
}

/** Nota cuando jugaste las jugadas clave. */
export function playedRating(goals: number, assists: number, good: number, bad: number, diff: number) {
  const r = 6 + goals * 1.3 + assists * 0.9 + good * 0.25 - bad * 0.35 + Math.sign(diff) * 0.35;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

// ---------- Cerrar la fecha ----------

const OUTLETS = ["La Gazzetta dello Stivale", "Corriere del Pallone", "Tuttocalcio Inventato", "Radio Fernet FM"];

function headline(c: Career, o: MatchOutcome, rival: string): string {
  const me = c.player.nick || c.player.name;
  const cl = club(c.clubId);
  const home = myFixture(c)!.home === c.clubId;
  const mine = home ? o.hg : o.ag;
  const theirs = home ? o.ag : o.hg;
  const rv = club(rival).name;
  if (o.rating === null) return pick([`${cl.name} juega sin su ${c.player.number}: ${mine}-${theirs} ante ${rv}`, `Sin ${me}, ${cl.name} sale del paso como puede`]);
  if (o.goals >= 3) return pick([`¡${me} imparable! Triplete ante ${rv}`, `Hat-trick de ${me}: ${rv} todavía lo busca`]);
  if (o.goals === 2) return pick([`Doblete de ${me} y la tribuna canta su nombre`, `${me} se viste de héroe con dos goles`]);
  if (o.goals === 1 && mine > theirs) return pick([`Gol de ${me} y triunfo de ${cl.name}`, `${me} la mandó a guardar: ${cl.short} gana ${mine}-${theirs}`]);
  if (o.assists >= 2) return `${me}, el socio ideal: dos asistencias ante ${rv}`;
  if ((o.rating ?? 0) < 5) return pick([`Noche para el olvido de ${me}`, `${me} desconocido: "Mañana es otro día"`, `¿Dónde estaba ${me}? La hinchada pide explicaciones`]);
  if (mine === theirs) return pick([`Empate con sabor a poco en ${cl.city}`, `${cl.short} y ${club(rival).short} se reparten los puntos`]);
  if (mine < theirs) return pick([`Golpe duro para ${cl.name} ante ${rv}`, `${rv} le aguó la fiesta a ${cl.short}`]);
  return pick([`${cl.name} gana y sueña en grande`, `Tres puntos de oro para ${cl.short}`]);
}

/** Aplica el partido: tabla, stats, xp, plata, energía. Devuelve el informe. */
export function finishMatch(c: Career, o: MatchOutcome): Report {
  const f = myFixture(c)!;
  const home = f.home === c.clubId;
  const rival = home ? f.away : f.home;
  const p = c.player;
  const hl = headline(c, o, rival);

  // resto de la fecha
  for (const fx of c.fixtures[c.round]) {
    if (fx === f) {
      fx.hg = o.hg;
      fx.ag = o.ag;
    } else {
      [fx.hg, fx.ag] = simScore(club(fx.home).strength, club(fx.away).strength);
    }
    const h = c.table[fx.home];
    const a = c.table[fx.away];
    h.pj++; a.pj++;
    h.gf += fx.hg!; h.gc += fx.ag!; a.gf += fx.ag!; a.gc += fx.hg!;
    if (fx.hg! > fx.ag!) { h.g++; a.p++; } else if (fx.hg! < fx.ag!) { a.g++; h.p++; } else { h.e++; a.e++; }
    // goleadores de los otros
    for (const [id, gl] of [[fx.home, fx.hg!], [fx.away, fx.ag!]] as const) {
      let n = gl;
      if (id === c.clubId) n -= o.goals;
      for (let i = 0; i < n; i++) if (rand() < 0.38) c.scorers[club(id).star] = (c.scorers[club(id).star] ?? 0) + 1;
    }
  }

  let xp = 0;
  let money = c.contract.salary;
  let levelUps = 0;
  if (o.rating !== null) {
    xp = Math.round((30 + o.rating * 10 + o.goals * 22 + o.assists * 14) * (o.played ? 1 : 0.6));
    c.seasonStats.pj++;
    c.seasonStats.goals += o.goals;
    c.seasonStats.assists += o.assists;
    c.seasonStats.ratings.push(o.rating);
    c.totals.pj++;
    c.totals.goals += o.goals;
    c.totals.assists += o.assists;
    p.energy = clamp(p.energy - (o.played ? 16 : 12) * (1.3 - p.stats.fisico / 150) + 9, 5, 100);
    p.morale = clamp(p.morale + (o.rating - 6.2) * 4, 5, 100);
    p.fame = clamp(p.fame + o.goals * 1.5 + o.assists * 0.8 + (o.rating >= 8 ? 1.5 : 0), 0, 100);
    p.coach = clamp(p.coach + (o.rating - 6) * 2, 0, 100);
    if (p.fire > 0) p.fire--;
    if (o.goals) money += o.goals * 1; // premio por gol
  } else {
    p.injured = Math.max(0, p.injured - 1);
    p.energy = clamp(p.energy + 20, 0, 100);
    if (p.injured === 0 && p.relapse) {
      p.relapse = false;
      if (rand() < 0.35) {
        p.injured = 2;
        c.news.unshift({ season: c.season, round: c.round + 1, text: `Recaída: ${p.nick || p.name} vuelve a sentir la molestia. Dos partidos más afuera.` });
      }
    }
  }
  p.money += money;
  p.xp += xp;
  while (p.xp >= xpNeeded(p.level)) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    p.points += 4;
    levelUps++;
  }

  const mine = home ? o.hg : o.ag;
  const theirs = home ? o.ag : o.hg;
  const mvp = o.rating !== null && o.rating >= 7.5 ? p.nick || p.name : rand() < 0.5 ? club(c.clubId).star : club(rival).star;
  const outlet = pick(OUTLETS);
  c.news.unshift({ season: c.season, round: c.round + 1, text: `${outlet}: ${hl} (${club(c.clubId).short} ${mine}-${theirs} ${club(rival).short})` });
  c.news = c.news.slice(0, 30);

  c.round++;
  // ¿qué viene después?
  if (c.round >= c.fixtures.length) c.seasonOver = true;
  else if (c.round === Math.floor(c.fixtures.length / 2)) openWindow(c, "invierno");
  if (o.rating !== null && !c.seasonOver) {
    const injuryChance = 0.035 + (p.energy < 35 ? 0.08 : 0) - p.stats.fisico / 2500;
    if (rand() < injuryChance) c.pendingEvent = "lesion";
    else if (rand() < 0.4) c.pendingEvent = rollEvent(c);
  }
  return { ...o, home: f.home, away: f.away, xp, money, levelUps, headline: hl, outlet, mvp };
}

// ---------- Eventos ----------

export type EventOption = { label: string; hint: string; apply: (c: Career) => string };
export type GameEvent = { id: string; emoji: string; title: string; text: (c: Career) => string; options: EventOption[] };

const RIVALS = ["Federico Bellissimo", "Nico Rapidino", "Tiziano Golazzo", "Sandro Tacco"];

export const EVENTS: Record<string, GameEvent> = {
  lesion: {
    id: "lesion",
    emoji: "🩼",
    title: "¡Pinchazo en el isquio!",
    text: () => "Terminaste el partido rengueando. El médico dice que es una lesión muscular. ¿Cómo la encarás?",
    options: [
      { label: "Vuelta rápida", hint: "1 partido afuera · 35% de recaída", apply: (c) => { c.player.injured = 1; c.player.relapse = true; return "Te infiltrás y apurás los tiempos. Ojalá aguante..."; } },
      { label: "Tratamiento completo", hint: "3 partidos afuera · sin riesgo", apply: (c) => { c.player.injured = 3; c.player.morale = clamp(c.player.morale - 5, 0, 100); return "Paciencia: volvés al 100%."; } },
    ],
  },
  prensa: {
    id: "prensa",
    emoji: "🎤",
    title: "Micrófono abierto",
    text: () => "Un periodista te frena en la zona mixta: \"¿Por qué el míster te cambió en el segundo tiempo?\"",
    options: [
      { label: "\"El míster sabe lo que hace\"", hint: "+ relación con el DT", apply: (c) => { c.player.coach = clamp(c.player.coach + 10, 0, 100); return "El DT te guiñó el ojo en el entrenamiento."; } },
      { label: "\"Pregúntenle a él\"", hint: "+ fama · − relación con el DT", apply: (c) => { c.player.fame = clamp(c.player.fame + 8, 0, 100); c.player.coach = clamp(c.player.coach - 15, 0, 100); return "Tu frase es tendencia. El DT no la vio con buenos ojos."; } },
    ],
  },
  fiesta: {
    id: "fiesta",
    emoji: "🎉",
    title: "Cumpleaños del capitán",
    text: () => "El capitán festeja su cumple con pizza y karaoke... la noche antes del próximo partido.",
    options: [
      { label: "Ir un ratito", hint: "+ moral · − energía", apply: (c) => { c.player.morale = clamp(c.player.morale + 15, 0, 100); c.player.energy = clamp(c.player.energy - 25, 0, 100); return "Cantaste \"Volare\" tres veces. El vestuario te ama."; } },
      { label: "Quedarme descansando", hint: "+ relación con el DT · − moral", apply: (c) => { c.player.coach = clamp(c.player.coach + 5, 0, 100); c.player.morale = clamp(c.player.morale - 5, 0, 100); return "Dormiste 9 horas. El cuerpo técnico lo anotó."; } },
    ],
  },
  sponsor: {
    id: "sponsor",
    emoji: "👟",
    title: "Propuesta de sponsor",
    text: (c) => `La marca "Zapattino" te ofrece ${Math.max(10, Math.round(c.contract.salary * 6))}k por usar sus botines nuevos... verde limón con rosa chicle.`,
    options: [
      { label: "Aceptar la plata", hint: "+ plata · + fama · botines horribles", apply: (c) => { const m = Math.max(10, Math.round(c.contract.salary * 6)); c.player.money += m; c.player.fame = clamp(c.player.fame + 3, 0, 100); c.player.look.boots = UGLY_BOOTS; return `+€${m}k. Tus botines se ven desde la luna.`; } },
      { label: "Rechazar", hint: "No pasa nada", apply: () => "Mantenés tu estilo. La marca busca otro jugador." },
    ],
  },
  fuego: {
    id: "fuego",
    emoji: "🔥",
    title: "¡Estás en racha!",
    text: () => "Te sale todo. En el entrenamiento la clavaste en el ángulo cinco veces seguidas.",
    options: [{ label: "¡A romperla!", hint: "+5 a todo por 3 partidos", apply: (c) => { c.player.fire = 3; return "Racha de fuego activada 🔥"; } }],
  },
  rival: {
    id: "rival",
    emoji: "⚔️",
    title: "Competencia por el puesto",
    text: () => `El club fichó a ${pick(RIVALS)}, que juega en tu misma posición. El míster dice que "juega el que está mejor".`,
    options: [
      { label: "Entrenar doble turno", hint: "+1 a una stat · − energía · + DT", apply: (c) => { const k = pick(STAT_KEYS); c.player.stats[k] = clamp(c.player.stats[k] + 1, 0, 99); c.player.energy = clamp(c.player.energy - 20, 0, 100); c.player.coach = clamp(c.player.coach + 5, 0, 100); return `Te rompiste el lomo: +1 en ${STAT_INFO[k].name}.`; } },
      { label: "Hablar con el DT", hint: "+ moral · − relación con el DT", apply: (c) => { c.player.morale = clamp(c.player.morale + 6, 0, 100); c.player.coach = clamp(c.player.coach - 5, 0, 100); return "Le dejaste en claro lo que querés. No le encantó el tono."; } },
    ],
  },
  hincha: {
    id: "hincha",
    emoji: "📸",
    title: "Un pequeño hincha",
    text: (c) => `A la salida del estadio te espera un nene con la camiseta ${c.player.number} y tu nombre escrito con fibrón.`,
    options: [
      { label: "Foto y autógrafo", hint: "+ moral · + fama", apply: (c) => { c.player.morale = clamp(c.player.morale + 10, 0, 100); c.player.fame = clamp(c.player.fame + 3, 0, 100); return "El video del nene llorando de emoción da la vuelta al mundo."; } },
      { label: "\"Tengo apuro\"", hint: "− fama", apply: (c) => { c.player.fame = clamp(c.player.fame - 4, 0, 100); return "Alguien lo filmó. Mala prensa..."; } },
    ],
  },
};

function rollEvent(c: Career): string {
  const pool = ["prensa", "fiesta", "fuego", "rival", "hincha"];
  if (c.player.look.boots !== UGLY_BOOTS) pool.push("sponsor");
  if (c.player.fire > 0) pool.splice(pool.indexOf("fuego"), 1);
  return pick(pool);
}

export function resolveEvent(c: Career, optIndex: number) {
  const ev = EVENTS[c.pendingEvent ?? ""];
  c.pendingEvent = null;
  if (!ev) return "";
  return ev.options[optIndex].apply(c);
}

// ---------- Mercado ----------

function openWindow(c: Career, kind: "invierno" | "verano") {
  const val = marketValue(c);
  const avg = avgRating(c);
  const o = ovr(c);
  let n = avg >= 7.2 ? 3 : avg >= 6.4 ? 2 : 1;
  if (kind === "invierno" && rand() < 0.3) n--;
  const candidates = CLUBS.filter((cl) => cl.id !== c.clubId)
    .map((cl) => ({ cl, score: -Math.abs(cl.strength - (o + 8 + avg * 2 - 12)) + rand() * 14 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
  c.offers = candidates.map(({ cl }) => {
    const role: Role = cl.strength > o + 14 ? "suplente" : "titular";
    const salary = Math.max(c.contract.salary + 1, Math.round((val / 110) * (cl.strength / 70)));
    return { clubId: cl.id, salary, years: randInt(2, 4), role, max: Math.round(salary * (1.15 + rand() * 0.5)), patience: randInt(1, 3), status: "abierta" as const };
  });
  c.windowKind = kind;
  if (!c.offers.length) {
    c.offers = null;
    c.windowKind = null;
  }
}

export type Ask = { salary: number; years: number; role: Role };
export type NegResult = { kind: "acuerdo" | "contra" | "rota"; msg: string };

export function negotiate(c: Career, offer: Offer, ask: Ask): NegResult {
  const cl = club(offer.clubId);
  const titularOk = offer.role === "titular" || cl.strength <= ovr(c) + 14;
  const roleOk = ask.role === "suplente" || titularOk;
  if (ask.salary <= offer.max && roleOk) {
    offer.status = "acuerdo";
    offer.salary = ask.salary;
    offer.years = ask.years;
    offer.role = ask.role;
    return { kind: "acuerdo", msg: pick(["¡Trato hecho! Te esperan para la revisión médica.", "Estrechan la mano: \"Benvenuto!\"", "El director deportivo sonríe: hay acuerdo."]) };
  }
  if (offer.patience <= 0) {
    offer.status = "rota";
    return { kind: "rota", msg: pick(["Se levantaron de la mesa. \"Buscamos otro perfil\".", "El presidente cortó el teléfono. Negociación rota.", "\"Con ese pedido, imposible\". Se fueron."]) };
  }
  offer.patience--;
  const counter = Math.min(ask.salary, Math.round((offer.salary + offer.max) / 2));
  offer.salary = Math.max(offer.salary, counter);
  if (!roleOk) offer.role = "suplente";
  offer.years = ask.years;
  const parts = [];
  if (ask.salary > offer.max) parts.push(`te ofrecen €${offer.salary}k por semana`);
  if (!roleOk) parts.push("no te pueden garantizar la titularidad");
  return { kind: "contra", msg: `Contraoferta: ${parts.join(" y ")}. ${offer.patience === 0 ? "Se los nota impacientes..." : ""}`.trim() };
}

export function signFor(c: Career, offer: Offer) {
  const from = club(c.clubId).name;
  c.clubId = offer.clubId;
  c.contract = { salary: offer.salary, years: offer.years, role: offer.role };
  c.player.coach = 55;
  c.player.morale = clamp(c.player.morale + 10, 0, 100);
  c.news.unshift({ season: c.season, round: c.round, text: `¡BOMBAZO! ${c.player.nick || c.player.name} deja ${from} y firma con ${club(offer.clubId).name} por ${offer.years} temporadas.` });
  closeWindow(c);
}

export function closeWindow(c: Career) {
  c.offers = null;
  c.windowKind = null;
}

// ---------- Fin de temporada ----------

export function avgRating(c: Career) {
  const r = c.seasonStats.ratings;
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 6;
}

export type SeasonSummary = {
  champion: string;
  place: number;
  awards: string[];
  growth: string[];
  retire: boolean;
  renewed: boolean;
};

export function endSeason(c: Career): SeasonSummary {
  const table = standings(c);
  const champion = table[0].id;
  const place = table.findIndex((r) => r.id === c.clubId) + 1;
  const awards: string[] = [];
  const me = c.player.nick || c.player.name;
  if (champion === c.clubId) awards.push(`🏆 Campeón de la Lega Stivale`);
  const top = topScorers(c)[0];
  if (top.name === me && c.seasonStats.goals > 0) awards.push("👟 Capocannoniere (goleador)");
  const avg = avgRating(c);
  if (avg >= 7.4 && c.seasonStats.pj >= 4) awards.push("⭐ Mejor jugador de la liga");
  if (c.player.age <= 21 && avg >= 6.8 && c.seasonStats.pj >= 4) awards.push("🌱 Revelación del año");
  if (avg >= 8 && c.seasonStats.goals >= 6) awards.push("🥇 Pallone d'Oro");
  c.trophies.push(...awards.map((a) => `${a} · T${c.season}`));
  c.history.push({ season: c.season, age: c.player.age, clubId: c.clubId, pj: c.seasonStats.pj, goals: c.seasonStats.goals, assists: c.seasonStats.assists, avg: Math.round(avg * 10) / 10, place, awards });

  // envejecer y evolucionar
  const p = c.player;
  p.age++;
  const growth: string[] = [];
  const bump = (k: StatKey, d: number) => {
    p.stats[k] = clamp(p.stats[k] + d, 20, 99);
    growth.push(`${d > 0 ? "+" : ""}${d} ${STAT_INFO[k].name}`);
  };
  if (p.age <= 21) { bump(pick(STAT_KEYS), 3); bump(pick(STAT_KEYS), 2); }
  else if (p.age <= 25) { bump(pick(STAT_KEYS), 2); bump(pick(STAT_KEYS), 1); }
  else if (p.age <= 29) bump(pick(STAT_KEYS), 1);
  else if (p.age >= 31) { bump("velocidad", -2); bump("fisico", -2); }
  p.energy = 100;
  p.injured = 0;
  p.relapse = false;
  p.fire = 0;

  const retireAge = 33 + Math.floor(p.stats.fisico / 30);
  const retire = p.age >= retireAge;
  let renewed = false;
  if (!retire) {
    c.contract.years--;
    if (c.contract.years <= 0) {
      c.contract.years = 2;
      c.contract.salary = Math.round(c.contract.salary * 1.15) + 1;
      renewed = true;
    }
  }
  return { champion, place, awards, growth, retire, renewed };
}

/** Arranca la temporada siguiente (después del mercado de verano). */
export function startNextSeason(c: Career) {
  c.season++;
  c.round = 0;
  c.fixtures = roundRobin(CLUBS.map((x) => x.id));
  c.table = emptyTable();
  c.scorers = {};
  c.seasonStats = { pj: 0, goals: 0, assists: 0, ratings: [] };
  c.seasonOver = false;
  c.news.unshift({ season: c.season, round: 0, text: `Arranca la temporada ${c.season} de la Lega Stivale. ${c.player.nick || c.player.name} (${c.player.age} años) quiere más.` });
}

export function openSummerWindow(c: Career) {
  openWindow(c, "verano");
}

export function retire(c: Career) {
  c.retired = true;
  const best = [...c.history].sort((a, b) => b.goals - a.goals)[0];
  const cl = club(c.clubId);
  addToHall({
    name: c.player.name,
    nick: c.player.nick,
    pos: c.player.pos,
    seasons: c.history.length,
    goals: c.totals.goals,
    assists: c.totals.assists,
    trophies: c.trophies.length,
    best: best ? `T${best.season}: ${best.goals} goles en ${club(best.clubId).short}` : "—",
    look: c.player.look,
    c1: cl.c1,
    c2: cl.c2,
  });
}

/** Clubes chicos donde podés arrancar. */
export const startingClubs = () => [...CLUBS].sort((a, b) => a.strength - b.strength).slice(0, 3);
