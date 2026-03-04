export interface Vec2 {
  x: number;
  y: number;
}

export type GameState = "menu" | "playing" | "level_complete" | "gameover" | "victory";

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
  | "low_ammo";
