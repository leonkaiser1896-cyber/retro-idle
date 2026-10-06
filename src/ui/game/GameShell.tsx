import { useEffect, useState } from "react";
import type { GameController } from "../../app/useGameController";
import { ActionEffect } from "./ActionEffect";
import { AnimatedBackground } from "./AnimatedBackground";
import { BottomDock } from "./BottomDock";
import { BusinessCity } from "./BusinessCity";
import { CollectVault } from "./CollectVault";
import { GameHUD } from "./GameHUD";
import { WindowManager, type GameWindowId } from "./WindowManager";
import { ProgressionHintPanel } from "../components/ProgressionHintPanel";
import { useGameFeedback } from "./useGameFeedback";

interface GameShellProps {
  controller: GameController;
}

export function GameShell({ controller }: GameShellProps) {
  const [activeWindow, setActiveWindow] = useState<GameWindowId | null>(null);
  const { actionFeedback, collectFeedback, emitFeedback, recentAction } = useGameFeedback();

  useEffect(() => {
    if (!activeWindow || typeof window === "undefined") {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveWindow(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeWindow]);

  if (!controller.view) return null;
  const { view } = controller;

  async function collect() {
    const collected = await controller.claimProgress();
    if (collected) {
      emitFeedback("collect");
    } else {
      emitFeedback("error", { detail: controller.error ?? undefined });
    }
  }

  async function buyGenerator(generatorId: string) {
    const bought = await controller.buyGenerator(generatorId);
    if (bought) {
      const generatorName = view.generators.find((generator) => generator.id === generatorId)?.name ?? "Business";
      emitFeedback("buy", { detail: generatorName, targetId: generatorId });
    } else {
      emitFeedback("error", { detail: controller.error ?? undefined });
    }
    return bought;
  }

  async function buyUpgrade(upgradeId: string) {
    const bought = await controller.buyUpgrade(upgradeId);
    if (bought) {
      const upgradeName = view.upgrades.find((upgrade) => upgrade.id === upgradeId)?.name ?? "Upgrade";
      emitFeedback("upgrade", { detail: upgradeName, targetId: upgradeId });
    } else {
      emitFeedback("error", { detail: controller.error ?? undefined });
    }
    return bought;
  }

  async function hireManager(managerId: string) {
    const hired = await controller.hireManager(managerId);
    if (hired) {
      const managerName = view.managers.find((manager) => manager.id === managerId)?.name ?? "Manager";
      emitFeedback("manager", { detail: managerName, targetId: managerId });
    } else {
      emitFeedback("error", { detail: controller.error ?? undefined });
    }
    return hired;
  }

  return (
    <main className="game-shell">
      <AnimatedBackground />
      <ActionEffect feedback={actionFeedback} />
      <GameHUD offlineNotice={controller.offlineNotice} view={view} />
      <section className="empire-intro">
        <div>
          <span className="section-kicker">VOM KIOSK ZUM IMPERIUM</span>
          <h2>Die Stadt wartet auf dich.</h2>
          <p>Baue deine Betriebe aus, investiere clever und lass dein Viertel wachsen.</p>
        </div>
        <div className="session-status">
          <span />{" "}
          {view.persistenceWarning ? "Speichern derzeit nicht möglich" : "Fortschritt wird verschlüsselt gespeichert"}
        </div>
      </section>
      <div className="starter-guide" aria-label="So spielst du">
        <div>
          <b>01</b>
          <span>
            <strong>Verdienen</strong>Deine Betriebe produzieren von allein.
          </span>
        </div>
        <div>
          <b>02</b>
          <span>
            <strong>Einsammeln</strong>Hol die Einnahmen aus deiner Kasse.
          </span>
        </div>
        <div>
          <b>03</b>
          <span>
            <strong>Wachsen</strong>Eröffne und verbessere deine Betriebe.
          </span>
        </div>
      </div>
      {controller.error && (
        <p className="game-error" role="alert">
          {controller.error}
        </p>
      )}
      {view.persistenceWarning && (
        <p className="game-error" role="alert">
          {view.persistenceWarning}
        </p>
      )}

      <section className="game-main-stage">
        <BusinessCity
          highlightedBuildingId={recentAction?.type === "buy_generator" ? recentAction.targetId : null}
          view={view}
          onOpenBusinesses={() => setActiveWindow("businesses")}
          onPurchase={buyGenerator}
          disabled={controller.actionPending}
        />
        <aside className="game-side-stack">
          <CollectVault
            collectFeedback={collectFeedback}
            disabled={controller.actionPending}
            view={view}
            onCollect={collect}
          />
          <ProgressionHintPanel className="quick-objective" hint={view.activeObjective} compact />
          <button
            className="secondary-button objective-action"
            onClick={() =>
              setActiveWindow(
                view.activeObjective.targetType === "upgrade"
                  ? "upgrades"
                  : view.activeObjective.targetType === "manager"
                    ? "managers"
                    : "businesses",
              )
            }
          >
            Nächsten Schritt planen →
          </button>
        </aside>
      </section>

      <WindowManager
        activeWindow={activeWindow}
        actionLog={controller.actionLog}
        actionPending={controller.actionPending}
        recentAction={recentAction}
        view={view}
        onBuyGenerator={buyGenerator}
        onBuyUpgrade={buyUpgrade}
        onExportSave={controller.exportSave}
        onHireManager={hireManager}
        onImportSave={controller.importSave}
        onResetLocalSave={controller.resetLocalSave}
        onCloseWindow={() => setActiveWindow(null)}
      />

      <BottomDock activeWindow={activeWindow} onSelectWindow={setActiveWindow} />
    </main>
  );
}
