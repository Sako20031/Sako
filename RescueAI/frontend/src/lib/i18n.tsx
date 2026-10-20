import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import ru, { type Dict, type Key } from "../i18n/ru";
import { getLang, setLang as persist, type Lang } from "./settings";
import type { L3 } from "../data/flags";

// Russian ships in the main bundle; other languages load on demand.
const loaders: Record<Lang, () => Promise<Dict>> = {
  ru: async () => ru,
  en: () => import("../i18n/en").then((m) => m.default),
  kk: () => import("../i18n/kk").then((m) => m.default),
};

interface Ctx { lang: Lang; t: (k: Key) => string; l3: (v: L3) => string; setLang: (l: Lang) => void }
const I18n = createContext<Ctx>({ lang: "ru", t: (k) => ru[k], l3: (v) => v.ru, setLang: () => {} });

export function I18nProvider({ children }: { children: any }) {
  const [lang, setLangState] = useState<Lang>(getLang());
  const [dict, setDict] = useState<Dict>(ru);
  useEffect(() => {
    let live = true;
    loaders[lang]().then((d) => live && setDict(d));
    document.documentElement.lang = lang;
    return () => { live = false; };
  }, [lang]);
  const value: Ctx = {
    lang,
    t: (k) => dict[k] ?? ru[k] ?? k,
    l3: (v) => v[lang] ?? v.ru,
    setLang: (l) => { persist(l); setLangState(l); },
  };
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export const useI18n = () => useContext(I18n);
