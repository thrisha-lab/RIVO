"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Shortcut {
  keys: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: "g then s", description: "Open Settings" },
  { keys: "g then f", description: "Focus destination search" },
  { keys: "g then r", description: "Go to Report tab" },
  { keys: "g then h", description: "Go to Trip History" },
  { keys: "g then b", description: "Go to Badges" },
  { keys: "g then t", description: "Go to Top riders" },
  { keys: "?", description: "Toggle this shortcuts panel" },
  { keys: "Esc", description: "Close any open modal" },
];

export default function KeyboardShortcutsOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[900] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-md overflow-hidden border shadow-2xl">
              <div className="flex items-center justify-between border-b bg-gradient-to-r from-sky-50 to-emerald-50 px-5 py-3 dark:from-sky-950/30 dark:to-emerald-950/30">
                <div className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-sky-500" />
                  <span className="text-sm font-bold">Keyboard Shortcuts</span>
                </div>
                <button onClick={onClose} className="rounded-md p-1 hover:bg-accent" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1.5 p-4">
                {SHORTCUTS.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40">
                    <span className="text-sm text-muted-foreground">{s.description}</span>
                    <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold shadow-sm">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
                <div className="mt-3 rounded-md border border-dashed bg-muted/20 p-2 text-[11px] text-muted-foreground">
                  Tip: The "g" prefix waits for the next key within 1.2 seconds.
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
