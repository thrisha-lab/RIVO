"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Bike } from "lucide-react";
import type { DeliveryImpact } from "@/lib/types";

interface Props {
  impact: DeliveryImpact | null;
}

const WORTH_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  yes: { label: "Worth it", color: "text-emerald-700 dark:text-emerald-300", bg: "from-emerald-50 to-emerald-50/30 dark:from-emerald-950/30 dark:to-transparent", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" /> },
  caution: { label: "Proceed with caution", color: "text-amber-700 dark:text-amber-300", bg: "from-amber-50 to-amber-50/30 dark:from-amber-950/30 dark:to-transparent", icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  no: { label: "Not worth it", color: "text-red-700 dark:text-red-300", bg: "from-red-50 to-red-50/30 dark:from-red-950/30 dark:to-transparent", icon: <XCircle className="h-4 w-4 text-red-600" /> },
};

export default function DeliveryImpactCard({ impact }: Props) {
  return (
    <AnimatePresence mode="wait">
      {impact && (
        <motion.div
          key={impact.adjustedDurationMin}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          <Card className={`border-l-4 border-l-sky-400 bg-gradient-to-br ${WORTH_META[impact.worthIt].bg}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bike className="h-4 w-4 text-sky-500" /> Delivery Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Time comparison */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Estimated time</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums">{impact.adjustedDurationMin}<span className="text-sm text-muted-foreground">min</span></span>
                    {impact.extraMinutes > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                        <TrendingUp className="h-3 w-3" /> +{impact.extraMinutes}min
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-through">{impact.baseDurationMin} min baseline</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Slowdown</div>
                  <div className={`text-xl font-bold tabular-nums ${impact.slowDownPct > 20 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                    +{impact.slowDownPct}%
                  </div>
                </div>
              </div>

              {/* Reason */}
              {impact.extraMinutes > 0 && (
                <p className="text-xs text-muted-foreground">{impact.reason}</p>
              )}

              {/* Worth-it guidance */}
              <div className={`flex items-start gap-2 rounded-lg border p-2.5 ${WORTH_META[impact.worthIt].bg} border-current/20`}>
                <span className={`mt-0.5 ${WORTH_META[impact.worthIt].color}`}>{WORTH_META[impact.worthIt].icon}</span>
                <div>
                  <div className={`text-xs font-semibold ${WORTH_META[impact.worthIt].color}`}>{WORTH_META[impact.worthIt].label}</div>
                  <p className="text-xs text-muted-foreground">{impact.worthItReason}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
