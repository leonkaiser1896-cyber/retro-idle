import { performance } from "node:perf_hooks";
import { writeFileSync } from "node:fs";
import { GameService } from "../src/app/GameService";
import { InMemoryStorageAdapter } from "../src/adapters/InMemoryStorageAdapter";
import { gameConfig } from "../src/config/gameConfig";
import { createInitialState } from "../src/game";

const now = Date.now();
const service = new GameService({ storage: new InMemoryStorageAdapter(), now: () => now });
const state = createInitialState(gameConfig, now - 28_800_000);
for (const generator of Object.values(state.generators)) generator.level = 100;
for (let i = 0; i < 500; i++) service.getView(state);
const samples: number[] = [];
for (let i = 0; i < 5000; i++) {
  const start = performance.now();
  service.getView(state);
  samples.push(performance.now() - start);
}
samples.sort((a, b) => a - b);
const report = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  iterations: samples.length,
  scenario: "All generators at level 100; eight hours of pending progress",
  averageMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
  p95Ms: samples[Math.floor(samples.length * 0.95)],
  budgetP95Ms: 10,
  scope: "Core/view computation only; browser rendering and mobile FPS are not measured",
};
writeFileSync("docs/performance-report.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (report.p95Ms > report.budgetP95Ms) process.exitCode = 1;
