import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { getGameSnapshot, hireManager } from "../../src/game";
import { richState, NOW } from "./testUtils";

describe("hireManager", () => {
  it("enables automation state without running loops", () => {
    const state = richState({
      generators: {
        kiosk: { id: "kiosk", level: 5 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
    });

    const result = hireManager(state, gameConfig, "kiosk_manager", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const snapshot = getGameSnapshot(result.state, gameConfig, NOW + 60_000);
    expect(snapshot.automation.kiosk).toBe(true);
    expect(snapshot.state.lastUpdated).toBe(NOW);
    expect(state.managers.kiosk_manager.hired).toBe(false);
    expect(result.state.managers.kiosk_manager).toEqual({
      id: "kiosk_manager",
      hired: true,
      hiredAt: NOW,
    });
  });
});
