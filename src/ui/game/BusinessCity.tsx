import type { GameViewModel } from "../../app/GameService";
import { formatCredits, formatRate } from "../formatters";
import { BusinessBuilding } from "./BusinessBuilding";

interface BusinessCityProps {
  view: GameViewModel;
  onOpenBusinesses: () => void;
  highlightedBuildingId?: string | null;
  onPurchase?: (id: string) => void;
  disabled?: boolean;
}

export function BusinessCity({
  highlightedBuildingId,
  onOpenBusinesses,
  view,
  onPurchase,
  disabled,
}: BusinessCityProps) {
  const activeCount = view.buildings.filter((building) => building.level > 0).length;

  return (
    <section className="game-city" aria-label="Retro Business City">
      <div className="city-scene-header">
        <div>
          <span>Business City · Dein Viertel</span>
          <strong>
            {activeCount} / {view.buildings.length} Betriebe aktiv
          </strong>
        </div>
        <div>
          <span>Produktion</span>
          <strong>{formatRate(view.incomePerSecond)}</strong>
        </div>
        <div>
          <span>Kasse</span>
          <strong>{formatCredits(view.pendingRevenue, { compact: false })}</strong>
        </div>
      </div>

      <div className="city-scene-stage">
        <div className="city-atmosphere" aria-hidden="true">
          <span className="city-star city-star-a" />
          <span className="city-star city-star-b" />
          <span className="city-star city-star-c" />
          <span className="city-haze city-haze-a" />
          <span className="city-haze city-haze-b" />
        </div>
        <div className="city-moon" aria-hidden="true" />
        <div className="city-building-row">
          {view.buildings.map((building) => (
            <BusinessBuilding
              generator={building}
              highlighted={building.id === highlightedBuildingId}
              key={building.id}
              onOpen={onOpenBusinesses}
              onBuy={onPurchase}
              disabled={disabled}
            />
          ))}
        </div>
        <div className="city-road" aria-hidden="true">
          <span />
          <span />
          <span />
          <i className="city-car city-car-a" />
          <i className="city-car city-car-b" />
        </div>
      </div>
    </section>
  );
}
