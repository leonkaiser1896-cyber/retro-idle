import type { GeneratorViewModel } from "../../app/GameService";
import { formatCredits, formatRate } from "../formatters";
import { MetricList } from "./MetricList";
import { StatusBadge } from "./StatusBadge";

interface GeneratorCardProps {
  generator: GeneratorViewModel;
  onBuyGenerator: (generatorId: string) => void;
  disabled?: boolean;
  recentlySucceeded?: boolean;
}

export function GeneratorCard({
  disabled = false,
  generator,
  onBuyGenerator,
  recentlySucceeded = false,
}: GeneratorCardProps) {
  const status = generator.locked
    ? { label: "gesperrt", tone: "danger" as const }
    : generator.canBuy
      ? { label: "verfügbar", tone: "success" as const }
      : { label: "nicht genug credits", tone: "warning" as const };
  const buttonLabel = generator.locked ? "Gesperrt" : generator.canBuy ? "Kaufen" : "Nicht genug credits";

  return (
    <article className={recentlySucceeded ? "panel item-card action-success-card" : "panel item-card"}>
      <div>
        <div className="item-heading">
          <h3>{generator.name}</h3>
          <div className="item-badges">
            <StatusBadge tone="info">Level {generator.level}</StatusBadge>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {recentlySucceeded && <StatusBadge tone="success">gekauft</StatusBadge>}
          </div>
        </div>
        <p>{generator.description}</p>
      </div>
      <MetricList
        items={[
          { label: "Kosten", value: formatCredits(generator.cost) },
          { label: "Einkommen", value: formatRate(generator.incomePerSecond) },
        ]}
      />
      <div className="card-actions">
        <button
          className="primary-button"
          type="button"
          disabled={disabled || !generator.canBuy}
          onClick={() => onBuyGenerator(generator.id)}
        >
          {buttonLabel}
        </button>
        {(generator.unlockHint || generator.disabledReason) && (
          <small className="button-reason">{generator.unlockHint ?? generator.disabledReason}</small>
        )}
      </div>
    </article>
  );
}
