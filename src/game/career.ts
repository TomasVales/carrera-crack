// Motor del modo carrera (v3): 12 ligas reales en paralelo, copas nacionales, copas continentales,
// torneos de selecciones, titularidad, eventos, mercado, tienda y premios con gala.
import {
  BASE_STRENGTH, CLUBS, LEAGUES, NATIONS, applyPower, derbyName, randomName, seeded, SHOP, STAT_INFO, STAT_KEYS, UGLY_BOOTS, clamp, club, clubsOf, league, overall, pick, poisson, rand, randInt, shuffle,
  type Confed, type Foot, type Look, type Pos, type StatKey, type Stats, type Team,
} from "./data";

export type Player = {
  name: string;
  nick: string;
  number: number;
  pos: Pos;
  foot: Foot;
  nation: string;
  look: Look;
  stats: Stats;
  celebration: string;
  age: number;
  xp: number;
  level: number;
  points: number;
  money: number;
  energy: number;
  morale: number;
  fame: number;
  coach: number;
  injured: number;
  relapse: boolean;
  fire: number;
  owned: string[];
  focus: StatKey | "descanso";
  train: Record<StatKey, number>;
  caps: number;
  natGoals: number;
  ballonDor: number;
};

export type Role = "titular" | "suplente";
export type Contract = { salary: number; years: number; role: Role; clause: number };
export type Row = { pj: number; g: number; e: number; p: number; gf: number; gc: number };
export type Fixture = { home: string; away: string; hg?: number; ag?: number; win?: string; pens?: boolean };
export type LeagueState = { fixtures: Fixture[][]; table: Record<string, Row>; scorers: Record<string, number>; round: number; last: Fixture[] };
export type CupKey = "copa" | "cont" | "nac";
export type Cup = { key: CupKey; name: string; icon: string; stages: Fixture[][]; total: number; alive: boolean; champion: string | null };
export type Slot = { kind: "liga"; round: number } | { kind: "cup"; cup: CupKey; stage: number };
export type Offer = { clubId: string; salary: number; years: number; role: Role; max: number; patience: number; status: "abierta" | "acuerdo" | "rota"; loan?: boolean };
export type NewsTag = "partido" | "liga" | "mundo" | "mercado" | "rumor" | "seleccion" | "hito" | "vida";
export type News = { season: number; n: number; text: string; tag: NewsTag; team?: string; big?: boolean };
export type SeasonLog = { season: number; age: number; clubId: string; pj: number; goals: number; assists: number; avg: number; place: number; awards: string[]; str?: number };
export type ClubChange = { id: string; before: number; after: number; signings: string[]; sales: string[] };

export type Career = {
  v: 3;
  slotId: number;
  player: Player;
  clubId: string;
  firstClubId: string;
  contract: Contract;
  season: number;
  leagues: Record<string, LeagueState>;
  lastStandings: Record<string, string[]>;
  cups: Record<CupKey, Cup | null>;
  called: boolean;
  schedule: Slot[];
  slot: number;
  seasonLen: number;
  seasonStats: { pj: number; goals: number; assists: number; ratings: number[]; leagueGoals: number; titles: string[] };
  totals: { pj: number; goals: number; assists: number };
  trophies: string[];
  news: News[];
  history: SeasonLog[];
  offers: Offer[] | null;
  windowKind: "invierno" | "verano" | null;
  pendingEvent: string | null;
  eventCtx: { clubId?: string; salary?: number; name?: string } | null;
  seasonOver: boolean;
  retired: boolean;
  rival: { name: string; ovr: number } | null;
  flags: Record<string, number>;
  milestones: string[];
  counter: number;
  worldChampions: Record<string, string>; // ganadores de copas continentales donde no jugaste
  agent?: string; // id del representante (partidas viejas: el tío)
  agentFee?: number; // comisión actual (puede subir por eventos)
  loan?: { parentId: string; contract: Contract; until: number } | null; // a préstamo: vuelve al terminar la temporada `until`
  nemesis?: Nemesis;
  bond?: Record<string, { seasons: number; goals: number; pj: number }>; // historia con cada club
  idols?: string[]; // clubes donde sos ídolo
  traitor?: string[]; // clubes que te consideran traidor
  counters?: Record<string, number>; // contadores de por vida (logros y desafíos)
  achievements?: string[];
  challenges?: Challenge[];
  drillSlot?: number; // semana en la que ya hiciste el entrenamiento especial
  power?: Record<string, number>; // fuerza actual de cada club (cambia con los resultados)
  signings?: Record<string, Signing[]>; // refuerzos que llegaron a cada club
  sold?: Record<string, string[]>; // jugadores que cada club vendió (salen del plantel)
};
export type Signing = { name: string; pos: SquadPos; ovr: number; age: number; from: string; season: number };

export type Nemesis = { name: string; clubId: string; nation: string; ovr: number; goals: number; seasonGoals: number; ballonDor: number; look: Look; num: number; w: number; d: number; l: number };
export type Challenge = { id: string; text: string; key: string; target: number; start: number; done: boolean };
export type Pep = "concentrar" | "arengar" | "provocar";

// ---------- Representantes ----------
export type Agent = { id: string; emoji: string; name: string; fee: number; skill: number; fame: number; desc: string };
export const AGENTS: Agent[] = [
  { id: "tio", emoji: "👨‍🦳", name: "Tu tío Rubén", fee: 0.02, skill: 0, fame: 0, desc: "Te quiere como a un hijo. De contratos sabe poco." },
  { id: "gino", emoji: "🕴️", name: "Gino Contratti", fee: 0.07, skill: 1, fame: 15, desc: "Conoce a medio mundo. Consigue algo más de sueldo." },
  { id: "billetera", emoji: "💼", name: "Mister Billetera", fee: 0.12, skill: 2, fame: 35, desc: "Te trae más ofertas y negocia fuerte." },
  { id: "volpe", emoji: "🦊", name: "Superagente Volpe", fee: 0.18, skill: 3, fame: 60, desc: "Mueve a los cracks del planeta. Caro, pero los clubes grandes lo atienden." },
];
export const agentOf = (c: Career) => AGENTS.find((a) => a.id === (c.agent ?? "tio")) ?? AGENTS[0];
export const agentFee = (c: Career) => c.agentFee ?? agentOf(c).fee;
/** Cambiar de representante: rescindir con el actual cuesta un mes de sueldo. */
export const agentSwitchCost = (c: Career) => ((c.agent ?? "tio") === "tio" ? 0 : Math.max(5, c.contract.salary * 4));
export function hireAgent(c: Career, id: string): string {
  const a = AGENTS.find((x) => x.id === id);
  if (!a || a.id === (c.agent ?? "tio")) return "";
  if (c.player.fame < a.fame) return `${a.name} no atiende a jugadores con menos de ${a.fame} de fama.`;
  const cost = agentSwitchCost(c);
  if (c.player.money < cost) return `Rescindir con tu representante actual cuesta €${cost}k.`;
  c.player.money -= cost;
  c.agent = a.id;
  c.agentFee = a.fee;
  addNews(c, "mercado", `${myName(c)} cambia de representante: ahora lo maneja ${a.name}.`, c.clubId);
  return `${a.emoji} ${a.name} es tu nuevo representante${cost ? ` (pagaste €${cost}k de rescisión)` : ""}.`;
}

export type MatchOutcome = { played: boolean; hg: number; ag: number; goals: number; assists: number; rating: number | null; pensWin?: boolean; kinds?: string[]; moves?: string[]; pep?: Pep };

export type Report = MatchOutcome & {
  home: string;
  away: string;
  label: string;
  xp: number;
  money: number;
  levelUps: number;
  headline: string;
  outlet: string;
  mvp: string;
  role: Role;
  trainUp: StatKey | null;
  notes: string[];
};

// ---------- Guardado ----------

const slotKey = (n: number) => `crack-v3-slot-${n}`;
const HOF = "crack-hof";

export function save(c: Career) {
  try {
    localStorage.setItem(slotKey(c.slotId), JSON.stringify(c));
  } catch {
    /* sin almacenamiento */
  }
}
export function loadSlot(n: number): Career | null {
  try {
    const s = localStorage.getItem(slotKey(n));
    const c = s ? (JSON.parse(s) as Career) : null;
    return c && c.v === 3 ? upgrade(c) : null;
  } catch {
    return null;
  }
}
export function wipeSlot(n: number) {
  try {
    localStorage.removeItem(slotKey(n));
  } catch {
    /* nada */
  }
}
export const exportCareer = (c: Career) => JSON.stringify(c);
export function importCareer(text: string, slot: number): Career {
  const c = JSON.parse(text) as Career;
  if (!c || c.v !== 3 || !c.player) throw new Error("Ese archivo no es una partida de esta versión de Carrera de Crack.");
  c.slotId = slot;
  upgrade(c);
  save(c);
  return c;
}

export type HallEntry = { name: string; nick: string; pos: Pos; seasons: number; goals: number; assists: number; trophies: number; best: string; look: Look; c1: string; c2: string; ballonDor?: number };
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

// ---------- Calendario y copas ----------

function roundRobin(ids: string[]): Fixture[][] {
  const t = shuffle(ids);
  if (t.length % 2) t.push("__libre");
  const n = t.length;
  const rounds: Fixture[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i];
      const b = t[n - 1 - i];
      if (a === "__libre" || b === "__libre") continue;
      round.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a });
    }
    rounds.push(round);
    t.splice(1, 0, t.pop()!);
  }
  return rounds;
}

const emptyRows = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 }]));

function freshLeagues(): Record<string, LeagueState> {
  return Object.fromEntries(
    LEAGUES.map((l) => {
      const ids = clubsOf(l.id).map((c) => c.id);
      return [l.id, { fixtures: roundRobin(ids), table: emptyRows(ids), scorers: {}, round: 0, last: [] }];
    }),
  );
}

export function stageName(cup: Cup, s: number) {
  const fromEnd = cup.total - 1 - s;
  return ["Final", "Semifinal", "Cuartos de final", "Octavos de final"][fromEnd] ?? `Ronda ${s + 1}`;
}

function newCup(key: CupKey, name: string, icon: string, ids: string[]): Cup {
  const t = shuffle(ids);
  const first: Fixture[] = [];
  for (let i = 0; i + 1 < t.length; i += 2) first.push({ home: t[i], away: t[i + 1] });
  return { key, name, icon, stages: [first], total: Math.round(Math.log2(t.length)), alive: true, champion: null };
}

/** Plazas continentales según la tabla anterior. */
const CONTINENTAL: { name: string; icon: string; quotas: Record<string, [number, number]> }[] = [
  { name: "Champions League", icon: "⭐", quotas: { eng: [0, 4], esp: [0, 4], ita: [0, 3], ger: [0, 3], fra: [0, 1], por: [0, 1] } },
  { name: "Europa League", icon: "🟠", quotas: { eng: [4, 6], esp: [4, 6], ita: [3, 5], ger: [3, 5], fra: [1, 3], por: [1, 3], ned: [0, 2], tur: [0, 2] } },
  { name: "Copa Libertadores", icon: "🏆", quotas: { arg: [0, 8], bra: [0, 8] } },
  { name: "Concacaf Champions Cup", icon: "🌎", quotas: { mex: [0, 4], usa: [0, 4] } },
];

const ZONE_COLORS: Record<string, string> = { "Champions League": "#3b82f6", "Europa League": "#f97316", "Copa Libertadores": "#eab308", "Concacaf Champions Cup": "#10b981" };
export type Zone = { name: string; icon: string; color: string };
/** A qué copa internacional clasifica el puesto `pos` (0 = primero) de una liga. */
export function tableZone(leagueId: string, pos: number): Zone | null {
  for (const comp of CONTINENTAL) {
    const q = comp.quotas[leagueId];
    if (q && pos >= q[0] && pos < q[1]) return { name: comp.name, icon: comp.icon, color: ZONE_COLORS[comp.name] };
  }
  return null;
}
/** Las zonas de una liga, en orden, para la leyenda de la tabla. */
export function leagueZones(leagueId: string): (Zone & { from: number; to: number })[] {
  return CONTINENTAL.filter((comp) => comp.quotas[leagueId]).map((comp) => ({ name: comp.name, icon: comp.icon, color: ZONE_COLORS[comp.name], from: comp.quotas[leagueId][0] + 1, to: comp.quotas[leagueId][1] }));
}

function continentalTeams(c: Career, comp: (typeof CONTINENTAL)[number]) {
  return Object.entries(comp.quotas).flatMap(([lg, [a, b]]) => (c.lastStandings[lg] ?? []).slice(a, b));
}

function strengthOrder(leagueId: string) {
  return [...clubsOf(leagueId)].sort((a, b) => b.strength - a.strength).map((x) => x.id);
}

/** Arma el calendario futuro: fechas de liga con las copas intercaladas. */
function buildSchedule(c: Career): Slot[] {
  const ls = c.leagues[myLeague(c)];
  const n = ls.fixtures.length;
  const slots: { pos: number; s: Slot }[] = [];
  for (let r = ls.round; r < n; r++) slots.push({ pos: r, s: { kind: "liga", round: r } });
  const span = n - ls.round;
  (["copa", "cont"] as const).forEach((key, ci) => {
    const cup = c.cups[key];
    if (!cup || !cup.alive || cup.champion) return;
    const cur = cup.stages.length - 1;
    const left = cup.total - cur;
    for (let j = 0; j < left; j++) slots.push({ pos: ls.round + ((j + 1) * span) / (left + 1) - 0.5 + ci * 0.25 + 0.1, s: { kind: "cup", cup: key, stage: cur + j } });
  });
  return slots.sort((a, b) => a.pos - b.pos).map((x) => x.s);
}

function setupSeasonCups(c: Career) {
  const lg = myLeague(c);
  const L = league(lg);
  const domestic = shuffle(strengthOrder(lg).slice(0, 16));
  if (!domestic.includes(c.clubId)) domestic[0] = c.clubId;
  c.cups = { copa: newCup("copa", L.cup, "🏆", domestic), cont: null, nac: null };
  for (const comp of CONTINENTAL) {
    const teams = continentalTeams(c, comp);
    if (teams.includes(c.clubId)) c.cups.cont = newCup("cont", comp.name, comp.icon, teams);
  }
}

export function newCareer(p: Pick<Player, "name" | "nick" | "number" | "pos" | "foot" | "nation" | "look" | "stats">, clubId: string, slotId: number): Career {
  applyPower(undefined); // carrera nueva: todos los clubes con su fuerza de fábrica
  const c: Career = {
    v: 3,
    slotId,
    player: {
      ...p, celebration: "salto", age: 17, xp: 0, level: 1, points: 0, money: 5, energy: 100, morale: 70, fame: 5, coach: 55, injured: 0, relapse: false, fire: 0,
      owned: [], focus: "tiro", train: { tiro: 0, pase: 0, regate: 0, velocidad: 0, fisico: 0 }, caps: 0, natGoals: 0, ballonDor: 0,
    },
    clubId,
    firstClubId: clubId,
    contract: { salary: 2, years: 2, role: "titular", clause: 2000 },
    season: 1,
    leagues: freshLeagues(),
    lastStandings: Object.fromEntries(LEAGUES.map((l) => [l.id, strengthOrder(l.id)])),
    cups: { copa: null, cont: null, nac: null },
    called: false,
    schedule: [],
    slot: 0,
    seasonLen: 20,
    seasonStats: { pj: 0, goals: 0, assists: 0, ratings: [], leagueGoals: 0, titles: [] },
    totals: { pj: 0, goals: 0, assists: 0 },
    trophies: [],
    news: [],
    history: [],
    offers: null,
    windowKind: null,
    pendingEvent: null,
    eventCtx: null,
    seasonOver: false,
    retired: false,
    rival: null,
    flags: {},
    milestones: [],
    counter: 0,
    worldChampions: {},
  };
  setupSeasonCups(c);
  c.schedule = buildSchedule(c);
  c.seasonLen = c.schedule.length;
  addNews(c, "hito", `${p.nick || p.name} firma su primer contrato profesional con ${club(clubId).name}: "Vengo a hacer historia".`, clubId, true);
  upgrade(c);
  return c;
}

function addNews(c: Career, tag: NewsTag, text: string, team?: string, big = false) {
  c.counter++;
  c.news.unshift({ season: c.season, n: c.counter, text, tag, team, big });
  c.news = c.news.slice(0, 80);
}

// ---------- Números ----------

export const myName = (c: Career) => c.player.nick || c.player.name;
/** "de la Serie A", "de LaLiga", "del Brasileirão". */
export const dela = (n: string) => (/^La[A-Z]/.test(n) ? `de ${n}` : /ão$/.test(n) ? `del ${n}` : `de la ${n}`);
export const ovr = (c: Career) => overall(c.player.stats, c.player.pos);
export const myLeague = (c: Career) => club(c.clubId).league;
export const has = (c: Career, id: string) => c.player.owned.includes(id);
/** Escala por largo de temporada (ligas de 17 a 27 fechas). */
const perMatch = (c: Career) => clamp(16 / Math.max(10, c.seasonLen), 0.45, 1);

export function effStats(c: Career, big = false): Stats {
  const p = c.player;
  const bonus = (p.fire > 0 ? 5 : 0) + (p.morale - 50) / 12 - (p.energy < 35 ? 6 : 0) + (big && has(c, "psico") ? 3 : 0);
  const s = Object.fromEntries(STAT_KEYS.map((k) => [k, clamp(p.stats[k] + bonus, 20, 99)])) as Stats;
  if (c.flags.socio) s.pase = clamp(s.pase + 3, 20, 99);
  return s;
}

export function marketValue(c: Career) {
  const o = ovr(c);
  const age = c.player.age;
  const ageF = age <= 21 ? 1.25 : age <= 26 ? 1.1 : age <= 30 ? 0.85 : 0.5;
  return Math.round(250 * Math.pow(1.17, o - 50) * ageF * (1 + c.player.fame / 120));
}

export const xpNeeded = (level: number) => 80 + level * 20;

/** Sueldo máximo razonable para tu valor (k€ por semana). */
export const salaryCap = (c: Career) => Math.max(3, Math.round(marketValue(c) / 250));

export function avgRating(c: Career) {
  const r = c.seasonStats.ratings;
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : 6;
}

export function standings(c: Career, leagueId = myLeague(c)) {
  const ls = c.leagues[leagueId];
  return clubsOf(leagueId)
    .map((cl) => {
      const r = ls.table[cl.id];
      return { id: cl.id, ...r, dg: r.gf - r.gc, pts: r.g * 3 + r.e };
    })
    .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
}

export function topScorers(c: Career, leagueId = myLeague(c)) {
  const ls = c.leagues[leagueId];
  const list = Object.entries(ls.scorers).map(([name, goals]) => ({ name, goals, me: false }));
  if (leagueId === myLeague(c)) list.push({ name: myName(c), goals: c.seasonStats.leagueGoals, me: true });
  return list.sort((a, b) => b.goals - a.goals).slice(0, 10);
}

// ---------- Partido actual ----------

export type MatchInfo = { slot: Slot; fixture: Fixture; home: Team; away: Team; myId: string; rival: Team; isHome: boolean; label: string; knockout: boolean; big: boolean; cup: Cup | null; derby: string | null; nemesis: boolean };

export function matchInfo(c: Career): MatchInfo | null {
  const s = c.schedule[c.slot];
  if (!s) return null;
  let myId = c.clubId;
  let fx: Fixture | undefined;
  let label: string;
  let cup: Cup | null = null;
  if (s.kind === "liga") {
    fx = c.leagues[myLeague(c)].fixtures[s.round]?.find((f) => f.home === myId || f.away === myId);
    label = `${league(myLeague(c)).name} · Fecha ${s.round + 1}`;
  } else {
    cup = c.cups[s.cup];
    if (s.cup === "nac") myId = c.player.nation;
    fx = cup?.stages[s.stage]?.find((f) => f.home === myId || f.away === myId);
    label = cup ? `${cup.name} · ${stageName(cup, s.stage)}` : "";
  }
  if (!fx) return null;
  const isHome = fx.home === myId;
  const rival = club(isHome ? fx.away : fx.home);
  const derby = derbyName(myId, rival.id);
  const nemesis = !!c.nemesis && (rival.id === c.nemesis.clubId || rival.id === c.nemesis.nation);
  const big = s.kind === "cup" || !!derby || nemesis || (rival.strength >= 82 && club(myId).strength >= 75);
  return { slot: s, fixture: fx, home: club(fx.home), away: club(fx.away), myId, rival, isHome, label, knockout: s.kind === "cup", big, cup, derby, nemesis };
}

export function matchRole(c: Career): { role: Role; why: string } {
  const s = c.schedule[c.slot];
  if (s?.kind === "cup" && s.cup === "nac") return { role: "titular", why: "El DT de la selección confía en vos" };
  const o = ovr(c);
  const p = c.player;
  const rivalO = c.rival?.ovr ?? club(c.clubId).strength - 6;
  const score = p.coach - 50 + (o - rivalO) * 2 + (c.contract.role === "titular" ? 12 : -8) + (p.energy < 30 ? -15 : 0);
  if (score >= -5) return { role: "titular", why: p.coach >= 70 ? "Sos intocable para el DT" : c.rival ? `Le ganás el puesto a ${c.rival.name}` : "El DT te pone de entrada" };
  return { role: "suplente", why: p.energy < 30 ? "Llegás muy cansado: arrancás en el banco" : c.rival && rivalO > o ? `Juega ${c.rival.name}. Entrás en el segundo tiempo` : "El plantel tiene mucho nivel: arrancás en el banco" };
}

export function rivalLevel(c: Career) {
  const m = matchInfo(c);
  return m ? clamp((m.rival.strength - 55) / 35, 0, 1) : 0.5;
}

function teamPower(c: Career, id: string, withMe: boolean, role: Role, big: boolean) {
  const base = club(id).strength;
  if (!withMe) return base;
  const o = overall(effStats(c, big), c.player.pos);
  const share = role === "titular" ? 0.16 : 0.07;
  return base * (1 - share) + o * share;
}

function simScore(hp: number, ap: number, neutral = false) {
  const d = (hp - ap) / 20;
  return [poisson(clamp(1.3 + d + (neutral ? 0 : 0.15), 0.25, 3.8)), poisson(clamp(1.2 - d, 0.2, 3.6))];
}

export function backgroundScore(c: Career) {
  const m = matchInfo(c)!;
  const d = (club(m.myId).strength - m.rival.strength) / 22;
  return {
    mine: poisson(clamp(0.55 + d + (m.isHome ? 0.12 : 0), 0.1, 2.2)),
    theirs: poisson(clamp(1.05 - d - (m.isHome ? 0.1 : 0), 0.15, 2.6)),
  };
}

export function simulateMine(c: Career, injured: boolean): MatchOutcome {
  const m = matchInfo(c)!;
  const { role } = matchRole(c);
  const me = teamPower(c, m.myId, !injured, role, m.big);
  const rv = m.rival.strength;
  const neutral = m.slot.kind === "cup" && m.slot.cup === "nac";
  const [hg, ag] = m.isHome ? simScore(me, rv, neutral) : simScore(rv, me, neutral);
  const mine = m.isHome ? hg : ag;
  const theirs = m.isHome ? ag : hg;
  const pensWin = m.knockout && mine === theirs ? rand() < 0.5 + (me - rv) / 100 : undefined;
  if (injured) return { played: false, hg, ag, goals: 0, assists: 0, rating: null, pensWin };
  const e = effStats(c, m.big);
  const roleF = role === "titular" ? 1 : 0.5;
  const share = { DC: 0.34, EXT: 0.22, ENG: 0.17 }[c.player.pos] * (e.tiro / 72) * roleF;
  const ashare = { DC: 0.12, EXT: 0.22, ENG: 0.3 }[c.player.pos] * (e.pase / 72) * roleF;
  let goals = 0;
  let assists = 0;
  for (let i = 0; i < mine; i++) {
    const r = rand();
    if (r < share) goals++;
    else if (r < share + ashare) assists++;
  }
  const res = Math.sign(mine - theirs);
  const noise = (rand() + rand() + rand() - 1.5) * 0.9;
  const rating = clamp(5.4 + goals * 1.05 + assists * 0.65 + (overall(e, c.player.pos) - 62) / 25 + res * 0.3 + noise - (role === "suplente" ? 0.3 : 0), 3, 9.5);
  return { played: false, hg, ag, goals, assists, rating: Math.round(rating * 10) / 10, pensWin };
}

export function playedRating(goals: number, assists: number, good: number, bad: number, diff: number) {
  const r = 6 + goals * 1.3 + assists * 0.9 + good * 0.25 - bad * 0.35 + Math.sign(diff) * 0.35;
  return Math.round(clamp(r, 3, 10) * 10) / 10;
}

// ---------- Resultados ----------

function applyRow(table: Record<string, Row>, f: Fixture) {
  const h = table[f.home];
  const a = table[f.away];
  h.pj++; a.pj++;
  h.gf += f.hg!; h.gc += f.ag!; a.gf += f.ag!; a.gc += f.hg!;
  if (f.hg! > f.ag!) { h.g++; a.p++; } else if (f.hg! < f.ag!) { a.g++; h.p++; } else { h.e++; a.e++; }
}

function addScorers(ls: LeagueState, f: Fixture, skipMine: { id: string; goals: number } | null) {
  for (const [id, gl] of [[f.home, f.hg!], [f.away, f.ag!]] as const) {
    let n = gl;
    if (skipMine && id === skipMine.id) n -= skipMine.goals;
    const star = club(id).star;
    for (let i = 0; i < n; i++) if (rand() < 0.36) ls.scorers[star] = (ls.scorers[star] ?? 0) + 1;
  }
}

function simKO(f: Fixture) {
  const [hg, ag] = simScore(club(f.home).strength, club(f.away).strength, true);
  f.hg = hg;
  f.ag = ag;
  if (hg === ag) {
    f.pens = true;
    f.win = rand() < 0.5 ? f.home : f.away;
  } else f.win = hg > ag ? f.home : f.away;
}

function advanceCup(cup: Cup, stage: number) {
  const winners = cup.stages[stage].map((f) => f.win!);
  if (winners.length === 1) {
    cup.champion = winners[0];
    return;
  }
  const next: Fixture[] = [];
  for (let i = 0; i < winners.length; i += 2) next.push({ home: winners[i], away: winners[i + 1] });
  cup.stages[stage + 1] = next;
}

function finishCupWithoutMe(cup: Cup) {
  cup.alive = false;
  for (let s = cup.stages.length - 1; !cup.champion && s < cup.total; s++) {
    if (!cup.stages[s]) break;
    for (const f of cup.stages[s]) if (!f.win) simKO(f);
    advanceCup(cup, s);
  }
}

const OUTLETS = ["Marca Inventada", "La Gazzetta del Pallone", "Olé Ficticio", "The Daily Pitch", "L'Équipe Imaginaire", "Kicker de Mentira", "Radio Fernet FM"];

function headline(c: Career, o: MatchOutcome, m: MatchInfo, role: Role): string {
  const me = myName(c);
  const mine = m.isHome ? o.hg : o.ag;
  const theirs = m.isHome ? o.ag : o.hg;
  const team = club(m.myId);
  const rv = m.rival;
  if (o.rating === null) return pick([`${team.name} juega sin su ${c.player.number}: ${mine}-${theirs} ante ${rv.name}`, `Sin ${me}, ${team.name} sale del paso como puede`]);
  if (m.knockout && mine === theirs) return o.pensWin ? `¡Por penales! ${team.name} avanza y ${me} lo grita` : `Drama en los penales: ${team.name} queda afuera`;
  if (o.goals >= 3) return pick([`¡${me} imparable! Triplete ante ${rv.name}`, `Hat-trick de ${me}: ${rv.name} todavía lo busca`]);
  if (o.goals === 2) return pick([`Doblete de ${me} y la tribuna canta su nombre`, `${me} se viste de héroe con dos goles`]);
  if (o.goals === 1 && mine > theirs) return pick([`Gol de ${me} y triunfo de ${team.name}`, `${me} la mandó a guardar: ${team.short} gana ${mine}-${theirs}`]);
  if (role === "suplente" && (o.rating ?? 0) >= 7) return `${me} entró desde el banco y cambió el partido`;
  if (o.assists >= 2) return `${me}, el socio ideal: dos asistencias ante ${rv.name}`;
  if ((o.rating ?? 0) < 5) return pick([`Noche para el olvido de ${me}`, `${me} desconocido: "Mañana es otro día"`, `¿Dónde estaba ${me}? La hinchada pide explicaciones`]);
  if (mine === theirs) return pick([`Empate con sabor a poco`, `${team.short} y ${rv.short} se reparten los puntos`]);
  if (mine < theirs) return pick([`Golpe duro para ${team.name} ante ${rv.name}`, `${rv.name} le aguó la fiesta a ${team.name}`]);
  return pick([`${team.name} gana y sueña en grande`, `Tres puntos de oro para ${team.name}`]);
}

function playRoundOf(c: Career, lid: string, r: number, mine: Fixture | null, myGoals: number) {
  const ls = c.leagues[lid];
  for (const f of ls.fixtures[r]) {
    if (f !== mine || f.hg === undefined) [f.hg, f.ag] = simScore(club(f.home).strength, club(f.away).strength);
    applyRow(ls.table, f);
    addScorers(ls, f, f === mine ? { id: c.clubId, goals: myGoals } : null);
  }
  ls.last = ls.fixtures[r];
  ls.round = r + 1;
}

/** Avanza todas las ligas al mismo ritmo que la tuya. */
function playLeagueRound(c: Career, myRound: number, mine: Fixture | null, myGoals: number) {
  const myL = myLeague(c);
  const R = c.leagues[myL].fixtures.length;
  for (const l of LEAGUES) {
    const ls = c.leagues[l.id];
    const target = l.id === myL ? myRound + 1 : Math.min(ls.fixtures.length, Math.floor(((myRound + 1) * ls.fixtures.length) / R));
    const prevLeader = standings(c, l.id)[0].id;
    const before = ls.round;
    while (ls.round < target) playRoundOf(c, l.id, ls.round, l.id === myL ? mine : null, myGoals);
    if (ls.round === before) continue;
    const leader = standings(c, l.id)[0];
    if (l.id === myL) {
      if (leader.id !== prevLeader && ls.round > 1) addNews(c, "liga", `${club(leader.id).name} es el nuevo puntero ${dela(l.name)} con ${leader.pts} puntos.`, leader.id);
    } else if (rand() < 0.3) {
      const best = [...ls.last].sort((a, b) => Math.abs(b.hg! - b.ag!) - Math.abs(a.hg! - a.ag!))[0];
      if (!best) continue;
      const w = best.hg! >= best.ag! ? best.home : best.away;
      const lo = w === best.home ? best.away : best.home;
      const txt = best.hg === best.ag
        ? `${l.flag} ${l.name}: ${club(best.home).name} y ${club(best.away).name} empataron ${best.hg}-${best.ag}. Puntero: ${club(leader.id).name}.`
        : `${l.flag} ${l.name}: ${club(w).name} le ganó ${Math.max(best.hg!, best.ag!)}-${Math.min(best.hg!, best.ag!)} a ${club(lo).name}. ${leader.id === w ? "¡Y es puntero!" : `Puntero: ${club(leader.id).name}.`}`;
      addNews(c, "mundo", txt, w);
    }
  }
}

export function finishMatch(c: Career, o: MatchOutcome): Report {
  const m = matchInfo(c)!;
  const s = m.slot;
  const p = c.player;
  const { role } = matchRole(c);
  const mine = m.isHome ? o.hg : o.ag;
  const theirs = m.isHome ? o.ag : o.hg;
  const notes: string[] = [];
  const isNat = s.kind === "cup" && s.cup === "nac";
  m.fixture.hg = o.hg;
  m.fixture.ag = o.ag;
  const hl = headline(c, o, m, role);
  const k = perMatch(c);
  upgrade(c);
  const levelBefore = p.level;

  if (s.kind === "liga") {
    playLeagueRound(c, s.round, m.fixture, o.goals);
    c.seasonStats.leagueGoals += o.goals;
  } else {
    const cup = m.cup!;
    m.fixture.pens = mine === theirs;
    m.fixture.win = mine > theirs || (mine === theirs && o.pensWin) ? m.myId : m.rival.id;
    for (const f of cup.stages[s.stage]) if (f !== m.fixture && !f.win) simKO(f);
    const won = m.fixture.win === m.myId;
    advanceCup(cup, s.stage);
    if (!won) {
      finishCupWithoutMe(cup);
      addNews(c, isNat ? "seleccion" : "liga", `${cup.name}: ${club(m.myId).name} queda eliminado en ${stageName(cup, s.stage).toLowerCase()}. Campeón: ${club(cup.champion!).name}.`, cup.champion!);
    } else if (cup.champion === m.myId) {
      const t = `${cup.icon} Campeón ${dela(cup.name)}${isNat ? ` con ${club(m.myId).name}` : ""}`;
      c.trophies.push(`${t} · T${c.season}`);
      c.seasonStats.titles.push(cup.name);
      addNews(c, isNat ? "seleccion" : "liga", `¡${club(m.myId).name} campeón ${dela(cup.name)}! ${myName(c)} levanta la copa.`, m.myId, true);
      notes.push(`${t}!`);
    }
    if (isNat && o.rating !== null) {
      p.caps++;
      p.natGoals += o.goals;
    }
  }

  let xp = 0;
  let money = isNat ? 0 : c.contract.salary;
  let levelUps = 0;
  let trainUp: StatKey | null = null;
  if (o.rating !== null) {
    const bigF = m.big ? 1.25 : 1;
    xp = Math.round((30 + o.rating * 10 + o.goals * 22 + o.assists * 14) * (o.played ? 1 : 0.6) * bigF * k);
    if (!isNat) {
      c.seasonStats.pj++;
      c.seasonStats.goals += o.goals;
      c.seasonStats.assists += o.assists;
      c.seasonStats.ratings.push(o.rating);
    }
    c.totals.pj++;
    c.totals.goals += o.goals;
    c.totals.assists += o.assists;
    const rec = has(c, "chef") ? 15 : 9;
    p.energy = clamp(p.energy - (o.played ? 16 : 12) * (1.3 - p.stats.fisico / 150) + rec, 5, 100);
    p.morale = clamp(p.morale + (o.rating - 6.2) * 4 + (mine > theirs ? 2 : mine < theirs ? -2 : 0), Math.max(5, moraleFloor(c)), 100);
    p.fame = clamp(p.fame + (o.goals * 1.5 + o.assists * 0.8 + (o.rating >= 8 ? 1.5 : 0) + (m.big ? 1 : 0)) * k, 0, 100);
    p.coach = clamp(p.coach + (o.rating - 6) * 2.2 + (58 - p.coach) * 0.04, 0, 100);
    if (p.fire > 0) p.fire--;
    if (o.goals && !isNat) money += o.goals * Math.max(1, Math.round(c.contract.salary * 0.3));
    afterPlayed(c, o, m, role, mine, theirs, isNat, notes);
    if (m.derby) {
      if (mine > theirs) {
        p.fame = clamp(p.fame + 3 + o.goals * 2, 0, 100);
        p.morale = clamp(p.morale + 6, 0, 100);
        notes.push(`🔥 ¡Ganaste el ${m.derby}! La hinchada te lleva en andas (+fama)`);
        addNews(c, "partido", `${club(m.myId).name} se queda con el ${m.derby}${o.goals ? ` con ${o.goals > 1 ? `${o.goals} goles` : "gol"} de ${myName(c)}` : ""}. Fiesta en las calles.`, m.myId, true);
      } else if (mine < theirs) {
        p.morale = clamp(p.morale - 6, Math.max(5, moraleFloor(c)), 100);
        notes.push(`😞 Perdiste el ${m.derby}. Una semana sin salir a la calle (−moral)`);
      } else notes.push(`🤝 Empate en el ${m.derby}. Nadie se burla de nadie esta semana`);
    }
    if (c.flags.promesa) {
      delete c.flags.promesa;
      if (o.goals > 0) { p.fame = clamp(p.fame + 10, 0, 100); notes.push("¡Cumpliste la promesa de gol! +10 fama"); addNews(c, "vida", `${myName(c)} prometió un gol y cumplió. La hinchada lo adora.`, c.clubId); }
      else { p.fame = clamp(p.fame - 6, 0, 100); p.morale = clamp(p.morale - 6, 0, 100); notes.push("No cumpliste la promesa de gol... −6 fama"); }
    }
    if (c.flags.apuesta) {
      delete c.flags.apuesta;
      if (o.goals >= 2) { p.money += 20; notes.push("¡Ganaste la apuesta! Tu compañero paga la cena (+€20k)"); }
      else { p.money = Math.max(0, p.money - 10); notes.push("Perdiste la apuesta: pagás vos la cena (−€10k)"); }
    }
  } else {
    p.injured = Math.max(0, p.injured - 1);
    p.energy = clamp(p.energy + 20, 0, 100);
    if (p.injured === 0 && p.relapse) {
      p.relapse = false;
      if (rand() < 0.35) {
        p.injured = 2;
        addNews(c, "vida", `Recaída: ${myName(c)} vuelve a sentir la molestia. Dos partidos más afuera.`, c.clubId);
      }
    }
  }
  if (p.focus === "descanso") p.energy = clamp(p.energy + 12, 0, 100);
  else if (p.injured === 0) {
    p.train[p.focus] = (p.train[p.focus] ?? 0) + 0.3 * k * (has(c, "pf") ? 1.5 : 1);
    p.energy = clamp(p.energy - 3, 5, 100);
    if (p.train[p.focus] >= 1 && p.stats[p.focus] < 99) {
      p.train[p.focus] -= 1;
      p.stats[p.focus]++;
      trainUp = p.focus;
    }
  }
  if (money > 0 && !isNat) money -= Math.round(money * agentFee(c));
  p.money += money;
  p.xp += xp;
  while (p.xp >= xpNeeded(p.level)) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    p.points += 4;
    levelUps++;
  }

  for (const mv of MOVES) if (mv.level > levelBefore && mv.level <= p.level) {
    notes.push(`${mv.emoji} ¡Nueva jugada desbloqueada: ${mv.name}! ${mv.how}`);
    addNews(c, "hito", `${myName(c)} sorprende en el entrenamiento: ahora tira ${mv.name.toLowerCase()}s.`, c.clubId);
  }
  if (o.rating !== null) checkAchievements(c, notes);

  const hito = (id: string, text: string) => {
    if (c.milestones.includes(id)) return;
    c.milestones.push(id);
    addNews(c, "hito", text, c.clubId, true);
    notes.push(text);
  };
  if (o.rating !== null) {
    hito("debut", `¡Debut profesional de ${myName(c)} con la ${p.number}!`);
    if (o.goals > 0) hito("gol1", `¡Primer gol como profesional de ${myName(c)}!`);
    if (o.goals >= 3) hito("hat", `Primer hat-trick de ${myName(c)}. Se lleva la pelota a casa.`);
    for (const n of [50, 100, 200, 300, 500]) if (c.totals.pj >= n) hito(`pj${n}`, `${myName(c)} llega a los ${n} partidos como profesional.`);
    for (const n of [25, 50, 100, 200, 300]) if (c.totals.goals >= n) hito(`g${n}`, `¡${n} goles en la carrera de ${myName(c)}!`);
    if (isNat) hito("seldeb", `${myName(c)} debuta con la camiseta de ${club(p.nation).name}. Emoción total.`);
    if (s.kind === "cup" && s.cup === "cont") hito(`cont-${m.cup!.name}`, `${myName(c)} juega por primera vez la ${m.cup!.name}. La música del torneo le eriza la piel.`);
  }

  const mvp = o.rating !== null && o.rating >= 7.5 ? myName(c) : rand() < 0.5 ? club(m.myId).star : m.rival.star;
  const outlet = pick(OUTLETS);
  addNews(c, isNat ? "seleccion" : "partido", `${hl} (${club(m.fixture.home).short} ${o.hg}-${o.ag} ${club(m.fixture.away).short})`, m.myId);
  if (rand() < 0.15 * k * 1.5 && avgRating(c) >= 6.9) {
    const big = pick(topClubs(12).filter((x) => x.id !== c.clubId)); // los más fuertes del momento
    addNews(c, "rumor", pick([`Rumor: ${big.name} manda a sus ojeadores a ver a ${myName(c)}.`, `Dicen que ${big.name} prepara una oferta por ${myName(c)}.`, `El presidente de ${big.name}: "¿${myName(c)}? Nos encanta".`]), big.id);
  }

  c.slot++;
  advanceSlots(c);
  const R = c.leagues[myLeague(c)].fixtures.length;
  if (s.kind === "liga" && s.round === Math.floor(R / 2) - 1) openWindow(c, "invierno");

  if (o.rating !== null && !c.seasonOver && !c.pendingEvent) {
    const injuryChance = (0.035 + (p.energy < 35 ? 0.08 : 0) - p.stats.fisico / 2500) * 0.8;
    if (rand() < injuryChance) c.pendingEvent = "lesion";
    else if (rand() < 0.42 * k * 1.15) rollEvent(c);
  }
  return { ...o, home: m.fixture.home, away: m.fixture.away, label: m.label, xp, money, levelUps, headline: hl, outlet, mvp, role, trainUp, notes };
}

// ---------- Selección ----------

function natTournament(c: Career): { name: string; icon: string; teams: string[] } | null {
  const me = club(c.player.nation);
  const confed = me.confed as Confed;
  const of = (cf: Confed[]) => NATIONS.filter((n) => cf.includes(n.confed as Confed)).map((n) => n.id);
  const top = (ids: string[], n: number) => {
    const others = ids.filter((x) => x !== me.id).sort((a, b) => club(b).strength + rand() * 6 - (club(a).strength + rand() * 6));
    return shuffle([me.id, ...others.slice(0, n - 1)]);
  };
  const y = c.season % 4;
  if (y === 2) return { name: "Mundial", icon: "🌍", teams: top(NATIONS.map((n) => n.id), 16) };
  if (y === 0) {
    if (confed === "UEFA") return { name: "Eurocopa", icon: "🇪🇺", teams: top(of(["UEFA"]), 16) };
    if (confed === "CONMEBOL") return { name: "Copa América", icon: "🌎", teams: top([...of(["CONMEBOL"]), ...of(["CONCACAF"])], 16) };
    if (confed === "CONCACAF") return { name: "Copa Oro", icon: "🥇", teams: top([...of(["CONCACAF"]), "n-qat"], 8) };
    if (confed === "CAF") return { name: "Copa Africana", icon: "🌍", teams: top(of(["CAF"]), 8) };
    return { name: "Copa Asiática", icon: "🌏", teams: top(of(["AFC"]), 8) };
  }
  if (confed === "UEFA") return { name: "Nations League", icon: "🔷", teams: top(of(["UEFA"]), 8) };
  if (confed === "CONCACAF") return { name: "Nations League Concacaf", icon: "🔷", teams: top(of(["CONCACAF"]), 8) };
  return { name: "Eliminatorias", icon: "🎟️", teams: top(of([confed]), 8) };
}

function maybeCallUp(c: Career) {
  const nat = club(c.player.nation);
  const o = ovr(c);
  const called = (o >= nat.strength - 12 && (avgRating(c) >= 7.0 || c.player.fame >= 45)) || o >= nat.strength - 6 || (o >= nat.strength - 15 && !!c.flags.scout);
  if (!called) return;
  const t = natTournament(c)!;
  c.cups.nac = newCup("nac", t.name, t.icon, t.teams);
  c.called = true;
  for (let i = 0; i < c.cups.nac.total; i++) c.schedule.push({ kind: "cup", cup: "nac", stage: i });
  addNews(c, "seleccion", `¡CONVOCADO! ${myName(c)} está en la lista de ${nat.name} para ${t.name === "Eliminatorias" ? "las Eliminatorias" : `la ${t.name}`}.`, nat.id, true);
  c.pendingEvent = "convocatoria";
  delete c.flags.scout;
}

/** Saltea partidos de copas donde quedaste afuera; al terminar la liga, ¿convocatoria? */
function advanceSlots(c: Career) {
  for (;;) {
    const s = c.schedule[c.slot];
    if (!s || s.kind === "liga") break;
    const cup = c.cups[s.cup];
    if (!cup || !cup.alive || cup.champion || !cup.stages[s.stage]) { c.slot++; continue; }
    break;
  }
  const ls = c.leagues[myLeague(c)];
  if (!c.schedule[c.slot] && ls.round >= ls.fixtures.length && !c.cups.nac) {
    for (const key of ["copa", "cont"] as const) {
      const cup = c.cups[key];
      if (cup && !cup.champion) finishCupWithoutMe(cup);
    }
    maybeCallUp(c);
  }
  if (!c.schedule[c.slot]) c.seasonOver = true;
}

// ---------- Eventos ----------

export type EventOption = { label: string; hint: string; apply: (c: Career) => string };
export type GameEvent = { id: string; emoji: string; title: string; weight: (c: Career) => number; text: (c: Career) => string; options: EventOption[] };

const NAMES_RIVAL = ["Federico Bellissimo", "Nico Rapidino", "Tiziano Golazzo", "Sandro Tacco", "Pablo Cañonazo", "Kevin Sprint"];
const MATES = ["Lorenzo", "Mattia", "Diego", "Jamie", "Andrés", "Giorgio", "Raúl", "Billy"];
const moraleFloor = (c: Career) => (has(c, "isla") ? 60 : has(c, "depto") ? 40 : 0);
const add = (c: Career, k: "morale" | "fame" | "coach" | "energy", v: number) => {
  c.player[k] = clamp(c.player[k] + v, k === "morale" ? moraleFloor(c) : 0, 100);
};

export const EVENTS: Record<string, GameEvent> = {
  lesion: {
    id: "lesion", emoji: "🩼", title: "¡Pinchazo en el isquio!", weight: () => 0,
    text: () => "Terminaste el partido rengueando. El médico dice que es una lesión muscular. ¿Cómo la encarás?",
    options: [
      { label: "Vuelta rápida", hint: "1 partido afuera · 35% de recaída", apply: (c) => { c.player.injured = 1; c.player.relapse = true; return "Te infiltrás y apurás los tiempos. Ojalá aguante..."; } },
      { label: "Tratamiento completo", hint: "3 partidos afuera · sin riesgo", apply: (c) => { c.player.injured = 3; add(c, "morale", -5); return "Paciencia: volvés al 100%."; } },
    ],
  },
  convocatoria: {
    id: "convocatoria", emoji: "📞", title: "¡Te llamaron de la selección!", weight: () => 0,
    text: (c) => `Suena el teléfono: es el DT de ${club(c.player.nation).name}. "Te queremos para ${c.cups.nac?.name === "Eliminatorias" ? "las Eliminatorias" : `la ${c.cups.nac?.name}`}".`,
    options: [{ label: "¡Vamos! 🙌", hint: "Jugás con tu selección al final de la temporada", apply: (c) => { add(c, "morale", 15); add(c, "fame", 5); return "Llorás de emoción. Tu familia festeja en el living."; } }],
  },
  prensa: {
    id: "prensa", emoji: "🎤", title: "Micrófono abierto", weight: () => 1,
    text: () => "Un periodista te frena en la zona mixta: \"¿Por qué el DT te cambió en el segundo tiempo?\"",
    options: [
      { label: "\"El DT sabe lo que hace\"", hint: "+ relación con el DT", apply: (c) => { add(c, "coach", 10); return "El DT te guiñó el ojo en el entrenamiento."; } },
      { label: "\"Pregúntenle a él\"", hint: "+ fama · − relación con el DT", apply: (c) => { add(c, "fame", 8); add(c, "coach", -15); return "Tu frase es tendencia. El DT no la vio con buenos ojos."; } },
    ],
  },
  fiesta: {
    id: "fiesta", emoji: "🎉", title: "Cumpleaños del capitán", weight: () => 1,
    text: () => "El capitán festeja su cumple con pizza y karaoke... la noche antes del próximo partido.",
    options: [
      { label: "Ir un ratito", hint: "+ moral · − energía", apply: (c) => { add(c, "morale", 15); add(c, "energy", -25); return "Cantaste tres temas. El vestuario te ama."; } },
      { label: "Quedarme descansando", hint: "+ DT · − moral", apply: (c) => { add(c, "coach", 5); add(c, "morale", -5); return "Dormiste 9 horas. El cuerpo técnico lo anotó."; } },
    ],
  },
  sponsor: {
    id: "sponsor", emoji: "👟", title: "Propuesta de sponsor", weight: (c) => (c.player.look.boots !== UGLY_BOOTS ? 0.7 : 0),
    text: (c) => `La marca "Zapattino" te ofrece €${Math.max(10, Math.round(c.contract.salary * 6))}k por usar sus botines nuevos... verde limón con rosa chicle.`,
    options: [
      { label: "Aceptar la plata", hint: "+ plata · + fama · botines horribles", apply: (c) => { const m = Math.max(10, Math.round(c.contract.salary * 6)); c.player.money += m; add(c, "fame", 3); c.player.look.boots = UGLY_BOOTS; return `+€${m}k. Tus botines se ven desde la luna.`; } },
      { label: "Rechazar", hint: "No pasa nada", apply: () => "Mantenés tu estilo. La marca busca otro jugador." },
    ],
  },
  fuego: {
    id: "fuego", emoji: "🔥", title: "¡Estás en racha!", weight: (c) => (c.player.fire > 0 ? 0 : 0.7),
    text: () => "Te sale todo. En el entrenamiento la clavaste en el ángulo cinco veces seguidas.",
    options: [{ label: "¡A romperla!", hint: "+5 a todo por 3 partidos", apply: (c) => { c.player.fire = 3; return "Racha de fuego activada 🔥"; } }],
  },
  rival: {
    id: "rival", emoji: "⚔️", title: "Competencia por el puesto", weight: (c) => (c.rival ? 0 : 0.8),
    text: (c) => {
      if (!c.eventCtx?.name) c.eventCtx = { name: pick(NAMES_RIVAL) };
      return `El club fichó a ${c.eventCtx.name}, que juega en tu misma posición. El DT dice que "juega el que está mejor".`;
    },
    options: [
      { label: "Entrenar doble turno", hint: "+1 a una stat · − energía · + DT", apply: (c) => { c.rival = { name: c.eventCtx?.name ?? pick(NAMES_RIVAL), ovr: ovr(c) + randInt(0, 6) }; const k = pick(STAT_KEYS); c.player.stats[k] = clamp(c.player.stats[k] + 1, 0, 99); add(c, "energy", -20); add(c, "coach", 5); return `Te rompiste el lomo: +1 en ${STAT_INFO[k].name}. ${c.rival.name} toma nota.`; } },
      { label: "Hablar con el DT", hint: "+ moral · − relación con el DT", apply: (c) => { c.rival = { name: c.eventCtx?.name ?? pick(NAMES_RIVAL), ovr: ovr(c) + randInt(0, 6) }; add(c, "morale", 6); add(c, "coach", -5); return "Le dejaste en claro lo que querés. No le encantó el tono."; } },
    ],
  },
  hincha: {
    id: "hincha", emoji: "📸", title: "Un pequeño hincha", weight: () => 0.8,
    text: (c) => `A la salida del estadio te espera un nene con la camiseta ${c.player.number} y tu nombre escrito con fibrón.`,
    options: [
      { label: "Foto y autógrafo", hint: "+ moral · + fama", apply: (c) => { add(c, "morale", 10); add(c, "fame", 3); return "El video del nene llorando de emoción da la vuelta al mundo."; } },
      { label: "\"Tengo apuro\"", hint: "− fama", apply: (c) => { add(c, "fame", -4); return "Alguien lo filmó. Mala prensa..."; } },
    ],
  },
  romance: {
    id: "romance", emoji: "💘", title: "Paparazzi", weight: (c) => (c.flags.romance ? 0 : c.player.fame >= 25 ? 0.6 : 0),
    text: () => "Te sacaron fotos cenando con una cantante famosa. Las revistas no hablan de otra cosa.",
    options: [
      { label: "Confirmar el romance", hint: "+ fama · + moral · puede seguir...", apply: (c) => { c.flags.romance = 1; add(c, "fame", 10); add(c, "morale", 6); return "Son la pareja del momento. Hay memes con tu cara."; } },
      { label: "\"Somos amigos\"", hint: "Nada cambia", apply: () => "Nadie te cree, pero el tema se enfría." },
    ],
  },
  romance2: {
    id: "romance2", emoji: "💔", title: "Escándalo en las revistas", weight: (c) => (c.flags.romance === 1 ? 0.9 : 0),
    text: () => "Las revistas dicen que se pelearon en público. La prensa te persigue hasta el entrenamiento.",
    options: [
      { label: "Hablar con la prensa", hint: "+ fama · − moral", apply: (c) => { c.flags.romance = 2; add(c, "fame", 5); add(c, "morale", -10); return "Tu entrevista fue la más vista del año. Pero quedaste destruido."; } },
      { label: "Encerrarte a entrenar", hint: "+1 a tu foco de entrenamiento", apply: (c) => { c.flags.romance = 2; const k = c.player.focus === "descanso" ? "tiro" : c.player.focus; c.player.stats[k] = clamp(c.player.stats[k] + 1, 0, 99); return `Canalizás todo en la cancha: +1 ${STAT_INFO[k].name}.`; } },
    ],
  },
  capitan: {
    id: "capitan", emoji: "😤", title: "Roce con el capitán", weight: (c) => (c.flags.pelea ? 0 : 0.6),
    text: () => "El capitán te gritó delante de todos por no pasarle la pelota en el último partido.",
    options: [
      { label: "Pedir disculpas", hint: "+ DT · − moral", apply: (c) => { add(c, "coach", 4); add(c, "morale", -3); return "Le diste la mano. El vestuario respira tranquilo."; } },
      { label: "Plantarte", hint: "+ fama · − DT · puede seguir...", apply: (c) => { c.flags.pelea = 1; add(c, "fame", 3); add(c, "coach", -8); return "\"Yo juego para ganar\". Se armó un silencio incómodo."; } },
    ],
  },
  capitan2: {
    id: "capitan2", emoji: "🍖", title: "La pelea sigue", weight: (c) => (c.flags.pelea === 1 ? 1 : 0),
    text: () => "El capitán no te habla y en la cancha no te la pasa. El DT está preocupado.",
    options: [
      { label: "Invitarlo a un asado", hint: "+ moral · + DT", apply: (c) => { c.flags.pelea = 2; add(c, "morale", 8); add(c, "coach", 6); return "Entre chorizos y anécdotas, se amigaron. Ahora son uña y carne."; } },
      { label: "Ignorarlo", hint: "− moral · − DT", apply: (c) => { c.flags.pelea = 2; add(c, "morale", -8); add(c, "coach", -6); return "El clima en el vestuario está espeso."; } },
    ],
  },
  socio: {
    id: "socio", emoji: "🤝", title: "Nace una sociedad", weight: (c) => (c.flags.socio ? 0 : 0.5),
    text: (c) => {
      if (!c.eventCtx?.name) c.eventCtx = { name: pick(MATES) };
      return `Con ${c.eventCtx.name} se entienden de memoria. Te propone quedarse después del entrenamiento a practicar paredes.`;
    },
    options: [
      { label: "¡Dale!", hint: "+3 de pase en los partidos (permanente)", apply: (c) => { c.flags.socio = 1; add(c, "energy", -8); return `La dupla con ${c.eventCtx?.name} ya es famosa. +3 de pase en los partidos.`; } },
      { label: "Prefiero descansar", hint: "+ energía", apply: (c) => { add(c, "energy", 10); return "Te vas a casa a ver series."; } },
    ],
  },
  agente: {
    id: "agente", emoji: "🧑‍💼", title: "Tu representante quiere más", weight: (c) => (c.flags.raise === c.season ? 0 : c.seasonStats.pj >= 3 && avgRating(c) >= 6.6 ? 0.6 : 0.1),
    text: () => "Tu representante te dice: \"Estás rindiendo. Vamos a pedir un aumento\".",
    options: [
      { label: "Pedir aumento", hint: "Si el DT te banca, cobrás más; si no, se enoja", apply: (c) => { c.flags.raise = c.season; if (c.contract.salary >= salaryCap(c)) return "El club dice que ya cobrás lo que valés."; if (c.player.coach >= 55) { c.contract.salary = Math.min(salaryCap(c), Math.round(c.contract.salary * 1.2) + 1); return `¡Aceptaron! Nuevo sueldo: €${c.contract.salary}k por semana.`; } add(c, "coach", -10); return "El club se negó y al DT no le gustó nada."; } },
      { label: "\"Esperemos\"", hint: "+ DT", apply: (c) => { add(c, "coach", 4); return "Mostrás compromiso. Tu representante resopla."; } },
    ],
  },
  venta: {
    id: "venta", emoji: "💰", title: "¡Pagaron tu cláusula!", weight: () => 0,
    text: (c) => `${club(c.eventCtx!.clubId!).name} pagó tu cláusula de rescisión y te ofrece €${c.eventCtx!.salary}k por semana. Tu club no puede hacer nada.`,
    options: [
      { label: "Irme al nuevo club", hint: "Cambio de club ya mismo", apply: (c) => { const id = c.eventCtx!.clubId!; signFor(c, { clubId: id, salary: c.eventCtx!.salary!, years: 4, role: club(id).strength > ovr(c) + 14 ? "suplente" : "titular", max: 0, patience: 0, status: "acuerdo" }); return `¡Bienvenido a ${club(id).name}!`; } },
      { label: "Plantarme y quedarme", hint: "− moral · + hinchas", apply: (c) => { add(c, "morale", -8); add(c, "fame", 4); c.contract.clause = Math.round(c.contract.clause * 1.5); return "Le dijiste que no a la plata. La hinchada te hace una bandera."; } },
    ],
  },
  videojuego: {
    id: "videojuego", emoji: "🎮", title: "Tapa de videojuego", weight: (c) => (c.player.fame >= 50 && !c.flags.tapa ? 0.6 : 0),
    text: () => "Un videojuego de fútbol te quiere en la tapa. Te pagan bien... pero hay que ir a sacarse fotos todo un día.",
    options: [
      { label: "Aceptar", hint: "+ plata · + fama · − energía", apply: (c) => { c.flags.tapa = 1; const m = Math.round(c.contract.salary * 10) + 50; c.player.money += m; add(c, "fame", 6); add(c, "energy", -15); return `+€${m}k. Tu cara está en todas las consolas.`; } },
      { label: "No, me concentro", hint: "+ DT", apply: (c) => { add(c, "coach", 5); return "El foco está en la cancha."; } },
    ],
  },
  caridad: {
    id: "caridad", emoji: "❤️", title: "Partido a beneficio", weight: () => 0.5,
    text: () => "Te invitan a un partido a beneficio en el club de barrio donde empezaste.",
    options: [
      { label: "Ir y jugar", hint: "+ moral · + fama · − energía", apply: (c) => { add(c, "morale", 8); add(c, "fame", 4); add(c, "energy", -10); return "Volviste a tu potrero. Los vecinos no lo pueden creer."; } },
      { label: "Mandar una camiseta firmada", hint: "+ fama", apply: (c) => { add(c, "fame", 1); return "La rifaron y juntaron plata para el club."; } },
    ],
  },
  dieta: {
    id: "dieta", emoji: "🍕", title: "El nutricionista ataca", weight: () => 0.5,
    text: () => "El nutricionista del club quiere sacarte la pizza, la pasta y el helado. \"Es por tu bien\".",
    options: [
      { label: "Aceptar la dieta", hint: "+ progreso de Físico · − moral", apply: (c) => { c.player.train.fisico += 0.7; add(c, "morale", -6); return "Pollo hervido y brócoli. Tu cuerpo lo agradece; tu alma no."; } },
      { label: "\"Sin pizza no vivo\"", hint: "+ moral · − DT", apply: (c) => { add(c, "morale", 6); add(c, "coach", -3); return "Una muzzarella para festejar la rebeldía."; } },
    ],
  },
  viral: {
    id: "viral", emoji: "📱", title: "¡Te volviste viral!", weight: () => 0.5,
    text: () => "Subiste un video haciendo jueguitos con una naranja y explotó: 10 millones de vistas.",
    options: [
      { label: "Hacer más videos", hint: "+ fama · − DT", apply: (c) => { add(c, "fame", 8); add(c, "coach", -4); return "Ya sos influencer. El DT te pide que te enfoques."; } },
      { label: "Borrar las redes un tiempo", hint: "+ DT", apply: (c) => { add(c, "coach", 4); return "Modo monje: solo fútbol."; } },
    ],
  },
  clasico: {
    id: "clasico", emoji: "📣", title: "Semana de clásico", weight: (c) => (matchInfo(c)?.derby ? 2.5 : 0.15),
    text: (c) => {
      const d = matchInfo(c)?.derby;
      return d ? `Se viene el ${d}. La hinchada te para en la calle: "¡Prometé un gol en el clásico!"` : "La hinchada te para en la calle: \"¡Prometé un gol para el próximo partido!\"";
    },
    options: [
      { label: "\"¡Les prometo un gol!\"", hint: "Si convertís: +10 fama. Si no: −6", apply: (c) => { c.flags.promesa = 1; return "Los hinchas cantan tu nombre. Ahora hay que cumplir..."; } },
      { label: "\"Vamos a dejar todo\"", hint: "Sin riesgo", apply: (c) => { add(c, "morale", 2); return "Respuesta de capitán."; } },
    ],
  },
  nemesis: {
    id: "nemesis", emoji: "⚔️", title: "Tu némesis habla", weight: (c) => (c.nemesis ? 0.4 : 0),
    text: (c) => `${c.nemesis!.name} en una entrevista: "¿${myName(c)}? Buen jugador... de PlayStation". El video ya tiene millones de vistas.`,
    options: [
      { label: "Responder en la cancha", hint: "Si hacés un gol el próximo partido: +6 fama. Si no: −3", apply: (c) => { c.flags.nemesisPromesa = 1; return "\"Hablo los domingos\". Ahora hay que cumplir."; } },
      { label: "Contestarle en redes", hint: "+ fama · al DT no le gusta", apply: (c) => { add(c, "fame", 4); add(c, "coach", -4); return "Tu respuesta tiene más likes que su video. El DT te pide que te calles."; } },
      { label: "Ignorarlo", hint: "+ moral", apply: (c) => { add(c, "morale", 3); return "Ni lo nombrás. Tu silencio dice todo."; } },
    ],
  },
  comision: {
    id: "comision", emoji: "💼", title: "Tu representante pide más comisión", weight: (c) => ((c.agent ?? "tio") !== "tio" && agentFee(c) < agentOf(c).fee + 0.06 ? 0.35 : 0),
    text: (c) => `${agentOf(c).name} te cita en un bar: "Te estoy consiguiendo cosas grandes. Quiero un ${Math.round((agentFee(c) + 0.03) * 100)}% de comisión".`,
    options: [
      { label: "Aceptar", hint: "+3% de comisión · + fama", apply: (c) => { c.agentFee = Math.round((agentFee(c) + 0.03) * 100) / 100; add(c, "fame", 3); return "Te sacás una foto juntos. Los diarios hablan de tu próximo gran pase."; } },
      { label: "Echarlo", hint: "Volvés con tu tío · − moral", apply: (c) => { const n = agentOf(c).name; c.agent = "tio"; c.agentFee = AGENTS[0].fee; add(c, "morale", -4); addNews(c, "mercado", `${myName(c)} rompe con ${n}. Lo vuelve a representar su tío.`, c.clubId); return `${n} se va dando un portazo. Tu tío Rubén ya te está llamando.`; } },
    ],
  },
  apuesta: {
    id: "apuesta", emoji: "🍝", title: "Apuesta en el vestuario", weight: (c) => (c.player.pos === "DC" ? 0.5 : 0.3),
    text: () => "Un compañero te apuesta una cena: \"No hacés dos goles el próximo partido ni de casualidad\".",
    options: [
      { label: "Aceptar la apuesta", hint: "2+ goles: ganás €20k · si no, pagás €10k", apply: (c) => { c.flags.apuesta = 1; return "Apuesta sellada con un apretón de manos."; } },
      { label: "Pasar", hint: "Nada", apply: () => "\"Miedoso\", te dicen entre risas." },
    ],
  },
  fueraposicion: {
    id: "fueraposicion", emoji: "🔄", title: "Emergencia en el plantel", weight: () => 0.4,
    text: () => "Se lesionó un lateral y el DT te pregunta si podés jugar de defensor el próximo partido.",
    options: [
      { label: "\"Donde me necesite\"", hint: "+ DT · − energía", apply: (c) => { add(c, "coach", 9); add(c, "energy", -6); return "Corriste como un loco. El DT te abrazó."; } },
      { label: "\"Soy atacante\"", hint: "− DT", apply: (c) => { add(c, "coach", -8); return "El DT puso a un juvenil y anotó tu respuesta."; } },
    ],
  },
  ojeador: {
    id: "ojeador", emoji: "🔭", title: "Un ojeador en la tribuna", weight: (c) => (!c.called && ovr(c) >= 58 && !c.flags.scout ? 0.5 : 0),
    text: (c) => `Un ayudante del DT de ${club(c.player.nation).name} vino a verte. Te pide tus estadísticas.`,
    options: [{ label: "Mostrarle todo", hint: "Más chances de convocatoria", apply: (c) => { c.flags.scout = 1; return "Se fue tomando nota. Algo se está moviendo..."; } }],
  },
  abuela: {
    id: "abuela", emoji: "💌", title: "Carta de la abuela", weight: () => 0.3,
    text: () => "Te llega una carta de tu abuela: \"Te veo por la tele. Comé bien y no te olvides de abrigarte\".",
    options: [{ label: "Llamarla por teléfono", hint: "+ moral", apply: (c) => { add(c, "morale", 12); return "Hablaron una hora. Te mandó una tarta."; } }],
  },
  rumorgrande: {
    id: "rumorgrande", emoji: "🗞️", title: "Rumor de pase", weight: (c) => (avgRating(c) >= 6.8 ? 0.5 : 0.1),
    text: () => "Un diario dice que un gigante te quiere. Te preguntan en la conferencia.",
    options: [
      { label: "Desmentir: \"Estoy feliz acá\"", hint: "+ DT · + hinchas", apply: (c) => { add(c, "coach", 6); add(c, "fame", 1); return "La hinchada aplaude. El DT también."; } },
      { label: "\"Nunca se sabe...\"", hint: "+ valor · − DT", apply: (c) => { add(c, "fame", 4); add(c, "coach", -6); return "Tu precio sube. El club no está contento."; } },
    ],
  },
  multa: {
    id: "multa", emoji: "🚓", title: "Multa de tránsito", weight: (c) => (has(c, "auto") ? 0.6 : 0),
    text: () => "Te pararon por ir rápido con tu auto deportivo. Hay fotos en todos lados.",
    options: [
      { label: "Pagar y pedir perdón", hint: "− €30k", apply: (c) => { c.player.money = Math.max(0, c.player.money - 30); return "Pagaste la multa. Lección aprendida."; } },
      { label: "Hacerte el distraído", hint: "− fama · − DT", apply: (c) => { add(c, "fame", -5); add(c, "coach", -5); return "Quedaste como un engreído."; } },
    ],
  },
  vestuario: {
    id: "vestuario", emoji: "🎵", title: "DJ del vestuario", weight: () => 0.4,
    text: () => "Los compañeros te eligen para poner la música antes del partido.",
    options: [
      { label: "Cumbia y cuarteto", hint: "+ moral", apply: (c) => { add(c, "morale", 8); return "El vestuario salió bailando a la cancha."; } },
      { label: "Música de concentración", hint: "+ DT", apply: (c) => { add(c, "coach", 5); return "Silencio y foco. El DT asiente."; } },
    ],
  },
  hinchasrival: {
    id: "hinchasrival", emoji: "😠", title: "Hinchas rivales", weight: (c) => (c.player.fame >= 35 ? 0.4 : 0),
    text: () => "Los hinchas rivales te cantan cosas feas toda la semana en redes.",
    options: [
      { label: "Responder con humor", hint: "+ fama", apply: (c) => { add(c, "fame", 5); return "Tu respuesta fue tan graciosa que hasta ellos se rieron."; } },
      { label: "No darles bola", hint: "+ moral", apply: (c) => { add(c, "morale", 4); return "Lo que importa pasa en la cancha."; } },
    ],
  },
  capitania: {
    id: "capitania", emoji: "©️", title: "La cinta de capitán", weight: (c) => (!c.flags.capitan && c.player.age >= 24 && c.player.coach >= 65 ? 0.5 : 0),
    text: () => "El DT te ofrece la cinta de capitán. Es un honor... y una responsabilidad.",
    options: [
      { label: "Aceptar la cinta", hint: "+ fama · + DT · la moral pesa más", apply: (c) => { c.flags.capitan = 1; add(c, "fame", 6); add(c, "coach", 6); return "Te calzaste la cinta. Ahora sos la voz del vestuario."; } },
      { label: "\"Que la lleve otro\"", hint: "Nada", apply: () => "Preferís hablar con los pies." },
    ],
  },
  jovencito: {
    id: "jovencito", emoji: "🧒", title: "El pibe de la reserva", weight: (c) => (c.player.age >= 27 ? 0.4 : 0),
    text: () => "Un juvenil del club te pide consejos. Dice que sos su ídolo.",
    options: [
      { label: "Tomarlo bajo tu ala", hint: "+ moral · + DT", apply: (c) => { add(c, "morale", 6); add(c, "coach", 5); return "Le enseñaste tu amague. Ya lo hace mejor que vos."; } },
      { label: "\"Estoy ocupado\"", hint: "Nada", apply: () => "El pibe se fue con la cabeza gacha." },
    ],
  },
  tatuaje: {
    id: "tatuaje", emoji: "🖋️", title: "¿Tatuaje nuevo?", weight: () => 0.3,
    text: () => "Te tentaste con un tatuaje gigante del escudo del club en la espalda.",
    options: [
      { label: "Hacérmelo", hint: "+ hinchas · si te vas, te odian", apply: (c) => { c.flags.tatuaje = 1; add(c, "fame", 4); add(c, "morale", 4); return "La hinchada enloquece con la foto."; } },
      { label: "Mejor no", hint: "Nada", apply: () => "Tu piel sigue limpia. Y tu futuro, abierto." },
    ],
  },
  donacion: {
    id: "donacion", emoji: "🏥", title: "Hospital de niños", weight: (c) => (c.player.money >= 100 ? 0.4 : 0),
    text: () => "Un hospital de niños de tu ciudad necesita fondos para una sala nueva.",
    options: [
      { label: "Donar €50k", hint: "− plata · + fama · + moral", apply: (c) => { c.player.money -= 50; add(c, "fame", 6); add(c, "morale", 10); return "La sala va a llevar tu nombre."; } },
      { label: "Visitar a los chicos", hint: "+ moral", apply: (c) => { add(c, "morale", 8); return "Pasaste la tarde firmando yesos y jugando a la play."; } },
    ],
  },
  duelo: {
    id: "duelo", emoji: "🥊", title: "Duelo en redes", weight: (c) => (c.player.fame >= 30 ? 0.4 : 0),
    text: (c) => `Un defensor de ${pick(CLUBS.filter((x) => x.league === myLeague(c) && x.id !== c.clubId)).name} dice que "sos puro humo".`,
    options: [
      { label: "\"Nos vemos en la cancha\"", hint: "+ fama · racha si convertís", apply: (c) => { add(c, "fame", 5); c.flags.promesa = 1; return "Prometiste callarlo con un gol. Hay que cumplir."; } },
      { label: "Ignorar", hint: "+ DT", apply: (c) => { add(c, "coach", 3); return "Los cracks no discuten en redes."; } },
    ],
  },
  documental: {
    id: "documental", emoji: "🎬", title: "Serie documental", weight: (c) => (c.player.fame >= 60 && !c.flags.doc ? 0.5 : 0),
    text: () => "Una plataforma de streaming quiere filmar una serie sobre tu vida.",
    options: [
      { label: "Aceptar", hint: "+ plata · + fama · − energía", apply: (c) => { c.flags.doc = 1; c.player.money += 300; add(c, "fame", 10); add(c, "energy", -10); return "+€300k. Tu infancia en el barrio hace llorar a medio planeta."; } },
      { label: "Rechazar", hint: "+ DT", apply: (c) => { add(c, "coach", 4); return "Preferís que tu historia la cuenten los goles."; } },
    ],
  },
};

function rollEvent(c: Career) {
  const val = marketValue(c);
  if (val >= c.contract.clause * 0.9 && rand() < 0.25) {
    const cand = CLUBS.filter((x) => x.strength >= club(c.clubId).strength + 6 && x.id !== c.clubId);
    if (cand.length) {
      const cl = pick(cand);
      c.eventCtx = { clubId: cl.id, salary: Math.max(Math.round(c.contract.salary * 1.15) + 1, Math.round((val / 380) * (cl.strength / 70))) };
      c.pendingEvent = "venta";
      return;
    }
  }
  const pool = Object.values(EVENTS).map((e) => ({ e, w: e.weight(c) })).filter((x) => x.w > 0);
  const total = pool.reduce((a, x) => a + x.w, 0);
  let r = rand() * total;
  for (const x of pool) {
    r -= x.w;
    if (r <= 0) {
      c.pendingEvent = x.e.id;
      c.eventCtx = null;
      return;
    }
  }
}

export function eventText(c: Career) {
  const ev = EVENTS[c.pendingEvent ?? ""];
  return ev ? ev.text(c) : "";
}

export function resolveEvent(c: Career, optIndex: number) {
  const ev = EVENTS[c.pendingEvent ?? ""];
  c.pendingEvent = null;
  if (!ev) return "";
  if (!c.eventCtx) ev.text(c);
  const msg = ev.options[optIndex].apply(c);
  c.eventCtx = null;
  return msg;
}

// ---------- Mercado ----------

function openWindow(c: Career, kind: "invierno" | "verano") {
  const val = marketValue(c);
  const avg = avgRating(c);
  const o = ovr(c);
  const ag = agentOf(c);
  let n = avg >= 7.2 ? 3 : avg >= 6.4 ? 2 : 1;
  if (c.player.fame >= 50) n++;
  if (ag.skill >= 2) n++;
  if (kind === "invierno" && rand() < 0.3) n--;
  const target = o + 8 + avg * 2 - 12 + (ag.skill >= 3 ? 4 : 0);
  const candidates = CLUBS.filter((cl) => cl.id !== c.clubId)
    .map((cl) => ({ cl, score: -Math.abs(cl.strength - target) + rand() * 16 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
  c.offers = candidates.map(({ cl }) => {
    const role: Role = cl.strength > o + 14 ? "suplente" : "titular";
    const boost = 1 + ag.skill * 0.07;
    const salary = Math.round(Math.min(Math.round(salaryCap(c) * (cl.strength / 78)), Math.max(c.contract.salary + 1, Math.round((val / 380) * (cl.strength / 70)))) * boost);
    return { clubId: cl.id, salary, years: randInt(2, 4), role, max: Math.round(salary * (1.15 + rand() * 0.5)), patience: randInt(1, 3) + (ag.skill >= 2 ? 1 : 0), status: "abierta" as const };
  });
  // Si estás jugando poco, aparecen clubes que te quieren a préstamo
  const benched = (c.flags.banco ?? 0) >= 5 || (c.contract.role === "suplente" && (c.flags.banco ?? 0) >= 2);
  if (benched && !c.loan) {
    const parent = c.clubId;
    const cs = club(parent).strength;
    const free = CLUBS.filter((cl) => cl.id !== parent && !c.offers!.some((x) => x.clubId === cl.id));
    // clubes más chicos que el tuyo (si ya estás en uno de los más chicos, alguno parecido)
    const smaller = free.filter((cl) => cl.strength >= cs - 14 && cl.strength <= cs - 3);
    const loans = (smaller.length >= 2 ? smaller : free.filter((cl) => cl.strength <= cs + 2))
      .map((cl) => ({ cl, score: (cl.league === club(parent).league ? 4 : 0) + rand() * 10 - Math.abs(cl.strength - (cs - 8)) * 0.4 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    for (const { cl } of loans) c.offers.push({ clubId: cl.id, salary: c.contract.salary, years: 1, role: "titular", max: c.contract.salary, patience: 0, status: "acuerdo", loan: true });
  }
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
    return { kind: "acuerdo", msg: pick(["¡Trato hecho! Te esperan para la revisión médica.", "Estrechan la mano: \"¡Bienvenido!\"", "El director deportivo sonríe: hay acuerdo."]) };
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
  upgrade(c);
  const from = club(c.clubId);
  const to = club(offer.clubId);
  const loanFrom = offer.loan ? { parentId: c.loan?.parentId ?? c.clubId, contract: c.loan?.contract ?? { ...c.contract }, until: c.windowKind === "invierno" ? c.season : c.season + 1 } : null;
  const wasLoan = c.loan;
  const changeLeague = from.league !== to.league;
  c.clubId = offer.clubId;
  if (!c.seasonOver) {
    for (const key of ["copa", "cont"] as const) {
      const cup = c.cups[key];
      if (!cup || !cup.alive || cup.champion) continue;
      const cur = cup.stages[cup.stages.length - 1];
      const stillIn = !(key === "copa" && changeLeague) && cur.some((f) => !f.win && (f.home === to.id || f.away === to.id));
      if (!stillIn) finishCupWithoutMe(cup);
    }
    // el calendario que queda es el de tu nueva liga
    c.schedule = [...c.schedule.slice(0, c.slot), ...buildSchedule(c)];
    if (changeLeague) c.seasonStats.leagueGoals = 0;
  }
  c.contract = loanFrom ? { salary: offer.salary, years: 99, role: "titular", clause: 1e9 } : { salary: offer.salary, years: offer.years, role: offer.role, clause: Math.round(marketValue(c) * 2.2) };
  c.loan = loanFrom;
  c.flags.banco = 0;
  c.player.coach = 55;
  c.player.morale = clamp(c.player.morale + 10, 0, 100);
  if (c.flags.tatuaje) {
    add(c, "fame", -6);
    delete c.flags.tatuaje;
    addNews(c, "vida", `Los hinchas de ${from.name} no perdonan: "¡Te tatuaste nuestro escudo!"`, from.id);
  }
  if (c.rival && rand() < 0.7) c.rival = null;
  const fromBond = c.bond![from.id];
  if (!loanFrom && derbyName(from.id, to.id) && fromBond && fromBond.seasons >= 2) {
    if (!c.traitor!.includes(from.id)) c.traitor!.push(from.id);
    c.idols = c.idols!.filter((x) => x !== from.id);
    add(c, "fame", 4);
    add(c, "morale", -6);
    addNews(c, "mercado", `¡TRAICIÓN! ${myName(c)} se pasa al eterno rival: de ${from.name} a ${to.name}. En ${from.city} queman camisetas con su número.`, to.id, true);
  }
  if (loanFrom) addNews(c, "mercado", `${myName(c)} se va a préstamo a ${to.name} hasta fin de temporada${loanFrom.until > c.season ? " que viene" : ""} para sumar minutos.`, to.id, true);
  else if (wasLoan && wasLoan.parentId !== to.id) addNews(c, "mercado", `${club(wasLoan.parentId).name} pierde a ${myName(c)}: firma con ${to.name} y no vuelve de su préstamo.`, to.id, true);
  else if (c.idols!.includes(to.id)) { add(c, "morale", 12); add(c, "fame", 3); addNews(c, "hito", `¡VUELVE EL ÍDOLO! ${myName(c)} regresa a ${to.name}. La hinchada colapsa el aeropuerto.`, to.id, true); }
  else if (offer.clubId === c.firstClubId) addNews(c, "hito", `¡VUELVE A CASA! ${myName(c)} regresa a ${to.name}, el club que lo vio nacer.`, to.id, true);
  else addNews(c, "mercado", `¡BOMBAZO! ${myName(c)} deja ${from.name} y firma con ${to.name}${changeLeague ? ` (${league(to.league).flag} ${league(to.league).name})` : ""} por ${offer.years} temporadas.`, to.id, true);
  closeWindow(c);
  if (!c.seasonOver) advanceSlots(c);
}

export function closeWindow(c: Career) {
  c.offers = null;
  c.windowKind = null;
}

// ---------- Tienda ----------

export function buy(c: Career, id: string): string {
  const it = SHOP.find((x) => x.id === id)!;
  if (has(c, id)) return "Ya lo tenés.";
  if (c.player.money < it.price) return "No te alcanza la plata.";
  c.player.money -= it.price;
  c.player.owned.push(id);
  equip(c, id);
  if (id === "auto") add(c, "fame", 10);
  if (id === "mansion") { add(c, "fame", 15); add(c, "morale", 10); }
  if (id === "barrio") add(c, "fame", 20);
  if (it.kind === "vida") addNews(c, "vida", `${myName(c)} se dio un gusto: ${it.name.toLowerCase()}.`, c.clubId);
  return `¡Compraste ${it.name}!`;
}

export function equip(c: Career, id: string) {
  const it = SHOP.find((x) => x.id === id)!;
  if (it.kind === "botines") c.player.look.boots = it.value as number;
  if (it.kind === "vincha") c.player.look.band = it.value as number;
  if (it.kind === "festejo") c.player.celebration = it.value as string;
}

// ---------- Fin de temporada, premios y gala ----------

export type Award = { id: string; title: string; prop: "balon" | "bota" | "copa"; text: string };
export type SeasonSummary = {
  champion: string;
  champions: Record<string, string>;
  cupWinners: { name: string; icon: string; team: string }[];
  place: number;
  awards: string[];
  gala: Award[];
  growth: string[];
  retire: boolean;
  renewed: boolean;
  ballonWinner: string;
  loanBack: string | null;
  achievements: string[];
  club?: ClubChange;
};

function completeLeagues(c: Career) {
  for (const l of LEAGUES) {
    const ls = c.leagues[l.id];
    while (ls.round < ls.fixtures.length) playRoundOf(c, l.id, ls.round, null, 0);
  }
}

export function endSeason(c: Career): SeasonSummary {
  completeLeagues(c);
  const lg = myLeague(c);
  const table = standings(c, lg);
  const R = c.leagues[lg].fixtures.length;
  const champion = table[0].id;
  const champions = Object.fromEntries(LEAGUES.map((l) => [l.id, standings(c, l.id)[0].id]));
  const place = table.findIndex((r) => r.id === c.clubId) + 1;
  const awards: string[] = [];
  const gala: Award[] = [];
  const me = myName(c);
  const avg = avgRating(c);
  const ss = c.seasonStats;
  if (champion === c.clubId) { awards.push(`🏆 Campeón ${dela(league(lg).name)}`); ss.titles.push(league(lg).name); }

  // copas continentales del resto del mundo (para la gala y las noticias)
  const cupWinners: { name: string; icon: string; team: string }[] = [];
  for (const key of ["copa", "cont", "nac"] as const) {
    const cup = c.cups[key];
    if (cup?.champion) cupWinners.push({ name: cup.name, icon: cup.icon, team: cup.champion });
  }
  for (const comp of CONTINENTAL) {
    if (cupWinners.some((w) => w.name === comp.name)) continue;
    const t = continentalTeams(c, comp);
    if (t.length < 8) continue;
    const cup = newCup("cont", comp.name, comp.icon, t);
    finishCupWithoutMe(cup);
    cupWinners.push({ name: comp.name, icon: comp.icon, team: cup.champion! });
    addNews(c, "mundo", `${comp.icon} ${club(cup.champion!).name} se consagró campeón ${dela(comp.name)}.`, cup.champion!);
  }

  // Goleador de tu liga
  const top = topScorers(c, lg)[0];
  if (top.me && top.goals > 0) { awards.push(`👟 Goleador ${dela(league(lg).name)}`); gala.push({ id: "pichichi", title: `Goleador ${dela(league(lg).name)}`, prop: "bota", text: `${ss.leagueGoals} goles en el torneo.` }); }
  // Bota de Oro: el mejor promedio de gol de todas las ligas
  const myRate = ss.leagueGoals / R;
  const bestRate = Math.max(...LEAGUES.map((l) => {
    const t = topScorers(c, l.id).find((x) => !x.me);
    return t ? t.goals / c.leagues[l.id].fixtures.length : 0;
  }));
  if (ss.leagueGoals >= 14 && myRate > bestRate) { awards.push("👟 Bota de Oro"); gala.push({ id: "bota", title: "Bota de Oro", prop: "bota", text: "El máximo goleador de todas las ligas." }); }
  if (avg >= 7.4 && ss.pj >= R * 0.6) { awards.push(`⭐ Mejor jugador ${dela(league(lg).name)}`); gala.push({ id: "mvp", title: `Mejor jugador ${dela(league(lg).name)}`, prop: "copa", text: `Nota promedio ${avg.toFixed(2)}.` }); }
  if (c.player.age <= 21 && avg >= 7.0 && ss.pj >= R * 0.5) { awards.push("🌱 Golden Boy"); gala.push({ id: "golden", title: "Golden Boy", prop: "copa", text: "El mejor jugador joven del mundo." }); }

  // Balón de Oro: muy difícil
  const titleBonus = ss.titles.reduce((a, t) => a + (/Champions|Mundial/.test(t) ? 16 : /Libertadores|Eurocopa|Copa América/.test(t) ? 11 : LEAGUES.some((l) => l.name === t) ? 8 : 3), 0);
  const score = avg * 10 + ss.goals * 0.8 + ss.assists * 0.4 + titleBonus + c.player.fame * 0.1 - (ss.pj < R * 0.6 ? 30 : 0);
  const bar = 126 + rand() * 12;
  const candidates = topClubs(8).map((x) => x.star);
  let ballonWinner = pick(candidates);
  if (score > bar) {
    ballonWinner = me;
    c.player.ballonDor++;
    awards.push("🥇 Balón de Oro");
    gala.unshift({ id: "balon", title: "Balón de Oro", prop: "balon", text: c.player.ballonDor > 1 ? `¡Tu ${c.player.ballonDor}° Balón de Oro!` : "El mejor jugador del planeta." });
    addNews(c, "hito", `¡${me} GANA EL BALÓN DE ORO! Noche mágica en París.`, c.clubId, true);
  } else addNews(c, "mundo", `${ballonWinner} gana el Balón de Oro.${score > bar - 12 ? ` ${me} quedó entre los finalistas.` : ""}`);

  // tu némesis también tiene su temporada (y puede ganarte el Balón de Oro)
  upgrade(c);
  const nm = c.nemesis!;
  if (ballonWinner !== me && nm.ovr >= 84 && rand() < 0.18 + (nm.ovr - 84) * 0.05) {
    ballonWinner = nm.name;
    nm.ballonDor++;
    addNews(c, "mundo", `⚔️ ${nm.name}, tu némesis, gana el Balón de Oro. En la gala dijo: "Me lo dedico a los que dudaban... vos sabés quién sos".`, nm.clubId, true);
  } else if (ballonWinner === me && nm.ovr >= 82) addNews(c, "mundo", `${nm.name} quedó lejos en el Balón de Oro y no fue a la gala. "Tenía otro compromiso", dicen.`, nm.clubId);
  const bond = (c.bond![c.clubId] ??= { seasons: 0, goals: 0, pj: 0 });
  bond.seasons++;
  checkIdol(c);

  c.trophies.push(...awards.map((a) => `${a} · T${c.season}`));
  c.history.push({ season: c.season, age: c.player.age, clubId: c.clubId, pj: ss.pj, goals: ss.goals, assists: ss.assists, avg: Math.round(avg * 10) / 10, place, awards });
  for (const l of LEAGUES) if (l.id !== lg) addNews(c, "mundo", `${l.flag} ${club(champions[l.id]).name} se consagró campeón ${dela(l.name)}.`, champions[l.id]);
  c.lastStandings = Object.fromEntries(LEAGUES.map((l) => [l.id, standings(c, l.id).map((r) => r.id)]));
  const clubChange = evolveClubs(c, cupWinners, avg);
  c.history[c.history.length - 1].str = clubChange.after;

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
  if (c.rival) {
    if (rand() < 0.5) {
      addNews(c, "mercado", `${c.rival.name} se va del club: el puesto es todo tuyo.`, c.clubId);
      c.rival = null;
    } else c.rival.ovr += randInt(0, 3);
  }

  nemesisSeason(c);
  let loanBack: string | null = null;
  if (c.loan && c.loan.until <= c.season) {
    const lc = club(c.clubId);
    c.clubId = c.loan.parentId;
    c.contract = c.loan.contract;
    c.loan = null;
    c.player.coach = clamp(c.player.coach + (avg >= 6.8 ? 10 : 0), 0, 100);
    loanBack = club(c.clubId).name;
    addNews(c, "mercado", `Termina el préstamo: ${myName(c)} deja ${lc.name} y vuelve a ${loanBack}${avg >= 6.8 ? " con cartel de titular" : ""}.`, c.clubId, true);
  }
  const newAch: string[] = [];
  checkAchievements(c, newAch);

  const retireAge = 33 + Math.floor(p.stats.fisico / 30);
  const retire = p.age >= retireAge;
  let renewed = false;
  if (!retire) {
    c.contract.years--;
    if (c.contract.years <= 0) {
      c.contract.years = 2;
      c.contract.salary = Math.max(c.contract.salary, Math.min(salaryCap(c), Math.round(c.contract.salary * 1.15) + 1));
      c.contract.clause = Math.round(marketValue(c) * 2.2);
      renewed = true;
    }
  }
  return { champion, champions, cupWinners, place, awards, gala, growth, retire, renewed, ballonWinner, loanBack, achievements: newAch, club: clubChange };
}

// ---------- Evolución de los clubes ----------
/** Los N clubes más fuertes ahora mismo (la fuerza cambia temporada a temporada). */
const topClubs = (n: number) => [...CLUBS].sort((a, b) => b.strength - a.strength).slice(0, n);
const POWER_MIN = 48;
const POWER_MAX = 95;
const money = (str: number) => Math.max(1, Math.round(((str - 55) / 40) ** 2 * 90 + rand() * 10));

/** Al final de la temporada cada club sube o baja según su puesto, sus copas y (el tuyo) según vos. */
function evolveClubs(c: Career, cupWinners: { name: string; icon: string; team: string }[], avg: number): ClubChange {
  const power = (c.power ??= {});
  const before: Record<string, number> = Object.fromEntries(CLUBS.map((x) => [x.id, x.strength]));
  const delta: Record<string, number> = {};
  const add = (id: string, d: number) => { delta[id] = (delta[id] ?? 0) + d; };
  for (const l of LEAGUES) {
    const t = standings(c, l.id);
    const n = t.length;
    const expected = [...t].sort((a, b) => before[b.id] - before[a.id]).map((r) => r.id);
    t.forEach((r, i) => {
      // rendir mejor (o peor) que lo esperado por plantel es lo que hace crecer (o caer)
      add(r.id, ((expected.indexOf(r.id) - i) / n) * 5);
      if (i === 0) add(r.id, 1);
      else if (i >= n - 3) add(r.id, -0.8);
    });
  }
  for (const w of cupWinners) {
    if (club(w.team).league === "nac") continue;
    add(w.team, /Champions League|Libertadores/.test(w.name) ? 2 : CONTINENTAL.some((x) => x.name === w.name) ? 1.2 : 0.6);
  }
  // vos movés la aguja: si sos la figura, el club crece (y atrae fichajes)
  const ss = c.seasonStats;
  if (ss.pj >= 8) add(c.clubId, clamp((avg - 6.6) * 1.2, -1, 1) + Math.min(0.6, ss.goals / 40));
  for (const x of CLUBS) {
    const base = BASE_STRENGTH[x.id];
    const mine = x.id === c.clubId;
    let d = (delta[x.id] ?? 0) + (rand() - 0.5) * 1.4;
    d += (base - x.strength) * (mine ? 0.1 : 0.15); // sin dinero infinito: todos tienden a volver a su lugar
    const over = Math.max(0, x.strength - base);
    if (d > 0) d /= 1 + over / (mine ? 4 : 3); // cuanto más arriba de su nivel histórico, más cuesta seguir creciendo
    if (d > 0 && x.strength >= 84) d *= Math.max(0.15, (POWER_MAX - x.strength) / 11); // arriba de todo cuesta mucho más
    d = clamp(d, mine ? -3 : -2.5, 3);
    power[x.id] = clamp(Math.round(x.strength + d), POWER_MIN, POWER_MAX);
  }
  applyPower(power);

  // noticias: fichajes de los que más crecieron y ventas de los que más cayeron
  const lgOf = (id: string) => league(club(id).league);
  const others = CLUBS.filter((x) => x.id !== c.clubId);
  const risers = others.filter((x) => x.strength - before[x.id] >= 2).sort((a, b) => b.strength - before[b.id] - (a.strength - before[a.id])).slice(0, 3);
  for (const x of risers) {
    const from = pick(CLUBS.filter((y) => y.id !== x.id && y.league !== "nac" && Math.abs(y.strength - x.strength) <= 10));
    const name = randomName(lgOf(x.id).region);
    addSigning(c, x.id, name, from.id, x.strength + randInt(0, 4));
    addNews(c, "mercado", `💸 ${x.name} invierte fuerte: llega ${name} desde ${from.name} por €${money(x.strength)}M.`, x.id);
  }
  const fallers = others.filter((x) => before[x.id] - x.strength >= 2).slice(0, 2);
  for (const x of fallers) {
    const best = squadOf(c, x.id).filter((p) => !p.tag).sort((p, q) => q.ovr - p.ovr)[0];
    if (best) ((c.sold ??= {})[x.id] ??= []).push(best.name);
    addNews(c, "mercado", `📉 Crisis en ${x.name}: venden a ${best?.name ?? "su figura"} y el plantel se debilita.`, x.id);
  }

  // tu club
  const me = club(c.clubId);
  const b = before[me.id];
  const signings: string[] = [];
  const sales: string[] = [];
  const reg = lgOf(me.id).region;
  const diff = me.strength - b;
  for (let i = 0; i < Math.max(0, diff); i++) {
    const from = pick(CLUBS.filter((y) => y.id !== me.id && y.strength >= Math.min(me.strength - 8, 85)));
    const name = randomName(reg);
    const sg = addSigning(c, me.id, name, from.id, me.strength + randInt(1, 5));
    signings.push(`${name} · ${sg.pos} ${sg.ovr} (desde ${from.name}, €${money(me.strength)}M)`);
    addNews(c, "mercado", `✍️ ¡Bombazo! ${me.name} ficha a ${name}, que llega desde ${from.name} para jugar con ${myName(c)}.`, me.id, i === 0);
  }
  for (let i = 0; i < Math.max(0, -diff); i++) {
    const richer = CLUBS.filter((y) => y.id !== me.id && y.strength > me.strength);
    const to = pick(richer.length ? richer : CLUBS.filter((y) => y.id !== me.id && y.strength >= me.strength - 6));
    const sellable = squadOf(c, me.id).filter((x) => !x.tag || x.tag === "fichaje").sort((p, q) => q.ovr - p.ovr).slice(0, 8);
    const name = sellable.length ? pick(sellable).name : randomName(reg);
    ((c.sold ??= {})[me.id] ??= []).push(name);
    sales.push(`${name} (a ${to.name})`);
    addNews(c, "mercado", `👋 ${me.name} vende a ${name} a ${to.name}. El plantel pierde nivel.`, me.id);
  }
  if (diff === 0) addNews(c, "mercado", `${me.name} mantiene la base del plantel para la próxima temporada.`, me.id);
  return { id: me.id, before: b, after: me.strength, signings, sales };
}

export function startNextSeason(c: Career) {
  c.season++;
  c.leagues = freshLeagues();
  c.called = false;
  c.slot = 0;
  c.seasonStats = { pj: 0, goals: 0, assists: 0, ratings: [], leagueGoals: 0, titles: [] };
  c.seasonOver = false;
  setupSeasonCups(c);
  c.schedule = buildSchedule(c);
  c.seasonLen = c.schedule.length;
  assignChallenges(c);
  const cont = c.cups.cont;
  addNews(c, "liga", `Arranca la temporada ${c.season}. ${myName(c)} (${c.player.age} años) quiere más.${cont ? ` ¡${club(c.clubId).name} juega la ${cont.name}!` : ""}`, c.clubId, true);
}

export function openSummerWindow(c: Career) {
  openWindow(c, "verano");
}

export function retire(c: Career) {
  c.retired = true;
  const best = [...c.history].sort((a, b) => b.goals - a.goals)[0];
  const cl = club(c.clubId);
  addNews(c, "hito", `Partido homenaje para ${myName(c)} en el ${club(c.firstClubId).stadium}. Lleno total y lágrimas.`, c.firstClubId, true);
  addToHall({
    name: c.player.name, nick: c.player.nick, pos: c.player.pos, seasons: c.history.length, goals: c.totals.goals, assists: c.totals.assists, trophies: c.trophies.length,
    best: best ? `T${best.season}: ${best.goals} goles en ${club(best.clubId).short}` : "—", look: c.player.look, c1: cl.c1, c2: cl.c2, ballonDor: c.player.ballonDor,
  });
}

/** Clubes chicos de una liga para arrancar. */
export const startingClubs = (leagueId: string) => [...clubsOf(leagueId)].sort((a, b) => a.strength - b.strength).slice(0, 4);

/** Para "Simular varios": ¿hay algo que frene la simulación? */
export const needsStop = (c: Career) => !!(c.pendingEvent || c.offers || c.seasonOver || c.retired || c.player.points > 0);

// =====================================================================
// v3.1: préstamos, némesis, ídolo/traición, charla previa, jugadas especiales, desafíos y logros
// =====================================================================

/** Completa los campos nuevos en partidas creadas con versiones anteriores. */
export function upgrade(c: Career): Career {
  c.bond ??= {};
  c.idols ??= [];
  c.traitor ??= [];
  c.counters ??= {};
  const fresh = !c.achievements;
  c.achievements ??= [];
  if (fresh) checkAchievements(c, [], false); // partidas viejas: lo que ya lograste, sin premio
  if (c.loan === undefined) c.loan = null;
  if (!c.nemesis) c.nemesis = makeNemesis(c);
  if (!c.challenges) assignChallenges(c);
  c.power ??= { ...BASE_STRENGTH };
  return c;
}

const cnt = (c: Career, k: string) => c.counters?.[k] ?? 0;
const inc = (c: Career, k: string, v = 1) => { c.counters![k] = cnt(c, k) + v; };

// ---------- Jugadas especiales ----------
export type MoveId = "cano" | "taco" | "elastica" | "rabona" | "chilena";
export const MOVES: { id: MoveId; emoji: string; name: string; level: number; how: string; howTouch: string }[] = [
  { id: "cano", emoji: "🦵", name: "Caño", level: 3, how: "Amague (Q) con un defensor justo enfrente: la pelota le pasa entre las piernas.", howTouch: "AMAGUE con un defensor justo enfrente." },
  { id: "taco", emoji: "👠", name: "Pase de taco", level: 8, how: "Pase (E) a un compañero que está detrás tuyo.", howTouch: "PASE a un compañero que está detrás tuyo." },
  { id: "elastica", emoji: "🪢", name: "Elástica", level: 15, how: "Amague (Q) mientras corrés (Shift): engaña mucho más.", howTouch: "AMAGUE mientras mantenés CORRER." },
  { id: "rabona", emoji: "🎻", name: "Rabona", level: 22, how: "Shift + E: pase o centro de rabona, mucho más preciso.", howTouch: "CORRER + PASE: pase de rabona, más preciso." },
  { id: "chilena", emoji: "🤸", name: "Chilena", level: 30, how: "Shift + Espacio con la pelota en el aire, cerca tuyo.", howTouch: "CORRER + PATEAR con la pelota en el aire." },
];
export const unlockedMoves = (c: Career) => MOVES.filter((m) => c.player.level >= m.level).map((m) => m.id);

// ---------- Némesis ----------
const NEMESIS_NAMES = ["Dante Vercelli", "Lucas Fenómeno", "Matteo Rayo", "Kylian Brioso", "Santi Cohete", "Viktor Kraft", "Thiago Ventura", "Jonas Blitz", "Renzo Malaspina", "Ezequiel Trueno", "Oliver Strike", "Pietro Saetta"];

function makeNemesis(c: Career): Nemesis {
  const mine = club(c.clubId);
  const pool = CLUBS.filter((x) => x.league !== mine.league && Math.abs(x.strength - mine.strength) <= 6);
  const cl = pool.length ? pick(pool) : pick(CLUBS.filter((x) => x.id !== c.clubId));
  const nats = NATIONS.filter((n) => n.id !== c.player.nation && n.strength >= 72);
  const r = (n: number) => Math.floor(rand() * n);
  return {
    name: pick(NEMESIS_NAMES), clubId: cl.id, nation: (nats.length ? pick(nats) : pick(NATIONS)).id, ovr: ovr(c) + randInt(0, 3), goals: Math.round(c.totals.goals * (0.8 + rand() * 0.4)), seasonGoals: 0, ballonDor: 0,
    look: { skin: r(6), hair: r(7), hairColor: r(5), beard: rand() < 0.4 ? 1 + r(3) : 0, eyes: r(2), boots: r(7) }, num: pick([7, 9, 10, 11]), w: 0, d: 0, l: 0,
  };
}

function nemesisSeason(c: Career) {
  const nm = c.nemesis!;
  nm.seasonGoals = Math.max(0, Math.round((nm.ovr - 55) * 0.75 * (0.6 + rand() * 0.8)));
  nm.goals += nm.seasonGoals;
  const mineG = c.history[c.history.length - 1]?.goals ?? 0;
  addNews(c, "mundo", `⚔️ ${nm.name} cerró la temporada con ${nm.seasonGoals} goles (vos hiciste ${mineG}).${nm.seasonGoals > mineG ? " Ya subió la tabla a sus redes." : " Esta vez no dijo nada."}`, nm.clubId);
  const age = c.player.age;
  nm.ovr = clamp(nm.ovr + (age <= 21 ? randInt(2, 5) : age <= 25 ? randInt(1, 3) : age <= 29 ? randInt(-1, 1) : -randInt(1, 3)), 50, 95);
  if (rand() < 0.3) {
    const to = CLUBS.filter((x) => x.id !== c.clubId && x.id !== nm.clubId && x.strength >= nm.ovr - 3 && x.strength <= nm.ovr + 5);
    if (to.length) {
      const t = pick(to);
      nm.clubId = t.id;
      addNews(c, "mercado", `${nm.name} firma con ${t.name}.${t.league === club(c.clubId).league ? " ¡Ahora juega en tu liga!" : ""}`, t.id, t.league === club(c.clubId).league);
    }
  }
}

// ---------- Ídolo ----------
function checkIdol(c: Career): boolean {
  const b = c.bond![c.clubId];
  if (!b || c.idols!.includes(c.clubId) || c.traitor!.includes(c.clubId)) return false;
  if (b.seasons >= 3 && (b.goals >= 35 || b.pj >= 90)) {
    c.idols!.push(c.clubId);
    add(c, "fame", 5);
    addNews(c, "hito", `🎶 ${myName(c)} ya es ídolo de ${club(c.clubId).name}: la tribuna estrena una bandera gigante con su número ${c.player.number}.`, c.clubId, true);
    return true;
  }
  return false;
}

/** Qué siente la tribuna por vos en el partido que viene. */
export function crowdContext(c: Career, m: MatchInfo) {
  const isNat = m.slot.kind === "cup" && m.slot.cup === "nac";
  return {
    idol: !isNat && (c.idols ?? []).includes(m.myId),
    vsTraitor: !isNat && (c.traitor ?? []).includes(m.rival.id),
    vsExIdol: !isNat && (c.idols ?? []).includes(m.rival.id),
  };
}

// ---------- Después de cada partido jugado ----------
function afterPlayed(c: Career, o: MatchOutcome, m: MatchInfo, role: Role, mine: number, theirs: number, isNat: boolean, notes: string[]) {
  const p = c.player;
  inc(c, "goals", o.goals);
  inc(c, "assists", o.assists);
  for (const k of o.kinds ?? []) inc(c, k);
  for (const k of o.moves ?? []) inc(c, k);
  if ((o.rating ?? 0) >= 8) inc(c, "nota8");
  if (o.goals >= 3) inc(c, "hat");
  if (m.derby && mine > theirs) inc(c, "derbies");

  if (!isNat) {
    c.flags.banco = role === "suplente" ? (c.flags.banco ?? 0) + 1 : Math.max(0, (c.flags.banco ?? 0) - 1);
    const b = (c.bond![c.clubId] ??= { seasons: 0, goals: 0, pj: 0 });
    b.pj++;
    b.goals += o.goals;
    if (checkIdol(c)) notes.push(`🎶 ¡Sos ídolo de ${club(c.clubId).name}! La hinchada canta tu nombre`);
  }

  const cc = crowdContext(c, m);
  if (cc.vsTraitor) {
    if (mine > theirs) { add(c, "fame", 2); notes.push("😡 Te silbaron los 90 minutos... y les ganaste igual"); }
    else notes.push("😡 Tus ex hinchas te silbaron todo el partido");
  } else if (cc.vsExIdol && m.isHome === false) notes.push("👏 Tus ex hinchas te aplaudieron de pie al salir");

  if (m.nemesis) {
    const nm = c.nemesis!;
    if (mine > theirs) { nm.w++; inc(c, "nemesis"); add(c, "fame", 2); notes.push(`⚔️ Le ganaste el duelo a ${nm.name} (${nm.w}-${nm.d}-${nm.l} en la historia)`); }
    else if (mine < theirs) { nm.l++; notes.push(`⚔️ Ganó ${nm.name}. Se va a burlar en las redes (${nm.w}-${nm.d}-${nm.l})`); }
    else { nm.d++; notes.push(`⚔️ Empate con ${nm.name} (${nm.w}-${nm.d}-${nm.l})`); }
    if (rand() < 0.35) addNews(c, "partido", `${nm.name} también marcó en el duelo ante ${myName(c)} y le dedicó el gol con una sonrisa.`, nm.clubId);
  }
  if (c.flags.nemesisPromesa) {
    delete c.flags.nemesisPromesa;
    if (o.goals > 0) { add(c, "fame", 6); notes.push(`⚔️ Le respondiste a ${c.nemesis!.name} en la cancha (+6 fama)`); }
    else { add(c, "fame", -3); notes.push(`⚔️ Prometiste responderle a ${c.nemesis!.name} en la cancha... y no pasó nada (−3 fama)`); }
  }

  if (o.pep === "arengar") { add(c, "coach", 2); notes.push("📣 Tu arenga en el vestuario le gustó al DT"); }
  if (o.pep === "provocar") {
    if (o.goals > 0) { add(c, "fame", 4); add(c, "morale", 3); notes.push("😏 Provocaste al rival y lo bancaste con goles (+fama)"); }
    else if (mine < theirs) { add(c, "fame", -3); add(c, "morale", -4); notes.push("😬 Provocaste al rival y perdiste. Los memes no perdonan"); }
  }

  for (const ch of c.challenges ?? []) {
    if (ch.done || cnt(c, ch.key) - ch.start < ch.target) continue;
    ch.done = true;
    const money = Math.max(20, c.contract.salary * 6);
    p.money += money;
    p.points += 2;
    notes.push(`🎯 ¡Desafío cumplido: ${ch.text}! +€${money}k y +2 puntos`);
  }
}

export const challengeProgress = (c: Career, ch: Challenge) => Math.min(ch.target, cnt(c, ch.key) - ch.start);

// ---------- Desafíos de la temporada ----------
const CHALLENGE_POOL: { id: string; key: string; text: (n: number) => string; n: (c: Career) => number; need?: (c: Career) => boolean }[] = [
  { id: "goles", key: "goals", text: (n) => `Hacé ${n} goles`, n: (c) => Math.max(3, Math.round(c.seasonLen * ({ DC: 0.45, EXT: 0.3, ENG: 0.2 } as Record<string, number>)[c.player.pos])) },
  { id: "asist", key: "assists", text: (n) => `Dá ${n} asistencias`, n: (c) => Math.max(2, Math.round(c.seasonLen * ({ DC: 0.12, EXT: 0.25, ENG: 0.3 } as Record<string, number>)[c.player.pos])) },
  { id: "libre", key: "libre", text: () => "Meté un gol de tiro libre", n: () => 1 },
  { id: "vaselina", key: "vaselina", text: () => "Hacé un gol de vaselina", n: () => 1 },
  { id: "comba", key: "comba", text: (n) => `Hacé ${n} goles con comba`, n: () => 2 },
  { id: "cabeza", key: "cabeza", text: (n) => `Hacé ${n} goles de cabeza`, n: () => 2, need: (c) => c.player.pos === "DC" },
  { id: "clasico", key: "derbies", text: () => "Ganá un clásico", n: () => 1, need: (c) => CLUBS.some((x) => !!derbyName(c.clubId, x.id)) },
  { id: "nota8", key: "nota8", text: (n) => `Terminá ${n} partidos con nota 8 o más`, n: () => 3 },
  { id: "cano", key: "cano", text: (n) => `Tirá ${n} caños`, n: () => 3, need: (c) => c.player.level >= 3 },
  { id: "nemesis", key: "nemesis", text: () => "Ganale un partido a tu némesis", n: () => 1, need: (c) => !!c.nemesis && club(c.nemesis.clubId).league === club(c.clubId).league },
];

function assignChallenges(c: Career) {
  c.counters ??= {};
  const pool = shuffle(CHALLENGE_POOL.filter((x) => !x.need || x.need(c)));
  c.challenges = pool.slice(0, 3).map((x) => {
    const n = x.n(c);
    return { id: x.id, text: x.text(n), key: x.key, target: n, start: cnt(c, x.key), done: false };
  });
}

// ---------- Logros ----------
export const ACHIEVEMENTS: { id: string; emoji: string; name: string; desc: string; test: (c: Career) => boolean }[] = [
  { id: "gol1", emoji: "🎯", name: "Primer grito", desc: "Tu primer gol como profesional", test: (c) => c.totals.goals >= 1 },
  { id: "hat", emoji: "🎩", name: "Hat-trick", desc: "Tres goles en un partido", test: (c) => cnt(c, "hat") >= 1 },
  { id: "g100", emoji: "💯", name: "Centenario", desc: "100 goles en tu carrera", test: (c) => c.totals.goals >= 100 },
  { id: "g250", emoji: "👑", name: "Leyenda del gol", desc: "250 goles en tu carrera", test: (c) => c.totals.goals >= 250 },
  { id: "libre5", emoji: "🧱", name: "Especialista", desc: "5 goles de tiro libre", test: (c) => cnt(c, "libre") >= 5 },
  { id: "vaselina", emoji: "🪶", name: "Por arriba", desc: "Un gol de vaselina", test: (c) => cnt(c, "vaselina") >= 1 },
  { id: "comba5", emoji: "🌀", name: "Al ángulo", desc: "5 goles con comba", test: (c) => cnt(c, "comba") >= 5 },
  { id: "cabeza10", emoji: "🧠", name: "Cabeceador", desc: "10 goles de cabeza", test: (c) => cnt(c, "cabeza") >= 10 },
  { id: "chilena", emoji: "🤸", name: "De película", desc: "Un gol de chilena", test: (c) => cnt(c, "chilena") >= 1 },
  { id: "cano10", emoji: "🦵", name: "Caño tras caño", desc: "10 caños", test: (c) => cnt(c, "cano") >= 10 },
  { id: "decisivo", emoji: "🧊", name: "Sangre fría", desc: "Meter el penal decisivo de una tanda", test: (c) => cnt(c, "decisivo") >= 1 },
  { id: "clasico", emoji: "🔥", name: "Dueño del clásico", desc: "Ganar un clásico", test: (c) => cnt(c, "derbies") >= 1 },
  { id: "clasico10", emoji: "🌋", name: "Rey de los clásicos", desc: "Ganar 10 clásicos", test: (c) => cnt(c, "derbies") >= 10 },
  { id: "nemesis5", emoji: "⚔️", name: "Duelo ganado", desc: "Ganarle 5 veces a tu némesis", test: (c) => cnt(c, "nemesis") >= 5 },
  { id: "nota8", emoji: "📈", name: "Figura", desc: "10 partidos con nota 8 o más", test: (c) => cnt(c, "nota8") >= 10 },
  { id: "idolo", emoji: "🎶", name: "Ídolo", desc: "Ser ídolo de un club", test: (c) => (c.idols ?? []).length >= 1 },
  { id: "fiel", emoji: "🏟️", name: "Un solo amor", desc: "10 temporadas en el mismo club", test: (c) => Object.values(c.bond ?? {}).some((b) => b.seasons >= 10) },
  { id: "mundo", emoji: "🌍", name: "Trotamundos", desc: "Jugar en 3 ligas distintas", test: (c) => new Set([...c.history.map((h) => club(h.clubId).league), club(c.clubId).league]).size >= 3 },
  { id: "champions", emoji: "⭐", name: "Noche europea", desc: "Ganar la Champions League", test: (c) => c.trophies.some((t) => t.includes("Champions League")) },
  { id: "balon", emoji: "🥇", name: "El mejor del mundo", desc: "Ganar el Balón de Oro", test: (c) => c.player.ballonDor >= 1 },
];

function checkAchievements(c: Career, notes: string[], reward = true) {
  for (const a of ACHIEVEMENTS) {
    if (c.achievements!.includes(a.id) || !a.test(c)) continue;
    c.achievements!.push(a.id);
    if (!reward) continue;
    c.player.points += 2;
    notes.push(`🏅 Logro desbloqueado: ${a.emoji} ${a.name} (+2 puntos)`);
  }
}

// ---------- Entrenamiento especial (minijuego) ----------
export const drillDone = (c: Career) => c.drillSlot === c.slot;
export function drillReward(c: Career, score: number): string {
  if (drillDone(c)) return "Ya hiciste el entrenamiento especial esta semana.";
  c.drillSlot = c.slot;
  const p = c.player;
  const k: StatKey = p.focus === "descanso" ? pick(STAT_KEYS) : p.focus;
  const gain = Math.min(1.2, score * 0.08);
  p.train[k] = (p.train[k] ?? 0) + gain;
  let ups = 0;
  while (p.train[k] >= 1 && p.stats[k] < 99) { p.train[k] -= 1; p.stats[k]++; ups++; }
  p.xp += score * 8;
  while (p.xp >= xpNeeded(p.level)) { p.xp -= xpNeeded(p.level); p.level++; p.points += 4; }
  p.energy = clamp(p.energy - 4, 5, 100);
  if (!score) return "Hoy no salió nada. El preparador te mira serio: \"Mañana de nuevo\".";
  return `${score} puntos: +${Math.round(gain * 100)}% de ${STAT_INFO[k].name}${ups ? ` y ¡subiste ${STAT_INFO[k].name} a ${p.stats[k]}!` : ""} · +${score * 8} XP`;
}

// ---------- Planteles ----------
export type SquadPos = "ARQ" | "DEF" | "MED" | "DEL";
export type SquadPlayer = { name: string; pos: SquadPos; num: number; age: number; ovr: number; tag?: "vos" | "estrella" | "fichaje" | "rival" | "nemesis"; note?: string; starter?: boolean; value: number; pj: number; goals: number; assists: number };
export const SQUAD_POS: Record<SquadPos, { name: string; color: string }> = {
  ARQ: { name: "Arquero", color: "#f59e0b" },
  DEF: { name: "Defensor", color: "#3b82f6" },
  MED: { name: "Mediocampista", color: "#10b981" },
  DEL: { name: "Delantero", color: "#ef4444" },
};
// 1-4-3-3 titular + suplentes
const TEMPLATE: SquadPos[] = ["ARQ", "DEF", "DEF", "DEF", "DEF", "MED", "MED", "MED", "DEL", "DEL", "DEL", "ARQ", "DEF", "DEF", "DEF", "MED", "MED", "MED", "DEL", "DEL", "ARQ", "DEF", "MED"];
const FORMATION: Record<SquadPos, number> = { ARQ: 1, DEF: 4, MED: 3, DEL: 3 };
const MY_POS: Record<Pos, SquadPos> = { DC: "DEL", EXT: "DEL", ENG: "MED" };
const ageCurve = (a: number) => (a <= 19 ? -5 : a <= 22 ? -2 : a <= 29 ? 0 : a <= 32 ? -1 : -4);

function addSigning(c: Career, clubId: string, name: string, from: string, ovrV: number): Signing {
  const sg: Signing = { name, pos: pick(["DEF", "MED", "MED", "DEL", "DEL"] as SquadPos[]), ovr: clamp(ovrV, 40, 96), age: randInt(21, 29), from, season: c.season };
  const list = ((c.signings ??= {})[clubId] ??= []);
  list.push(sg);
  if (list.length > 8) list.shift();
  return sg;
}

/** Plantel del club: se genera siempre igual para cada club, pero los jugadores envejecen, se renuevan y
 *  su nivel sigue a la fuerza actual del club. Suma fichajes, ventas, a vos, tu rival y tu némesis. */
export function squadOf(c: Career, clubId: string): SquadPlayer[] {
  const cl = club(clubId);
  const region = league(cl.league)?.region ?? "eu";
  const str = cl.strength;
  const sold = new Set(c.sold?.[clubId] ?? []);
  const out: Omit<SquadPlayer, "value" | "pj" | "goals" | "assists">[] = [];
  const used = new Set<number>();
  const takeNum = (want: number) => {
    let n = want;
    while (used.has(n)) n = n >= 40 ? 1 : n + 1;
    used.add(n);
    return n;
  };
  if (clubId === c.clubId) used.add(c.player.number);
  const names = new Set<string>([cl.star]);

  TEMPLATE.forEach((pos, i) => {
    const r = seeded(`${clubId}:${i}`);
    const span = 5 + Math.floor(r() * 7); // cuántas temporadas se queda cada jugador en ese lugar
    const phase = Math.floor(r() * span);
    const gen = Math.floor((c.season + phase) / span);
    const g = seeded(`${clubId}:${i}:${gen}`);
    const startAge = 18 + Math.floor(g() * 9);
    const age = startAge + ((c.season + phase) % span);
    const star = i === 9;
    let name = star ? cl.star : randomName(region, g);
    for (let k = 0; !star && k < 8 && (names.has(name) || name === cl.star); k++) name = randomName(region, g);
    if (!star && names.has(name)) name += " Jr.";
    names.add(name);
    if (sold.has(name)) return;
    const slotOff = star ? 5 : i < 11 ? 2 - Math.floor(g() * 6) : -4 - Math.floor(g() * 8);
    const ovrV = clamp(Math.round(str + slotOff + ageCurve(age) + (g() - 0.5) * 4), 38, 97);
    const want = pos === "ARQ" ? (i === 0 ? 1 : i === 11 ? 12 : 25) : star ? 9 : 2 + Math.floor(g() * 30);
    out.push({ name, pos, age: star ? 27 : age, ovr: ovrV, num: takeNum(want), tag: star ? "estrella" : undefined });
  });

  for (const sg of c.signings?.[clubId] ?? []) {
    if (sold.has(sg.name)) continue;
    const age = sg.age + (c.season - sg.season);
    if (age > 34) continue;
    out.push({ name: sg.name, pos: sg.pos, age, ovr: sg.ovr, num: takeNum(2 + (sg.name.length * 7) % 30), tag: "fichaje", note: `Llegó en T${sg.season} desde ${club(sg.from).short}` });
  }
  if (clubId === c.clubId) {
    out.push({ name: myName(c), pos: MY_POS[c.player.pos], age: c.player.age, ovr: ovr(c), num: c.player.number, tag: "vos", note: matchRole(c).why });
    if (c.rival) out.push({ name: c.rival.name, pos: MY_POS[c.player.pos], age: 20 + (c.rival.name.length % 10), ovr: c.rival.ovr, num: takeNum(c.rival.name.length + 7), tag: "rival", note: "Te pelea el puesto" });
  }
  const nm = c.nemesis;
  if (nm && nm.clubId === clubId) out.push({ name: nm.name, pos: "DEL", age: c.player.age + 1, ovr: nm.ovr, num: takeNum(nm.num), tag: "nemesis", note: "Tu némesis" });

  // titulares: los mejores de cada línea según el 1-4-3-3 (vos siempre si tu DT te pone)
  const byPos = (p: SquadPos) => out.filter((x) => x.pos === p).sort((a, b) => b.ovr - a.ovr);
  const iStart = clubId === c.clubId && matchRole(c).role === "titular";
  for (const p of Object.keys(FORMATION) as SquadPos[]) {
    const line = byPos(p);
    const meIn = line.find((x) => x.tag === "vos");
    const picks = line.filter((x) => x.tag !== "vos").slice(0, FORMATION[p] - (meIn && iStart ? 1 : 0));
    for (const x of picks) x.starter = true;
    if (meIn && iStart) meIn.starter = true;
  }
  const order: SquadPos[] = ["ARQ", "DEF", "MED", "DEL"];
  const full = withSeasonStats(c, clubId, out);
  return full.sort((a, b) => Number(!!b.starter) - Number(!!a.starter) || order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr);
}

/** Valor de mercado (en miles de €) con la misma fórmula que el tuyo. */
export const playerValue = (o: number, age: number, star = false) =>
  Math.round(250 * Math.pow(1.17, o - 50) * (age <= 21 ? 1.25 : age <= 26 ? 1.1 : age <= 30 ? 0.85 : 0.5) * (star ? 1.35 : 1) / 50) * 50;

/** Reparte los goles reales del club en la liga entre sus jugadores (la figura y vos usan sus goles de verdad). */
function withSeasonStats(c: Career, clubId: string, list: Omit<SquadPlayer, "value" | "pj" | "goals" | "assists">[]): SquadPlayer[] {
  const cl = club(clubId);
  const ls = c.leagues[cl.league];
  const row = ls?.table[clubId];
  const teamPj = row?.pj ?? 0;
  const gf = row?.gf ?? 0;
  const fixed = (x: (typeof list)[number]) => {
    if (x.tag === "vos") return { pj: Math.min(teamPj, c.seasonStats.pj), goals: c.seasonStats.leagueGoals, assists: Math.min(c.seasonStats.assists, Math.round(gf * 0.7)) };
    if (x.tag === "estrella") return { goals: ls?.scorers[x.name] ?? 0 };
    if (x.tag === "nemesis") return { goals: c.nemesis?.seasonGoals ?? 0 };
    return null;
  };
  const res = list.map((x) => {
    const r = seeded(`${clubId}:${x.name}:${c.season}`);
    const pj = x.starter ? Math.max(0, teamPj - Math.floor(r() * 3)) : Math.round(teamPj * (0.15 + r() * 0.45));
    return { ...x, value: playerValue(x.ovr, x.age, x.tag === "estrella"), pj: Math.min(pj, teamPj), goals: 0, assists: 0, w: r(), ...fixed(x) };
  });
  const share = (total: number, key: "goals" | "assists", posW: Record<SquadPos, number>) => {
    const free = res.filter((x) => !(key === "goals" ? ["vos", "estrella", "nemesis"] : ["vos"]).includes(x.tag ?? ""));
    const taken = res.reduce((a, x) => a + (free.includes(x) ? 0 : x[key]), 0);
    let left = Math.max(0, total - taken);
    const ws = free.map((x) => posW[x.pos] * (x.pj / Math.max(1, teamPj)) * (0.4 + x.w) * Math.pow(1.04, x.ovr - 70));
    const sum = ws.reduce((a, b) => a + b, 0);
    if (!sum) return;
    const raw = ws.map((w) => (w / sum) * left);
    free.forEach((x, i) => { x[key] = Math.floor(raw[i]); left -= x[key]; });
    const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < left && k < order.length; k++) free[order[k][1]][key]++;
  };
  share(gf, "goals", { ARQ: 0, DEF: 0.5, MED: 1.5, DEL: 3.2 });
  share(Math.round(gf * 0.7), "assists", { ARQ: 0.05, DEF: 0.9, MED: 2.6, DEL: 1.5 });
  return res.map(({ w: _w, ...x }) => x);
}
