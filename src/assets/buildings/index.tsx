import type { BuildingAssetId, BuildingGraphicProps } from "./types";
import type { ReactElement } from "react";
import { ClubBuildingGraphic } from "./club/ClubBuildingGraphic";
import { CompanyBuildingGraphic } from "./company/CompanyBuildingGraphic";
import { KioskBuildingGraphic } from "./kiosk/KioskBuildingGraphic";
import { LogisticsBuildingGraphic } from "./logistics/LogisticsBuildingGraphic";
import { WorkshopBuildingGraphic } from "./workshop/WorkshopBuildingGraphic";

const BUILDING_GRAPHICS = {
  kiosk: KioskBuildingGraphic,
  workshop: WorkshopBuildingGraphic,
  logistics: LogisticsBuildingGraphic,
  club: ClubBuildingGraphic,
  company: CompanyBuildingGraphic,
} satisfies Record<BuildingAssetId, (props: BuildingGraphicProps) => ReactElement>;

interface BusinessBuildingAssetProps extends BuildingGraphicProps {
  buildingId: string;
}

export function BusinessBuildingAsset({ active, buildingId, locked, tier }: BusinessBuildingAssetProps) {
  const Graphic = isBuildingAssetId(buildingId) ? BUILDING_GRAPHICS[buildingId] : KioskBuildingGraphic;

  return (
    <span className="building-asset" aria-hidden="true">
      <Graphic active={active} locked={locked} tier={tier} />
    </span>
  );
}

function isBuildingAssetId(value: string): value is BuildingAssetId {
  return value in BUILDING_GRAPHICS;
}
