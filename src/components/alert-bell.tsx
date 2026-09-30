"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, AlertTriangle, CloudLightning, Siren, TrendingUp, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api-client";
import type { AlertItem, NotificationPrefs } from "@/lib/types";
import { toast } from "sonner";

const SEV_META: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  info: { color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-100 dark:bg-sky-950", icon: <Bell className="h-3.5 w-3.5" /> },
  warning: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  critical: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  severe_weather: <CloudLightning className="h-4 w-4" />,
  new_hazard_nearby: <Siren className="h-4 w-4" />,
  risk_escalation: <TrendingUp className="h-4 w-4" />,
  sos_ack: <AlertTriangle className="h-4 w-4" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function AlertBell() {
  const [open, setOpen] = React.useState(false);
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [prefs, setPrefs] = React.useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([api.getAlerts(false, 30), api.getPrefs().catch(() => null)]);
      setAlerts(a.alerts);
      setUnread(a.unreadCount);
      if (p) setPrefs(p);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    // Poll every 60s for new alerts.
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const markAllRead = async () => {
    try {
      await api.markAlertsRead({ all: true });
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnread(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const togglePref = async (key: keyof NotificationPrefs, val: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    try {
      await api.updatePrefs({ [key]: val });
    } catch {
      setPrefs(prefs); // revert
      toast.error("Failed to update preference.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Alerts${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground transition hover:bg-accent"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] flex justify-end bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full max-w-sm flex-col border-l bg-background shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm font-bold">Alerts</span>
                  {unread > 0 && <Badge variant="destructive" className="text-[10px]">{unread} new</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={markAllRead}>
                      <Check className="h-3 w-3" /> Mark all read
                    </Button>
                  )}
                  <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-accent" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Preferences */}
              {prefs && (
                <div className="border-b bg-muted/30 p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notify me about</div>
                  <div className="space-y-2">
                    <PrefRow label="Severe weather" desc="Storms, heavy rain, fog" checked={prefs.severeWeather} onChange={(v) => togglePref("severeWeather", v)} />
                    <PrefRow label="New hazard nearby" desc="High/critical hazards near your route" checked={prefs.newHazardNearby} onChange={(v) => togglePref("newHazardNearby", v)} />
                    <PrefRow label="Risk escalation" desc="When trip risk rises significantly" checked={prefs.riskEscalation} onChange={(v) => togglePref("riskEscalation", v)} />
                    <PrefRow label="Community updates" desc="Hazard confirmations, verifications" checked={prefs.communityUpdates} onChange={(v) => togglePref("communityUpdates", v)} />
                  </div>
                </div>
              )}

              {/* Alerts list */}
              <ScrollArea className="flex-1">
                <div className="p-3">
                  {loading && alerts.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Loading alerts…</div>
                  ) : alerts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <BellOff className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No alerts yet.</p>
                      <p className="text-xs text-muted-foreground/70">We'll notify you of severe weather and nearby hazards.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map((a, i) => {
                        const sev = SEV_META[a.severity] ?? SEV_META.info;
                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(i * 0.03, 0.3) }}
                            className={`relative rounded-lg border p-3 ${a.read ? "bg-card/30" : "bg-card"}`}
                          >
                            {!a.read && <span className="absolute left-1 top-3 h-1.5 w-1.5 rounded-full bg-sky-500" />}
                            <div className="flex items-start gap-2 pl-2">
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${sev.bg} ${sev.color}`}>
                                {TYPE_ICON[a.type] ?? <Bell className="h-3.5 w-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="truncate text-sm font-semibold">{a.title}</span>
                                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{a.body}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PrefRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
