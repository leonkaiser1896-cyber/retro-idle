import { describe, expect, it } from "vitest";
import { GameService } from "../../../src/app/GameService";
import { StandaloneGameHost } from "../../../src/app/host/StandaloneGameHost";
import { InMemoryStorageAdapter } from "../../../src/adapters/InMemoryStorageAdapter";
import { gameConfig } from "../../../src/config/gameConfig";

const NOW = 1_700_000_000_000;

describe("StandaloneGameHost", () => {
  it("serializes simultaneous purchases against the latest balance", async () => {
    const host = new StandaloneGameHost(new GameService({ storage: new InMemoryStorageAdapter(), now: () => NOW }));
    await host.load();
    const results = await Promise.all([
      host.dispatchAction({ type: "buy_generator", payload: { generatorId: "kiosk" } }),
      host.dispatchAction({ type: "buy_generator", payload: { generatorId: "kiosk" } }),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    const snapshot = await host.getSnapshot();
    expect(snapshot.state!.generators.kiosk.level).toBe(3);
    expect(snapshot.state!.credits).toBeLessThan(results[0].state!.credits);
  });
  it("loads through GameService and returns live snapshots without changing host type", async () => {
    let now = NOW;
    const service = new GameService({
      storage: new InMemoryStorageAdapter(),
      config: gameConfig,
      now: () => now,
    });
    const host = new StandaloneGameHost(service);

    const loaded = await host.load();
    now += 5_000;
    const snapshot = await host.getSnapshot();

    expect(host.mode).toBe("standalone");
    expect(snapshot.state).toBe(loaded.state);
    expect(snapshot.view.snapshot.previewState.credits).toBe(loaded.state.credits);
    expect(snapshot.view.snapshot.previewState.pendingRevenue).toBeGreaterThan(loaded.state.pendingRevenue);
  });

  it("live snapshots show pending revenue without auto-collecting credits or saving", async () => {
    let now = NOW;
    const storage = new InMemoryStorageAdapter();
    const service = new GameService({
      storage,
      config: gameConfig,
      now: () => now,
    });
    const host = new StandaloneGameHost(service);

    const loaded = await host.load();
    now += 10_000;
    const snapshot = await host.getSnapshot();
    const stored = await storage.load("retro_idle_save_v1");

    expect(snapshot.state).toBe(loaded.state);
    expect(snapshot.view.snapshot.credits).toBe(loaded.state.credits);
    expect(snapshot.view.snapshot.pendingRevenue).toBeGreaterThan(loaded.state.pendingRevenue);
    expect(snapshot.view.snapshot.collectableAmount).toBe(snapshot.view.snapshot.pendingRevenue);
    expect(stored).toEqual(loaded.state);
  });

  it("dispatches actions through the standalone service", async () => {
    const service = new GameService({
      storage: new InMemoryStorageAdapter(),
      config: gameConfig,
      now: () => NOW,
    });
    const host = new StandaloneGameHost(service);

    await host.load();
    const result = await host.dispatchAction({ type: "buy_generator", payload: { generatorId: "kiosk" } });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("Generator gekauft");
  });
});
