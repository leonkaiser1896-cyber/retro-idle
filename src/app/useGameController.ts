import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActionLogEntry, GameViewModel, LoadGameResult } from "./GameService";
import type { PlayerState } from "../game";
import type { GameHost } from "./host/GameHost";

export interface GameController {
  loading: boolean;
  actionPending: boolean;
  error: string | null;
  state: PlayerState | null;
  view: GameViewModel | null;
  actionLog: ActionLogEntry[];
  offlineNotice: LoadGameResult | null;
  buyGenerator: (generatorId: string) => Promise<boolean>;
  buyUpgrade: (upgradeId: string) => Promise<boolean>;
  hireManager: (managerId: string) => Promise<boolean>;
  claimProgress: () => Promise<boolean>;
  resetLocalSave: () => Promise<boolean>;
  exportSave: () => string | null | Promise<string | null>;
  importSave: (rawJson: string) => Promise<boolean>;
}

export function useGameController(host: GameHost): GameController {
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const actionInFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PlayerState | null>(null);
  const [view, setView] = useState<GameViewModel | null>(null);
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([]);
  const [offlineNotice, setOfflineNotice] = useState<LoadGameResult | null>(null);
  const stableHost = useMemo(() => host, [host]);
  const hasState = state !== null;

  const addLog = useCallback((message: string, type: ActionLogEntry["type"]) => {
    const now = Date.now();
    setActionLog((entries) =>
      [{ id: `${now}-${Math.random().toString(36).slice(2)}`, message, type, createdAt: now }, ...entries].slice(0, 8),
    );
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    stableHost
      .load()
      .then((result) => {
        if (!active) {
          return;
        }
        setState(result.state);
        setView(result.view);
        setOfflineNotice(result);
        if (result.createdNewState) {
          addLog("Neuer Spielstand erstellt.", "info");
        } else {
          addLog("Spielstand geladen.", "info");
        }
        if (result.warningMessage) {
          addLog(result.warningMessage, "error");
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setError("Spielstand konnte nicht geladen werden.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [addLog, stableHost]);

  useEffect(() => {
    if (!hasState || !stableHost.supportsLocalLiveSnapshots || typeof window === "undefined") {
      return undefined;
    }

    let active = true;
    let refreshPending = false;

    const refreshLiveView = () => {
      if (!active) {
        return;
      }

      if (!actionPending && !refreshPending && !document.hidden) {
        refreshPending = true;
        void stableHost
          .getSnapshot()
          .then((snapshot) => {
            if (!active) {
              return;
            }
            setState(snapshot.state);
            setView(snapshot.view);
          })
          .catch(() => {
            if (active) setError("Die Live-Ansicht konnte nicht aktualisiert werden. Lade das Spiel bei Bedarf neu.");
          })
          .finally(() => {
            refreshPending = false;
          });
      }
    };

    const intervalId = window.setInterval(refreshLiveView, stableHost.snapshotIntervalMs ?? 250);
    window.addEventListener("visibilitychange", refreshLiveView);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", refreshLiveView);
    };
  }, [actionPending, stableHost, hasState]);

  const runAction = useCallback(
    async (action: () => Promise<{ ok: boolean; state: PlayerState | null; view: GameViewModel; message: string }>) => {
      if (!state || actionInFlight.current) {
        return false;
      }

      actionInFlight.current = true;
      setActionPending(true);
      setError(null);
      try {
        const result = await action();
        setState(result.state);
        setView(result.view);
        addLog(result.message, result.ok ? "success" : "error");
        if (!result.ok) setError(result.message);
        return result.ok;
      } catch {
        addLog("Aktion konnte nicht ausgefuehrt werden.", "error");
        setError("Aktion konnte nicht ausgeführt werden. Bitte versuche es erneut.");
        return false;
      } finally {
        actionInFlight.current = false;
        setActionPending(false);
      }
    },
    [addLog, state],
  );

  return {
    loading,
    actionPending,
    error,
    state,
    view,
    actionLog,
    offlineNotice,
    buyGenerator: (generatorId) =>
      runAction(() => stableHost.dispatchAction({ type: "buy_generator", payload: { generatorId } })),
    buyUpgrade: (upgradeId) =>
      runAction(() => stableHost.dispatchAction({ type: "buy_upgrade", payload: { upgradeId } })),
    hireManager: (managerId) =>
      runAction(() => stableHost.dispatchAction({ type: "hire_manager", payload: { managerId } })),
    claimProgress: () => runAction(() => stableHost.dispatchAction({ type: "collect" })),
    exportSave: () => {
      if (!state || !stableHost.exportSave) {
        return null;
      }
      return stableHost.exportSave();
    },
    importSave: (rawJson) =>
      stableHost.importSave ? runAction(() => stableHost.importSave!(rawJson)) : Promise.resolve(false),
    resetLocalSave: () =>
      stableHost.resetLocalSave ? runAction(() => stableHost.resetLocalSave!()) : Promise.resolve(false),
  };
}
