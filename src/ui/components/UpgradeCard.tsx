import type { UpgradeViewModel } from "../../app/GameService";
import { formatCredits } from "../formatters";
import { MetricList } from "./MetricList";
import { StatusBadge } from "./StatusBadge";

interface UpgradeCardProps {
  upgrade: UpgradeViewModel;
  onBuyUpgrade: (upgradeId: string) => void;
  disabled?: boolean;
  recentlySucceeded?: boolean;
}

export function UpgradeCard({ disabled = false, recentlySucceeded = false, upgrade, onBuyUpgrade }: UpgradeCardProps) {
  const status = upgrade.purchased
    ? { label: "gekauft", tone: "success" as const }
    : upgrade.locked
      ? { label: "gesperrt", tone: "danger" as const }
      : upgrade.canBuy
        ? { label: "verfügbar", tone: "success" as const }
        : { label: "nicht genug credits", tone: "warning" as const };
  const buttonLabel = upgrade.purchased
    ? "Bereits gekauft"
    : upgrade.locked
      ? "Gesperrt"
      : upgrade.canBuy
        ? "Upgrade kaufen"
        : "Nicht genug credits";

  return (
    <article className={recentlySucceeded ? "panel item-card action-success-card" : "panel item-card"}>
      <div>
        <div className="item-heading">
          <h3>{upgrade.name}</h3>
          <div className="item-badges">
            <StatusBadge tone="info">{upgrade.effectLabel}</StatusBadge>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {recentlySucceeded && <StatusBadge tone="success">aktiv</StatusBadge>}
          </div>
        </div>
        <p>{upgrade.description}</p>
      </div>
      <MetricList items={[{ label: "Kosten", value: formatCredits(upgrade.cost) }]} />
      <div className="card-actions">
        <button
          className="primary-button"
          type="button"
          disabled={disabled || !upgrade.canBuy}
          onClick={() => onBuyUpgrade(upgrade.id)}
        >
          {buttonLabel}
        </button>
        {(upgrade.unlockHint || upgrade.disabledReason) && (
          <small className="button-reason">{upgrade.unlockHint ?? upgrade.disabledReason}</small>
        )}
      </div>
    </article>
  );
}
