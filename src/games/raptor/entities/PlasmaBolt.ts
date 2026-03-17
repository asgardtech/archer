import { Vec2, Projectile, WeaponType } from "../types";
import { Enemy } from "./Enemy";

const PLASMA_SPEED = 400;

export class PlasmaBolt implements Projectile {
  public pos: Vec2;
  public alive = true;
  public width = 8;
  public height = 8;
  public damage = 2;
  public piercing = false;
  public sourceWeapon: WeaponType = "plasma";

  private angle: number;
  private vx: number;
  private vy: number;
  private homingStrength: number;
  private sprite: HTMLImageElement | null = null;
  private time = 0;

  constructor(x: number, y: number, angle = 0, homingStrength = 0) {
    this.pos = { x, y };
    this.angle = angle;
    this.homingStrength = homingStrength;
    this.vx = Math.sin(angle) * PLASMA_SPEED;
    this.vy = -Math.cos(angle) * PLASMA_SPEED;
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
    this.time += dt;

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

    this.vx = Math.sin(this.angle) * PLASMA_SPEED;
    this.vy = -Math.cos(this.angle) * PLASMA_SPEED;

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
    ctx.translate(this.pos.x, this.pos.y);
    if (this.angle !== 0) {
      ctx.rotate(this.angle);
    }
    ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const pulse = 1 + Math.sin(this.time * 12) * 0.15;
    const r = (this.width / 2) * pulse;

    ctx.shadowColor = "#9b59b6";
    ctx.shadowBlur = 4 + Math.sin(this.time * 10) * 4;

    const grad = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, r
    );
    grad.addColorStop(0, "#c77dff");
    grad.addColorStop(1, "#7b2ff7");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.3 + Math.sin(this.time * 8) * 0.15;
    ctx.strokeStyle = "#c77dff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
