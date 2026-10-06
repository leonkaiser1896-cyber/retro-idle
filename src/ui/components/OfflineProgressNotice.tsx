import type { LoadGameResult } from "../../app/GameService";
import { formatCredits } from "../formatters";
import { StatusBadge } from "./StatusBadge";

interface OfflineProgressNoticeProps {
  notice: LoadGameResult | null;
}

export function OfflineProgressNotice({ notice }: OfflineProgressNoticeProps) {
  if (!notice || (notice.offlineCredits <= 0 && !notice.offlineCapped)) {
    return null;
  }

  return (
    <section className="offline-notice">
      <div>
        <strong>Offline-Fortschritt</strong>
        <span>+{formatCredits(notice.offlineCredits)} offene Einnahmen</span>
      </div>
      {notice.offlineCapped && <StatusBadge tone="warning">Maximal 8 Stunden angerechnet</StatusBadge>}
    </section>
  );
}
