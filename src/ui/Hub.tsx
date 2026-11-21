import { useRef, useState, type ReactNode } from "react";
import { CELEBRATIONS, LEAGUES, NATIONS, POS_INFO, SHOP, STAT_INFO, STAT_KEYS, club, fmtMoney, league, type StatKey, type Team } from "../game/data";
import {
  avgRating, exportCareer, has, marketValue, matchInfo, matchRole, myLeague, myName, ovr, stageName, standings, topScorers, xpNeeded,
  type Career, type Cup, type CupKey, type NewsTag,
} from "../game/career";
import { isMuted, setMuted, sfx } from "../game/audio";
import { Avatar, Bar, Btn, Crest, CrestEditor, Stars, clubStars, statColor } from "./common";

type Tab = "inicio" | "jugador" | "ligas" | "noticias" | "tienda" | "vitrina" | "opciones";
const TABS: { id: Tab; icon: string; name: string }[] = [
  { id: "inicio", icon: "🏠", name: "Inicio" },
  { id: "jugador", icon: "🧍", name: "Jugador" },
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
      <nav className="card fixed inset-x-2 bottom-2 z-30 grid grid-cols-7 gap-1 p-1 md:static md:inset-auto md:flex md:gap-2 md:p-2">
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
    </Card>
  );
}

function MiniTable({ c, leagueId, limit = 30, onTeam }: { c: Career; leagueId: string; limit?: number; onTeam?: (t: Team) => void }) {
  const table = standings(c, leagueId).slice(0, limit);
  return (
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
              <td className="py-1.5 pl-1">{i === 0 ? "👑" : i + 1}</td>
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
  );
}

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
          </div>
          <Avatar look={p.look} kit={kit} size={200} />
        </div>
        <div className="p-4">
          <div className="title-font text-2xl leading-tight">{myName(c)}</div>
          <div className="text-sm text-white/60">
            {p.name} · {p.age} años · {POS_INFO[p.pos].name} · {NATIONS.find((n) => n.id === p.nation)?.name}
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
