import { BrickState, PowerUpType } from "../types";

const BRICK_COLORS: Record<number, string> = {
  1: "#4CAF50",
  2: "#FF9800",
  3: "#F44336",
};

const BRICK_DAMAGED_COLORS: Record<string, string> = {
  "2_1": "#FFB74D",
  "3_2": "#EF5350",
  "3_1": "#E57373",
};

export const BRICK_WIDTH = 68;
export const BRICK_HEIGHT = 20;
export const BRICK_PADDING = 4;
export const BRICK_OFFSET_TOP = 50;
export const BRICK_OFFSET_LEFT = 40;

export class Brick {
  public col: number;
  public row: number;
  public x: number;
  public y: number;
  public width = BRICK_WIDTH;
  public height = BRICK_HEIGHT;
  public hitPoints: number;
  public maxHitPoints: number;
  public alive = true;
  public hasGnome = false;
  public hasPowerUp = false;
  public powerUpType: PowerUpType | null = null;

  constructor(col: number, row: number, hitPoints: number) {
    this.col = col;
    this.row = row;
    this.hitPoints = hitPoints;
    this.maxHitPoints = hitPoints;
    this.x = BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING);
    this.y = BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING);
  }

  get left(): number { return this.x; }
  get right(): number { return this.x + this.width; }
  get top(): number { return this.y; }
  get bottom(): number { return this.y + this.height; }
  get centerX(): number { return this.x + this.width / 2; }
  get centerY(): number { return this.y + this.height / 2; }

  hit(): boolean {
    this.hitPoints--;
    if (this.hitPoints <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  getState(): BrickState {
    return {
      col: this.col,
      row: this.row,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      hitPoints: this.hitPoints,
      maxHitPoints: this.maxHitPoints,
      alive: this.alive,
      hasGnome: this.hasGnome,
      hasPowerUp: this.hasPowerUp,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const key = `${this.maxHitPoints}_${this.hitPoints}`;
    const color = BRICK_DAMAGED_COLORS[key] || BRICK_COLORS[this.hitPoints] || BRICK_COLORS[1];

    ctx.fillStyle = color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.fillRect(this.x, this.y, this.width, 3);
    ctx.fillRect(this.x, this.y, 3, this.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(this.x, this.y + this.height - 3, this.width, 3);
    ctx.fillRect(this.x + this.width - 3, this.y, 3, this.height);
  }
}
