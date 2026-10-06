import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { GameService, DEFAULT_SAVE_IDENTIFIER } from "../src/app/GameService";
import type { GameHostAction } from "../src/app/host/GameHost";
import { gameConfig } from "../src/config/gameConfig";
import { migratePlayerState, applyOfflineProgress } from "../src/game";
import { ServerStore } from "./store";

class HttpError extends Error {
  constructor(readonly status: number) {
    super("Request rejected.");
  }
}

async function readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (request.headers["content-type"] !== "application/json") throw new HttpError(415);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_100_000) throw new HttpError(413);
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new HttpError(400);
  }
}

function actionFrom(body: Record<string, unknown>): GameHostAction {
  if (body.type === "collect" && Object.keys(body).length === 1) return { type: "collect" };
  const fields = { buy_generator: "generatorId", buy_upgrade: "upgradeId", hire_manager: "managerId" } as const;
  if (typeof body.type !== "string" || !Object.hasOwn(fields, body.type) || Object.keys(body).length !== 2)
    throw new HttpError(400);
  const payload = body.payload;
  const field = fields[body.type as keyof typeof fields];
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length !== 1)
    throw new HttpError(400);
  const id = (payload as Record<string, unknown>)[field];
  if (typeof id !== "string" || id.length > 100) throw new HttpError(400);
  return { type: body.type, payload: { [field]: id } } as GameHostAction;
}

export function createGameServer(options: { directory: string; origin: string | (() => string); dist?: string }) {
  const store = new ServerStore(options.directory);
  const tails = new Map<string, Promise<unknown>>();
  const limits = new Map<string, { expires: number; count: number }>();
  const serialize = async <T>(id: string, operation: () => Promise<T>): Promise<T> => {
    const next = (tails.get(id) ?? Promise.resolve()).catch(() => undefined).then(operation);
    tails.set(id, next);
    try {
      return await next;
    } finally {
      if (tails.get(id) === next) tails.delete(id);
    }
  };
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, limit] of limits) if (limit.expires < now) limits.delete(key);
    store.db.prepare("DELETE FROM backups WHERE expires<?").run(now);
  }, 60_000);
  cleanup.unref();
  const json = (response: ServerResponse, status: number, value: unknown) => {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(value));
  };
  const server = createServer(async (request, response) => {
    const origin = new URL(typeof options.origin === "function" ? options.origin() : options.origin);
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    try {
      if (request.headers.host !== origin.host) throw new HttpError(403);
      const path = new URL(request.url ?? "/", origin).pathname;
      if (!path.startsWith("/api/")) {
        if (!options.dist || request.method !== "GET") throw new HttpError(404);
        const root = resolve(options.dist);
        const file = resolve(root, `.${decodeURIComponent(path === "/" ? "/index.html" : path)}`);
        if (!file.startsWith(root + sep)) throw new HttpError(404);
        try {
          if (!(await stat(file)).isFile()) throw new HttpError(404);
          const types: Record<string, string> = {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".json": "application/json",
          };
          response.writeHead(200, {
            "Content-Type": `${types[extname(file)] ?? "application/octet-stream"}; charset=utf-8`,
          });
          response.end(await readFile(file));
          return;
        } catch {
          throw new HttpError(404);
        }
      }
      if (
        request.headers["x-retro-idle"] !== "1" ||
        (request.headers.origin && request.headers.origin !== origin.origin)
      )
        throw new HttpError(403);
      if (request.headers["sec-fetch-site"] === "cross-site") throw new HttpError(403);
      const now = Date.now();
      const ip = request.socket.remoteAddress ?? "unknown";
      let limit = limits.get(ip);
      if (!limit || limit.expires <= now) {
        limit = { expires: now + 60_000, count: 0 };
        limits.set(ip, limit);
      }
      if (++limit.count > 300) throw new HttpError(429);
      if (path === "/api/health" && request.method === "GET") {
        json(response, 200, { ok: true });
        return;
      }
      const routes = new Set(["/api/load", "/api/action", "/api/reset", "/api/export", "/api/import", "/api/snapshot"]);
      if (!routes.has(path) || request.method !== (path === "/api/snapshot" ? "GET" : "POST")) throw new HttpError(404);
      const body = request.method === "POST" ? await readBody(request) : {};
      const token = request.headers.cookie
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("retro_idle_session="))
        ?.slice("retro_idle_session=".length);
      const session = store.session(token);
      if (session.token)
        response.setHeader(
          "Set-Cookie",
          `retro_idle_session=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${origin.protocol === "https:" ? "; Secure" : ""}`,
        );
      const result = await serialize(session.id, async () => {
        const storage = store.storage(session.id);
        // Fail closed before GameService can recover unreadable local storage.
        const raw = await storage.loadRaw!(DEFAULT_SAVE_IDENTIFIER);
        const service = new GameService({ storage, playerId: session.id });
        if (path === "/api/snapshot" && raw) {
          const migration = migratePlayerState(JSON.parse(raw), gameConfig, Date.now(), session.id);
          if (!migration.ok) throw new Error("Stored state invalid.");
          return { state: migration.state, view: service.getView(migration.state) };
        }
        const loaded = await service.loadGame();
        if (loaded.view.persistenceWarning) throw new Error("Persistence failed.");
        if (path === "/api/load" || path === "/api/snapshot") return loaded;
        if (path === "/api/export") {
          const id = randomUUID();
          const expires = Date.now() + 30 * 86400_000;
          store.db.prepare("INSERT INTO backups(id,owner,expires) VALUES(?,?,?)").run(id, session.id, expires);
          return {
            backup: store.cipher.seal({ id, owner: session.id, expires, state: loaded.state }, `backup:${session.id}`),
          };
        }
        if (path === "/api/import") {
          if (typeof body.backup !== "string") throw new HttpError(400);
          let backup: { id: string; owner: string; expires: number; state: unknown };
          try {
            backup = store.cipher.open(body.backup, `backup:${session.id}`) as typeof backup;
          } catch {
            throw new HttpError(400);
          }
          if (backup.owner !== session.id || backup.expires < Date.now()) throw new HttpError(400);
          const entry = store.db
            .prepare("SELECT id FROM backups WHERE id=? AND owner=? AND used=0 AND expires>?")
            .get(backup.id, session.id, Date.now());
          if (!entry) throw new HttpError(409);
          store.db.exec("BEGIN IMMEDIATE");
          try {
            const migrated = migratePlayerState(backup.state, gameConfig, Date.now(), session.id);
            if (!migrated.ok || migrated.state.playerId !== session.id) throw new HttpError(400);
            const progressed = applyOfflineProgress(migrated.state, gameConfig, Date.now());
            if (!progressed.ok) throw new HttpError(400);
            store.writeRaw(session.id, DEFAULT_SAVE_IDENTIFIER, JSON.stringify(progressed.state));
            const imported = {
              ok: true,
              state: progressed.state,
              view: service.getView(progressed.state),
              message: "Verschlüsselte Sicherung wiederhergestellt.",
            };
            store.db.prepare("UPDATE backups SET used=1 WHERE id=?").run(backup.id);
            store.db.exec("COMMIT");
            return imported;
          } catch (error) {
            store.db.exec("ROLLBACK");
            throw error;
          }
        }
        if (path === "/api/reset") {
          const reset = await service.resetLocalSave();
          if (reset.view.persistenceWarning) throw new Error("Persistence failed.");
          return reset;
        }
        const action = actionFrom(body);
        const actions = {
          collect: () => service.collectRevenue(loaded.state),
          buy_generator: () =>
            service.buyGenerator(
              loaded.state,
              (action as Extract<GameHostAction, { type: "buy_generator" }>).payload.generatorId,
            ),
          buy_upgrade: () =>
            service.buyUpgrade(
              loaded.state,
              (action as Extract<GameHostAction, { type: "buy_upgrade" }>).payload.upgradeId,
            ),
          hire_manager: () =>
            service.hireManager(
              loaded.state,
              (action as Extract<GameHostAction, { type: "hire_manager" }>).payload.managerId,
            ),
        };
        const acted = await actions[action.type]();
        if (acted.view.persistenceWarning) throw new Error("Persistence failed.");
        return acted;
      });
      json(response, 200, result);
    } catch (error) {
      if (!response.headersSent)
        json(response, error instanceof HttpError ? error.status : 500, {
          error: "Anfrage abgelehnt oder Spielstand nicht verfügbar.",
        });
      else response.end();
      if (!(error instanceof HttpError))
        console.error("Game server operation failed; inspect server storage and configuration.");
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.on("close", () => {
    clearInterval(cleanup);
    store.close();
  });
  return server;
}
