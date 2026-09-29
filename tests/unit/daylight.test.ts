/**
 * Unit tests for the daylight service helpers.
 */
import { test, expect, describe } from "bun:test";
import { formatCountdown, phaseColor, phaseEmoji } from "@/lib/daylight-service";

describe("daylight: formatCountdown", () => {
  test("null minutes → empty string", () => {
    expect(formatCountdown(null, "sunset")).toBe("");
  });

  test("minutes < 60 → Xm format", () => {
    expect(formatCountdown(30, "sunset")).toBe("30m until sunset");
  });

  test("minutes >= 60 → Hh Mm format", () => {
    expect(formatCountdown(90, "sunrise")).toBe("1h 30m until sunrise");
  });

  test("120 minutes → 2h 0m", () => {
    expect(formatCountdown(120, "sunset")).toBe("2h 0m until sunset");
  });
});

describe("daylight: phaseColor", () => {
  test("each phase returns a valid hex color", () => {
    const phases: Array<"pre-dawn" | "dawn" | "day" | "dusk" | "night"> = ["pre-dawn", "dawn", "day", "dusk", "night"];
    for (const p of phases) {
      expect(phaseColor(p)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  test("day is warm/yellow-ish", () => {
    expect(phaseColor("day")).toBe("#fbbf24");
  });

  test("night is indigo", () => {
    expect(phaseColor("night")).toBe("#6366f1");
  });
});

describe("daylight: phaseEmoji", () => {
  test("each phase returns a non-empty emoji", () => {
    const phases: Array<"pre-dawn" | "dawn" | "day" | "dusk" | "night"> = ["pre-dawn", "dawn", "day", "dusk", "night"];
    for (const p of phases) {
      expect(phaseEmoji(p).length).toBeGreaterThan(0);
    }
  });

  test("day returns sun", () => {
    expect(phaseEmoji("day")).toBe("☀️");
  });

  test("night returns moon", () => {
    expect(phaseEmoji("night")).toBe("🌙");
  });

  test("dawn returns sunrise", () => {
    expect(phaseEmoji("dawn")).toBe("🌅");
  });

  test("dusk returns sunset", () => {
    expect(phaseEmoji("dusk")).toBe("🌇");
  });
});
