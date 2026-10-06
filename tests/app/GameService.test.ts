import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { CORRUPT_SAVE_BACKUP_IDENTIFIER, GameService } from "../../src/app/GameService";
import { calculateRates, createInitialState, getGeneratorCost, type PlayerState } from "../../src/game";
import type { StorageAdapter } from "../../src/adapters/StorageAdapter";

const NOW = 1_700_000_000_000;

class TestStorage implements StorageAdapter {
  loadCalls = 0;
  rawLoadCalls = 0;
  saveCalls = 0;
  rawSaveCalls = 0;
  rawBackups = new Map<string, string>();
  raw: string | null;

  constructor(
    public state: PlayerState | null = null,
    raw?: string | null,
  ) {
    this.raw = raw ?? (state ? JSON.stringify(state) : null);
  }

  async load(): Promise<unknown | null> {
    this.loadCalls += 1;
    return this.raw ? (JSON.parse(this.raw) as unknown) : null;
  }

  async save(_identifier: string, state: PlayerState): Promise<void> {
    this.saveCalls += 1;
    this.state = structuredClone(state);
    this.raw = JSON.stringify(state);
  }

  async loadRaw(): Promise<string | null> {
    this.rawLoadCalls += 1;
    return this.raw;
  }

  async saveRaw(identifier: string, raw: string): Promise<void> {
    this.rawSaveCalls += 1;
    this.rawBackups.set(identifier, raw);
  }
}

function serviceWith(storage: TestStorage, now = NOW): GameService {
  return new GameService({
    storage,
    now: () => now,
    playerId: "test-player",
  });
}

describe("GameService", () => {
  it("creates an initial state when no save exists", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage);

    const result = await service.loadGame();

    expect(result.createdNewState).toBe(true);
    expect(result.state.playerId).toBe("test-player");
    expect(result.state.createdAt).toBe(NOW);
    expect(storage.saveCalls).toBe(1);
  });

  it("maps generator levels to visual building tiers for the UI", () => {
    const service = serviceWith(new TestStorage());

    for (const [level, expectedTier] of [
      [0, 0],
      [1, 1],
      [4, 1],
      [5, 2],
      [9, 2],
      [10, 3],
      [24, 3],
      [25, 4],
    ] as const) {
      const state = createInitialState(gameConfig, NOW, "visual-tier-player");
      const view = service.getView({
        ...state,
        generators: {
          ...state.generators,
          kiosk: { id: "kiosk", level },
        },
      });

      expect(view.buildings.find((building) => building.id === "kiosk")?.visualTier).toBe(expectedTier);
    }
  });

  it("loads an existing save", async () => {
    const saved = createInitialState(gameConfig, NOW, "saved-player");
    const storage = new TestStorage(saved);
    const service = serviceWith(storage, NOW);

    const result = await service.loadGame();

    expect(result.createdNewState).toBe(false);
    expect(result.state.playerId).toBe("saved-player");
    expect(result.state.createdAt).toBe(NOW);
  });

  it("backs up saves without schemaVersion and starts fresh", async () => {
    const invalidRaw = JSON.stringify({
      credits: 25,
      lifetimeCredits: 25,
      generators: { kiosk: 1 },
      lastUpdated: NOW,
    });
    const storage = new TestStorage(null, invalidRaw);
    const service = serviceWith(storage, NOW + 10_000);

    const result = await service.loadGame();

    expect(result.createdNewState).toBe(true);
    expect(result.warningMessage).toContain("Save has no schemaVersion.");
    expect(result.state.playerId).toBe("test-player");
    expect(result.state.generators.kiosk.level).toBe(1);
    expect(storage.rawBackups.get(CORRUPT_SAVE_BACKUP_IDENTIFIER)).toBe(invalidRaw);
    expect(storage.saveCalls).toBe(1);
    expect(storage.state?.schemaVersion).toBe(3);
  });

  it("backs up unparseable saves and starts fresh", async () => {
    const corruptRaw = "{not-json";
    const storage = new TestStorage(null, corruptRaw);
    const service = serviceWith(storage, NOW);

    const result = await service.loadGame();

    expect(result.createdNewState).toBe(true);
    expect(result.warningMessage).toBe("Lokaler Spielstand war nicht lesbar und wurde neu erstellt.");
    expect(result.state.playerId).toBe("test-player");
    expect(storage.rawBackups.get(CORRUPT_SAVE_BACKUP_IDENTIFIER)).toBe(corruptRaw);
    expect(storage.saveCalls).toBe(1);
  });

  it("applies offline progress while loading and saves the progressed state", async () => {
    const saved = {
      ...createInitialState(gameConfig, NOW, "saved-player"),
      credits: 0,
      totalEarned: 0,
      generators: {
        ...createInitialState(gameConfig, NOW).generators,
        kiosk: { id: "kiosk", level: 1 },
      },
    };
    const storage = new TestStorage(saved);
    const service = serviceWith(storage, NOW + 10_000);

    const result = await service.loadGame();

    expect(result.offlineCredits).toBe(1);
    expect(result.state.credits).toBe(0);
    expect(result.state.pendingRevenue).toBe(1);
    expect(result.state.lastUpdated).toBe(NOW + 10_000);
    expect(storage.state?.credits).toBe(0);
    expect(storage.state?.pendingRevenue).toBe(1);
  });

  it("reports the 8-hour offline cap while loading", async () => {
    const saved = {
      ...createInitialState(gameConfig, NOW, "saved-player"),
      credits: 0,
      totalEarned: 0,
      generators: {
        ...createInitialState(gameConfig, NOW).generators,
        kiosk: { id: "kiosk", level: 1 },
      },
    };
    const storage = new TestStorage(saved);
    const service = serviceWith(storage, NOW + gameConfig.offlineCapMs * 2);

    const result = await service.loadGame();

    expect(result.offlineCapped).toBe(true);
    expect(result.offlineElapsedMs).toBe(gameConfig.offlineCapMs * 2);
    expect(result.offlineAppliedMs).toBe(gameConfig.offlineCapMs);
    expect(result.offlineCredits).toBe(0.1 * (gameConfig.offlineCapMs / 1000));
  });

  it("backs up future-dated saves before recovering a playable state", async () => {
    const saved = {
      ...createInitialState(gameConfig, NOW + 10_000, "saved-player"),
      credits: 50,
    };
    const storage = new TestStorage(saved);
    const service = serviceWith(storage, NOW);

    const result = await service.loadGame();

    expect(result.warningMessage).toContain("in the future");
    expect(result.state.lastUpdated).toBe(NOW);
    expect(storage.saveCalls).toBe(1);
    expect(storage.rawBackups.get(CORRUPT_SAVE_BACKUP_IDENTIFIER)).toBe(JSON.stringify(saved));
  });

  it("saves after a successful action", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage);
    const loaded = await service.loadGame();

    const result = await service.buyGenerator(loaded.state, "kiosk");

    expect(result.ok).toBe(true);
    expect(storage.saveCalls).toBe(2);
    expect(storage.state?.generators.kiosk.level).toBe(2);
  });

  it("saves after a successful collect and moves pending revenue into credits", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage, NOW + 10_000);
    const state = createInitialState(gameConfig, NOW, "test-player");

    const result = await service.collectRevenue(state);

    expect(result.ok).toBe(true);
    expect(result.state.credits).toBeGreaterThan(state.credits);
    expect(result.state.pendingRevenue).toBe(0);
    expect(result.state.totalCollected).toBeGreaterThan(state.totalCollected);
    expect(storage.saveCalls).toBe(1);
    expect(storage.state?.credits).toBe(result.state.credits);
    expect(storage.state?.pendingRevenue).toBe(0);
  });

  it("does not save after a failed action", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage);
    const state = {
      ...createInitialState(gameConfig, NOW, "test-player"),
      credits: 0,
    };

    const result = await service.buyGenerator(state, "kiosk");

    expect(result.ok).toBe(false);
    expect(storage.saveCalls).toBe(0);
    expect(storage.state).toBeNull();
  });

  it("does not save after a failed collect", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage, NOW);
    const state = {
      ...createInitialState(gameConfig, NOW + 10_000, "test-player"),
      credits: 50,
      pendingRevenue: 10,
    };

    const result = await service.collectRevenue(state);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(storage.saveCalls).toBe(0);
    expect(storage.state).toBeNull();
  });

  it("exposes progression hints and disabled reasons from the view model", () => {
    const service = serviceWith(new TestStorage());
    const state = {
      ...createInitialState(gameConfig, NOW, "test-player"),
      credits: 0,
    };

    const view = service.getView(state);

    expect(view.progressionHint.title).toBe("Schalte die Werkstatt frei");
    expect(view.progressionHint.targetType).toBe("generator");
    expect(view.progressionHint.targetId).toBe("kiosk");
    expect(view.progressionHint.progressLabel).toContain("Level 1 /");
    expect(view.generators[0].disabledReason).toBe("Nicht genug credits");
    expect(view.upgrades[0].disabledReason).toBe("Noch gesperrt");
    expect(view.managers[0].disabledReason).toBe("Noch gesperrt");
    expect(view.generators[1].unlockHint).toContain(
      `Level ${gameConfig.generators[1].unlockRequirement?.generatorCount}`,
    );
    expect(view.generators[1].unlockHint).toContain(gameConfig.generators[0].name);
    expect(view.generators[0].unlockHint).toBeUndefined();
    const unlockedState = {
      ...state,
      generators: {
        ...state.generators,
        kiosk: { id: "kiosk", level: gameConfig.generators[1].unlockRequirement?.generatorCount ?? 1 },
      },
    };
    expect(service.getView(unlockedState).generators[1].unlockHint).toBeUndefined();
    expect(service.getView(unlockedState).progressionHint.targetId).toBe("workshop");
    expect(service.getView(unlockedState).progressionHint.title).toBe("Eröffne deine Werkstatt");
    expect(view.businessMilestones[0]).toMatchObject({
      id: "first_kiosk",
      achieved: true,
    });
    expect(view.reputation.nextTierName).toBe(gameConfig.reputationTiers[1].name);
    expect(view.reputation.nextTierMissingCredits).toBe(
      gameConfig.reputationTiers[1].requiredLifetimeCredits - state.totalEarned,
    );
  });

  it("delivers the next objective from the view model", () => {
    const service = serviceWith(new TestStorage());
    const state = createInitialState(gameConfig, NOW, "test-player");

    const view = service.getView(state);

    expect(view.progressionHint).toMatchObject({
      title: "Schalte die Werkstatt frei",
      targetType: "generator",
      targetId: "kiosk",
    });
    expect(view.progressionHint.progressLabel).toContain("Level 1 /");
  });

  it("uses core and config values for economy view model data", () => {
    const service = serviceWith(new TestStorage());
    const state = createInitialState(gameConfig, NOW, "test-player");

    const view = service.getView(state);
    const kiosk = view.generators.find((generator) => generator.id === "kiosk");
    const kioskBuilding = view.buildings.find((building) => building.id === "kiosk");

    expect(view.snapshot.rates).toEqual(calculateRates(view.snapshot.previewState, gameConfig));
    expect(view.credits).toBe(view.snapshot.credits);
    expect(view.pendingRevenue).toBe(view.snapshot.pendingRevenue);
    expect(view.collectableAmount).toBe(view.snapshot.collectableAmount);
    expect(view.incomePerSecond).toBe(view.snapshot.incomePerSecond);
    expect(view.totalEarned).toBe(view.snapshot.totalEarned);
    expect(view.totalCollected).toBe(view.snapshot.totalCollected);
    expect(view.collectFillPercent).toBeGreaterThanOrEqual(0);
    expect(view.collectButtonState).toBe(view.snapshot.collectButtonState);
    expect(view.activeObjective).toBe(view.progressionHint);
    expect(view.milestones).toBe(view.businessMilestones);
    expect(kiosk?.cost).toBe(getGeneratorCost(gameConfig, view.snapshot.previewState, "kiosk"));
    expect(kiosk?.cost).toBe(view.snapshot.nextGeneratorCosts.kiosk);
    expect(kioskBuilding).toMatchObject({
      id: "kiosk",
      name: kiosk?.name,
      level: kiosk?.level,
      unlocked: true,
      affordable: kiosk?.canBuy,
      income: kiosk?.incomePerSecond,
      nextCost: kiosk?.cost,
      status: "aktiv",
      hasManager: kiosk?.managerHired,
      upgradeCount: kiosk?.purchasedUpgradeCount,
    });
    expect(view.upgrades[0].cost).toBe(gameConfig.upgrades[0].cost);
    expect(view.managers[0].cost).toBe(gameConfig.managers[0].cost);
  });

  it("exposes completed upgrade and manager disabled reasons", () => {
    const service = serviceWith(new TestStorage());
    const state = {
      ...createInitialState(gameConfig, NOW, "test-player"),
      credits: 10_000,
      generators: {
        ...createInitialState(gameConfig, NOW).generators,
        kiosk: { id: "kiosk", level: 5, purchasedAt: NOW },
      },
      upgrades: {
        ...createInitialState(gameConfig, NOW).upgrades,
        better_shelves: { id: "better_shelves", purchased: true, purchasedAt: NOW },
      },
      managers: {
        ...createInitialState(gameConfig, NOW).managers,
        kiosk_manager: { id: "kiosk_manager", hired: true, hiredAt: NOW },
      },
    };

    const view = service.getView(state);

    expect(view.upgrades.find((upgrade) => upgrade.id === "better_shelves")?.disabledReason).toBe("Bereits gekauft");
    expect(view.managers.find((manager) => manager.id === "kiosk_manager")?.disabledReason).toBe("Bereits eingestellt");
  });

  it("imports valid save JSON through migration and persists it", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage, NOW + 10_000);
    const currentState = createInitialState(gameConfig, NOW, "current-player");
    const importedState = {
      ...createInitialState(gameConfig, NOW, "imported-player"),
      credits: 50,
      generators: {
        ...createInitialState(gameConfig, NOW).generators,
        kiosk: { id: "kiosk", level: 1 },
      },
    };

    const result = await service.importSaveJson(currentState, JSON.stringify(importedState));

    expect(result.ok).toBe(true);
    expect(result.state.playerId).toBe("imported-player");
    expect(result.state.schemaVersion).toBe(3);
    expect(result.state.credits).toBe(50);
    expect(result.state.pendingRevenue).toBe(1);
    expect(storage.saveCalls).toBe(1);
    expect(storage.state?.playerId).toBe("imported-player");
  });

  it("exports save JSON with schemaVersion", () => {
    const service = serviceWith(new TestStorage());
    const state = createInitialState(gameConfig, NOW, "export-player");

    const exported = service.exportSave(state);
    const parsed = JSON.parse(exported) as PlayerState;

    expect(parsed.playerId).toBe("export-player");
    expect(parsed.schemaVersion).toBe(3);
  });

  it("builds live view snapshots without reading or writing storage", () => {
    const storage = new TestStorage();
    const service = serviceWith(storage, NOW + 5_000);
    const state = createInitialState(gameConfig, NOW, "live-player");

    const view = service.getView(state);

    expect(view.snapshot.previewState.credits).toBe(state.credits);
    expect(view.snapshot.previewState.pendingRevenue).toBeGreaterThan(state.pendingRevenue);
    expect(view.snapshot.collectableAmount).toBe(view.snapshot.previewState.pendingRevenue);
    expect(storage.loadCalls).toBe(0);
    expect(storage.rawLoadCalls).toBe(0);
    expect(storage.saveCalls).toBe(0);
    expect(storage.rawSaveCalls).toBe(0);
  });

  it("does not persist invalid imported JSON", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage);
    const currentState = createInitialState(gameConfig, NOW, "current-player");

    const result = await service.importSaveJson(currentState, "{bad-json");

    expect(result.ok).toBe(false);
    expect(result.state).toBe(currentState);
    expect(result.message).toBe("Import ist kein gültiges JSON.");
    expect(storage.saveCalls).toBe(0);
    expect(storage.state).toBeNull();
  });

  it("does not crash or persist structurally invalid imported saves", async () => {
    const storage = new TestStorage();
    const service = serviceWith(storage);
    const currentState = createInitialState(gameConfig, NOW, "current-player");

    const result = await service.importSaveJson(currentState, JSON.stringify({ schemaVersion: 1, credits: "broken" }));

    expect(result.ok).toBe(false);
    expect(result.state).toBe(currentState);
    expect(result.message).toContain("Import ist kein");
    expect(storage.saveCalls).toBe(0);
    expect(storage.state).toBeNull();
  });

  it("surfaces invalid configuration while core checks still guard actions", () => {
    const config = structuredClone(gameConfig);
    config.generators[0] = { ...config.generators[0], baseCost: -1 };
    config.upgrades[0] = { ...config.upgrades[0], cost: -1 };
    config.managers[0] = { ...config.managers[0], cost: -1 };
    const service = new GameService({
      config,
      storage: new TestStorage(),
      now: () => NOW,
    });

    const state = createInitialState(config, NOW, "test-player");
    expect(service.getView(state).progressionHint.title).toBe("Config pruefen");
  });
});
