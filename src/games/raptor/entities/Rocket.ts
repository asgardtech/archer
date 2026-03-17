import { Vec2, Projectile, WeaponType } from "../types";
import { Enemy } from "./Enemy";

const ROCKET_SPEED = 450;

export class Rocket implements Projectile {
  public pos: Vec2;
  public alive = true;
  public width = 10;
  public height = 18;
  public damage = 5;
  public piercing = false;
  public sourceWeapon: WeaponType = "rocket";

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
    this.vx = Math.sin(angle) * ROCKET_SPEED;
    this.vy = -Math.cos(angle) * ROCKET_SPEED;
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
    const tailOffset = this.height / 2 + 2;
    return {
      x: this.pos.x - Math.sin(this.angle) * tailOffset,
      y: this.pos.y + Math.cos(this.angle) * tailOffset,
    };
  }

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

    this.vx = Math.sin(this.angle) * ROCKET_SPEED;
    this.vy = -Math.cos(this.angle) * ROCKET_SPEED;

    this.pos.x += this.vx * dt;
    this.pos.y += this.vy * dt;

    if (
      this.pos.y < -30 || this.pos.x < -30 ||
      this.pos.x > canvasWidth + 30 || this.pos.y > canvasHeight + 30
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
    ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
    ctx.restore();
  }

  private renderFallback(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = "#3d5c2e";
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 3);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffaa33";
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 3, -this.height / 6);
    ctx.lineTo(this.width / 3, -this.height / 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2e4a20";
    ctx.fillRect(-this.width / 2 - 2, this.height / 4, 4, this.height / 4);
    ctx.fillRect(this.width / 2 - 2, this.height / 4, 4, this.height / 4);

    ctx.fillStyle = "#ff4400";
    ctx.shadowColor = "#ff4400";
    ctx.shadowBlur = 8;
    const flicker = 4 + Math.sin(this.time * 30) * 3;
    ctx.beginPath();
    ctx.moveTo(-this.width / 3, this.height / 2);
    ctx.lineTo(0, this.height / 2 + flicker);
    ctx.lineTo(this.width / 3, this.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
