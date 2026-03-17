import { Vec2, Projectile, WeaponType } from "../types";
import { Enemy } from "./Enemy";

const BULLET_SPEED = 500;

export class Bullet implements Projectile {
  public pos: Vec2;
  public alive = true;
  public width = 4;
  public height = 10;
  public damage = 1;
  public piercing = false;
  public sourceWeapon: WeaponType = "machine-gun";

  private angle: number;
  private vx: number;
  private vy: number;
  public readonly homingStrength: number;
  private sprite: HTMLImageElement | null = null;

  constructor(x: number, y: number, angle = 0, homingStrength = 0) {
    this.pos = { x, y };
    this.angle = angle;
    this.homingStrength = homingStrength;
    this.vx = Math.sin(angle) * BULLET_SPEED;
    this.vy = -Math.cos(angle) * BULLET_SPEED;
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  update(dt: number, canvasWidth = 800, canvasHeight = 600, enemies?: Enemy[]): void {
    if (!this.alive) return;

    if (this.homingStrength > 0 && enemies && enemies.length > 0) {
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

    this.vx = Math.sin(this.angle) * BULLET_SPEED;
    this.vy = -Math.cos(this.angle) * BULLET_SPEED;

    this.pos.x += this.vx * dt;
    this.pos.y += this.vy * dt;

    if (this.pos.y < -20 || this.pos.x < -20 || this.pos.x > canvasWidth + 20 || this.pos.y > canvasHeight + 20) {
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
    if (this.angle !== 0) {
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(this.angle);
      ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.drawImage(
        this.sprite!,
        this.pos.x - this.width / 2,
        this.pos.y - this.height / 2,
        this.width,
        this.height
      );
    }
    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = "#ffdd00";
    ctx.shadowColor = "#ffdd00";
    ctx.shadowBlur = 4;
    ctx.fillRect(this.pos.x - this.width / 2, this.pos.y - this.height / 2, this.width, this.height);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(this.pos.x - 1, this.pos.y - this.height / 2, 2, this.height * 0.6);
    ctx.restore();
  }
}
