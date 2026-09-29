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
