// Prueba: carreras completas simuladas hasta el retiro.
import { writeFileSync } from "node:fs";
import { CLUBS, STAT_KEYS } from "../src/game/data";
import * as K from "../src/game/career";

let marketJson = "", lastRoundJson = "";
for (let run = 0; run < 30; run++) {
  const c = K.newCareer({ name: "Test", nick: "T", number: 9, pos: (["DC", "EXT", "ENG"] as const)[run % 3], foot: "der", look: { skin: 0, hair: 0, hairColor: 0, beard: 0, eyes: 0, boots: 0 }, stats: { tiro: 52, pase: 48, regate: 50, velocidad: 52, fisico: 48 } }, "pom");
  let guard = 0, transfers = 0, events = 0, broke = 0;
  while (!c.retired && guard++ < 2000) {
    if (c.round === c.fixtures.length - 1 && !lastRoundJson && c.season === 2) lastRoundJson = JSON.stringify(c);
    const o = K.simulateMine(c, c.player.injured > 0);
    const r = K.finishMatch(c, o);
    if (Number.isNaN(r.xp) || Number.isNaN(c.player.energy)) throw new Error("NaN");
    while (c.player.points > 0) { const k = (["tiro","velocidad","regate","pase","fisico"] as const)[Math.floor(Math.random() * 3)]; c.player.stats[k] = Math.min(99, c.player.stats[k] + 1); c.player.points--; }
    if (c.pendingEvent) { events++; K.resolveEvent(c, 0); }
    const doMarket = () => {
      if (!c.offers) return;
      if (!marketJson) marketJson = JSON.stringify(c);
      const o = c.offers[0];
      for (let i = 0; i < 4 && o.status === "abierta"; i++) {
        const res = K.negotiate(c, o, { salary: Math.round(o.salary * 1.4), years: 3, role: "titular" });
        if (res.kind === "rota") broke++;
      }
      if (o.status === "acuerdo" && Math.random() < 0.6) { K.signFor(c, o); transfers++; } else K.closeWindow(c);
    };
    doMarket();
    if (c.seasonOver) {
      const tot = Object.values(c.table).reduce((a, r) => a + r.pj, 0);
      if (tot !== CLUBS.length * (CLUBS.length - 1)) throw new Error("tabla rara " + tot);
      const s = K.endSeason(c);
      if (s.retire) { K.retire(c); break; }
      K.openSummerWindow(c);
      doMarket();
      K.startNextSeason(c);
    }
  }
  if (run < 6) console.log(`run ${run} ${c.player.pos}: ${c.history.length} temps, retiro ${c.player.age}, OVR ${K.ovr(c)}, ${c.totals.pj} PJ ${c.totals.goals} G ${c.totals.assists} A, nivel ${c.player.level}, ${transfers} pases (${broke} rotas), ${events} eventos, trofeos ${c.trophies.length}, club final ${c.clubId}, sueldo ${c.contract.salary}k`);
}
writeFileSync(process.argv[2] + "/market.json", marketJson);
writeFileSync(process.argv[2] + "/lastround.json", lastRoundJson);
console.log("ok 30 carreras");
