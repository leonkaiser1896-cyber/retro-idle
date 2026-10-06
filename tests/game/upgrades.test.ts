import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { buyUpgrade, calculateRates } from "../../src/game";
import { richState, NOW } from "./testUtils";

describe("buyUpgrade", () => {
  it("applies generator-specific multipliers", () => {
    const state = richState({
      generators: {
        kiosk: { id: "kiosk", level: 5 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
    });
    const before = calculateRates(state, gameConfig);
    const result = buyUpgrade(state, gameConfig, "better_shelves", NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const after = calculateRates(result.state, gameConfig);
    expect(after.byGenerator.kiosk).toBe(before.byGenerator.kiosk * 2);
    expect(state.upgrades.better_shelves.purchased).toBe(false);
    expect(result.state.upgrades.better_shelves).toEqual({
      id: "better_shelves",
      purchased: true,
      purchasedAt: NOW,
    });
  });

  it("rejects already purchased upgrades", () => {
    const state = richState({
      upgrades: {
        ...richState().upgrades,
        better_shelves: { id: "better_shelves", purchased: true, purchasedAt: NOW },
      },
    });
    const result = buyUpgrade(state, gameConfig, "better_shelves", NOW);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ALREADY_PURCHASED");
    }
  });
});
