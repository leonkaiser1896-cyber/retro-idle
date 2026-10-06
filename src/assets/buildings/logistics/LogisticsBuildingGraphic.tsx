import { BaseBuildingGraphic } from "../BaseBuildingGraphic";
import type { BuildingGraphicProps } from "../types";

export function LogisticsBuildingGraphic(props: BuildingGraphicProps) {
  return <BaseBuildingGraphic {...props} variant="logistics" />;
}
