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
