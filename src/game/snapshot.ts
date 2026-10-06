import { applyRevenueToPending, getAutomationState, getGeneratorCost, roundCurrency, calculateRates } from "./economy";
import { calculateElapsedMs, capElapsedMs, clampElapsedMs, currencyMath } from "./math";
import type { GameConfig, GameSnapshot, OfflineProgress, PlayerState } from "./types";

export function getGameSnapshot(state: PlayerState, config: GameConfig, now: number): GameSnapshot {
  const elapsedMs = clampElapsedMs(calculateElapsedMs(now, state.lastUpdated));
  const appliedMs = capElapsedMs(elapsedMs, config.offlineCapMs);
  const previewState = applyRevenueToPending(state, config, appliedMs);
  const rates = calculateRates(previewState, config);
  const nextGeneratorCosts = Object.fromEntries(
    config.generators.map((generator) => [generator.id, getGeneratorCost(config, previewState, generator.id)]),
  );
  const offlineProgress: OfflineProgress = {
    elapsedMs,
    appliedMs,
    creditsEarned: roundCurrency(currencyMath.subtract(previewState.pendingRevenue, state.pendingRevenue)),
  };
  const collectableAmount = previewState.pendingRevenue;

  return {
    state,
    previewState,
    credits: previewState.credits,
    pendingRevenue: previewState.pendingRevenue,
    incomePerSecond: rates.creditsPerSecond,
    totalEarned: previewState.totalEarned,
    totalCollected: previewState.totalCollected,
    rates,
    offlineProgress,
    collectableAmount,
    collectButtonState:
      collectableAmount > 0
        ? { enabled: true, label: "Einsammeln" }
        : { enabled: false, label: "Einsammeln", disabledReason: "Keine offenen Einnahmen" },
    nextGeneratorCosts,
    automation: getAutomationState(previewState, config),
  };
}
