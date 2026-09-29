/**
 * Shared client-side types for RiderGuard.
 */

export type RiskLevel = "low" | "moderate" | "high" | "severe";

export interface RiskFactor {
  factor: string;
  weight: number;
  detail: string;
}

export interface WeatherInfo {
  tempC: number;
  apparentTempC: number;
  windSpeedKph: number;
  windGustKph: number;
  precipMm: number;
  precipProbability: number;
  visibilityM: number;
  isDay: boolean;
  cloudCover: number;
  humidity: number;
}

export interface RiskAssessmentData {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  recommendation: string;
  impact?: DeliveryImpact | null;
  weather: WeatherInfo | null;
  route: {
    distanceKm: number;
    durationMin: number | null;
    geometry: { lat: number; lng: number }[] | null;
    source: string;
  } | null;
  hazards: { activeCount: number; severeCount: number };
  rider: { id: string; displayName: string; reputation: number } | null;
}

export interface HazardItem {
  id: string;
  type: string;
  severity: string;
  lat: number;
  lng: number;
  description?: string | null;
  imageUrl?: string | null;
  confirmCount: number;
  disputeCount: number;
  status: string;
  verified: boolean;
  createdAt: string;
  distanceM?: number;
  reporter?: { displayName: string } | string;
}

export interface SafeStopItem {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address?: string | null;
  hours?: string | null;
  amenities?: string | null;
  rating: number;
  distanceM?: number;
}

export interface FeedItem {
  kind: "hazard" | "safe-stop";
  distanceM: number;
  // hazard fields
  id?: string;
  type?: string;
  severity?: string;
  description?: string | null;
  imageUrl?: string | null;
  confirmCount?: number;
  disputeCount?: number;
  status?: string;
  verified?: boolean;
  createdAt?: string;
  reporter?: { displayName: string };
  // safe-stop fields
  name?: string;
  hours?: string | null;
  amenities?: string | null;
  rating?: number;
  lat: number;
  lng: number;
}

export interface GeoResult {
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}

export interface AIExplanation {
  explanation: string;
  tips: string[];
}

export interface RiderIdentity {
  id: string;
  displayName: string;
  reputation: number;
  isNew: boolean;
}

// ---- Phase 2: Forecast ----
export interface ForecastHour {
  time: string;
  hour: number;
  tempC: number;
  apparentTempC: number;
  windSpeedKph: number;
  windGustKph: number;
  precipMm: number;
  precipProbability: number;
  humidity: number;
  visibilityM: number;
  weatherCode: number;
  isDay: boolean;
  riskScore: number;
}

export interface DepartureWindow {
  hour: number;
  iso: string;
  riskScore: number;
  label: string;
  summary: string;
}

export interface ForecastData {
  forecast: ForecastHour[];
  recommendation: {
    best: DepartureWindow | null;
    worst: DepartureWindow | null;
    windows: DepartureWindow[];
  };
}

// ---- Phase 2: Trip history ----
export interface HistoryRecord {
  id: string;
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  originLat: number | null;
  originLng: number | null;
  destLat: number | null;
  destLng: number | null;
  weatherSummary: string | null;
  createdAt: string;
}

export interface HistoryStats {
  totalTrips: number;
  avgScore: number;
  worstScore: number;
  bestScore: number;
  levelCounts: Record<string, number>;
}

// ---- Phase 2: Leaderboard ----
export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  reputation: number;
  reportsCount: number;
  votesCount: number;
  lastSeenAt: string;
  isYou?: boolean;
}

// ---- Phase 3: SOS ----
export interface SosContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  createdAt: string;
}

export interface SosAlertInfo {
  id: string;
  lat: number;
  lng: number;
  message: string | null;
  status: string;
  triggeredAt: string;
}

// ---- Phase 3: Favorites ----
export interface FavoriteDestination {
  id: string;
  label: string;
  lat: number;
  lng: number;
  emoji: string;
  createdAt: string;
  lastUsedAt: string;
}

// ---- Phase 3: Alerts ----
export interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  data: string | null;
  read: boolean;
  createdAt: string;
}

// ---- Phase 3: Notification prefs ----
export interface NotificationPrefs {
  riderId: string;
  severeWeather: boolean;
  newHazardNearby: boolean;
  riskEscalation: boolean;
  communityUpdates: boolean;
}

// ---- Phase 3: Real-time presence ----
export interface RiderPresence {
  riderId: string;
  displayName: string;
  lat: number;
  lng: number;
  sosActive?: boolean;
}

// ---- Phase 4: Stats ----
export interface RiderStats {
  weekly: {
    trips: number;
    distanceKm: number;
    reports: number;
    votes: number;
    avgScore: number;
    levelCounts: Record<string, number>;
  };
  streak: number;
  activeDays: number;
  allTime: { trips: number; reports: number; votes: number };
  daily: { date: string; trips: number; avgScore: number }[];
}

// ---- Phase 4: Hazard detail ----
export interface HazardDetail {
  id: string;
  type: string;
  severity: string;
  lat: number;
  lng: number;
  description: string | null;
  addressLabel: string | null;
  imageUrl: string | null;
  confirmCount: number;
  disputeCount: number;
  status: string;
  verified: boolean;
  createdAt: string;
  ageMin: number;
  confidence: number;
  totalVotes: number;
  reporter: { displayName: string; reputation: number };
  votes: { id: string; vote: string; createdAt: string; displayName: string }[];
  myVote: string | null;
}

// ---- Phase 4: Achievements ----
export interface Badge {
  code: string;
  label: string;
  description: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  earned: boolean;
  earnedAt: string | null;
}

// ---- Phase 4: Settings ----
export interface RiderSettings {
  id: string;
  displayName: string;
  region: string | null;
  reputation: number;
  createdAt: string;
  lastSeenAt: string;
}

// ---- Phase 5: Delivery impact ----
export interface DeliveryImpact {
  baseDurationMin: number;
  adjustedDurationMin: number;
  extraMinutes: number;
  slowDownPct: number;
  reason: string;
  worthIt: "yes" | "caution" | "no";
  worthItReason: string;
}

// ---- Phase 9: Air quality ----
export interface AirQualityInfo {
  europeanAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  so2: number;
  co: number;
  fetchedAt: string;
  level: string;
  color: string;
  advisory: string;
  mask: boolean;
  pollutantAdvisory: string | null;
}

// ---- Phase 9: Daylight ----
export interface DaylightInfo {
  sunrise: string;
  sunset: string;
  now: string;
  isDay: boolean;
  minutesUntilSunset: number | null;
  minutesUntilSunrise: number | null;
  daylightMinutes: number;
  phase: "pre-dawn" | "dawn" | "day" | "dusk" | "night";
}
