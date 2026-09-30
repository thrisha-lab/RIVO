"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";
import type { RiderPresence } from "@/lib/types";

export interface HazardPush {
  type: string;
  severity: string;
  lat: number;
  lng: number;
  distanceM: number;
  timestamp: number;
}

export interface SosAlertPush {
  riderId: string;
  displayName: string;
  lat: number;
  lng: number;
  message?: string;
  distanceM: number;
  timestamp: number;
}

export interface RealtimeState {
  connected: boolean;
  presence: RiderPresence[];
  onlineCount: number;
  hazardPush: HazardPush | null;
  sosAlert: SosAlertPush | null;
  voteUpdate: { hazardId: string; timestamp: number } | null;
}

/**
 * Hook to connect to the RIVO real-time service via the Caddy gateway.
 * Uses io("/?XTransformPort=3003") per gateway rules.
 */
export function useRealtime(opts: {
  riderId: string | null;
  displayName: string | null;
  location: { lat: number; lng: number } | null;
  enabled: boolean;
}) {
  const { riderId, displayName, location, enabled } = opts;
  const socketRef = React.useRef<Socket | null>(null);
  const [state, setState] = React.useState<RealtimeState>({
    connected: false,
    presence: [],
    onlineCount: 0,
    hazardPush: null,
    sosAlert: null,
    voteUpdate: null,
  });

  // Keep latest location in a ref so the socket handlers can read it.
  const locRef = React.useRef(location);
  React.useEffect(() => {
    locRef.current = location;
  }, [location]);

  React.useEffect(() => {
    if (!enabled || !riderId || !location) return;

    const socket = io("/?XTransformPort=3003", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setState((s) => ({ ...s, connected: true }));
      socket.emit("rider:join", {
        riderId,
        displayName: displayName ?? "Rider",
        lat: location.lat,
        lng: location.lng,
      });
    });

    socket.on("disconnect", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    socket.on("connect_error", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    socket.on("presence-update", (data: { riders: RiderPresence[]; count: number }) => {
      setState((s) => ({ ...s, presence: data.riders, onlineCount: data.count }));
    });

    socket.on("hazard:push", (data: HazardPush) => {
      setState((s) => ({ ...s, hazardPush: data }));
    });

    socket.on("sos:alert", (data: SosAlertPush) => {
      setState((s) => ({ ...s, sosAlert: data }));
    });

    socket.on("hazard:vote-update", (data: { hazardId: string; timestamp: number }) => {
      setState((s) => ({ ...s, voteUpdate: data }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, riderId, displayName]);

  // Send location updates when location changes (but socket stays connected).
  React.useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.connected && location) {
      socket.emit("rider:location", { lat: location.lat, lng: location.lng });
    }
  }, [location]);

  // Emit helpers
  const emitHazardNew = React.useCallback((data: { lat: number; lng: number; type: string; severity: string }) => {
    socketRef.current?.emit("hazard:new", { ...data, reporterId: riderId });
  }, [riderId]);

  const emitHazardVote = React.useCallback((hazardId: string) => {
    socketRef.current?.emit("hazard:vote", { hazardId });
  }, []);

  const emitSosTrigger = React.useCallback((data: { lat: number; lng: number; message?: string }) => {
    if (!riderId || !displayName) return;
    socketRef.current?.emit("sos:trigger", {
      riderId,
      displayName,
      lat: data.lat,
      lng: data.lng,
      message: data.message,
    });
  }, [riderId, displayName]);

  const emitSosResolve = React.useCallback(() => {
    socketRef.current?.emit("sos:resolve", {});
  }, []);

  const clearHazardPush = React.useCallback(() => {
    setState((s) => ({ ...s, hazardPush: null }));
  }, []);

  const clearSosAlert = React.useCallback(() => {
    setState((s) => ({ ...s, sosAlert: null }));
  }, []);

  const clearVoteUpdate = React.useCallback(() => {
    setState((s) => ({ ...s, voteUpdate: null }));
  }, []);

  return {
    ...state,
    emitHazardNew,
    emitHazardVote,
    emitSosTrigger,
    emitSosResolve,
    clearHazardPush,
    clearSosAlert,
    clearVoteUpdate,
  };
}
