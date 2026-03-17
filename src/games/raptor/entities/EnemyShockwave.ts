import { Vec2 } from "../types";

export class EnemyShockwave {
  public origin: Vec2;
  public currentRadius: number;
  public maxRadius: number;
  public expansionSpeed: number;
  public damage: number;
  public ringWidth = 6;
  public alive = true;
  public hasHitPlayer = false;
  public opacity = 1.0;

  private color: string;
  private time = 0;

  constructor(
    originX: number,
    originY: number,
    initialRadius: number,
    maxRadius: number,
    expansionSpeed: number,
    damage: number,
    color = "#ff6644",
  ) {
    this.origin = { x: originX, y: originY };
    this.currentRadius = initialRadius;
    this.maxRadius = maxRadius;
    this.expansionSpeed = expansionSpeed;
    this.damage = damage;
    this.color = color;
  }

  update(dt: number): void {
    if (!this.alive) return;

    this.time += dt;
    this.currentRadius += this.expansionSpeed * dt;
    this.opacity = Math.max(0, 1 - this.currentRadius / this.maxRadius);

    if (this.currentRadius >= this.maxRadius) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive || this.opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.ringWidth;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.origin.x, this.origin.y, this.currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = this.opacity * 0.7;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = this.ringWidth * 0.4;
    ctx.beginPath();
    ctx.arc(this.origin.x, this.origin.y, this.currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
