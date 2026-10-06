import type { BuildingGraphicProps } from "./types";

interface BaseBuildingGraphicProps extends BuildingGraphicProps {
  variant: "kiosk" | "workshop" | "logistics" | "club" | "company";
}

const WINDOWS = [
  [18, 30],
  [42, 30],
  [66, 30],
  [18, 56],
  [42, 56],
  [66, 56],
] as const;

export function BaseBuildingGraphic({ active, locked, tier, variant }: BaseBuildingGraphicProps) {
  const litWindowCount = active ? Math.min(WINDOWS.length, Math.max(2, tier + 2)) : 0;
  const isSilhouette = tier === 0 || locked;

  return (
    <svg
      className={`building-svg building-svg-${variant} building-svg-tier-${tier}${isSilhouette ? " is-silhouette" : ""}`}
      role="img"
      aria-label={`${variant} tier ${tier} placeholder asset`}
      viewBox="0 0 100 120"
      preserveAspectRatio="none"
    >
      <rect className="building-svg-shell" x="10" y={18 - tier * 2} width="80" height={92 + tier * 2} rx="9" />
      <path className="building-svg-roof" d={roofPath(variant, tier)} />
      <rect className="building-svg-stripe" x="17" y="75" width="66" height="8" rx="4" />
      {buildingDetails(variant, tier)}
      {WINDOWS.map(([x, y], index) => (
        <rect
          className={index < litWindowCount ? "building-svg-window is-lit" : "building-svg-window"}
          height="12"
          key={`${x}-${y}`}
          rx="2"
          width="14"
          x={x}
          y={y - tier}
        />
      ))}
      <rect className="building-svg-door" x="41" y="91" width="18" height="29" rx="5" />
      {tier >= 3 && <circle className="building-svg-emblem" cx="50" cy="52" r="9" />}
      {tier >= 4 && <path className="building-svg-neon" d={premiumNeonPath(variant)} />}
      {locked && <rect className="building-svg-lock" x="34" y="45" width="32" height="28" rx="5" />}
    </svg>
  );
}

function buildingDetails(variant: BaseBuildingGraphicProps["variant"], tier: number) {
  if (variant === "kiosk") {
    return (
      <>
        <path className="building-svg-detail building-svg-awning" d="M16 72h68l-6 10H22z" />
        {tier >= 2 && <rect className="building-svg-sign" x="26" y="36" width="48" height="13" rx="4" />}
        {tier >= 3 && <path className="building-svg-detail building-svg-counter" d="M22 88h56v10H22z" />}
      </>
    );
  }

  if (variant === "workshop") {
    return (
      <>
        <path className="building-svg-detail building-svg-garage" d="M22 78h34v34H22z" />
        {tier >= 2 && <path className="building-svg-detail building-svg-lift" d="M66 82v28M61 96h18" />}
        {tier >= 3 && <rect className="building-svg-sign" x="26" y="30" width="48" height="12" rx="3" />}
      </>
    );
  }

  if (variant === "logistics") {
    return (
      <>
        <path className="building-svg-detail building-svg-bay" d="M18 84h24v25H18zm30 0h24v25H48z" />
        {tier >= 2 && <path className="building-svg-detail building-svg-truck" d="M17 101h38v10H17zm43 3h15l7 7H60z" />}
        {tier >= 3 && (
          <path
            className="building-svg-detail building-svg-container"
            d="M18 58h64v12H18zm6 0v12m12-12v12m12-12v12m12-12v12"
          />
        )}
      </>
    );
  }

  if (variant === "club") {
    return (
      <>
        <path className="building-svg-detail building-svg-club-wave" d="M20 88c10-8 20 8 30 0s20 8 30 0v18H20z" />
        {tier >= 2 && <rect className="building-svg-sign" x="24" y="34" width="52" height="16" rx="8" />}
        {tier >= 3 && (
          <>
            <path className="building-svg-light-beam" d="M28 12l14 54" />
            <path className="building-svg-light-beam" d="M72 12L58 66" />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <path className="building-svg-detail building-svg-office-core" d="M28 22h44v88H28z" />
      {tier >= 2 && <path className="building-svg-detail building-svg-wing" d="M14 54h18v56H14zm54 0h18v56H68z" />}
      {tier >= 3 && <path className="building-svg-detail building-svg-lobby" d="M33 91h34v20H33z" />}
      {tier >= 4 && <path className="building-svg-detail building-svg-antenna" d="M48 4h4v20h-4zm-7 0h18v5H41z" />}
    </>
  );
}

function premiumNeonPath(variant: BaseBuildingGraphicProps["variant"]): string {
  if (variant === "club") {
    return "M18 28c18-18 46-18 64 0";
  }
  if (variant === "company") {
    return "M24 18h52M24 26h52";
  }
  if (variant === "logistics") {
    return "M16 76h68";
  }
  if (variant === "workshop") {
    return "M22 48h56";
  }
  return "M20 54h60";
}

function roofPath(variant: BaseBuildingGraphicProps["variant"], tier: number): string {
  if (variant === "kiosk") {
    return `M14 ${22 - tier * 2}h72l-8-14H22z`;
  }
  if (variant === "workshop") {
    return `M12 ${21 - tier * 2}h76v-9H12z`;
  }
  if (variant === "club") {
    return `M14 ${22 - tier * 2}c11-14 25-14 36 0 11-14 25-14 36 0v7H14z`;
  }
  if (variant === "company") {
    return `M18 ${20 - tier * 2}h64v-11H18z`;
  }
  return `M12 ${22 - tier * 2}h60l16 16H12z`;
}
