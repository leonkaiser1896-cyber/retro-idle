import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { createInitialState, CURRENT_PLAYER_STATE_SCHEMA_VERSION } from "../../src/game";
import { NOW } from "./testUtils";

describe("createInitialState", () => {
  it("uses config defaults and the provided timestamp", () => {
    const state = createInitialState(gameConfig, NOW);

    expect(state.credits).toBe(gameConfig.startingCredits);
    expect(state.pendingRevenue).toBe(0);
    expect(state.schemaVersion).toBe(CURRENT_PLAYER_STATE_SCHEMA_VERSION);
    expect(state.playerId).toBe("standalone-player");
    expect(state.totalEarned).toBe(0);
    expect(state.totalCollected).toBe(0);
    expect(state.totalSpent).toBe(0);
    expect(state.lastUpdated).toBe(NOW);
    expect(state.createdAt).toBe(NOW);
    expect(state.reputation).toEqual({
      tierId: gameConfig.reputationTiers[0].id,
      points: 0,
      resets: 0,
    });
    expect(state.generators).toEqual({
      kiosk: { id: "kiosk", level: 1, purchasedAt: NOW },
      workshop: { id: "workshop", level: 0 },
      logistics: { id: "logistics", level: 0 },
      club: { id: "club", level: 0 },
      company: { id: "company", level: 0 },
    });
  });
});
