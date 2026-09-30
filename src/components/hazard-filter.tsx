"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HAZARD_LABEL } from "@/lib/api-client";

export type SeverityFilter = "all" | "low" | "moderate" | "high" | "critical";

interface Props {
  hazardTypes: string[];
  activeTypes: Set<string>;
  activeSeverities: Set<SeverityFilter>;
  onToggleType: (type: string) => void;
  onToggleSeverity: (sev: SeverityFilter) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

const SEVERITIES: { value: SeverityFilter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "bg-slate-400" },
  { value: "low", label: "Low", color: "bg-emerald-500" },
  { value: "moderate", label: "Moderate", color: "bg-amber-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "critical", label: "Critical", color: "bg-red-600" },
];

export default function HazardFilter({
  hazardTypes,
  activeTypes,
  activeSeverities,
  onToggleType,
  onToggleSeverity,
  onClear,
  resultCount,
  totalCount,
}: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const hasActiveFilters = activeTypes.size > 0 || !activeSeverities.has("all") || (activeSeverities.size > 0 && !activeSeverities.has("all"));

  return (
    <div className="rounded-lg border bg-card/50">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          Filter Hazards
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[9px]">
              {totalCount - resultCount} hidden
            </Badge>
          )}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">{resultCount}/{totalCount}</span>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px]"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
            >
              Clear
            </Button>
          )}
          {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t"
          >
            <div className="space-y-3 p-3">
              {/* Severity filters */}
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Severity</div>
                <div className="flex flex-wrap gap-1.5">
                  {SEVERITIES.map((s) => {
                    const active = activeSeverities.has(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => onToggleSeverity(s.value)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                          active ? "border-transparent text-white" : "text-muted-foreground hover:bg-accent"
                        }`}
                        style={active ? { backgroundColor: s.color === "bg-slate-400" ? "#94a3b8" : undefined } : undefined}
                      >
                        <span className={`h-2 w-2 rounded-full ${s.color}`} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type filters */}
              {hazardTypes.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Type</div>
                  <div className="flex flex-wrap gap-1.5">
                    {hazardTypes.map((t) => {
                      const active = activeTypes.has(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => onToggleType(t)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                            active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {HAZARD_LABEL[t] ?? t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
