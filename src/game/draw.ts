// Dibujo procedural en Canvas: jugadores "cabezones" (cabeza ≈ 60% del cuerpo), pelota y efectos.
import { BAND_COLORS, BOOTS, GOLD_BOOTS, HAIR_COLORS, RAINBOW_BOOTS, SKINS, UGLY_BOOTS, type Look } from "./data";

export type Kit = { c1: string; c2: string; num?: number };

export type PlayerDraw = {
  x: number;
  y: number; // pies
  s: number; // escala
  look: Look;
  kit: Kit;
  face: number; // -1 izquierda, 1 derecha
  phase: number;
  moving: number; // 0..1
  ring?: string;
  celebrate?: string | false; // tipo de festejo
  dive?: number; // arquero (-1..1)
  kick?: number; // 0..1 patada
  slide?: boolean; // barriéndose
  down?: boolean; // en el piso
  alert?: boolean; // "!" antes de la barrida
  hop?: number; // salto (px)
  wind?: boolean; // agachado preparando la barrida
  outfit?: "suit"; // traje de gala
  hold?: "balon" | "bota" | "copa"; // trofeo en las manos
};

const INK = "#161616";

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.28) {
  ctx.fillStyle = `rgba(0,0,0,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function bootFill(ctx: CanvasRenderingContext2D, boots: number, x: number, y: number) {
  if (boots === GOLD_BOOTS) {
    const g = ctx.createLinearGradient(x - 4, y - 2, x + 4, y + 2);
    g.addColorStop(0, "#fde68a");
    g.addColorStop(0.5, "#f59e0b");
    g.addColorStop(1, "#fef3c7");
    return g;
  }
  if (boots === RAINBOW_BOOTS) {
    const g = ctx.createLinearGradient(x - 4, y, x + 4, y);
    ["#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].forEach((c, i) => g.addColorStop(i / 5, c));
    return g;
  }
  if (boots === UGLY_BOOTS) return "#a3e635";
  return BOOTS[boots] ?? BOOTS[0];
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerDraw) {
  const { look, kit, s } = p;
  const skin = SKINS[look.skin] ?? SKINS[0];
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  const cel = p.celebrate || "";
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s, s);

  if (p.ring) {
    ctx.strokeStyle = p.ring;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawShadow(ctx, 0, 0, p.slide || p.down ? 20 : 12, 4);

  if (p.dive) ctx.rotate(p.dive * 1.1);
  if (p.slide || p.down) {
    // acostado en el césped, hacia donde se barre
    ctx.translate(0, -6);
    ctx.rotate(p.face * (p.down ? 1.45 : 1.2));
  }
  const swing = Math.sin(p.phase) * 3.2 * p.moving;
  let bob = -Math.abs(Math.sin(p.phase)) * 1.6 * p.moving;
  if (cel === "salto") bob = -Math.abs(Math.sin(p.phase * 1.4)) * 9;
  else if (cel === "baile") bob = -Math.abs(Math.sin(p.phase * 2)) * 3;
  else if (cel === "rodilla") bob = 7;
  ctx.translate(0, bob - (p.hop ?? 0) - (p.wind ? -2 : 0));
  if (cel === "baile") ctx.rotate(Math.sin(p.phase * 1.6) * 0.22);
  if (cel === "avion") ctx.rotate(Math.sin(p.phase * 0.8) * 0.18);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";

  // piernas y botines
  if (cel !== "rodilla") {
    for (const side of [-1, 1]) {
      const off = side * swing;
      const kicking = p.kick && side === p.face ? p.kick : 0;
      ctx.save();
      if (kicking) {
        ctx.translate(side * 4.2, -12);
        ctx.rotate(-p.face * kicking * 1.1);
        ctx.translate(-side * 4.2, 12);
      }
      rr(ctx, side * 4.2 - 2.6 + off * 0.3, -13, 5.2, 11, 2);
      ctx.fillStyle = p.outfit ? "#334155" : shade(kit.c1, -0.08);
      ctx.fill();
      ctx.stroke();
      const bx = side * 4.2 + off * 0.45 + p.face * 1.2;
      ctx.beginPath();
      ctx.ellipse(bx, -1.6, 3.9, 2.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.outfit ? "#0b0b0b" : bootFill(ctx, look.boots, bx, -1.6);
      ctx.fill();
      ctx.stroke();
      if (look.boots === UGLY_BOOTS) {
        ctx.fillStyle = "#f472b6";
        ctx.fillRect(bx - 1, -3.6, 2, 4);
      }
      ctx.restore();
    }
  }
  // short
  rr(ctx, -8.5, -17, 17, 7, 2.5);
  ctx.fillStyle = p.outfit ? "#334155" : kit.c2;
  ctx.fill();
  ctx.stroke();

  // brazos según festejo
  const arm = (x: number, y: number, rx = 3.1, ry = 4.4, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.stroke();
  };
  if (p.hold) { arm(-10.5, -21, 3.1, 4.4); arm(13, -33, 3, 5, -0.5); }
  else if (cel === "salto" || cel === "rodilla") { arm(-11, -32, 3, 5); arm(11, -32, 3, 5); }
  else if (cel === "avion") { arm(-15, -24, 6.5, 2.6); arm(15, -24, 6.5, 2.6); }
  else if (cel === "oido") { arm(-10.5, -21); arm(13, -36, 3, 5, -0.4); }
  else if (cel === "baile") { const a = Math.sin(p.phase * 1.6) > 0; arm(-11, a ? -32 : -20, 3, 5); arm(11, a ? -20 : -32, 3, 5); }
  else if (cel === "corazon") { arm(-6, -24, 3, 3.5); arm(6, -24, 3, 3.5); }
  else if (p.slide || p.down) { arm(-10, -18); arm(10, -26); }
  else for (const side of [-1, 1]) arm(side * 10.5, -21 - side * swing * 0.4);

  // camiseta
  rr(ctx, -9.5, -29, 19, 14, 4.5);
  ctx.fillStyle = p.outfit ? "#1e293b" : kit.c1;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (p.outfit) {
    // camisa blanca en V, solapas y moño
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath(); ctx.moveTo(-4.5, -29); ctx.lineTo(4.5, -29); ctx.lineTo(0, -18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#64748b";
    ctx.beginPath(); ctx.moveTo(-4.5, -29); ctx.lineTo(-1, -21); ctx.lineTo(-6, -25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4.5, -29); ctx.lineTo(1, -21); ctx.lineTo(6, -25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(-3.2, -28.6); ctx.lineTo(-3.2, -25.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -27); ctx.lineTo(3.2, -28.6); ctx.lineTo(3.2, -25.4); ctx.closePath(); ctx.fill();
  } else {
    ctx.fillStyle = kit.c2;
    ctx.fillRect(-2.2, -30, 4.4, 16);
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.fillRect(-9.5, -29, 19, 4);
  }
  ctx.restore();
  rr(ctx, -9.5, -29, 19, 14, 4.5);
  ctx.stroke();
  if (cel === "corazon") {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-7, -23, -4, -29, 0, -25);
    ctx.bezierCurveTo(4, -29, 7, -23, 0, -18);
    ctx.fill();
    ctx.stroke();
  }
  if (kit.num !== undefined && s >= 1.6 && cel !== "corazon" && !p.outfit) {
    ctx.fillStyle = kit.c2 === kit.c1 ? INK : kit.c2;
    ctx.font = "900 7px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = shade(kit.c1, -0.35);
    ctx.strokeText(String(kit.num), p.face * 4.5, -19.5);
    ctx.fillText(String(kit.num), p.face * 4.5, -19.5);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
  }

  // cabeza grande
  const hy = -42;
  const R = 14;
  ctx.beginPath();
  ctx.arc(0, hy, R, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-p.face * 12.6, hy + 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = shade(skin, -0.05);
  ctx.fill();
  ctx.stroke();

  drawBeard(ctx, look.beard, hair, hy, R, p.face);
  drawFace(ctx, look.eyes, hy, p.face, !!cel, p.down);
  drawHair(ctx, look.hair, hair, hy, R, p.face);
  if (look.eyes === 1 && !cel && !p.down) drawBrows(ctx, hy, p.face);
  if (look.band !== undefined && look.band !== null) {
    ctx.fillStyle = BAND_COLORS[look.band] ?? BAND_COLORS[0];
    ctx.beginPath();
    ctx.ellipse(0, hy - 7, R + 0.8, 3, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(R + 0.8, hy - 4.5);
    ctx.ellipse(0, hy - 4.5, R + 0.8, 3, 0, 0, Math.PI, true);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  if (p.hold) {
    // trofeo levantado al costado de la cabeza, por delante de todo
    ctx.save();
    ctx.translate(20, -14);
    ctx.scale(1.25, 1.25);
    drawTrophy(ctx, p.hold);
    ctx.restore();
  }
  if (cel === "oido") arm(13, -42, 2.6, 3.2);
  ctx.restore();

  if (p.alert) {
    // "!" sobre la cabeza
    const y = p.y - 70 * s;
    ctx.fillStyle = "#facc15";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = "900 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("!", p.x, y + 4.5);
  }
}

function drawFace(ctx: CanvasRenderingContext2D, eyes: number, hy: number, face: number, celebrate?: boolean, down?: boolean) {
  const fx = face * 3.4;
  ctx.fillStyle = "rgba(244,114,182,.35)";
  for (const sx of [-7.5, 7.5]) {
    ctx.beginPath();
    ctx.ellipse(fx + sx, hy + 4.5, 2.6, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  if (down) {
    // ojos en X
    for (const sx of [-4.4, 4.4]) {
      ctx.beginPath();
      ctx.moveTo(fx + sx - 2, hy - 2); ctx.lineTo(fx + sx + 2, hy + 2);
      ctx.moveTo(fx + sx + 2, hy - 2); ctx.lineTo(fx + sx - 2, hy + 2);
      ctx.stroke();
    }
  } else if (eyes === 2 || celebrate) {
    for (const sx of [-4.4, 4.4]) {
      ctx.beginPath();
      ctx.arc(fx + sx, hy + 1.2, 2.2, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    for (const sx of [-4.4, 4.4]) {
      ctx.beginPath();
      ctx.ellipse(fx + sx, hy, 1.9, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(fx + sx + 0.6, hy - 0.9, 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
    }
    if (eyes === 1) {
      // párpados a media asta: mirada picante
      ctx.fillStyle = "rgba(0,0,0,0)";
      for (const sx of [-4.4, 4.4]) {
        ctx.beginPath();
        ctx.moveTo(fx + sx - 2.6, hy - 1.2);
        ctx.lineTo(fx + sx + 2.6, hy - 0.4);
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }
      ctx.lineWidth = 1.6;
      ctx.fillStyle = INK;
    }
  }
  ctx.beginPath();
  if (celebrate) {
    ctx.ellipse(fx, hy + 6.8, 2.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#7f1d1d";
    ctx.fill();
  } else if (down) {
    ctx.arc(fx, hy + 7.5, 2.4, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (eyes === 1) {
    // media sonrisa canchera
    ctx.moveTo(fx - 2.6, hy + 6.2);
    ctx.quadraticCurveTo(fx + 0.5, hy + 7, fx + 3.2, hy + 4.4);
    ctx.stroke();
  } else {
    ctx.arc(fx, hy + 5, 2.6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
}

function drawBrows(ctx: CanvasRenderingContext2D, hy: number, face: number) {
  const fx = face * 3.4;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(fx + sx * 7.4, hy - 4.8);
    ctx.lineTo(fx + sx * 2, hy - 2.6);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
  ctx.lineWidth = 1.8;
}

/** Trofeo en las manos (gala). */
function drawTrophy(ctx: CanvasRenderingContext2D, kind: "balon" | "bota" | "copa") {
  const gold = ctx.createLinearGradient(-8, -40, 8, -10);
  gold.addColorStop(0, "#fef3c7");
  gold.addColorStop(0.45, "#f59e0b");
  gold.addColorStop(1, "#b45309");
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.fillStyle = gold;
  if (kind === "balon") {
    ctx.beginPath(); ctx.arc(0, -25, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(146,64,14,.55)";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * 3.4, -25 + Math.sin(a) * 3.4); }
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath(); ctx.arc(-3, -28.5, 2, 0, Math.PI * 2); ctx.fill();
  } else if (kind === "bota") {
    ctx.beginPath();
    ctx.moveTo(-6, -36); ctx.lineTo(1, -36); ctx.lineTo(1, -24); ctx.quadraticCurveTo(9, -23, 10, -18);
    ctx.lineTo(-7, -18); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#78350f"; ctx.fillRect(-8, -18, 19, 3);
  } else {
    ctx.beginPath();
    ctx.moveTo(-8, -38); ctx.lineTo(8, -38); ctx.quadraticCurveTo(8, -26, 2, -24); ctx.lineTo(2, -18); ctx.lineTo(5, -16);
    ctx.lineTo(-5, -16); ctx.lineTo(-2, -18); ctx.lineTo(-2, -24); ctx.quadraticCurveTo(-8, -26, -8, -38);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-8, -33, 3, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -33, 3, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  }
  ctx.lineWidth = 1.8;
}

function drawBeard(ctx: CanvasRenderingContext2D, beard: number, color: string, hy: number, R: number, face: number) {
  if (!beard) return;
  ctx.fillStyle = color;
  const fx = face * 3.4;
  if (beard === 1) {
    rr(ctx, fx - 4.5, hy + 2.6, 9, 2.2, 1.1);
    ctx.fill();
  } else if (beard === 2) {
    rr(ctx, fx - 4.5, hy + 2.6, 9, 2, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(fx, hy + 10, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, hy, R, Math.PI * 0.08, Math.PI * 0.92);
    ctx.quadraticCurveTo(fx, hy + 6, R * Math.cos(Math.PI * 0.08), hy + R * Math.sin(Math.PI * 0.08));
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
}

function drawHair(ctx: CanvasRenderingContext2D, style: number, color: string, hy: number, R: number, face: number) {
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  const cap = (extra = 0) => {
    ctx.beginPath();
    ctx.arc(0, hy, R + 1, Math.PI * (1.02 - extra), Math.PI * (1.98 + extra));
    ctx.quadraticCurveTo(face * 4, hy - 3, -R - 1, hy - 1 + extra * 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  switch (style) {
    case 0:
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(0, hy, R, Math.PI * 1.05, Math.PI * 1.95);
      ctx.quadraticCurveTo(0, hy - 6, -R, hy - 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    case 1:
      cap();
      break;
    case 2:
      cap();
      ctx.beginPath();
      ctx.ellipse(face * 6, hy - R + 0.5, 8, 5.5, face * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 3:
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (1 + i / 8);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (R + 0.5), hy + Math.sin(a) * (R + 0.5) + 1, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, hy - 5, 10, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 4:
      ctx.beginPath();
      ctx.moveTo(-R - 1.5, hy + 9);
      ctx.arc(0, hy, R + 1.5, Math.PI * 0.92, Math.PI * 2.08);
      ctx.lineTo(R + 1.5, hy + 9);
      ctx.lineTo(R - 3, hy + 9);
      ctx.quadraticCurveTo(R - 2, hy - 6, face * 2, hy - 7);
      ctx.quadraticCurveTo(-R + 2, hy - 6, -R + 3, hy + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 5:
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(0, hy, R, Math.PI * 1.05, Math.PI * 1.95);
      ctx.quadraticCurveTo(0, hy - 6, -R, hy - 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(-5, hy - R + 2);
      for (let i = 0; i <= 4; i++) {
        const x = -5 + i * 2.5;
        ctx.lineTo(x + 1.25, hy - R - 7 + (i % 2) * 2);
        ctx.lineTo(x + 2.5, hy - R + 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 6:
      cap();
      ctx.beginPath();
      ctx.arc(0, hy - R - 3.5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, r: number, spin: number) {
  drawShadow(ctx, x, y, r * 1.05, r * 0.42, 0.3 / (1 + z * 0.02));
  const by = y - r - z;
  ctx.save();
  ctx.translate(x, by);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.clip();
  ctx.rotate(spin);
  ctx.fillStyle = INK;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36);
  }
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, by, r, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/** Dibuja un jugador en un canvas chico (vista previa / tarjeta). */
export function renderAvatar(canvas: HTMLCanvasElement, look: Look, kit: Kit, opts: { celebrate?: string | false; phase?: number; outfit?: "suit"; hold?: "balon" | "bota" | "copa" } = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(w * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const s = (h * 0.8) / 60;
  drawPlayer(ctx, { x: w / 2, y: h * 0.93, s, look, kit, face: 1, phase: opts.phase ?? 0, moving: 0, celebrate: opts.celebrate, outfit: opts.outfit, hold: opts.hold });
}
