export interface Vec2 {
  x: number;
  y: number;
}

export type GameState = "loading" | "menu" | "story_intro" | "level_intro" | "playing" | "level_complete" | "gameover" | "victory";

export interface EntityBase {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  alive: boolean;
}

export type BalloonVariant = "standard" | "upgrade" | "boss";

export type UpgradeType = "multi-shot" | "piercing" | "rapid-fire" | "bonus-arrows";

export type ObstacleType = "bird" | "airplane" | "ufo";

export interface UpgradeState {
  type: UpgradeType;
  remainingTime: number;
}

export interface PersistentUpgradeState {
  type: UpgradeType;
  remainingTime: number;
  cooldownRemaining: number;
  isPermanent: boolean;
}

export type UpgradeCollectionMap = Record<UpgradeType, number>;

export type SoundEvent =
  | "arrow_shoot"
  | "balloon_pop"
  | "upgrade_pop"
  | "boss_hit"
  | "boss_kill"
  | "obstacle_hit"
  | "upgrade_activate"
  | "ammo_gain"
  | "level_complete"
  | "game_over"
  | "victory"
  | "menu_start"
  | "low_ammo"
  | "landmark_liberated";

export type LandmarkType = "windmill" | "treehouse" | "watchtower" | "lighthouse" | "castle";

export interface LandmarkConfig {
  type: LandmarkType;
  label: string;
  description: string;
  positionX: number;
  hitPoints: number;
}

export const GROUND_HEIGHT = 35;

export interface TerrainStyle {
  type: "meadow" | "forest" | "mountains" | "storm" | "sky_fortress";
  /** Base fill color for the ground body */
  baseColor: string;
  /** Darker shade for the terrain surface/edge line */
  surfaceColor: string;
  /** Accent color for decorative details (flowers, snow, puddles, etc.) */
  accentColor: string;
}
