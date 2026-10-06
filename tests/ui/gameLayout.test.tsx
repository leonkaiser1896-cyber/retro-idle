import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { gameConfig } from "../../src/config/gameConfig";
import { GameService, type ActionLogEntry, type GameViewModel } from "../../src/app/GameService";
import type { GameController } from "../../src/app/useGameController";
import { createInitialState, type PlayerState } from "../../src/game";
import { BottomDock } from "../../src/ui/game/BottomDock";
import { BusinessBuilding } from "../../src/ui/game/BusinessBuilding";
import { BusinessCity } from "../../src/ui/game/BusinessCity";
import { CollectVault } from "../../src/ui/game/CollectVault";
import { FloatingText } from "../../src/ui/game/FloatingText";
import { GameHUD } from "../../src/ui/game/GameHUD";
import { GameShell } from "../../src/ui/game/GameShell";
import { WindowManager } from "../../src/ui/game/WindowManager";

const NOW = 1_700_000_000_000;
const ROOT = process.cwd();

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  const state = createInitialState(gameConfig, NOW, "ui-test-player");
  return {
    ...state,
    pendingRevenue: 125,
    totalEarned: 250,
    totalCollected: 100,
    ...overrides,
  };
}

function makeView(state = makeState()): GameViewModel {
  return new GameService({
    config: gameConfig,
    now: () => NOW,
    playerId: "ui-test-player",
  }).getView(state);
}

function makeController(view = makeView(), state = makeState()): GameController {
  return {
    loading: false,
    actionPending: false,
    error: null,
    state,
    view,
    actionLog: [],
    offlineNotice: null,
    buyGenerator: vi.fn(async () => true),
    buyUpgrade: vi.fn(async () => true),
    hireManager: vi.fn(async () => true),
    claimProgress: vi.fn(async () => true),
    resetLocalSave: vi.fn(async () => true),
    exportSave: vi.fn(() => "{}"),
    importSave: vi.fn(async () => true),
  };
}

function actionLog(): ActionLogEntry[] {
  return [{ id: "log-1", message: "Test action", type: "success", createdAt: NOW }];
}

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

function listSourceFiles(path: string): string[] {
  const absolutePath = join(ROOT, path);
  return readdirSync(absolutePath).flatMap((entry) => {
    const child = join(absolutePath, entry);
    const relative = join(path, entry);
    return statSync(child).isDirectory() ? listSourceFiles(relative) : [relative];
  });
}

describe("game UI layout", () => {
  it("renders GameShell without crashing", () => {
    const html = renderToStaticMarkup(<GameShell controller={makeController()} />);

    expect(html).toContain("Retro Business");
    expect(html).toContain("Business City");
    expect(html).toContain("Kasse / Tresor");
    expect(html).toContain("bg-depth-grid");
    expect(html).toContain("bg-horizon");
    expect(html).toContain("bg-skyline");
    expect(html).toContain("bg-vignette");
  });

  it("GameHUD shows credits and pending revenue from the view model", () => {
    const view = makeView(makeState({ credits: 42, pendingRevenue: 125 }));
    const html = renderToStaticMarkup(<GameHUD offlineNotice={null} view={view} />);

    expect(html).toContain("Credits");
    expect(html).toContain("42.000 credits");
    expect(html).toContain("Offene Einnahmen");
    expect(html).toContain("125.000 credits");
  });

  it("CollectVault shows pending revenue and collect button state", () => {
    const view = makeView(makeState({ pendingRevenue: 125 }));
    const html = renderToStaticMarkup(<CollectVault collectFeedback={null} view={view} onCollect={vi.fn()} />);

    expect(html).toContain("Kasse / Tresor");
    expect(html).toContain("125.000 credits");
    expect(html).toContain(view.collectButtonState.label);
    expect(html).toContain("vault-chamber");
    expect(html).toContain("vault-liquid");
    expect(html).toContain("vault-particles");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("vault-fill");
    expect(html).toContain(`aria-valuenow="${Math.round(view.collectFillPercent)}"`);
  });

  it("CollectVault collect button calls the handler without a reward amount", () => {
    const source = readProjectFile("src/ui/game/CollectVault.tsx");

    expect(source).toContain("onClick={onCollect}");
    expect(source).not.toMatch(/onCollect\([^)]*(collectableAmount|pendingRevenue|credits|reward|amount)/);
  });

  it("FloatingText renders after a collect trigger", () => {
    const view = makeView(makeState({ pendingRevenue: 125 }));
    const html = renderToStaticMarkup(
      <CollectVault collectFeedback={{ id: 1, text: "Eingesammelt" }} view={view} onCollect={vi.fn()} />,
    );

    expect(html).toContain("floating-text");
    expect(html).toContain("Eingesammelt");
    expect(renderToStaticMarkup(<FloatingText text="+250 credits" />)).toContain("+250 credits");
  });

  it("WindowManager opens and closes windows from props", () => {
    const view = makeView();
    const closedHtml = renderToStaticMarkup(
      <WindowManager
        activeWindow={null}
        actionLog={actionLog()}
        actionPending={false}
        recentAction={null}
        view={view}
        onBuyGenerator={vi.fn()}
        onBuyUpgrade={vi.fn()}
        onExportSave={vi.fn(() => "{}")}
        onHireManager={vi.fn()}
        onImportSave={vi.fn(async () => true)}
        onResetLocalSave={vi.fn(async () => true)}
        onCloseWindow={vi.fn()}
      />,
    );
    const openHtml = renderToStaticMarkup(
      <WindowManager
        activeWindow="businesses"
        actionLog={actionLog()}
        actionPending={false}
        recentAction={null}
        view={view}
        onBuyGenerator={vi.fn()}
        onBuyUpgrade={vi.fn()}
        onExportSave={vi.fn(() => "{}")}
        onHireManager={vi.fn()}
        onImportSave={vi.fn(async () => true)}
        onResetLocalSave={vi.fn(async () => true)}
        onCloseWindow={vi.fn()}
      />,
    );

    expect(closedHtml).toBe("");
    expect(openHtml).toContain("game-window");
    expect(openHtml).toContain('role="dialog"');
    expect(openHtml).toContain("window-icon");
    expect(openHtml).toContain("window-body");
    expect(openHtml).toContain("Straßenkiosk");
  });

  it("BottomDock can request opening a window", () => {
    const onSelectWindow = vi.fn();
    const element = BottomDock({ activeWindow: null, onSelectWindow }) as ReactElement<{ children: ReactElement[] }>;
    const firstButton = element.props.children[0] as ReactElement<{ onClick: () => void }>;

    firstButton.props.onClick();

    expect(onSelectWindow).toHaveBeenCalledWith("businesses");
  });

  it("BottomDock keeps all windows reachable", () => {
    const onSelectWindow = vi.fn();
    const element = BottomDock({ activeWindow: null, onSelectWindow }) as ReactElement<{ children: ReactElement[] }>;

    for (const button of element.props.children as Array<ReactElement<{ onClick: () => void }>>) {
      button.props.onClick();
    }

    expect(onSelectWindow).toHaveBeenCalledWith("businesses");
    expect(onSelectWindow).toHaveBeenCalledWith("upgrades");
    expect(onSelectWindow).toHaveBeenCalledWith("managers");
    expect(onSelectWindow).toHaveBeenCalledWith("reputation");
    expect(onSelectWindow).toHaveBeenCalledWith("objectives");
    expect(onSelectWindow).toHaveBeenCalledWith("actionLog");
    expect(onSelectWindow).toHaveBeenCalledWith("settings");
    expect(onSelectWindow).not.toHaveBeenCalledWith("playtest");
  });

  it("BusinessCity renders five buildings", () => {
    const view = makeView();
    const html = renderToStaticMarkup(<BusinessCity view={view} onOpenBusinesses={vi.fn()} />);

    expect((html.match(/business-building/g) ?? []).length).toBe(5);
  });

  it("BusinessBuilding renders all five business types", () => {
    const view = makeView();

    expect(view.buildings.map((building) => building.id)).toEqual([
      "kiosk",
      "workshop",
      "logistics",
      "club",
      "company",
    ]);

    for (const building of view.buildings) {
      const html = renderToStaticMarkup(<BusinessBuilding generator={building} onOpen={vi.fn()} />);

      expect(html).toContain(`building-${building.id}`);
      expect(html).toContain(building.name);
    }
  });

  it("BusinessBuilding shows locked, active and affordable states", () => {
    const view = makeView();
    const base = view.buildings[0];
    const lockedHtml = renderToStaticMarkup(
      <BusinessBuilding
        generator={{ ...base, affordable: false, level: 0, status: "gesperrt", unlocked: false, visualTier: 0 }}
        onOpen={vi.fn()}
      />,
    );
    const activeHtml = renderToStaticMarkup(
      <BusinessBuilding
        generator={{ ...base, affordable: false, level: 2, status: "aktiv", unlocked: true, visualTier: 1 }}
        onOpen={vi.fn()}
      />,
    );
    const affordableHtml = renderToStaticMarkup(
      <BusinessBuilding
        generator={{ ...base, affordable: true, level: 1, status: "aktiv", unlocked: true, visualTier: 1 }}
        onOpen={vi.fn()}
      />,
    );

    expect(lockedHtml).toContain("is-locked");
    expect(lockedHtml).toContain("gesperrt");
    expect(activeHtml).toContain("is-active");
    expect(activeHtml).toContain("aktiv");
    expect(affordableHtml).toContain("can-buy");
    expect(affordableHtml).toContain("Aktion verfügbar");
  });

  it("BusinessCity renders visual building tiers from the view model", () => {
    const view = makeView();
    const html = renderToStaticMarkup(<BusinessCity view={view} onOpenBusinesses={vi.fn()} />);

    expect(view.buildings.every((building) => typeof building.visualTier === "number")).toBe(true);
    expect(html).toContain("building-tier-");
    expect(html).toContain("building-level-stack");
    expect(html).toContain("building-svg");
    expect(html).toContain("building-svg-tier-");
    expect(html).toContain("building-svg-awning");
  });

  it("BusinessBuilding shows each building level tier label", () => {
    const view = makeView();
    const base = view.buildings[0];

    for (const [visualTier, label] of [
      [0, "Silhouette"],
      [1, "Basic"],
      [2, "Ausgebaut"],
      [3, "Professionell"],
      [4, "Premium"],
    ] as const) {
      const html = renderToStaticMarkup(
        <BusinessBuilding
          generator={{
            ...base,
            level: visualTier === 0 ? 0 : visualTier * 5,
            status: visualTier > 0 ? "aktiv" : "gesperrt",
            unlocked: visualTier > 0,
            visualTier,
          }}
          onOpen={vi.fn()}
        />,
      );

      expect(html).toContain(`building-tier-${visualTier}`);
      expect(html).toContain(label);
    }
  });

  it("BusinessBuilding renders state, income, indicators and accessible action label", () => {
    const view = makeView();
    const generator = {
      ...view.buildings[0],
      affordable: true,
      hasManager: true,
      managerHired: true,
      upgradeCount: 2,
      purchasedUpgradeCount: 2,
    };
    const html = renderToStaticMarkup(<BusinessBuilding generator={generator} onOpen={vi.fn()} />);

    expect(html).toContain('aria-label="Straßenkiosk öffnen, Level 1');
    expect(html).toContain("Einkommen");
    expect(html).toContain("building-income-badge");
    expect(html).toContain("building-progress");
    expect(html).toContain("Basic");
    expect(html).toContain("Manager eingestellt");
    expect(html).toContain("2 Upgrades gekauft");
    expect(html).toContain("Aktion verfügbar");
  });

  it("asset placeholders are isolated under src/assets", () => {
    for (const path of [
      "src/assets/buildings/kiosk/KioskBuildingGraphic.tsx",
      "src/assets/buildings/workshop/WorkshopBuildingGraphic.tsx",
      "src/assets/buildings/logistics/LogisticsBuildingGraphic.tsx",
      "src/assets/buildings/club/ClubBuildingGraphic.tsx",
      "src/assets/buildings/company/CompanyBuildingGraphic.tsx",
      "src/assets/icons/GameIcon.tsx",
      "src/assets/effects/CollectSparkEffect.tsx",
      "src/assets/effects/GlowEffect.tsx",
    ]) {
      expect(existsSync(join(ROOT, path))).toBe(true);
    }
  });

  it("buildings use ViewModel data and do not import config or core economy", () => {
    const businessCitySource = readProjectFile("src/ui/game/BusinessCity.tsx");
    const businessBuildingSource = readProjectFile("src/ui/game/BusinessBuilding.tsx");

    expect(businessCitySource).toContain("view.buildings");
    expect(businessBuildingSource).toContain("BusinessBuildingAsset");
    expect(`${businessCitySource}\n${businessBuildingSource}`).not.toMatch(
      /config\/gameConfig|from "\.\.\/\.\.\/game"|buyGenerator|calculateRates|getGeneratorCost/,
    );
  });

  it("UI collect action sends no reward amount", async () => {
    const controller = makeController();
    const shellSource = readProjectFile("src/ui/game/GameShell.tsx");

    await controller.claimProgress();

    expect(controller.claimProgress).toHaveBeenCalledWith();
    expect(shellSource).toContain("controller.claimProgress()");
    expect(shellSource).not.toContain("claimProgress(" + "view.collectableAmount");
  });

  it("UI does not calculate collect amount", () => {
    const sources = [
      readProjectFile("src/ui/game/CollectVault.tsx"),
      readProjectFile("src/ui/game/GameShell.tsx"),
      readProjectFile("src/ui/game/useGameFeedback.ts"),
    ].join("\n");

    expect(sources).not.toMatch(/collectableAmount\s*[+\-*/]|pendingRevenue\s*[+\-*/]|credits\s*[+\-*/]/);
    expect(sources).not.toMatch(/Math\.(min|max|round|floor|ceil)\([^)]*(collectableAmount|pendingRevenue|credits)/);
  });

  it("UI imports no core economy functions", () => {
    const importLines = listSourceFiles("src/ui")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => readProjectFile(file))
      .flatMap((source) => source.split(/\r?\n/).filter((line) => line.trim().startsWith("import ")))
      .join("\n");

    expect(importLines).not.toMatch(/from ["']\.\.\/\.\.\/game["']/);
    expect(importLines).not.toMatch(/from ["']\.\.\/game["']/);
    expect(importLines).not.toMatch(
      /\bcalculateRates\b|\bcollectRevenue\b|\bgetGameSnapshot\b|\bgetGeneratorCost\b|\bapplyOfflineProgress\b/,
    );
  });

  it("game feedback hook prepares events without browser audio or requests", () => {
    const source = readProjectFile("src/ui/game/useGameFeedback.ts");

    for (const event of ["collect", "buy", "upgrade", "manager", "error"]) {
      expect(source).toContain(`"${event}"`);
    }

    expect(source).not.toMatch(/\bnew Audio\b|\bHTMLAudioElement\b|\.mp3|\.wav|\.ogg|fetch\(|XMLHttpRequest/);
  });
});

describe("game core boundaries", () => {
  it("keeps core independent of browser and UI APIs", () => {
    const sources = listSourceFiles("src/game")
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map(readProjectFile)
      .join("\n");
    expect(sources).not.toMatch(
      /from ["']react|document\.|window\.|localStorage|fetch|Date\.now|requestAnimationFrame/,
    );
  });
});
