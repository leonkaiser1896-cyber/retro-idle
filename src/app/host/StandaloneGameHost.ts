import { GameService } from "../GameService";
import type { PlayerState } from "../../game";
import type {
  GameHost,
  GameHostAction,
  GameHostActionResult,
  GameHostLoadResult,
  GameHostSnapshotResult,
} from "./GameHost";

export class StandaloneGameHost implements GameHost {
  readonly mode = "standalone" as const;
  readonly supportsLocalLiveSnapshots = true;

  private state: PlayerState | null = null;
  private mutationTail: Promise<unknown> = Promise.resolve();

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.mutationTail.then(operation);
    this.mutationTail = next.catch(() => undefined);
    return next;
  }

  constructor(private readonly service = new GameService()) {}

  async load(): Promise<GameHostLoadResult> {
    const result = await this.service.loadGame();
    this.state = result.state;
    return result;
  }

  async getSnapshot(): Promise<GameHostSnapshotResult> {
    if (!this.state) {
      const result = await this.load();
      return {
        state: result.state,
        view: result.view,
      };
    }

    return {
      state: this.state,
      view: this.service.getView(this.state),
    };
  }

  async dispatchAction(action: GameHostAction): Promise<GameHostActionResult> {
    return this.serialize(async () => {
      if (!this.state) {
        await this.load();
      }

      if (!this.state) {
        throw new Error("Standalone host state is not loaded.");
      }

      const result = await this.executeAction(action, this.state);
      this.state = result.state;
      return result;
    });
  }

  exportSave(): string | null {
    if (!this.state) {
      return null;
    }

    return this.service.exportSave(this.state);
  }

  async importSave(rawJson: string): Promise<GameHostActionResult> {
    return this.serialize(async () => {
      if (!this.state) {
        await this.load();
      }

      if (!this.state) {
        throw new Error("Standalone host state is not loaded.");
      }

      const result = await this.service.importSaveJson(this.state, rawJson);
      this.state = result.state;
      return result;
    });
  }

  async resetLocalSave(): Promise<GameHostActionResult> {
    return this.serialize(async () => {
      const result = await this.service.resetLocalSave();
      this.state = result.state;
      return result;
    });
  }

  private executeAction(action: GameHostAction, state: PlayerState): Promise<GameHostActionResult> {
    switch (action.type) {
      case "collect":
        return this.service.collectRevenue(state);
      case "buy_generator":
        return this.service.buyGenerator(state, action.payload.generatorId);
      case "buy_upgrade":
        return this.service.buyUpgrade(state, action.payload.upgradeId);
      case "hire_manager":
        return this.service.hireManager(state, action.payload.managerId);
    }
  }
}
