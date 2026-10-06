import { gameError } from "./errors";
import { applyRevenueToPending, getGenerator, getGeneratorCost, isUnlocked, roundCurrency } from "./economy";
import { calculateElapsedMs, capElapsedMs, currencyMath } from "./math";
import { failResult, okResult } from "./result";
import {
  cloneState,
  getGeneratorLevel,
  isManagerHired,
  isUpgradePurchased,
  withGeneratorLevel,
  withHiredManager,
  withPurchasedUpgrade,
  withSpentCredits,
} from "./state";
import type { GameConfig, GameResult, OfflineProgress, PlayerState } from "./types";

export function applyOfflineProgress(state: PlayerState, config: GameConfig, now: number): GameResult<OfflineProgress> {
  if (now < state.lastUpdated) {
    return failResult(state, gameError("INVALID_TIME", "now must not be before lastUpdated."));
  }

  const elapsedMs = calculateElapsedMs(now, state.lastUpdated);
  const appliedMs = capElapsedMs(elapsedMs, config.offlineCapMs);
  const progressed = applyRevenueToPending(cloneState(state), config, appliedMs);
  const nextState = { ...progressed, lastUpdated: now };

  return okResult(nextState, {
    elapsedMs,
    appliedMs,
    creditsEarned: roundCurrency(currencyMath.subtract(nextState.pendingRevenue, state.pendingRevenue)),
  });
}

export function collectRevenue(state: PlayerState, config: GameConfig, now: number): GameResult<OfflineProgress> {
  const progressed = applyOfflineProgress(state, config, now);
  if (!progressed.ok) {
    return progressed;
  }

  const creditsCollected = roundCurrency(progressed.state.pendingRevenue);
  const nextState = {
    ...progressed.state,
    credits: currencyMath.add(progressed.state.credits, creditsCollected),
    pendingRevenue: 0,
    totalCollected: currencyMath.add(progressed.state.totalCollected, creditsCollected),
    ...(creditsCollected > 0 ? { lastCollectedAt: now } : {}),
  };

  return okResult(nextState, {
    elapsedMs: progressed.data?.elapsedMs ?? 0,
    appliedMs: progressed.data?.appliedMs ?? 0,
    creditsEarned: progressed.data?.creditsEarned ?? 0,
    creditsCollected,
  });
}

export function claimProgress(state: PlayerState, config: GameConfig, now: number): GameResult<OfflineProgress> {
  return collectRevenue(state, config, now);
}

export function buyGenerator(
  state: PlayerState,
  config: GameConfig,
  generatorId: string,
  now: number,
): GameResult<{ cost: number }> {
  const progressed = applyOfflineProgress(state, config, now);
  if (!progressed.ok) {
    return progressed;
  }

  const generator = getGenerator(config, generatorId);
  if (!generator) {
    return failResult(state, gameError("GENERATOR_NOT_FOUND", `Generator '${generatorId}' does not exist.`));
  }

  if (!isUnlocked(progressed.state, generator.unlockRequirement)) {
    return failResult(state, gameError("UNLOCK_REQUIREMENT_NOT_MET", `Generator '${generatorId}' is locked.`));
  }

  const cost = getGeneratorCost(config, progressed.state, generatorId);
  if (!currencyMath.isPositiveFinite(cost)) {
    return failResult(state, gameError("INVALID_AMOUNT", `Generator '${generatorId}' has an invalid cost.`));
  }

  if (currencyMath.isLessThan(progressed.state.credits, cost)) {
    return failResult(state, gameError("NOT_ENOUGH_CREDITS", "Not enough credits."));
  }

  const nextState = withGeneratorLevel(
    withSpentCredits(
      progressed.state,
      currencyMath.subtract(progressed.state.credits, cost),
      currencyMath.add(progressed.state.totalSpent, cost),
    ),
    generatorId,
    getGeneratorLevel(progressed.state, generatorId) + 1,
    now,
  );

  return okResult(nextState, { cost });
}

export function buyUpgrade(
  state: PlayerState,
  config: GameConfig,
  upgradeId: string,
  now: number,
): GameResult<{ cost: number }> {
  const progressed = applyOfflineProgress(state, config, now);
  if (!progressed.ok) {
    return progressed;
  }

  const upgrade = config.upgrades.find((candidate) => candidate.id === upgradeId);
  if (!upgrade) {
    return failResult(state, gameError("UPGRADE_NOT_FOUND", `Upgrade '${upgradeId}' does not exist.`));
  }

  if (isUpgradePurchased(progressed.state, upgradeId)) {
    return failResult(state, gameError("ALREADY_PURCHASED", `Upgrade '${upgradeId}' is already purchased.`));
  }

  if (!isUnlocked(progressed.state, upgrade.unlockRequirement)) {
    return failResult(state, gameError("UNLOCK_REQUIREMENT_NOT_MET", `Upgrade '${upgradeId}' is locked.`));
  }

  if (!currencyMath.isPositiveFinite(upgrade.cost)) {
    return failResult(state, gameError("INVALID_AMOUNT", `Upgrade '${upgradeId}' has an invalid cost.`));
  }

  if (currencyMath.isLessThan(progressed.state.credits, upgrade.cost)) {
    return failResult(state, gameError("NOT_ENOUGH_CREDITS", "Not enough credits."));
  }

  const nextState = withPurchasedUpgrade(
    withSpentCredits(
      progressed.state,
      currencyMath.subtract(progressed.state.credits, upgrade.cost),
      currencyMath.add(progressed.state.totalSpent, upgrade.cost),
    ),
    upgradeId,
    now,
  );

  return okResult(nextState, { cost: upgrade.cost });
}

export function hireManager(
  state: PlayerState,
  config: GameConfig,
  managerId: string,
  now: number,
): GameResult<{ cost: number }> {
  const progressed = applyOfflineProgress(state, config, now);
  if (!progressed.ok) {
    return progressed;
  }

  const manager = config.managers.find((candidate) => candidate.id === managerId);
  if (!manager) {
    return failResult(state, gameError("MANAGER_NOT_FOUND", `Manager '${managerId}' does not exist.`));
  }

  if (isManagerHired(progressed.state, managerId)) {
    return failResult(state, gameError("ALREADY_HIRED", `Manager '${managerId}' is already hired.`));
  }

  if (!isUnlocked(progressed.state, manager.unlockRequirement)) {
    return failResult(state, gameError("UNLOCK_REQUIREMENT_NOT_MET", `Manager '${managerId}' is locked.`));
  }

  if (!currencyMath.isPositiveFinite(manager.cost)) {
    return failResult(state, gameError("INVALID_AMOUNT", `Manager '${managerId}' has an invalid cost.`));
  }

  if (currencyMath.isLessThan(progressed.state.credits, manager.cost)) {
    return failResult(state, gameError("NOT_ENOUGH_CREDITS", "Not enough credits."));
  }

  const nextState = withHiredManager(
    withSpentCredits(
      progressed.state,
      currencyMath.subtract(progressed.state.credits, manager.cost),
      currencyMath.add(progressed.state.totalSpent, manager.cost),
    ),
    managerId,
    now,
  );

  return okResult(nextState, { cost: manager.cost });
}
