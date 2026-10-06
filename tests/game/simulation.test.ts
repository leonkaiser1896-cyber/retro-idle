import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { simulateRecommendedProgression } from "../../src/game";

describe("simulateRecommendedProgression", () => {
  it("creates deterministic progression milestones", () => {
    const first = simulateRecommendedProgression(gameConfig, { startTimeMs: 0, maxSteps: 6 });
    const second = simulateRecommendedProgression(gameConfig, { startTimeMs: 0, maxSteps: 6 });

    expect(first.steps).toEqual(second.steps);
    expect(first.steps[0]).toMatchObject({ label: "Start", timeMs: 0 });
    expect(first.steps.length).toBeGreaterThan(1);
    expect(first.steps.some((step) => step.label.includes("Straßenkiosk"))).toBe(true);
  });
});
