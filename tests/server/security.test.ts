import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGameServer } from "../../server/app";
import { SaveCipher } from "../../server/saveCipher";

describe("encrypted saves", () => {
  it("roundtrips with random nonces and hides credits", () => {
    const cipher = new SaveCipher(randomBytes(32));
    const raw = cipher.seal({ credits: 1234 }, "owner");
    expect(raw).not.toContain("credits");
    expect(cipher.open(raw, "owner")).toEqual({ credits: 1234 });
    expect(cipher.seal({ credits: 1234 }, "owner")).not.toBe(raw);
  });
  it("rejects tampering, wrong keys, different owners and plaintext", () => {
    const cipher = new SaveCipher(randomBytes(32));
    const raw = cipher.seal({ credits: 1234 }, "owner");
    const changed = JSON.parse(raw);
    const bytes = Buffer.from(changed.data, "base64");
    bytes[0] ^= 1;
    changed.data = bytes.toString("base64");
    expect(() => cipher.open(JSON.stringify(changed), "owner")).toThrow();
    expect(() => new SaveCipher(randomBytes(32)).open(raw, "owner")).toThrow();
    expect(() => cipher.open(raw, "other-owner")).toThrow();
    expect(() => cipher.open('{"credits":99999}', "owner")).toThrow();
  });
});

describe("authoritative server", () => {
  let directory: string;
  let server: ReturnType<typeof createGameServer>;
  let url: string;
  let cookie: string;
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "retro-idle-test-"));
    server = createGameServer({ directory, origin: () => url });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Invalid test address");
    url = `http://127.0.0.1:${address.port}`;
    cookie = "";
  });
  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    rmSync(directory, { recursive: true, force: true });
  });
  async function request(path: string, body?: unknown, currentCookie = cookie) {
    const response = await fetch(`${url}/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "X-Retro-Idle": "1", "Content-Type": "application/json", Cookie: currentCookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie && currentCookie === cookie) cookie = setCookie.split(";")[0];
    return response;
  }
  it("stores ciphertext and refuses client credits and plaintext imports", async () => {
    expect((await request("load", {})).status).toBe(200);
    const malicious = await request("action", { type: "collect", credits: 1e9 });
    expect(malicious.status).toBe(400);
    expect((await request("import", { backup: '{"credits":999999}' })).status).toBe(400);
    const state = await (await request("snapshot")).json();
    expect(state.state.credits).toBe(25);
    expect(readFileSync(join(directory, "game.sqlite")).includes(Buffer.from('"credits"'))).toBe(false);
  });
  it("rejects altered backups, other sessions and repeated imports", async () => {
    await request("load", {});
    const { backup } = await (await request("export", {})).json();
    expect(backup).not.toContain("credits");
    const edited = JSON.parse(backup);
    edited.tag = Buffer.alloc(16).toString("base64");
    expect((await request("import", { backup: JSON.stringify(edited) })).status).toBe(400);
    expect((await request("import", { backup }, "unrecognized-session")).status).toBe(400);
    expect((await request("import", { backup })).status).toBe(200);
    expect((await request("import", { backup })).status).toBe(409);
  });
  it("serializes concurrent purchases and preserves state across restart", async () => {
    await request("load", {});
    const action = { type: "buy_generator", payload: { generatorId: "kiosk" } };
    const results = await Promise.all([request("action", action), request("action", action)]);
    expect(results.every((response) => response.status === 200)).toBe(true);
    expect((await (await request("snapshot")).json()).state.generators.kiosk.level).toBe(3);
    await new Promise<void>((resolve) => server.close(() => resolve()));
    server = createGameServer({ directory, origin: () => url });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error();
    url = `http://127.0.0.1:${address.port}`;
    expect((await (await request("load", {})).json()).state.generators.kiosk.level).toBe(3);
  });
  it("rejects cross-origin requests and missing request headers", async () => {
    expect(
      (await fetch(`${url}/api/load`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }))
        .status,
    ).toBe(403);
    expect(
      (
        await fetch(`${url}/api/load`, {
          method: "POST",
          headers: { "X-Retro-Idle": "1", Origin: "https://untrusted.example", "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
    ).toBe(403);
  });
});
