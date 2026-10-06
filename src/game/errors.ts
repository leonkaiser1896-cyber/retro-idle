export type GameErrorCode =
  | "GENERATOR_NOT_FOUND"
  | "UPGRADE_NOT_FOUND"
  | "MANAGER_NOT_FOUND"
  | "NOT_ENOUGH_CREDITS"
  | "ALREADY_PURCHASED"
  | "ALREADY_HIRED"
  | "UNLOCK_REQUIREMENT_NOT_MET"
  | "INVALID_TIME"
  | "INVALID_AMOUNT";

export interface GameError {
  code: GameErrorCode;
  message: string;
}

export const gameError = (code: GameErrorCode, message: string): GameError => ({
  code,
  message,
});
