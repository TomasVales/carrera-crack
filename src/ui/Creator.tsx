import { useMemo, useState } from "react";
import {
  BEARD_NAMES, BOOTS, EYES_NAMES, HAIR_COLORS, HAIR_NAMES, LEAGUES, NATIONS, POS_INFO, SKINS, STAT_INFO, STAT_KEYS, overall, randInt,
  type Foot, type Look, type Pos, type Stats,
} from "../game/data";
import { newCareer, startingClubs, type Career } from "../game/career";
import { Avatar, Bar, Btn, Crest, Stars, clubStars, ink, statColor, useClubTheme } from "./common";

const POINTS = 10;
const BASE: Stats = { tiro: 48, pase: 46, regate: 47, velocidad: 50, fisico: 46 };
const NAMES = ["Lautaro Pizzolo", "Franco Bianchetti", "Thiago Rossini", "Bruno Cattaneo", "Mateo Galletti", "Santi Rinaldi", "Nico Fontana"];
const NICKS = ["El Tano", "La Pulga", "El Mago", "El Rayo", "Pibe", "El Turbo", "Fideo"];

function Picker({ label, value, n, onChange, names, colors }: { label: string; value: number; n: number; onChange: (v: number) => void; names?: string[]; colors?: string[] }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="w-20 shrink-0 text-sm font-bold text-white/60">{label}</span>
      {colors ? (
        <div className="flex flex-wrap justify-end gap-1.5">
          {colors.map((c, i) => (
            <button key={i} onClick={() => onChange(i)} aria-label={`${label} ${i + 1}`} className={`h-7 w-7 rounded-full border-2 transition ${value === i ? "scale-110 border-white" : "border-white/20"}`} style={{ background: c }} />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button className="btn btn-ghost h-8 w-8" onClick={() => onChange((value + n - 1) % n)} aria-label="Anterior">‹</button>
          <span className="w-24 text-center text-sm font-bold">{names?.[value]}</span>
          <button className="btn btn-ghost h-8 w-8" onClick={() => onChange((value + 1) % n)} aria-label="Siguiente">›</button>
        </div>
      )}
    </div>
  );
}

export default function Creator({ slot, onDone, onBack }: { slot: number; onDone: (c: Career) => void; onBack: () => void }) {
  const [name, setName] = useState(NAMES[randInt(0, NAMES.length - 1)]);
  const [nick, setNick] = useState(NICKS[randInt(0, NICKS.length - 1)]);
  const [number, setNumber] = useState(10);
  const [pos, setPos] = useState<Pos>("DC");
  const [foot, setFoot] = useState<Foot>("der");
  const [nation, setNation] = useState("n-arg");
  const [look, setLook] = useState<Look>({ skin: 1, hair: 2, hairColor: 1, beard: 0, eyes: 1, boots: 2 });
  const [add, setAdd] = useState<Stats>({ tiro: 0, pase: 0, regate: 0, velocidad: 0, fisico: 0 });
  const [leagueId, setLeagueId] = useState("ita");
  const clubs = useMemo(() => startingClubs(leagueId), [leagueId]);
  const [clubId, setClubId] = useState(clubs[0].id);
  const club = clubs.find((c) => c.id === clubId) ?? clubs[0];
  useClubTheme(club.c1, club.c2);

  const used = STAT_KEYS.reduce((a, k) => a + add[k], 0);
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, BASE[k] + add[k]])) as Stats;
  const kit = useMemo(() => ({ c1: club.c1, c2: club.c2, num: number }), [club, number]);
  const setL = (k: keyof Look) => (v: number) => setLook((l) => ({ ...l, [k]: v }));

  function randomize() {
    setLook({ skin: randInt(0, 5), hair: randInt(0, 6), hairColor: randInt(0, 6), beard: randInt(0, 3), eyes: randInt(0, 2), boots: randInt(0, 6) });
    setName(NAMES[randInt(0, NAMES.length - 1)]);
    setNick(NICKS[randInt(0, NICKS.length - 1)]);
  }

  function start() {
    onDone(newCareer({ name: name.trim() || "Sin Nombre", nick: nick.trim(), number, pos, foot, nation, look, stats }, club.id, slot));
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 pb-10">
      <div className="flex items-center justify-between">
        <button className="btn btn-ghost px-4 py-2 text-sm" onClick={onBack}>← Volver</button>
        <h1 className="title-font text-2xl sm:text-3xl">CREÁ TU CRACK</h1>
        <button className="btn btn-ghost px-4 py-2 text-sm" onClick={randomize}>🎲 Al azar</button>
      </div>

      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <div className="card rise flex flex-col items-center gap-2 p-4 md:sticky md:top-4 md:self-start">
          <div className="relative flex w-full justify-center rounded-2xl bg-gradient-to-b from-emerald-500/40 to-emerald-900/40 pt-4">
            <Avatar look={look} kit={kit} size={220} />
            <div className="absolute left-3 top-3 text-center">
              <div className="title-font text-4xl leading-none">{overall(stats, pos)}</div>
              <div className="text-xs font-black text-white/70">{pos}</div>
            </div>
            <div className="absolute right-3 top-3 flex flex-col items-center gap-1">
              <Crest club={club} size={40} />
              <Crest club={NATIONS.find((n) => n.id === nation)!} size={28} />
            </div>
          </div>
          <div className="title-font text-xl">{nick || name}</div>
          <div className="text-sm text-white/60">{POS_INFO[pos].name} · 17 años</div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="card rise grid gap-3 p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-bold text-white/60">
              Nombre
              <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} className="rounded-xl bg-white/10 px-3 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[var(--c1)]" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold text-white/60">
              Apodo
              <input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} className="rounded-xl bg-white/10 px-3 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[var(--c1)]" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold text-white/60">
              Número
              <input type="number" min={1} max={99} value={number} onChange={(e) => setNumber(Math.max(1, Math.min(99, Number(e.target.value) || 1)))} className="rounded-xl bg-white/10 px-3 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[var(--c1)]" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold text-white/60">
              Selección
              <select value={nation} onChange={(e) => setNation(e.target.value)} className="rounded-xl bg-white/10 px-3 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[var(--c1)]">
                {NATIONS.map((n) => (
                  <option key={n.id} value={n.id} className="bg-slate-900">
                    {n.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-1 text-sm font-bold text-white/60 sm:col-span-2">
              Pierna hábil
              <div className="grid grid-cols-3 gap-1">
                {(["izq", "der", "ambi"] as Foot[]).map((f) => (
                  <button key={f} onClick={() => setFoot(f)} className={`btn py-2 text-sm ${foot === f ? "btn-club" : "btn-ghost"}`}>
                    {f === "izq" ? "Zurda" : f === "der" ? "Diestra" : "Ambas"}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card rise p-4">
            <h2 className="mb-2 font-black">Posición</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(POS_INFO) as Pos[]).map((p) => (
                <button key={p} onClick={() => setPos(p)} className={`btn p-3 text-left ${pos === p ? "btn-club" : "btn-ghost"}`}>
                  <div className="text-lg">{POS_INFO[p].name}</div>
                  <div className="text-xs font-semibold opacity-75">{POS_INFO[p].desc}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="card rise grid gap-2.5 p-4">
            <h2 className="font-black">Aspecto</h2>
            <Picker label="Piel" value={look.skin} n={SKINS.length} onChange={setL("skin")} colors={SKINS} />
            <Picker label="Peinado" value={look.hair} n={HAIR_NAMES.length} onChange={setL("hair")} names={HAIR_NAMES} />
            <Picker label="Color pelo" value={look.hairColor} n={HAIR_COLORS.length} onChange={setL("hairColor")} colors={HAIR_COLORS} />
            <Picker label="Barba" value={look.beard} n={BEARD_NAMES.length} onChange={setL("beard")} names={BEARD_NAMES} />
            <Picker label="Mirada" value={look.eyes} n={EYES_NAMES.length} onChange={setL("eyes")} names={EYES_NAMES} />
            <Picker label="Botines" value={look.boots} n={BOOTS.length} onChange={setL("boots")} colors={BOOTS} />
          </section>

          <section className="card rise p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-black">Habilidades</h2>
              <span className={`rounded-full px-3 py-1 text-sm font-black ${used < POINTS ? "bg-amber-400 text-slate-900" : "bg-white/10"}`}>{POINTS - used} puntos</span>
            </div>
            <div className="grid gap-2">
              {STAT_KEYS.map((k) => (
                <div key={k} className="grid grid-cols-[90px_1fr_auto] items-center gap-3">
                  <div>
                    <div className="text-sm font-black">{STAT_INFO[k].name}</div>
                    <div className="text-[11px] leading-tight text-white/50">{STAT_INFO[k].desc}</div>
                  </div>
                  <Bar value={stats[k]} color={statColor(stats[k])} h={10} />
                  <div className="flex items-center gap-1">
                    <button className="btn btn-ghost h-8 w-8" disabled={add[k] <= 0} onClick={() => setAdd({ ...add, [k]: add[k] - 1 })} aria-label={`Bajar ${STAT_INFO[k].name}`}>−</button>
                    <span className="w-7 text-center font-black">{stats[k]}</span>
                    <button className="btn btn-ghost h-8 w-8" disabled={used >= POINTS || add[k] >= 6} onClick={() => setAdd({ ...add, [k]: add[k] + 1 })} aria-label={`Subir ${STAT_INFO[k].name}`}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card rise p-4">
            <h2 className="mb-1 font-black">¿Dónde arrancás?</h2>
            <p className="mb-3 text-sm text-white/60">Elegí la liga y uno de los clubes más chicos, que te quieren a prueba.</p>
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {LEAGUES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLeagueId(l.id);
                    setClubId(startingClubs(l.id)[0].id);
                  }}
                  className={`btn p-2 text-sm ${leagueId === l.id ? "btn-club" : "btn-ghost"}`}
                >
                  <div className="text-2xl">{l.flag}</div>
                  <div className="leading-tight">{l.name}</div>
                  <div className="text-[10px] font-semibold opacity-70">{l.vibe}</div>
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {clubs.map((c) => (
                <button key={c.id} onClick={() => setClubId(c.id)} className={`btn flex items-center gap-3 p-3 text-left ${club.id === c.id ? "ring-4 ring-amber-300" : ""}`} style={{ background: `linear-gradient(135deg, ${c.c1}, ${c.c1}cc 60%, ${c.c2}88)` }}>
                  <Crest club={c} size={40} />
                  <div style={{ color: ink(c.c1) }}>
                    <div className="leading-tight">{c.name}</div>
                    <div className="text-xs opacity-80">{c.city}</div>
                    <Stars n={clubStars(c.strength)} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <Btn kind="gold" className="py-5 text-2xl" onClick={start}>
            FIRMAR CONTRATO ✍️
          </Btn>
        </div>
      </div>
    </div>
  );
}
