export interface Vec2 {
  x: number;
  y: number;
}

export type JardinainsGameState =
  | "menu"
  | "playing"
  | "level_complete"
  | "gameover"
  | "victory";

export type PowerUpType = "wide-paddle" | "multi-ball" | "sticky" | "extra-life";

export type GnomeState = "sitting" | "ducking" | "falling" | "caught" | "gone";

export interface PaddleState {
  x: number;
  y: number;
  width: number;
  height: number;
  baseWidth: number;
  shrinkTimer: number;
}

export interface BallState {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  alive: boolean;
  stuck: boolean;
  stuckOffset: number;
}

export interface BrickState {
  col: number;
  row: number;
  x: number;
  y: number;
  width: number;
  height: number;
  hitPoints: number;
  maxHitPoints: number;
  alive: boolean;
  hasGnome: boolean;
  hasPowerUp: boolean;
}

export interface GnomeEntity {
  x: number;
  y: number;
  state: GnomeState;
  brickCol: number;
  brickRow: number;
  potCooldown: number;
  animTimer: number;
  fallVelocity: number;
}

export interface FlowerPotEntity {
  pos: Vec2;
  vel: Vec2;
  alive: boolean;
}

export interface PowerUpEntity {
  pos: Vec2;
  vel: Vec2;
  type: PowerUpType;
  alive: boolean;
}

export interface JardinainsLevelConfig {
  level: number;
  name: string;
  brickLayout: number[][];
  gnomePositions: [number, number][];
  ballSpeed: number;
  potThrowMinInterval: number;
  potThrowMaxInterval: number;
  powerUpChance: number;
  skyGradient: [string, string];
}
