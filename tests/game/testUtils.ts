import { gameConfig } from "../../src/config/gameConfig";
import { createInitialState, type GameConfig, type PlayerState } from "../../src/game";

export const NOW = 1_700_000_000_000;

export function makeState(config: GameConfig = gameConfig, now = NOW): PlayerState {
  return createInitialState(config, now);
}

export function richState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ...makeState(),
    credits: 100_000,
    totalEarned: 100_000,
    generators: {
      kiosk: { id: "kiosk", level: 10, purchasedAt: NOW },
      workshop: { id: "workshop", level: 5, purchasedAt: NOW },
      logistics: { id: "logistics", level: 3, purchasedAt: NOW },
      club: { id: "club", level: 2, purchasedAt: NOW },
      company: { id: "company", level: 1, purchasedAt: NOW },
    },
    ...overrides,
  };
}
