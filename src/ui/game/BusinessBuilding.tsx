import type { GeneratorViewModel } from "../../app/GameService";
import { BusinessBuildingAsset } from "../../assets/buildings";
import { GlowEffect } from "../../assets/effects";
import { GameIcon } from "../../assets/icons";
import { StatusBadge } from "../components/StatusBadge";
import { formatCredits, formatRate } from "../formatters";

interface BusinessBuildingProps {
  generator: GeneratorViewModel;
  highlighted?: boolean;
  onOpen: () => void;
  onBuy?: (id: string) => void;
  disabled?: boolean;
}

const BUILDING_META: Record<string, { icon: string; shortName: string; className: string; detail: string }> = {
  kiosk: { icon: "K", shortName: "Kiosk", className: "building-kiosk", detail: "Straßenverkauf" },
  workshop: { icon: "W", shortName: "Werkstatt", className: "building-workshop", detail: "Reparaturen" },
  logistics: { icon: "L", shortName: "Spedition", className: "building-logistics", detail: "Liefernetz" },
  club: { icon: "C", shortName: "Club", className: "building-club", detail: "Events" },
  company: { icon: "F", shortName: "Zentrale", className: "building-company", detail: "Holding" },
};

export function BusinessBuilding({ generator, highlighted = false, onOpen, onBuy, disabled }: BusinessBuildingProps) {
  const meta = BUILDING_META[generator.id] ?? {
    icon: generator.name.slice(0, 1).toUpperCase(),
    shortName: generator.name,
    className: "building-generic",
    detail: "Business",
  };
  const status = getBuildingStatus(generator);
  const tierLabel = getTierLabel(generator.visualTier);
  const ariaLabel = [
    `${generator.name} öffnen`,
    `Level ${generator.level}`,
    `Status ${status.label}`,
    `Einkommen ${formatRate(generator.income)}`,
    generator.unlocked ? undefined : "gesperrt",
    generator.affordable ? "Aktion verfügbar" : undefined,
    generator.hasManager ? "Manager eingestellt" : "kein Manager",
    generator.upgradeCount > 0 ? `${generator.upgradeCount} Upgrades` : "keine Upgrades",
  ]
    .filter(Boolean)
    .join(", ");
  const classes = [
    "business-building",
    meta.className,
    `building-tier-${generator.visualTier}`,
    generator.level > 0 ? "is-active" : "is-inactive",
    !generator.unlocked ? "is-locked" : "",
    generator.affordable ? "can-buy" : "",
    generator.hasManager ? "has-manager" : "",
    generator.upgradeCount > 0 ? "has-upgrades" : "",
    highlighted ? "action-highlight" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <button className="business-preview" type="button" onClick={onOpen} aria-label={ariaLabel}>
        <span className="building-sign">
          <span>{meta.icon}</span>
        </span>

        <span className="building-tower">
          <span className="building-rooftop" aria-hidden="true" />
          <GlowEffect className="building-asset-glow" />
          <BusinessBuildingAsset
            active={generator.level > 0}
            buildingId={generator.id}
            locked={!generator.unlocked}
            tier={generator.visualTier}
          />
          {!generator.unlocked && (
            <span className="building-lock-overlay" aria-hidden="true">
              <GameIcon name="locked" />
            </span>
          )}
          {generator.affordable && <span className="building-action-glow">Aktion verfügbar</span>}
          <span className="building-window-grid" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="building-level-stack" aria-label={`Ausbaustufe ${generator.visualTier}`}>
            {Array.from({ length: 4 }, (_, index) => (
              <i className={index < generator.visualTier ? "is-filled" : ""} key={index} />
            ))}
          </span>
          <span className="building-title">
            <strong>{generator.name}</strong>
            <small>{meta.detail}</small>
          </span>
          <span className="building-meta-row">
            <span className="building-level-label">Level {generator.level}</span>
            <span className="building-income-badge">
              <GameIcon name="income" />
              {formatRate(generator.income)}
            </span>
          </span>
          <span className="building-progress" aria-label={`Ausbau: ${tierLabel}`}>
            <span className="building-progress-label">{tierLabel}</span>
            <span className="building-progress-track" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <i className={index < generator.visualTier ? "is-filled" : ""} key={index} />
              ))}
            </span>
          </span>
        </span>

        <span className="building-footer">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <span className="building-indicators" aria-label="Business-Indikatoren">
            <span
              className={generator.hasManager ? "is-enabled" : "is-muted"}
              title={generator.hasManager ? "Manager eingestellt" : "Kein Manager"}
            >
              <GameIcon name="manager" />
            </span>
            <span
              className={generator.upgradeCount > 0 ? "is-enabled" : "is-muted"}
              title={generator.upgradeCount > 0 ? `${generator.upgradeCount} Upgrades gekauft` : "Keine Upgrades"}
            >
              <GameIcon name="upgrade" />
              {generator.upgradeCount > 0 && <small>{generator.upgradeCount}</small>}
            </span>
            {generator.affordable && (
              <span className="is-affordable" title="Kann gekauft werden">
                +
              </span>
            )}
          </span>
        </span>
      </button>
      {onBuy && (
        <div className="business-purchase">
          <button
            className="primary-button"
            disabled={disabled || !generator.canBuy}
            onClick={() => onBuy(generator.id)}
          >
            {generator.locked
              ? "Noch gesperrt"
              : `${generator.level > 0 ? "Ausbauen" : "Eröffnen"} · ${formatCredits(generator.cost)}`}
          </button>
          <small>
            {generator.unlockHint ?? generator.disabledReason ?? "Mehr Standorte, mehr laufende Einnahmen."}
          </small>
        </div>
      )}
    </article>
  );
}

function getBuildingStatus(generator: GeneratorViewModel): {
  label: string;
  tone: "success" | "warning" | "danger" | "info";
} {
  if (generator.status === "gesperrt") {
    return { label: "gesperrt", tone: "danger" };
  }
  if (generator.status === "aktiv") {
    return { label: "aktiv", tone: "success" };
  }
  return { label: "verfügbar", tone: "info" };
}

function getTierLabel(tier: GeneratorViewModel["visualTier"]): string {
  switch (tier) {
    case 0:
      return "Silhouette";
    case 1:
      return "Basic";
    case 2:
      return "Ausgebaut";
    case 3:
      return "Professionell";
    case 4:
      return "Premium";
  }
}
