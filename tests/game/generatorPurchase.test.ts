import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { buyGenerator, getGeneratorCost, getGeneratorLevel } from "../../src/game";
import { makeState, NOW } from "./testUtils";

describe("buyGenerator", () => {
  it("deducts credits and increments owned count", () => {
    const state = makeState();
    const cost = getGeneratorCost(gameConfig, state, "kiosk");

    const result = buyGenerator(state, gameConfig, "kiosk", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.credits).toBe(state.credits - cost);
    expect(getGeneratorLevel(result.state, "kiosk")).toBe(2);
    expect(result.state.generators.kiosk.purchasedAt).toBe(NOW);
    expect(result.state.totalSpent).toBe(cost);
    expect(getGeneratorLevel(state, "kiosk")).toBe(1);
  });

  it("increases price after purchase", () => {
    const state = makeState();
    const firstCost = getGeneratorCost(gameConfig, state, "kiosk");
    const result = buyGenerator(state, gameConfig, "kiosk", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const secondCost = getGeneratorCost(gameConfig, result.state, "kiosk");
    expect(secondCost).toBeGreaterThan(firstCost);
  });

  it("does not create negative credits on invalid purchases", () => {
    const state = { ...makeState(), credits: 0 };
    const result = buyGenerator(state, gameConfig, "kiosk", NOW);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.credits).toBe(0);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_ENOUGH_CREDITS");
    }
  });

  it("rejects missing generators", () => {
    const state = makeState();
    const result = buyGenerator(state, gameConfig, "missing", NOW);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("GENERATOR_NOT_FOUND");
    }
  });
});
