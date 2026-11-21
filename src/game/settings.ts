// Ajustes del jugador que valen para todas las partidas (se guardan en este dispositivo).

export type Difficulty = 0 | 1 | 2; // fácil · normal · difícil
export const DIFF_NAMES = ["Fácil", "Normal", "Difícil"] as const;

type Settings = { difficulty: Difficulty; chants: boolean; vibrate: boolean; tutorialPlays: number };
const KEY = "crack-settings";
const DEFAULTS: Settings = { difficulty: 1, chants: true, vibrate: true, tutorialPlays: 0 };

let cache: Settings | null = null;

export function settings(): Settings {
  if (cache) return cache;
  let s: Partial<Settings> = {};
  try {
    s = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
  } catch {
    /* sin almacenamiento */
  }
  cache = { ...DEFAULTS, ...s };
  return cache;
}

export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  cache = { ...settings(), [k]: v };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* sin almacenamiento */
  }
}

/** Las primeras jugadas muestran ayudas en pantalla. */
export const TUTORIAL_PLAYS = 3;
export const tutorialOn = () => settings().tutorialPlays < TUTORIAL_PLAYS;
export const tutorialPlayed = () => setSetting("tutorialPlays", settings().tutorialPlays + 1);

/** Vibración corta en el celular (si el dispositivo la soporta y está activada). */
export function buzz(pattern: number | number[]) {
  if (!settings().vibrate) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no soportado */
  }
}
