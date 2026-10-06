import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { buyGenerator, buyUpgrade, hireManager, type GameConfig } from "../../src/game";
import { makeState, NOW, richState } from "./testUtils";

describe("economy validation", () => {
  it("rejects locked generators through a typed result", () => {
    const state = makeState();
    const result = buyGenerator(state, gameConfig, "workshop", NOW);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) {
      expect(result.error.code).toBe("UNLOCK_REQUIREMENT_NOT_MET");
    }
  });

  it("rejects invalid generator costs before spending credits", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.generators[0] = {
      ...config.generators[0],
      baseCost: -10,
    };
    const state = richState();
    const result = buyGenerator(state, config, "kiosk", NOW);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_AMOUNT");
    }
  });

  it("rejects invalid upgrade and manager costs before spending credits", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.upgrades[0] = {
      ...config.upgrades[0],
      cost: -100,
    };
    config.managers[0] = {
      ...config.managers[0],
      cost: -150,
    };
    const state = richState();

    const upgradeResult = buyUpgrade(state, config, "better_shelves", NOW);
    const managerResult = hireManager(state, config, "kiosk_manager", NOW);

    expect(upgradeResult.ok).toBe(false);
    expect(managerResult.ok).toBe(false);
    if (!upgradeResult.ok) {
      expect(upgradeResult.error.code).toBe("INVALID_AMOUNT");
    }
    if (!managerResult.ok) {
      expect(managerResult.error.code).toBe("INVALID_AMOUNT");
    }
    expect(state.credits).toBe(100_000);
    expect(state.totalSpent).toBe(0);
  });
});
