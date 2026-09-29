"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MapPin, Star } from "lucide-react";
import { api, SAFE_STOP_ICON } from "@/lib/api-client";
import type { SafeStopItem } from "@/lib/types";

interface Props {
  stops: SafeStopItem[];
  loading: boolean;
  onFocus: (lat: number, lng: number) => void;
}

const TYPE_LABEL: Record<string, string> = {
  cafe: "Cafe",
  shelter: "Shelter",
  restroom: "Restroom",
  charging: "Charging",
  first_aid: "First aid",
  parking: "Parking",
};

export default function SafeStopsList({ stops, loading, onFocus }: Props) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Safe Stops Nearby</span>
          <Badge variant="outline">{stops.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-80 px-4 pb-4">
          {loading && stops.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">Finding safe stops…</div>
          ) : stops.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No safe stops within range. Try widening your search.</div>
          ) : (
            <div className="space-y-2">
              {stops.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg border p-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <span>{SAFE_STOP_ICON[s.type] ?? "🛡️"}</span>
                      {s.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.address ?? TYPE_LABEL[s.type] ?? s.type}</div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {s.distanceM != null && <span>{Math.round(s.distanceM)} m</span>}
                      {s.hours && <span>· 🕒 {s.hours}</span>}
                      {s.amenities && <span>· {s.amenities}</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="tabular-nums">{s.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onFocus(s.lat, s.lng)} aria-label="Focus on map">
                    <MapPin className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
