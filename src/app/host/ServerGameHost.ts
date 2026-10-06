import type {
  GameHost,
  GameHostAction,
  GameHostActionResult,
  GameHostLoadResult,
  GameHostSnapshotResult,
} from "./GameHost";

export class ServerGameHost implements GameHost {
  readonly mode = "server" as const;
  readonly supportsLocalLiveSnapshots = true;
  readonly snapshotIntervalMs = 1000;
  private loadPromise: Promise<GameHostLoadResult> | undefined;

  private async request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers: { "X-Retro-Idle": "1", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Server request failed.");
    return response.json() as Promise<T>;
  }

  load(): Promise<GameHostLoadResult> {
    this.loadPromise ??= this.request<GameHostLoadResult>("load", {}).finally(() => {
      this.loadPromise = undefined;
    });
    return this.loadPromise;
  }
  getSnapshot(): Promise<GameHostSnapshotResult> {
    return this.request("snapshot");
  }
  dispatchAction(action: GameHostAction): Promise<GameHostActionResult> {
    return this.request("action", action);
  }
  resetLocalSave(): Promise<GameHostActionResult> {
    return this.request("reset", {});
  }
  async exportSave(): Promise<string> {
    return (await this.request<{ backup: string }>("export", {})).backup;
  }
  importSave(raw: string): Promise<GameHostActionResult> {
    return this.request("import", { backup: raw });
  }
}
