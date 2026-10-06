import type { GameViewModel, LoadGameResult } from "../../app/GameService";
import { GameIcon, type GameIconName } from "../../assets/icons";
import { formatCredits, formatRate } from "../formatters";
import { OfflineProgressNotice } from "../components/OfflineProgressNotice";

interface GameHUDProps {
  view: GameViewModel;
  offlineNotice: LoadGameResult | null;
}

export function GameHUD({ offlineNotice, view }: GameHUDProps) {
  return (
    <header className="game-hud">
      <div className="hud-brand">
        <span className="brand-eyebrow">RETRO / IDLE</span>
        <h1>
          Retro Business<span className="brand-dot">.</span>
        </h1>
        <p>Dein Viertel. Dein Unternehmen. Dein Aufstieg.</p>
      </div>
      <div className="hud-stats" aria-label="Spielstatus">
        <HudStat icon="credits" label="Credits" value={formatCredits(view.credits, { compact: false })} />
        <HudStat
          icon="pending-revenue"
          label="Offene Einnahmen"
          value={formatCredits(view.pendingRevenue, { compact: false })}
        />
        <HudStat icon="income" label="Einnahmen / Sek." value={formatRate(view.incomePerSecond)} />
        <HudStat icon="reputation" label="Rufstufe" value={view.reputation.name} />
      </div>
      <OfflineProgressNotice notice={offlineNotice} />
    </header>
  );
}

function HudStat({ icon, label, value }: { icon: GameIconName; label: string; value: string }) {
  return (
    <div className="hud-stat">
      <span>
        <GameIcon name={icon} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
