import type { ManagerViewModel } from "../../app/GameService";
import { formatCredits } from "../formatters";
import { MetricList } from "./MetricList";
import { StatusBadge } from "./StatusBadge";

interface ManagerCardProps {
  manager: ManagerViewModel;
  onHireManager: (managerId: string) => void;
  disabled?: boolean;
  recentlySucceeded?: boolean;
}

export function ManagerCard({ disabled = false, manager, onHireManager, recentlySucceeded = false }: ManagerCardProps) {
  const status = manager.hired
    ? { label: "eingestellt", tone: "success" as const }
    : manager.locked
      ? { label: "gesperrt", tone: "danger" as const }
      : manager.canHire
        ? { label: "verfügbar", tone: "success" as const }
        : { label: "nicht genug credits", tone: "warning" as const };
  const buttonLabel = manager.hired
    ? "Bereits eingestellt"
    : manager.locked
      ? "Gesperrt"
      : manager.canHire
        ? "Manager einstellen"
        : "Nicht genug credits";

  return (
    <article className={recentlySucceeded ? "panel item-card action-success-card" : "panel item-card"}>
      <div>
        <div className="item-heading">
          <h3>{manager.name}</h3>
          <div className="item-badges">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {recentlySucceeded && <StatusBadge tone="success">eingestellt</StatusBadge>}
          </div>
        </div>
        <p>{manager.description}</p>
      </div>
      <MetricList items={[{ label: "Kosten", value: formatCredits(manager.cost) }]} />
      <div className="card-actions">
        <button
          className="primary-button"
          type="button"
          disabled={disabled || !manager.canHire}
          onClick={() => onHireManager(manager.id)}
        >
          {buttonLabel}
        </button>
        {(manager.unlockHint || manager.disabledReason) && (
          <small className="button-reason">{manager.unlockHint ?? manager.disabledReason}</small>
        )}
      </div>
    </article>
  );
}
