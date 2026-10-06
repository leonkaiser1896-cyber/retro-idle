import { BaseBuildingGraphic } from "../BaseBuildingGraphic";
import type { BuildingGraphicProps } from "../types";

export function ClubBuildingGraphic(props: BuildingGraphicProps) {
  return <BaseBuildingGraphic {...props} variant="club" />;
}
