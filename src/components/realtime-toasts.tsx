"use client";

import * as React from "react";
import { toast } from "sonner";
import { Siren, AlertTriangle, Users, MapPin } from "lucide-react";
import type { RealtimeState } from "@/hooks/use-realtime";

interface Props {
  realtime: RealtimeState;
  onHazardPush: () => void;
  onSosAlert: () => void;
  onVoteUpdate: () => void;
}

/**
 * Side-effect component: watches realtime pushes and shows toasts.
 * Also surfaces presence count in the header via callback (optional).
 */
export default function RealtimeToasts({ realtime, onHazardPush, onSosAlert, onVoteUpdate }: Props) {
  const seenHazard = React.useRef<number | null>(null);
  const seenSos = React.useRef<number | null>(null);
  const seenVote = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (realtime.hazardPush && realtime.hazardPush.timestamp !== seenHazard.current) {
      seenHazard.current = realtime.hazardPush.timestamp;
      const h = realtime.hazardPush;
      toast.warning(`New ${h.severity} hazard ${h.distanceM}m away`, {
        description: `${h.type.replace("_", " ")} reported nearby. Tap to view on map.`,
        duration: 8000,
        icon: <AlertTriangle className="h-4 w-4" />,
        action: {
          label: "View",
          onClick: onHazardPush,
        },
      });
    }
  }, [realtime.hazardPush, onHazardPush]);

  React.useEffect(() => {
    if (realtime.sosAlert && realtime.sosAlert.timestamp !== seenSos.current) {
      seenSos.current = realtime.sosAlert.timestamp;
      const s = realtime.sosAlert;
      toast.error(`SOS from ${s.displayName} ${s.distanceM}m away`, {
        description: s.message ?? "A nearby rider needs help. Check the map.",
        duration: 30000,
        icon: <Siren className="h-4 w-4" />,
        action: {
          label: "Locate",
          onClick: onSosAlert,
        },
      });
    }
  }, [realtime.sosAlert, onSosAlert]);

  React.useEffect(() => {
    if (realtime.voteUpdate && realtime.voteUpdate.hazardId !== seenVote.current) {
      seenVote.current = realtime.voteUpdate.hazardId;
      onVoteUpdate();
    }
  }, [realtime.voteUpdate, onVoteUpdate]);

  return null;
}
