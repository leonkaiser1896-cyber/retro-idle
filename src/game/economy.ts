import type { GameConfig, GeneratorConfig, PlayerState, Rates, ReputationTierConfig, UnlockRequirement } from "./types";
import { currencyMath, millisecondsToSeconds } from "./math";
import { getGeneratorLevel, isManagerHired, isUpgradePurchased } from "./state";

export function getGenerator(config: GameConfig, generatorId: string): GeneratorConfig | undefined {
  return config.generators.find((generator) => generator.id === generatorId);
}

export function getGeneratorCost(config: GameConfig, state: PlayerState, generatorId: string): number {
  const generator = getGenerator(config, generatorId);
  if (!generator) {
    return Number.POSITIVE_INFINITY;
  }

  const owned = getGeneratorLevel(state, generatorId);
  return currencyMath.roundCurrency(
    currencyMath.multiply(generator.baseCost, currencyMath.pow(generator.costMultiplier, owned)),
  );
}

export function calculateRates(state: PlayerState, config: GameConfig): Rates {
  const reputationMultiplier = currencyMath.positiveMultiplier(
    getReputationTier(config, state.reputation.tierId)?.globalMultiplier ?? 1,
  );
  const upgradeMultiplier = currencyMath.positiveMultiplier(getGlobalUpgradeMultiplier(state, config));
  const entries = config.generators.map((generator) => {
    const owned = getGeneratorLevel(state, generator.id);
    const generatorMultiplier = currencyMath.positiveMultiplier(
      getGeneratorUpgradeMultiplier(state, config, generator.id),
    );
    const baseIncomePerSecond = currencyMath.nonNegative(generator.baseIncomePerSecond);
    const income = currencyMath.multiply(
      currencyMath.multiply(
        currencyMath.multiply(currencyMath.multiply(owned, baseIncomePerSecond), generatorMultiplier),
        upgradeMultiplier,
      ),
      reputationMultiplier,
    );
    return [generator.id, currencyMath.roundRate(income)] as const;
  });
  const byGenerator = Object.fromEntries(entries);
  const creditsPerSecond = entries.reduce((total, [, income]) => currencyMath.rawAdd(total, income), 0);

  return {
    creditsPerSecond: currencyMath.roundRate(creditsPerSecond),
    byGenerator,
  };
}

export function isUnlocked(state: PlayerState, requirement: UnlockRequirement | undefined): boolean {
  if (!requirement) {
    return true;
  }

  if (
    requirement.generatorId &&
    getGeneratorLevel(state, requirement.generatorId) < (requirement.generatorCount ?? 1)
  ) {
    return false;
  }

  if (requirement.creditsEarned !== undefined && state.totalEarned < requirement.creditsEarned) {
    return false;
  }

  if (requirement.reputationTierId !== undefined && state.reputation.tierId !== requirement.reputationTierId) {
    return false;
  }

  return true;
}

export function calculateRevenueForElapsedMs(state: PlayerState, config: GameConfig, elapsedMs: number): number {
  const rates = calculateRates(state, config);
  return currencyMath.roundCurrency(currencyMath.multiply(rates.creditsPerSecond, millisecondsToSeconds(elapsedMs)));
}

export function applyRevenueToPending(state: PlayerState, config: GameConfig, elapsedMs: number): PlayerState {
  const pendingRevenue = calculateRevenueForElapsedMs(state, config, elapsedMs);

  return {
    ...state,
    pendingRevenue: currencyMath.add(state.pendingRevenue, pendingRevenue),
    totalEarned: currencyMath.add(state.totalEarned, pendingRevenue),
  };
}

export function getAutomationState(state: PlayerState, config: GameConfig): Record<string, boolean> {
  return Object.fromEntries(
    config.generators.map((generator) => [
      generator.id,
      config.managers.some((manager) => manager.generatorId === generator.id && isManagerHired(state, manager.id)),
    ]),
  );
}

function getGeneratorUpgradeMultiplier(state: PlayerState, config: GameConfig, generatorId: string): number {
  return config.upgrades.reduce((multiplier, upgrade) => {
    if (!isUpgradePurchased(state, upgrade.id) || upgrade.effect.type !== "generatorMultiplier") {
      return multiplier;
    }

    return upgrade.effect.generatorId === generatorId
      ? currencyMath.multiply(multiplier, currencyMath.positiveMultiplier(upgrade.effect.multiplier))
      : multiplier;
  }, 1);
}

function getGlobalUpgradeMultiplier(state: PlayerState, config: GameConfig): number {
  return config.upgrades.reduce((multiplier, upgrade) => {
    if (!isUpgradePurchased(state, upgrade.id) || upgrade.effect.type !== "globalMultiplier") {
      return multiplier;
    }

    return currencyMath.multiply(multiplier, currencyMath.positiveMultiplier(upgrade.effect.multiplier));
  }, 1);
}

function getReputationTier(config: GameConfig, reputationTierId: string): ReputationTierConfig | undefined {
  return config.reputationTiers.find((tier) => tier.id === reputationTierId);
}

export const roundCurrency = currencyMath.roundCurrency;
