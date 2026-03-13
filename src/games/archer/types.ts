export interface Vec2 {
  x: number;
  y: number;
}

export type GameState = "loading" | "menu" | "story_intro" | "level_intro" | "playing" | "level_complete" | "gameover" | "victory" | "story_ending";

export interface EntityBase {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  alive: boolean;
}

export type BalloonVariant = "standard" | "upgrade" | "boss" | "siege";

export type UpgradeType = "multi-shot" | "piercing" | "rapid-fire" | "bonus-arrows" | "shield";

export type WeaponType = "default" | "multi-shot" | "piercing" | "rapid-fire";

export const WEAPON_SLOTS: readonly WeaponType[] = ["default", "multi-shot", "piercing", "rapid-fire"];

export type ObstacleType = "bird" | "airplane" | "ufo";

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
  | "landmark_liberated"
  | "weapon_switch"
  | "shield_activate"
  | "shield_block"
  | "siege_hit"
  | "landmark_damaged";

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
