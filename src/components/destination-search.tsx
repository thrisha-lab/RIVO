"use client";

import * as React from "react";
import { Search, Loader2, MapPin, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { GeoResult } from "@/lib/types";

interface Props {
  onSelect: (r: { lat: number; lng: number; label: string }) => void;
  recent: { id: string; label: string; lat: number; lng: number }[];
}

export default function DestinationSearch({ onSelect, recent }: Props) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<GeoResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = React.useCallback((query: string) => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    api
      .searchPlaces(query)
      .then((r) => {
        setResults(r.results);
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(v), 350);
  };

  const pick = (r: GeoResult) => {
    onSelect({ lat: r.lat, lng: r.lng, label: r.displayName.split(",")[0] });
    setQ(r.displayName.split(",")[0]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          placeholder="Search destination — area, landmark, address…"
          className="pl-9 pr-9"
          aria-label="Search destination"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              setResults([]);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {loading && <Loader2 className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {open && (results.length > 0 || recent.length > 0) && (
        <Card className="absolute z-[1000] mt-1 max-h-80 w-full overflow-y-auto p-1 shadow-lg">
          {results.length > 0 && (
            <div className="space-y-0.5">
              {results.map((r, i) => (
                <button
                  key={`${r.lat}-${r.lng}-${i}`}
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{r.displayName}</span>
                </button>
              ))}
            </div>
          )}
          {results.length === 0 && recent.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</div>
              {recent.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onSelect({ lat: r.lat, lng: r.lng, label: r.label });
                    setQ(r.label);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
