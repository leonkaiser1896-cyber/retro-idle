import { BaseBuildingGraphic } from "../BaseBuildingGraphic";
import type { BuildingGraphicProps } from "../types";

export function KioskBuildingGraphic(props: BuildingGraphicProps) {
  return <BaseBuildingGraphic {...props} variant="kiosk" />;
}
