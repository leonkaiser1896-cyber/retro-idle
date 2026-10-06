import type { GameConfig, UnlockRequirement } from "../game";

export type ConfigValidationResult =
  { ok: true; warnings: string[] } | { ok: false; errors: string[]; warnings: string[] };

export function validateGameConfig(config: GameConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const generatorIds = new Set<string>(config.generators.map((generator) => generator.id));
  const reputationTierIds = new Set<string>(config.reputationTiers.map((tier) => tier.id));

  if (!isPresentString(config.currencyName)) {
    errors.push("currencyName: Currency name is required.");
  }
  if (!isPositiveFinite(config.offlineCapMs)) {
    errors.push("offlineCapMs: Offline cap must be greater than 0.");
  }
  if (!isNonNegativeFinite(config.startingCredits)) {
    errors.push("startingCredits: Starting credits must be finite and non-negative.");
  }
  if (config.generators.length === 0) {
    errors.push("generators: At least one generator is required.");
  }
  if (config.startingGenerators) {
    Object.entries(config.startingGenerators).forEach(([generatorId, level]) => {
      if (!generatorIds.has(generatorId)) {
        errors.push(`startingGenerators.${generatorId}: Starting generator references an unknown generator.`);
      }
      if (typeof level !== "number" || !Number.isInteger(level) || level < 0) {
        errors.push(`startingGenerators.${generatorId}: Starting generator level must be a non-negative integer.`);
      }
    });
  }

  validateUniqueIds(
    errors,
    "generators",
    config.generators.map((generator) => generator.id),
  );
  validateUniqueIds(
    errors,
    "upgrades",
    config.upgrades.map((upgrade) => upgrade.id),
  );
  validateUniqueIds(
    errors,
    "managers",
    config.managers.map((manager) => manager.id),
  );
  validateUniqueIds(
    errors,
    "reputationTiers",
    config.reputationTiers.map((tier) => tier.id),
  );

  config.generators.forEach((generator, index) => {
    const path = `generators[${index}]`;
    if (!isPresentString(generator.id)) {
      errors.push(`${path}.id: Generator id is required.`);
    }
    if (!isPresentString(generator.name)) {
      errors.push(`${path}.name: Generator name is required.`);
    }
    if (!isPositiveFinite(generator.baseCost)) {
      errors.push(`${path}.baseCost: Generator baseCost must be greater than 0.`);
    }
    if (!Number.isFinite(generator.costMultiplier) || generator.costMultiplier < 1) {
      errors.push(`${path}.costMultiplier: Generator costMultiplier must be at least 1.`);
    }
    if (!isNonNegativeFinite(generator.baseIncomePerSecond)) {
      errors.push(`${path}.baseIncomePerSecond: Generator baseIncomePerSecond must be at least 0.`);
    }
    validateUnlockRequirement(
      errors,
      `${path}.unlockRequirement`,
      generator.unlockRequirement,
      generatorIds,
      reputationTierIds,
    );
  });

  config.upgrades.forEach((upgrade, index) => {
    const path = `upgrades[${index}]`;
    if (!isPresentString(upgrade.id)) {
      errors.push(`${path}.id: Upgrade id is required.`);
    }
    if (!isPresentString(upgrade.name)) {
      errors.push(`${path}.name: Upgrade name is required.`);
    }
    if (!isPositiveFinite(upgrade.cost)) {
      errors.push(`${path}.cost: Upgrade cost must be greater than 0.`);
    }
    if (!isPositiveFinite(upgrade.effect.multiplier)) {
      errors.push(`${path}.effect.multiplier: Upgrade multiplier must be greater than 0.`);
    }
    if (upgrade.effect.type === "generatorMultiplier" && !generatorIds.has(upgrade.effect.generatorId)) {
      errors.push(`${path}.effect.generatorId: Upgrade references an unknown generator.`);
    }
    if (upgrade.effect.type === "globalMultiplier" && upgrade.effect.multiplier === 1) {
      warnings.push(`${path}.effect.multiplier: Global multiplier of 1 has no gameplay effect.`);
    }
    validateUnlockRequirement(
      errors,
      `${path}.unlockRequirement`,
      upgrade.unlockRequirement,
      generatorIds,
      reputationTierIds,
    );
  });

  config.managers.forEach((manager, index) => {
    const path = `managers[${index}]`;
    if (!isPresentString(manager.id)) {
      errors.push(`${path}.id: Manager id is required.`);
    }
    if (!isPresentString(manager.name)) {
      errors.push(`${path}.name: Manager name is required.`);
    }
    if (!isPositiveFinite(manager.cost)) {
      errors.push(`${path}.cost: Manager cost must be greater than 0.`);
    }
    if (!generatorIds.has(manager.generatorId)) {
      errors.push(`${path}.generatorId: Manager references an unknown generator.`);
    }
    validateUnlockRequirement(
      errors,
      `${path}.unlockRequirement`,
      manager.unlockRequirement,
      generatorIds,
      reputationTierIds,
    );
  });

  config.reputationTiers.forEach((tier, index) => {
    const path = `reputationTiers[${index}]`;
    if (!isPresentString(tier.id)) {
      errors.push(`${path}.id: Reputation tier id is required.`);
    }
    if (!isPresentString(tier.name)) {
      errors.push(`${path}.name: Reputation tier name is required.`);
    }
    if (!isNonNegativeFinite(tier.requiredLifetimeCredits)) {
      errors.push(`${path}.requiredLifetimeCredits: Reputation threshold must be finite and non-negative.`);
    }
    if (!isPositiveFinite(tier.globalMultiplier)) {
      errors.push(`${path}.globalMultiplier: Reputation globalMultiplier must be greater than 0.`);
    }
    if (index > 0 && tier.requiredLifetimeCredits < config.reputationTiers[index - 1].requiredLifetimeCredits) {
      errors.push(`${path}.requiredLifetimeCredits: Reputation progression must be ascending.`);
    }
    if (index > 0 && tier.requiredLifetimeCredits === config.reputationTiers[index - 1].requiredLifetimeCredits) {
      warnings.push(`${path}.requiredLifetimeCredits: Reputation tier has the same threshold as the previous tier.`);
    }
  });

  if (config.reputationTiers.length > 0 && config.reputationTiers[0].requiredLifetimeCredits !== 0) {
    errors.push("reputationTiers[0].requiredLifetimeCredits: First reputation tier must start at 0.");
  }

  return errors.length === 0 ? { ok: true, warnings } : { ok: false, errors, warnings };
}

function validateUnlockRequirement(
  errors: string[],
  path: string,
  requirement: UnlockRequirement | undefined,
  generatorIds: Set<string>,
  reputationTierIds: Set<string>,
): void {
  if (!requirement) {
    return;
  }
  if (requirement.generatorId && !generatorIds.has(requirement.generatorId)) {
    errors.push(`${path}.generatorId: Unlock requirement references an unknown generator.`);
  }
  if (
    requirement.generatorCount !== undefined &&
    (!Number.isInteger(requirement.generatorCount) || requirement.generatorCount < 0)
  ) {
    errors.push(`${path}.generatorCount: Unlock generatorCount must be a non-negative integer.`);
  }
  if (requirement.creditsEarned !== undefined && !isNonNegativeFinite(requirement.creditsEarned)) {
    errors.push(`${path}.creditsEarned: Unlock creditsEarned must be finite and non-negative.`);
  }
  if (requirement.reputationTierId && !reputationTierIds.has(requirement.reputationTierId)) {
    errors.push(`${path}.reputationTierId: Unlock requirement references an unknown reputation tier.`);
  }
}

function validateUniqueIds(errors: string[], path: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!isPresentString(id)) {
      errors.push(`${path}: ID is required.`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`${path}: Duplicate ID '${id}'.`);
    }
    seen.add(id);
  }
}

function isPresentString(value: string): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
