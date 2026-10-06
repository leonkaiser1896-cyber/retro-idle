import type { BusinessMilestoneViewModel } from "../../app/GameService";
import { StatusBadge } from "./StatusBadge";

interface BusinessMilestonesPanelProps {
  milestones: BusinessMilestoneViewModel[];
}

export function BusinessMilestonesPanel({ milestones }: BusinessMilestonesPanelProps) {
  return (
    <section className="panel milestones-panel">
      <span>Business-Meilensteine</span>
      <h2>Imperium-Aufbau</h2>
      <ol>
        {milestones.map((milestone) => (
          <li className={milestone.achieved ? "milestone-done" : "milestone-open"} key={milestone.id}>
            <div className="list-item-heading">
              <strong>{milestone.label}</strong>
              <StatusBadge tone={milestone.achieved ? "success" : "muted"}>
                {milestone.achieved ? "erreicht" : "offen"}
              </StatusBadge>
            </div>
            <small>{milestone.description}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}
