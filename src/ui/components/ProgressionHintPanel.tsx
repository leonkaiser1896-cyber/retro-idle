import type { ProgressionHintViewModel } from "../../app/GameService";
import { formatCredits } from "../formatters";
import { MetricList } from "./MetricList";
import { StatusBadge } from "./StatusBadge";

interface ProgressionHintPanelProps {
  className?: string;
  compact?: boolean;
  hint: ProgressionHintViewModel;
}

export function ProgressionHintPanel({ className = "", compact = false, hint }: ProgressionHintPanelProps) {
  const metrics = [
    ...(hint.progressLabel ? [{ label: "Fortschritt", value: hint.progressLabel }] : []),
    ...(hint.cost !== undefined ? [{ label: "Kosten", value: formatCredits(hint.cost) }] : []),
    ...(hint.missingCredits && hint.missingCredits > 0
      ? [{ label: "Fehlen", value: formatCredits(hint.missingCredits) }]
      : []),
  ];

  return (
    <section
      className={`panel info-panel progression-panel${compact ? " progression-panel-compact" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="panel-heading">
        <div>
          <span>Nächstes Ziel</span>
          <h2>{hint.title}</h2>
        </div>
        <StatusBadge tone="info">
          {
            {
              generator: "Betrieb",
              upgrade: "Upgrade",
              manager: "Team",
              rate: "Einkommen",
              reputation: "Ruf",
              none: "Erreicht",
            }[hint.targetType]
          }
        </StatusBadge>
      </div>
      <p>{hint.description}</p>
      {metrics.length > 0 && <MetricList items={metrics} />}
    </section>
  );
}
