import type { ActionLogEntry, GameViewModel } from "../../app/GameService";
import { ActionLog } from "../components/ActionLog";
import { BusinessMilestonesPanel } from "../components/BusinessMilestonesPanel";
import { GeneratorCard } from "../components/GeneratorCard";
import { ManagerCard } from "../components/ManagerCard";
import { ProgressionHintPanel } from "../components/ProgressionHintPanel";
import { ReputationPanel } from "../components/ReputationPanel";
import { UpgradeCard } from "../components/UpgradeCard";
import { GameWindow } from "./GameWindow";
import { SaveGamePanel } from "../components/SaveGamePanel";

export type GameWindowId =
  "businesses" | "upgrades" | "managers" | "reputation" | "objectives" | "actionLog" | "settings";

interface WindowManagerProps {
  activeWindow: GameWindowId | null;
  actionLog: ActionLogEntry[];
  actionPending: boolean;
  recentAction: { type: "collect" | "buy_generator" | "buy_upgrade" | "hire_manager"; targetId?: string } | null;
  view: GameViewModel;
  onBuyGenerator: (generatorId: string) => Promise<boolean>;
  onBuyUpgrade: (upgradeId: string) => Promise<boolean>;
  onHireManager: (managerId: string) => Promise<boolean>;
  onExportSave: () => string | null | Promise<string | null>;
  onImportSave: (rawJson: string) => Promise<boolean>;
  onResetLocalSave: () => Promise<boolean>;
  onCloseWindow: () => void;
}

export function WindowManager({
  activeWindow,
  actionLog,
  actionPending,
  onBuyGenerator,
  onBuyUpgrade,
  onCloseWindow,
  onExportSave,
  onHireManager,
  onImportSave,
  onResetLocalSave,
  recentAction,
  view,
}: WindowManagerProps) {
  if (!activeWindow) {
    return null;
  }

  return (
    <section className="window-manager" aria-label="Geöffnetes Spielfenster">
      <button className="window-backdrop" type="button" aria-label="Fenster schließen" onClick={onCloseWindow} />

      {activeWindow === "businesses" && (
        <GameWindow
          eyebrow="Stadtkarte"
          iconLabel="B"
          title="Deine Betriebe"
          subtitle="Betriebe kaufen und laufendes Einkommen skalieren."
          variant="primary"
          onClose={onCloseWindow}
        >
          <div className="card-grid window-card-grid">
            {view.generators.map((generator) => (
              <GeneratorCard
                disabled={actionPending}
                generator={generator}
                key={generator.id}
                recentlySucceeded={recentAction?.type === "buy_generator" && recentAction.targetId === generator.id}
                onBuyGenerator={onBuyGenerator}
              />
            ))}
          </div>
        </GameWindow>
      )}

      {activeWindow === "upgrades" && (
        <GameWindow
          iconLabel="U"
          eyebrow="Backoffice"
          title="Upgrades"
          subtitle="Bestehende Betriebe effizienter machen."
          onClose={onCloseWindow}
        >
          <div className="card-grid window-card-grid">
            {view.upgrades.map((upgrade) => (
              <UpgradeCard
                disabled={actionPending}
                key={upgrade.id}
                recentlySucceeded={recentAction?.type === "buy_upgrade" && recentAction.targetId === upgrade.id}
                upgrade={upgrade}
                onBuyUpgrade={onBuyUpgrade}
              />
            ))}
          </div>
        </GameWindow>
      )}

      {activeWindow === "managers" && (
        <GameWindow
          iconLabel="M"
          eyebrow="Personal"
          title="Dein Team"
          subtitle="Stelle Manager ein und steigere die Leistung deiner Betriebe."
          onClose={onCloseWindow}
        >
          <div className="card-grid window-card-grid">
            {view.managers.map((manager) => (
              <ManagerCard
                disabled={actionPending}
                key={manager.id}
                manager={manager}
                recentlySucceeded={recentAction?.type === "hire_manager" && recentAction.targetId === manager.id}
                onHireManager={onHireManager}
              />
            ))}
          </div>
        </GameWindow>
      )}

      {activeWindow === "reputation" && (
        <GameWindow
          iconLabel="R"
          eyebrow="Ruf"
          title="Dein Ruf"
          subtitle="Verdiene dir einen Namen und zusätzliche Produktionsboni."
          onClose={onCloseWindow}
        >
          <ReputationPanel reputation={view.reputation} />
        </GameWindow>
      )}

      {activeWindow === "objectives" && (
        <GameWindow
          iconLabel="Z"
          eyebrow="Planung"
          title="Ziele / Meilensteine"
          subtitle="Nächstes Ziel und Business-Meilensteine."
          onClose={onCloseWindow}
        >
          <div className="objective-window-grid">
            <ProgressionHintPanel hint={view.activeObjective} />
            <BusinessMilestonesPanel milestones={view.milestones} />
          </div>
        </GameWindow>
      )}

      {activeWindow === "actionLog" && (
        <GameWindow
          iconLabel="L"
          eyebrow="Rückblick"
          title="Verlauf"
          subtitle="Deine letzten Aktionen und ihre Ergebnisse."
          onClose={onCloseWindow}
        >
          <ActionLog entries={actionLog} />
        </GameWindow>
      )}

      {activeWindow === "settings" && (
        <GameWindow
          iconLabel="S"
          eyebrow="Dein Fortschritt"
          title="Spielstand"
          subtitle="Sichern, wiederherstellen und neu anfangen."
          onClose={onCloseWindow}
        >
          <SaveGamePanel
            disabled={actionPending}
            onExportSave={onExportSave}
            onImportSave={onImportSave}
            onResetLocalSave={onResetLocalSave}
          />
        </GameWindow>
      )}
    </section>
  );
}
