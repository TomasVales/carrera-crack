import { useEffect, useId, useRef, type ReactNode } from "react";
import type { Club, Look } from "../game/data";
import { renderAvatar, type Kit } from "../game/draw";
import { sfx } from "../game/audio";

/** Color de texto legible sobre un fondo. */
export function ink(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#111827" : "#ffffff";
}

/** Tiñe la interfaz con los colores del club. */
export function useClubTheme(c1: string, c2: string) {
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--c1", c1);
    r.setProperty("--c2", c2);
    r.setProperty("--ink1", ink(c1));
  }, [c1, c2]);
}

export function Crest({ club, size = 48 }: { club: Club; size?: number }) {
  const id = useId().replace(/:/g, "");
  const shield = "M50 4 L92 15 V50 C92 76 73 92 50 101 C27 92 8 76 8 50 V15 Z";
  const p = club.pattern;
  return (
    <svg width={size} height={size * 1.04} viewBox="0 0 100 104" className="shrink-0 drop-shadow">
      <defs>
        <clipPath id={`s${id}`}>
          <path d={shield} />
        </clipPath>
      </defs>
      <g clipPath={`url(#s${id})`}>
        <rect width="100" height="104" fill={club.c1} />
        {p === "stripes" && [18, 42, 66].map((x) => <rect key={x} x={x} y="0" width="12" height="104" fill={club.c2} />)}
        {p === "half" && <rect x="50" y="0" width="50" height="104" fill={club.c2} />}
        {p === "band" && <polygon points="0,30 30,0 100,70 70,104 0,104" fill={club.c2} opacity=".9" transform="translate(0,-14) scale(1,0.8)" />}
        {p === "cross" && (
          <>
            <rect x="40" y="0" width="20" height="104" fill={club.c2} />
            <rect x="0" y="40" width="100" height="20" fill={club.c2} />
          </>
        )}
        {p === "hoops" && [24, 52, 80].map((y) => <rect key={y} x="0" y={y} width="100" height="12" fill={club.c2} />)}
        <rect x="0" y="0" width="100" height="30" fill="rgba(0,0,0,.28)" />
      </g>
      <path d={shield} fill="none" stroke="#111" strokeWidth="5" />
      <path d={shield} fill="none" stroke={club.c2} strokeWidth="2" transform="translate(5,5) scale(0.9)" opacity=".8" />
      <text x="50" y="22" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" fontStyle="italic">
        {club.short}
      </text>
      <text x="50" y="72" textAnchor="middle" fontSize="34" fill={ink(p === "half" ? "#666666" : club.c1)}>
        ★
      </text>
    </svg>
  );
}

export function Avatar({ look, kit, size = 120, celebrate = false, className = "" }: { look: Look; kit: Kit; size?: number; celebrate?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.05;
      renderAvatar(c, look, kit, { celebrate, phase: celebrate ? t * 4 : t });
      if (celebrate) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [look, kit, celebrate]);
  return <canvas ref={ref} style={{ width: size * 0.8, height: size }} className={className} />;
}

export function Bar({ value, max = 100, color = "var(--c1)", h = 8 }: { value: number; max?: number; color?: string; h?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/10" style={{ height: h }}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

export function statColor(v: number) {
  return v >= 80 ? "#22c55e" : v >= 70 ? "#84cc16" : v >= 60 ? "#facc15" : v >= 50 ? "#fb923c" : "#ef4444";
}

export function RatingBadge({ r, size = 56 }: { r: number; size?: number }) {
  const col = r >= 8 ? "#22c55e" : r >= 7 ? "#84cc16" : r >= 6 ? "#facc15" : r >= 5 ? "#fb923c" : "#ef4444";
  return (
    <div className="pop flex items-center justify-center rounded-full font-black text-slate-900 shadow-lg" style={{ width: size, height: size, background: col, fontSize: size * 0.38 }}>
      {r.toFixed(1)}
    </div>
  );
}

export function Btn({ children, onClick, kind = "club", className = "", disabled }: { children: ReactNode; onClick?: () => void; kind?: "club" | "gold" | "ghost"; className?: string; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        sfx.click();
        onClick?.();
      }}
      className={`btn btn-${kind} ${className}`}
    >
      {children}
    </button>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-300" aria-label={`${n} estrellas`}>
      {"★".repeat(n)}
      <span className="text-white/20">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export const clubStars = (strength: number) => Math.max(1, Math.min(5, Math.round((strength - 50) / 8)));
