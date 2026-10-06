export type GameNumber = number;

export const currencyMath = {
  rawAdd(left: GameNumber, right: GameNumber): GameNumber {
    return left + right;
  },
  add(left: GameNumber, right: GameNumber): GameNumber {
    return roundCurrency(left + right);
  },
  subtract(left: GameNumber, right: GameNumber): GameNumber {
    return roundCurrency(left - right);
  },
  multiply(left: GameNumber, right: GameNumber): GameNumber {
    return left * right;
  },
  pow(base: GameNumber, exponent: GameNumber): GameNumber {
    return base ** exponent;
  },
  isLessThan(left: GameNumber, right: GameNumber): boolean {
    return left < right;
  },
  isPositiveFinite(value: GameNumber): boolean {
    return Number.isFinite(value) && value > 0;
  },
  nonNegative(value: GameNumber): GameNumber {
    return Number.isFinite(value) && value > 0 ? value : 0;
  },
  positiveMultiplier(value: GameNumber): GameNumber {
    return Number.isFinite(value) && value > 0 ? value : 0;
  },
  roundCurrency,
  roundRate,
};

export function calculateElapsedMs(now: number, lastUpdated: number): number {
  return now - lastUpdated;
}

export function capElapsedMs(elapsedMs: number, capMs: number): number {
  return Math.min(elapsedMs, capMs);
}

export function clampElapsedMs(elapsedMs: number): number {
  return Math.max(0, elapsedMs);
}

export function millisecondsToSeconds(milliseconds: number): number {
  return milliseconds / 1000;
}

function roundCurrency(value: GameNumber): GameNumber {
  return Math.round(value * 100) / 100;
}

function roundRate(value: GameNumber): GameNumber {
  return Math.round(value * 10000) / 10000;
}
