import type { PlayerState } from "../game";

export interface StorageAdapter {
  load(identifier: string): Promise<unknown | null>;
  save(identifier: string, state: PlayerState): Promise<void>;
  loadRaw?(identifier: string): Promise<string | null>;
  saveRaw?(identifier: string, raw: string): Promise<void>;
}
