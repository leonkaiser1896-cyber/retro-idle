import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { validateGameConfig } from "../../src/config/validateGameConfig";
import type { GameConfig } from "../../src/game";

function expectInvalidWith(config: GameConfig, expectedError: string): void {
  const result = validateGameConfig(config);

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors).toContain(expectedError);
  }
}

describe("validateGameConfig", () => {
  it("marks the default gameConfig as valid", () => {
    const result = validateGameConfig(gameConfig);

    expect(result).toEqual({ ok: true, warnings: [] });
  });

  it("marks negative generator costs as invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.generators[0] = { ...config.generators[0], baseCost: -1 };

    expectInvalidWith(config, "generators[0].baseCost: Generator baseCost must be greater than 0.");
  });

  it("marks generator costMultiplier below 1 as invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.generators[0] = { ...config.generators[0], costMultiplier: 0.99 };

    expectInvalidWith(config, "generators[0].costMultiplier: Generator costMultiplier must be at least 1.");
  });

  it("marks negative generator incomePerSecond as invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.generators[0] = { ...config.generators[0], baseIncomePerSecond: -0.1 };

    expectInvalidWith(config, "generators[0].baseIncomePerSecond: Generator baseIncomePerSecond must be at least 0.");
  });

  it("marks duplicate generator IDs as invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.generators[1] = { ...config.generators[1], id: config.generators[0].id };

    expectInvalidWith(config, "generators: Duplicate ID 'kiosk'.");
  });

  it("marks upgrades with invalid generator targets as invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.upgrades[0] = {
      ...config.upgrades[0],
      effect: { type: "generatorMultiplier", generatorId: "missing" as never, multiplier: 2 },
    };

    expectInvalidWith(config, "upgrades[0].effect.generatorId: Upgrade references an unknown generator.");
  });

  it("marks managers with invalid generator targets as invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.managers[0] = { ...config.managers[0], generatorId: "missing" as never };

    expectInvalidWith(config, "managers[0].generatorId: Manager references an unknown generator.");
  });

  it("marks offlineCapMs <= 0 as invalid", () => {
    const zeroCapConfig: GameConfig = { ...structuredClone(gameConfig), offlineCapMs: 0 };
    const negativeCapConfig: GameConfig = { ...structuredClone(gameConfig), offlineCapMs: -1 };

    expectInvalidWith(zeroCapConfig, "offlineCapMs: Offline cap must be greater than 0.");
    expectInvalidWith(negativeCapConfig, "offlineCapMs: Offline cap must be greater than 0.");
  });

  it("marks invalid starting generators as invalid", () => {
    const unknownGeneratorConfig: GameConfig = {
      ...structuredClone(gameConfig),
      startingGenerators: { missing: 1 } as never,
    };
    const negativeLevelConfig: GameConfig = {
      ...structuredClone(gameConfig),
      startingGenerators: { kiosk: -1 },
    };

    expectInvalidWith(
      unknownGeneratorConfig,
      "startingGenerators.missing: Starting generator references an unknown generator.",
    );
    expectInvalidWith(
      negativeLevelConfig,
      "startingGenerators.kiosk: Starting generator level must be a non-negative integer.",
    );
  });

  it("marks reputation tiers with invalid multipliers as invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.reputationTiers[0] = { ...config.reputationTiers[0], globalMultiplier: 0 };

    expectInvalidWith(
      config,
      "reputationTiers[0].globalMultiplier: Reputation globalMultiplier must be greater than 0.",
    );
  });

  it("returns warnings without making the config invalid", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.upgrades[3] = {
      ...config.upgrades[3],
      effect: { type: "globalMultiplier", multiplier: 1 },
    };

    const result = validateGameConfig(config);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain("upgrades[3].effect.multiplier: Global multiplier of 1 has no gameplay effect.");
  });

  it("allows generator costMultiplier of exactly 1", () => {
    const config: GameConfig = structuredClone(gameConfig);
    config.generators[0] = { ...config.generators[0], costMultiplier: 1 };

    const result = validateGameConfig(config);

    expect(result.ok).toBe(true);
  });
});
