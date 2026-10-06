export type BuildingAssetId = "kiosk" | "workshop" | "logistics" | "club" | "company";

export interface BuildingGraphicProps {
  tier: 0 | 1 | 2 | 3 | 4;
  active: boolean;
  locked: boolean;
}
