import type { GameError } from "./errors";

export type GeneratorId = "kiosk" | "workshop" | "logistics" | "club" | "company";

export type UpgradeEffect =
  | { type: "generatorMultiplier"; generatorId: GeneratorId; multiplier: number }
  | { type: "globalMultiplier"; multiplier: number };

export interface UnlockRequirement {
  generatorId?: GeneratorId;
  generatorCount?: number;
  creditsEarned?: number;
  reputationTierId?: string;
}

export interface GeneratorConfig {
  id: GeneratorId;
  name: string;
  description: string;
  baseCost: number;
  costMultiplier: number;
  baseIncomePerSecond: number;
  unlockRequirement?: UnlockRequirement;
}

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: UpgradeEffect;
  unlockRequirement?: UnlockRequirement;
}

export interface ManagerConfig {
  id: string;
  generatorId: GeneratorId;
  name: string;
  description: string;
  cost: number;
  unlockRequirement?: UnlockRequirement;
}

export interface ReputationTierConfig {
  id: string;
  name: string;
  requiredLifetimeCredits: number;
  globalMultiplier: number;
}

export interface GameConfig {
  currencyName: "credits";
  offlineCapMs: number;
  startingCredits: number;
  startingGenerators?: Partial<Record<GeneratorId, number>>;
  generators: GeneratorConfig[];
  upgrades: UpgradeConfig[];
  managers: ManagerConfig[];
  reputationTiers: ReputationTierConfig[];
}

export interface PlayerState {
  schemaVersion: number;
  playerId: string;
  credits: number;
  pendingRevenue: number;
  totalEarned: number;
  totalCollected: number;
  totalSpent: number;
  generators: Record<string, OwnedGeneratorState>;
  upgrades: Record<string, OwnedUpgradeState>;
  managers: Record<string, OwnedManagerState>;
  reputation: ReputationState;
  lastUpdated: number;
  lastCollectedAt?: number;
  createdAt: number;
}

export interface OwnedGeneratorState {
  id: string;
  level: number;
  purchasedAt?: number;
}

export interface OwnedUpgradeState {
  id: string;
  purchased: boolean;
  purchasedAt?: number;
}

export interface OwnedManagerState {
  id: string;
  hired: boolean;
  hiredAt?: number;
}

export interface ReputationState {
  tierId: string;
  points: number;
  resets: number;
}

export interface Rates {
  creditsPerSecond: number;
  byGenerator: Record<string, number>;
}

export interface OfflineProgress {
  elapsedMs: number;
  appliedMs: number;
  creditsEarned: number;
  creditsCollected?: number;
}

export interface GameSnapshot {
  state: PlayerState;
  previewState: PlayerState;
  credits: number;
  pendingRevenue: number;
  incomePerSecond: number;
  totalEarned: number;
  totalCollected: number;
  rates: Rates;
  offlineProgress: OfflineProgress;
  collectableAmount: number;
  collectButtonState: CollectButtonState;
  nextGeneratorCosts: Record<string, number>;
  automation: Record<string, boolean>;
}

export interface CollectButtonState {
  enabled: boolean;
  label: string;
  disabledReason?: string;
}

export type GameResult<T = undefined> =
  { ok: true; state: PlayerState; data?: T } | { ok: false; state: PlayerState; error: GameError };
