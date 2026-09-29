"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Plus, X, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import type { FavoriteDestination } from "@/lib/types";
import { toast } from "sonner";

const EMOJI_CHOICES = ["📍", "🏠", "🏢", "🏪", "🍔", "☕", "⛽", "🏥", "🏫", "🛒"];

interface Props {
  currentDestination: { lat: number; lng: number; label: string } | null;
  onSelect: (fav: FavoriteDestination) => void;
}

export default function FavoritesBar({ currentDestination, onSelect }: Props) {
  const [favorites, setFavorites] = React.useState<FavoriteDestination[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showSave, setShowSave] = React.useState(false);
  const [emoji, setEmoji] = React.useState("📍");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getFavorites();
      setFavorites(r.favorites);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveCurrent = async () => {
    if (!currentDestination) {
      toast.error("Set a destination first.");
      return;
    }
    setSaving(true);
    try {
      await api.addFavorite({
        label: currentDestination.label,
        lat: currentDestination.lat,
        lng: currentDestination.lng,
        emoji,
      });
      toast.success("Saved to favorites.");
      setShowSave(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success("Removed.");
    } catch (e2) {
      toast.error(e2 instanceof Error ? e2.message : "Failed");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {loading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading favorites…
        </div>
      ) : (
        <>
          {favorites.length === 0 ? (
            <span className="text-xs text-muted-foreground">No saved spots yet.</span>
          ) : (
            favorites.slice(0, 8).map((f) => (
              <motion.button
                key={f.id}
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(f)}
                className="group relative inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition hover:border-foreground/30 hover:shadow-sm"
              >
                <span className="text-sm">{f.emoji}</span>
                <span className="max-w-[100px] truncate">{f.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => remove(f.id, e)}
                  onKeyDown={(e) => { if (e.key === "Enter") remove(f.id, e as unknown as React.MouseEvent); }}
                  className="ml-0.5 hidden rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:inline-flex"
                  aria-label={`Remove ${f.label}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </motion.button>
            ))
          )}

          {/* Save current destination */}
          {currentDestination && (
            <AnimatePresence>
              {showSave ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1 rounded-full border bg-card p-1"
                >
                  <div className="flex gap-0.5">
                    {EMOJI_CHOICES.slice(0, 5).map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEmoji(em)}
                        className={`rounded-full p-0.5 text-sm transition ${emoji === em ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-accent"}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" onClick={saveCurrent} disabled={saving} className="h-6 gap-1 px-2 text-[11px]">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Save
                  </Button>
                  <button onClick={() => setShowSave(false)} className="rounded-full p-0.5 text-muted-foreground hover:bg-accent">
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowSave(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                >
                  <Star className="h-3 w-3" /> Save current
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </>
      )}
    </div>
  );
}
