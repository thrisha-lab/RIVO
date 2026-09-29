"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Siren, Loader2, CheckCircle2 } from "lucide-react";
import { api, HAZARD_LABEL } from "@/lib/api-client";
import { toast } from "sonner";

const TYPES = Object.keys(HAZARD_LABEL);
const SEVERITIES = ["low", "moderate", "high", "critical"] as const;
const SEV_COLOR: Record<string, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-600",
};

interface Props {
  currentLocation: { lat: number; lng: number } | null;
  pinLocation: { lat: number; lng: number } | null;
  onCreated: () => void;
}

export default function HazardReportForm({ currentLocation, pinLocation, onCreated }: Props) {
  const [type, setType] = React.useState("pothole");
  const [severity, setSeverity] = React.useState<string>("moderate");
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const loc = pinLocation ?? currentLocation;

  const submit = async () => {
    if (!loc) {
      toast.error("Set a location first (find me or tap the map).");
      return;
    }
    setSubmitting(true);
    try {
      await api.createHazard({
        lat: loc.lat,
        lng: loc.lng,
        type,
        severity,
        description: description.trim() || undefined,
      });
      toast.success("Hazard reported. Thanks for protecting fellow riders!");
      setSuccess(true);
      setDescription("");
      setTimeout(() => setSuccess(false), 2500);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to report hazard");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Siren className="h-4 w-4" /> Report a Hazard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{HAZARD_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SEVERITIES.map((s) => (
            <Badge
              key={s}
              variant="outline"
              className={`cursor-pointer capitalize ${severity === s ? `${SEV_COLOR[s]} text-white border-transparent` : ""}`}
              onClick={() => setSeverity(s)}
            >
              {s}
            </Badge>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="hz-desc" className="text-xs">Details (optional)</Label>
          <Textarea
            id="hz-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. large water-filled pothole near the junction"
            rows={2}
            maxLength={500}
          />
        </div>

        <div className="rounded-md border bg-muted/40 p-2 text-xs">
          <span className="text-muted-foreground">Pin location: </span>
          {loc ? (
            <span className="font-mono">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</span>
          ) : (
            <span className="text-muted-foreground">no location set</span>
          )}
        </div>

        <Button onClick={submit} disabled={submitting || !loc} className="w-full gap-1.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle2 className="h-4 w-4" /> : <Siren className="h-4 w-4" />}
          {success ? "Reported!" : "Submit report"}
        </Button>
      </CardContent>
    </Card>
  );
}
