import { BaseBuildingGraphic } from "../BaseBuildingGraphic";
import type { BuildingGraphicProps } from "../types";

export function WorkshopBuildingGraphic(props: BuildingGraphicProps) {
  return <BaseBuildingGraphic {...props} variant="workshop" />;
}
