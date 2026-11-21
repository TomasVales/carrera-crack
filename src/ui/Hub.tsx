import { useState } from "react";
import { LEAGUE_NAME, POS_INFO, STAT_INFO, STAT_KEYS, club, fmtMoney, type StatKey } from "../game/data";
import { avgRating, marketValue, myFixture, ovr, rounds, standings, topScorers, xpNeeded, type Career } from "../game/career";
import { isMuted, setMuted, sfx } from "../game/audio";
import { Avatar, Bar, Btn, Crest, Stars, clubStars, statColor } from "./common";

type Tab = "tabla" | "goleadores" | "noticias" | "vitrina";

export default function Hub({ c, onPlay, onSim, onSpend, onQuit }: { c: Career; onPlay: () => void; onSim: () => void; onSpend: (k: StatKey) => void; onQuit: () => void }) {
  const [tab, setTab] = useState<Tab>("tabla");
  const [muted, setM] = useState(isMuted());
  const p = c.player;
  const cl = club(c.clubId);
  const fx = myFixture(c);
  const home = fx?.home === c.clubId;
  const rival = fx ? club(home ? fx.away : fx.home) : null;
  const table = standings(c);
  const pos = table.findIndex((r) => r.id === c.clubId) + 1;
  const kit = { c1: cl.c1, c2: cl.c2, num: p.number };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 pb-10">
      {/* Encabezado */}
      <header className="card rise flex items-center gap-3 p-3">
        <Crest club={cl} size={46} />
        <div className="min-w-0 flex-1">
          <div className="title-font truncate text-xl leading-tight">{cl.name}</div>
          <div className="text-xs font-bold text-white/60">
            {LEAGUE_NAME} · Temporada {c.season} · Fecha {Math.min(c.round + 1, rounds(c))}/{rounds(c)} · {pos}° puesto
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <div className="text-lg font-black text-emerald-300">{fmtMoney(p.money)}</div>
          <div className="text-xs text-white/60">Sueldo {fmtMoney(c.contract.salary)}/sem · {c.contract.years} años</div>
        </div>
        <button
          className="btn btn-ghost h-10 w-10"
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          onClick={() => {
            setMuted(!muted);
            setM(!muted);
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button className="btn btn-ghost h-10 w-10" aria-label="Salir al menú" onClick={onQuit}>
          ⏏
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr_340px]">
        {/* Tarjeta del jugador */}
        <section className="card rise overflow-hidden">
          <div className="relative flex items-end justify-center pt-3" style={{ background: `linear-gradient(160deg, ${cl.c1}, ${cl.c1}99 55%, ${cl.c2}66)` }}>
            <div className="absolute left-4 top-3 text-center drop-shadow">
              <div className="title-font text-5xl leading-none">{ovr(c)}</div>
              <div className="text-sm font-black">{p.pos}</div>
            </div>
            <div className="absolute right-3 top-3 flex flex-col items-end gap-1 text-xs font-black">
              {p.fire > 0 && <span className="rounded-full bg-orange-500 px-2 py-0.5">🔥 Racha x{p.fire}</span>}
              {p.injured > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5">🩼 {p.injured} part.</span>}
              <span className="rounded-full bg-black/40 px-2 py-0.5">{c.contract.role === "titular" ? "Titular" : "Suplente"}</span>
            </div>
            <Avatar look={p.look} kit={kit} size={190} />
          </div>
          <div className="p-4">
            <div className="title-font text-2xl leading-tight">{p.nick || p.name}</div>
            <div className="text-sm text-white/60">
              {p.name} · {p.age} años · {POS_INFO[p.pos].name}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold">
              <span className="rounded-md bg-white/10 px-2 py-1">Nv {p.level}</span>
              <div className="flex-1">
                <Bar value={p.xp} max={xpNeeded(p.level)} color="#a78bfa" />
              </div>
              <span className="text-white/50">
                {p.xp}/{xpNeeded(p.level)} XP
              </span>
            </div>
            {p.points > 0 && <div className="shine mt-3 rounded-xl bg-violet-600 px-3 py-2 text-center text-sm font-black">¡Tenés {p.points} puntos para mejorar! Tocá +</div>}
            <div className="mt-3 grid gap-2">
              {STAT_KEYS.map((k) => (
                <div key={k} className="grid grid-cols-[38px_1fr_28px_28px] items-center gap-2 text-sm">
                  <span className="font-black text-white/70">{STAT_INFO[k].short}</span>
                  <Bar value={p.stats[k]} color={statColor(p.stats[k])} />
                  <span className="text-right font-black">{p.stats[k]}</span>
                  {p.points > 0 && p.stats[k] < 99 ? (
                    <button
                      className="btn btn-gold h-7 w-7 text-sm"
                      aria-label={`Mejorar ${STAT_INFO[k].name}`}
                      onClick={() => {
                        sfx.levelUp();
                        onSpend(k);
                      }}
                    >
                      +
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-bold">
              {[
                ["⚡ Energía", p.energy, "#38bdf8"],
                ["😄 Moral", p.morale, "#facc15"],
                ["⭐ Fama", p.fame, "#f472b6"],
                ["🧑‍💼 Relación DT", p.coach, "#34d399"],
              ].map(([label, v, col]) => (
                <div key={label as string}>
                  <div className="mb-1 flex justify-between text-white/70">
                    <span>{label}</span>
                    <span>{Math.round(v as number)}</span>
                  </div>
                  <Bar value={v as number} color={col as string} h={6} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="text-white/60">Valor de mercado</span>
              <b className="text-emerald-300">{fmtMoney(marketValue(c))}</b>
            </div>
          </div>
        </section>

        {/* Próximo partido */}
        <section className="flex flex-col gap-4">
          {fx && rival ? (
            <div className="card rise overflow-hidden">
              <div className="bg-black/30 px-4 py-2 text-center text-xs font-black uppercase tracking-widest text-white/60">
                Próximo partido · Fecha {c.round + 1} · {home ? "Local" : "Visitante"}
              </div>
              <div className="flex items-center justify-around gap-2 px-4 py-6">
                {[home ? cl : rival, home ? rival : cl].map((t, i) => (
                  <div key={t.id} className="flex w-32 flex-col items-center gap-2 text-center">
                    <Crest club={t} size={76} />
                    <div className="font-black leading-tight">{t.name}</div>
                    <Stars n={clubStars(t.strength)} />
                    <div className="text-xs text-white/50">{standings(c).findIndex((r) => r.id === t.id) + 1}° · {i === 0 ? "Local" : "Visita"}</div>
                  </div>
                ))}
              </div>
              <div className="title-font -mt-2 mb-3 text-center text-3xl text-white/30">VS</div>
              <div className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
                {p.injured > 0 ? (
                  <Btn kind="ghost" className="py-5 text-lg sm:col-span-2" onClick={onSim}>
                    🩼 Estás lesionado · Ver resultado
                  </Btn>
                ) : (
                  <>
                    <Btn kind="gold" className="py-5 text-2xl" onClick={onPlay}>
                      ⚽ JUGAR
                    </Btn>
                    <Btn kind="ghost" className="py-5 text-xl" onClick={onSim}>
                      ⏩ SIMULAR
                    </Btn>
                  </>
                )}
              </div>
              <p className="px-4 pb-4 text-center text-xs text-white/50">Jugando tus jugadas clave ganás más XP y mejor nota.</p>
            </div>
          ) : (
            <div className="card p-6 text-center">Temporada terminada</div>
          )}

          <div className="card rise grid grid-cols-4 gap-2 p-4 text-center">
            {[
              ["PJ", c.seasonStats.pj],
              ["Goles", c.seasonStats.goals],
              ["Asist.", c.seasonStats.assists],
              ["Nota", c.seasonStats.pj ? avgRating(c).toFixed(1) : "–"],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="title-font text-3xl">{v}</div>
                <div className="text-xs font-bold text-white/50">{l}</div>
              </div>
            ))}
          </div>

          <div className="card rise hidden p-4 text-sm text-white/70 lg:block">
            <div className="mb-2 font-black text-white">🎮 Controles</div>
            <div className="grid grid-cols-2 gap-1">
              <span><b className="text-white">WASD</b> / flechas: mover</span>
              <span><b className="text-white">Shift</b>: correr</span>
              <span><b className="text-white">Espacio</b>: patear (mantené)</span>
              <span><b className="text-white">E</b>: pase / pedirla</span>
              <span><b className="text-white">Q</b>: amague</span>
            </div>
          </div>
        </section>

        {/* Pestañas */}
        <section className="card rise flex flex-col overflow-hidden">
          <div className="grid grid-cols-4 bg-black/30 text-xs font-black">
            {(["tabla", "goleadores", "noticias", "vitrina"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-1 py-3 capitalize transition ${tab === t ? "bg-[var(--c1)] text-[var(--ink1)]" : "text-white/60"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="max-h-[520px] overflow-y-auto p-3">
            {tab === "tabla" && (
              <table className="w-full text-sm">
                <thead className="text-xs text-white/50">
                  <tr>
                    <th className="w-6 text-left">#</th>
                    <th className="text-left">Club</th>
                    <th>PJ</th>
                    <th>DG</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r, i) => {
                    const t = club(r.id);
                    const mine = r.id === c.clubId;
                    return (
                      <tr key={r.id} className={mine ? "bg-[var(--c1)]/30 font-black" : ""}>
                        <td className="py-1.5 pl-1">{i + 1}</td>
                        <td className="flex items-center gap-2 py-1.5">
                          <Crest club={t} size={20} />
                          <span className="truncate">{t.name}</span>
                        </td>
                        <td className="text-center">{r.pj}</td>
                        <td className="text-center">{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
                        <td className="text-center font-black">{r.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {tab === "goleadores" && (
              <ol className="grid gap-1.5">
                {topScorers(c).map((s, i) => (
                  <li key={s.name} className={`flex items-center justify-between rounded-lg px-3 py-2 ${s.name === (p.nick || p.name) ? "bg-[var(--c1)]/40 font-black" : "bg-white/5"}`}>
                    <span>
                      {i + 1}. {s.name}
                    </span>
                    <b>{s.goals} ⚽</b>
                  </li>
                ))}
              </ol>
            )}
            {tab === "noticias" && (
              <ul className="grid gap-2">
                {c.news.map((n, i) => (
                  <li key={i} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <div className="text-[10px] font-black uppercase text-white/40">
                      T{n.season} · Fecha {n.round}
                    </div>
                    {n.text}
                  </li>
                ))}
              </ul>
            )}
            {tab === "vitrina" && (
              <div className="grid gap-2">
                {c.trophies.length === 0 && <p className="p-4 text-center text-sm text-white/50">Todavía no hay trofeos. ¡A ganarlos!</p>}
                {c.trophies.map((t, i) => (
                  <div key={i} className="rounded-lg bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">
                    {t}
                  </div>
                ))}
                <div className="mt-2 text-xs font-bold text-white/50">
                  Carrera: {c.totals.pj} PJ · {c.totals.goals} goles · {c.totals.assists} asistencias
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
