import { Vec2 } from "../types";

const BASE_TICK_RATE = 10;
const MAX_TICK_RATE = 20;
const BASE_WIDTH = 6;
const SPREAD_WIDTH = 9;
const MAX_LASER_AIM_ANGLE = Math.PI / 6;

export class LaserBeam {
  public pos: Vec2;
  public active = false;
  public damage = 1;
  public beamWidth: number = BASE_WIDTH;
  public currentAngle = 0;
  public targetAngle = 0;
  public trackingSpeed = 1.5;

  private tickTimer = 0;
  private tickInterval: number;
  private time = 0;

  constructor() {
    this.pos = { x: 0, y: 0 };
    this.tickInterval = 1 / BASE_TICK_RATE;
  }

  setModifiers(rapidFire: boolean, spreadShot: boolean, tierVisualScale: number = 1.0, tierDamageMultiplier: number = 1.0, rapidFireBonus: number = 1.8): void {
    const tickRate = Math.min(
      MAX_TICK_RATE,
      BASE_TICK_RATE * (rapidFire ? rapidFireBonus : 1)
    );
    this.tickInterval = 1 / tickRate;
    const baseWidth = spreadShot ? SPREAD_WIDTH : BASE_WIDTH;
    this.beamWidth = baseWidth * tierVisualScale;
    this.damage = 1 * tierDamageMultiplier;
  }

  setTarget(enemyX: number, enemyY: number): void {
    const dx = enemyX - this.pos.x;
    const dy = this.pos.y - enemyY;
    if (dy <= 0) {
      this.targetAngle = 0;
      return;
    }
    const angle = Math.atan2(dx, dy);
    this.targetAngle = Math.max(-MAX_LASER_AIM_ANGLE, Math.min(MAX_LASER_AIM_ANGLE, angle));
  }

  clearTarget(): void {
    this.targetAngle = 0;
  }

  updatePosition(playerX: number, playerTopY: number): void {
    this.pos.x = playerX;
    this.pos.y = playerTopY;
  }

  updateAngle(dt: number): void {
    if (Math.abs(this.targetAngle - this.currentAngle) < 0.001) {
      this.currentAngle = this.targetAngle;
      return;
    }
    let angleDiff = this.targetAngle - this.currentAngle;
    const maxTurn = this.trackingSpeed * dt;
    this.currentAngle += Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
  }

  getBeamEndpoint(): Vec2 {
    const beamLength = this.pos.y + 50;
    return {
      x: this.pos.x + Math.sin(this.currentAngle) * beamLength,
      y: this.pos.y - Math.cos(this.currentAngle) * beamLength,
    };
  }

  update(dt: number): boolean {
    if (!this.active) {
      this.tickTimer = 0;
      return false;
    }

    this.time += dt;
    this.updateAngle(dt);
    this.tickTimer += dt;

    if (this.tickTimer >= this.tickInterval) {
      this.tickTimer -= this.tickInterval;
      return true;
    }

    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const beamBottom = this.pos.y;
    const halfWidth = this.beamWidth / 2;

    ctx.save();

    if (Math.abs(this.currentAngle) < 0.001) {
      this.renderStraightBeam(ctx, halfWidth, beamBottom);
    } else {
      this.renderAngledBeam(ctx, halfWidth, beamBottom);
    }

    ctx.restore();
  }

  private renderStraightBeam(ctx: CanvasRenderingContext2D, halfWidth: number, beamBottom: number): void {
    const beamX = this.pos.x;
    const beamTop = 0;
    const pulse = 0.6 + Math.sin(this.time * 20) * 0.15;

    const outerGlow = ctx.createLinearGradient(beamX - halfWidth * 2, 0, beamX + halfWidth * 2, 0);
    outerGlow.addColorStop(0, "rgba(0, 150, 255, 0)");
    outerGlow.addColorStop(0.3, `rgba(0, 150, 255, ${0.15 * pulse})`);
    outerGlow.addColorStop(0.5, `rgba(100, 200, 255, ${0.3 * pulse})`);
    outerGlow.addColorStop(0.7, `rgba(0, 150, 255, ${0.15 * pulse})`);
    outerGlow.addColorStop(1, "rgba(0, 150, 255, 0)");
    ctx.fillStyle = outerGlow;
    ctx.fillRect(beamX - halfWidth * 2, beamTop, halfWidth * 4, beamBottom - beamTop);

    ctx.fillStyle = `rgba(100, 200, 255, ${0.5 * pulse})`;
    ctx.fillRect(beamX - halfWidth, beamTop, this.beamWidth, beamBottom - beamTop);

    const coreWidth = halfWidth * 0.5;
    ctx.fillStyle = `rgba(220, 240, 255, ${0.8 * pulse})`;
    ctx.fillRect(beamX - coreWidth, beamTop, coreWidth * 2, beamBottom - beamTop);
  }

  private renderAngledBeam(ctx: CanvasRenderingContext2D, halfWidth: number, beamBottom: number): void {
    const pulse = 0.6 + Math.sin(this.time * 20) * 0.15;
    const beamLength = this.pos.y + 50;

    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.currentAngle);

    const outerGlow = ctx.createLinearGradient(-halfWidth * 2, 0, halfWidth * 2, 0);
    outerGlow.addColorStop(0, "rgba(0, 150, 255, 0)");
    outerGlow.addColorStop(0.3, `rgba(0, 150, 255, ${0.15 * pulse})`);
    outerGlow.addColorStop(0.5, `rgba(100, 200, 255, ${0.3 * pulse})`);
    outerGlow.addColorStop(0.7, `rgba(0, 150, 255, ${0.15 * pulse})`);
    outerGlow.addColorStop(1, "rgba(0, 150, 255, 0)");
    ctx.fillStyle = outerGlow;
    ctx.fillRect(-halfWidth * 2, -beamLength, halfWidth * 4, beamLength);

    ctx.fillStyle = `rgba(100, 200, 255, ${0.5 * pulse})`;
    ctx.fillRect(-halfWidth, -beamLength, this.beamWidth, beamLength);

    const coreWidth = halfWidth * 0.5;
    ctx.fillStyle = `rgba(220, 240, 255, ${0.8 * pulse})`;
    ctx.fillRect(-coreWidth, -beamLength, coreWidth * 2, beamLength);
  }

  resetTimers(): void {
    this.tickTimer = 0;
    this.time = 0;
  }

  reset(): void {
    this.active = false;
    this.tickTimer = 0;
    this.time = 0;
    this.beamWidth = BASE_WIDTH;
    this.currentAngle = 0;
    this.targetAngle = 0;
  }
}
