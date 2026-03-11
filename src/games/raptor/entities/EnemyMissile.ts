import { Vec2 } from "../types";
import { EnemyBullet, EnemyBulletOptions } from "./EnemyBullet";

export interface EnemyMissileOptions extends EnemyBulletOptions {
  maxTrackingDuration?: number;
}

const DEFAULT_MISSILE_RADIUS = 7;
const DEFAULT_MAX_TRACKING = 3.0;

export class EnemyMissile extends EnemyBullet {
  public readonly maxTrackingDuration: number;
  private trackingElapsed = 0;

  constructor(
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    options?: EnemyMissileOptions,
  ) {
    super(x, y, targetX, targetY, {
      ...options,
      radius: options?.radius ?? DEFAULT_MISSILE_RADIUS,
      homing: options?.homing ?? true,
      fallbackColor: options?.fallbackColor ?? "#ff8800",
    });
    this.maxTrackingDuration =
      options?.maxTrackingDuration ?? DEFAULT_MAX_TRACKING;
  }

  override update(
    dt: number,
    canvasWidth: number,
    canvasHeight: number,
    playerPos?: Vec2,
  ): void {
    if (!this.alive) return;
    this.trackingElapsed += dt;

    if (this.trackingElapsed >= this.maxTrackingDuration) {
      this.homing = false;
    }

    super.update(dt, canvasWidth, canvasHeight, playerPos);
  }

  override render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.sprite) {
      this.renderMissileSprite(ctx);
    } else {
      this.renderMissileFallback(ctx);
    }
  }

  private renderMissileSprite(ctx: CanvasRenderingContext2D): void {
    const size = this.radius * 2;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(-this.angle);
    ctx.drawImage(this.sprite!, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  private renderMissileFallback(ctx: CanvasRenderingContext2D): void {
    const r = this.radius;
    const bodyLen = r * 2.5;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(-this.angle);

    ctx.fillStyle = "#ff8800";
    ctx.beginPath();
    ctx.moveTo(0, bodyLen / 2);
    ctx.lineTo(-r * 0.6, -bodyLen / 2);
    ctx.lineTo(0, -bodyLen * 0.35);
    ctx.lineTo(r * 0.6, -bodyLen / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffcc44";
    ctx.beginPath();
    ctx.moveTo(0, bodyLen / 2);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(r * 0.3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ff4400";
    ctx.shadowColor = "#ff4400";
    ctx.shadowBlur = 6;
    const flicker = r * 0.6 + Math.sin(this.time * 30) * r * 0.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -bodyLen * 0.35);
    ctx.lineTo(0, -bodyLen * 0.35 - flicker);
    ctx.lineTo(r * 0.3, -bodyLen * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
