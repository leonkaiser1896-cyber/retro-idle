import type { GameSnapshot, PlayerState } from "../game";
import type { StorageAdapter } from "../adapters/StorageAdapter";
import type { GameConfig } from "../game";

export interface ActionLogEntry {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  createdAt: number;
}

export interface GeneratorViewModel {
  id: string;
  name: string;
  description: string;
  level: number;
  cost: number;
  incomePerSecond: number;
  locked: boolean;
  canBuy: boolean;
  managerHired: boolean;
  purchasedUpgradeCount: number;
  unlocked: boolean;
  affordable: boolean;
  income: number;
  nextCost: number;
  status: "gesperrt" | "verfügbar" | "aktiv";
  visualTier: 0 | 1 | 2 | 3 | 4;
  hasManager: boolean;
  upgradeCount: number;
  disabledReason?: string;
  unlockHint?: string;
}

export interface UpgradeViewModel {
  id: string;
  name: string;
  description: string;
  cost: number;
  effectLabel: string;
  purchased: boolean;
  locked: boolean;
  canBuy: boolean;
  disabledReason?: string;
  unlockHint?: string;
}

export interface ManagerViewModel {
  id: string;
  name: string;
  description: string;
  cost: number;
  hired: boolean;
  locked: boolean;
  canHire: boolean;
  disabledReason?: string;
  unlockHint?: string;
}

export interface ReputationViewModel {
  tierId: string;
  name: string;
  bonusPercent: number;
  points: number;
  resets: number;
  nextTierName?: string;
  nextTierRequiredCredits?: number;
  nextTierMissingCredits?: number;
  nextTierBonusPercent?: number;
}

export interface GameViewModel {
  persistenceWarning?: string;
  snapshot: GameSnapshot;
  credits: number;
  pendingRevenue: number;
  collectableAmount: number;
  incomePerSecond: number;
  totalEarned: number;
  totalCollected: number;
  collectFillPercent: number;
  collectButtonState: GameSnapshot["collectButtonState"];
  generators: GeneratorViewModel[];
  buildings: GeneratorViewModel[];
  upgrades: UpgradeViewModel[];
  managers: ManagerViewModel[];
  reputation: ReputationViewModel;
  progressionHint: ProgressionHintViewModel;
  activeObjective: ProgressionHintViewModel;
  businessMilestones: BusinessMilestoneViewModel[];
  milestones: BusinessMilestoneViewModel[];
}

export interface ProgressionHintViewModel {
  title: string;
  description: string;
  targetType: "generator" | "upgrade" | "manager" | "rate" | "reputation" | "none";
  targetId?: string;
  cost?: number;
  missingCredits?: number;
  progressLabel?: string;
}

export interface BusinessMilestoneViewModel {
  id: string;
  label: string;
  achieved: boolean;
  description: string;
}

export interface LoadGameResult {
  state: PlayerState;
  view: GameViewModel;
  offlineCredits: number;
  offlineElapsedMs: number;
  offlineAppliedMs: number;
  offlineCapped: boolean;
  createdNewState: boolean;
  warningMessage?: string;
}

export interface GameServiceOptions {
  storage?: StorageAdapter;
  config?: GameConfig;
  identifier?: string;
  playerId?: string;
  now?: () => number;
}
