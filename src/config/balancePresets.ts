import type { GameConfig, GeneratorConfig, ManagerConfig, ReputationTierConfig, UpgradeConfig } from "../game/types";

export type BalancePresetId = "fastPlaytest" | "webDefault";

export interface BalancePreset {
  id: BalancePresetId;
  name: string;
  description: string;
  config: GameConfig;
}

type GeneratorOverrides = Partial<Omit<GeneratorConfig, "id">>;
type UpgradeOverrides = Partial<Omit<UpgradeConfig, "id">>;
type ManagerOverrides = Partial<Omit<ManagerConfig, "id">>;

interface BalancePresetOverrides {
  startingCredits?: number;
  startingGenerators?: GameConfig["startingGenerators"];
  offlineCapMs?: number;
  generators?: Partial<Record<GeneratorConfig["id"], GeneratorOverrides>>;
  upgrades?: Record<string, UpgradeOverrides>;
  managers?: Record<string, ManagerOverrides>;
  reputationTiers?: ReputationTierConfig[];
}

const HOUR = 60 * 60 * 1000;

const baseConfig: GameConfig = {
  currencyName: "credits",
  offlineCapMs: 8 * HOUR,
  startingCredits: 25,
  startingGenerators: { kiosk: 1 },
  generators: [
    {
      id: "kiosk",
      name: "Straßenkiosk",
      description: "Ein kleiner Straßenkiosk als Einstieg in dein Business.",
      baseCost: 10,
      costMultiplier: 1.15,
      baseIncomePerSecond: 0.1,
    },
    {
      id: "workshop",
      name: "Kleine Werkstatt",
      description: "Reparaturen, Tuning-Aufträge und Stammkunden bringen stabile Einnahmen.",
      baseCost: 100,
      costMultiplier: 1.17,
      baseIncomePerSecond: 1.2,
      unlockRequirement: { generatorId: "kiosk", generatorCount: 3 },
    },
    {
      id: "logistics",
      name: "Lieferfirma",
      description: "Lieferverträge und Fahrer bauen dein logistisches Netzwerk aus.",
      baseCost: 1200,
      costMultiplier: 1.18,
      baseIncomePerSecond: 12,
      unlockRequirement: { generatorId: "workshop", generatorCount: 2 },
    },
    {
      id: "club",
      name: "Club / Eventlocation",
      description: "Events, Kontakte und Szene-Ruf bringen große Gewinne.",
      baseCost: 15000,
      costMultiplier: 1.2,
      baseIncomePerSecond: 140,
      unlockRequirement: { generatorId: "logistics", generatorCount: 2 },
    },
    {
      id: "company",
      name: "Unternehmenszentrale",
      description: "Deine Unternehmenszentrale bündelt alle Geschäftsbereiche.",
      baseCost: 250000,
      costMultiplier: 1.22,
      baseIncomePerSecond: 2200,
      unlockRequirement: { generatorId: "club", generatorCount: 2 },
    },
  ],
  upgrades: [
    {
      id: "better_shelves",
      name: "Bessere Regale",
      description: "Mehr Auswahl, bessere Warenpraesentation und Stammkunden erhoehen den Kiosk-Umsatz.",
      cost: 100,
      effect: { type: "generatorMultiplier", generatorId: "kiosk", multiplier: 2 },
      unlockRequirement: { generatorId: "kiosk", generatorCount: 5 },
    },
    {
      id: "tool_contracts",
      name: "Werkzeugvertraege",
      description: "Feste Lieferanten und gutes Werkzeug machen Reparaturen planbarer und profitabler.",
      cost: 500,
      effect: { type: "generatorMultiplier", generatorId: "workshop", multiplier: 2 },
      unlockRequirement: { generatorId: "workshop", generatorCount: 3 },
    },
    {
      id: "route_planning",
      name: "Routenplanung",
      description: "Bessere Touren, klare Absprachen und Fahrerplanung steigern die Lieferleistung.",
      cost: 2500,
      effect: { type: "generatorMultiplier", generatorId: "logistics", multiplier: 2 },
      unlockRequirement: { generatorId: "logistics", generatorCount: 3 },
    },
    {
      id: "brand_presence",
      name: "Markenauftritt",
      description: "Ein einheitlicher Auftritt macht dein Business in der Stadt bekannter.",
      cost: 4000,
      effect: { type: "globalMultiplier", multiplier: 1.25 },
      unlockRequirement: { creditsEarned: 5000 },
    },
  ],
  managers: [
    {
      id: "kiosk_manager",
      generatorId: "kiosk",
      name: "Kiosk-Leitung",
      description: "Eine verlässliche Leitung hält den Kiosk offen, auch wenn du unterwegs bist.",
      cost: 150,
      unlockRequirement: { generatorId: "kiosk", generatorCount: 5 },
    },
    {
      id: "workshop_manager",
      generatorId: "workshop",
      name: "Werkstattmeister",
      description: "Der Werkstattmeister koordiniert Aufträge, Teile und Stammkunden.",
      cost: 750,
      unlockRequirement: { generatorId: "workshop", generatorCount: 4 },
    },
    {
      id: "logistics_manager",
      generatorId: "logistics",
      name: "Disponent",
      description: "Der Disponent plant Fahrer, Routen und Lieferfenster.",
      cost: 3500,
      unlockRequirement: { generatorId: "logistics", generatorCount: 3 },
    },
    {
      id: "club_manager",
      generatorId: "club",
      name: "Eventleitung",
      description: "Die Eventleitung kuemmert sich um Gaeste, Personal und den Ruf des Clubs.",
      cost: 12000,
      unlockRequirement: { generatorId: "club", generatorCount: 3 },
    },
    {
      id: "company_manager",
      generatorId: "company",
      name: "Geschäftsführung",
      description: "Die Geschäftsführung hält deine Unternehmenszentrale auf Kurs.",
      cost: 50000,
      unlockRequirement: { generatorId: "company", generatorCount: 2 },
    },
  ],
  reputationTiers: [
    { id: "newcomer", name: "Newcomer", requiredLifetimeCredits: 0, globalMultiplier: 1 },
    { id: "known_operator", name: "Bekannter Betreiber", requiredLifetimeCredits: 25000, globalMultiplier: 1.05 },
    { id: "city_brand", name: "Stadtmarke", requiredLifetimeCredits: 150000, globalMultiplier: 1.12 },
  ],
};

export const activeBalancePresetId: BalancePresetId = "webDefault";

export const balancePresets: Record<BalancePresetId, BalancePreset> = {
  fastPlaytest: createPreset(
    "fastPlaytest",
    "Fast Playtest",
    "Fast UI and feature-testing curve. Company can be reached within a few hours.",
    {},
  ),
  webDefault: createPreset(
    "webDefault",
    "Web Default",
    "Default Web MVP curve. Company should require roughly 24 to 72 hours of meaningful auto progression.",
    {
      generators: {
        workshop: {
          baseCost: 140,
          costMultiplier: 1.19,
          baseIncomePerSecond: 0.9,
          unlockRequirement: { generatorId: "kiosk", generatorCount: 5 },
        },
        logistics: {
          baseCost: 3500,
          costMultiplier: 1.21,
          baseIncomePerSecond: 5.5,
          unlockRequirement: { generatorId: "workshop", generatorCount: 5 },
        },
        club: {
          baseCost: 150000,
          costMultiplier: 1.24,
          baseIncomePerSecond: 45,
          unlockRequirement: { generatorId: "logistics", generatorCount: 5 },
        },
        company: {
          baseCost: 4800000,
          costMultiplier: 1.28,
          baseIncomePerSecond: 650,
          unlockRequirement: { generatorId: "club", generatorCount: 5 },
        },
      },
      upgrades: {
        tool_contracts: { cost: 1200, unlockRequirement: { generatorId: "workshop", generatorCount: 5 } },
        route_planning: { cost: 12000, unlockRequirement: { generatorId: "logistics", generatorCount: 5 } },
        brand_presence: { cost: 40000, unlockRequirement: { creditsEarned: 100000 } },
      },
      managers: {
        workshop_manager: { cost: 2000, unlockRequirement: { generatorId: "workshop", generatorCount: 6 } },
        logistics_manager: { cost: 25000, unlockRequirement: { generatorId: "logistics", generatorCount: 5 } },
        club_manager: { cost: 180000, unlockRequirement: { generatorId: "club", generatorCount: 4 } },
        company_manager: { cost: 1500000, unlockRequirement: { generatorId: "company", generatorCount: 2 } },
      },
      reputationTiers: [
        { id: "newcomer", name: "Newcomer", requiredLifetimeCredits: 0, globalMultiplier: 1 },
        { id: "known_operator", name: "Bekannter Betreiber", requiredLifetimeCredits: 150000, globalMultiplier: 1.03 },
        { id: "city_brand", name: "Stadtmarke", requiredLifetimeCredits: 1500000, globalMultiplier: 1.08 },
      ],
    },
  ),
};

export const activeBalancePreset = balancePresets[activeBalancePresetId];

function createPreset(
  id: BalancePresetId,
  name: string,
  description: string,
  overrides: BalancePresetOverrides,
): BalancePreset {
  return {
    id,
    name,
    description,
    config: applyOverrides(baseConfig, overrides),
  };
}

function applyOverrides(config: GameConfig, overrides: BalancePresetOverrides): GameConfig {
  return {
    ...structuredClone(config),
    startingCredits: overrides.startingCredits ?? config.startingCredits,
    startingGenerators: structuredClone(overrides.startingGenerators ?? config.startingGenerators),
    offlineCapMs: overrides.offlineCapMs ?? config.offlineCapMs,
    generators: config.generators.map((generator) => ({ ...generator, ...overrides.generators?.[generator.id] })),
    upgrades: config.upgrades.map((upgrade) => ({ ...upgrade, ...overrides.upgrades?.[upgrade.id] })),
    managers: config.managers.map((manager) => ({ ...manager, ...overrides.managers?.[manager.id] })),
    reputationTiers: overrides.reputationTiers
      ? structuredClone(overrides.reputationTiers)
      : structuredClone(config.reputationTiers),
  };
}
