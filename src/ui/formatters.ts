interface NumberFormatOptions {
  livePrecision?: boolean;
  compact?: boolean;
}

export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) {
    return "invalid";
  }

  if (options.livePrecision && options.compact === false) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 3,
      minimumFractionDigits: 3,
    }).format(value);
  }

  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${formatCompact(value / 1_000_000_000, options.livePrecision)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${formatCompact(value / 1_000_000, options.livePrecision)}M`;
  }
  if (absolute >= 1_000) {
    return `${formatCompact(value / 1_000, options.livePrecision)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: options.livePrecision ? 3 : 2,
  }).format(value);
}

export function formatCredits(value: number, options: { compact?: boolean } = {}): string {
  return `${formatNumber(value, { livePrecision: true, compact: options.compact })} credits`;
}

export function formatRate(value: number): string {
  return `${formatNumber(value, { livePrecision: true })}/sec`;
}

export function formatDateTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) {
    return "invalid";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(timestamp));
}

function formatCompact(value: number, livePrecision = false): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: livePrecision ? 6 : Math.abs(value) >= 10 ? 1 : 2,
  }).format(value);
}
