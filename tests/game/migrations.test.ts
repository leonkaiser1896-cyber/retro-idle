import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { createInitialState, CURRENT_SAVE_SCHEMA_VERSION, migratePlayerState } from "../../src/game";
import { NOW } from "./testUtils";

describe("migratePlayerState", () => {
  it.each([1e308, -1, Number.MAX_SAFE_INTEGER])("rejects unsupported currency %s", (credits) => {
    const save = { ...createInitialState(gameConfig, NOW), credits };
    expect(migratePlayerState(save, gameConfig, NOW, "fallback").ok).toBe(false);
  });

  it("rejects unsafe generator levels and forged IDs", () => {
    const save = createInitialState(gameConfig, NOW);
    save.generators.kiosk.level = Number.MAX_SAFE_INTEGER;
    expect(migratePlayerState(save, gameConfig, NOW, "fallback").ok).toBe(false);
    save.generators.kiosk = { id: "forged", level: 1 };
    expect(migratePlayerState(save, gameConfig, NOW, "fallback").ok).toBe(false);
  });

  it("whitelists imported fields and preserves purchase metadata", () => {
    const save = JSON.parse(JSON.stringify(createInitialState(gameConfig, NOW)));
    save.generators.kiosk.purchasedAt = NOW;
    save.generators.kiosk.injected = "untrusted";
    save.injected = "untrusted";
    const result = migratePlayerState(save, gameConfig, NOW, "fallback");
    expect(result.ok).toBe(true);
    expect(result.state).not.toHaveProperty("injected");
    expect(result.state.generators.kiosk).not.toHaveProperty("injected");
    expect(result.state.generators.kiosk.purchasedAt).toBe(NOW);
  });
  it("accepts current schema saves as a no-op migration", () => {
    const save = {
      ...createInitialState(gameConfig, NOW - 1000, "saved-player"),
      credits: 123,
      totalEarned: 456,
      generators: {
        ...createInitialState(gameConfig, NOW).generators,
        kiosk: { id: "kiosk", level: 3, purchasedAt: NOW - 500 },
      },
    };

    const result = migratePlayerState(save, gameConfig, NOW, "fallback-player");

    expect(result.ok).toBe(true);
    expect(result.migrated).toBe(false);
    expect(result.fromVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(result.state.playerId).toBe("saved-player");
    expect(result.state.totalEarned).toBe(456);
    expect(result.state.totalCollected).toBe(0);
    expect(result.state.pendingRevenue).toBe(0);
    expect(result.state.generators.kiosk.level).toBe(3);
  });

  it("migrates schema v1 saves by adding pendingRevenue and totalCollected", () => {
    const save = {
      ...createInitialState(gameConfig, NOW - 1000, "saved-player"),
      schemaVersion: 1,
      credits: 123,
      totalEarned: 456,
    };
    const {
      pendingRevenue: _pendingRevenue,
      totalCollected: _totalCollected,
      lastCollectedAt: _lastCollectedAt,
      ...v1Save
    } = save;

    const result = migratePlayerState(v1Save, gameConfig, NOW, "fallback-player");

    expect(result.ok).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.state.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(result.state.pendingRevenue).toBe(0);
    expect(result.state.totalEarned).toBe(456);
    expect(result.state.totalCollected).toBe(456);
    expect(result.state.lastCollectedAt).toBeUndefined();
    expect(result.warnings).toContain("Save migrated from schemaVersion 1 to 3.");
  });

  it("migrates schema v2 saves by splitting produced and collected totals", () => {
    const save = {
      ...createInitialState(gameConfig, NOW - 1000, "saved-player"),
      schemaVersion: 2,
      credits: 123,
      pendingRevenue: 12,
      totalEarned: 456,
    };
    const { totalCollected: _totalCollected, lastCollectedAt: _lastCollectedAt, ...v2Save } = save;

    const result = migratePlayerState(v2Save, gameConfig, NOW, "fallback-player");

    expect(result.ok).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(2);
    expect(result.state.schemaVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(result.state.pendingRevenue).toBe(12);
    expect(result.state.totalEarned).toBe(468);
    expect(result.state.totalCollected).toBe(456);
    expect(result.state.lastCollectedAt).toBeUndefined();
    expect(result.warnings).toContain("Save migrated from schemaVersion 2 to 3.");
  });

  it("returns a fresh state for invalid save payloads", () => {
    const result = migratePlayerState("bad-save", gameConfig, NOW, "fallback-player");

    expect(result.ok).toBe(false);
    expect(result.state.playerId).toBe("fallback-player");
    expect(result.state.createdAt).toBe(NOW);
    expect(result.warnings).toContain("Save is not an object.");
  });

  it("rejects saves without schemaVersion", () => {
    const result = migratePlayerState({ credits: 25 }, gameConfig, NOW, "fallback-player");

    expect(result.ok).toBe(false);
    expect(result.fromVersion).toBeNull();
    expect(result.state.playerId).toBe("fallback-player");
    expect(result.warnings).toContain("Save has no schemaVersion.");
  });

  it("rejects unsupported schema versions", () => {
    const result = migratePlayerState({ schemaVersion: 999 }, gameConfig, NOW, "fallback-player");

    expect(result.ok).toBe(false);
    expect(result.fromVersion).toBe(999);
    expect(result.warnings).toContain("Unsupported save schemaVersion 999.");
  });

  it("rejects malformed current saves", () => {
    const save = {
      ...createInitialState(gameConfig, NOW, "saved-player"),
      credits: -1,
    };

    const result = migratePlayerState(save, gameConfig, NOW, "fallback-player");

    expect(result.ok).toBe(false);
    expect(result.fromVersion).toBe(CURRENT_SAVE_SCHEMA_VERSION);
    expect(result.warnings).toContain("Save credits is invalid.");
  });
});
