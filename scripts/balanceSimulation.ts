import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  activeBalancePresetId,
  balancePresets,
  type BalancePreset,
  type BalancePresetId,
} from "../src/config/balancePresets";
import { validateGameConfig } from "../src/config/validateGameConfig";
import {
  applyOfflineProgress,
  buyGenerator,
  buyUpgrade,
  calculateRates,
  claimProgress,
  createInitialState,
  getGeneratorCost,
  getGeneratorLevel,
  getGameSnapshot,
  hireManager,
  isManagerHired,
  isUnlocked,
  isUpgradePurchased,
  type GameConfig,
  type GeneratorId,
  type PlayerState,
} from "../src/game";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const START = 0;
const AUTO_COLLECT_INTERVAL_MS = 30 * 1000;

const COMMON_HORIZONS: Horizon[] = [
  { label: "10 Minuten", timeMs: 10 * MINUTE },
  { label: "30 Minuten", timeMs: 30 * MINUTE },
  { label: "1 Stunde", timeMs: HOUR },
  { label: "8 Stunden", timeMs: 8 * HOUR },
  { label: "24 Stunden", timeMs: DAY },
  { label: "7 Tage", timeMs: 7 * DAY },
];

const BUSINESS_ORDER: GeneratorId[] = ["kiosk", "workshop", "logistics", "club", "company"];

interface Horizon {
  label: string;
  timeMs: number;
}

interface Summary {
  label: string;
  timeMs: number;
  state: PlayerState;
  creditsPerSecond: number;
  generatedRevenue: number;
  pendingRevenue: number;
  collectedCredits: number;
  spendableCredits: number;
  unlockTimes: Record<string, number>;
  purchases: string[];
  rateJumps: string[];
}

interface OfflineSummary {
  label: string;
  timeMs: number;
  appliedMs: number;
  earned: number;
  state: PlayerState;
  creditsPerSecond: number;
  generatedRevenue: number;
  pendingRevenue: number;
  collectedCredits: number;
  spendableCredits: number;
}

interface ProfileSimulation {
  preset: BalancePreset;
  validation: ReturnType<typeof validateGameConfig>;
  passive: Summary[];
  progression: Summary[];
  offline: OfflineSummary[];
  warnings: string[];
}

interface Target {
  kind: "generator" | "upgrade" | "manager";
  id: string;
  label: string;
  cost: number;
}

function main(): void {
  const simulations = (Object.keys(balancePresets) as BalancePresetId[]).map((presetId) =>
    simulateProfile(balancePresets[presetId]),
  );
  const report = renderMarkdownReport(simulations);

  writeReport("docs/balancing-report.md", report);
  printConsoleReport(simulations);
}

function simulateProfile(preset: BalancePreset): ProfileSimulation {
  const config = preset.config;
  const validation = validateGameConfig(config);
  const horizons = horizonsForPreset();
  const passive = horizons.map((horizon) => summarizePassiveAt(config, horizon));
  const progression = horizons.map((horizon) => runAutoProgression(config, horizon));
  const offline = runOfflineCapSimulation(config);
  const warnings = collectWarnings(preset, progression, offline);

  return { preset, validation, passive, progression, offline, warnings };
}

function horizonsForPreset(): Horizon[] {
  return COMMON_HORIZONS;
}

function summarizePassiveAt(config: GameConfig, horizon: Horizon): Summary {
  const state = createInitialState(config, START, "passive-sim");
  const snapshot = getGameSnapshot(state, config, horizon.timeMs);
  const preview = snapshot.previewState;

  return {
    ...summaryFromState(config, preview, horizon),
    unlockTimes: initialUnlockTimes(config, state),
    purchases: [],
    rateJumps: [],
  };
}

function runOfflineCapSimulation(config: GameConfig): OfflineSummary[] {
  const base = {
    ...createInitialState(config, START, "offline-sim"),
    credits: 0,
    totalEarned: 0,
    generators: {
      ...createInitialState(config, START).generators,
      kiosk: { id: "kiosk", level: 10, purchasedAt: START },
      workshop: { id: "workshop", level: 3, purchasedAt: START },
    },
  };

  return [
    summarizeOffline(config, base, { label: "1 Stunde offline", timeMs: HOUR }),
    summarizeOffline(config, base, { label: "8 Stunden offline", timeMs: 8 * HOUR }),
    summarizeOffline(config, base, { label: "24 Stunden offline", timeMs: 24 * HOUR }),
  ];
}

function summarizeOffline(config: GameConfig, state: PlayerState, horizon: Horizon): OfflineSummary {
  const result = applyOfflineProgress(state, config, horizon.timeMs);
  const progressed = result.ok ? result.state : state;

  return {
    label: horizon.label,
    timeMs: horizon.timeMs,
    state: progressed,
    creditsPerSecond: calculateRates(progressed, config).creditsPerSecond,
    appliedMs: result.ok ? (result.data?.appliedMs ?? 0) : 0,
    earned: result.ok ? (result.data?.creditsEarned ?? 0) : 0,
    generatedRevenue: progressed.totalEarned,
    pendingRevenue: progressed.pendingRevenue,
    collectedCredits: progressed.totalCollected,
    spendableCredits: progressed.credits,
  };
}

function runAutoProgression(config: GameConfig, horizon: Horizon): Summary {
  let state = createInitialState(config, START, `auto-${horizon.label}`);
  let now = START;
  const purchases: string[] = [];
  const rateJumps: string[] = [];
  const unlockTimes = initialUnlockTimes(config, state);

  while (now <= horizon.timeMs) {
    if (state.pendingRevenue > 0) {
      const collected = claimProgress(state, config, now);
      state = collected.ok ? collected.state : state;
    }

    const target = nextTarget(config, state);
    const ratesBefore = calculateRates(state, config);
    if (!target) {
      break;
    }

    if (state.credits < target.cost) {
      if (ratesBefore.creditsPerSecond <= 0) {
        break;
      }

      const waitMs = Math.ceil(((target.cost - state.credits) / ratesBefore.creditsPerSecond) * 1000);
      const remainingMs = horizon.timeMs - now;
      if (remainingMs <= 0) {
        break;
      }

      const stepMs = Math.min(waitMs, AUTO_COLLECT_INTERVAL_MS, remainingMs);
      now += stepMs;

      const collected = claimProgress(state, config, now);
      state = collected.ok ? collected.state : state;

      if (stepMs < waitMs || now >= horizon.timeMs) {
        continue;
      }
    }

    const result =
      target.kind === "generator"
        ? buyGenerator(state, config, target.id, now)
        : target.kind === "upgrade"
          ? buyUpgrade(state, config, target.id, now)
          : hireManager(state, config, target.id, now);

    if (!result.ok) {
      break;
    }

    state = result.state;
    const ratesAfter = calculateRates(state, config);
    purchases.push(`${formatDuration(now)}: ${target.label}`);

    if (target.kind === "generator" && getGeneratorLevel(state, target.id) === 1) {
      unlockTimes[target.id] = now;
    }

    if (ratesBefore.creditsPerSecond > 0 && ratesAfter.creditsPerSecond / ratesBefore.creditsPerSecond >= 5) {
      rateJumps.push(
        `${formatDuration(now)}: ${target.label} changed income ${fmt(ratesBefore.creditsPerSecond)} -> ${fmt(ratesAfter.creditsPerSecond)} / sec`,
      );
    }
  }

  if (now < horizon.timeMs) {
    const finalClaim = claimProgress(state, config, horizon.timeMs);
    state = finalClaim.ok ? finalClaim.state : state;
  }

  return {
    ...summaryFromState(config, state, horizon),
    unlockTimes,
    purchases,
    rateJumps,
  };
}

function nextTarget(config: GameConfig, state: PlayerState): Target | undefined {
  const generators = config.generators
    .filter((generator) => isUnlocked(state, generator.unlockRequirement))
    .map((generator) => ({
      kind: "generator" as const,
      id: generator.id,
      label: `Buy ${generator.name} L${getGeneratorLevel(state, generator.id) + 1}`,
      cost: getGeneratorCost(config, state, generator.id),
    }))
    .filter((target) => Number.isFinite(target.cost) && target.cost > 0);

  const upgrades = config.upgrades
    .filter((upgrade) => !isUpgradePurchased(state, upgrade.id) && isUnlocked(state, upgrade.unlockRequirement))
    .map((upgrade) => ({
      kind: "upgrade" as const,
      id: upgrade.id,
      label: `Buy upgrade ${upgrade.name}`,
      cost: upgrade.cost,
    }))
    .filter((target) => Number.isFinite(target.cost) && target.cost > 0);

  const managers = config.managers
    .filter((manager) => !isManagerHired(state, manager.id) && isUnlocked(state, manager.unlockRequirement))
    .map((manager) => ({
      kind: "manager" as const,
      id: manager.id,
      label: `Hire ${manager.name}`,
      cost: manager.cost,
    }))
    .filter((target) => Number.isFinite(target.cost) && target.cost > 0);

  const affordableGenerators = generators
    .filter((target) => state.credits >= target.cost)
    .sort((left, right) => left.cost - right.cost);
  if (affordableGenerators.length > 0) {
    return affordableGenerators[0];
  }

  const affordableUpgrades = upgrades
    .filter((target) => state.credits >= target.cost)
    .sort((left, right) => left.cost - right.cost);
  if (affordableUpgrades.length > 0) {
    return affordableUpgrades[0];
  }

  const affordableManagers = managers
    .filter((target) => state.credits >= target.cost)
    .sort((left, right) => left.cost - right.cost);
  if (affordableManagers.length > 0) {
    return affordableManagers[0];
  }

  return [...generators, ...upgrades, ...managers].sort((left, right) => left.cost - right.cost)[0];
}

function summaryFromState(
  config: GameConfig,
  state: PlayerState,
  horizon: Horizon,
): Omit<Summary, "unlockTimes" | "purchases" | "rateJumps"> {
  return {
    label: horizon.label,
    timeMs: horizon.timeMs,
    state,
    creditsPerSecond: calculateRates(state, config).creditsPerSecond,
    generatedRevenue: state.totalEarned,
    pendingRevenue: state.pendingRevenue,
    collectedCredits: state.totalCollected,
    spendableCredits: state.credits,
  };
}

function initialUnlockTimes(config: GameConfig, state: PlayerState): Record<string, number> {
  return Object.fromEntries(
    config.generators
      .filter((generator) => getGeneratorLevel(state, generator.id) > 0)
      .map((generator) => [generator.id, START]),
  );
}

function collectWarnings(preset: BalancePreset, progression: Summary[], offline: OfflineSummary[]): string[] {
  const warnings: string[] = [];
  const sevenDay = progression.find((entry) => entry.label === "7 Tage");
  const eightHour = progression.find((entry) => entry.label === "8 Stunden");
  const firstHour = progression.find((entry) => entry.label === "1 Stunde");
  const longest = progression[progression.length - 1];

  for (const generator of preset.config.generators) {
    const unlock = longest?.unlockTimes[generator.id];
    if (unlock === undefined) {
      warnings.push(
        `${generator.name} wird innerhalb von ${longest?.label ?? "dem Simulationszeitraum"} nicht erreicht.`,
      );
    } else if (generator.id !== preset.config.generators[0]?.id && unlock < 10 * MINUTE) {
      warnings.push(`${generator.name} wird sehr früh erreicht (${formatDuration(unlock)}).`);
    }
  }

  if (preset.id === "webDefault" && eightHour?.unlockTimes.company !== undefined) {
    warnings.push(
      "webDefault erreicht die Unternehmenszentrale innerhalb von 8 Stunden; Ziel ist eher 24 bis 72 Stunden.",
    );
  }

  if (preset.id === "webDefault" && sevenDay?.unlockTimes.company === undefined) {
    warnings.push(
      "webDefault erreicht die Unternehmenszentrale innerhalb von 7 Tagen nicht; Ziel ist 24 bis 72 Stunden.",
    );
  }

  if (preset.id === "fastPlaytest" && eightHour?.unlockTimes.company === undefined) {
    warnings.push(
      "fastPlaytest erreicht die Unternehmenszentrale nicht innerhalb von 8 Stunden; das Profil soll Feature-Tests schnell machen.",
    );
  }

  for (const simulation of progression) {
    warnings.push(...simulation.rateJumps.map((jump) => `Income-Spike in ${simulation.label}: ${jump}.`));
  }

  const oneHourProduced = firstHour?.state.totalEarned ?? 0;
  const eightHourOffline = offline.find((entry) => entry.label === "8 Stunden offline")?.earned ?? 0;
  if (oneHourProduced > 0 && eightHourOffline / oneHourProduced >= 10) {
    warnings.push(
      `Offline-Fortschritt wirkt stark: 8h offline produzieren ${fmt(eightHourOffline)} vs ${fmt(oneHourProduced)} totalEarned nach 1h Auto-Progression.`,
    );
  }

  const twentyFourHourOffline = offline.find((entry) => entry.label === "24 Stunden offline");
  if (twentyFourHourOffline && twentyFourHourOffline.appliedMs !== preset.config.offlineCapMs) {
    warnings.push("Offline-Cap greift in der 24h-Simulation nicht wie erwartet.");
  }

  return warnings;
}

function renderMarkdownReport(simulations: ProfileSimulation[]): string {
  return [
    "# Balancing Report",
    "",
    "## Active Profile",
    "",
    `- Active Web-App profile: \`${activeBalancePresetId}\``,
    "",
    "## Vergleich: fastPlaytest vs webDefault",
    "",
    renderComparisonTable(simulations),
    "",
    "## Company-Erreichbarkeit",
    "",
    renderCompanyAssessment(simulations),
    "",
    "## Profile Purpose",
    "",
    "- `fastPlaytest`: schnelles Feature- und UI-Testing; Company darf innerhalb weniger Stunden erreichbar sein.",
    "- `webDefault`: Web-MVP-Default; Company sollte nicht nach 8 Stunden, sondern eher nach 24 bis 72 Stunden sinnvoller Auto-Progression erreichbar sein.",
    "",
    ...simulations.flatMap(renderProfileMarkdown),
  ].join("\n");
}

function renderComparisonTable(simulations: ProfileSimulation[]): string {
  const rows = simulations.map((simulation) => {
    const longest = simulation.progression[simulation.progression.length - 1];
    return `| ${simulation.preset.id} | ${unlockText(longest.unlockTimes.workshop)} | ${unlockText(longest.unlockTimes.logistics)} | ${unlockText(longest.unlockTimes.club)} | ${unlockText(longest.unlockTimes.company)} | ${businessStage(longest.state)} | ${simulation.warnings.length} |`;
  });

  return [
    "| Profil | Workshop | Logistics | Club | Company | Höchste Stufe im längsten Lauf | Warnungen |",
    "| --- | ---: | ---: | ---: | ---: | --- | ---: |",
    ...rows,
  ].join("\n");
}

function renderCompanyAssessment(simulations: ProfileSimulation[]): string {
  return simulations
    .map((simulation) => {
      const longest = simulation.progression[simulation.progression.length - 1];
      const companyTime = longest?.unlockTimes.company;
      const companyText = unlockText(companyTime);
      if (simulation.preset.id === "webDefault") {
        const status = companyTime !== undefined && companyTime > 8 * HOUR && companyTime <= 3 * DAY ? "OK" : "Prüfen";
        return `- \`webDefault\`: Company bei ${companyText}. Bewertung: ${status}; Ziel ist nicht vor 8h und ideal etwa 24-72h.`;
      }

      return `- \`fastPlaytest\`: Company bei ${companyText}. Bewertung: OK für Feature- und UI-Tests, weil dieses Profil absichtlich schnell ist.`;
    })
    .join("\n");
}

function renderProfileMarkdown(simulation: ProfileSimulation): string[] {
  const { preset, validation, passive, progression, offline, warnings } = simulation;

  return [
    `## Profile: ${preset.name} (\`${preset.id}\`)`,
    "",
    preset.description,
    "",
    "### Simulationsannahmen",
    "",
    "- Simulation nutzt ausschließlich den bestehenden TypeScript-Core.",
    "- Keine Browser- oder UI-Economy-Regeln werden verwendet.",
    "- Passive Simulation kauft nichts automatisch.",
    "- `generatedRevenue` ist insgesamt produzierte Einnahme, `pendingRevenue` ist offene Kasse, `collectedCredits` ist insgesamt eingesammelt, `spendableCredits` ist aktuell kaufbares Guthaben.",
    "- Progression Simulation kauft automatisch nach Priorität: günstigster sinnvoller Generator, dann Upgrades, dann Manager.",
    "- Collect-Strategie der Auto-Progression: vor jedem Kaufversuch wird gesammelt; wenn nicht genug `spendableCredits` vorhanden sind, wird maximal 30 Sekunden gewartet und dann erneut gesammelt.",
    "- Auto-Progression kauft ausschließlich mit eingesammelten `credits`; `pendingRevenue` ist nicht spendable.",
    "- Offline-Cap kommt aus der aktiven Config.",
    "",
    "### Config Validation",
    "",
    validation.ok
      ? "- Status: valid"
      : `- Status: invalid\n${validation.errors.map((error) => `- Error: ${error}`).join("\n")}`,
    ...validation.warnings.map((warning) => `- Warning: ${warning}`),
    "",
    "### Passive Simulation",
    "",
    renderProfileTable(passive),
    "",
    "### Auto-Progression",
    "",
    renderProfileTable(progression),
    "",
    "### Ungefähre Erreichbarkeit",
    "",
    renderUnlockTable(preset.config, progression[progression.length - 1]?.unlockTimes ?? {}),
    "",
    "### Offline-Cap Simulation",
    "",
    "| Zeitraum | Applied | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...offline.map(
      (entry) =>
        `| ${entry.label} | ${formatDuration(entry.appliedMs)} | ${fmt(entry.generatedRevenue)} | ${fmt(entry.pendingRevenue)} | ${fmt(entry.collectedCredits)} | ${fmt(entry.spendableCredits)} | ${fmt(entry.creditsPerSecond)} |`,
    ),
    "",
    "### Auffälligkeiten",
    "",
    warnings.length > 0 ? warnings.map((warning) => `- ${warning}`).join("\n") : "- Keine automatischen Warnungen.",
    "",
    "### Empfehlungen",
    "",
    recommendations(preset.id, warnings),
    "",
  ];
}

function renderProfileTable(entries: Summary[]): string {
  return [
    "| Zeitraum | generatedRevenue | pendingRevenue | collectedCredits | spendableCredits | Income/sec | Generator-Level | Upgrades | Manager | Business-Stufe |",
    "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |",
    ...entries.map(
      (entry) =>
        `| ${entry.label} | ${fmt(entry.generatedRevenue)} | ${fmt(entry.pendingRevenue)} | ${fmt(entry.collectedCredits)} | ${fmt(entry.spendableCredits)} | ${fmt(entry.creditsPerSecond)} | ${generatorLevelsInline(entry.state)} | ${purchasedUpgradeNames(entry.state).join(", ") || "-"} | ${hiredManagerNames(entry.state).join(", ") || "-"} | ${businessStage(entry.state)} |`,
    ),
  ].join("\n");
}

function renderUnlockTable(config: GameConfig, unlockTimes: Record<string, number>): string {
  return [
    "| Business | Erreichbarkeit |",
    "| --- | ---: |",
    ...config.generators
      .filter((generator) => generator.id !== "kiosk")
      .map((generator) => `| ${generator.name} | ${unlockText(unlockTimes[generator.id])} |`),
  ].join("\n");
}

function recommendations(presetId: BalancePresetId, warnings: string[]): string {
  if (warnings.length === 0) {
    return "- Keine unmittelbaren Anpassungen nötig. Als nächstes echte Playtest-Daten sammeln.";
  }

  const profileHint =
    presetId === "webDefault"
      ? "- Für webDefault Company-Gating besonders gegen den 8h- und 24-72h-Zielkorridor prüfen."
      : "- Für fastPlaytest nur eingreifen, wenn Feature-Flows zu langsam testbar werden.";

  return [
    profileHint,
    "- Bei zu frühen Unlocks: baseCost, costMultiplier oder unlockRequirement der nächsten Stufe erhöhen.",
    "- Bei zu späten Unlocks: frühe Einkommen oder Zwischen-Upgrades vorsichtig anheben.",
    "- Bei Income-Spikes: Multiplikatoren oder baseIncomePerSecond der betroffenen Stufe glätten.",
    "- Bei zu starkem Offline-Fortschritt: offlineCapMs oder einen späteren Offline-Multiplikator als Config ergänzen.",
  ].join("\n");
}

function printConsoleReport(simulations: ProfileSimulation[]): void {
  console.log("\nRetro Idle Balancing Simulation");
  console.log("===============================");
  console.log(`Active profile: ${activeBalancePresetId}`);
  console.log("Collect strategy: collect before purchase attempts and at most every 30 seconds while waiting.");

  simulations.forEach((simulation) => {
    console.log(`\nProfile: ${simulation.preset.name} (${simulation.preset.id})`);
    console.log(`Config: ${simulation.validation.ok ? "valid" : "invalid"}`);
    console.log("Auto Progression");
    simulation.progression.forEach((entry) => {
      console.log(
        `${entry.label}: generated=${fmt(entry.generatedRevenue)}, pending=${fmt(entry.pendingRevenue)}, collected=${fmt(entry.collectedCredits)}, spendable=${fmt(entry.spendableCredits)}, income/sec=${fmt(entry.creditsPerSecond)}, generators=${generatorLevelsInline(entry.state)}, upgrades=${purchasedUpgradeNames(entry.state).join(", ") || "-"}, managers=${hiredManagerNames(entry.state).join(", ") || "-"}, stage=${businessStage(entry.state)}`,
      );
    });
    console.log("Unlocks");
    console.log(
      renderUnlockTable(
        simulation.preset.config,
        simulation.progression[simulation.progression.length - 1]?.unlockTimes ?? {},
      ),
    );
    console.log("Warnings");
    console.log(
      simulation.warnings.length > 0 ? simulation.warnings.map((warning) => `- ${warning}`).join("\n") : "- none",
    );
  });

  console.log("\nWrote docs/balancing-report.md");
}

function writeReport(path: string, report: string): void {
  const absolutePath = resolve(path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, report, "utf8");
}

function generatorLevelsInline(state: PlayerState): string {
  return BUSINESS_ORDER.map((id) => `${id}:${getGeneratorLevel(state, id)}`).join(", ");
}

function purchasedUpgradeNames(state: PlayerState): string[] {
  return Object.values(state.upgrades)
    .filter((upgrade) => upgrade.purchased)
    .map((upgrade) => upgrade.id);
}

function hiredManagerNames(state: PlayerState): string[] {
  return Object.values(state.managers)
    .filter((manager) => manager.hired)
    .map((manager) => manager.id);
}

function businessStage(state: PlayerState): string {
  const stage = [...BUSINESS_ORDER].reverse().find((id) => getGeneratorLevel(state, id) > 0);
  return stage ?? "none";
}

function unlockText(value: number | undefined): string {
  return value === undefined ? "nicht erreicht" : formatDuration(value);
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function fmt(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

main();
