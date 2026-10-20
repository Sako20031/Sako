// Per-device preferences only (language, theme, offline metadata). Never patient data.
export type Lang = "ru" | "kk" | "en";
export type Theme = "system" | "light" | "dark";

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch { /* private mode: fine */ }
}

export const getLang = (): Lang => (["ru", "kk", "en"].includes(read("rescue.lang") ?? "") ? (read("rescue.lang") as Lang) : "ru");
export const setLang = (l: Lang) => write("rescue.lang", l);
export const getTheme = (): Theme => (read("rescue.theme") as Theme) || "system";
export function setTheme(t: Theme) {
  write("rescue.theme", t);
  applyTheme(t);
}
export function applyTheme(t: Theme) {
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}
export const readMeta = (k: string) => read(`rescue.meta.${k}`);
export const writeMeta = (k: string, v: string) => write(`rescue.meta.${k}`, v);
