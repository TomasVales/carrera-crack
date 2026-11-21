import { useRef, useState } from "react";
import { applyPower, club } from "./game/data";
import {
  buy, closeWindow, drillReward, hireAgent, endSeason, equip, finishMatch, importCareer, loadSlot, openSummerWindow, resolveEvent, retire, save, signFor, simulateMine, startNextSeason, wipeSlot,
  type Career, type MatchOutcome, type Offer, type Report, type SeasonSummary,
} from "./game/career";
import { useClubTheme } from "./ui/common";
import Creator from "./ui/Creator";
import Hub, { type HubActions } from "./ui/Hub";
import MatchScreen, { DrillScreen, PracticeScreen } from "./ui/MatchScreen";
import { EventScreen, GalaScreen, MarketScreen, ResultScreen, RetiredScreen, SeasonEndScreen, TitleScreen } from "./ui/Screens";

type Screen = "title" | "create" | "hub" | "match" | "result" | "event" | "market" | "season" | "gala" | "retired" | "practice" | "drill";

export default function App() {
  const [career, setCareerState] = useState<Career | null>(null);
  const ref = useRef<Career | null>(null);
  const setCareer = (c: Career | null) => {
    ref.current = c;
    applyPower(c?.power); // cada partida tiene su propio mundo: la fuerza de los clubes viaja con ella
    setCareerState(c);
  };
  const [screen, setScreen] = useState<Screen>("title");
  const [slot, setSlot] = useState(1);
  const [mode, setMode] = useState<"jugar" | "simular">("jugar");
  const [report, setReport] = useState<Report | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [, bump] = useState(0);

  const cl = career ? club(career.clubId) : null;
  useClubTheme(cl?.c1 ?? "#15803d", cl?.c2 ?? "#f8fafc");

  function mutate(fn: (c: Career) => void) {
    const n = structuredClone(ref.current!);
    fn(n);
    save(n);
    setCareer(n);
    return n;
  }

  function advance(c: Career) {
    window.scrollTo(0, 0);
    if (c.retired) return setScreen("retired");
    if (c.pendingEvent) return setScreen("event");
    if (c.offers) return setScreen("market");
    if (c.seasonOver) {
      let s: SeasonSummary | null = null;
      const n = mutate((x) => {
        s = endSeason(x);
      });
      void n;
      setSummary(s);
      return setScreen((s as SeasonSummary | null)?.gala.length ? "gala" : "season");
    }
    setScreen("hub");
  }

  function matchDone(o: MatchOutcome) {
    let r: Report | null = null;
    mutate((n) => {
      r = finishMatch(n, o);
    });
    setReport(r);
    setScreen("result");
    window.scrollTo(0, 0);
  }

  function afterMarket(fn: (n: Career) => void) {
    const n = mutate((x) => {
      fn(x);
      if (x.seasonOver) startNextSeason(x);
    });
    advance(n);
  }

  function toTitle() {
    setCareer(null);
    setRefresh((x) => x + 1);
    setScreen("title");
  }

  const actions: HubActions = {
    onPlay: () => { setMode("jugar"); setScreen("match"); },
    onSim: () => { setMode("simular"); setScreen("match"); },
    onSimMany: () => {
      // simula hasta 8 partidos seguidos; frena ante eventos, mercado o fin de temporada
      let last: Report | null = null;
      const n = mutate((x) => {
        for (let i = 0; i < 8; i++) {
          if (x.pendingEvent || x.offers || x.seasonOver || x.retired) break;
          last = finishMatch(x, simulateMine(x, x.player.injured > 0));
        }
      });
      if (last) {
        setReport(last);
        setScreen("result");
        window.scrollTo(0, 0);
      } else advance(n);
    },
    onSpend: (k) => mutate((n) => { n.player.stats[k] = Math.min(99, n.player.stats[k] + 1); n.player.points--; }),
    onFocus: (f) => mutate((n) => { n.player.focus = f; }),
    onBuy: (id) => { let msg = ""; mutate((n) => { msg = buy(n, id); }); return msg; },
    onEquip: (id) => mutate((n) => equip(n, id)),
    onPractice: () => setScreen("practice"),
    onQuit: toTitle,
    onImport: (text) => {
      try {
        const c = importCareer(text, ref.current?.slotId ?? slot);
        setCareer(c);
        setScreen("hub");
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "No se pudo cargar.";
      }
    },
    onDelete: () => { if (ref.current) wipeSlot(ref.current.slotId); toTitle(); },
    onDrill: () => setScreen("drill"),
    onAgent: (id) => { let msg = ""; mutate((n) => { msg = hireAgent(n, id); }); return msg; },
  };

  if (screen === "title" || (!career && screen !== "create")) {
    return (
      <TitleScreen
        refresh={refresh}
        onContinue={(n) => {
          const c = loadSlot(n);
          if (!c) return;
          setSlot(n);
          setCareer(c);
          advance(c);
        }}
        onNew={(n) => {
          setSlot(n);
          setScreen("create");
        }}
        onDelete={(n) => {
          wipeSlot(n);
          setRefresh((x) => x + 1);
        }}
      />
    );
  }

  if (screen === "create")
    return (
      <Creator
        slot={slot}
        onBack={toTitle}
        onDone={(c) => {
          save(c);
          setCareer(c);
          setScreen("hub");
        }}
      />
    );

  const c = career!;
  switch (screen) {
    case "practice":
      return <PracticeScreen c={c} onExit={() => setScreen("hub")} />;
    case "drill":
      return <DrillScreen c={c} onDone={(score) => { let msg = ""; mutate((n) => { msg = drillReward(n, score); }); return msg; }} onExit={() => setScreen("hub")} />;
    case "match":
      return <MatchScreen key={`${c.season}-${c.slot}`} c={c} mode={c.player.injured > 0 ? "simular" : mode} onDone={matchDone} />;
    case "result":
      return <ResultScreen c={c} r={report!} onNext={() => advance(c)} />;
    case "event":
      return (
        <>
          <Hub c={c} actions={actions} locked />
          <EventScreen
            key={`${c.season}-${c.slot}`}
            c={c}
            onPick={(i) => {
              let msg = "";
              mutate((n) => {
                msg = resolveEvent(n, i);
              });
              return msg;
            }}
            onClose={() => advance(ref.current!)}
          />
        </>
      );
    case "market":
      return (
        <MarketScreen
          c={c}
          onChange={() => {
            save(c);
            bump((x) => x + 1);
          }}
          onSign={(o: Offer) => afterMarket((n) => signFor(n, n.offers!.find((x) => x.clubId === o.clubId)!))}
          onStay={() => afterMarket((n) => closeWindow(n))}
        />
      );
    case "gala":
      return <GalaScreen c={c} awards={summary!.gala} onDone={() => setScreen("season")} />;
    case "season":
      return (
        <SeasonEndScreen
          c={c}
          s={summary!}
          onNext={() => {
            if (summary!.retire) {
              mutate((n) => retire(n));
              setScreen("retired");
              return;
            }
            const n = mutate((x) => openSummerWindow(x));
            if (n.offers) setScreen("market");
            else afterMarket(() => undefined);
          }}
        />
      );
    case "retired":
      return <RetiredScreen c={c} onNew={() => { wipeSlot(c.slotId); setSlot(c.slotId); setScreen("create"); }} />;
    default:
      return <Hub c={c} actions={actions} />;
  }
}
