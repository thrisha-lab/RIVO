"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Siren, Loader2, CheckCircle2, ImagePlus, X, MapPin } from "lucide-react";
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
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const loc = pinLocation ?? currentLocation;

  const onFile = async (file: File) => {
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large (max 4MB).");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Use JPEG, PNG, WebP, or GIF.");
      return;
    }
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const res = await api.uploadHazardImage(file);
      setImageUrl(res.imageUrl);
      toast.success("Image attached.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl(null);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

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
        imageUrl: imageUrl ?? undefined,
      });
      toast.success("Hazard reported. Thanks for protecting fellow riders!");
      setSuccess(true);
      setDescription("");
      clearImage();
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
              className={`cursor-pointer capitalize transition ${severity === s ? `${SEV_COLOR[s]} text-white border-transparent` : "hover:bg-accent"}`}
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

        {/* Image upload */}
        <div className="space-y-1.5">
          <Label className="text-xs">Photo (optional)</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-lg border">
              <img src={previewUrl} alt="hazard preview" className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white backdrop-blur transition hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition hover:border-foreground/30 hover:bg-accent/40"
            >
              <ImagePlus className="h-5 w-5" />
              <span>Tap to add a photo</span>
              <span className="text-[10px]">JPEG, PNG, WebP · max 4MB</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 p-2 text-xs">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Pin: </span>
          {loc ? (
            <span className="font-mono">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</span>
          ) : (
            <span className="text-muted-foreground">no location set</span>
          )}
        </div>

        <Button onClick={submit} disabled={submitting || !loc || uploading} className="w-full gap-1.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle2 className="h-4 w-4" /> : <Siren className="h-4 w-4" />}
          {submitting ? "Submitting…" : success ? "Reported!" : "Submit report"}
        </Button>
      </CardContent>
    </Card>
  );
}
