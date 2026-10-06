import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { buyGenerator, buyUpgrade, hireManager } from "../../src/game";
import { makeState, NOW } from "./testUtils";

describe("result pattern", () => {
  it("returns typed errors instead of throwing for expected gameplay failures", () => {
    const state = { ...makeState(), credits: 0 };

    expect(() => buyGenerator(state, gameConfig, "kiosk", NOW)).not.toThrow();
    expect(() => buyUpgrade(state, gameConfig, "missing", NOW)).not.toThrow();
    expect(() => hireManager(state, gameConfig, "missing", NOW)).not.toThrow();

    const result = buyGenerator(state, gameConfig, "kiosk", NOW);
    expect(result).toEqual({
      ok: false,
      state,
      error: {
        code: "NOT_ENOUGH_CREDITS",
        message: "Not enough credits.",
      },
    });
  });
});
