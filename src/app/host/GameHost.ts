import type { GameViewModel, LoadGameResult } from "../GameService";
import type { PlayerState } from "../../game";

export type GameHostAction =
  | { type: "collect" }
  | { type: "buy_generator"; payload: { generatorId: string } }
  | { type: "buy_upgrade"; payload: { upgradeId: string } }
  | { type: "hire_manager"; payload: { managerId: string } };

export interface GameHostActionResult {
  ok: boolean;
  state: PlayerState | null;
  view: GameViewModel;
  message: string;
}

export interface GameHostLoadResult extends LoadGameResult {
  state: PlayerState;
}

export interface GameHostSnapshotResult {
  state: PlayerState | null;
  view: GameViewModel;
}

export interface GameHost {
  readonly mode: "standalone" | "server";
  readonly supportsLocalLiveSnapshots: boolean;
  readonly snapshotIntervalMs?: number;
  load(): Promise<GameHostLoadResult>;
  getSnapshot(): Promise<GameHostSnapshotResult>;
  dispatchAction(action: GameHostAction): Promise<GameHostActionResult>;
  resetLocalSave?(): Promise<GameHostActionResult>;
  exportSave?(): string | null | Promise<string | null>;
  importSave?(rawJson: string): Promise<GameHostActionResult>;
}
