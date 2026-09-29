"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, BadgeCheck, MapPin, Radio } from "lucide-react";
import { api, HAZARD_ICON, HAZARD_LABEL } from "@/lib/api-client";
import type { FeedItem } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  feed: FeedItem[];
  loading: boolean;
  center: { lat: number; lng: number } | null;
  onVoteChange: () => void;
  onFocus: (lat: number, lng: number) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const SEV_COLOR: Record<string, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-600",
};

export default function CommunityFeed({ feed, loading, onVoteChange, onFocus }: Props) {
  const vote = async (id: string, v: "confirm" | "dispute") => {
    try {
      const res = await api.vote(id, v);
      toast.success(res.action === "removed" ? `Vote removed` : `Vote recorded (${res.status})`);
      onVoteChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Radio className="h-4 w-4" /> Rider Network Feed</span>
          <Badge variant="outline">{feed.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-96 px-4 pb-4">
          {loading && feed.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">Loading community intelligence…</div>
          ) : feed.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No nearby activity yet. Be the first to report a hazard.</div>
          ) : (
            <div className="space-y-2">
              {feed.map((item, i) => (
                <div key={`${item.kind}-${item.id ?? item.name}-${i}`} className="rounded-lg border p-2.5">
                  {item.kind === "hazard" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <span>{HAZARD_ICON[item.type ?? "other"] ?? "❗"}</span>
                          {HAZARD_LABEL[item.type ?? "other"] ?? item.type}
                          {item.verified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
                        </div>
                        <Badge variant="outline" className={`text-white ${SEV_COLOR[item.severity ?? "moderate"]}`}>{item.severity}</Badge>
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.distanceM != null ? `${Math.round(item.distanceM)} m away` : ""} · {item.reporter?.displayName ?? "Rider"} · {item.createdAt ? timeAgo(item.createdAt) : ""}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /></span>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => vote(item.id!, "confirm")}>
                          <ThumbsUp className="h-3 w-3" /> Confirm ({item.confirmCount ?? 0})
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => vote(item.id!, "dispute")}>
                          <ThumbsDown className="h-3 w-3" /> Resolved ({item.disputeCount ?? 0})
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onFocus(item.lat, item.lng)}>
                          <MapPin className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{item.name}</div>
                        <Badge variant="outline" className="capitalize">{item.kind}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.distanceM != null ? `${Math.round(item.distanceM)} m away` : ""} · {item.hours ?? ""} {item.amenities ? `· ${item.amenities}` : ""}
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onFocus(item.lat, item.lng)}>
                        <MapPin className="h-3 w-3" /> Show on map
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
