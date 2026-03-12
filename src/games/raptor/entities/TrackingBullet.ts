import { Vec2, Projectile } from "../types";
import { Enemy } from "./Enemy";

const TRACKING_BULLET_SPEED = 480;

export class TrackingBullet implements Projectile {
  public pos: Vec2;
  public alive = true;
  public width = 3;
  public height = 8;
  public damage = 1;
  public piercing = false;

  private angle: number;
  private vx: number;
  private vy: number;
  private homingStrength: number;
  private sprite: HTMLImageElement | null = null;
  private time = 0;

  constructor(x: number, y: number, angle = 0, homingStrength = 1.8) {
    this.pos = { x, y };
    this.angle = angle;
    this.homingStrength = homingStrength;
    this.vx = Math.sin(angle) * TRACKING_BULLET_SPEED;
    this.vy = -Math.cos(angle) * TRACKING_BULLET_SPEED;
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  public get heading(): number { return this.angle; }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  getExhaustPosition(): Vec2 {
    const tailOffset = this.height / 2 + 1;
    return {
      x: this.pos.x - Math.sin(this.angle) * tailOffset,
      y: this.pos.y + Math.cos(this.angle) * tailOffset,
    };
  }

  update(dt: number, canvasWidth = 800, canvasHeight = 600, enemies?: Enemy[]): void {
    if (!this.alive) return;
    this.time += dt;

    if (enemies && enemies.length > 0) {
      const target = this.findNearestEnemy(enemies);
      if (target) {
        const desiredAngle = Math.atan2(
          target.pos.x - this.pos.x,
          -(target.pos.y - this.pos.y)
        );
        let angleDiff = desiredAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const maxTurn = this.homingStrength * dt;
        this.angle += Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
      }
    }

    this.vx = Math.sin(this.angle) * TRACKING_BULLET_SPEED;
    this.vy = -Math.cos(this.angle) * TRACKING_BULLET_SPEED;

    this.pos.x += this.vx * dt;
    this.pos.y += this.vy * dt;

    if (
      this.pos.y < -20 ||
      this.pos.x < -20 ||
      this.pos.x > canvasWidth + 20 ||
      this.pos.y > canvasHeight + 20
    ) {
      this.alive = false;
    }
  }

  private findNearestEnemy(enemies: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.pos.x - this.pos.x;
      const dy = enemy.pos.y - this.pos.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    return nearest;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.sprite) {
      this.renderSprite(ctx);
    } else {
      this.renderFallback(ctx);
    }
  }

  private renderSprite(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.drawImage(
      this.sprite!,
      -this.width / 2, -this.height / 2,
      this.width, this.height
    );
    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#a8e06c";
    ctx.shadowColor = "#a8e06c";
    ctx.shadowBlur = 4;
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = "#e0ffc0";
    ctx.fillRect(-1, -this.height / 2, 2, this.height * 0.5);
    ctx.restore();
  }
}
