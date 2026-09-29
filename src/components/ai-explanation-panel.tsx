"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import type { AIExplanation } from "@/lib/types";

interface Props {
  explanation: AIExplanation | null;
  loading: boolean;
  levelLabel?: string;
}

export default function AiExplanationPanel({ explanation, loading, levelLabel }: Props) {
  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> AI Co-pilot
          {levelLabel && <span className="ml-auto text-xs font-normal text-muted-foreground">{levelLabel}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reasoning about your trip…
          </div>
        ) : !explanation ? (
          <div className="py-3 text-sm text-muted-foreground">
            Tap “Ask AI co-pilot to explain” to get a plain-language breakdown of your trip risk and tailored safety tips. The AI only explains the deterministic risk score — it cannot change it.
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed">{explanation.explanation}</p>
            {explanation.tips.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" /> Safety tips
                </div>
                <ul className="space-y-1.5">
                  {explanation.tips.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-md border bg-background p-2 text-sm">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground">
              AI explanation is advisory. The risk score is computed deterministically and is the source of truth.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
