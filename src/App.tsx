import { useRef, useState } from "react";
import { club } from "./game/data";
import {
  closeWindow, endSeason, finishMatch, load, openSummerWindow, resolveEvent, retire, save, signFor, startNextSeason, wipe,
  type Career, type MatchOutcome, type Offer, type Report, type SeasonSummary,
} from "./game/career";
import { useClubTheme } from "./ui/common";
import Creator from "./ui/Creator";
import Hub from "./ui/Hub";
import MatchScreen from "./ui/MatchScreen";
import { EventScreen, MarketScreen, ResultScreen, RetiredScreen, SeasonEndScreen, TitleScreen } from "./ui/Screens";

type Screen = "title" | "create" | "hub" | "match" | "result" | "event" | "market" | "season" | "retired";

export default function App() {
  const [career, setCareerState] = useState<Career | null>(() => load());
  const ref = useRef(career);
  const setCareer = (c: Career | null) => {
    ref.current = c;
    setCareerState(c);
  };
  const [screen, setScreen] = useState<Screen>("title");
  const [mode, setMode] = useState<"jugar" | "simular">("jugar");
  const [report, setReport] = useState<Report | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [, bump] = useState(0);

  const cl = career ? club(career.clubId) : null;
  useClubTheme(cl?.c1 ?? "#15803d", cl?.c2 ?? "#f8fafc");

  /** Copia, modifica, guarda y actualiza. */
  function mutate(fn: (c: Career) => void) {
    const n = structuredClone(ref.current!);
    fn(n);
    save(n);
    setCareer(n);
    return n;
  }

  /** ¿Qué pantalla toca después de un partido / evento / mercado? */
  function advance(c: Career) {
    if (c.retired) return setScreen("retired");
    if (c.pendingEvent) return setScreen("event");
    if (c.offers) return setScreen("market");
    if (c.seasonOver) {
      let s: SeasonSummary | null = null;
      mutate((n) => {
        s = endSeason(n);
      });
      setSummary(s);
      return setScreen("season");
    }
    setScreen("hub");
  }

  function startMatch(m: "jugar" | "simular") {
    setMode(m);
    setScreen("match");
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

  if (screen === "title" || !career) {
    if (screen === "create")
      return (
        <Creator
          onBack={() => setScreen("title")}
          onDone={(c) => {
            save(c);
            setCareer(c);
            setScreen("hub");
          }}
        />
      );
    return (
      <TitleScreen
        hasSave={!!career && !career.retired}
        onContinue={() => (career ? advance(career) : undefined)}
        onNew={() => {
          if (career && !career.retired && !confirm("¿Empezar una carrera nueva? Se pierde la actual.")) return;
          wipe();
          setCareer(null);
          setScreen("create");
        }}
      />
    );
  }

  switch (screen) {
    case "create":
      return (
        <Creator
          onBack={() => setScreen("title")}
          onDone={(c) => {
            save(c);
            setCareer(c);
            setScreen("hub");
          }}
        />
      );
    case "match":
      return <MatchScreen key={`${career.season}-${career.round}`} c={career} mode={career.player.injured > 0 ? "simular" : mode} onDone={matchDone} />;
    case "result":
      return <ResultScreen c={career} r={report!} onNext={() => advance(career)} />;
    case "event":
      return (
        <>
          <Hub c={career} onPlay={() => undefined} onSim={() => undefined} onSpend={() => undefined} onQuit={() => undefined} />
          <EventScreen
            c={career}
            onPick={(i) => {
              let msg = "";
              mutate((n) => {
                msg = resolveEvent(n, i);
              });
              return msg;
            }}
            onClose={() => advance(career)}
          />
        </>
      );
    case "market":
      return (
        <MarketScreen
          c={career}
          onChange={() => {
            save(career);
            bump((x) => x + 1);
          }}
          onSign={(o: Offer) => afterMarket((n) => signFor(n, n.offers!.find((x) => x.clubId === o.clubId)!))}
          onStay={() => afterMarket((n) => closeWindow(n))}
        />
      );
    case "season":
      return (
        <SeasonEndScreen
          c={career}
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
      return (
        <RetiredScreen
          c={career}
          onNew={() => {
            wipe();
            setCareer(null);
            setScreen("create");
          }}
        />
      );
    default:
      return (
        <Hub
          c={career}
          onPlay={() => startMatch("jugar")}
          onSim={() => startMatch("simular")}
          onSpend={(k) =>
            mutate((n) => {
              n.player.stats[k] = Math.min(99, n.player.stats[k] + 1);
              n.player.points--;
            })
          }
          onQuit={() => setScreen("title")}
        />
      );
  }
}
