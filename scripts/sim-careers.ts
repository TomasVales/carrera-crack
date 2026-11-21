// Prueba: carreras completas simuladas hasta el retiro (motor v2).
// Uso: npm run sim  (deja market.json, lastround.json y nat.json en la carpeta indicada)
import { writeFileSync } from "node:fs";
import { CLUBS, LEAGUES, SHOP, clubsOf } from "../src/game/data";
import * as K from "../src/game/career";

const outDir = process.argv[2] ?? ".";
let marketJson = "", lastRoundJson = "", natJson = "";
const agg = { ballon: 0, natCalls: 0, cups: 0, leagues: 0, transfers: 0, leagueChanges: 0, events: new Map<string, number>(), suplente: 0, matches: 0, bought: 0 };

for (let run = 0; run < 30; run++) {
  const c = K.newCareer(
    { name: "Test", nick: "T", number: 9, pos: (["DC", "EXT", "ENG"] as const)[run % 3], foot: "der", nation: "n-arg", look: { skin: 0, hair: 0, hairColor: 0, beard: 0, eyes: 0, boots: 0 }, stats: { tiro: 52, pase: 48, regate: 50, velocidad: 52, fisico: 48 } },
    K.startingClubs(LEAGUES[run % LEAGUES.length].id)[0].id,
    1,
  );
  let guard = 0;
  while (!c.retired && guard++ < 3000) {
    if (!K.matchInfo(c)) throw new Error(`sin partido: slot ${c.slot} ${JSON.stringify(c.schedule[c.slot])}`);
    const s = c.schedule[c.slot];
    if (s.kind === "liga" && s.round === c.leagues[K.myLeague(c)].fixtures.length - 1 && !lastRoundJson && c.season === 2) lastRoundJson = JSON.stringify(c);
    if (s.kind === "cup" && s.cup === "nac" && !natJson) natJson = JSON.stringify(c);
    if (K.matchRole(c).role === "suplente") agg.suplente++;
    agg.matches++;
    const o = K.simulateMine(c, c.player.injured > 0);
    K.finishMatch(c, o);
    if (Number.isNaN(c.player.energy) || Number.isNaN(c.player.xp)) throw new Error("NaN");
    while (c.player.points > 0) {
      const k = (["tiro", "velocidad", "regate"] as const)[Math.floor(Math.random() * 3)];
      c.player.stats[k] = Math.min(99, c.player.stats[k] + 1);
      c.player.points--;
    }
    const can = SHOP.filter((it) => !K.has(c, it.id) && it.price <= c.player.money * 0.5).sort((a, b) => b.price - a.price)[0];
    if (can) { K.buy(c, can.id); agg.bought++; }
    if (c.pendingEvent) {
      agg.events.set(c.pendingEvent, (agg.events.get(c.pendingEvent) ?? 0) + 1);
      K.eventText(c);
      const before = c.clubId;
      K.resolveEvent(c, 0);
      if (c.clubId !== before) agg.transfers++;
    }
    const doMarket = () => {
      if (!c.offers) return;
      if (!marketJson) marketJson = JSON.stringify(c);
      const of = c.offers[0];
      for (let i = 0; i < 4 && of.status === "abierta"; i++) K.negotiate(c, of, { salary: Math.round(of.salary * 1.4), years: 3, role: "titular" });
      if (of.status === "acuerdo" && Math.random() < 0.6) {
        if (CLUBS.find((x) => x.id === of.clubId)!.league !== K.myLeague(c)) agg.leagueChanges++;
        K.signFor(c, of);
        agg.transfers++;
      } else K.closeWindow(c);
    };
    doMarket();
    if (c.seasonOver) {
      for (const l of LEAGUES) {
        const ls = c.leagues[l.id];
        if (ls.round !== ls.fixtures.length && c.leagues[K.myLeague(c)] === ls) throw new Error(`liga ${l.id} incompleta`);
      }
      if (!c.cups.copa?.champion) throw new Error("copa sin campeón");
      if (c.cups.cont && !c.cups.cont.champion) throw new Error("continental sin campeón");
      if (c.called) agg.natCalls++;
      const sum = K.endSeason(c);
      if (sum.awards.some((a) => a.includes("Campeón de la"))) agg.leagues++;
      if (sum.gala.some((g) => g.id === "balon")) agg.ballon++;
      if (sum.retire) { K.retire(c); break; }
      K.openSummerWindow(c);
      doMarket();
      K.startNextSeason(c);
    }
  }
  agg.cups += c.trophies.filter((t) => /Campeón de la (Coppa|Copa del Rey|FA Cup|DFB|Coupe|Taça|KNVB|Copa de Turquía|Copa Argentina|Copa do Brasil|Copa MX|US Open)/.test(t)).length;
  if (run < 6)
    console.log(`run ${run} ${c.player.pos}: ${c.history.length} temps, OVR ${K.ovr(c)}, ${c.totals.pj} PJ ${c.totals.goals} G ${c.totals.assists} A, ${c.player.caps} partidos en selección, trofeos ${c.trophies.length}, club final ${c.clubId}, plata ${Math.round(c.player.money)}k, compró ${c.player.owned.length}`);
}
writeFileSync(outDir + "/market.json", marketJson);
writeFileSync(outDir + "/lastround.json", lastRoundJson);
writeFileSync(outDir + "/nat.json", natJson);
console.log(`ok 30 carreras · balones de oro ${agg.ballon} · convocatorias ${agg.natCalls} · ligas ganadas ${agg.leagues} · copas ${agg.cups} · pases ${agg.transfers} (${agg.leagueChanges} a otra liga) · suplente ${Math.round((agg.suplente / agg.matches) * 100)}% · compras ${agg.bought}`);
console.log("eventos:", [...agg.events.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(" "));
