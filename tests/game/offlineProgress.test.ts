import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { applyOfflineProgress } from "../../src/game";
import { richState, NOW } from "./testUtils";

describe("applyOfflineProgress", () => {
  it("applies only the 8-hour offline cap", () => {
    const state = richState({
      credits: 0,
      pendingRevenue: 0,
      totalEarned: 0,
      generators: {
        kiosk: { id: "kiosk", level: 1 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });

    const result = applyOfflineProgress(state, gameConfig, NOW + gameConfig.offlineCapMs * 2);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data?.elapsedMs).toBe(gameConfig.offlineCapMs * 2);
    expect(result.data?.appliedMs).toBe(gameConfig.offlineCapMs);
    expect(result.state.credits).toBe(0);
    expect(result.state.pendingRevenue).toBe(0.1 * (gameConfig.offlineCapMs / 1000));
    expect(result.state.totalEarned).toBe(0.1 * (gameConfig.offlineCapMs / 1000));
    expect(result.state.totalCollected).toBe(0);
    expect(result.state.lastUpdated).toBe(NOW + gameConfig.offlineCapMs * 2);
    expect(state.lastUpdated).toBe(NOW);
  });

  it("rejects timestamps before lastUpdated", () => {
    const state = richState({ lastUpdated: NOW });
    const result = applyOfflineProgress(state, gameConfig, NOW - 1);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_TIME");
    }
  });
});
