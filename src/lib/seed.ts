/**
 * Seed RIVO database with safe stops and a couple of demo hazards.
 * Run with: bun run src/lib/seed.ts
 */
import { db } from "@/lib/db";

const SAFE_STOPS: Array<{
  name: string;
  type: string;
  lat: number;
  lng: number;
  address?: string;
  hours?: string;
  amenities?: string;
  rating: number;
}> = [
  // Bengaluru-ish coordinates so the default map view has content.
  { name: "Rider Rest Stop — Indiranagar", type: "cafe", lat: 12.9719, lng: 77.6412, address: "100 Feet Road, Indiranagar", hours: "7:00–23:00", amenities: "wifi,charging,restroom,seating", rating: 4.4 },
  { name: "Shelter — MG Road Metro", type: "shelter", lat: 12.9756, lng: 77.6066, address: "MG Road Metro Station", hours: "24/7", amenities: "seating,restroom", rating: 3.9 },
  { name: "Charging Hub — Koramangala", type: "charging", lat: 12.9352, lng: 77.6245, address: "80 Feet Road, Koramangala", hours: "6:00–22:00", amenities: "charging,seating", rating: 4.1 },
  { name: "First Aid — City Hospital", type: "first_aid", lat: 12.9698, lng: 77.5996, address: "Rajajinagar", hours: "24/7", amenities: "first_aid,restroom", rating: 4.6 },
  { name: "Cafe — Jayanagar 4th Block", type: "cafe", lat: 12.9250, lng: 77.5938, address: "Jayanagar 4th Block", hours: "8:00–22:00", amenities: "wifi,charging,restroom,seating", rating: 4.2 },
  { name: "Restroom — Brigade Road", type: "restroom", lat: 12.9700, lng: 77.6053, address: "Brigade Road", hours: "9:00–21:00", amenities: "restroom", rating: 3.4 },
  { name: "Parking — Whitefield", type: "parking", lat: 12.9698, lng: 77.7500, address: "Whitefield Main Road", hours: "24/7", amenities: "parking,seating", rating: 3.8 },
  { name: "Shelter — Marathahalli Bridge", type: "shelter", lat: 12.9569, lng: 77.7011, address: "Marathahalli", hours: "24/7", amenities: "seating", rating: 3.6 },
];

const DEMO_HAZARDS: Array<{
  type: string;
  severity: string;
  lat: number;
  lng: number;
  description: string;
  confirmCount: number;
  verified?: boolean;
}> = [
  { type: "pothole", severity: "high", lat: 12.9650, lng: 77.6380, description: "Large pothole near the junction, water-filled after rain.", confirmCount: 3, verified: true },
  { type: "flooding", severity: "critical", lat: 12.9550, lng: 77.6300, description: "Underpass heavily flooded, avoid completely.", confirmCount: 5, verified: true },
  { type: "poor_lighting", severity: "moderate", lat: 12.9720, lng: 77.6400, description: "Streetlight out for two blocks, very dark at night.", confirmCount: 1 },
  { type: "construction", severity: "moderate", lat: 12.9680, lng: 77.6450, description: "Roadwork with loose gravel, reduced lane width.", confirmCount: 2 },
];

async function seed() {
  let stops = 0;
  let hazards = 0;

  // Ensure a "seed" rider exists for demo hazard reports (no token needed).
  let seedRider = await db.rider.findUnique({ where: { tokenHash: "seed-static" } });
  if (!seedRider) {
    seedRider = await db.rider.create({
      data: { tokenHash: "seed-static", displayName: "Rider-SEED", region: "demo" },
    });
  }

  for (const s of SAFE_STOPS) {
    const exists = await db.safeStop.findFirst({ where: { lat: s.lat, lng: s.lng } });
    if (exists) continue;
    await db.safeStop.create({ data: s });
    stops++;
  }
  for (const h of DEMO_HAZARDS) {
    const exists = await db.hazardReport.findFirst({ where: { lat: h.lat, lng: h.lng, type: h.type } });
    if (exists) continue;
    await db.hazardReport.create({
      data: {
        reporterId: seedRider.id,
        type: h.type,
        severity: h.severity,
        lat: h.lat,
        lng: h.lng,
        description: h.description,
        confirmCount: h.confirmCount,
        status: "active",
        verified: h.verified ?? false,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });
    hazards++;
  }
  console.log(`Seeded ${stops} safe stops, ${hazards} demo hazards.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
