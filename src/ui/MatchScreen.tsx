import { useEffect, useMemo, useRef, useState } from "react";
import { club, clubsOf, pick, rand, randInt, type Team } from "../game/data";
import { backgroundScore, effStats, matchInfo, matchRole, playedRating, rivalLevel, simulateMine, type Career, type MatchOutcome } from "../game/career";
import { Arcade, type PlayKind, type PlayOutcome, type PlayResult, type Weather } from "../game/match";
import { sfx } from "../game/audio";
import { Avatar, Btn, Crest } from "./common";

type Ev = { min: number; kind: "play" | "mine" | "theirs" | "talk"; play?: PlayKind };
type Feed = { min: number | string; text: string; tone: "good" | "bad" | "neutral" | "big" };

const KINDS: Record<string, PlayKind[]> = {
  DC: ["mano", "contra", "afuera", "corner", "mano"],
  EXT: ["banda", "contra", "mano", "banda", "defensa"],
  ENG: ["pared", "afuera", "contra", "posesion", "pared"],
};

/** Elige una jugada: la de tu posición, con pelota parada y defensa de vez en cuando. */
function pickPlay(pos: string): PlayKind {
  const r = rand();
  if (r < (pos === "ENG" ? 0.16 : 0.1)) return "libre";
  if (r < 0.17) return "penal";
  if (r < 0.27) return "defensa";
  if (r < 0.35) return pos === "ENG" ? "posesion" : "corner";
  return pick(KINDS[pos]);
}

const TALK = [
  "Se juega a mil por hora en el medio",
  "La hinchada no para de cantar",
  "Tiro de esquina que no encuentra a nadie",
  "Amarilla para un volante rival por una plancha",
  "El DT da indicaciones a los gritos",
  "Pelota parada peligrosa... despeja la defensa",
  "Partido trabado, mucha pierna fuerte",
  "Sale un hincha a la cancha. ¡Lo persigue la seguridad!",
  "El arquero rival hace tiempo y la tribuna silba",
  "Cambio en el rival: entra un pibe de la reserva",
];

function colorDist(a: string, b: string) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Camiseta del rival: si choca con la tuya, usa la alternativa. */
function rivalKit(mine: Team, rv: Team) {
  if (colorDist(mine.c1, rv.c1) >= 130) return { c1: rv.c1, c2: rv.c2 };
  if (colorDist(mine.c1, rv.alt[0]) >= 130) return { c1: rv.alt[0], c2: rv.alt[1] };
  // si las dos chocan, el rival juega con camiseta clara (o oscura)
  const light = colorDist(mine.c1, "#f8fafc") >= 160;
  return light ? { c1: "#f8fafc", c2: rv.c1 } : { c1: "#111827", c2: rv.c1 };
}

const isTouch = () => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

function pickWeather(home: Team): Weather {
  const r = rand();
  const rainy = home.league === "eng" ? 0.4 : 0.15;
  return r < rainy ? "lluvia" : r < rainy + 0.3 ? "noche" : "sol";
}
const WEATHER_TXT: Record<Weather, string> = { sol: "☀️ Tarde de sol", noche: "🌙 Noche de luces", lluvia: "🌧️ Lluvia y barro" };

export default function MatchScreen({ c, mode, onDone }: { c: Career; mode: "jugar" | "simular"; onDone: (o: MatchOutcome) => void }) {
  const m = matchInfo(c)!;
  const me = club(m.myId);
  const rv = m.rival;
  const injured = c.player.injured > 0;
  const role = useMemo(() => matchRole(c), [c]);
  const weather = useMemo(() => pickWeather(m.home), [m.home]);
  const [phase, setPhase] = useState<"intro" | "live">(mode === "jugar" ? "intro" : "live");

  const sim = useMemo(() => (mode === "simular" ? simulateMine(c, injured) : null), [c, mode, injured]);

  const plan = useMemo<Ev[]>(() => {
    if (mode !== "jugar") return [];
    const titular = role.role === "titular";
    const n = titular ? randInt(3, 4) : 2;
    const from = titular ? 6 : 55;
    const mins = new Set<number>();
    while (mins.size < n) mins.add(randInt(from, 86));
    const evs: Ev[] = [...mins].map((min) => ({ min, kind: "play", play: pickPlay(c.player.pos) }));
    const bg = backgroundScore(c);
    for (let i = 0; i < bg.mine; i++) evs.push({ min: randInt(2, 88), kind: "mine" });
    for (let i = 0; i < bg.theirs; i++) evs.push({ min: randInt(2, 88), kind: "theirs" });
    for (let k = 12; k < 88; k += randInt(14, 22)) evs.push({ min: k, kind: "talk" });
    return evs.sort((a, b) => a.min - b.min);
  }, [c, mode, role.role]);

  const [minute, setMinute] = useState(0);
  const [score, setScore] = useState({ mine: 0, theirs: 0 });
  const [feed, setFeed] = useState<Feed[]>([]);
  const [play, setPlay] = useState<{ kind: PlayKind; epic: boolean; min: number; decisive?: boolean } | null>(null);
  const [fast, setFast] = useState(false);
  const [ended, setEnded] = useState(false);
  const st = useRef({ idx: 0, minute: 0, mine: 0, theirs: 0, goals: 0, assists: 0, good: 0, bad: 0, epicDone: false, paused: false, finished: false, pensWin: undefined as boolean | undefined, pensDone: false });
  const fastRef = useRef(false);
  fastRef.current = fast;

  const push = (f: Feed) => setFeed((x) => [f, ...x].slice(0, 14));

  useEffect(() => {
    if (phase !== "live") return;
    sfx.crowdStart();
    sfx.whistle();
    let raf = 0;
    let last = performance.now();
    const simGoals = sim ? buildSimTimeline(sim, m.isHome) : [];
    if (mode === "jugar" && role.role === "suplente") push({ min: 0, text: `Arrancás en el banco: ${role.why}`, tone: "neutral" });
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = st.current;
      if (!s.paused && !s.finished) {
        const speed = mode === "simular" ? 40 : fastRef.current ? 60 : 13;
        s.minute = Math.min(90, s.minute + dt * speed);
        setMinute(Math.floor(s.minute));
        if (mode === "simular") {
          while (simGoals.length && simGoals[0].min <= s.minute) {
            const g = simGoals.shift()!;
            if (g.mine) s.mine++;
            else s.theirs++;
            setScore({ mine: s.mine, theirs: s.theirs });
            push({ min: g.min, text: g.mine ? `¡Gol de ${me.short}!` : `Gol de ${rv.short}`, tone: g.mine ? "good" : "bad" });
            if (g.mine) sfx.goal();
          }
        } else {
          while (s.idx < plan.length && plan[s.idx].min <= s.minute) {
            const ev = plan[s.idx++];
            if (ev.kind === "mine") {
              s.mine++;
              setScore({ mine: s.mine, theirs: s.theirs });
              push({ min: ev.min, text: `¡Gol de ${me.star}! ${me.short} lo celebra`, tone: "good" });
              sfx.goal();
            } else if (ev.kind === "theirs") {
              s.theirs++;
              setScore({ mine: s.mine, theirs: s.theirs });
              push({ min: ev.min, text: `Gol de ${rv.name}. Lo hizo ${rv.star}`, tone: "bad" });
              sfx.ooh();
            } else if (ev.kind === "talk") {
              push({ min: ev.min, text: pick(TALK), tone: "neutral" });
            } else {
              s.paused = true;
              setPlay({ kind: ev.play!, epic: false, min: ev.min });
              break;
            }
          }
        }
        if (s.minute >= 90 && !s.paused) {
          const diff = s.mine - s.theirs;
          const close = diff === 0 || diff === -1;
          if (mode === "jugar" && !s.epicDone && close && (role.role === "titular" || rand() < 0.6)) {
            s.epicDone = true;
            s.paused = true;
            setPlay({ kind: pick(KINDS[c.player.pos].filter((k) => k !== "defensa" && k !== "posesion")), epic: true, min: 90 });
          } else if (m.knockout && s.mine === s.theirs && !s.pensDone) {
            s.pensDone = true;
            if (mode === "jugar") {
              s.paused = true;
              push({ min: "90+", text: "¡Empate! Se define por penales...", tone: "big" });
              setPlay({ kind: "penal", epic: false, min: 90, decisive: true });
            } else {
              s.pensWin = sim?.pensWin;
              push({ min: "P", text: s.pensWin ? `¡${me.short} gana por penales!` : `${rv.short} gana por penales...`, tone: s.pensWin ? "big" : "bad" });
            }
          } else {
            s.finished = true;
            sfx.whistle(true);
            setEnded(true);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      sfx.crowdStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function playEnded(r: PlayResult) {
    const s = st.current;
    const cur = play!;
    s.good += r.good;
    s.bad += r.bad;
    if (cur.decisive) {
      // penal decisivo: si lo metés, tu equipo gana la tanda (casi siempre)
      const scored = r.outcome === "gol";
      s.pensWin = scored ? rand() < 0.85 : rand() < 0.2;
      if (scored) { s.good += 1; sfx.goal(); }
      push({ min: "P", text: scored ? (s.pensWin ? "¡LO METISTE! ¡Pasan por penales!" : "Lo metiste... pero fallaron otros. Eliminados.") : s.pensWin ? "Lo erraste, ¡pero el arquero salvó la tanda!" : "Erraste el penal decisivo...", tone: s.pensWin ? "big" : "bad" });
      setPlay(null);
      s.paused = false;
      return;
    }
    const txt: Record<PlayOutcome, [string, Feed["tone"]]> = {
      gol: [`¡¡GOL DE ${(c.player.nick || c.player.name).toUpperCase()}!!`, "big"],
      asist: [`¡Gol! Asistencia de ${c.player.nick || c.player.name}`, "good"],
      atajada: ["Lo ataja el arquero", "neutral"],
      palo: ["¡Pegó en el palo!", "neutral"],
      afuera: ["Remate desviado", "neutral"],
      perdida: ["Perdiste la pelota", "bad"],
      tiempo: ["La jugada se diluye", "neutral"],
      recupero: ["¡Recuperaste la pelota y cortaste el contraataque!", "good"],
      golrival: [`Gol de ${rv.name} en la contra...`, "bad"],
      posesion: ["¡Olé, olé! Toque y toque en mitad de cancha", "good"],
    };
    if (r.outcome === "gol") { s.goals++; s.mine++; }
    if (r.outcome === "asist") { s.assists++; s.mine++; }
    if (r.outcome === "tiempo" && cur.kind !== "defensa") s.bad += 0.5;
    if (r.outcome === "golrival") { s.theirs++; s.bad += 1; sfx.ooh(); }
    if (r.outcome === "recupero") s.good += 1.5;
    if (r.outcome === "posesion") s.good += 1;
    if (r.outcome === "atajada" || r.outcome === "palo") s.good += 0.5;
    setScore({ mine: s.mine, theirs: s.theirs });
    push({ min: cur.min, text: `${cur.kind === "libre" ? "Tiro libre: " : cur.kind === "penal" ? "Penal: " : cur.kind === "corner" ? "Córner: " : ""}${txt[r.outcome][0]}`, tone: txt[r.outcome][1] });
    setPlay(null);
    s.paused = false;
  }

  function finish() {
    const s = st.current;
    if (mode === "simular") {
      onDone(sim!);
      return;
    }
    const hg = m.isHome ? s.mine : s.theirs;
    const ag = m.isHome ? s.theirs : s.mine;
    onDone({ played: true, hg, ag, goals: s.goals, assists: s.assists, rating: playedRating(s.goals, s.assists, s.good, s.bad, s.mine - s.theirs), pensWin: s.pensWin });
  }

  if (phase === "intro") return <Walkout c={c} home={m.home} away={m.away} label={m.label} weather={weather} role={role} onGo={() => setPhase("live")} />;

  const [left, right] = m.isHome ? [me, rv] : [rv, me];
  const [ls, rs] = m.isHome ? [score.mine, score.theirs] : [score.theirs, score.mine];

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 py-4">
      <div className="card rise flex items-center justify-between gap-2 p-4">
        <TeamBadge t={left} />
        <div className="text-center">
          <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/50">{m.label}</div>
          <div className="title-font text-5xl tabular-nums">{ls} - {rs}</div>
          <div className="mt-1 inline-block rounded-full bg-emerald-500 px-3 py-0.5 text-sm font-black text-slate-900 tabular-nums">{ended ? "FINAL" : `${minute}'`}</div>
          <div className="mt-1 text-xs text-white/50">{WEATHER_TXT[weather]}</div>
        </div>
        <TeamBadge t={right} />
      </div>

      {injured && mode === "simular" && <p className="card p-3 text-center text-sm text-rose-200">🩼 Mirás el partido desde la tribuna.</p>}

      <div className="card flex-1 p-4">
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-white/50">Relato en vivo</div>
        <ul className="grid gap-2">
          {feed.map((f, i) => (
            <li key={`${f.min}-${i}-${f.text}`} className={`rise flex gap-3 rounded-xl px-3 py-2 ${f.tone === "big" ? "bg-amber-400 text-lg font-black text-slate-900" : f.tone === "good" ? "bg-emerald-500/20" : f.tone === "bad" ? "bg-rose-500/20" : "bg-white/5"}`}>
              <span className="w-8 shrink-0 font-black tabular-nums opacity-70">{f.min}'</span>
              <span>{f.text}</span>
            </li>
          ))}
          {!feed.length && <li className="text-white/40">Arranca el partido...</li>}
        </ul>
      </div>

      {ended ? (
        <Btn kind="gold" className="py-5 text-2xl" onClick={finish}>VER RESULTADO →</Btn>
      ) : (
        mode === "jugar" && (
          <button className="btn btn-ghost py-3" onClick={() => setFast(!fast)}>
            {fast ? "▶ Velocidad normal" : "⏩ Adelantar hasta la próxima jugada"}
          </button>
        )
      )}

      {play && <PlayLayer c={c} kind={play.kind} epic={play.epic} decisive={play.decisive} minute={play.min} me={me} rv={rv} home={m.home} weather={weather} onEnd={playEnded} />}
    </div>
  );
}

/** Reparte los goles del partido simulado en minutos al azar. */
function buildSimTimeline(o: MatchOutcome, home: boolean) {
  const mine = home ? o.hg : o.ag;
  const theirs = home ? o.ag : o.hg;
  const goals: { min: number; mine: boolean }[] = [];
  for (let i = 0; i < mine; i++) goals.push({ min: randInt(1, 90), mine: true });
  for (let i = 0; i < theirs; i++) goals.push({ min: randInt(1, 90), mine: false });
  return goals.sort((a, b) => a.min - b.min);
}

function TeamBadge({ t }: { t: Team }) {
  return (
    <div className="flex w-24 flex-col items-center gap-1 text-center">
      <Crest club={t} size={54} />
      <div className="text-xs font-black leading-tight">{t.name}</div>
    </div>
  );
}

// ---------- Salida de los equipos ----------

function Walkout({ c, home, away, label, weather, role, onGo }: { c: Career; home: Team; away: Team; label: string; weather: Weather; role: { role: string; why: string }; onGo: () => void }) {
  const cur = c.schedule[c.slot];
  const myTeam = club(cur?.kind === "cup" && cur.cup === "nac" ? c.player.nation : c.clubId);
  useEffect(() => {
    sfx.crowdStart();
    const t = setTimeout(() => sfx.whistle(), 400);
    return () => {
      clearTimeout(t);
      sfx.crowdStop();
    };
  }, []);
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-4 py-8 text-center" style={{ background: weather === "noche" ? "radial-gradient(circle at 50% 0%, #1e3a8a 0%, #020617 70%)" : weather === "lluvia" ? "linear-gradient(#334155, #0f172a)" : `radial-gradient(circle at 50% 0%, ${home.c1}99 0%, #0b1d12 70%)` }}>
      <div className="pop text-xs font-black uppercase tracking-[0.3em] text-white/70">{label}</div>
      <div className="pop title-font text-3xl sm:text-5xl">¡SALEN LOS EQUIPOS!</div>
      <div className="text-sm text-white/70">{home.stadium} · {WEATHER_TXT[weather]}</div>
      <div className="flex items-center gap-4 sm:gap-10">
        <div className="rise flex flex-col items-center gap-2" style={{ animationDelay: ".1s" }}>
          <Crest club={home} size={96} />
          <div className="max-w-32 font-black leading-tight">{home.name}</div>
        </div>
        <div className="title-font text-4xl text-white/40">VS</div>
        <div className="rise flex flex-col items-center gap-2" style={{ animationDelay: ".25s" }}>
          <Crest club={away} size={96} />
          <div className="max-w-32 font-black leading-tight">{away.name}</div>
        </div>
      </div>
      <div className="rise flex items-end gap-1" style={{ animationDelay: ".4s" }}>
        <Avatar look={c.player.look} kit={{ c1: myTeam.c1, c2: myTeam.c2, num: c.player.number }} size={150} />
      </div>
      <div className={`rise rounded-xl px-4 py-2 text-sm font-bold ${role.role === "titular" ? "bg-emerald-500/20 text-emerald-100" : "bg-orange-500/20 text-orange-100"}`} style={{ animationDelay: ".5s" }}>
        {role.role === "titular" ? "✅ Titular" : "🪑 Suplente"} · {role.why}
      </div>
      <Btn kind="gold" className="w-full max-w-xs py-5 text-2xl" onClick={onGo}>¡AL CAMPO! ⚽</Btn>
    </div>
  );
}

// ---------- Capa de la jugada ----------

export function PlayLayer({ c, kind, epic, decisive, minute, me, rv, home, weather, onEnd, onExit }: { c: Career; kind: PlayKind; epic: boolean; decisive?: boolean; minute: number; me: Team; rv: Team; home: Team; weather: Weather; onEnd: (r: PlayResult) => void; onExit?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const arcade = useRef<Arcade | null>(null);
  const touch = useMemo(isTouch, []);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    const a = new Arcade(
      ref.current!,
      {
        kind, epic, decisive, minute,
        look: c.player.look,
        num: c.player.number,
        stats: effStats(c, true),
        kit: { c1: me.c1, c2: me.c2 },
        rivalKit: rivalKit(me, rv),
        rival: kind === "practica" ? 0.35 : rivalLevel(c),
        energy: c.player.energy,
        celebration: c.player.celebration,
        rivalSeed: `${rv.id}-${c.season}`,
        crowd: [home.c1, home.c2],
        weather,
      },
      (r) => endRef.current(r),
    );
    arcade.current = a;
    return () => a.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <canvas ref={ref} className="h-full w-full touch-none" />
      {!touch && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl bg-black/55 px-3 py-2 text-xs font-bold text-white/80">
          <b className="text-white">WASD</b> mover · <b className="text-white">Shift</b> correr · <b className="text-white">Espacio</b> patear / barrida / cabezazo · <b className="text-white">Shift+Espacio</b> comba · <b className="text-white">E</b> pase / meter la pierna · <b className="text-white">Q</b> amague/salto
        </div>
      )}
      {touch && <TouchControls arcade={arcade} />}
      {touch && <RotateHint />}
      {onExit && (
        <button className="btn btn-ghost absolute right-3 top-3 px-4 py-2 text-sm" onClick={() => arcade.current?.quit()}>
          Salir ✕
        </button>
      )}
    </div>
  );
}

function RotateHint() {
  const [portrait, setPortrait] = useState(() => window.innerHeight > window.innerWidth);
  useEffect(() => {
    const f = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  if (!portrait) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
      <div className="pop rounded-2xl bg-black/70 px-4 py-2 text-center text-sm font-black">📱↻ Girá el celular para ver más cancha</div>
    </div>
  );
}

function TouchControls({ arcade }: { arcade: React.RefObject<Arcade | null> }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pid = useRef<number | null>(null);

  function move(e: React.PointerEvent) {
    if (pid.current !== e.pointerId) return;
    const r = base.current!.getBoundingClientRect();
    const R = r.width / 2;
    let x = (e.clientX - (r.left + R)) / R;
    let y = (e.clientY - (r.top + R)) / R;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    setKnob({ x, y });
    if (arcade.current) arcade.current.joy = { x: Math.abs(x) < 0.15 ? 0 : x, y: Math.abs(y) < 0.15 ? 0 : y };
  }
  function release() {
    pid.current = null;
    setKnob({ x: 0, y: 0 });
    if (arcade.current) arcade.current.joy = { x: 0, y: 0 };
  }

  const btn = "btn flex items-center justify-center rounded-full font-black text-xs shadow-lg select-none";
  return (
    <>
      <div
        ref={base}
        className="absolute bottom-6 left-6 h-36 w-36 touch-none rounded-full border-2 border-white/30 bg-white/10"
        onPointerDown={(e) => {
          pid.current = e.pointerId;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 rounded-full bg-white/70 shadow" style={{ transform: `translate(calc(-50% + ${knob.x * 40}px), calc(-50% + ${knob.y * 40}px))` }} />
      </div>
      <div className="absolute bottom-4 right-4 grid grid-cols-2 items-end gap-2">
        <button className={`${btn} h-14 w-14 bg-sky-500/70 text-white`} onPointerDown={(e) => { e.preventDefault(); arcade.current?.pressFeint(); }}>
          AMAGUE
        </button>
        <button className={`${btn} h-14 w-14 bg-white/70 text-slate-900`} onPointerDown={(e) => { e.preventDefault(); arcade.current?.pressPass(); }}>
          PASE
        </button>
        <button
          className={`${btn} h-14 w-14 bg-cyan-400/60 text-slate-900`}
          onPointerDown={(e) => { e.preventDefault(); arcade.current?.setTouchSprint(true); }}
          onPointerUp={() => arcade.current?.setTouchSprint(false)}
          onPointerCancel={() => arcade.current?.setTouchSprint(false)}
          onPointerLeave={() => arcade.current?.setTouchSprint(false)}
        >
          CORRER
          <br />
          COMBA
        </button>
        <button
          className={`${btn} h-20 w-20 bg-amber-400/85 text-base text-slate-900`}
          onPointerDown={(e) => { e.preventDefault(); arcade.current?.pressShoot(true); }}
          onPointerUp={() => arcade.current?.pressShoot(false)}
          onPointerCancel={() => arcade.current?.pressShoot(false)}
        >
          PATEAR
        </button>
      </div>
    </>
  );
}

// ---------- Entrenamiento libre ----------

const STEPS = [
  "1 · Movete con WASD (o el joystick)",
  "2 · Mantené Shift para correr",
  "3 · Mantené Espacio y soltá: más tiempo = más fuerte",
  "4 · Apuntá con W/S mientras cargás: mirá la mira amarilla",
  "5 · Un toquecito de Espacio = vaselina",
  "6 · Shift + Espacio = tiro colocado con comba",
];

/** ?jugada=libre|penal|mano... en la URL: practicar una jugada puntual (útil para probar). */
function debugKind(): PlayKind {
  const k = new URLSearchParams(window.location.search).get("jugada");
  return (["mano", "contra", "pared", "afuera", "banda", "libre", "penal", "defensa", "posesion", "corner"] as const).find((x) => x === k) ?? "practica";
}

export function PracticeScreen({ c, onExit }: { c: Career; onExit: () => void }) {
  const me = club(c.clubId);
  const rv = clubsOf(me.league).find((x) => x.id !== me.id)!;
  const [step, setStep] = useState(0);
  const [stats, setStats] = useState<{ shots: number; goals: number } | null>(null);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 4500);
    return () => clearInterval(t);
  }, []);
  if (stats)
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="title-font text-4xl">ENTRENAMIENTO TERMINADO</div>
        <div className="card w-full p-6">
          <div className="title-font text-6xl text-amber-300">{stats.goals}/{stats.shots}</div>
          <div className="text-white/60">goles / remates</div>
        </div>
        <Btn kind="gold" className="w-full py-4 text-xl" onClick={onExit}>Volver</Btn>
      </div>
    );
  return (
    <>
      <PlayLayer c={c} kind={debugKind()} epic={false} minute={0} me={me} rv={rv} home={me} weather="sol" onEnd={(r) => setStats({ shots: r.shots ?? 0, goals: r.goals ?? 0 })} onExit={onExit} />
      <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex justify-center px-4">
        <div key={step} className="pop rounded-2xl bg-black/70 px-4 py-2 text-center text-sm font-black text-amber-200">{STEPS[step]}</div>
      </div>
    </>
  );
}
