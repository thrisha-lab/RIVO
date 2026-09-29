"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Loader2, Medal, Award, Star, Siren, ThumbsUp } from "lucide-react";
import { api } from "@/lib/api-client";
import type { LeaderboardEntry } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  riderId: string | null;
}

const RANK_STYLES: Record<number, { icon: React.ReactNode; className: string }> = {
  1: { icon: <Trophy className="h-3.5 w-3.5" />, className: "bg-amber-400 text-amber-950" },
  2: { icon: <Medal className="h-3.5 w-3.5" />, className: "bg-slate-300 text-slate-800" },
  3: { icon: <Award className="h-3.5 w-3.5" />, className: "bg-orange-400 text-orange-950" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function LeaderboardPanel({ riderId }: Props) {
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .leaderboard(10)
      .then((r) => {
        setEntries(r.leaderboard.map((e) => ({ ...e, isYou: e.id === riderId })));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load leaderboard"))
      .finally(() => setLoading(false));
  }, [riderId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" /> Safety Contributors
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading leaderboard…
          </div>
        ) : entries.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No contributors yet.</div>
        ) : (
          <ScrollArea className="max-h-80">
            <div className="space-y-1.5 pr-2">
              {entries.map((e, i) => {
                const rank = RANK_STYLES[e.rank];
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 rounded-lg border p-2.5 transition ${
                      e.isYou ? "border-sky-400/60 bg-sky-50 dark:bg-sky-950/20" : "bg-card/50"
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rank ? rank.className : "bg-muted text-muted-foreground"}`}>
                      {rank ? rank.icon : e.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{e.displayName}</span>
                        {e.isYou && <Badge variant="outline" className="text-[9px] text-sky-600">you</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Siren className="h-2.5 w-2.5" />{e.reportsCount}</span>
                        <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" />{e.votesCount}</span>
                        <span>· seen {timeAgo(e.lastSeenAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold tabular-nums">{e.reputation}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
