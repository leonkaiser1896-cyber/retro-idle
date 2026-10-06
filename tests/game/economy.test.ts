import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { calculateRates, getGeneratorCost, type GameConfig } from "../../src/game";
import { richState } from "./testUtils";

describe("calculateRates", () => {
  it("calculates income per second from owned generators", () => {
    const state = richState({
      generators: {
        kiosk: { id: "kiosk", level: 2 },
        workshop: { id: "workshop", level: 1 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
    });

    const rates = calculateRates(state, gameConfig);
    const kioskIncome = gameConfig.generators.find((generator) => generator.id === "kiosk")?.baseIncomePerSecond ?? 0;
    const workshopIncome =
      gameConfig.generators.find((generator) => generator.id === "workshop")?.baseIncomePerSecond ?? 0;

    expect(rates.byGenerator.kiosk).toBe(2 * kioskIncome);
    expect(rates.byGenerator.workshop).toBe(workshopIncome);
    expect(rates.creditsPerSecond).toBe(2 * kioskIncome + workshopIncome);
  });

  it("calculates generator cost only from config and owned level", () => {
    const state = richState({
      generators: {
        kiosk: { id: "kiosk", level: 2 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
    });

    expect(getGeneratorCost(gameConfig, state, "kiosk")).toBe(13.22);
  });

  it("applies global multipliers from config-owned upgrades", () => {
    const state = richState({
      generators: {
        kiosk: { id: "kiosk", level: 10 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      upgrades: {
        ...richState().upgrades,
        brand_presence: { id: "brand_presence", purchased: true },
      },
    });

    expect(calculateRates(state, gameConfig).creditsPerSecond).toBe(1.25);
  });

  it("does not allow invalid configured income or multipliers to create negative rates", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.generators[0] = {
      ...config.generators[0],
      baseIncomePerSecond: -100,
    };
    config.upgrades[0] = {
      ...config.upgrades[0],
      effect: { type: "generatorMultiplier", generatorId: "kiosk", multiplier: -2 },
    };
    const state = richState({
      generators: {
        kiosk: { id: "kiosk", level: 10 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      upgrades: {
        ...richState().upgrades,
        better_shelves: { id: "better_shelves", purchased: true },
      },
    });

    expect(calculateRates(state, config).creditsPerSecond).toBe(0);
  });
});
