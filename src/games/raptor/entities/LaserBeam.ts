import { Vec2 } from "../types";

const BASE_TICK_RATE = 10;
const MAX_TICK_RATE = 20;
const BASE_WIDTH = 6;
const SPREAD_WIDTH = 9;

export class LaserBeam {
  public pos: Vec2;
  public active = false;
  public damage = 1;
  public beamWidth: number = BASE_WIDTH;

  private tickTimer = 0;
  private tickInterval: number;
  private time = 0;

  constructor() {
    this.pos = { x: 0, y: 0 };
    this.tickInterval = 1 / BASE_TICK_RATE;
  }

  setModifiers(rapidFire: boolean, spreadShot: boolean, tierVisualScale: number = 1.0, tierDamageMultiplier: number = 1.0): void {
    const tickRate = Math.min(
      MAX_TICK_RATE,
      BASE_TICK_RATE * (rapidFire ? 1.5 : 1)
    );
    this.tickInterval = 1 / tickRate;
    const baseWidth = spreadShot ? SPREAD_WIDTH : BASE_WIDTH;
    this.beamWidth = baseWidth * tierVisualScale;
    this.damage = 1 * tierDamageMultiplier;
  }

  updatePosition(playerX: number, playerTopY: number): void {
    this.pos.x = playerX;
    this.pos.y = playerTopY;
  }

  update(dt: number): boolean {
    if (!this.active) {
      this.tickTimer = 0;
      return false;
    }

    this.time += dt;
    this.tickTimer += dt;

    if (this.tickTimer >= this.tickInterval) {
      this.tickTimer -= this.tickInterval;
      return true;
    }

    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const beamX = this.pos.x;
    const beamBottom = this.pos.y;
    const beamTop = 0;
    const halfWidth = this.beamWidth / 2;

    ctx.save();

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

    ctx.restore();
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
  }
}
