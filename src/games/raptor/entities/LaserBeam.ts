import { Vec2 } from "../types";
import { Enemy } from "./Enemy";

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
  private rapidFire = false;
  private spreadShot = false;
  private time = 0;
  private hitFlashTimers: Map<Enemy, number> = new Map();

  constructor() {
    this.pos = { x: 0, y: 0 };
    this.tickInterval = 1 / BASE_TICK_RATE;
  }

  setModifiers(rapidFire: boolean, spreadShot: boolean): void {
    this.rapidFire = rapidFire;
    this.spreadShot = spreadShot;

    const tickRate = Math.min(
      MAX_TICK_RATE,
      BASE_TICK_RATE * (rapidFire ? 1.5 : 1)
    );
    this.tickInterval = 1 / tickRate;
    this.beamWidth = spreadShot ? SPREAD_WIDTH : BASE_WIDTH;
  }

  updatePosition(playerX: number, playerTopY: number): void {
    this.pos.x = playerX;
    this.pos.y = playerTopY;
  }

  update(dt: number, enemies: Enemy[]): Enemy[] {
    if (!this.active) {
      this.tickTimer = 0;
      return [];
    }

    this.time += dt;
    this.tickTimer += dt;

    for (const [enemy, timer] of this.hitFlashTimers.entries()) {
      if (!enemy.alive) {
        this.hitFlashTimers.delete(enemy);
      } else {
        this.hitFlashTimers.set(enemy, timer - dt);
      }
    }

    const hitEnemies: Enemy[] = [];
    if (this.tickTimer >= this.tickInterval) {
      this.tickTimer -= this.tickInterval;

      const halfWidth = this.beamWidth / 2;
      const beamLeft = this.pos.x - halfWidth;
      const beamRight = this.pos.x + halfWidth;

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (enemy.pos.y > this.pos.y) continue;

        if (enemy.right > beamLeft && enemy.left < beamRight) {
          const canFlash = !this.hitFlashTimers.has(enemy) ||
            this.hitFlashTimers.get(enemy)! <= 0;

          if (enemy.variant === "boss" && !canFlash) {
            enemy.hitPoints -= this.damage;
            if (enemy.hitPoints <= 0) {
              enemy.hitPoints = 0;
              enemy.alive = false;
            }
          } else {
            enemy.hit(this.damage);
          }
          hitEnemies.push(enemy);

          if (enemy.variant === "boss") {
            this.hitFlashTimers.set(enemy, 0.15);
          }
        }
      }
    }

    return hitEnemies;
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

  reset(): void {
    this.active = false;
    this.tickTimer = 0;
    this.time = 0;
    this.beamWidth = BASE_WIDTH;
    this.hitFlashTimers.clear();
  }
}
