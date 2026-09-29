"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RISK_META } from "@/lib/api-client";
import type { RiskAssessmentData } from "@/lib/types";
import { ShieldAlert, Activity, Gauge, Sparkles, Loader2 } from "lucide-react";

interface Props {
  risk: RiskAssessmentData | null;
  loading: boolean;
  onExplain: () => void;
  explaining: boolean;
}

export default function RiskDashboard({ risk, loading, onExplain, explaining }: Props) {
  if (loading && !risk) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Trip Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Analysing weather, hazards &amp; route…
        </CardContent>
      </Card>
    );
  }

  if (!risk) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4" /> Trip Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
          <p>Set your current location and a destination to compute a deterministic risk score.</p>
          <p className="text-xs">The risk engine is the single source of truth — AI only explains it.</p>
        </CardContent>
      </Card>
    );
  }

  const meta = RISK_META[risk.level];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Trip Risk Assessment
          </span>
          <Badge variant="outline" className={meta.color}>{meta.emoji} {meta.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Risk score</div>
              <div className={`text-4xl font-bold tabular-nums ${meta.color}`}>{risk.score}<span className="text-base text-muted-foreground">/100</span></div>
            </div>
            <div className="flex items-center gap-3 text-right text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Activity className="h-3 w-3" />{risk.hazards.activeCount} hazards</div>
              <div className="flex items-center gap-1"><Gauge className="h-3 w-3" />{risk.route ? `${risk.route.distanceKm.toFixed(1)} km` : "—"}</div>
            </div>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`absolute inset-y-0 left-0 ${meta.bg} transition-all duration-700`}
              style={{ width: `${risk.score}%` }}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contributing factors</div>
          {risk.factors.map((f) => (
            <div key={f.factor} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{f.factor}</span>
                <span className="tabular-nums text-muted-foreground">+{f.weight}</span>
              </div>
              <Progress value={Math.min(100, f.weight * 2.5)} className="h-1.5" />
              <div className="text-xs text-muted-foreground">{f.detail}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation</div>
          <p>{risk.recommendation}</p>
        </div>

        <button
          type="button"
          onClick={onExplain}
          disabled={explaining}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {explaining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {explaining ? "Asking AI co-pilot…" : "Ask AI co-pilot to explain"}
        </button>
      </CardContent>
    </Card>
  );
}
