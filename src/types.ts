export interface Vec2 {
  x: number;
  y: number;
}

export type GameState = "menu" | "playing" | "gameover";

export interface EntityBase {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  alive: boolean;
}

export type BalloonVariant = "standard" | "upgrade";

export type UpgradeType = "multi-shot" | "piercing" | "rapid-fire" | "bonus-arrows";

export interface UpgradeState {
  type: UpgradeType;
  remainingTime: number;
}
