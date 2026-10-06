import { BaseBuildingGraphic } from "../BaseBuildingGraphic";
import type { BuildingGraphicProps } from "../types";

export function CompanyBuildingGraphic(props: BuildingGraphicProps) {
  return <BaseBuildingGraphic {...props} variant="company" />;
}
