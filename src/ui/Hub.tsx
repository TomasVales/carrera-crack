import { useRef, useState, type ReactNode } from "react";
import { BASE_STRENGTH, CELEBRATIONS, LEAGUES, NATIONS, POS_INFO, SHOP, STAT_INFO, STAT_KEYS, club, fmtMoney, league, type StatKey, type Team } from "../game/data";
import {
  ACHIEVEMENTS, AGENTS, MOVES, agentFee, challengeProgress, drillDone, leagueZones, tableZone, agentOf, agentSwitchCost, avgRating, exportCareer, has, marketValue, matchInfo, matchRole, myLeague, myName, ovr, squadOf, stageName, standings, topScorers, xpNeeded, SQUAD_POS, type SquadPos,
  type Career, type Cup, type CupKey, type NewsTag,
} from "../game/career";
import { isMuted, setMuted, sfx } from "../game/audio";
import { DIFF_NAMES, TUTORIAL_PLAYS, setSetting, settings, type Difficulty } from "../game/settings";
import { Avatar, Bar, Btn, Crest, CrestEditor, Stars, clubStars, statColor } from "./common";
import { shareCareerCard } from "./shareCard";

type Tab = "inicio" | "jugador" | "plantel" | "ligas" | "noticias" | "tienda" | "vitrina" | "opciones";
const TABS: { id: Tab; icon: string; name: string }[] = [
  { id: "inicio", icon: "🏠", name: "Inicio" },
  { id: "jugador", icon: "🧍", name: "Jugador" },
  { id: "plantel", icon: "👥", name: "Plantel" },
  { id: "ligas", icon: "🏆", name: "Ligas" },
  { id: "noticias", icon: "📰", name: "Noticias" },
  { id: "tienda", icon: "🛍️", name: "Tienda" },
  { id: "vitrina", icon: "🏅", name: "Vitrina" },
  { id: "opciones", icon: "⚙️", name: "Opciones" },
];

export type HubActions = {
  onPlay: () => void;
  onSim: () => void;
  onSimMany: () => void;
  onSpend: (k: StatKey) => void;
  onFocus: (f: StatKey | "descanso") => void;
  onBuy: (id: string) => string;
  onEquip: (id: string) => void;
  onPractice: () => void;
  onQuit: () => void;
  onImport: (text: string) => string | null;
  onDelete: () => void;
  onAgent: (id: string) => string;
  onDrill: () => void;
};

export default function Hub({ c, actions, locked = false }: { c: Career; actions: HubActions; locked?: boolean }) {
  const [tab, setTab] = useState<Tab>("inicio");

  const [muted, setM] = useState(isMuted());
  const p = c.player;
  const cl = club(c.clubId);

  return (
    <div className={`mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 pb-28 md:pb-10 ${locked ? "pointer-events-none" : ""}`}>
      <header className="card rise flex items-center gap-3 p-3">
        <Crest club={cl} size={46} />
        <div className="min-w-0 flex-1">
          <div className="title-font truncate text-xl leading-tight">{cl.name}</div>
          <div className="truncate text-xs font-bold text-white/60">
            {league(cl.league).flag} {league(cl.league).name} · Temporada {c.season} · {p.age} años
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-emerald-300">{fmtMoney(p.money)}</div>
          <div className="hidden text-xs text-white/60 sm:block">{fmtMoney(c.contract.salary)}/sem</div>
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
      </header>

      {/* pestañas: arriba en compu, abajo en el celu */}
      <nav className="card fixed inset-x-2 bottom-2 z-30 grid grid-cols-8 gap-0.5 p-1 md:static md:inset-auto md:flex md:gap-2 md:p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              sfx.click();
              setTab(t.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`relative flex flex-col items-center rounded-xl px-1 py-1.5 text-[10px] font-black transition md:flex-row md:gap-2 md:px-4 md:py-2 md:text-sm ${tab === t.id ? "bg-[var(--c1)] text-[var(--ink1)]" : "text-white/60 hover:bg-white/5"}`}
          >
            <span className="text-lg md:text-base">{t.icon}</span>
            {t.name}
            {t.id === "jugador" && p.points > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />}
          </button>
        ))}
      </nav>

      <div key={tab} className="rise">
        {tab === "inicio" && <Inicio c={c} actions={actions} go={setTab} />}
        {tab === "jugador" && <Jugador c={c} actions={actions} />}
        {tab === "plantel" && <Plantel c={c} />}
        {tab === "ligas" && <Ligas c={c} />}
        {tab === "noticias" && <Noticias c={c} />}
        {tab === "tienda" && <Tienda c={c} actions={actions} />}
        {tab === "vitrina" && <Vitrina c={c} />}
        {tab === "opciones" && <Opciones c={c} actions={actions} />}
      </div>
    </div>
  );
}

function Card({ title, children, className = "", right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={`card p-4 ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-black">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

// ---------- Inicio ----------

function Inicio({ c, actions, go }: { c: Career; actions: HubActions; go: (t: Tab) => void }) {
  const p = c.player;
  const m = matchInfo(c);
  const role = matchRole(c);
  const table = standings(c);
  const myPos = table.findIndex((r) => r.id === c.clubId) + 1;
  const top = c.news.find((n) => n.big) ?? c.news[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        {m ? (
          <section className="card overflow-hidden">
            <div className={`px-4 py-2 text-center text-xs font-black uppercase tracking-widest ${m.knockout ? "bg-amber-400 text-slate-900" : "bg-black/30 text-white/70"}`}>
              {m.label} · {m.isHome ? "Local" : "Visitante"}
              {m.knockout && " · ¡Mata-mata!"}
            </div>
            {m.derby && <div className="bg-orange-500 px-4 py-1.5 text-center text-sm font-black uppercase tracking-widest text-white">🔥 {m.derby}</div>}
            <div className="flex items-center justify-around gap-2 px-4 py-5">
              {[m.home, m.away].map((t, i) => (
                <div key={t.id} className="flex w-32 flex-col items-center gap-2 text-center">
                  <Crest club={t} size={76} />
                  <div className="font-black leading-tight">{t.name}</div>
                  <Stars n={clubStars(t.strength)} />
                  <div className="text-xs text-white/50">{i === 0 ? t.stadium : "Visitante"}</div>
                </div>
              ))}
            </div>
            <div className={`mx-4 mb-3 rounded-xl px-3 py-2 text-center text-sm font-bold ${role.role === "titular" ? "bg-emerald-500/15 text-emerald-200" : "bg-orange-500/15 text-orange-200"}`}>
              {role.role === "titular" ? "✅ Titular" : "🪑 Suplente"} · {role.why}
            </div>
            <div className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
              {p.injured > 0 ? (
                <Btn kind="ghost" className="py-5 text-lg sm:col-span-2" onClick={actions.onSim}>
                  🩼 Lesionado ({p.injured}) · Ver resultado
                </Btn>
              ) : (
                <>
                  <Btn kind="gold" className="py-5 text-2xl" onClick={actions.onPlay}>⚽ JUGAR</Btn>
                  <Btn kind="ghost" className="py-5 text-xl" onClick={actions.onSim}>⏩ SIMULAR</Btn>
                </>
              )}
              <button className="btn btn-ghost py-2 text-xs sm:col-span-2" onClick={actions.onSimMany}>⏭️ Simular varios partidos (frena en eventos, mercado o puntos)</button>
            </div>
          </section>
        ) : (
          <div className="card p-6 text-center">Temporada terminada</div>
        )}

        {p.points > 0 && (
          <button onClick={() => go("jugador")} className="shine card rounded-2xl bg-violet-600 p-4 text-center font-black">
            ⬆️ Tenés {p.points} puntos para mejorar tu jugador → Jugador
          </button>
        )}

        <Training c={c} actions={actions} />
        <Challenges c={c} />

        {top && (
          <button onClick={() => go("noticias")} className="rounded-2xl bg-[#f5efe0] p-4 text-left text-slate-900 shadow-xl">
            <div className="border-b-2 border-slate-900 pb-1 font-serif text-xs font-black uppercase tracking-widest">Portada · La Gazzetta dello Stivale</div>
            <div className="mt-2 font-serif text-xl font-black leading-tight">{top.text}</div>
            <div className="mt-2 text-xs font-bold text-slate-500">Ver todas las noticias →</div>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Card title="Tu temporada">
          <div className="grid grid-cols-4 gap-2 text-center">
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
        </Card>
        <ClubCard c={c} go={go} />
        <Card title={`${league(myLeague(c)).flag} ${league(myLeague(c)).name}`} right={<span className="text-xs font-bold text-white/50">{myPos}° puesto</span>}>
          <MiniTable c={c} leagueId={myLeague(c)} limit={6} />
          <button className="mt-2 w-full text-center text-xs font-bold text-white/50" onClick={() => go("ligas")}>Ver todas las ligas →</button>
        </Card>
      </div>
    </div>
  );
}

function Training({ c, actions }: { c: Career; actions: HubActions }) {
  const p = c.player;
  const opts: (StatKey | "descanso")[] = [...STAT_KEYS, "descanso"];
  return (
    <Card title="🏋️ Plan de la semana" right={has(c, "pf") ? <span className="text-xs font-bold text-emerald-300">Preparador físico +50%</span> : undefined}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {opts.map((o) => {
          const sel = p.focus === o;
          const prog = o === "descanso" ? null : p.train[o] ?? 0;
          return (
            <button key={o} onClick={() => actions.onFocus(o)} className={`btn flex flex-col items-center gap-1 p-2 text-xs ${sel ? "btn-club" : "btn-ghost"}`}>
              <span className="text-xl">{o === "descanso" ? "😴" : STAT_INFO[o].icon}</span>
              <span className="leading-tight">{o === "descanso" ? "Descanso" : STAT_INFO[o].train}</span>
              {prog !== null ? <Bar value={prog * 100} color="#a78bfa" h={4} /> : <span className="text-[10px] opacity-70">+energía</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-white/50">Cada partido entrenás lo que elijas: cuando se llena la barra, +1 a esa habilidad. El descanso recupera energía.</p>
      <Btn kind={drillDone(c) ? "ghost" : "club"} className="mt-3 w-full py-3 text-sm" disabled={drillDone(c)} onClick={actions.onDrill}>
        {drillDone(c) ? "✅ Entrenamiento especial hecho esta semana" : "🎯 Entrenamiento especial: tiro al blanco (30 seg.)"}
      </Btn>
    </Card>
  );
}

function MiniTable({ c, leagueId, limit = 30, onTeam }: { c: Career; leagueId: string; limit?: number; onTeam?: (t: Team) => void }) {
  const table = standings(c, leagueId).slice(0, limit);
  const zones = leagueZones(leagueId);
  const shown = zones.filter((z) => z.from <= table.length);
  return (
    <>
    <table className="w-full text-sm">
      <thead className="text-xs text-white/50">
        <tr>
          <th className="w-6 text-left">#</th>
          <th className="text-left">Club</th>
          <th>PJ</th>
          <th>G-E-P</th>
          <th>DG</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {table.map((r, i) => {
          const t = club(r.id);
          const mine = r.id === c.clubId;
          return (
            <tr key={r.id} onClick={() => onTeam?.(t)} className={`${onTeam ? "cursor-pointer hover:bg-white/5" : ""} ${mine ? "bg-[var(--c1)]/30 font-black" : i === 0 ? "text-amber-200" : ""}`}>
              <td className="py-1.5 pl-1.5" style={zoneBorder(tableZone(leagueId, i))} title={tableZone(leagueId, i)?.name}>{i === 0 ? "👑" : i + 1}</td>
              <td className="py-1.5">
                <span className="flex items-center gap-2">
                  <Crest club={t} size={20} />
                  <span className="truncate">{t.name}</span>
                </span>
              </td>
              <td className="text-center">{r.pj}</td>
              <td className="text-center text-xs text-white/60">{r.g}-{r.e}-{r.p}</td>
              <td className="text-center">{r.dg > 0 ? `+${r.dg}` : r.dg}</td>
              <td className="text-center font-black">{r.pts}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
    {shown.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/60">
        {shown.map((z) => (
          <span key={z.name} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-1 rounded-full" style={{ background: z.color }} />
            {z.icon} {z.name} ({z.from === z.to ? `${z.from}°` : `${z.from}° al ${z.to}°`})
          </span>
        ))}
        <span className="w-full text-white/40">Clasifican a la próxima temporada según la tabla final.</span>
      </div>
    )}
    </>
  );
}

const zoneBorder = (z: { color: string } | null) => (z ? { boxShadow: `inset 3px 0 0 ${z.color}` } : undefined);

// ---------- Jugador ----------

function Jugador({ c, actions }: { c: Career; actions: HubActions }) {
  const p = c.player;
  const cl = club(c.clubId);
  const kit = { c1: cl.c1, c2: cl.c2, num: p.number };
  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <section className="card overflow-hidden">
        <div className="relative flex items-end justify-center pt-3" style={{ background: `linear-gradient(160deg, ${cl.c1}, ${cl.c1}99 55%, ${cl.c2}66)` }}>
          <div className="absolute left-4 top-3 text-center drop-shadow">
            <div className="title-font text-5xl leading-none">{ovr(c)}</div>
            <div className="text-sm font-black">{p.pos}</div>
          </div>
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1 text-xs font-black">
            {p.fire > 0 && <span className="rounded-full bg-orange-500 px-2 py-0.5">🔥 Racha x{p.fire}</span>}
            {p.injured > 0 && <span className="rounded-full bg-rose-600 px-2 py-0.5">🩼 {p.injured} part.</span>}
            {c.flags.socio ? <span className="rounded-full bg-sky-600 px-2 py-0.5">🤝 Socio</span> : null}
            {c.idols?.includes(c.clubId) ? <span className="rounded-full bg-amber-500 px-2 py-0.5 text-slate-900">🎶 Ídolo</span> : null}
            {c.loan ? <span className="rounded-full bg-violet-600 px-2 py-0.5">🔁 Préstamo</span> : null}
          </div>
          <Avatar look={p.look} kit={kit} size={200} />
        </div>
        <div className="p-4">
          <div className="title-font text-2xl leading-tight">{myName(c)}</div>
          <div className="text-sm text-white/60">
            {p.name} · {p.age} años · {POS_INFO[p.pos].name} · {NATIONS.find((n) => n.id === p.nation)?.name}
            {c.loan && <span className="mt-1 block font-bold text-violet-200">🔁 A préstamo desde {club(c.loan.parentId).name} hasta el final de la T{c.loan.until}</span>}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold">
            <span className="rounded-md bg-white/10 px-2 py-1">Nv {p.level}</span>
            <div className="flex-1">
              <Bar value={p.xp} max={xpNeeded(p.level)} color="#a78bfa" />
            </div>
            <span className="text-white/50">{p.xp}/{xpNeeded(p.level)} XP</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-bold">
            {([
              ["⚡ Energía", p.energy, "#38bdf8"],
              ["😄 Moral", p.morale, "#facc15"],
              ["⭐ Fama", p.fame, "#f472b6"],
              ["🧑‍💼 Relación DT", p.coach, "#34d399"],
            ] as const).map(([label, v, col]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-white/70">
                  <span>{label}</span>
                  <span>{Math.round(v)}</span>
                </div>
                <Bar value={v} color={col} h={6} />
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-white/50">Festejo: {CELEBRATIONS[p.celebration] ?? "Salto con puño"} (cambialo en la Tienda)</div>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <Card title="Habilidades" right={p.points > 0 ? <span className="shine rounded-full bg-violet-600 px-3 py-1 text-xs font-black">{p.points} puntos</span> : undefined}>
          <div className="grid gap-3">
            {STAT_KEYS.map((k) => (
              <div key={k} className="grid grid-cols-[110px_1fr_34px_34px] items-center gap-2 text-sm">
                <div>
                  <div className="font-black">{STAT_INFO[k].name}</div>
                  <div className="text-[11px] leading-tight text-white/50">{STAT_INFO[k].desc}</div>
                </div>
                <div>
                  <Bar value={p.stats[k]} color={statColor(p.stats[k])} h={10} />
                  <div className="mt-1">
                    <Bar value={(p.train[k] ?? 0) * 100} color="#a78bfa" h={3} />
                  </div>
                </div>
                <span className="text-right text-lg font-black">{p.stats[k]}</span>
                {p.points > 0 && p.stats[k] < 99 ? (
                  <button className="btn btn-gold h-8 w-8" aria-label={`Mejorar ${STAT_INFO[k].name}`} onClick={() => { sfx.levelUp(); actions.onSpend(k); }}>+</button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/50">La barrita violeta es el progreso del entrenamiento de cada habilidad.</p>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="📄 Contrato">
            <Row k="Club" v={club(c.clubId).name} />
            <Row k="Sueldo" v={`${fmtMoney(c.contract.salary)} / semana`} />
            <Row k="Años restantes" v={String(c.contract.years)} />
            <Row k="Rol prometido" v={c.contract.role === "titular" ? "Titular" : "Suplente"} />
            <Row k="Cláusula" v={fmtMoney(c.contract.clause)} />
            <Row k="Valor de mercado" v={fmtMoney(marketValue(c))} strong />
          </Card>
          <Card title="⚔️ Competencia">
            {c.rival ? (
              <>
                <Row k="Rival por el puesto" v={c.rival.name} />
                <Row k="Su valoración" v={String(c.rival.ovr)} />
                <Row k="La tuya" v={String(ovr(c))} strong />
                <p className="mt-2 text-xs text-white/50">El DT elige entre los dos según nivel y relación.</p>
              </>
            ) : (
              <p className="text-sm text-white/60">No tenés un rival directo. Competís con el nivel del plantel ({club(c.clubId).strength - 6}).</p>
            )}
            <div className="mt-3 border-t border-white/10 pt-3">
              <Row k={`Selección (${NATIONS.find((n) => n.id === p.nation)?.short})`} v={`${p.caps} PJ · ${p.natGoals} goles`} />
              <Row k="Balones de Oro" v={p.ballonDor ? "🥇".repeat(Math.min(p.ballonDor, 8)) : "0"} />
            </div>
          </Card>
          <AgentCard c={c} actions={actions} />
          <NemesisCard c={c} />
          <MovesCard c={c} />
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2 py-1 text-sm">
      <span className="text-white/60">{k}</span>
      <span className={strong ? "font-black text-emerald-300" : "font-bold"}>{v}</span>
    </div>
  );
}

// ---------- Ligas ----------

function Ligas({ c }: { c: Career }) {
  const [sel, setSel] = useState<string>(myLeague(c));
  const [edit, setEdit] = useState<Team | null>(null);
  const isLeague = LEAGUES.some((l) => l.id === sel);
  const cups = (["copa", "cont", "nac"] as CupKey[]).map((k) => c.cups[k]).filter((x): x is Cup => !!x);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cups.map((cup) => (
          <button key={cup.key} onClick={() => setSel(cup.key)} className={`btn shrink-0 px-4 py-2 text-sm ${sel === cup.key ? "btn-club" : "btn-ghost"}`}>{cup.icon} {cup.name}</button>
        ))}
        {LEAGUES.map((l) => (
          <button key={l.id} onClick={() => setSel(l.id)} className={`btn shrink-0 px-4 py-2 text-sm ${sel === l.id ? "btn-club" : "btn-ghost"}`}>
            {l.flag} {l.name} {l.id === myLeague(c) && "⭐"}
          </button>
        ))}
      </div>
      {isLeague ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card title={`${league(sel).flag} ${league(sel).name}`} right={<span className="text-xs font-bold text-white/50">Fecha {c.leagues[sel].round}/{c.leagues[sel].fixtures.length} · tocá un club para su escudo</span>}>
            <MiniTable c={c} leagueId={sel} onTeam={setEdit} />
          </Card>
          <div className="flex flex-col gap-4">
            <Card title="👟 Goleadores">
              <ol className="grid gap-1.5">
                {topScorers(c, sel).map((s, i) => (
                  <li key={s.name} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${s.me ? "bg-[var(--c1)]/40 font-black" : "bg-white/5"}`}>
                    <span>{i + 1}. {s.name}</span>
                    <b>{s.goals} ⚽</b>
                  </li>
                ))}
                {topScorers(c, sel).length === 0 && <li className="text-sm text-white/50">Todavía no hay goles.</li>}
              </ol>
            </Card>
            <Card title="Últimos resultados">
              {c.leagues[sel].last.length === 0 ? (
                <p className="text-sm text-white/50">La liga todavía no arrancó.</p>
              ) : (
                <ul className="grid gap-1.5">
                  {c.leagues[sel].last.map((f) => <Result key={f.home} f={f} mine={c.clubId} />)}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Bracket cup={c.cups[sel as CupKey]!} mine={sel === "nac" ? c.player.nation : c.clubId} />
      )}
      {edit && <CrestEditor club={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Result({ f, mine }: { f: { home: string; away: string; hg?: number; ag?: number; pens?: boolean; win?: string }; mine: string }) {
  const h = club(f.home), a = club(f.away);
  const played = f.hg !== undefined;
  const isMine = f.home === mine || f.away === mine;
  return (
    <li className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${isMine ? "bg-[var(--c1)]/30 font-black" : "bg-white/5"}`}>
      <span className={`flex items-center justify-end gap-1.5 truncate ${f.win === f.home ? "text-amber-200" : ""}`}>{h.short} <Crest club={h} size={18} /></span>
      <span className="rounded bg-black/40 px-2 font-black tabular-nums">{played ? `${f.hg}-${f.ag}` : "vs"}{f.pens ? " (p)" : ""}</span>
      <span className={`flex items-center gap-1.5 truncate ${f.win === f.away ? "text-amber-200" : ""}`}><Crest club={a} size={18} /> {a.short}</span>
    </li>
  );
}

function Bracket({ cup, mine }: { cup: Cup; mine: string }) {
  return (
    <Card title={`${cup.icon} ${cup.name}`} right={cup.champion ? <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-900">Campeón: {club(cup.champion).name}</span> : cup.alive ? <span className="text-xs font-bold text-emerald-300">Seguís en carrera</span> : <span className="text-xs font-bold text-rose-300">Eliminado</span>}>
      <div className={`grid gap-4 ${cup.total === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        {Array.from({ length: cup.total }, (_, s) => (
          <div key={s}>
            <div className="mb-2 text-xs font-black uppercase tracking-widest text-white/50">{stageName(cup, s)}</div>
            <ul className="grid gap-1.5">
              {(cup.stages[s] ?? []).map((f, i) => <Result key={i} f={f} mine={mine} />)}
              {!cup.stages[s] && <li className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/40">Por definirse</li>}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Noticias ----------

const TAGS: { id: NewsTag | "todas"; name: string; color: string }[] = [
  { id: "todas", name: "Todas", color: "#64748b" },
  { id: "partido", name: "⚽ Partidos", color: "#16a34a" },
  { id: "liga", name: "🏆 Liga", color: "#ca8a04" },
  { id: "mundo", name: "🌍 Mundo", color: "#0284c7" },
  { id: "mercado", name: "🔁 Mercado", color: "#7c3aed" },
  { id: "rumor", name: "🤫 Rumores", color: "#db2777" },
  { id: "seleccion", name: "🎽 Selección", color: "#0891b2" },
  { id: "hito", name: "⭐ Hitos", color: "#ea580c" },
  { id: "vida", name: "😎 Vida", color: "#4f46e5" },
];

function Noticias({ c }: { c: Career }) {
  const [f, setF] = useState<NewsTag | "todas">("todas");
  const list = c.news.filter((n) => f === "todas" || n.tag === f);
  const [lead, ...rest] = list;
  const tagOf = (t: NewsTag) => TAGS.find((x) => x.id === t)!;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TAGS.map((t) => (
          <button key={t.id} onClick={() => setF(t.id)} className={`btn shrink-0 px-3 py-1.5 text-xs ${f === t.id ? "btn-club" : "btn-ghost"}`}>
            {t.name}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-[#f5efe0] p-4 text-slate-900 shadow-xl sm:p-6">
        <div className="flex items-end justify-between border-b-4 border-double border-slate-900 pb-2">
          <div className="font-serif text-2xl font-black italic sm:text-4xl">La Gazzetta dello Stivale</div>
          <div className="text-right text-[10px] font-bold uppercase tracking-widest text-slate-600">Temporada {c.season}<br />Edición deportiva</div>
        </div>
        {!lead ? (
          <p className="py-8 text-center font-serif">No hay noticias en esta sección.</p>
        ) : (
          <>
            <article className="grid gap-3 border-b border-slate-400 py-4 sm:grid-cols-[1fr_auto]">
              <div>
                <span className="rounded px-2 py-0.5 text-[10px] font-black uppercase text-white" style={{ background: tagOf(lead.tag).color }}>{tagOf(lead.tag).name}</span>
                <h3 className="mt-2 font-serif text-2xl font-black leading-tight sm:text-3xl">{lead.text}</h3>
              </div>
              {lead.team && <Crest club={club(lead.team)} size={72} />}
            </article>
            <div className="grid gap-x-6 sm:grid-cols-2">
              {rest.map((n) => (
                <article key={n.n} className="flex gap-3 border-b border-slate-300 py-3">
                  {n.team && <Crest club={club(n.team)} size={30} />}
                  <div>
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-white" style={{ background: tagOf(n.tag).color }}>{tagOf(n.tag).name}</span>
                    <p className={`mt-1 font-serif leading-snug ${n.big ? "text-lg font-black" : "text-[15px] font-semibold"}`}>{n.text}</p>
                    <div className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">Temporada {n.season}</div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Tienda ----------

function Tienda({ c, actions }: { c: Career; actions: HubActions }) {
  const [msg, setMsg] = useState<string | null>(null);
  const p = c.player;
  const cl = club(c.clubId);
  const groups: { kind: string; name: string }[] = [
    { kind: "botines", name: "👟 Botines" },
    { kind: "festejo", name: "🎉 Festejos de gol" },
    { kind: "vincha", name: "🎽 Vinchas" },
    { kind: "vida", name: "🏠 Estilo de vida (con efectos en el juego)" },
  ];
  const equipped = (id: string) => {
    const it = SHOP.find((x) => x.id === id)!;
    if (it.kind === "botines") return p.look.boots === it.value;
    if (it.kind === "vincha") return p.look.band === it.value;
    if (it.kind === "festejo") return p.celebration === it.value;
    return true;
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="lg:sticky lg:top-4 lg:self-start">
        <div className="flex flex-col items-center gap-2">
          <Avatar look={p.look} kit={{ c1: cl.c1, c2: cl.c2, num: p.number }} size={180} celebrate={p.celebration} />
          <div className="text-sm text-white/60">Tu plata</div>
          <div className="title-font text-4xl text-emerald-300">{fmtMoney(p.money)}</div>
          {msg && <div className="pop rounded-xl bg-white/10 px-3 py-2 text-center text-sm font-bold">{msg}</div>}
        </div>
      </Card>
      <div className="flex flex-col gap-4">
        {groups.map((g) => (
          <Card key={g.kind} title={g.name}>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHOP.filter((it) => it.kind === g.kind).map((it) => {
                const owned = has(c, it.id);
                const can = p.money >= it.price;
                return (
                  <div key={it.id} className={`flex items-center gap-3 rounded-xl p-3 ${owned ? "bg-emerald-500/10" : "bg-white/5"}`}>
                    <div className="text-3xl">{it.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black leading-tight">{it.name}</div>
                      <div className="text-xs text-white/60">{it.desc}</div>
                    </div>
                    {owned ? (
                      it.kind === "vida" ? (
                        <span className="text-xs font-black text-emerald-300">✓ Tuyo</span>
                      ) : equipped(it.id) ? (
                        <span className="text-xs font-black text-emerald-300">✓ Puesto</span>
                      ) : (
                        <button className="btn btn-ghost px-3 py-2 text-xs" onClick={() => { sfx.click(); actions.onEquip(it.id); }}>Usar</button>
                      )
                    ) : (
                      <button
                        className={`btn px-3 py-2 text-xs ${can ? "btn-gold" : "btn-ghost opacity-50"}`}
                        onClick={() => {
                          const r = actions.onBuy(it.id);
                          if (r.startsWith("¡")) sfx.coins();
                          setMsg(r);
                        }}
                      >
                        {fmtMoney(it.price)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------- Vitrina ----------

function Vitrina({ c }: { c: Career }) {
  const p = c.player;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="🏆 Trofeos y premios">
        {c.trophies.length === 0 ? (
          <p className="p-4 text-center text-sm text-white/50">Todavía no hay trofeos. ¡A ganarlos!</p>
        ) : (
          <div className="grid gap-2">
            {c.trophies.map((t, i) => (
              <div key={i} className="rounded-lg bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">{t}</div>
            ))}
          </div>
        )}
      </Card>
      <div className="flex flex-col gap-4">
        <Card title="📊 Carrera">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["PJ", c.totals.pj],
              ["Goles", c.totals.goals],
              ["Asist.", c.totals.assists],
              ["Balones", p.ballonDor],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="title-font text-2xl">{v}</div>
                <div className="text-xs font-bold text-white/50">{l}</div>
              </div>
            ))}
          </div>
        </Card>
        <ShareCard c={c} />
        <CareerChart c={c} />
        <Achievements c={c} />
        <Card title="📅 Temporadas">
          {c.history.length === 0 ? (
            <p className="text-sm text-white/50">Tu primera temporada está en juego.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-white/50">
                <tr><th className="text-left">Temp.</th><th className="text-left">Club</th><th>Pos</th><th>PJ</th><th>G</th><th>A</th><th>Nota</th></tr>
              </thead>
              <tbody>
                {c.history.map((h) => (
                  <tr key={h.season}>
                    <td className="py-1">T{h.season} ({h.age})</td>
                    <td><span className="flex items-center gap-1.5"><Crest club={club(h.clubId)} size={16} />{club(h.clubId).short}</span></td>
                    <td className="text-center">{h.place}°</td>
                    <td className="text-center">{h.pj}</td>
                    <td className="text-center">{h.goals}</td>
                    <td className="text-center">{h.assists}</td>
                    <td className="text-center">{h.avg.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------- Opciones ----------

function Opciones({ c, actions }: { c: Career; actions: HubActions }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [paste, setPaste] = useState("");
  const file = useRef<HTMLInputElement>(null);

  function download() {
    const blob = new Blob([exportCareer(c)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carrera-${myName(c).replace(/\s+/g, "-").toLowerCase()}-T${c.season}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg("Archivo descargado. Guardalo en un lugar seguro.");
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(exportCareer(c));
      setMsg("Partida copiada. Pegala en una nota para tenerla de respaldo.");
    } catch {
      setMsg("No se pudo copiar. Usá el botón de descargar.");
    }
  }
  function doImport(text: string) {
    const err = actions.onImport(text);
    setMsg(err ?? "¡Partida cargada!");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="🎮 Entrenamiento libre">
        <p className="mb-3 text-sm text-white/60">Practicá los controles sin rival: remates, vaselina, comba y gambeta. No afecta tu carrera.</p>
        <Btn kind="gold" className="w-full py-3" onClick={actions.onPractice}>Ir a practicar</Btn>
      </Card>
      <GameSettings />
      <Card title="💾 Respaldo de la partida">
        <p className="mb-3 text-sm text-white/60">
          La partida se guarda sola en este dispositivo (ranura {c.slotId}). Si el navegador borra los datos, la perdés: hacé un respaldo de vez en cuando.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="club" className="py-3 text-sm" onClick={download}>⬇️ Descargar</Btn>
          <Btn kind="ghost" className="py-3 text-sm" onClick={copy}>📋 Copiar</Btn>
        </div>
        <div className="mt-3 grid gap-2">
          <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImport(await f.text()); }} />
          <Btn kind="ghost" className="py-3 text-sm" onClick={() => file.current?.click()}>⬆️ Cargar desde archivo</Btn>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="…o pegá acá una partida copiada" className="h-16 rounded-xl bg-white/10 p-2 text-xs outline-none" />
          <Btn kind="ghost" className="py-2 text-sm" disabled={!paste.trim()} onClick={() => doImport(paste)}>Cargar texto pegado</Btn>
        </div>
        {msg && <p className="pop mt-3 rounded-xl bg-white/10 p-3 text-sm font-bold">{msg}</p>}
      </Card>
      <Card title="🚪 Salir">
        <div className="grid gap-2">
          <Btn kind="ghost" className="py-3" onClick={actions.onQuit}>Volver al menú principal</Btn>
          <Btn kind="ghost" className="py-3 text-rose-300" onClick={() => { if (confirm("¿Borrar esta partida para siempre?")) actions.onDelete(); }}>🗑️ Borrar esta partida</Btn>
        </div>
      </Card>
    </div>
  );
}

// ---------- Representante ----------

function AgentCard({ c, actions }: { c: Career; actions: HubActions }) {
  const [msg, setMsg] = useState<string | null>(null);
  const cur = agentOf(c);
  const cost = agentSwitchCost(c);
  return (
    <Card title="🧑‍💼 Representante">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <div className="text-4xl">{cur.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="font-black">{cur.name}</div>
          <div className="text-xs text-white/60">{cur.desc}</div>
          <div className="mt-1 text-xs font-bold text-amber-200">Se queda con el {Math.round(agentFee(c) * 100)}% de lo que cobrás en el club</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-white/50">Un buen representante te trae más ofertas y mejores sueldos en el mercado.{cost ? ` Cambiar cuesta €${cost}k de rescisión.` : ""}</p>
      <div className="mt-2 grid gap-2">
        {AGENTS.filter((a) => a.id !== cur.id).map((a) => {
          const locked = c.player.fame < a.fame;
          return (
            <button
              key={a.id}
              disabled={locked}
              onClick={() => { if (confirm(`¿Contratar a ${a.name}?${cost ? ` Rescindir cuesta €${cost}k.` : ""}`)) setMsg(actions.onAgent(a.id)); }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${locked ? "bg-white/5 opacity-50" : "bg-white/10 hover:bg-white/15"}`}
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-black">{a.name} · {Math.round(a.fee * 100)}%</span>
                <span className="block text-xs text-white/60">{locked ? `🔒 Necesitás ${a.fame} de fama` : a.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
      {msg && <p className="pop mt-3 rounded-xl bg-white/10 p-3 text-sm font-bold">{msg}</p>}
    </Card>
  );
}

// ---------- Gráfico de la carrera ----------

type SeasonPoint = { season: number; age: number; avg: number | null; goals: number; awards: number; club: string; live: boolean };

function CareerChart({ c }: { c: Career }) {
  const pts: SeasonPoint[] = c.history.map((h) => ({ season: h.season, age: h.age, avg: h.pj ? h.avg : null, goals: h.goals, awards: h.awards.length, club: club(h.clubId).short, live: false }));
  if (c.seasonStats.pj && !c.retired) pts.push({ season: c.season, age: c.player.age, avg: avgRating(c), goals: c.seasonStats.goals, awards: 0, club: club(c.clubId).short, live: true });
  const [hover, setHover] = useState<number | null>(null);
  if (pts.length < 2) return null;

  const W = 320, H = 110, L = 26, R = 8, T = 10, B = 20;
  const PAD = 14;
  const x = (i: number) => L + PAD + (pts.length === 1 ? 0 : (i / (pts.length - 1)) * (W - L - R - PAD * 2));
  const ry = (v: number) => T + (1 - (v - 4) / 6) * (H - T - B); // nota de 4 a 10
  const gMax = Math.max(5, ...pts.map((p) => p.goals));
  const gy = (v: number) => T + (1 - v / gMax) * (H - T - B);
  const bw = Math.max(4, Math.min(18, (W - L - R) / pts.length - 4));
  const line = pts.map((p, i) => (p.avg === null ? null : `${x(i)},${ry(p.avg)}`)).filter(Boolean).join(" ");
  const h = hover !== null ? pts[hover] : null;
  const ACC = "#fbbf24";
  const step = Math.ceil(pts.length / 8);

  const axis = (ticks: number[], y: (v: number) => number) =>
    ticks.map((t) => (
      <g key={t}>
        <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.08)" />
        <text x={L - 5} y={y(t) + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,.5)">{t}</text>
      </g>
    ));
  const xLabels = pts.map((p, i) => (i % step === 0 || i === pts.length - 1 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.5)">T{p.season}</text> : null));
  const hits = (
    <g>
      {pts.map((_, i) => (
        <rect key={i} x={x(i) - (W - L - R) / pts.length / 2} y={0} width={(W - L - R) / pts.length} height={H} fill="transparent" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => setHover(i)} />
      ))}
    </g>
  );

  return (
    <Card title="📈 Tu carrera, temporada a temporada">
      <div className="mb-1 min-h-5 text-xs text-white/70" aria-live="polite">
        {h ? (
          <span><b className="text-white">T{h.season}</b> · {h.age} años · {h.club}{h.live ? " (en curso)" : ""} · Nota <b className="text-white">{h.avg?.toFixed(1) ?? "–"}</b> · <b className="text-white">{h.goals}</b> goles{h.awards ? ` · ${h.awards} premio${h.awards > 1 ? "s" : ""} ⭐` : ""}</span>
        ) : (
          <span className="text-white/50">Tocá o pasá por encima de una temporada para ver el detalle</span>
        )}
      </div>
      <div className="text-[11px] font-black uppercase tracking-widest text-white/50">Nota promedio</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Nota promedio por temporada">
        {axis([4, 6, 8, 10], ry)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="rgba(255,255,255,.3)" />}
        <polyline points={line} fill="none" stroke={ACC} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) =>
          p.avg === null ? null : (
            <g key={i}>
              <circle cx={x(i)} cy={ry(p.avg)} r={hover === i ? 5 : 4} fill={p.live ? "#0f172a" : ACC} stroke={p.live ? ACC : "#0f172a"} strokeWidth="2" />
              {p.awards > 0 && <text x={x(i)} y={ry(p.avg) - 8} textAnchor="middle" fontSize="9">⭐</text>}
            </g>
          ),
        )}
        {xLabels}
        {hits}
      </svg>
      <div className="mt-2 text-[11px] font-black uppercase tracking-widest text-white/50">Goles</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Goles por temporada">
        {axis([0, Math.round(gMax / 2), gMax], gy)}
        {pts.map((p, i) => {
          const top = gy(p.goals), base = gy(0);
          const hgt = Math.max(0, base - top);
          return hgt > 0 ? (
            <path key={i} d={`M${x(i) - bw / 2},${base} V${top + Math.min(4, hgt)} Q${x(i) - bw / 2},${top} ${x(i) - bw / 2 + Math.min(4, bw / 2)},${top} H${x(i) + bw / 2 - Math.min(4, bw / 2)} Q${x(i) + bw / 2},${top} ${x(i) + bw / 2},${top + Math.min(4, hgt)} V${base} Z`} fill={ACC} opacity={hover === null || hover === i ? (p.live ? 0.55 : 1) : 0.45} />
          ) : null;
        })}
        {xLabels}
        {hits}
      </svg>
      <p className="mt-1 text-[11px] text-white/40">⭐ temporada con premios · punto hueco = temporada en curso</p>
    </Card>
  );
}

// ---------- Tu club: fuerza que cambia con los resultados ----------

function ClubCard({ c, go }: { c: Career; go: (t: Tab) => void }) {
  const me = club(c.clubId);
  const base = BASE_STRENGTH[me.id] ?? me.strength;
  const pts = c.history.filter((h) => h.str !== undefined).map((h) => ({ season: h.season, v: h.str!, club: club(h.clubId).short, live: false }));
  pts.push({ season: c.season, v: me.strength, club: me.short, live: true });
  const [hover, setHover] = useState<number | null>(null);
  const moves = c.news.filter((n) => n.team === me.id && n.tag === "mercado" && /^(✍️|👋)/.test(n.text)).slice(0, 3);
  const diff = me.strength - base;

  const W = 320, H = 90, L = 26, R = 8, T = 10, B = 18, PAD = 12;
  const lo = Math.max(40, Math.min(...pts.map((p) => p.v)) - 4);
  const hi = Math.min(100, Math.max(...pts.map((p) => p.v)) + 4);
  const x = (i: number) => L + PAD + (pts.length === 1 ? (W - L - R - PAD * 2) / 2 : (i / (pts.length - 1)) * (W - L - R - PAD * 2));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ACC = "#34d399";
  const h = hover !== null ? pts[hover] : null;
  const step = Math.ceil(pts.length / 8);
  const ticks = [lo, Math.round((lo + hi) / 2), hi];

  return (
    <Card title="🏟️ Tu club" right={<Stars n={clubStars(me.strength)} />}>
      <div className="flex items-center gap-3">
        <Crest club={me} size={52} />
        <div className="flex-1">
          <div className="font-black leading-tight">{me.name}</div>
          <div className="text-xs text-white/50">Fuerza del plantel</div>
        </div>
        <div className="text-right">
          <div className="title-font text-4xl leading-none">{me.strength}</div>
          {diff !== 0 && <div className={`text-xs font-black ${diff > 0 ? "text-emerald-300" : "text-rose-300"}`}>{diff > 0 ? "▲ +" : "▼ "}{diff} desde el inicio</div>}
        </div>
      </div>
      {pts.length >= 2 && (
        <>
          <div className="mt-3 min-h-4 text-xs text-white/70" aria-live="polite">
            {h ? <span><b className="text-white">T{h.season}</b> · {h.club}{h.live ? " (ahora)" : ""} · fuerza <b className="text-white">{h.v}</b></span> : <span className="text-white/50">Ganá títulos y el club crece y ficha</span>}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Fuerza del club por temporada">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.08)" />
                <text x={L - 5} y={y(t) + 3} textAnchor="end" fontSize="8" fill="rgba(255,255,255,.5)">{t}</text>
              </g>
            ))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="rgba(255,255,255,.3)" />}
            <polyline points={pts.map((p, i) => `${x(i)},${y(p.v)}`).join(" ")} fill="none" stroke={ACC} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p.v)} r={hover === i ? 5 : 4} fill={p.live ? "#0f172a" : ACC} stroke={p.live ? ACC : "#0f172a"} strokeWidth="2" />
            ))}
            {pts.map((p, i) => (i % step === 0 || i === pts.length - 1 ? <text key={`l${i}`} x={x(i)} y={H - 5} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.5)">T{p.season}</text> : null))}
            {pts.map((_, i) => (
              <rect key={`h${i}`} x={x(i) - (W - L - R) / pts.length / 2} y={0} width={(W - L - R) / pts.length} height={H} fill="transparent" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => setHover(i)} />
            ))}
          </svg>
        </>
      )}
      {moves.length > 0 && (
        <div className="mt-2 grid gap-1">
          {moves.map((n, i) => <div key={i} className="rounded-lg bg-white/5 px-2 py-1.5 text-xs">{n.text}</div>)}
        </div>
      )}
      {pts.length < 2 && moves.length === 0 && <p className="mt-2 text-xs text-white/50">Al final de cada temporada el club sube o baja según los resultados. Si salís campeón y sos la figura, llegan refuerzos.</p>}
      <Btn kind="ghost" className="mt-3 w-full py-2 text-sm" onClick={() => go("plantel")}>👥 Ver plantel</Btn>
    </Card>
  );
}

// ---------- Plantel ----------

const TAG_STYLE: Record<string, { label: string; cls: string }> = {
  vos: { label: "VOS", cls: "bg-[var(--c1)] text-[var(--ink1)]" },
  estrella: { label: "⭐ Figura", cls: "bg-amber-400 text-slate-900" },
  fichaje: { label: "✍️ Fichaje", cls: "bg-emerald-500/25 text-emerald-200" },
  rival: { label: "⚔️ Rival", cls: "bg-orange-500/25 text-orange-200" },
  nemesis: { label: "😈 Némesis", cls: "bg-rose-500/25 text-rose-200" },
};

type SortKey = "pos" | "name" | "age" | "ovr" | "value" | "pj" | "goals" | "assists";
const COLS: { k: SortKey; label: string; cls?: string }[] = [
  { k: "pos", label: "Pos" },
  { k: "name", label: "Jugador", cls: "text-left" },
  { k: "age", label: "Edad", cls: "hidden text-center sm:table-cell" },
  { k: "ovr", label: "Nivel" },
  { k: "value", label: "Valor" },
  { k: "pj", label: "PJ" },
  { k: "goals", label: "G" },
  { k: "assists", label: "A" },
];
// 1-4-3-3 en la cancha (x, y en %; el arco propio abajo)
const PITCH: Record<SquadPos, [number, number][]> = {
  ARQ: [[50, 90]],
  DEF: [[14, 70], [38, 74], [62, 74], [86, 70]],
  MED: [[25, 48], [50, 53], [75, 48]],
  DEL: [[18, 22], [50, 16], [82, 22]],
};
const ovrColor = (v: number) => (v >= 85 ? "text-amber-300" : v >= 78 ? "text-emerald-300" : v >= 70 ? "text-sky-300" : "text-white/70");
const short = (n: string) => { const p = n.split(" "); return p.length > 1 ? p.slice(1).join(" ") : n; };

function Plantel({ c }: { c: Career }) {
  const clubId = c.clubId;
  const team = club(clubId);
  const list = squadOf(c, clubId);
  const [sort, setSort] = useState<{ k: SortKey; desc: boolean }>({ k: "pos", desc: false });
  const [edit, setEdit] = useState(false);
  const starters = list.filter((x) => x.starter);
  const total = list.reduce((a, x) => a + x.value, 0);
  const ages = (list.reduce((a, x) => a + x.age, 0) / list.length).toFixed(1);
  const avgStart = Math.round(starters.reduce((a, x) => a + x.ovr, 0) / Math.max(1, starters.length));
  const row = c.leagues[team.league]?.table[clubId];
  const pos = standings(c, team.league).findIndex((r) => r.id === clubId) + 1;
  const order: SquadPos[] = ["ARQ", "DEF", "MED", "DEL"];
  const sorted = [...list].sort((a, b) => {
    const k = sort.k;
    const v = k === "pos" ? order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr : k === "name" ? a.name.localeCompare(b.name) : (a[k] as number) - (b[k] as number);
    return sort.desc ? -v : v;
  });
  const top = (k: "goals" | "assists" | "value") => [...list].sort((a, b) => b[k] - a[k])[0];
  const leaders = [
    { icon: "⚽", label: "Goleador", p: top("goals"), v: (p: (typeof list)[number]) => `${p.goals} goles` },
    { icon: "🎯", label: "Asistidor", p: top("assists"), v: (p: (typeof list)[number]) => `${p.assists} asist.` },
    { icon: "💎", label: "Más valioso", p: top("value"), v: (p: (typeof list)[number]) => fmtMoney(p.value) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setEdit(true)} aria-label="Cambiar escudo" title="Cambiar escudo"><Crest club={team} size={60} /></button>
          <div className="min-w-0 flex-1">
            <div className="title-font truncate text-2xl leading-tight">{team.name}</div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span>{league(team.league).flag} {league(team.league).name}{pos ? ` · ${pos}° puesto` : ""}</span>
              <Stars n={clubStars(team.strength)} />
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {[
            ["Fuerza", team.strength],
            ["Titulares", avgStart],
            ["Valor", fmtMoney(total)],
            ["Edad prom.", ages],
            ["Goles", row?.gf ?? 0],
            ["Récord", row ? `${row.g}-${row.e}-${row.p}` : "–"],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-white/5 px-1 py-2">
              <div className="title-font text-xl leading-none sm:text-2xl">{v}</div>
              <div className="mt-1 text-[10px] font-bold uppercase text-white/50">{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Once titular · 1-4-3-3">
            <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-xl" style={{ background: "repeating-linear-gradient(0deg,#166534 0 10%,#15803d 10% 20%)" }}>
              <div className="absolute inset-2 rounded border-2 border-white/30" />
              <div className="absolute inset-x-2 top-1/2 border-t-2 border-white/30" />
              <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
              <div className="absolute bottom-2 left-1/2 h-[14%] w-1/2 -translate-x-1/2 border-2 border-b-0 border-white/30" />
              <div className="absolute left-1/2 top-2 h-[14%] w-1/2 -translate-x-1/2 border-2 border-t-0 border-white/30" />
              {order.flatMap((p) =>
                starters.filter((x) => x.pos === p).map((x, i) => {
                  const [px, py] = PITCH[p][i] ?? [50, 50];
                  return (
                    <div key={x.name} className="absolute flex w-[22%] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center" style={{ left: `${px}%`, top: `${py}%` }}>
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-black shadow-lg ${x.tag === "vos" ? "border-amber-300 ring-2 ring-amber-300" : "border-white/80"}`} style={{ background: team.c1, color: team.c2 }}>
                        {x.num}
                      </div>
                      <div className="mt-0.5 w-full truncate rounded bg-black/60 px-1 text-[10px] font-bold leading-tight">{x.tag === "vos" ? "VOS" : short(x.name)}</div>
                      <div className={`text-[11px] font-black leading-tight drop-shadow ${ovrColor(x.ovr)}`}>{x.ovr}</div>
                    </div>
                  );
                }),
              )}
            </div>
          </Card>
          <Card title="Figuras de la temporada">
            <div className="grid gap-2">
              {leaders.map(({ icon, label, p, v }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <span className="text-xl">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</div>
                    <div className="truncate font-bold">{p.tag === "vos" ? `${p.name} (vos)` : p.name}</div>
                  </div>
                  <b>{v(p)}</b>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="min-w-0" title={`Plantel completo · ${list.length} jugadores`} right={<span className="hidden text-[11px] text-white/50 sm:inline">Tocá una columna para ordenar</span>}>
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full text-sm sm:min-w-[480px]">
              <thead>
                <tr className="text-[11px] uppercase text-white/50">
                  <th className="hidden w-7 py-1 text-center sm:table-cell">#</th>
                  {COLS.map((col) => (
                    <th key={col.k} className={`py-1 ${col.cls ?? "text-center"}`}>
                      <button className={`font-black uppercase ${sort.k === col.k ? "text-white" : ""}`} onClick={() => setSort((s) => ({ k: col.k, desc: s.k === col.k ? !s.desc : col.k !== "pos" && col.k !== "name" }))}>
                        {col.label}{sort.k === col.k ? (sort.desc ? " ▼" : " ▲") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((x) => (
                  <tr key={x.name} className={`border-t border-white/5 ${x.tag === "vos" ? "bg-[var(--c1)]/25 font-black" : ""}`}>
                    <td className="hidden py-1.5 text-center text-xs text-white/50 sm:table-cell">{x.num}</td>
                    <td className="text-center">
                      <span className="inline-block w-9 rounded px-1 py-0.5 text-[10px] font-black text-white" style={{ background: SQUAD_POS[x.pos].color }} title={SQUAD_POS[x.pos].name}>{x.pos}</span>
                    </td>
                    <td className="max-w-[118px] py-1.5 pl-1 sm:max-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{x.name}</span>
                        {x.starter && <span className="text-[10px] text-emerald-300" title="Titular">●</span>}
                        {x.tag && <span className={`hidden shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black sm:inline ${TAG_STYLE[x.tag].cls}`}>{TAG_STYLE[x.tag].label}</span>}
                      </div>
                      <div className="truncate text-[11px] font-normal text-white/45">
                        <span className="sm:hidden">#{x.num} · {x.age} años{x.tag ? ` · ${TAG_STYLE[x.tag].label}` : ""}</span>
                        {x.note && <span className="hidden sm:inline">{x.note}</span>}
                      </div>
                    </td>
                    <td className="hidden text-center text-white/70 sm:table-cell">{x.age}</td>
                    <td className={`title-font text-center text-lg ${ovrColor(x.ovr)}`}>{x.ovr}</td>
                    <td className="text-center text-xs font-bold text-emerald-200">{fmtMoney(x.value)}</td>
                    <td className="text-center text-white/70">{x.pj}</td>
                    <td className="text-center font-bold">{x.goals || <span className="text-white/30">0</span>}</td>
                    <td className="text-center">{x.assists || <span className="text-white/30">0</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-white/40"><span className="sm:hidden">Tocá una columna para ordenar. </span>● titular · PJ, goles y asistencias de la liga en esta temporada · el valor sube con el nivel y baja con la edad</p>
        </Card>
      </div>
      {edit && <CrestEditor club={team} onClose={() => setEdit(false)} />}
    </div>
  );
}

// ---------- Ajustes de juego ----------

function GameSettings() {
  const [st, setSt] = useState(settings());
  function set<K extends keyof ReturnType<typeof settings>>(k: K, v: ReturnType<typeof settings>[K]) {
    setSetting(k, v);
    setSt(settings());
  }
  const canVibrate = typeof navigator !== "undefined" && "vibrate" in navigator;
  const Toggle = ({ on, onClick, label, hint }: { on: boolean; onClick: () => void; label: string; hint: string }) => (
    <button onClick={onClick} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{label}</span>
        <span className="block text-xs text-white/50">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-emerald-500" : "bg-white/20"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
  return (
    <Card title="⚙️ Juego">
      <div className="text-sm font-black">Dificultad de las jugadas</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DIFF_NAMES.map((n, i) => (
          <button key={n} onClick={() => set("difficulty", i as Difficulty)} className={`rounded-xl py-2 text-sm font-black ${st.difficulty === i ? "bg-[var(--c1)] text-[var(--ink1)]" : "bg-white/10 text-white/70"}`}>{n}</button>
        ))}
      </div>
      <p className="mt-1 text-xs text-white/50">Cambia qué tan rápidos y certeros son los defensores y el arquero rival.</p>
      <div className="mt-3 grid gap-2">
        <Toggle on={st.chants} onClick={() => set("chants", !st.chants)} label="📣 Hinchada que alienta" hint="Cánticos y murmullo de la tribuna durante el partido" />
        {canVibrate && <Toggle on={st.vibrate} onClick={() => set("vibrate", !st.vibrate)} label="📳 Vibración" hint="Al patear, en los goles y cuando te barren" />}
        <Toggle on={st.tutorialPlays < TUTORIAL_PLAYS} onClick={() => set("tutorialPlays", st.tutorialPlays < TUTORIAL_PLAYS ? TUTORIAL_PLAYS : 0)} label="💡 Ayudas en pantalla" hint="Consejos de controles en las próximas jugadas" />
      </div>
      <p className="mt-3 text-xs text-white/50">🎮 Podés jugar con un joystick de consola: stick para moverte, A patear, X pase, B amague, gatillos correr, Start pausa.</p>
    </Card>
  );
}

// ---------- Desafíos ----------

function Challenges({ c }: { c: Career }) {
  const list = c.challenges ?? [];
  if (!list.length) return null;
  return (
    <Card title="🎯 Desafíos de la temporada" right={<span className="text-xs font-bold text-white/50">+2 puntos y plata cada uno</span>}>
      <div className="grid gap-2">
        {list.map((ch) => {
          const prog = challengeProgress(c, ch);
          return (
            <div key={ch.id} className={`rounded-xl px-3 py-2 ${ch.done ? "bg-emerald-500/15" : "bg-white/5"}`}>
              <div className="flex items-center justify-between gap-2 text-sm font-bold">
                <span>{ch.done ? "✅" : "⬜"} {ch.text}</span>
                <span className="tabular-nums text-white/60">{prog}/{ch.target}</span>
              </div>
              <div className="mt-1"><Bar value={(prog / ch.target) * 100} color={ch.done ? "#34d399" : "#fbbf24"} h={4} /></div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-white/50">Los goles especiales (tiro libre, vaselina, cabeza...) solo cuentan si jugás el partido.</p>
    </Card>
  );
}

// ---------- Némesis ----------

function NemesisCard({ c }: { c: Career }) {
  const nm = c.nemesis;
  if (!nm) return null;
  const cl = club(nm.clubId);
  const nat = club(nm.nation);
  const rows: [string, string | number, string | number][] = [
    ["Valoración", ovr(c), nm.ovr],
    ["Goles en la carrera", c.totals.goals, nm.goals],
    ["Balones de Oro", c.player.ballonDor, nm.ballonDor],
  ];
  return (
    <Card title="⚔️ Tu némesis">
      <div className="flex items-center gap-3">
        <Avatar look={nm.look} kit={{ c1: cl.c1, c2: cl.c2, num: nm.num }} size={90} />
        <div className="min-w-0 flex-1">
          <div className="title-font text-xl leading-tight">{nm.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-white/60"><Crest club={cl} size={16} /> {cl.name} · {nat.flag} {nat.name}</div>
          <div className="mt-1 text-xs font-bold text-white/70">Cara a cara: <span className="text-emerald-300">{nm.w}G</span> · {nm.d}E · <span className="text-rose-300">{nm.l}P</span></div>
        </div>
      </div>
      <table className="mt-3 w-full text-sm">
        <thead className="text-xs text-white/50"><tr><th /><th>Vos</th><th>Él</th></tr></thead>
        <tbody>
          {rows.map(([k, a, b]) => (
            <tr key={k}>
              <td className="py-1 text-white/70">{k}</td>
              <td className={`text-center font-black ${Number(a) > Number(b) ? "text-emerald-300" : ""}`}>{a}</td>
              <td className={`text-center font-black ${Number(b) > Number(a) ? "text-rose-300" : ""}`}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-white/50">Debutó el mismo año que vos. Cuando se cruzan, el partido vale el doble.</p>
    </Card>
  );
}

// ---------- Jugadas especiales ----------

function MovesCard({ c }: { c: Career }) {
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return (
    <Card title="✨ Jugadas especiales" right={<span className="text-xs font-bold text-white/50">Nivel {c.player.level}</span>}>
      <div className="grid gap-2">
        {MOVES.map((m) => {
          const on = c.player.level >= m.level;
          return (
            <div key={m.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${on ? "bg-fuchsia-500/15" : "bg-white/5 opacity-60"}`}>
              <span className="text-2xl">{on ? m.emoji : "🔒"}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">{m.name}{on ? "" : ` · nivel ${m.level}`}</span>
                <span className="block text-xs text-white/60">{touch ? m.howTouch : m.how}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- Logros ----------

function Achievements({ c }: { c: Career }) {
  const got = new Set(c.achievements ?? []);
  return (
    <Card title="🏅 Logros" right={<span className="text-xs font-bold text-white/50">{got.size}/{ACHIEVEMENTS.length}</span>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const on = got.has(a.id);
          return (
            <div key={a.id} title={a.desc} className={`rounded-xl p-2 text-center ${on ? "bg-amber-400/15" : "bg-white/5 opacity-50"}`}>
              <div className={`text-2xl ${on ? "" : "grayscale"}`}>{on ? a.emoji : "🔒"}</div>
              <div className="text-xs font-black leading-tight">{a.name}</div>
              <div className="text-[10px] leading-tight text-white/50">{a.desc}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------- Compartir ----------

export function ShareCard({ c }: { c: Career }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card title="📤 Tu tarjeta">
      <p className="mb-3 text-sm text-white/60">Una imagen con tu jugador, tu media, tus números y tus títulos, lista para mandar.</p>
      <Btn kind="gold" className="w-full py-3" disabled={busy} onClick={async () => { setBusy(true); setMsg(await shareCareerCard(c)); setBusy(false); }}>
        📤 Compartir mi carrera
      </Btn>
      {msg && <p className="pop mt-2 text-center text-sm font-bold">{msg}</p>}
    </Card>
  );
}
