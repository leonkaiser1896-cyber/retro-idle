import { describe, expect, it } from "vitest";
import { gameConfig } from "../../src/config/gameConfig";
import { buyGenerator, claimProgress, collectRevenue, getGameSnapshot, hireManager } from "../../src/game";
import { richState, NOW } from "./testUtils";

describe("lazy progress", () => {
  it("snapshot previews progress without mutating state or updating lastUpdated", () => {
    const state = richState({
      credits: 0,
      pendingRevenue: 0,
      totalEarned: 0,
      totalCollected: 0,
      generators: {
        kiosk: { id: "kiosk", level: 1 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });
    const before = structuredClone(state);

    const snapshot = getGameSnapshot(state, gameConfig, NOW + 10_000);

    expect(snapshot.previewState.credits).toBe(0);
    expect(snapshot.previewState.pendingRevenue).toBe(1);
    expect(snapshot.previewState.totalEarned).toBe(1);
    expect(snapshot.credits).toBe(0);
    expect(snapshot.pendingRevenue).toBe(1);
    expect(snapshot.incomePerSecond).toBe(0.1);
    expect(snapshot.totalEarned).toBe(1);
    expect(snapshot.totalCollected).toBe(0);
    expect(snapshot.collectableAmount).toBe(1);
    expect(snapshot.collectButtonState).toEqual({ enabled: true, label: "Einsammeln" });
    expect(snapshot.state).toBe(state);
    expect(state).toEqual(before);
    expect(state.lastUpdated).toBe(NOW);
  });

  it("snapshot returns disabled collect button state when no revenue is collectable", () => {
    const state = richState({
      credits: 10,
      pendingRevenue: 0,
      totalEarned: 0,
      totalCollected: 0,
      generators: {
        kiosk: { id: "kiosk", level: 0 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });

    const snapshot = getGameSnapshot(state, gameConfig, NOW);

    expect(snapshot.collectableAmount).toBe(0);
    expect(snapshot.collectButtonState).toEqual({
      enabled: false,
      label: "Einsammeln",
      disabledReason: "Keine offenen Einnahmen",
    });
  });

  it("claim applies progress and returns a new state", () => {
    const state = richState({
      credits: 0,
      pendingRevenue: 0,
      totalEarned: 0,
      totalCollected: 0,
      generators: {
        kiosk: { id: "kiosk", level: 1 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });

    const result = claimProgress(state, gameConfig, NOW + 10_000);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state).not.toBe(state);
    expect(result.state.credits).toBe(1);
    expect(result.state.pendingRevenue).toBe(0);
    expect(result.state.totalEarned).toBe(1);
    expect(result.state.totalCollected).toBe(1);
    expect(result.state.lastCollectedAt).toBe(NOW + 10_000);
    expect(result.data?.creditsCollected).toBe(1);
    expect(result.state.lastUpdated).toBe(NOW + 10_000);
    expect(state.credits).toBe(0);
    expect(state.pendingRevenue).toBe(0);
    expect(state.totalCollected).toBe(0);
    expect(state.lastUpdated).toBe(NOW);
  });

  it("collectRevenue is the explicit collect API and does not use client-provided rewards", () => {
    const state = richState({
      credits: 10,
      pendingRevenue: 5,
      totalEarned: 5,
      totalCollected: 0,
      generators: {
        kiosk: { id: "kiosk", level: 1 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });

    const result = collectRevenue(state, gameConfig, NOW + 10_000);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.credits).toBe(16);
    expect(result.state.pendingRevenue).toBe(0);
    expect(result.state.totalEarned).toBe(6);
    expect(result.state.totalCollected).toBe(6);
    expect(result.state.lastCollectedAt).toBe(NOW + 10_000);
    expect(state.credits).toBe(10);
    expect(state.pendingRevenue).toBe(5);
  });

  it("actions apply lazy progress into pending revenue before buying", () => {
    const state = richState({
      credits: 12,
      generators: {
        kiosk: { id: "kiosk", level: 1 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });

    const result = buyGenerator(state, gameConfig, "kiosk", NOW + 10_000);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.state.lastUpdated).toBe(NOW + 10_000);
    expect(result.state.pendingRevenue).toBe(1);
    expect(result.state.generators.kiosk.level).toBe(2);
    expect(state.generators.kiosk.level).toBe(1);
  });

  it("pending revenue is not spendable for purchases until collected", () => {
    const state = richState({
      credits: 0,
      pendingRevenue: 10_000,
      totalEarned: 10_000,
      totalCollected: 0,
      generators: {
        kiosk: { id: "kiosk", level: 1 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });

    const result = buyGenerator(state, gameConfig, "kiosk", NOW);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_ENOUGH_CREDITS");
    }
    expect(state.credits).toBe(0);
    expect(state.pendingRevenue).toBe(10_000);
  });

  it("manager automation does not convert produced revenue directly into credits", () => {
    const state = richState({
      credits: 10_000,
      pendingRevenue: 0,
      totalEarned: 0,
      totalCollected: 0,
      generators: {
        kiosk: { id: "kiosk", level: 10 },
        workshop: { id: "workshop", level: 0 },
        logistics: { id: "logistics", level: 0 },
        club: { id: "club", level: 0 },
        company: { id: "company", level: 0 },
      },
      lastUpdated: NOW,
    });
    const hired = hireManager(state, gameConfig, "kiosk_manager", NOW);
    expect(hired.ok).toBe(true);
    if (!hired.ok) {
      return;
    }

    const snapshot = getGameSnapshot(hired.state, gameConfig, NOW + 10_000);

    expect(snapshot.automation.kiosk).toBe(true);
    expect(snapshot.credits).toBe(hired.state.credits);
    expect(snapshot.pendingRevenue).toBeGreaterThan(0);
    expect(snapshot.totalCollected).toBe(0);
    expect(hired.state.pendingRevenue).toBe(0);
  });
});
