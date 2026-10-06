import type { GameError } from "./errors";
import type { GameResult, PlayerState } from "./types";

export function okResult<T>(state: PlayerState, data?: T): GameResult<T> {
  return data === undefined ? { ok: true, state } : { ok: true, state, data };
}

export function failResult<T = undefined>(state: PlayerState, error: GameError): GameResult<T> {
  return { ok: false, state, error };
}
