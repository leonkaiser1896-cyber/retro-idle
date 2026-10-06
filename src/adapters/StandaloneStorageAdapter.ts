import type { PlayerState } from "../game";
import type { StorageAdapter } from "./StorageAdapter";

export class StandaloneStorageAdapter implements StorageAdapter {
  constructor(private readonly prefix = "") {}

  async load(identifier: string): Promise<unknown | null> {
    const raw = await this.loadRaw(identifier);
    return raw ? (JSON.parse(raw) as PlayerState) : null;
  }

  async save(identifier: string, state: PlayerState): Promise<void> {
    await this.saveRaw(identifier, JSON.stringify(state));
  }

  async loadRaw(identifier: string): Promise<string | null> {
    const storage = globalThis.localStorage;
    return storage.getItem(this.key(identifier));
  }

  async saveRaw(identifier: string, raw: string): Promise<void> {
    const storage = globalThis.localStorage;
    storage.setItem(this.key(identifier), raw);
  }

  private key(identifier: string): string {
    return this.prefix ? `${this.prefix}:${identifier}` : identifier;
  }
}
