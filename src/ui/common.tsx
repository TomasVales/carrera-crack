import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { customCrest, setCustomCrest, type Team, type Look } from "../game/data";
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

/** Avisa a todos los escudos cuando alguien carga una imagen propia. */
function useCrestVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((x) => x + 1);
    window.addEventListener("crack-crest", f);
    return () => window.removeEventListener("crack-crest", f);
  }, []);
  return v;
}

export function Crest({ club, size = 48 }: { club: Team; size?: number }) {
  useCrestVersion();
  const custom = customCrest(club.id);
  if (custom) return <img src={custom} alt={club.name} width={size} height={size} className="shrink-0 object-contain drop-shadow" style={{ width: size, height: size }} />;
  if (club.flag) return <FlagBadge flag={club.flag} size={size} />;
  return <DrawnCrest club={club} size={size} />;
}

function FlagBadge({ flag, size }: { flag: string; size: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20" style={{ width: size, height: size, fontSize: size * 0.62, lineHeight: 1 }}>
      {flag}
    </span>
  );
}

/** Cargar un escudo propio para un equipo (se guarda solo en este dispositivo). */
export function CrestEditor({ club, onClose }: { club: Team; onClose: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  async function load(f: File) {
    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const ctx = c.getContext("2d")!;
      const k = Math.min(128 / img.width, 128 / img.height);
      ctx.drawImage(img, (128 - img.width * k) / 2, (128 - img.height * k) / 2, img.width * k, img.height * k);
      URL.revokeObjectURL(url);
      setCustomCrest(club.id, c.toDataURL("image/png"));
      window.dispatchEvent(new Event("crack-crest"));
      onClose();
    } catch {
      setErr("No se pudo leer esa imagen.");
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card pop w-full max-w-sm p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-center"><Crest club={club} size={96} /></div>
        <div className="title-font text-xl">{club.name}</div>
        <p className="mt-1 text-sm text-white/60">Subí una imagen para usarla como escudo. Queda guardada solo en este dispositivo.</p>
        <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); }} />
        <div className="mt-4 grid gap-2">
          <Btn kind="gold" className="py-3" onClick={() => file.current?.click()}>📷 Elegir imagen</Btn>
          {customCrest(club.id) && <Btn kind="ghost" className="py-2 text-sm" onClick={() => { setCustomCrest(club.id, null); window.dispatchEvent(new Event("crack-crest")); onClose(); }}>Volver al escudo dibujado</Btn>}
          <Btn kind="ghost" className="py-2 text-sm" onClick={onClose}>Cerrar</Btn>
        </div>
        {err && <p className="mt-2 text-sm text-rose-300">{err}</p>}
      </div>
    </div>
  );
}

function DrawnCrest({ club, size }: { club: Team; size: number }) {
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
        {p === "flag" && <rect x="0" y="36" width="100" height="34" fill={club.c2} />}
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

export function Avatar({ look, kit, size = 120, celebrate = false, className = "", outfit, hold }: { look: Look; kit: Kit; size?: number; celebrate?: string | false; className?: string; outfit?: "suit"; hold?: "balon" | "bota" | "copa" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    let raf = 0;
    let t = 0;
    const tick = () => {
      t += 0.05;
      renderAvatar(c, look, kit, { celebrate, phase: celebrate ? t * 4 : t, outfit, hold });
      if (celebrate) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [look, kit, celebrate, outfit, hold]);
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
