/**
 * Unit tests for the hazard filter logic.
 * Tests the filter combinatorics: type + severity filters, "all" behavior,
 * and the toggle semantics.
 */
import { test, expect, describe } from "bun:test";

// Replicate the filter logic from page.tsx for testing.
type SeverityFilter = "all" | "low" | "moderate" | "high" | "critical";

interface Hazard {
  id: string;
  type: string;
  severity: string;
}

function filterHazards(
  hazards: Hazard[],
  activeTypes: Set<string>,
  activeSeverities: Set<SeverityFilter>,
): Hazard[] {
  const sevAll = activeSeverities.has("all");
  return hazards.filter((h) => {
    if (!sevAll && !activeSeverities.has(h.severity as SeverityFilter)) return false;
    if (activeTypes.size > 0 && !activeTypes.has(h.type)) return false;
    return true;
  });
}

function toggleType(prev: Set<string>, type: string): Set<string> {
  const next = new Set(prev);
  if (next.has(type)) next.delete(type); else next.add(type);
  return next;
}

function toggleSeverity(prev: Set<SeverityFilter>, sev: SeverityFilter): Set<SeverityFilter> {
  const next = new Set(prev);
  if (sev === "all") return new Set(["all"]);
  next.delete("all");
  if (next.has(sev)) next.delete(sev); else next.add(sev);
  if (next.size === 0) return new Set(["all"]);
  return next;
}

const SAMPLE: Hazard[] = [
  { id: "1", type: "pothole", severity: "low" },
  { id: "2", type: "pothole", severity: "high" },
  { id: "3", type: "flooding", severity: "critical" },
  { id: "4", type: "construction", severity: "moderate" },
  { id: "5", type: "pothole", severity: "moderate" },
];

describe("hazard-filter: filterHazards", () => {
  test("no filters → all hazards", () => {
    expect(filterHazards(SAMPLE, new Set(), new Set(["all"]))).toHaveLength(5);
  });

  test("filter by type → only matching type", () => {
    const result = filterHazards(SAMPLE, new Set(["pothole"]), new Set(["all"]));
    expect(result).toHaveLength(3);
    expect(result.every((h) => h.type === "pothole")).toBe(true);
  });

  test("filter by severity → only matching severity", () => {
    const result = filterHazards(SAMPLE, new Set(), new Set(["high"]));
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("high");
  });

  test("filter by type + severity → intersection", () => {
    const result = filterHazards(SAMPLE, new Set(["pothole"]), new Set(["moderate"]));
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("pothole");
    expect(result[0].severity).toBe("moderate");
  });

  test("multiple severities → union", () => {
    const result = filterHazards(SAMPLE, new Set(), new Set(["low", "high"]));
    expect(result).toHaveLength(2);
  });

  test("multiple types → union", () => {
    const result = filterHazards(SAMPLE, new Set(["pothole", "flooding"]), new Set(["all"]));
    expect(result).toHaveLength(4);
  });

  test("empty result when no match", () => {
    const result = filterHazards(SAMPLE, new Set(["roadblock"]), new Set(["all"]));
    expect(result).toHaveLength(0);
  });
});

describe("hazard-filter: toggleType", () => {
  test("adds type not in set", () => {
    const result = toggleType(new Set(), "pothole");
    expect(result.has("pothole")).toBe(true);
  });

  test("removes type already in set", () => {
    const result = toggleType(new Set(["pothole"]), "pothole");
    expect(result.has("pothole")).toBe(false);
  });

  test("does not affect other types", () => {
    const result = toggleType(new Set(["pothole", "flooding"]), "construction");
    expect(result.has("pothole")).toBe(true);
    expect(result.has("flooding")).toBe(true);
    expect(result.has("construction")).toBe(true);
  });
});

describe("hazard-filter: toggleSeverity", () => {
  test("clicking 'all' resets to just 'all'", () => {
    const result = toggleSeverity(new Set(["low", "high"]), "all");
    expect(result).toEqual(new Set(["all"]));
  });

  test("clicking a severity removes 'all'", () => {
    const result = toggleSeverity(new Set(["all"]), "high");
    expect(result.has("all")).toBe(false);
    expect(result.has("high")).toBe(true);
  });

  test("clicking active severity removes it", () => {
    const result = toggleSeverity(new Set(["high"]), "high");
    // When empty, auto-resets to "all"
    expect(result).toEqual(new Set(["all"]));
  });

  test("clicking inactive severity adds it", () => {
    const result = toggleSeverity(new Set(["low"]), "high");
    expect(result.has("low")).toBe(true);
    expect(result.has("high")).toBe(true);
  });

  test("multiple selections persist", () => {
    let s = new Set<SeverityFilter>(["all"]);
    s = toggleSeverity(s, "high");
    s = toggleSeverity(s, "critical");
    expect(s.has("high")).toBe(true);
    expect(s.has("critical")).toBe(true);
    expect(s.has("all")).toBe(false);
  });
});
