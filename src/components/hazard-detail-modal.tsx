"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ThumbsUp, ThumbsDown, BadgeCheck, Clock, MapPin, User, Loader2, ImageOff, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, HAZARD_ICON, HAZARD_LABEL } from "@/lib/api-client";
import type { HazardDetail } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  hazardId: string | null;
  onClose: () => void;
  onVoteChange: () => void;
  onFocus: (lat: number, lng: number) => void;
}

const SEV_COLOR: Record<string, string> = {
  low: "bg-emerald-500",
  moderate: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-600",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HazardDetailModal({ hazardId, onClose, onVoteChange, onFocus }: Props) {
  const [detail, setDetail] = React.useState<HazardDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [voting, setVoting] = React.useState(false);

  React.useEffect(() => {
    if (!hazardId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    api
      .getHazardDetail(hazardId)
      .then(setDetail)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load hazard"))
      .finally(() => setLoading(false));
  }, [hazardId]);

  const vote = async (v: "confirm" | "dispute") => {
    if (!detail) return;
    setVoting(true);
    try {
      await api.vote(detail.id, v);
      toast.success("Vote recorded");
      // refresh detail
      const updated = await api.getHazardDetail(detail.id);
      setDetail(updated);
      onVoteChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setVoting(false);
    }
  };

  return (
    <AnimatePresence>
      {hazardId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[850] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading hazard…
              </div>
            ) : !detail ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Hazard not found.</div>
            ) : (
              <>
                {/* Header */}
                <div className={`flex items-center justify-between px-5 py-4 text-white ${SEV_COLOR[detail.severity] ?? "bg-slate-600"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{HAZARD_ICON[detail.type] ?? "❗"}</span>
                    <div>
                      <div className="text-base font-bold">{HAZARD_LABEL[detail.type] ?? detail.type}</div>
                      <div className="flex items-center gap-1.5 text-xs opacity-90">
                        <span className="rounded bg-white/20 px-1.5 py-0.5 uppercase">{detail.severity}</span>
                        {detail.verified && <span className="flex items-center gap-0.5"><BadgeCheck className="h-3 w-3" /> verified</span>}
                        <span className="rounded bg-white/20 px-1.5 py-0.5 capitalize">{detail.status}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} className="rounded-md p-1.5 transition hover:bg-white/20" aria-label="Close">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4 p-5">
                    {/* Image */}
                    {detail.imageUrl ? (
                      <img src={detail.imageUrl} alt="hazard" className="h-48 w-full rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-32 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
                        <ImageOff className="h-6 w-6" />
                        <span className="text-xs">No photo attached</span>
                      </div>
                    )}

                    {/* Description */}
                    {detail.description && (
                      <p className="text-sm leading-relaxed">{detail.description}</p>
                    )}

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <MetaRow icon={<Clock className="h-3.5 w-3.5" />} label="Reported" value={`${timeAgo(detail.createdAt)} (${detail.ageMin}m ago)`} />
                      <MetaRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={`${detail.lat.toFixed(4)}, ${detail.lng.toFixed(4)}`} />
                      <MetaRow icon={<User className="h-3.5 w-3.5" />} label="Reporter" value={detail.reporter.displayName} />
                      <MetaRow icon={<Trophy className="h-3.5 w-3.5" />} label="Rep" value={`★ ${detail.reporter.reputation}`} />
                    </div>

                    {/* Confidence */}
                    {detail.totalVotes > 0 && (
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium">Community confidence</span>
                          <span className="tabular-nums">{detail.confidence}% (of {detail.totalVotes} votes)</span>
                        </div>
                        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                          <div className="bg-emerald-500" style={{ width: `${detail.confirmCount / detail.totalVotes * 100}%` }} />
                          <div className="bg-orange-500" style={{ width: `${detail.disputeCount / detail.totalVotes * 100}%` }} />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><ThumbsUp className="h-2.5 w-2.5" /> {detail.confirmCount} confirm</span>
                          <span className="flex items-center gap-1">{detail.disputeCount} dispute <ThumbsDown className="h-2.5 w-2.5" /></span>
                        </div>
                      </div>
                    )}

                    {/* Vote history */}
                    {detail.votes.length > 0 && (
                      <div>
                        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vote history</div>
                        <div className="space-y-1">
                          {detail.votes.slice(0, 8).map((v) => (
                            <div key={v.id} className="flex items-center gap-2 rounded-md border bg-card/50 p-2 text-xs">
                              {v.vote === "confirm" ? (
                                <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <ThumbsDown className="h-3.5 w-3.5 text-orange-600" />
                              )}
                              <span className="font-medium">{v.displayName}</span>
                              <span className="text-muted-foreground">{v.vote === "confirm" ? "confirmed" : "disputed"}</span>
                              <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(v.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => vote("confirm")}
                        disabled={voting || detail.myVote === "confirm"}
                        className="flex-1 gap-1.5"
                        variant={detail.myVote === "confirm" ? "default" : "outline"}
                      >
                        <ThumbsUp className="h-4 w-4" /> {detail.myVote === "confirm" ? "Confirmed" : "Confirm"}
                      </Button>
                      <Button
                        onClick={() => vote("dispute")}
                        disabled={voting || detail.myVote === "dispute"}
                        className="flex-1 gap-1.5"
                        variant={detail.myVote === "dispute" ? "destructive" : "outline"}
                      >
                        <ThumbsDown className="h-4 w-4" /> {detail.myVote === "dispute" ? "Disputed" : "Mark resolved"}
                      </Button>
                    </div>
                    <Button
                      onClick={() => { onFocus(detail.lat, detail.lng); onClose(); }}
                      variant="ghost"
                      className="w-full gap-1.5"
                    >
                      <MapPin className="h-4 w-4" /> Show on map
                    </Button>
                  </div>
                </ScrollArea>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-card/50 px-2 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
