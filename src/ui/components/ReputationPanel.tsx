import type { ReputationViewModel } from "../../app/GameService";
import { formatCredits } from "../formatters";
import { MetricList } from "./MetricList";
import { StatusBadge } from "./StatusBadge";

interface ReputationPanelProps {
  reputation: ReputationViewModel;
}

export function ReputationPanel({ reputation }: ReputationPanelProps) {
  return (
    <section className="panel info-panel reputation-panel">
      <div className="panel-heading">
        <div>
          <span>Reputation</span>
          <h2>{reputation.name}</h2>
        </div>
        <StatusBadge tone="info">{reputation.bonusPercent.toFixed(0)}% Bonus</StatusBadge>
      </div>
      <MetricList
        items={[
          { label: "Rufpunkte", value: String(reputation.points) },
          { label: "Resets", value: String(reputation.resets) },
        ]}
      />
      {reputation.nextTierName ? (
        <p>
          Nächstes Rufziel: {reputation.nextTierName}
          {reputation.nextTierBonusPercent !== undefined
            ? ` (${reputation.nextTierBonusPercent.toFixed(0)}% Bonus)`
            : ""}
          {reputation.nextTierMissingCredits !== undefined
            ? ` - fehlen: ${formatCredits(reputation.nextTierMissingCredits)}`
            : ""}
        </p>
      ) : (
        <p>Alle aktuellen Rufstufen sind erreicht.</p>
      )}
      <small>Dein Ruf wächst mit den insgesamt verdienten Credits.</small>
    </section>
  );
}
