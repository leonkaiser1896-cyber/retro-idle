import type { PlayerState } from "../game";
import type { StorageAdapter } from "./StorageAdapter";

export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly states = new Map<string, PlayerState>();
  private readonly rawStates = new Map<string, string>();

  async load(identifier: string): Promise<unknown | null> {
    const state = this.states.get(identifier);
    return state ? structuredClone(state) : null;
  }

  async save(identifier: string, state: PlayerState): Promise<void> {
    this.states.set(identifier, structuredClone(state));
    this.rawStates.set(identifier, JSON.stringify(state));
  }

  async loadRaw(identifier: string): Promise<string | null> {
    return this.rawStates.get(identifier) ?? null;
  }

  async saveRaw(identifier: string, raw: string): Promise<void> {
    this.rawStates.set(identifier, raw);
  }
}
