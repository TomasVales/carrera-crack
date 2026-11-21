// Tarjeta de carrera para compartir (imagen PNG dibujada en un canvas).
import { POS_INFO, club, league } from "../game/data";
import { avgRating, myName, ovr, type Career } from "../game/career";
import { drawPlayer } from "../game/draw";

const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function drawCareerCard(c: Career): HTMLCanvasElement {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  const p = c.player;
  const cl = club(c.clubId);

  // fondo con los colores del club
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, cl.c1);
  g.addColorStop(0.55, "#0b1220");
  g.addColorStop(1, "#020617");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = cl.c2;
  for (let i = -4; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 120, 0); ctx.lineTo(i * 120 + 60, 0); ctx.lineTo(i * 120 - 340, H); ctx.lineTo(i * 120 - 400, H);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // marco
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.roundRect(30, 30, W - 60, H - 60, 48); ctx.stroke();

  // media y posición
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.font = `900 170px ${FONT}`;
  ctx.fillText(String(ovr(c)), 90, 230);
  ctx.font = `900 56px ${FONT}`;
  ctx.fillText(p.pos, 100, 300);
  ctx.font = `700 34px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.fillText(POS_INFO[p.pos].name, 100, 345);
  ctx.fillText(`${p.age} años${c.retired ? " · retirado" : ""}`, 100, 390);

  // jugador
  drawPlayer(ctx, { x: W * 0.64, y: 780, s: 9.5, look: p.look, kit: { c1: cl.c1, c2: cl.c2, num: p.number }, face: -1, phase: 0, moving: 0, celebrate: c.retired ? p.celebration : false });

  // nombre
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `900 italic 92px ${FONT}`;
  ctx.fillText(myName(c).toUpperCase(), W / 2, 900, W - 140);
  ctx.font = `700 36px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.fillText(`${cl.name} · ${league(cl.league).flag} ${league(cl.league).name}`, W / 2, 955, W - 140);

  // números
  const stats: [string, string][] = [
    ["PARTIDOS", String(c.totals.pj)],
    ["GOLES", String(c.totals.goals)],
    ["ASIST.", String(c.totals.assists)],
    ["NOTA", c.seasonStats.pj ? avgRating(c).toFixed(1) : c.history.length ? (c.history.reduce((a, h) => a + h.avg, 0) / c.history.length).toFixed(1) : "–"],
  ];
  const bw = (W - 180) / 4;
  stats.forEach(([l, v], i) => {
    const x = 90 + i * bw;
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.beginPath(); ctx.roundRect(x + 8, 1000, bw - 16, 150, 26); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `900 72px ${FONT}`;
    ctx.fillText(v, x + bw / 2, 1085);
    ctx.fillStyle = "rgba(255,255,255,.6)";
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText(l, x + bw / 2, 1128);
  });

  // trofeos
  ctx.font = `800 38px ${FONT}`;
  ctx.fillStyle = "#fde68a";
  const parts = [c.trophies.length ? `🏆 ${c.trophies.length} títulos y premios` : "🏆 En busca del primer título"];
  if (p.ballonDor) parts.push(`🥇 ${p.ballonDor} Balón${p.ballonDor > 1 ? "es" : ""} de Oro`);
  if (c.achievements?.length) parts.push(`🏅 ${c.achievements.length} logros`);
  ctx.fillText(parts.join("   "), W / 2, 1215, W - 140);
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(`Carrera de Crack · Temporada ${c.season}`, W / 2, 1275);
  return cv;
}

/** Comparte la tarjeta (menú de compartir del celular) o la descarga. */
export async function shareCareerCard(c: Career): Promise<string> {
  const cv = drawCareerCard(c);
  const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/png"));
  if (!blob) return "No se pudo crear la imagen.";
  const name = `${myName(c).replace(/\s+/g, "-").toLowerCase()}-carrera.png`;
  const file = new File([blob], name, { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: `La carrera de ${myName(c)}`, text: `${myName(c)}: ${c.totals.goals} goles y ${c.trophies.length} títulos en Carrera de Crack ⚽` });
      return "¡Tarjeta compartida!";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "Tarjeta descargada. ¡Mandala por WhatsApp!";
}
