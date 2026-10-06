import type { ActionLogEntry } from "../../app/GameService";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

interface ActionLogProps {
  entries: ActionLogEntry[];
}

export function ActionLog({ entries }: ActionLogProps) {
  return (
    <section className="panel action-log">
      {entries.length === 0 ? (
        <p>No actions yet.</p>
      ) : (
        <ol>
          {entries.map((entry) => (
            <li className={`log-${entry.type}`} key={entry.id}>
              <div className="list-item-heading">
                <span>{entry.message}</span>
                <StatusBadge tone={toneForLog(entry.type)}>{entry.type}</StatusBadge>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function toneForLog(type: ActionLogEntry["type"]): StatusBadgeTone {
  if (type === "success") {
    return "success";
  }
  if (type === "error") {
    return "danger";
  }
  return "info";
}
