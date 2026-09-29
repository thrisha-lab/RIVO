"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, BadgeCheck, MapPin, Radio, Loader2 } from "lucide-react";
import { api, HAZARD_ICON, HAZARD_LABEL } from "@/lib/api-client";
import type { FeedItem } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  feed: FeedItem[];
  loading: boolean;
  center: { lat: number; lng: number } | null;
  onVoteChange: () => void;
  onFocus: (lat: number, lng: number) => void;
  onHazardClick?: (id: string) => void;
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

function FeedSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-2.5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-2 h-2.5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 flex gap-1.5">
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            <div className="h-6 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityFeed({ feed, loading, onVoteChange, onFocus, onHazardClick }: Props) {
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
          {feed.length > 0 && <Badge variant="outline">{feed.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-96 px-4 pb-4">
          {loading && feed.length === 0 ? (
            <FeedSkeleton />
          ) : feed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Radio className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No nearby activity yet.</p>
              <p className="text-xs text-muted-foreground/70">Be the first to report a hazard.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {feed.map((item, i) => (
                <motion.div
                  key={`${item.kind}-${item.id ?? item.name}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className={`rounded-lg border bg-card/40 p-2.5 transition hover:shadow-sm ${item.kind === "hazard" && onHazardClick ? "cursor-pointer" : ""}`}
                  onClick={item.kind === "hazard" && onHazardClick ? () => onHazardClick(item.id!) : undefined}
                >
                  {item.kind === "hazard" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <span className="text-base">{HAZARD_ICON[item.type ?? "other"] ?? "❗"}</span>
                          {HAZARD_LABEL[item.type ?? "other"] ?? item.type}
                          {item.verified && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                              <BadgeCheck className="h-3.5 w-3.5" /> verified
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-white ${SEV_COLOR[item.severity ?? "moderate"]}`}>{item.severity}</Badge>
                      </div>
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt="hazard"
                          className="h-28 w-full rounded-md object-cover"
                          loading="lazy"
                        />
                      )}
                      {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{item.distanceM != null ? `${formatDist(item.distanceM)} away` : ""}</span>
                        <span>·</span>
                        <span>{item.reporter?.displayName ?? "Rider"}</span>
                        <span>·</span>
                        <span>{item.createdAt ? timeAgo(item.createdAt) : ""}</span>
                      </div>
                      <div className="flex gap-1.5 pt-0.5">
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs hover:border-emerald-400 hover:text-emerald-600" onClick={() => vote(item.id!, "confirm")}>
                          <ThumbsUp className="h-3 w-3" /> Confirm ({item.confirmCount ?? 0})
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs hover:border-orange-400 hover:text-orange-600" onClick={() => vote(item.id!, "dispute")}>
                          <ThumbsDown className="h-3 w-3" /> Resolved ({item.disputeCount ?? 0})
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onFocus(item.lat, item.lng)} aria-label="Show on map">
                          <MapPin className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{item.name}</div>
                        <Badge variant="outline" className="capitalize text-[10px]">{item.kind.replace("-", " ")}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{item.distanceM != null ? `${formatDist(item.distanceM)} away` : ""}</span>
                        {item.hours && <span>· 🕒 {item.hours}</span>}
                        {item.amenities && <span>· {item.amenities}</span>}
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => onFocus(item.lat, item.lng)}>
                        <MapPin className="h-3 w-3" /> Show on map
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
