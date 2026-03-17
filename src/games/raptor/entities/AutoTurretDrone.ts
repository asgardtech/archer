import { Vec2, WEAPON_CONFIGS, Projectile } from "../types";
import { Enemy } from "./Enemy";
import { TrackingBullet } from "./TrackingBullet";

const ORBIT_RADIUS = 40;
const ORBIT_SPEED = 1.5;
const TURRET_COLOR = "#00e676";
const TURRET_SIZE = 12;
const BARREL_LENGTH = 10;
const BASE_FIRE_INTERVAL = 0.6;

const DRONE_MAX_HP = 50;

export class AutoTurretDrone {
  public pos: Vec2 = { x: 0, y: 0 };
  public angle = 0;
  public facingAngle = -Math.PI / 2;
  public active = false;
  public hp = DRONE_MAX_HP;
  public maxHp = DRONE_MAX_HP;

  private fireTimer = 0;
  private glowPhase = 0;

  constructor(public angleOffset: number) {
    this.angle = angleOffset;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
      return true;
    }
    return false;
  }

  resetHp(): void {
    this.hp = this.maxHp;
  }

  update(
    dt: number,
    playerPos: Vec2,
    enemies: Enemy[],
    fireRateMultiplier: number,
    rapidFire: boolean,
    spreadShot: boolean,
    tierDamage: number,
    existingProjectileCount: number,
    maxProjectiles: number
  ): { projectiles: TrackingBullet[]; fired: boolean } {
    this.angle += ORBIT_SPEED * dt;
    this.pos.x = playerPos.x + Math.cos(this.angle) * ORBIT_RADIUS;
    this.pos.y = playerPos.y + Math.sin(this.angle) * ORBIT_RADIUS;
    this.glowPhase += dt * 3;

    const target = this.findNearestEnemy(enemies);
    if (target) {
      const dx = target.pos.x - this.pos.x;
      const dy = target.pos.y - this.pos.y;
      this.facingAngle = Math.atan2(dy, dx);
    } else {
      this.facingAngle = -Math.PI / 2;
    }

    const projectiles: TrackingBullet[] = [];
    let fired = false;

    const config = WEAPON_CONFIGS["auto-turret"];
    const rapidMultiplier = rapidFire ? config.rapidFireBonus : 1;
    const interval = BASE_FIRE_INTERVAL / (fireRateMultiplier * rapidMultiplier);

    this.fireTimer += dt;

    if (target && this.fireTimer >= interval && existingProjectileCount < maxProjectiles) {
      this.fireTimer -= interval;
      fired = true;

      const bulletAngle = Math.atan2(
        -(target.pos.y - this.pos.y),
        target.pos.x - this.pos.x
      );
      const trackingAngle = Math.PI / 2 - bulletAngle;

      if (spreadShot) {
        const fanAngles = [-0.15, 0, 0.15];
        for (const offset of fanAngles) {
          const b = new TrackingBullet(this.pos.x, this.pos.y, trackingAngle + offset, config.homingStrength);
          b.damage = tierDamage;
          projectiles.push(b);
        }
      } else {
        const b = new TrackingBullet(this.pos.x, this.pos.y, trackingAngle, config.homingStrength);
        b.damage = tierDamage;
        projectiles.push(b);
      }
    }

    return { projectiles, fired };
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
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    const glowAlpha = 0.15 + Math.sin(this.glowPhase) * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, TURRET_SIZE * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 230, 118, ${glowAlpha})`;
    ctx.fill();

    ctx.rotate(this.facingAngle);

    const half = TURRET_SIZE / 2;
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(0, -half);
    ctx.lineTo(-half, 0);
    ctx.lineTo(0, half);
    ctx.closePath();
    ctx.fillStyle = TURRET_COLOR;
    ctx.fill();
    ctx.strokeStyle = "#b9f6ca";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(BARREL_LENGTH, 0);
    ctx.strokeStyle = "#b9f6ca";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
