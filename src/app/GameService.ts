import type { StorageAdapter } from "../adapters/StorageAdapter";
import type { ConfigValidationResult } from "../config/validateGameConfig";
import { gameConfig } from "../config/gameConfig";
import { StandaloneStorageAdapter } from "../adapters/StandaloneStorageAdapter";
import { validateGameConfig } from "../config/validateGameConfig";
import {
  buyGenerator,
  buyUpgrade,
  collectRevenue,
  createInitialState,
  applyOfflineProgress,
  getGameSnapshot,
  getGeneratorCost,
  getGeneratorLevel,
  hireManager,
  isManagerHired,
  isUnlocked,
  isUpgradePurchased,
  currencyMath,
  migratePlayerState,
  type GameConfig,
  type GameError,
  type GameResult,
  type ManagerConfig,
  type PlayerState,
  type UpgradeConfig,
  type UnlockRequirement,
} from "../game";

export const DEFAULT_SAVE_IDENTIFIER = "retro_idle_save_v1";
export const CORRUPT_SAVE_BACKUP_IDENTIFIER = "retro_idle_corrupt_save_backup_v1";

import type {
  GeneratorViewModel,
  UpgradeViewModel,
  ManagerViewModel,
  GameViewModel,
  ProgressionHintViewModel,
  BusinessMilestoneViewModel,
  LoadGameResult,
  GameServiceOptions,
} from "./types";
export type {
  ActionLogEntry,
  GeneratorViewModel,
  UpgradeViewModel,
  ManagerViewModel,
  ReputationViewModel,
  GameViewModel,
  ProgressionHintViewModel,
  BusinessMilestoneViewModel,
  LoadGameResult,
  GameServiceOptions,
} from "./types";

interface LoadSaveResult {
  exists: boolean;
  payload: unknown | null;
  raw: string | null;
  warningMessage?: string;
}

export class GameService {
  private readonly storage: StorageAdapter;
  private readonly config: GameConfig;
  private readonly identifier: string;
  private readonly playerId: string;
  private readonly now: () => number;
  private readonly configValidation: ConfigValidationResult;
  private persistenceWarning: string | undefined;

  constructor(options: GameServiceOptions = {}) {
    this.storage = options.storage ?? new StandaloneStorageAdapter();
    this.config = options.config ?? gameConfig;
    this.identifier = options.identifier ?? DEFAULT_SAVE_IDENTIFIER;
    this.playerId = options.playerId ?? "standalone-player";
    this.now = options.now ?? (() => Date.now());
    this.configValidation = validateGameConfig(this.config);
  }

  async loadGame(): Promise<LoadGameResult> {
    const now = this.now();
    const loadedSave = await this.safeLoadSave();
    let migration: ReturnType<typeof migratePlayerState> | null = null;
    let initialState: PlayerState;
    let loadWarningMessage = loadedSave.warningMessage;

    if (!loadedSave.exists) {
      initialState = createInitialState(this.config, now, this.playerId);
    } else if (loadedSave.payload === null) {
      await this.backupInvalidSave(loadedSave.raw);
      initialState = createInitialState(this.config, now, this.playerId);
      loadWarningMessage ??= "Lokaler Spielstand war nicht lesbar und wurde neu erstellt.";
    } else {
      migration = migratePlayerState(loadedSave.payload, this.config, now, this.playerId);
      if (migration.ok) {
        initialState = migration.state;
      } else {
        await this.backupInvalidSave(loadedSave.raw ?? stringifyForBackup(loadedSave.payload));
        initialState = migration.state;
        loadWarningMessage =
          `Lokaler Spielstand war ungültig und wurde neu erstellt. ${migration.warnings.join(" ")}`.trim();
      }
    }

    const progressResult = applyOfflineProgress(initialState, this.config, now);
    const state = progressResult.ok ? progressResult.state : initialState;

    if (progressResult.ok) {
      await this.safeSave(state);
    }

    return {
      state,
      view: this.getView(state),
      offlineCredits: progressResult.ok ? (progressResult.data?.creditsEarned ?? 0) : 0,
      offlineElapsedMs: progressResult.ok ? (progressResult.data?.elapsedMs ?? 0) : 0,
      offlineAppliedMs: progressResult.ok ? (progressResult.data?.appliedMs ?? 0) : 0,
      offlineCapped: progressResult.ok
        ? (progressResult.data?.elapsedMs ?? 0) > (progressResult.data?.appliedMs ?? 0)
        : false,
      createdNewState:
        !loadedSave.exists || migration?.ok === false || (loadedSave.exists && loadedSave.payload === null),
      warningMessage: this.loadWarningMessage(loadWarningMessage, migration, progressResult),
    };
  }

  getView(state: PlayerState): GameViewModel {
    const snapshot = getGameSnapshot(state, this.config, this.now());
    const previewState = snapshot.previewState;
    const reputationTier =
      this.config.reputationTiers.find((tier) => tier.id === previewState.reputation.tierId) ??
      this.config.reputationTiers[0];
    const nextReputationTier = this.config.reputationTiers.find(
      (tier) => tier.requiredLifetimeCredits > previewState.totalEarned,
    );
    const generators = this.config.generators.map((generator) => {
      const locked = !isUnlocked(previewState, generator.unlockRequirement);
      const cost = snapshot.nextGeneratorCosts[generator.id];
      const canBuy = !locked && currencyMath.isPositiveFinite(cost) && previewState.credits >= cost;
      const level = getGeneratorLevel(previewState, generator.id);
      const income = snapshot.rates.byGenerator[generator.id] ?? 0;
      const managerHired = this.config.managers.some(
        (manager) => manager.generatorId === generator.id && isManagerHired(previewState, manager.id),
      );
      const purchasedUpgradeCount = this.config.upgrades.filter(
        (upgrade) =>
          upgrade.effect.type === "generatorMultiplier" &&
          upgrade.effect.generatorId === generator.id &&
          isUpgradePurchased(previewState, upgrade.id),
      ).length;

      return {
        id: generator.id,
        name: generator.name,
        description: generator.description,
        level,
        cost,
        incomePerSecond: income,
        locked,
        unlockHint: locked ? this.describeUnlock(generator.unlockRequirement) : undefined,
        canBuy,
        managerHired,
        purchasedUpgradeCount,
        unlocked: !locked,
        affordable: canBuy,
        income,
        nextCost: cost,
        status: buildingStatus(locked, level),
        visualTier: buildingVisualTier(level),
        hasManager: managerHired,
        upgradeCount: purchasedUpgradeCount,
        disabledReason: buttonReason({
          locked,
          invalidConfig: !currencyMath.isPositiveFinite(cost),
          alreadyDone: false,
          notEnoughCredits: previewState.credits < cost,
        }),
      };
    });
    const upgrades = this.config.upgrades.map((upgrade) => this.toUpgradeViewModel(previewState, upgrade));
    const managers = this.config.managers.map((manager) => this.toManagerViewModel(previewState, manager));
    const progressionHint = this.getProgressionHint(
      previewState,
      snapshot.rates.creditsPerSecond,
      generators,
      upgrades,
      managers,
    );
    const businessMilestones = this.getBusinessMilestones(previewState);

    return {
      snapshot,
      persistenceWarning: this.persistenceWarning,
      credits: snapshot.credits,
      pendingRevenue: snapshot.pendingRevenue,
      collectableAmount: snapshot.collectableAmount,
      incomePerSecond: snapshot.incomePerSecond,
      totalEarned: snapshot.totalEarned,
      totalCollected: snapshot.totalCollected,
      collectFillPercent: calculateCollectFillPercent(snapshot.collectableAmount),
      collectButtonState: snapshot.collectButtonState,
      generators,
      buildings: generators,
      upgrades,
      managers,
      reputation: {
        tierId: previewState.reputation.tierId,
        name: reputationTier?.name ?? previewState.reputation.tierId,
        bonusPercent: ((reputationTier?.globalMultiplier ?? 1) - 1) * 100,
        points: previewState.reputation.points,
        resets: previewState.reputation.resets,
        nextTierName: nextReputationTier?.name,
        nextTierRequiredCredits: nextReputationTier?.requiredLifetimeCredits,
        nextTierMissingCredits:
          nextReputationTier === undefined
            ? undefined
            : Math.max(0, nextReputationTier.requiredLifetimeCredits - previewState.totalEarned),
        nextTierBonusPercent:
          nextReputationTier === undefined ? undefined : (nextReputationTier.globalMultiplier - 1) * 100,
      },
      progressionHint,
      activeObjective: progressionHint,
      businessMilestones,
      milestones: businessMilestones,
    };
  }

  async buyGenerator(state: PlayerState, generatorId: string): Promise<ServiceActionResult> {
    const result = buyGenerator(state, this.config, generatorId, this.now());
    const name = this.config.generators.find((generator) => generator.id === generatorId)?.name ?? generatorId;
    return this.persistActionResult(result, `Generator gekauft: ${name}`);
  }

  async buyUpgrade(state: PlayerState, upgradeId: string): Promise<ServiceActionResult> {
    const result = buyUpgrade(state, this.config, upgradeId, this.now());
    const name = this.config.upgrades.find((upgrade) => upgrade.id === upgradeId)?.name ?? upgradeId;
    return this.persistActionResult(result, `Upgrade gekauft: ${name}`);
  }

  async hireManager(state: PlayerState, managerId: string): Promise<ServiceActionResult> {
    const result = hireManager(state, this.config, managerId, this.now());
    const name = this.config.managers.find((manager) => manager.id === managerId)?.name ?? managerId;
    return this.persistActionResult(result, `Manager eingestellt: ${name}`);
  }

  async collectRevenue(state: PlayerState): Promise<ServiceActionResult> {
    const result = collectRevenue(state, this.config, this.now());
    return this.persistActionResult(result, "Fortschritt eingesammelt");
  }

  async claimProgress(state: PlayerState): Promise<ServiceActionResult> {
    return this.collectRevenue(state);
  }

  exportSave(state: PlayerState): string {
    return JSON.stringify(state, null, 2);
  }

  async importSaveJson(currentState: PlayerState, rawJson: string): Promise<ServiceActionResult> {
    if (rawJson.length > 1_000_000) {
      return {
        ok: false,
        state: currentState,
        view: this.getView(currentState),
        message: "Die Sicherung ist zu groß. Maximal 1 MB.",
      };
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawJson);
    } catch {
      return {
        ok: false,
        state: currentState,
        view: this.getView(currentState),
        message: "Import ist kein gültiges JSON.",
      };
    }

    const now = this.now();
    const migration = migratePlayerState(payload, this.config, now, this.playerId);
    if (!migration.ok) {
      return {
        ok: false,
        state: currentState,
        view: this.getView(currentState),
        message: `Import ist kein gültiger Spielstand. ${migration.warnings.join(" ")}`.trim(),
      };
    }

    const progressResult = applyOfflineProgress(migration.state, this.config, now);
    if (!progressResult.ok) {
      return {
        ok: false,
        state: currentState,
        view: this.getView(currentState),
        message: this.messageForError(progressResult.error),
        error: progressResult.error,
      };
    }

    await this.safeSave(progressResult.state);
    return {
      ok: true,
      state: progressResult.state,
      view: this.getView(progressResult.state),
      message: migration.migrated ? "Spielstand importiert und migriert." : "Spielstand importiert.",
    };
  }

  async resetLocalSave(): Promise<ServiceActionResult> {
    const state = createInitialState(this.config, this.now(), this.playerId);
    await this.safeSave(state);
    return {
      ok: true,
      state,
      view: this.getView(state),
      message: "Lokaler Spielstand zurueckgesetzt.",
    };
  }

  messageForError(error: GameError): string {
    switch (error.code) {
      case "NOT_ENOUGH_CREDITS":
        return "Nicht genug credits.";
      case "GENERATOR_NOT_FOUND":
      case "UPGRADE_NOT_FOUND":
      case "MANAGER_NOT_FOUND":
        return "Diese Aktion ist nicht verfügbar.";
      case "ALREADY_PURCHASED":
        return "Dieses Upgrade wurde bereits gekauft.";
      case "ALREADY_HIRED":
        return "Dieser Manager ist bereits eingestellt.";
      case "UNLOCK_REQUIREMENT_NOT_MET":
        return "Die Freischaltbedingung ist noch nicht erfuellt.";
      case "INVALID_TIME":
        return "Ungültiger Zeitstempel.";
      case "INVALID_AMOUNT":
        return "Ungültiger Betrag in der Konfiguration.";
    }
  }

  private async persistActionResult(result: GameResult<unknown>, successMessage: string): Promise<ServiceActionResult> {
    if (!result.ok) {
      return {
        ok: false,
        state: result.state,
        view: this.getView(result.state),
        message: this.messageForError(result.error),
        error: result.error,
      };
    }

    await this.safeSave(result.state);
    return {
      ok: true,
      state: result.state,
      view: this.getView(result.state),
      message: successMessage,
    };
  }

  private toUpgradeViewModel(state: PlayerState, upgrade: UpgradeConfig): UpgradeViewModel {
    const purchased = isUpgradePurchased(state, upgrade.id);
    const locked = !isUnlocked(state, upgrade.unlockRequirement);
    return {
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      cost: upgrade.cost,
      effectLabel: formatUpgradeEffect(upgrade),
      purchased,
      locked,
      unlockHint: locked ? this.describeUnlock(upgrade.unlockRequirement) : undefined,
      canBuy: !purchased && !locked && currencyMath.isPositiveFinite(upgrade.cost) && state.credits >= upgrade.cost,
      disabledReason: buttonReason({
        locked,
        invalidConfig: !currencyMath.isPositiveFinite(upgrade.cost),
        alreadyDone: purchased,
        alreadyDoneReason: "Bereits gekauft",
        notEnoughCredits: state.credits < upgrade.cost,
      }),
    };
  }

  private toManagerViewModel(state: PlayerState, manager: ManagerConfig): ManagerViewModel {
    const hired = isManagerHired(state, manager.id);
    const locked = !isUnlocked(state, manager.unlockRequirement);
    return {
      id: manager.id,
      name: manager.name,
      description: manager.description,
      cost: manager.cost,
      hired,
      locked,
      unlockHint: locked ? this.describeUnlock(manager.unlockRequirement) : undefined,
      canHire: !hired && !locked && currencyMath.isPositiveFinite(manager.cost) && state.credits >= manager.cost,
      disabledReason: buttonReason({
        locked,
        invalidConfig: !currencyMath.isPositiveFinite(manager.cost),
        alreadyDone: hired,
        alreadyDoneReason: "Bereits eingestellt",
        notEnoughCredits: state.credits < manager.cost,
      }),
    };
  }

  private describeUnlock(requirement?: UnlockRequirement): string {
    if (!requirement) return "Noch gesperrt";
    const conditions: string[] = [];
    if (requirement.generatorId) {
      const name =
        this.config.generators.find((item) => item.id === requirement.generatorId)?.name ?? requirement.generatorId;
      conditions.push(`${name}: Level ${requirement.generatorCount ?? 1}`);
    }
    if (requirement.creditsEarned !== undefined)
      conditions.push(`${requirement.creditsEarned.toLocaleString("de-DE")} Credits insgesamt verdienen`);
    if (requirement.reputationTierId)
      conditions.push(
        `Ruf: ${this.config.reputationTiers.find((tier) => tier.id === requirement.reputationTierId)?.name ?? requirement.reputationTierId}`,
      );
    return `Freischaltung: ${conditions.join(" · ")}`;
  }

  private getProgressionHint(
    state: PlayerState,
    creditsPerSecond: number,
    generators: GeneratorViewModel[],
    upgrades: UpgradeViewModel[],
    managers: ManagerViewModel[],
  ): ProgressionHintViewModel {
    if (!this.configValidation.ok) {
      return {
        title: "Config pruefen",
        description: "Die Balancing-Config ist ungültig. Käufe bleiben durch Core-Checks geschützt.",
        targetType: "none",
      };
    }

    const firstOpenObjective = nextObjective(state, creditsPerSecond, this.config, managers);
    if (firstOpenObjective) {
      return firstOpenObjective;
    }

    const candidates: Array<ProgressionHintViewModel & { sortCost: number }> = [
      ...generators
        .filter((generator) => !generator.locked && currencyMath.isPositiveFinite(generator.cost))
        .map((generator) => ({
          title: `Nächstes Ziel: ${generator.name}`,
          description:
            state.credits >= generator.cost
              ? "Du kannst dieses Business jetzt kaufen."
              : (generator.disabledReason ?? "Nicht genug credits"),
          targetType: "generator" as const,
          targetId: generator.id,
          cost: generator.cost,
          missingCredits: Math.max(0, generator.cost - state.credits),
          sortCost: generator.cost,
        })),
      ...upgrades
        .filter((upgrade) => !upgrade.purchased && !upgrade.locked && currencyMath.isPositiveFinite(upgrade.cost))
        .map((upgrade) => ({
          title: `Nächstes Upgrade: ${upgrade.name}`,
          description:
            state.credits >= upgrade.cost
              ? "Du kannst dieses Upgrade jetzt kaufen."
              : (upgrade.disabledReason ?? "Nicht genug credits"),
          targetType: "upgrade" as const,
          targetId: upgrade.id,
          cost: upgrade.cost,
          missingCredits: Math.max(0, upgrade.cost - state.credits),
          sortCost: upgrade.cost,
        })),
      ...managers
        .filter((manager) => !manager.hired && !manager.locked && currencyMath.isPositiveFinite(manager.cost))
        .map((manager) => ({
          title: `Nächster Manager: ${manager.name}`,
          description:
            state.credits >= manager.cost
              ? "Du kannst diesen Manager jetzt einstellen."
              : (manager.disabledReason ?? "Nicht genug credits"),
          targetType: "manager" as const,
          targetId: manager.id,
          cost: manager.cost,
          missingCredits: Math.max(0, manager.cost - state.credits),
          sortCost: manager.cost,
        })),
    ];

    const next = candidates.sort((left, right) => left.sortCost - right.sortCost)[0];
    if (next) {
      const { sortCost: _sortCost, ...hint } = next;
      return hint;
    }

    const lockedGenerator = generators.find((generator) => generator.locked);
    if (lockedGenerator) {
      return {
        title: `Nächste Freischaltung: ${lockedGenerator.name}`,
        description: lockedGenerator.disabledReason ?? "Noch gesperrt",
        targetType: "generator",
        targetId: lockedGenerator.id,
      };
    }

    return {
      title: "Alle MVP-Ziele erreicht",
      description: "Fuer den aktuellen MVP gibt es kein weiteres offenes Ziel.",
      targetType: "none",
    };
  }

  private getBusinessMilestones(state: PlayerState): BusinessMilestoneViewModel[] {
    return [
      {
        id: "first_kiosk",
        label: "Erster Kiosk eröffnet",
        achieved: getGeneratorLevel(state, "kiosk") >= 1,
        description: "Der erste Laden ist offen und bringt laufende Einnahmen.",
      },
      {
        id: "workshop_unlocked",
        label: "Werkstatt freigeschaltet",
        achieved: isUnlocked(
          state,
          this.config.generators.find((generator) => generator.id === "workshop")?.unlockRequirement,
        ),
        description: "Reparaturen und Stammkunden werden als nächster Geschäftszweig möglich.",
      },
      {
        id: "logistics_founded",
        label: "Spedition gegründet",
        achieved: getGeneratorLevel(state, "logistics") >= 1,
        description: "Lieferverträge erweitern dein Netzwerk in der Stadt.",
      },
      {
        id: "club_known",
        label: "Club bekannt gemacht",
        achieved: getGeneratorLevel(state, "club") >= 1,
        description: "Events und Kontakte staerken deinen Szene-Ruf.",
      },
      {
        id: "company_built",
        label: "Unternehmenszentrale aufgebaut",
        achieved: getGeneratorLevel(state, "company") >= 1,
        description: "Deine Geschäftsbereiche laufen unter einem Dach zusammen.",
      },
    ];
  }

  private loadWarningMessage(
    loadWarningMessage: string | undefined,
    migration: ReturnType<typeof migratePlayerState> | null,
    progressResult: GameResult<unknown>,
  ): string | undefined {
    if (loadWarningMessage) {
      return loadWarningMessage;
    }
    if (progressResult.ok) {
      return migration?.migrated ? "Spielstand wurde auf das aktuelle Schema migriert." : undefined;
    }
    return this.messageForError(progressResult.error);
  }

  private async safeLoadSave(): Promise<LoadSaveResult> {
    if (this.storage.loadRaw) {
      try {
        const raw = await this.storage.loadRaw(this.identifier);
        if (raw === null) {
          return { exists: false, payload: null, raw: null };
        }

        try {
          return { exists: true, payload: JSON.parse(raw) as unknown, raw };
        } catch {
          return {
            exists: true,
            payload: null,
            raw,
            warningMessage: "Lokaler Spielstand war nicht lesbar und wurde neu erstellt.",
          };
        }
      } catch {
        return {
          exists: false,
          payload: null,
          raw: null,
          warningMessage: "Lokaler Spielstand konnte nicht gelesen werden.",
        };
      }
    }

    try {
      const payload = await this.storage.load(this.identifier);
      return {
        exists: payload !== null,
        payload,
        raw: payload === null ? null : stringifyForBackup(payload),
      };
    } catch {
      return {
        exists: false,
        payload: null,
        raw: null,
        warningMessage: "Lokaler Spielstand konnte nicht gelesen werden.",
      };
    }
  }

  private async backupInvalidSave(raw: string | null): Promise<void> {
    if (!raw || !this.storage.saveRaw) {
      return;
    }

    try {
      await this.storage.saveRaw(CORRUPT_SAVE_BACKUP_IDENTIFIER, raw);
    } catch {
      // Backup is best-effort; the app still recovers with a fresh state.
    }
  }

  private async safeSave(state: PlayerState): Promise<void> {
    try {
      await this.storage.save(this.identifier, state);
      this.persistenceWarning = undefined;
    } catch {
      this.persistenceWarning =
        "Dieser Browser konnte den Spielstand nicht speichern. Erstelle eine Sicherung, bevor du das Spiel schließt.";
    }
  }
}

export interface ServiceActionResult {
  ok: boolean;
  state: PlayerState;
  view: GameViewModel;
  message: string;
  error?: GameError;
}

function formatUpgradeEffect(upgrade: UpgradeConfig): string {
  if (upgrade.effect.type === "globalMultiplier") {
    return `Global ${formatMultiplierValue(upgrade.effect.multiplier)}`;
  }

  return `${upgrade.effect.generatorId} ${formatMultiplierValue(upgrade.effect.multiplier)}`;
}

function buildingStatus(locked: boolean, level: number): GeneratorViewModel["status"] {
  if (locked) {
    return "gesperrt";
  }
  if (level > 0) {
    return "aktiv";
  }
  return "verfügbar";
}

function buildingVisualTier(level: number): GeneratorViewModel["visualTier"] {
  if (level <= 0) {
    return 0;
  }
  if (level < 5) {
    return 1;
  }
  if (level < 10) {
    return 2;
  }
  if (level < 25) {
    return 3;
  }
  return 4;
}

function calculateCollectFillPercent(collectableAmount: number): number {
  if (!Number.isFinite(collectableAmount) || collectableAmount <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(8, Math.log10(collectableAmount + 1) * 24));
}

function formatMultiplierValue(value: number): string {
  if (!Number.isFinite(value)) {
    return "x invalid";
  }

  return `x${value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  })}`;
}

function stringifyForBackup(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function nextObjective(
  state: PlayerState,
  creditsPerSecond: number,
  config: GameConfig,
  managers: ManagerViewModel[],
): ProgressionHintViewModel | undefined {
  if (getGeneratorLevel(state, "kiosk") < 1) {
    const kiosk = config.generators.find((generator) => generator.id === "kiosk");
    return {
      title: "Kaufe deinen ersten Kiosk",
      description: "Starte mit einem kleinen Straßenkiosk und bringe dein Business ins Rollen.",
      targetType: "generator",
      targetId: "kiosk",
      cost: kiosk ? getGeneratorCost(config, state, kiosk.id) : undefined,
    };
  }

  const workshop = config.generators.find((generator) => generator.id === "workshop");
  if (workshop && !isUnlocked(state, workshop.unlockRequirement)) {
    const requirement = workshop.unlockRequirement;
    const prerequisite = config.generators.find((generator) => generator.id === requirement?.generatorId);
    return {
      title: "Schalte die Werkstatt frei",
      description: prerequisite
        ? `Baue ${prerequisite.name} auf Level ${requirement?.generatorCount ?? 1} aus. Sammle deine Einnahmen ein und investiere sie in den nächsten Ausbau.`
        : "Baue deine ersten Betriebe aus, um die Werkstatt freizuschalten.",
      targetType: "generator",
      targetId: prerequisite?.id,
      cost: prerequisite ? getGeneratorCost(config, state, prerequisite.id) : undefined,
      progressLabel: prerequisite
        ? `Level ${getGeneratorLevel(state, prerequisite.id)} / ${requirement?.generatorCount ?? 1}`
        : undefined,
    };
  }
  if (workshop && getGeneratorLevel(state, workshop.id) === 0) {
    const cost = getGeneratorCost(config, state, workshop.id);
    return {
      title: "Eröffne deine Werkstatt",
      description:
        "Dein nächster Geschäftsbereich ist freigeschaltet. Sammle die nötigen Credits und starte mit Reparaturen.",
      targetType: "generator",
      targetId: workshop.id,
      cost,
      missingCredits: Math.max(0, cost - state.credits),
    };
  }

  const targetRate = 10;
  if (creditsPerSecond < targetRate) {
    return {
      title: "Erreiche 10 credits/sec",
      description: "Skaliere deine Betriebe, bis dein Business spürbar laufende Einnahmen erzeugt.",
      targetType: "rate",
      progressLabel: `${formatObjectiveNumber(creditsPerSecond)} / ${formatObjectiveNumber(targetRate)} credits/sec`,
    };
  }

  if (!managers.some((manager) => manager.hired)) {
    const nextManager = managers.find(
      (manager) => !manager.locked && !manager.hired && currencyMath.isPositiveFinite(manager.cost),
    );
    return {
      title: "Stelle deinen ersten Manager ein",
      description: nextManager
        ? "Automatisiere den ersten Betrieb, damit dein Imperium auch ohne permanente Klicks weiterläuft."
        : "Baue dein Business aus, bis der erste Manager verfügbar wird.",
      targetType: "manager",
      targetId: nextManager?.id,
      cost: nextManager?.cost,
      missingCredits: nextManager ? Math.max(0, nextManager.cost - state.credits) : undefined,
    };
  }

  const secondTier = config.reputationTiers[1];
  if (secondTier && state.totalEarned < secondTier.requiredLifetimeCredits) {
    return {
      title: "Erreiche Rufstufe 2",
      description: "Sammle Reputation über dein Gesamtgeschäft und bereite spätere Prestige-Features vor.",
      targetType: "reputation",
      progressLabel: `${formatObjectiveNumber(state.totalEarned)} / ${formatObjectiveNumber(secondTier.requiredLifetimeCredits)} earned credits`,
      missingCredits: Math.max(0, secondTier.requiredLifetimeCredits - state.totalEarned),
    };
  }

  return undefined;
}

function formatObjectiveNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return "invalid";
  }
  if (Math.abs(value) >= 1000) {
    return value.toFixed(0);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function buttonReason(options: {
  locked: boolean;
  invalidConfig: boolean;
  alreadyDone: boolean;
  alreadyDoneReason?: string;
  notEnoughCredits: boolean;
}): string | undefined {
  if (options.invalidConfig) {
    return "Ungültige Config";
  }
  if (options.alreadyDone) {
    return options.alreadyDoneReason ?? "Bereits erledigt";
  }
  if (options.locked) {
    return "Noch gesperrt";
  }
  if (options.notEnoughCredits) {
    return "Nicht genug credits";
  }
  return undefined;
}
