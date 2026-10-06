import type { GameConfig, PlayerState } from "./types";

export const CURRENT_SAVE_SCHEMA_VERSION = 3;
export const CURRENT_PLAYER_STATE_SCHEMA_VERSION = CURRENT_SAVE_SCHEMA_VERSION;
export const DEFAULT_PLAYER_ID = "standalone-player";

export function createInitialState(config: GameConfig, now: number, playerId = DEFAULT_PLAYER_ID): PlayerState {
  const generators = Object.fromEntries(
    config.generators.map((generator) => {
      const level = config.startingGenerators?.[generator.id] ?? 0;
      return [
        generator.id,
        {
          id: generator.id,
          level,
          ...(level > 0 ? { purchasedAt: now } : {}),
        },
      ];
    }),
  );
  const upgrades = Object.fromEntries(
    config.upgrades.map((upgrade) => [upgrade.id, { id: upgrade.id, purchased: false }]),
  );
  const managers = Object.fromEntries(config.managers.map((manager) => [manager.id, { id: manager.id, hired: false }]));

  return {
    schemaVersion: CURRENT_PLAYER_STATE_SCHEMA_VERSION,
    playerId,
    credits: config.startingCredits,
    pendingRevenue: 0,
    totalEarned: 0,
    totalCollected: 0,
    totalSpent: 0,
    generators,
    upgrades,
    managers,
    reputation: {
      tierId: config.reputationTiers[0]?.id ?? "newcomer",
      points: 0,
      resets: 0,
    },
    lastUpdated: now,
    createdAt: now,
  };
}

export function cloneState(state: PlayerState): PlayerState {
  return {
    ...state,
    generators: Object.fromEntries(Object.entries(state.generators).map(([id, generator]) => [id, { ...generator }])),
    upgrades: Object.fromEntries(Object.entries(state.upgrades).map(([id, upgrade]) => [id, { ...upgrade }])),
    managers: Object.fromEntries(Object.entries(state.managers).map(([id, manager]) => [id, { ...manager }])),
    reputation: { ...state.reputation },
  };
}

export function withCredits(state: PlayerState, credits: number): PlayerState {
  return {
    ...state,
    credits,
  };
}

export function withEarnedCredits(state: PlayerState, credits: number, totalEarned: number): PlayerState {
  return {
    ...state,
    credits,
    totalEarned,
  };
}

export function withSpentCredits(state: PlayerState, credits: number, totalSpent: number): PlayerState {
  return {
    ...state,
    credits,
    totalSpent,
  };
}

export function withGeneratorLevel(
  state: PlayerState,
  generatorId: string,
  level: number,
  purchasedAt: number,
): PlayerState {
  const existing = state.generators[generatorId] ?? { id: generatorId, level: 0 };

  return {
    ...state,
    generators: {
      ...state.generators,
      [generatorId]: {
        ...existing,
        level,
        purchasedAt: existing.purchasedAt ?? purchasedAt,
      },
    },
  };
}

export function withPurchasedUpgrade(state: PlayerState, upgradeId: string, purchasedAt: number): PlayerState {
  const existing = state.upgrades[upgradeId] ?? { id: upgradeId, purchased: false };

  return {
    ...state,
    upgrades: {
      ...state.upgrades,
      [upgradeId]: {
        ...existing,
        purchased: true,
        purchasedAt,
      },
    },
  };
}

export function withHiredManager(state: PlayerState, managerId: string, hiredAt: number): PlayerState {
  const existing = state.managers[managerId] ?? { id: managerId, hired: false };

  return {
    ...state,
    managers: {
      ...state.managers,
      [managerId]: {
        ...existing,
        hired: true,
        hiredAt,
      },
    },
  };
}

export function getGeneratorLevel(state: PlayerState, generatorId: string): number {
  return state.generators[generatorId]?.level ?? 0;
}

export function isUpgradePurchased(state: PlayerState, upgradeId: string): boolean {
  return Boolean(state.upgrades[upgradeId]?.purchased);
}

export function isManagerHired(state: PlayerState, managerId: string): boolean {
  return Boolean(state.managers[managerId]?.hired);
}
