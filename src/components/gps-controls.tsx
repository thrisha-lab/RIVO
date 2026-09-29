"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LocateFixed, Square, Crosshair, Satellite, AlertTriangle, MapPin } from "lucide-react";

interface Props {
  tracking: boolean;
  currentLocation: { lat: number; lng: number; accuracy?: number } | null;
  permission: "idle" | "granted" | "denied" | "unavailable";
  address?: string | null;
  onStart: () => void;
  onStop: () => void;
  onLocate: () => void;
}

export default function GpsControls({ tracking, currentLocation, permission, address, onStart, onStop, onLocate }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Satellite className="h-4 w-4" /> GPS &amp; Location</span>
          {tracking ? (
            <Badge className="bg-emerald-500 text-white">● Tracking</Badge>
          ) : permission === "denied" ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : (
            <Badge variant="outline">Off</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {!tracking ? (
            <Button onClick={onStart} size="sm" className="gap-1.5">
              <LocateFixed className="h-4 w-4" /> Start tracking
            </Button>
          ) : (
            <Button onClick={onStop} size="sm" variant="destructive" className="gap-1.5">
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
          <Button onClick={onLocate} size="sm" variant="outline" className="gap-1.5">
            <Crosshair className="h-4 w-4" /> Find me
          </Button>
        </div>

        {currentLocation ? (
          <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium">Current position</span>
              {typeof currentLocation.accuracy === "number" && (
                <span className="text-muted-foreground">±{Math.round(currentLocation.accuracy)} m</span>
              )}
            </div>
            {address ? (
              <div className="mt-0.5 flex items-start gap-1 font-medium text-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-sky-500" />
                <span className="line-clamp-2">{address}</span>
              </div>
            ) : null}
            <div className="mt-0.5 tabular-nums text-muted-foreground">
              {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No GPS fix yet. Grant location access to begin.</div>
        )}

        {permission === "denied" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Location permission was denied. Enable it in your browser settings to use live tracking.</span>
          </div>
        )}
        {permission === "unavailable" && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Geolocation is not available in this browser.</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          GPS positions are stored separately from your searched destinations and only linked to your anonymous rider ID.
        </p>
      </CardContent>
    </Card>
  );
}
