"use client";

import * as React from "react";
import { translate, type Lang, LANGS } from "@/lib/i18n";

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = React.createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

const STORAGE_KEY = "rg-lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("en");

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved === "en" || saved === "hi") {
      setLangState(saved);
    } else if (typeof navigator !== "undefined") {
      // Auto-detect from browser language.
      const bl = navigator.language.toLowerCase();
      if (bl.startsWith("hi")) setLangState("hi");
    }
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = React.useCallback((key: string) => translate(lang, key), [lang]);

  const value = React.useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return React.useContext(I18nContext);
}

export { LANGS };
export type { Lang };
