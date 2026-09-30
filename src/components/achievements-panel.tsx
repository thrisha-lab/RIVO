"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Trophy, Loader2, Lock } from "lucide-react";
import { api } from "@/lib/api-client";
import type { Badge as BadgeType } from "@/lib/types";
import { toast } from "sonner";

const TIER_STYLE: Record<string, { border: string; bg: string; glow: string }> = {
  bronze: { border: "border-amber-700/40", bg: "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-950/30 dark:to-transparent", glow: "shadow-amber-700/20" },
  silver: { border: "border-slate-400/50", bg: "bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800/40 dark:to-transparent", glow: "shadow-slate-400/20" },
  gold: { border: "border-yellow-500/50", bg: "bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-950/30 dark:to-transparent", glow: "shadow-yellow-500/30" },
  platinum: { border: "border-violet-500/50", bg: "bg-gradient-to-br from-violet-100 to-fuchsia-50 dark:from-violet-950/30 dark:to-transparent", glow: "shadow-violet-500/30" },
};

export default function AchievementsPanel() {
  const [badges, setBadges] = React.useState<BadgeType[]>([]);
  const [earnedCount, setEarnedCount] = React.useState(0);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .getAchievements()
      .then((r) => {
        setBadges(r.badges);
        setEarnedCount(r.earnedCount);
        setTotalCount(r.totalCount);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load badges"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Achievements</span>
          {!loading && totalCount > 0 && (
            <UiBadge variant="outline" className="text-xs">{earnedCount}/{totalCount}</UiBadge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading badges…
          </div>
        ) : badges.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No badges available.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {badges.map((b, i) => {
              const tier = TIER_STYLE[b.tier] ?? TIER_STYLE.bronze;
              return (
                <motion.div
                  key={b.code}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.03 }}
                  className={`relative flex flex-col items-center gap-1 rounded-lg border p-3 text-center ${tier.border} ${b.earned ? tier.bg : "bg-muted/20 opacity-50"} ${b.earned ? `shadow-sm ${tier.glow}` : ""}`}
                  title={b.description}
                >
                  <div className={`text-2xl ${b.earned ? "" : "grayscale"}`}>
                    {b.earned ? b.emoji : <Lock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="text-[11px] font-semibold leading-tight">{b.label}</div>
                  <div className="text-[9px] text-muted-foreground leading-tight">{b.description}</div>
                  {b.earned && b.earnedAt && (
                    <div className="text-[8px] uppercase tracking-wider text-emerald-600">
                      {new Date(b.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  )}
                  <span className="absolute right-1 top-1 text-[8px] font-bold uppercase tracking-wider opacity-60">{b.tier}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
