/**
 * RIVO Real-time Service
 *
 * Socket.io mini-service on port 3003.
 * Handles:
 *  - Rider presence (who's online near me)
 *  - Real-time hazard push (new reports near subscribed riders)
 *  - SOS broadcast (alert nearby riders when SOS triggered)
 *  - Vote updates (hazard confirm/dispute counts update live)
 *
 * Frontend connects via: io("/?XTransformPort=3003")
 */
import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

interface RiderPresence {
  socketId: string;
  riderId: string;
  displayName: string;
  lat: number;
  lng: number;
  lastSeen: number;
  sosActive?: boolean;
}

// In-memory presence store (swap for Redis in multi-instance deployment).
const presence = new Map<string, RiderPresence>();

// Geofence radius for "nearby" in meters.
const NEARBY_RADIUS_M = 5000;

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function findNearbyRiders(loc: { lat: number; lng: number }): RiderPresence[] {
  const nearby: RiderPresence[] = [];
  for (const r of presence.values()) {
    if (haversineM(loc, { lat: r.lat, lng: r.lng }) <= NEARBY_RADIUS_M) {
      nearby.push(r);
    }
  }
  return nearby;
}

function broadcastPresence() {
  const list = Array.from(presence.values()).map((r) => ({
    riderId: r.riderId,
    displayName: r.displayName,
    lat: r.lat,
    lng: r.lng,
    sosActive: r.sosActive,
  }));
  io.emit("presence-update", { riders: list, count: list.length });
}

io.on("connection", (socket) => {
  console.log(`[realtime] connected: ${socket.id}`);

  socket.on("rider:join", (data: { riderId: string; displayName: string; lat: number; lng: number }) => {
    if (!data?.riderId || typeof data.lat !== "number") return;
    presence.set(socket.id, {
      socketId: socket.id,
      riderId: data.riderId,
      displayName: data.displayName ?? "Rider",
      lat: data.lat,
      lng: data.lng,
      lastSeen: Date.now(),
    });
    socket.data.riderId = data.riderId;
    socket.data.lat = data.lat;
    socket.data.lng = data.lng;
    // Send current presence to the new rider.
    broadcastPresence();
    console.log(`[realtime] ${data.displayName} joined at ${data.lat},${data.lng} (${presence.size} online)`);
  });

  socket.on("rider:location", (data: { lat: number; lng: number }) => {
    if (typeof data?.lat !== "number") return;
    const p = presence.get(socket.id);
    if (p) {
      p.lat = data.lat;
      p.lng = data.lng;
      p.lastSeen = Date.now();
      socket.data.lat = data.lat;
      socket.data.lng = data.lng;
    }
  });

  // Broadcast a new hazard to nearby riders.
  socket.on("hazard:new", (data: { lat: number; lng: number; type: string; severity: string; reporterId: string }) => {
    if (typeof data?.lat !== "number") return;
    const nearby = findNearbyRiders({ lat: data.lat, lng: data.lng });
    let pushed = 0;
    for (const r of nearby) {
      if (r.riderId === data.reporterId) continue; // don't push to reporter
      io.to(r.socketId).emit("hazard:push", {
        type: data.type,
        severity: data.severity,
        lat: data.lat,
        lng: data.lng,
        distanceM: Math.round(haversineM({ lat: r.lat, lng: r.lng }, { lat: data.lat, lng: data.lng })),
        timestamp: Date.now(),
      });
      pushed++;
    }
    console.log(`[realtime] hazard:new pushed to ${pushed} nearby riders`);
  });

  // Broadcast a vote update so feeds refresh live.
  socket.on("hazard:vote", (data: { hazardId: string }) => {
    io.emit("hazard:vote-update", { hazardId: data.hazardId, timestamp: Date.now() });
  });

  // SOS broadcast: alert all nearby riders.
  socket.on("sos:trigger", (data: { riderId: string; displayName: string; lat: number; lng: number; message?: string }) => {
    if (typeof data?.lat !== "number") return;
    const p = presence.get(socket.id);
    if (p) p.sosActive = true;
    const nearby = findNearbyRiders({ lat: data.lat, lng: data.lng });
    let pushed = 0;
    for (const r of nearby) {
      if (r.riderId === data.riderId) continue;
      io.to(r.socketId).emit("sos:alert", {
        riderId: data.riderId,
        displayName: data.displayName,
        lat: data.lat,
        lng: data.lng,
        message: data.message,
        distanceM: Math.round(haversineM({ lat: r.lat, lng: r.lng }, { lat: data.lat, lng: data.lng })),
        timestamp: Date.now(),
      });
      pushed++;
    }
    broadcastPresence();
    console.log(`[realtime] SOS from ${data.displayName} → ${pushed} nearby riders alerted`);
  });

  socket.on("sos:resolve", () => {
    const p = presence.get(socket.id);
    if (p) p.sosActive = false;
    broadcastPresence();
  });

  socket.on("disconnect", () => {
    const p = presence.get(socket.id);
    if (p) {
      console.log(`[realtime] ${p.displayName} disconnected`);
    }
    presence.delete(socket.id);
    broadcastPresence();
  });

  socket.on("error", (err: unknown) => {
    console.error(`[realtime] socket error (${socket.id}):`, err);
  });
});

// Heartbeat: prune stale presence (no update in 90s).
setInterval(() => {
  const now = Date.now();
  let pruned = 0;
  for (const [id, p] of presence.entries()) {
    if (now - p.lastSeen > 90_000) {
      presence.delete(id);
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`[realtime] pruned ${pruned} stale riders`);
    broadcastPresence();
  }
}, 30_000);

const PORT = 3003;
httpServer.listen(PORT, () => {
  console.log(`[realtime] RIVO real-time service running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  console.log("[realtime] SIGTERM, shutting down...");
  io.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("[realtime] SIGINT, shutting down...");
  io.close(() => process.exit(0));
});
