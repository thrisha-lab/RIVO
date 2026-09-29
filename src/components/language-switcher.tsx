"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Check, X } from "lucide-react";
import { useI18n, LANGS } from "@/components/i18n-provider";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = React.useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground transition hover:bg-accent"
      >
        <Globe className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[600]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 z-[700] w-44 overflow-hidden rounded-lg border bg-background shadow-lg"
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Language</span>
                <button onClick={() => setOpen(false)} className="rounded p-0.5 hover:bg-accent" aria-label="Close">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLang(l.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition ${
                      lang === l.code ? "bg-primary/10 font-medium text-primary" : "hover:bg-accent"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{l.flag}</span>
                      <span>{l.nativeLabel}</span>
                    </span>
                    {lang === l.code && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Current language indicator (hidden, but accessible) */}
      <span className="sr-only">Current: {current.nativeLabel}</span>
    </div>
  );
}
