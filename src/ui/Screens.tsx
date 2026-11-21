import { useEffect, useState } from "react";
import { LEAGUES, POS_INFO, STAT_INFO, club, fmtMoney, league } from "../game/data";
import {
  EVENTS, eventText, hallOfFame, loadSlot, marketValue, myName, negotiate, ovr,
  type Career, type Offer, type Report, type Role, type SeasonSummary,
} from "../game/career";
import { sfx } from "../game/audio";
import { Avatar, Btn, Crest, RatingBadge, Stars, clubStars } from "./common";

// ---------- Resultado del partido ----------

export function ResultScreen({ c, r, onNext }: { c: Career; r: Report; onNext: () => void }) {
  const h = club(r.home);
  const a = club(r.away);
  const myId = h.league === "nac" ? c.player.nation : c.clubId;
  const mineHome = r.home === myId || (h.league === "nac" && r.home === c.player.nation);
  const mine = mineHome ? r.hg : r.ag;
  const theirs = mineHome ? r.ag : r.hg;
  const pens = mine === theirs && r.pensWin !== undefined;
  const won = mine > theirs || (pens && r.pensWin);
  const lost = mine < theirs || (pens && !r.pensWin);
  const res = won ? "VICTORIA" : lost ? "DERROTA" : "EMPATE";
  const kitTeam = club(myId);
  useEffect(() => {
    if (r.levelUps) setTimeout(() => sfx.levelUp(), 600);
    else if (won) sfx.coins();
  }, [r, won]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="card pop overflow-hidden text-center">
        <div className={`py-2 text-sm font-black tracking-[0.3em] ${won ? "bg-emerald-500 text-slate-900" : lost ? "bg-rose-600" : "bg-slate-500"}`}>{res}{pens ? " (PENALES)" : ""}</div>
        <div className="pt-3 text-[11px] font-black uppercase tracking-widest text-white/50">{r.label}</div>
        <div className="flex items-center justify-around px-4 pb-6 pt-2">
          <div className="flex w-28 flex-col items-center gap-2">
            <Crest club={h} size={64} />
            <span className="text-sm font-black">{h.name}</span>
          </div>
          <div className="title-font text-6xl tabular-nums">{r.hg}-{r.ag}</div>
          <div className="flex w-28 flex-col items-center gap-2">
            <Crest club={a} size={64} />
            <span className="text-sm font-black">{a.name}</span>
          </div>
        </div>
      </div>

      <div className="card rise flex items-center gap-4 p-4">
        <Avatar look={c.player.look} kit={{ c1: kitTeam.c1, c2: kitTeam.c2, num: c.player.number }} size={110} celebrate={r.goals > 0 ? c.player.celebration : false} />
        <div className="flex-1">
          <div className="title-font text-xl">{myName(c)}</div>
          {r.rating === null ? (
            <div className="text-white/60">No jugaste (lesionado)</div>
          ) : (
            <div className="mt-1 flex flex-wrap gap-2 text-sm font-bold">
              <span className="rounded-lg bg-white/10 px-2 py-1">⚽ {r.goals}</span>
              <span className="rounded-lg bg-white/10 px-2 py-1">🅰️ {r.assists}</span>
              <span className="rounded-lg bg-violet-500/30 px-2 py-1">+{r.xp} XP</span>
              {r.money > 0 && <span className="rounded-lg bg-emerald-500/20 px-2 py-1">+{fmtMoney(r.money)}</span>}
              <span className="rounded-lg bg-white/5 px-2 py-1 text-white/60">{r.role === "titular" ? "titular" : "desde el banco"}{!r.played ? " · simulado" : ""}</span>
            </div>
          )}
          <div className="mt-2 text-xs text-white/50">Figura: {r.mvp}</div>
        </div>
        {r.rating !== null && <RatingBadge r={r.rating} size={64} />}
      </div>

      {r.levelUps > 0 && <div className="shine pop rounded-2xl bg-violet-600 p-4 text-center text-lg font-black">⬆️ ¡Subiste al nivel {c.player.level}! +{r.levelUps * 4} puntos para mejorar</div>}
      {r.trainUp && <div className="pop rounded-2xl bg-sky-600/80 p-3 text-center font-black">🏋️ El entrenamiento dio frutos: +1 {STAT_INFO[r.trainUp].name}</div>}
      {r.notes.map((n) => (
        <div key={n} className="pop rounded-2xl bg-amber-400/20 p-3 text-center font-bold text-amber-100">{n}</div>
      ))}

      <div className="rise rounded-2xl bg-[#f5efe0] p-4 text-slate-900 shadow-xl">
        <div className="border-b-2 border-slate-900 pb-1 font-serif text-xs font-black uppercase tracking-widest">{r.outlet}</div>
        <div className="mt-2 font-serif text-2xl font-black leading-tight">{r.headline}</div>
      </div>

      <Btn kind="gold" className="mt-auto py-5 text-2xl" onClick={onNext}>CONTINUAR →</Btn>
    </div>
  );
}

// ---------- Evento ----------

export function EventScreen({ c, onPick, onClose }: { c: Career; onPick: (i: number) => string; onClose: () => void }) {
  const [ev] = useState(() => EVENTS[c.pendingEvent ?? ""]);
  const [text] = useState(() => eventText(c));
  const [msg, setMsg] = useState<string | null>(null);
  if (!ev) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="card pop w-full max-w-md overflow-hidden">
        <div className="bg-[var(--c1)] py-6 text-center text-6xl">{ev.emoji}</div>
        <div className="p-5">
          <h2 className="title-font text-2xl">{ev.title}</h2>
          <p className="mt-2 text-white/80">{text}</p>
          {msg === null ? (
            <div className="mt-4 grid gap-2">
              {ev.options.map((o, i) => (
                <button key={o.label} className="btn btn-ghost p-3 text-left" onClick={() => { sfx.click(); setMsg(onPick(i)); }}>
                  <div className="text-lg">{o.label}</div>
                  <div className="text-xs font-semibold text-white/50">{o.hint}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <p className="pop rounded-xl bg-white/10 p-3 font-bold">{msg}</p>
              <Btn kind="gold" className="py-3 text-lg" onClick={onClose}>Seguir →</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Mercado ----------

export function MarketScreen({ c, onSign, onStay, onChange }: { c: Career; onSign: (o: Offer) => void; onStay: () => void; onChange: () => void }) {
  const [sel, setSel] = useState<number | null>(null);
  const offers = c.offers ?? [];
  const cur = club(c.clubId);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <div className="card rise p-5">
        <div className="text-xs font-black uppercase tracking-widest text-amber-300">Mercado de {c.windowKind}</div>
        <h1 className="title-font text-3xl">¡Te llegaron ofertas!</h1>
        <p className="mt-1 text-white/70">
          Tu representante, <b>Beppe "Il Furbo" Caruso</b>, te muestra lo que hay. Valor: <b className="text-emerald-300">{fmtMoney(marketValue(c))}</b> · OVR {ovr(c)}
        </p>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3 text-sm">
          <Crest club={cur} size={34} />
          <div>
            Ahora: <b>{cur.name}</b> {league(cur.league).flag} · {fmtMoney(c.contract.salary)}/sem · {c.contract.years} años · {c.contract.role}
          </div>
        </div>
      </div>
      {offers.map((o, i) => (
        <OfferCard key={o.clubId} c={c} o={o} open={sel === i} onOpen={() => setSel(sel === i ? null : i)} onSign={() => onSign(o)} onChange={onChange} />
      ))}
      <Btn kind="ghost" className="py-4 text-lg" onClick={onStay}>Me quedo en {cur.name} 💪</Btn>
    </div>
  );
}

function OfferCard({ c, o, open, onOpen, onSign, onChange }: { c: Career; o: Offer; open: boolean; onOpen: () => void; onSign: () => void; onChange: () => void }) {
  const cl = club(o.clubId);
  const lg = league(cl.league);
  const [salary, setSalary] = useState(Math.round(o.salary * 1.3));
  const [years, setYears] = useState(o.years);
  const [role, setRole] = useState<Role>("titular");
  const [chat, setChat] = useState<{ who: "yo" | "ellos"; text: string }[]>([]);

  function propose() {
    sfx.click();
    const r = negotiate(c, o, { salary, years, role });
    setChat((x) => [...x, { who: "yo", text: `Pido ${fmtMoney(salary)}/sem, ${years} años, ${role}.` }, { who: "ellos", text: r.msg }]);
    if (r.kind === "acuerdo") sfx.coins();
    if (r.kind === "contra") { setSalary(o.salary); setRole(o.role); }
    onChange();
  }

  return (
    <div className={`card rise overflow-hidden ${o.status === "rota" ? "opacity-50" : ""}`}>
      <button className="flex w-full items-center gap-3 p-4 text-left" style={{ background: `linear-gradient(110deg, ${cl.c1}55, transparent 70%)` }} onClick={onOpen} disabled={o.status === "rota"}>
        <Crest club={cl} size={52} />
        <div className="flex-1">
          <div className="title-font text-xl">{cl.name}</div>
          <div className="text-xs font-bold text-white/70">{lg.flag} {lg.name} · {cl.stadium}</div>
          <Stars n={clubStars(cl.strength)} />
          <div className="text-sm text-white/70">Ofrecen {fmtMoney(o.salary)}/sem · {o.years} años · {o.role}</div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${o.status === "acuerdo" ? "bg-emerald-500 text-slate-900" : o.status === "rota" ? "bg-rose-600" : "bg-white/10"}`}>
          {o.status === "acuerdo" ? "¡ACUERDO!" : o.status === "rota" ? "ROTA" : open ? "▲" : "Negociar ▼"}
        </span>
      </button>
      {open && o.status !== "rota" && (
        <div className="grid gap-3 border-t border-white/10 p-4">
          {chat.length > 0 && (
            <div className="grid gap-2">
              {chat.map((m, i) => (
                <div key={i} className={`pop max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.who === "yo" ? "justify-self-end bg-[var(--c1)] text-[var(--ink1)]" : "bg-white/10"}`}>
                  {m.who === "ellos" && <b className="mr-1">🧑‍💼</b>}
                  {m.text}
                </div>
              ))}
            </div>
          )}
          {o.status === "acuerdo" ? (
            <Btn kind="gold" className="py-4 text-xl" onClick={onSign}>FIRMAR CON {cl.short} ✍️</Btn>
          ) : (
            <>
              <label className="grid gap-1 text-sm font-bold">
                <span className="flex justify-between">Sueldo pedido <b className="text-emerald-300">{fmtMoney(salary)}/sem</b></span>
                <input type="range" min={Math.max(1, Math.round(o.salary * 0.8))} max={Math.round(o.salary * 2.2)} value={salary} onChange={(e) => setSalary(Number(e.target.value))} />
              </label>
              <label className="grid gap-1 text-sm font-bold">
                <span className="flex justify-between">Años de contrato <b>{years}</b></span>
                <input type="range" min={1} max={5} value={years} onChange={(e) => setYears(Number(e.target.value))} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["titular", "suplente"] as Role[]).map((r) => (
                  <button key={r} className={`btn py-2 ${role === r ? "btn-club" : "btn-ghost"}`} onClick={() => setRole(r)}>
                    {r === "titular" ? "Quiero ser titular" : "Acepto ser suplente"}
                  </button>
                ))}
              </div>
              <Btn kind="gold" className="py-3 text-lg" onClick={propose}>Proponer 🤝</Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Fin de temporada ----------

export function SeasonEndScreen({ c, s, onNext }: { c: Career; s: SeasonSummary; onNext: () => void }) {
  const lg = club(c.clubId).league;
  const champ = club(s.champion);
  const won = s.champion === c.clubId;
  const last = c.history[c.history.length - 1];
  useEffect(() => {
    if (won || s.awards.length) sfx.goal();
  }, [won, s.awards.length]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="card pop p-6 text-center">
        <div className="text-xs font-black uppercase tracking-widest text-white/60">Fin de la temporada {last?.season}</div>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="text-6xl">🏆</div>
          <Crest club={champ} size={72} />
          <div className="title-font text-3xl">{champ.name} campeón</div>
          <div className="text-sm text-white/60">{league(lg).flag} {league(lg).name}</div>
          {won && <div className="shine rounded-full bg-amber-400 px-4 py-1 font-black text-slate-900">¡SOS CAMPEÓN!</div>}
        </div>
      </div>
      <div className="card rise grid grid-cols-4 gap-2 p-4 text-center">
        {[
          ["Puesto", `${s.place}°`],
          ["Goles", last?.goals ?? 0],
          ["Asist.", last?.assists ?? 0],
          ["Nota", last?.avg.toFixed(1) ?? "–"],
        ].map(([l, v]) => (
          <div key={l}>
            <div className="title-font text-3xl">{v}</div>
            <div className="text-xs font-bold text-white/50">{l}</div>
          </div>
        ))}
      </div>
      {s.awards.length > 0 && (
        <div className="card rise grid gap-2 p-4">
          <div className="font-black">Premios</div>
          {s.awards.map((a) => (
            <div key={a} className="pop rounded-xl bg-amber-400/15 px-3 py-2 font-bold text-amber-200">{a}</div>
          ))}
        </div>
      )}
      <div className="card rise grid gap-2 p-4">
        <div className="font-black">🌍 Campeones del mundo inventado</div>
        {LEAGUES.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <Crest club={club(s.champions[l.id])} size={26} />
            <span className="flex-1">{l.flag} {l.name}</span>
            <b>{club(s.champions[l.id]).name}</b>
          </div>
        ))}
        {s.cupChampion && (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <Crest club={club(s.cupChampion)} size={26} />
            <span className="flex-1">🏆 {c.cup.name}</span>
            <b>{club(s.cupChampion).name}</b>
          </div>
        )}
        {c.nat?.champion && (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
            <Crest club={club(c.nat.champion)} size={26} />
            <span className="flex-1">🌍 Copa de Naciones</span>
            <b>{club(c.nat.champion).name}</b>
          </div>
        )}
      </div>
      <div className="card rise p-4 text-sm text-white/80">
        <div className="mb-1 font-black text-white">Pretemporada</div>
        Cumplís {c.player.age} años. {s.growth.length ? `Evolución: ${s.growth.join(", ")}.` : ""} {s.renewed ? "El club te renovó el contrato con aumento. " : ""}
        {s.retire && <b className="text-amber-300">Tu cuerpo dice basta: es hora de colgar los botines.</b>}
      </div>
      <Btn kind="gold" className="py-5 text-2xl" onClick={onNext}>{s.retire ? "DESPEDIRME 👋" : "SIGUIENTE TEMPORADA →"}</Btn>
    </div>
  );
}

// ---------- Retiro ----------

export function RetiredScreen({ c, onNew }: { c: Career; onNew: () => void }) {
  const cl = club(c.clubId);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="card pop flex flex-col items-center gap-2 p-6 text-center">
        <Avatar look={c.player.look} kit={{ c1: cl.c1, c2: cl.c2, num: c.player.number }} size={170} celebrate={c.player.celebration} />
        <div className="title-font text-3xl">Gracias, {myName(c)}</div>
        <div className="text-white/70">{c.history.length} temporadas · {c.totals.pj} partidos · {c.totals.goals} goles · {c.totals.assists} asistencias</div>
        <div className="text-sm text-white/50">Partido homenaje en el {club(c.firstClubId).stadium}, donde todo empezó.</div>
      </div>
      <div className="card rise p-4">
        <div className="mb-2 font-black">Tu carrera</div>
        <table className="w-full text-sm">
          <thead className="text-xs text-white/50">
            <tr><th className="text-left">Temp.</th><th className="text-left">Club</th><th>PJ</th><th>G</th><th>A</th><th>Nota</th></tr>
          </thead>
          <tbody>
            {c.history.map((h) => (
              <tr key={h.season}>
                <td className="py-1">T{h.season} ({h.age})</td>
                <td>{club(h.clubId).short}</td>
                <td className="text-center">{h.pj}</td>
                <td className="text-center">{h.goals}</td>
                <td className="text-center">{h.assists}</td>
                <td className="text-center">{h.avg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c.trophies.length > 0 && (
        <div className="card rise grid gap-1 p-4">
          <div className="mb-1 font-black">Vitrina</div>
          {c.trophies.map((t, i) => <div key={i} className="text-sm text-amber-200">{t}</div>)}
        </div>
      )}
      <Btn kind="gold" className="py-5 text-2xl" onClick={onNew}>NUEVA CARRERA</Btn>
    </div>
  );
}

// ---------- Inicio (ranuras) ----------

export function TitleScreen({ onContinue, onNew, onDelete, refresh }: { onContinue: (slot: number) => void; onNew: (slot: number) => void; onDelete: (slot: number) => void; refresh: number }) {
  const hof = hallOfFame();
  const [showHof, setShowHof] = useState(false);
  const slots = [1, 2, 3].map((n) => ({ n, c: loadSlot(n) }));
  void refresh;
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <div className="flex gap-2">
        {LEAGUES.map((l, i) => (
          <div key={l.id} className="pop text-4xl" style={{ animationDelay: `${i * 0.08}s` }}>{l.flag}</div>
        ))}
      </div>
      <h1 className="title-font pop text-6xl leading-[0.9] sm:text-7xl">
        CARRERA
        <br />
        <span className="text-amber-300">DE CRACK</span>
      </h1>
      <p className="max-w-sm text-white/70">Creá tu jugador, debutá a los 17 y llevalo a la gloria en tres ligas inventadas, la copa y la selección.</p>
      <div className="grid w-full gap-3">
        {slots.map(({ n, c }) => (
          <div key={n} className="card flex items-center gap-3 p-3 text-left">
            {c ? (
              <>
                <Avatar look={c.player.look} kit={{ c1: club(c.clubId).c1, c2: club(c.clubId).c2 }} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{myName(c)} {c.retired && "· retirado"}</div>
                  <div className="truncate text-xs text-white/60">
                    {club(c.clubId).name} · T{c.season} · {c.player.age} años · OVR {ovr(c)} · {POS_INFO[c.player.pos].name}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Btn kind="gold" className="px-4 py-2 text-sm" onClick={() => onContinue(n)}>{c.retired ? "Ver" : "Jugar"}</Btn>
                  <button className="text-[11px] font-bold text-white/40 hover:text-rose-300" onClick={() => { if (confirm(`¿Borrar la partida de ${myName(c)}?`)) onDelete(n); }}>borrar</button>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-16 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">＋</div>
                <div className="flex-1 text-sm text-white/50">Ranura {n} vacía</div>
                <Btn kind={slots.some((s) => s.c) ? "ghost" : "gold"} className="px-4 py-2 text-sm" onClick={() => onNew(n)}>Nueva carrera</Btn>
              </>
            )}
          </div>
        ))}
        {hof.length > 0 && <Btn kind="ghost" className="py-3" onClick={() => setShowHof(!showHof)}>🏛️ Salón de la Fama</Btn>}
      </div>
      {showHof && (
        <div className="card pop grid w-full gap-2 p-4 text-left">
          {hof.map((h, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
              <Avatar look={h.look} kit={{ c1: h.c1, c2: h.c2 }} size={60} />
              <div className="text-sm">
                <div className="font-black">{h.nick || h.name}</div>
                <div className="text-white/60">{POS_INFO[h.pos].name} · {h.seasons} temp. · {h.goals} goles · {h.trophies} trofeos</div>
                <div className="text-xs text-white/40">{h.best}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-white/40">Clubes, ligas, jugadores y marcas son inventados.</p>
    </div>
  );
}
