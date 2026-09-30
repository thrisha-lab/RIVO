/** Client-side WMO weather code descriptions (mirrors server lib). */
import type { WeatherInfo } from "@/lib/types";

export function describeWeatherCodeClient(w: WeatherInfo): string {
  const map: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Moderate showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm + hail",
    99: "Thunderstorm + heavy hail",
  };
  // We don't carry weatherCode to client intentionally; derive from rain/wind.
  if (w.precipMm >= 10) return "Heavy rain";
  if (w.precipMm >= 4) return "Moderate rain";
  if (w.precipMm >= 1) return "Light rain";
  if (w.cloudCover >= 90) return "Overcast";
  if (w.cloudCover >= 50) return "Partly cloudy";
  if (w.visibilityM < 500) return "Fog";
  return "Clear";
}
