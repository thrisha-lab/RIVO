/**
 * Unit tests for the weather alert rules.
 */
import { test, expect, describe } from "bun:test";
import { evaluateWeatherAlerts } from "@/lib/weather-alerts";
import type { ForecastHour } from "@/lib/forecast-service";

function makeHour(overrides: Partial<ForecastHour> = {}): ForecastHour {
  return {
    time: new Date().toISOString(),
    hour: 14,
    tempC: 25,
    apparentTempC: 25,
    windSpeedKph: 10,
    windGustKph: 15,
    precipMm: 0,
    precipProbability: 0,
    humidity: 50,
    visibilityM: 10000,
    weatherCode: 1,
    isDay: true,
    riskScore: 10,
    ...overrides,
  };
}

describe("weather-alerts: evaluateWeatherAlerts", () => {
  test("clear forecast → no alerts", () => {
    const hours = [makeHour(), makeHour({ hour: 15 }), makeHour({ hour: 16 })];
    expect(evaluateWeatherAlerts(hours)).toHaveLength(0);
  });

  test("thunderstorm → critical alert", () => {
    const hours = [makeHour({ weatherCode: 95, precipMm: 5, windGustKph: 40 })];
    const alerts = evaluateWeatherAlerts(hours);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe("critical");
    expect(alerts[0].title).toContain("Thunderstorm");
  });

  test("very heavy rain + strong gust → critical alert", () => {
    const hours = [makeHour({ precipMm: 9, windGustKph: 55 })];
    const alerts = evaluateWeatherAlerts(hours);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe("critical");
  });

  test("very heavy rain alone → warning alert", () => {
    const hours = [makeHour({ precipMm: 9, windGustKph: 20 })];
    const alerts = evaluateWeatherAlerts(hours);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe("warning");
  });

  test("strong gust alone → warning alert", () => {
    const hours = [makeHour({ precipMm: 0, windGustKph: 55 })];
    const alerts = evaluateWeatherAlerts(hours);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].severity).toBe("warning");
  });

  test("only checks first 6 hours", () => {
    const hours = [
      makeHour({ hour: 0 }),
      makeHour({ hour: 1 }),
      makeHour({ hour: 2 }),
      makeHour({ hour: 3 }),
      makeHour({ hour: 4 }),
      makeHour({ hour: 5 }),
      makeHour({ hour: 6, weatherCode: 95 }), // 7th hour — should NOT trigger
    ];
    expect(evaluateWeatherAlerts(hours)).toHaveLength(0);
  });

  test("breaks after first critical alert (no duplicates)", () => {
    const hours = [
      makeHour({ hour: 0, weatherCode: 95 }),
      makeHour({ hour: 1, weatherCode: 95 }),
    ];
    const alerts = evaluateWeatherAlerts(hours);
    expect(alerts.length).toBe(1);
  });

  test("alert body contains actionable text", () => {
    const hours = [makeHour({ precipMm: 10, windGustKph: 60 })];
    const alerts = evaluateWeatherAlerts(hours);
    expect(alerts[0].body.length).toBeGreaterThan(20);
    expect(alerts[0].body).toMatch(/rain|gust|thunder/i);
  });

  test("alert data includes hour info", () => {
    const hours = [makeHour({ hour: 14, precipMm: 9, windGustKph: 55 })];
    const alerts = evaluateWeatherAlerts(hours);
    expect(alerts[0].data.hour).toBe(14);
    expect(alerts[0].data.precipMm).toBe(9);
  });
});
