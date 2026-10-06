import { describe, expect, it } from "vitest";
import { activeBalancePresetId, balancePresets } from "../../src/config/balancePresets";
import { gameConfig } from "../../src/config/gameConfig";
import { validateGameConfig } from "../../src/config/validateGameConfig";
import {
  buyGenerator,
  buyUpgrade,
  calculateRates,
  claimProgress,
  createInitialState,
  getGeneratorCost,
  getGeneratorLevel,
  hireManager,
  isManagerHired,
  isUnlocked,
  isUpgradePurchased,
  type GameConfig,
  type PlayerState,
} from "../../src/game";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("balance presets", () => {
  it("uses webDefault as the active web app config", () => {
    expect(activeBalancePresetId).toBe("webDefault");
    expect(gameConfig).toBe(balancePresets.webDefault.config);
    expect(gameConfig.startingGenerators?.kiosk).toBe(1);
  });

  it("keeps all balance presets valid", () => {
    for (const preset of Object.values(balancePresets)) {
      const result = validateGameConfig(preset.config);
      expect(result.ok, `${preset.id}: ${result.ok ? "" : result.errors.join(", ")}`).toBe(true);
    }
  });

  it("scales company later than fast playtest in slower presets", () => {
    expect(
      balancePresets.webDefault.config.generators.find((generator) => generator.id === "company")?.baseCost,
    ).toBeGreaterThan(
      balancePresets.fastPlaytest.config.generators.find((generator) => generator.id === "company")?.baseCost ?? 0,
    );
  });

  it("has distinct actual progression speed between fastPlaytest and webDefault", () => {
    const fastCompany = estimateFirstCompanyPurchaseMs(balancePresets.fastPlaytest.config, 8 * HOUR);
    const webCompany = estimateFirstCompanyPurchaseMs(balancePresets.webDefault.config, 7 * DAY);

    expect(fastCompany).not.toBeNull();
    expect(webCompany).not.toBeNull();
    expect(fastCompany as number).toBeLessThan(8 * HOUR);
    expect(webCompany as number).toBeGreaterThan(8 * HOUR);
    expect(webCompany as number).toBeLessThan(3 * DAY);
    expect(fastCompany as number).toBeLessThan(webCompany as number);
  });

  it("does not start in an unplayable state", () => {
    const state = createInitialState(gameConfig, 0, "playable-test");
    const rates = calculateRates(state, gameConfig);

    expect(state.credits).toBeGreaterThanOrEqual(0);
    expect(getGeneratorLevel(state, "kiosk")).toBeGreaterThanOrEqual(1);
    expect(rates.creditsPerSecond).toBeGreaterThan(0);
  });
});

function estimateFirstCompanyPurchaseMs(config: GameConfig, maxMs: number): number | null {
  let state = createInitialState(config, 0, "preset-speed-test");
  let now = 0;

  while (now <= maxMs) {
    const target = nextTarget(config, state);
    const rates = calculateRates(state, config);
    if (!target) {
      return null;
    }

    if (state.credits < target.cost) {
      if (rates.creditsPerSecond <= 0) {
        return null;
      }

      const waitMs = Math.ceil(((target.cost - state.credits) / rates.creditsPerSecond) * 1000);
      if (now + waitMs > maxMs) {
        return null;
      }
      now += waitMs;
      const collected = claimProgress(state, config, now);
      if (!collected.ok) {
        return null;
      }
      state = collected.state;
    }

    const result =
      target.kind === "generator"
        ? buyGenerator(state, config, target.id, now)
        : target.kind === "upgrade"
          ? buyUpgrade(state, config, target.id, now)
          : hireManager(state, config, target.id, now);

    if (!result.ok) {
      return null;
    }

    state = result.state;
    if (target.kind === "generator" && target.id === "company" && getGeneratorLevel(state, "company") === 1) {
      return now;
    }
  }

  return null;
}

function nextTarget(
  config: GameConfig,
  state: PlayerState,
): { kind: "generator" | "upgrade" | "manager"; id: string; cost: number } | undefined {
  const generators = config.generators
    .filter((generator) => isUnlocked(state, generator.unlockRequirement))
    .map((generator) => ({
      kind: "generator" as const,
      id: generator.id,
      cost: getGeneratorCost(config, state, generator.id),
    }))
    .filter((target) => Number.isFinite(target.cost) && target.cost > 0);

  const upgrades = config.upgrades
    .filter((upgrade) => !isUpgradePurchased(state, upgrade.id) && isUnlocked(state, upgrade.unlockRequirement))
    .map((upgrade) => ({
      kind: "upgrade" as const,
      id: upgrade.id,
      cost: upgrade.cost,
    }))
    .filter((target) => Number.isFinite(target.cost) && target.cost > 0);

  const managers = config.managers
    .filter((manager) => !isManagerHired(state, manager.id) && isUnlocked(state, manager.unlockRequirement))
    .map((manager) => ({
      kind: "manager" as const,
      id: manager.id,
      cost: manager.cost,
    }))
    .filter((target) => Number.isFinite(target.cost) && target.cost > 0);

  const affordableGenerators = generators
    .filter((target) => state.credits >= target.cost)
    .sort((left, right) => left.cost - right.cost);
  if (affordableGenerators.length > 0) {
    return affordableGenerators[0];
  }

  const affordableUpgrades = upgrades
    .filter((target) => state.credits >= target.cost)
    .sort((left, right) => left.cost - right.cost);
  if (affordableUpgrades.length > 0) {
    return affordableUpgrades[0];
  }

  const affordableManagers = managers
    .filter((target) => state.credits >= target.cost)
    .sort((left, right) => left.cost - right.cost);
  if (affordableManagers.length > 0) {
    return affordableManagers[0];
  }

  return [...generators, ...upgrades, ...managers].sort((left, right) => left.cost - right.cost)[0];
}
