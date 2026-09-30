"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Siren, X, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, HAZARD_LABEL } from "@/lib/api-client";

const QUICK_TYPES = ["pothole", "flooding", "construction", "poor_lighting", "slippery", "roadblock"];

interface Props {
  location: { lat: number; lng: number; accuracy?: number } | null;
  onCreated: () => void;
}

/**
 * Quick-report FAB — lets riders report a hazard at their current location
 * with a single tap, without navigating to the Report tab.
 *
 * Designed for ACTIVE RIDING: minimal interaction, auto-fills location,
 * defaults to "moderate" severity, lets the rider pick a type and submit.
 */
export default function QuickReportFab({ location, onCreated }: Props) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState("pothole");
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const submit = async () => {
    if (!location) return;
    setSubmitting(true);
    try {
      await api.createHazard({
        lat: location.lat,
        lng: location.lng,
        type,
        severity: "moderate",
      });
      setSuccess(true);
      toast.success("Quick report submitted!", {
        description: `${HAZARD_LABEL[type] ?? type} reported at your location.`,
      });
      onCreated();
      setTimeout(() => {
        setSuccess(false);
        setOpen(false);
      }, 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Quick report failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* FAB — only visible when location is available */}
      {location && !open && (
        <motion.button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Quick report hazard"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-5 left-5 z-[950] flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl ring-4 ring-orange-500/30 transition hover:bg-orange-600"
        >
          <Siren className="h-6 w-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && setOpen(false)}
            className="fixed inset-0 z-[950] flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-2xl border bg-background shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-white">
                <div className="flex items-center gap-2">
                  <Siren className="h-5 w-5" />
                  <span className="text-sm font-bold">Quick Report</span>
                </div>
                <button onClick={() => !submitting && setOpen(false)} className="rounded-md p-1 hover:bg-white/20" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {success ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30"
                  >
                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  </motion.div>
                  <p className="text-sm font-medium">Report submitted!</p>
                  <p className="text-xs text-muted-foreground">Thanks for protecting fellow riders.</p>
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {/* Location */}
                  <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-sky-500" />
                    <span className="text-muted-foreground">Reporting at:</span>
                    <span className="font-mono tabular-nums">{location!.lat.toFixed(4)}, {location!.lng.toFixed(4)}</span>
                  </div>

                  {/* Type selection */}
                  <div>
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hazard type</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {QUICK_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setType(t)}
                          className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                            type === t ? "border-orange-400 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" : "hover:bg-accent"
                          }`}
                        >
                          {HAZARD_LABEL[t] ?? t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Badge variant="outline" className="w-full justify-center py-1.5 text-xs">
                    Severity: Moderate (default)
                  </Badge>

                  <Button
                    onClick={submit}
                    disabled={submitting || !location}
                    className="w-full gap-1.5 bg-orange-500 hover:bg-orange-600"
                    size="lg"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
                    {submitting ? "Submitting…" : "Report now"}
                  </Button>
                  <p className="text-center text-[10px] text-muted-foreground">
                    Tap to instantly report at your current GPS location.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Inline toast import to avoid circular dependency issues
import { toast } from "sonner";
