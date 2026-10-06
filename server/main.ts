import { resolve } from "node:path";
import { createGameServer } from "./app";

const port = Number(process.env.PORT ?? 4174);
const host = process.env.HOST ?? "127.0.0.1";
const origin = process.env.PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`;
const server = createGameServer({
  directory: resolve(process.env.RETRO_IDLE_DATA_DIR ?? "server-data"),
  origin,
  dist: resolve("dist"),
});
server.listen(port, host, () => console.log(`Retro Idle server ready: ${origin}`));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => server.close());
