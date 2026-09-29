/**
 * Typed client for RiderGuard API. Uses relative paths only.
 */
import type {
  RiskAssessmentData,
  HazardItem,
  SafeStopItem,
  FeedItem,
  GeoResult,
  AIExplanation,
  RiderIdentity,
  RiskLevel,
  ForecastData,
  HistoryRecord,
  HistoryStats,
  LeaderboardEntry,
  SosContact,
  SosAlertInfo,
  FavoriteDestination,
  AlertItem,
  NotificationPrefs,
} from "@/lib/types";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string };
  if (!json.ok) throw new Error(json.error ?? "Request failed");
  return json.data as T;
}

export const api = {
  rider: () => req<RiderIdentity>("/api/rider/identity"),

  searchPlaces: (q: string) =>
    req<{ results: GeoResult[] }>(`/api/location/destination/search?q=${encodeURIComponent(q)}`),

  startTracking: (body: {
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    destLabel?: string;
  }) =>
    req<{ sessionId: string; status: string }>("/api/location/track", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  pushGps: (body: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number }) =>
    req<{ pointId: string; recordedAt: string }>("/api/location/track", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  endTracking: () => req<{ ended: boolean }>("/api/location/track", { method: "DELETE" }),

  weather: (lat: number, lng: number) =>
    req<{ weather: import("@/lib/types").WeatherInfo; description: string }>(
      `/api/weather?lat=${lat}&lng=${lng}`,
    ),

  route: (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) =>
    req<{
      distanceKm: number;
      durationMin: number;
      geometry: { lat: number; lng: number }[];
      source: string;
    }>(
      `/api/route-plan?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${dest.lat}&destLng=${dest.lng}`,
    ),

  risk: (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) =>
    req<RiskAssessmentData>(
      `/api/risk?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${dest.lat}&destLng=${dest.lng}`,
    ),

  hazards: (lat: number, lng: number, radiusM = 1500, type?: string) =>
    req<{ hazards: HazardItem[]; center: { lat: number; lng: number }; radiusM: number }>(
      `/api/hazards?lat=${lat}&lng=${lng}&radiusM=${radiusM}${type ? `&type=${type}` : ""}`,
    ),

  createHazard: (body: {
    lat: number;
    lng: number;
    type: string;
    severity: string;
    description?: string;
    addressLabel?: string;
    imageUrl?: string;
  }) => req<HazardItem>("/api/hazards", { method: "POST", body: JSON.stringify(body) }),

  vote: (id: string, vote: "confirm" | "dispute") =>
    req<{ action: string; status: string }>(`/api/hazards/${id}/vote`, {
      method: "POST",
      body: JSON.stringify({ vote }),
    }),

  safeStops: (lat: number, lng: number, radiusM = 3000) =>
    req<{ stops: SafeStopItem[] }>(`/api/safe-stops?lat=${lat}&lng=${lng}&radiusM=${radiusM}`),

  feed: (lat: number, lng: number, radiusM = 5000) =>
    req<{ feed: FeedItem[] }>(`/api/feed?lat=${lat}&lng=${lng}&radiusM=${radiusM}`),

  explain: (body: {
    risk: RiskAssessmentData;
    originLabel?: string;
    destLabel?: string;
  }) => req<AIExplanation>("/api/ai/explain", { method: "POST", body: JSON.stringify(body) }),

  forecast: (lat: number, lng: number, hours = 12) =>
    req<ForecastData>(`/api/forecast?lat=${lat}&lng=${lng}&hours=${hours}`),

  history: (limit = 20) => req<{ history: HistoryRecord[]; stats: HistoryStats | null }>(`/api/history?limit=${limit}`),

  leaderboard: (limit = 10) => req<{ leaderboard: LeaderboardEntry[] }>(`/api/leaderboard?limit=${limit}`),

  uploadHazardImage: async (file: File): Promise<{ imageUrl: string; filename: string; size: number; contentType: string }> => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/hazards/upload", { method: "POST", body: form, credentials: "same-origin" });
    const json = (await res.json()) as { ok: boolean; data?: { imageUrl: string; filename: string; size: number; contentType: string }; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Upload failed");
    return json.data!;
  },

  // ---- Phase 3: SOS ----
  triggerSos: (body: { lat: number; lng: number; message?: string }) =>
    req<{ alertId: string; triggeredAt: string; status: string; message: string }>("/api/sos/trigger", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  cancelSos: () => req<{ resolved: boolean }>("/api/sos/trigger", { method: "DELETE" }),

  getActiveSos: () => req<{ active: SosAlertInfo | null }>("/api/sos/active"),

  getSosContacts: () => req<{ contacts: SosContact[] }>("/api/sos/contacts"),

  addSosContact: (body: { name: string; phone: string; relation?: string }) =>
    req<SosContact>("/api/sos/contacts", { method: "POST", body: JSON.stringify(body) }),

  deleteSosContact: (id: string) => req<{ deleted: boolean }>(`/api/sos/contacts?id=${id}`, { method: "DELETE" }),

  // ---- Phase 3: Favorites ----
  getFavorites: () => req<{ favorites: FavoriteDestination[] }>("/api/favorites"),

  addFavorite: (body: { label: string; lat: number; lng: number; emoji?: string }) =>
    req<FavoriteDestination>("/api/favorites", { method: "POST", body: JSON.stringify(body) }),

  deleteFavorite: (id: string) => req<{ deleted: boolean }>(`/api/favorites?id=${id}`, { method: "DELETE" }),

  touchFavorite: (id: string) => req<{ updated: boolean }>(`/api/favorites?id=${id}`, { method: "PATCH" }),

  // ---- Phase 3: Alerts ----
  getAlerts: (unreadOnly = false, limit = 20) =>
    req<{ alerts: AlertItem[]; unreadCount: number }>(`/api/alerts?unreadOnly=${unreadOnly}&limit=${limit}`),

  markAlertsRead: (body: { ids?: string[]; all?: boolean }) =>
    req<{ marked?: number; markedAll?: boolean }>("/api/alerts", { method: "PATCH", body: JSON.stringify(body) }),

  // ---- Phase 3: Notification prefs ----
  getPrefs: () => req<NotificationPrefs>("/api/prefs"),

  updatePrefs: (body: Partial<NotificationPrefs>) =>
    req<NotificationPrefs>("/api/prefs", { method: "PUT", body: JSON.stringify(body) }),
};

export const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string; ring: string; emoji: string }> = {
  low: { label: "Low Risk", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500", ring: "ring-emerald-500/30", emoji: "🟢" },
  moderate: { label: "Moderate Risk", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500", ring: "ring-amber-500/30", emoji: "🟡" },
  high: { label: "High Risk", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500", ring: "ring-orange-500/30", emoji: "🟠" },
  severe: { label: "Severe Risk", color: "text-red-700 dark:text-red-300", bg: "bg-red-600", ring: "ring-red-500/40", emoji: "🔴" },
};

export const HAZARD_ICON: Record<string, string> = {
  pothole: "🕳️",
  flooding: "🌊",
  roadblock: "🚧",
  construction: "🏗️",
  accident: "⚠️",
  poor_lighting: "🌑",
  animal: "🐕",
  slippery: " slipping",
  other: "❗",
};

export const HAZARD_LABEL: Record<string, string> = {
  pothole: "Pothole",
  flooding: "Flooding",
  roadblock: "Roadblock",
  construction: "Construction",
  accident: "Accident",
  poor_lighting: "Poor lighting",
  animal: "Animal",
  slippery: "Slippery",
  other: "Other",
};

export const SAFE_STOP_ICON: Record<string, string> = {
  cafe: "☕",
  shelter: "🏠",
  restroom: "🚻",
  charging: "🔌",
  first_aid: "➕",
  parking: "🅿️",
};
