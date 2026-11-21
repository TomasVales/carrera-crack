// Dibujo procedural en Canvas: jugadores "cabezones" (cabeza ≈ 60% del cuerpo), pelota y efectos.
import { BOOTS, HAIR_COLORS, SKINS, UGLY_BOOTS, type Look } from "./data";

export type Kit = { c1: string; c2: string; num?: number };

export type PlayerDraw = {
  x: number;
  y: number; // posición de los pies
  s: number; // escala (1 ≈ 50px de alto)
  look: Look;
  kit: Kit;
  face: number; // -1 izquierda, 1 derecha
  phase: number; // ciclo de carrera
  moving: number; // 0..1
  ring?: string; // aro de color bajo los pies (tu jugador)
  celebrate?: boolean;
  dive?: number; // arquero tirándose (-1..1)
};

const INK = "#161616";

function shade(hex: string, amt: number) {
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

export function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerDraw) {
  const { look, kit, s } = p;
  const skin = SKINS[look.skin] ?? SKINS[0];
  const hair = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS[0];
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(s, s);
  if (p.dive) ctx.rotate(p.dive * 1.1);

  if (p.ring) {
    ctx.strokeStyle = p.ring;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawShadow(ctx, 0, 0, 12, 4);

  const swing = Math.sin(p.phase) * 3.2 * p.moving;
  const bob = p.celebrate ? -Math.abs(Math.sin(p.phase * 1.4)) * 6 : -Math.abs(Math.sin(p.phase)) * 1.6 * p.moving;
  ctx.translate(0, bob);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";

  // piernas (medias del color principal) y botines
  const bootC = look.boots === UGLY_BOOTS ? "#a3e635" : BOOTS[look.boots] ?? BOOTS[0];
  for (const side of [-1, 1]) {
    const off = side * swing;
    rr(ctx, side * 4.2 - 2.6 + off * 0.3, -13, 5.2, 11, 2);
    ctx.fillStyle = shade(kit.c1, -0.08);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(side * 4.2 + off * 0.45 + p.face * 1.2, -1.6, 3.9, 2.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = bootC;
    ctx.fill();
    ctx.stroke();
    if (look.boots === UGLY_BOOTS) {
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(side * 4.2 + off * 0.45 + p.face * 1.2 - 1, -3.6, 2, 4);
    }
  }
  // short
  rr(ctx, -8.5, -17, 17, 7, 2.5);
  ctx.fillStyle = kit.c2;
  ctx.fill();
  ctx.stroke();

  // brazos
  const arm = p.celebrate ? -9 : 0;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 10.5, -21 + arm - side * swing * 0.4 * (p.celebrate ? 0 : 1), 3.1, 4.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.stroke();
  }
  // camiseta
  rr(ctx, -9.5, -29, 19, 14, 4.5);
  ctx.fillStyle = kit.c1;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = kit.c2;
  ctx.fillRect(-2.2, -30, 4.4, 16); // franja central
  ctx.fillStyle = "rgba(255,255,255,.16)";
  ctx.fillRect(-9.5, -29, 19, 4);
  ctx.restore();
  rr(ctx, -9.5, -29, 19, 14, 4.5);
  ctx.stroke();
  if (kit.num !== undefined && s >= 1.6) {
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
  // orejas
  ctx.beginPath();
  ctx.arc(-p.face * 12.6, hy + 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = shade(skin, -0.05);
  ctx.fill();
  ctx.stroke();

  drawBeard(ctx, look.beard, hair, hy, R, p.face);
  drawFace(ctx, look.eyes, hy, p.face, p.celebrate);
  drawHair(ctx, look.hair, hair, hy, R, p.face);
  ctx.restore();
}

function drawFace(ctx: CanvasRenderingContext2D, eyes: number, hy: number, face: number, celebrate?: boolean) {
  const fx = face * 3.4;
  // cachetes
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
  if (eyes === 2 || celebrate) {
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
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(fx + sx * 7, hy - 5.2);
        ctx.lineTo(fx + sx * 2.2, hy - 3.6);
        ctx.stroke();
      }
    }
  }
  // boca
  ctx.beginPath();
  if (celebrate) {
    ctx.ellipse(fx, hy + 6.8, 2.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#7f1d1d";
    ctx.fill();
  } else {
    ctx.arc(fx, hy + 5, 2.6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.lineCap = "butt";
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
    case 0: // rapado
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
    case 2: // jopo
      cap();
      ctx.beginPath();
      ctx.ellipse(face * 6, hy - R + 0.5, 8, 5.5, face * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 3: // rulos
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
    case 4: // melena
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
    case 5: // cresta
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
    case 6: // rodete
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
export function renderAvatar(canvas: HTMLCanvasElement, look: Look, kit: Kit, opts: { celebrate?: boolean; phase?: number } = {}) {
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
  const s = (h * 0.86) / 60;
  drawPlayer(ctx, { x: w / 2, y: h * 0.95, s, look, kit, face: 1, phase: opts.phase ?? 0, moving: 0, celebrate: opts.celebrate });
}
