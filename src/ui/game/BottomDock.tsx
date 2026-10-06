import { GameIcon, type GameIconName } from "../../assets/icons";
import type { GameWindowId } from "./WindowManager";

interface BottomDockProps {
  activeWindow: GameWindowId | null;
  onSelectWindow: (windowId: GameWindowId) => void;
}

const DOCK_ITEMS: Array<{ id: GameWindowId; label: string; icon: GameIconName }> = [
  { id: "businesses", label: "Betriebe", icon: "business" },
  { id: "upgrades", label: "Upgrades", icon: "upgrade" },
  { id: "managers", label: "Manager", icon: "manager" },
  { id: "reputation", label: "Ruf", icon: "reputation" },
  { id: "objectives", label: "Ziele", icon: "objectives" },
  { id: "actionLog", label: "Verlauf", icon: "log" },
  { id: "settings", label: "Spielstand", icon: "dev" },
];

export function BottomDock({ activeWindow, onSelectWindow }: BottomDockProps) {
  return (
    <nav className="bottom-dock" aria-label="Ingame-Menü">
      {DOCK_ITEMS.map((item) => (
        <button
          className={item.id === activeWindow ? "dock-button is-active" : "dock-button"}
          type="button"
          aria-pressed={item.id === activeWindow}
          key={item.id}
          onClick={() => onSelectWindow(item.id)}
        >
          <span aria-hidden="true">
            <GameIcon name={item.icon} />
          </span>
          <strong>{item.label}</strong>
        </button>
      ))}
    </nav>
  );
}
