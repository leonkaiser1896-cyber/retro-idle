import { buyGenerator, buyUpgrade, hireManager } from "./actions";
import { calculateRates, getGeneratorCost, isUnlocked } from "./economy";
import { createInitialState, getGeneratorLevel, isManagerHired, isUpgradePurchased } from "./state";
import type { GameConfig, PlayerState } from "./types";

export interface SimulationStep {
  timeMs: number;
  label: string;
  credits: number;
  creditsPerSecond: number;
}

export interface SimulationResult {
  finalState: PlayerState;
  steps: SimulationStep[];
}

export interface SimulationOptions {
  playerId?: string;
  startTimeMs?: number;
  maxSteps?: number;
  maxElapsedMs?: number;
}

export function simulateRecommendedProgression(config: GameConfig, options: SimulationOptions = {}): SimulationResult {
  const startTimeMs = options.startTimeMs ?? 0;
  const maxSteps = options.maxSteps ?? 80;
  const maxElapsedMs = options.maxElapsedMs ?? 7 * 24 * 60 * 60 * 1000;
  let state = createInitialState(config, startTimeMs, options.playerId ?? "simulation-player");
  let now = startTimeMs;
  const steps: SimulationStep[] = [toStep(state, config, now, "Start")];

  for (let index = 0; index < maxSteps && now - startTimeMs <= maxElapsedMs; index += 1) {
    const target = nextAffordableTarget(state, config);
    if (!target) {
      break;
    }

    const rates = calculateRates(state, config);
    if (state.credits < target.cost) {
      if (rates.creditsPerSecond <= 0) {
        break;
      }
      const waitMs = Math.ceil(((target.cost - state.credits) / rates.creditsPerSecond) * 1000);
      now += waitMs;
    }

    const result =
      target.kind === "generator"
        ? buyGenerator(state, config, target.id, now)
        : target.kind === "upgrade"
          ? buyUpgrade(state, config, target.id, now)
          : hireManager(state, config, target.id, now);

    if (!result.ok) {
      break;
    }

    state = result.state;
    steps.push(toStep(state, config, now, target.label));
  }

  return { finalState: state, steps };
}

function nextAffordableTarget(
  state: PlayerState,
  config: GameConfig,
): { kind: "generator" | "upgrade" | "manager"; id: string; label: string; cost: number } | undefined {
  const generatorTargets = config.generators
    .filter((generator) => isUnlocked(state, generator.unlockRequirement))
    .map((generator) => ({
      kind: "generator" as const,
      id: generator.id,
      label: `Buy ${generator.name} L${getGeneratorLevel(state, generator.id) + 1}`,
      cost: getGeneratorCost(config, state, generator.id),
    }));

  const upgradeTargets = config.upgrades
    .filter((upgrade) => !isUpgradePurchased(state, upgrade.id) && isUnlocked(state, upgrade.unlockRequirement))
    .map((upgrade) => ({
      kind: "upgrade" as const,
      id: upgrade.id,
      label: `Buy upgrade ${upgrade.name}`,
      cost: upgrade.cost,
    }));

  const managerTargets = config.managers
    .filter((manager) => !isManagerHired(state, manager.id) && isUnlocked(state, manager.unlockRequirement))
    .map((manager) => ({
      kind: "manager" as const,
      id: manager.id,
      label: `Hire ${manager.name}`,
      cost: manager.cost,
    }));

  return [...upgradeTargets, ...managerTargets, ...generatorTargets]
    .filter((target) => Number.isFinite(target.cost) && target.cost > 0)
    .sort((left, right) => left.cost - right.cost)[0];
}

function toStep(state: PlayerState, config: GameConfig, timeMs: number, label: string): SimulationStep {
  return {
    timeMs,
    label,
    credits: state.credits,
    creditsPerSecond: calculateRates(state, config).creditsPerSecond,
  };
}
