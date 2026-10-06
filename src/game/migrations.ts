import type { GameConfig, PlayerState } from "./types";
import { CURRENT_SAVE_SCHEMA_VERSION, createInitialState } from "./state";
import { getGeneratorCost } from "./economy";

// Keep currency values representable to cents in JavaScript's number type.
export const MAX_SAVE_CURRENCY = Number.MAX_SAFE_INTEGER / 100;

export interface MigrationResult {
  ok: boolean;
  state: PlayerState;
  migrated: boolean;
  fromVersion: number | null;
  warnings: string[];
}

export function migratePlayerState(
  input: unknown,
  config: GameConfig,
  now: number,
  fallbackPlayerId: string,
): MigrationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      state: createInitialState(config, now, fallbackPlayerId),
      migrated: false,
      fromVersion: null,
      warnings: ["Save is not an object."],
    };
  }

  const fromVersion = typeof input.schemaVersion === "number" ? input.schemaVersion : null;
  if (fromVersion === null) {
    return invalid(config, now, fallbackPlayerId, null, "Save has no schemaVersion.");
  }

  if (fromVersion !== 1 && fromVersion !== 2 && fromVersion !== CURRENT_SAVE_SCHEMA_VERSION) {
    return invalid(config, now, fallbackPlayerId, fromVersion, `Unsupported save schemaVersion ${fromVersion}.`);
  }

  const validationErrors =
    fromVersion === 1
      ? validateVersion1State(input, config)
      : fromVersion === 2
        ? validateVersion2State(input, config)
        : validateVersion3State(input, config);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      state: createInitialState(config, now, fallbackPlayerId),
      migrated: false,
      fromVersion,
      warnings: validationErrors,
    };
  }

  if (
    Number(input.createdAt) > Number(input.lastUpdated) ||
    Number(input.lastUpdated) > now ||
    (input.lastCollectedAt !== undefined && Number(input.lastCollectedAt) > Number(input.lastUpdated))
  ) {
    return invalid(config, now, fallbackPlayerId, fromVersion, "Save timestamps are inconsistent or in the future.");
  }

  if (fromVersion === 1) {
    return {
      ok: true,
      state: {
        ...normalizeState(input, config),
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
        pendingRevenue: 0,
        totalCollected: Number(input.totalEarned),
      },
      migrated: true,
      fromVersion,
      warnings: ["Save migrated from schemaVersion 1 to 3."],
    };
  }

  if (fromVersion === 2) {
    const pendingRevenue = Number(input.pendingRevenue);
    const previousCollected = Number(input.totalEarned);
    if (previousCollected + pendingRevenue > MAX_SAVE_CURRENCY)
      return invalid(config, now, fallbackPlayerId, fromVersion, "Migrated currency exceeds the supported range.");
    return {
      ok: true,
      state: {
        ...normalizeState(input, config),
        schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
        totalEarned: previousCollected + pendingRevenue,
        totalCollected: previousCollected,
      },
      migrated: true,
      fromVersion,
      warnings: ["Save migrated from schemaVersion 2 to 3."],
    };
  }

  return {
    ok: true,
    state: normalizeState(input, config),
    migrated: false,
    fromVersion,
    warnings: [],
  };
}

function invalid(
  config: GameConfig,
  now: number,
  fallbackPlayerId: string,
  fromVersion: number | null,
  warning: string,
): MigrationResult {
  return {
    ok: false,
    state: createInitialState(config, now, fallbackPlayerId),
    migrated: false,
    fromVersion,
    warnings: [warning],
  };
}

function validateVersion1State(input: Record<string, unknown>, config: GameConfig): string[] {
  const warnings: string[] = [];

  if (!isPresentString(input.playerId)) warnings.push("Save playerId is missing.");
  if (!isNonNegativeNumber(input.credits)) warnings.push("Save credits is invalid.");
  if (!isNonNegativeNumber(input.totalEarned)) warnings.push("Save totalEarned is invalid.");
  if (!isNonNegativeNumber(input.totalSpent)) warnings.push("Save totalSpent is invalid.");
  if (!isNonNegativeInteger(input.lastUpdated)) warnings.push("Save lastUpdated is invalid.");
  if (!isNonNegativeInteger(input.createdAt)) warnings.push("Save createdAt is invalid.");
  if (!isRecord(input.generators)) warnings.push("Save generators map is invalid.");
  if (!isRecord(input.upgrades)) warnings.push("Save upgrades map is invalid.");
  if (!isRecord(input.managers)) warnings.push("Save managers map is invalid.");
  if (!isRecord(input.reputation)) warnings.push("Save reputation state is invalid.");

  if (isRecord(input.generators)) {
    for (const generator of config.generators) {
      const owned = input.generators[generator.id];
      if (
        !isRecord(owned) ||
        owned.id !== generator.id ||
        !isNonNegativeInteger(owned.level) ||
        !Number.isFinite(getGeneratorCost(config, input as unknown as PlayerState, generator.id))
      ) {
        warnings.push(`Save generator '${generator.id}' is invalid.`);
      }
    }
  }

  if (isRecord(input.upgrades)) {
    for (const upgrade of config.upgrades) {
      const owned = input.upgrades[upgrade.id];
      if (!isRecord(owned) || owned.id !== upgrade.id || typeof owned.purchased !== "boolean") {
        warnings.push(`Save upgrade '${upgrade.id}' is invalid.`);
      }
    }
  }

  if (isRecord(input.managers)) {
    for (const manager of config.managers) {
      const owned = input.managers[manager.id];
      if (!isRecord(owned) || owned.id !== manager.id || typeof owned.hired !== "boolean") {
        warnings.push(`Save manager '${manager.id}' is invalid.`);
      }
    }
  }

  if (isRecord(input.reputation)) {
    if (!config.reputationTiers.some((tier) => tier.id === (input.reputation as Record<string, unknown>).tierId))
      warnings.push("Save reputation tierId is invalid.");
    if (!isNonNegativeNumber(input.reputation.points)) warnings.push("Save reputation points is invalid.");
    if (!isNonNegativeInteger(input.reputation.resets)) warnings.push("Save reputation resets is invalid.");
  }

  return warnings;
}

function validateVersion2State(input: Record<string, unknown>, config: GameConfig): string[] {
  const warnings = validateVersion1State(input, config);
  if (!isNonNegativeNumber(input.pendingRevenue)) warnings.push("Save pendingRevenue is invalid.");
  return warnings;
}

function validateVersion3State(input: Record<string, unknown>, config: GameConfig): string[] {
  const warnings = validateVersion2State(input, config);
  if (!isNonNegativeNumber(input.totalCollected)) warnings.push("Save totalCollected is invalid.");
  if (input.lastCollectedAt !== undefined && !isNonNegativeInteger(input.lastCollectedAt)) {
    warnings.push("Save lastCollectedAt is invalid.");
  }
  return warnings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPresentString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeNumber(value: unknown): boolean {
  return isFiniteNumber(value) && value >= 0 && value <= MAX_SAVE_CURRENCY;
}

function isNonNegativeInteger(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function normalizeState(input: Record<string, unknown>, config: GameConfig): PlayerState {
  const source = input as unknown as PlayerState;
  return {
    schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
    playerId: source.playerId,
    credits: source.credits,
    pendingRevenue: source.pendingRevenue ?? 0,
    totalEarned: source.totalEarned,
    totalCollected: source.totalCollected ?? source.totalEarned,
    totalSpent: source.totalSpent,
    generators: Object.fromEntries(
      config.generators.map(({ id }) => [
        id,
        { id, level: source.generators[id].level, ...metadata(source.generators[id], "purchasedAt") },
      ]),
    ),
    upgrades: Object.fromEntries(
      config.upgrades.map(({ id }) => [
        id,
        { id, purchased: source.upgrades[id].purchased, ...metadata(source.upgrades[id], "purchasedAt") },
      ]),
    ),
    managers: Object.fromEntries(
      config.managers.map(({ id }) => [
        id,
        { id, hired: source.managers[id].hired, ...metadata(source.managers[id], "hiredAt") },
      ]),
    ),
    reputation: {
      tierId: source.reputation.tierId,
      points: source.reputation.points,
      resets: source.reputation.resets,
    },
    lastUpdated: source.lastUpdated,
    createdAt: source.createdAt,
    ...(source.lastCollectedAt === undefined ? {} : { lastCollectedAt: source.lastCollectedAt }),
  };
}

function metadata(value: object, key: string): Record<string, number> {
  const timestamp = (value as Record<string, unknown>)[key];
  return isNonNegativeInteger(timestamp) ? { [key]: Number(timestamp) } : {};
}
