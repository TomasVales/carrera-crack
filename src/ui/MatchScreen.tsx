import { useEffect, useMemo, useRef, useState } from "react";
import { club, pick, randInt, type Club } from "../game/data";
import { backgroundScore, effStats, myFixture, playedRating, rivalLevel, simulateMine, type Career, type MatchOutcome } from "../game/career";
import { Arcade, type PlayKind, type PlayOutcome, type PlayResult } from "../game/match";
import { sfx } from "../game/audio";
import { Crest } from "./common";

type Ev = { min: number; kind: "play" | "mine" | "theirs" | "talk"; play?: PlayKind };
type Feed = { min: number; text: string; tone: "good" | "bad" | "neutral" | "big" };

const KINDS: Record<string, PlayKind[]> = { DC: ["mano", "contra", "afuera"], EXT: ["banda", "contra", "mano"], ENG: ["pared", "afuera", "contra"] };

const TALK = [
  "Se juega a mil por hora en el medio",
  "La hinchada no para de cantar",
  "Tiro de esquina que no encuentra a nadie",
  "Amarilla para un volante rival por una plancha",
  "El DT da indicaciones a los gritos",
  "Pelota parada peligrosa... despeja la defensa",
  "Partido trabado, mucha pierna fuerte",
  "Sale un hincha a la cancha. ¡Lo persigue la seguridad!",
];

function colorDist(a: string, b: string) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

function rivalKit(mine: Club, rv: Club) {
  if (colorDist(mine.c1, rv.c1) < 120) return { c1: rv.c2, c2: rv.c1 };
  return { c1: rv.c1, c2: rv.c2 };
}

const isTouch = () => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

export default function MatchScreen({ c, mode, onDone }: { c: Career; mode: "jugar" | "simular"; onDone: (o: MatchOutcome) => void }) {
  const fx = myFixture(c)!;
  const home = fx.home === c.clubId;
  const me = club(c.clubId);
  const rv = club(home ? fx.away : fx.home);
  const injured = c.player.injured > 0;

  // ---------- simulación rápida ----------
  const sim = useMemo(() => (mode === "simular" ? simulateMine(c, injured) : null), [c, mode, injured]);

  // ---------- plan del partido jugado ----------
  const plan = useMemo<Ev[]>(() => {
    if (mode !== "jugar") return [];
    const titular = c.contract.role === "titular";
    const n = titular ? randInt(3, 4) : 2;
    const from = titular ? 6 : 55;
    const mins = new Set<number>();
    while (mins.size < n) mins.add(randInt(from, 86));
    const kinds = KINDS[c.player.pos];
    const evs: Ev[] = [...mins].map((m) => ({ min: m, kind: "play", play: pick(kinds) }));
    const bg = backgroundScore(c);
    for (let i = 0; i < bg.mine; i++) evs.push({ min: randInt(2, 88), kind: "mine" });
    for (let i = 0; i < bg.theirs; i++) evs.push({ min: randInt(2, 88), kind: "theirs" });
    for (let m = 12; m < 88; m += randInt(14, 22)) evs.push({ min: m, kind: "talk" });
    return evs.sort((a, b) => a.min - b.min);
  }, [c, mode]);

  const [minute, setMinute] = useState(0);
  const [score, setScore] = useState({ mine: 0, theirs: 0 });
  const [feed, setFeed] = useState<Feed[]>([]);
  const [play, setPlay] = useState<{ kind: PlayKind; epic: boolean; min: number } | null>(null);
  const [fast, setFast] = useState(false);
  const [ended, setEnded] = useState(false);
  const st = useRef({ idx: 0, minute: 0, mine: 0, theirs: 0, goals: 0, assists: 0, good: 0, bad: 0, epicDone: false, paused: false, finished: false });

  const push = (f: Feed) => setFeed((x) => [f, ...x].slice(0, 12));

  // reloj del partido
  useEffect(() => {
    sfx.crowdStart();
    sfx.whistle();
    let raf = 0;
    let last = performance.now();
    const target = mode === "simular" ? sim! : null;
    const simGoals = target ? buildSimTimeline(target, home) : [];
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
          // minuto 90 épico: si el partido está empatado o se pierde por uno
          const close = diff === 0 || diff === -1;
          if (mode === "jugar" && !s.epicDone && close && (c.contract.role === "titular" || Math.random() < 0.6)) {
            s.epicDone = true;
            s.paused = true;
            setPlay({ kind: pick(KINDS[c.player.pos]), epic: true, min: 90 });
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
  }, []);

  const fastRef = useRef(false);
  fastRef.current = fast;

  function playEnded(r: PlayResult) {
    const s = st.current;
    s.good += r.good;
    s.bad += r.bad;
    const min = play!.min;
    const txt: Record<PlayOutcome, [string, Feed["tone"]]> = {
      gol: [`¡¡GOL DE ${(c.player.nick || c.player.name).toUpperCase()}!!`, "big"],
      asist: [`¡Gol! Asistencia de ${c.player.nick || c.player.name}`, "good"],
      atajada: ["Lo ataja el arquero", "neutral"],
      palo: ["¡Pegó en el palo!", "neutral"],
      afuera: ["Remate desviado", "neutral"],
      perdida: ["Perdiste la pelota", "bad"],
      tiempo: ["La jugada se diluye", "neutral"],
    };
    if (r.outcome === "gol") { s.goals++; s.mine++; }
    if (r.outcome === "asist") { s.assists++; s.mine++; }
    if (r.outcome === "perdida" || r.outcome === "tiempo") s.bad += 0.5;
    if (r.outcome === "atajada" || r.outcome === "palo") s.good += 0.5;
    setScore({ mine: s.mine, theirs: s.theirs });
    push({ min, text: txt[r.outcome][0], tone: txt[r.outcome][1] });
    setPlay(null);
    s.paused = false;
  }

  function finish() {
    const s = st.current;
    if (mode === "simular") {
      onDone(sim!);
      return;
    }
    const hg = home ? s.mine : s.theirs;
    const ag = home ? s.theirs : s.mine;
    onDone({ played: true, hg, ag, goals: s.goals, assists: s.assists, rating: playedRating(s.goals, s.assists, s.good, s.bad, s.mine - s.theirs) });
  }

  const [left, right] = home ? [me, rv] : [rv, me];
  const [ls, rs] = home ? [score.mine, score.theirs] : [score.theirs, score.mine];

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 py-4">
      {/* Marcador */}
      <div className="card rise flex items-center justify-between gap-2 p-4">
        <Team club={left} />
        <div className="text-center">
          <div className="title-font text-5xl tabular-nums">
            {ls} - {rs}
          </div>
          <div className="mt-1 inline-block rounded-full bg-emerald-500 px-3 py-0.5 text-sm font-black text-slate-900 tabular-nums">{ended ? "FINAL" : `${minute}'`}</div>
        </div>
        <Team club={right} />
      </div>

      {injured && mode === "simular" && <p className="card p-3 text-center text-sm text-rose-200">🩼 Mirás el partido desde la tribuna.</p>}

      {/* Relato */}
      <div className="card flex-1 p-4">
        <div className="mb-2 text-xs font-black uppercase tracking-widest text-white/50">Relato en vivo</div>
        <ul className="grid gap-2">
          {feed.map((f, i) => (
            <li key={`${f.min}-${i}-${f.text}`} className={`rise flex gap-3 rounded-xl px-3 py-2 ${f.tone === "big" ? "bg-amber-400 text-slate-900 font-black text-lg" : f.tone === "good" ? "bg-emerald-500/20" : f.tone === "bad" ? "bg-rose-500/20" : "bg-white/5"}`}>
              <span className="w-8 shrink-0 font-black tabular-nums opacity-70">{f.min}'</span>
              <span>{f.text}</span>
            </li>
          ))}
          {!feed.length && <li className="text-white/40">Arranca el partido...</li>}
        </ul>
      </div>

      {ended ? (
        <button className="btn btn-gold py-5 text-2xl" onClick={finish}>
          VER RESULTADO →
        </button>
      ) : (
        mode === "jugar" && (
          <button className="btn btn-ghost py-3" onClick={() => setFast(!fast)}>
            {fast ? "▶ Velocidad normal" : "⏩ Adelantar hasta la próxima jugada"}
          </button>
        )
      )}

      {play && <PlayLayer c={c} kind={play.kind} epic={play.epic} minute={play.min} me={me} rv={rv} onEnd={playEnded} />}
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

function Team({ club: cl }: { club: Club }) {
  return (
    <div className="flex w-24 flex-col items-center gap-1 text-center">
      <Crest club={cl} size={54} />
      <div className="text-xs font-black leading-tight">{cl.name}</div>
    </div>
  );
}

// ---------- Capa de la jugada (canvas a pantalla completa) ----------

function PlayLayer({ c, kind, epic, minute, me, rv, onEnd }: { c: Career; kind: PlayKind; epic: boolean; minute: number; me: Club; rv: Club; onEnd: (r: PlayResult) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const arcade = useRef<Arcade | null>(null);
  const touch = useMemo(isTouch, []);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    const a = new Arcade(
      ref.current!,
      {
        kind,
        epic,
        minute,
        look: c.player.look,
        num: c.player.number,
        stats: effStats(c),
        kit: { c1: me.c1, c2: me.c2 },
        rivalKit: rivalKit(me, rv),
        rival: rivalLevel(c),
        energy: c.player.energy,
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
          <b className="text-white">WASD</b> mover · <b className="text-white">Shift</b> correr · <b className="text-white">Espacio</b> patear (mantené) · <b className="text-white">E</b> pase · <b className="text-white">Q</b> amague
        </div>
      )}
      {touch && <TouchControls arcade={arcade} />}
      {touch && <RotateHint />}
    </div>
  );
}

/** En vertical se ve poca cancha: sugerimos girar el celular. */
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

  const btn = "btn flex items-center justify-center rounded-full font-black text-sm shadow-lg select-none";
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
        <button className={`${btn} h-14 w-14 text-xs bg-sky-500/70 text-white`} onPointerDown={(e) => { e.preventDefault(); arcade.current?.pressFeint(); }}>
          AMAGUE
        </button>
        <button className={`${btn} h-14 w-14 bg-white/70 text-slate-900`} onPointerDown={(e) => { e.preventDefault(); arcade.current?.pressPass(); }}>
          PASE
        </button>
        <button
          className={`${btn} h-14 w-14 text-xs bg-cyan-400/60 text-slate-900`}
          onPointerDown={(e) => { e.preventDefault(); arcade.current?.setTouchSprint(true); }}
          onPointerUp={() => arcade.current?.setTouchSprint(false)}
          onPointerCancel={() => arcade.current?.setTouchSprint(false)}
          onPointerLeave={() => arcade.current?.setTouchSprint(false)}
        >
          CORRER
        </button>
        <button
          className={`${btn} h-20 w-20 bg-amber-400/85 text-slate-900 text-base`}
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
