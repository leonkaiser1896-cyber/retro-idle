import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { StorageAdapter } from "../src/adapters/StorageAdapter";
import type { PlayerState } from "../src/game";
import { SaveCipher } from "./saveCipher";

export class ServerStore {
  readonly db: DatabaseSync;
  readonly cipher: SaveCipher;

  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const keyPath = join(directory, "save-key.bin");
    const databasePath = join(directory, "game.sqlite");
    if (!existsSync(keyPath)) {
      if (existsSync(databasePath)) throw new Error("Encryption key missing; restore it from the server backup.");
      writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: "wx" });
    }
    this.cipher = new SaveCipher(readFileSync(keyPath));
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.db.exec(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS saves (owner TEXT NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(owner,name));
      CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);`);
  }

  session(token: string | undefined, now = Date.now()): { id: string; token?: string } {
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const id = hash(token);
      const row = this.db.prepare("SELECT id FROM sessions WHERE id=? AND expires>?").get(id, now);
      if (row) {
        this.db.prepare("UPDATE sessions SET expires=? WHERE id=?").run(now + 30 * 86400_000, id);
        return { id, token };
      }
    }
    const fresh = randomBytes(32).toString("hex");
    const id = hash(fresh);
    this.db.prepare("INSERT INTO sessions VALUES (?,?)").run(id, now + 30 * 86400_000);
    return { id, token: fresh };
  }

  storage(owner: string): StorageAdapter {
    const loadRaw = async (name: string): Promise<string | null> => {
      const row = this.db.prepare("SELECT data FROM saves WHERE owner=? AND name=?").get(owner, name);
      if (!row) return null;
      const value = this.cipher.open(String(row.data), `database:${owner}:${name}`);
      if (typeof value !== "string") throw new Error("Invalid stored save.");
      return value;
    };
    const saveRaw = async (name: string, raw: string): Promise<void> => {
      this.writeRaw(owner, name, raw);
    };
    return {
      loadRaw,
      saveRaw,
      load: async (name) => {
        const raw = await loadRaw(name);
        return raw ? JSON.parse(raw) : null;
      },
      save: async (name: string, state: PlayerState) => saveRaw(name, JSON.stringify(state)),
    };
  }

  writeRaw(owner: string, name: string, raw: string): void {
    const data = this.cipher.seal(raw, `database:${owner}:${name}`);
    this.db
      .prepare("INSERT INTO saves VALUES (?,?,?) ON CONFLICT(owner,name) DO UPDATE SET data=excluded.data")
      .run(owner, name, data);
  }

  close(): void {
    this.db.close();
  }
}
