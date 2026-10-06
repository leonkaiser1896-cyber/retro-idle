export type {
  GameConfig,
  GameResult,
  GameSnapshot,
  GeneratorConfig,
  GeneratorId,
  ManagerConfig,
  OwnedGeneratorState,
  OwnedManagerState,
  OwnedUpgradeState,
  OfflineProgress,
  PlayerState,
  Rates,
  ReputationState,
  ReputationTierConfig,
  UnlockRequirement,
  UpgradeConfig,
} from "./types";
export type { GameError, GameErrorCode } from "./errors";
export { okResult, failResult } from "./result";
export {
  createInitialState,
  CURRENT_SAVE_SCHEMA_VERSION,
  CURRENT_PLAYER_STATE_SCHEMA_VERSION,
  DEFAULT_PLAYER_ID,
  getGeneratorLevel,
  isManagerHired,
  isUpgradePurchased,
} from "./state";
export { calculateRates, getGeneratorCost, isUnlocked } from "./economy";
export {
  currencyMath,
  calculateElapsedMs,
  capElapsedMs,
  clampElapsedMs,
  millisecondsToSeconds,
  type GameNumber,
} from "./math";
export { migratePlayerState, type MigrationResult } from "./migrations";
export { simulateRecommendedProgression, type SimulationResult, type SimulationStep } from "./simulation";
export { applyOfflineProgress, buyGenerator, buyUpgrade, claimProgress, collectRevenue, hireManager } from "./actions";
export { getGameSnapshot } from "./snapshot";
