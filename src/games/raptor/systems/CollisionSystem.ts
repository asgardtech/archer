import { Projectile, WEAPON_CONFIGS } from "../types";
import { Bullet } from "../entities/Bullet";
import { Missile } from "../entities/Missile";
import { LaserBeam } from "../entities/LaserBeam";
import { EnemyLaserBeam } from "../entities/EnemyLaserBeam";
import { Enemy } from "../entities/Enemy";
import { EnemyBullet } from "../entities/EnemyBullet";
import { Player } from "../entities/Player";
import { PowerUp } from "../entities/PowerUp";

export interface BulletEnemyHit {
  bullet: Projectile;
  enemy: Enemy;
  destroyed: boolean;
  damage: number;
  splash?: boolean;
}

export interface EnemyBulletPlayerHit {
  bullet: EnemyBullet;
}

export interface EnemyPlayerHit {
  enemy: Enemy;
}

export interface PowerUpPlayerHit {
  powerUp: PowerUp;
}

export interface EnemyBeamPlayerHit {
  beam: EnemyLaserBeam;
  damage: number;
}

export interface SplashHit {
  enemy: Enemy;
  destroyed: boolean;
}

const BOSS_HIT_FLASH_COOLDOWN = 0.15;

export class CollisionSystem {
  private hitFlashTimers: Map<Enemy, number> = new Map();

  checkBeamEnemies(beam: LaserBeam, enemies: Enemy[], dt: number): Enemy[] {
    for (const [enemy, timer] of this.hitFlashTimers.entries()) {
      if (!enemy.alive) {
        this.hitFlashTimers.delete(enemy);
      } else {
        this.hitFlashTimers.set(enemy, timer - dt);
      }
    }

    if (!beam.active) return [];

    const shouldTick = beam.update(dt);
    if (!shouldTick) return [];

    const halfWidth = beam.beamWidth / 2;
    const beamLeft = beam.pos.x - halfWidth;
    const beamRight = beam.pos.x + halfWidth;
    const hitEnemies: Enemy[] = [];

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (enemy.pos.y > beam.pos.y) continue;

      if (enemy.right > beamLeft && enemy.left < beamRight) {
        const canFlash = !this.hitFlashTimers.has(enemy) ||
          this.hitFlashTimers.get(enemy)! <= 0;

        if (enemy.variant === "boss" && !canFlash) {
          enemy.hitPoints -= beam.damage;
          if (enemy.hitPoints <= 0) {
            enemy.hitPoints = 0;
            enemy.alive = false;
          }
        } else {
          enemy.hit(beam.damage);
        }
        hitEnemies.push(enemy);

        if (enemy.variant === "boss" && canFlash) {
          this.hitFlashTimers.set(enemy, BOSS_HIT_FLASH_COOLDOWN);
        }
      }
    }

    return hitEnemies;
  }

  checkBulletsEnemies(bullets: Projectile[], enemies: Enemy[]): BulletEnemyHit[] {
    const hits: BulletEnemyHit[] = [];

    for (const bullet of bullets) {
      if (!bullet.alive) continue;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (this.aabb(bullet.left, bullet.top, bullet.right, bullet.bottom,
                      enemy.left, enemy.top, enemy.right, enemy.bottom)) {
          const destroyed = enemy.hit(bullet.damage);
          if (!bullet.piercing) {
            bullet.alive = false;
          }
          hits.push({ bullet, enemy, destroyed, damage: bullet.damage });

          if (bullet instanceof Missile) {
            const splashHits = this.applySplashDamage(enemy, enemies, WEAPON_CONFIGS["missile"].splashRadius);
            for (const sh of splashHits) {
              hits.push({
                bullet,
                enemy: sh.enemy,
                destroyed: sh.destroyed,
                damage: 1,
                splash: true,
              });
            }
          }

          if (!bullet.piercing) break;
        }
      }
    }

    return hits;
  }

  private applySplashDamage(origin: Enemy, enemies: Enemy[], radius: number): SplashHit[] {
    const splashHits: SplashHit[] = [];
    const r2 = radius * radius;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy === origin) continue;
      const dx = enemy.pos.x - origin.pos.x;
      const dy = enemy.pos.y - origin.pos.y;
      if (dx * dx + dy * dy <= r2) {
        const destroyed = enemy.hit(1);
        splashHits.push({ enemy, destroyed });
      }
    }

    return splashHits;
  }

  checkEnemyBulletsPlayer(bullets: EnemyBullet[], player: Player): EnemyBulletPlayerHit[] {
    if (!player.alive || player.isInvincible) return [];

    const hits: EnemyBulletPlayerHit[] = [];
    for (const bullet of bullets) {
      if (!bullet.alive) continue;
      if (this.aabb(bullet.left, bullet.top, bullet.right, bullet.bottom,
                    player.left, player.top, player.right, player.bottom)) {
        bullet.alive = false;
        hits.push({ bullet });
      }
    }
    return hits;
  }

  checkPlayerEnemies(player: Player, enemies: Enemy[]): EnemyPlayerHit[] {
    if (!player.alive || player.isInvincible) return [];

    const hits: EnemyPlayerHit[] = [];
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (this.aabb(player.left, player.top, player.right, player.bottom,
                    enemy.left, enemy.top, enemy.right, enemy.bottom)) {
        enemy.alive = false;
        hits.push({ enemy });
      }
    }
    return hits;
  }

  checkPlayerPowerUps(player: Player, powerUps: PowerUp[]): PowerUpPlayerHit[] {
    if (!player.alive) return [];

    const hits: PowerUpPlayerHit[] = [];
    for (const powerUp of powerUps) {
      if (!powerUp.alive) continue;
      if (this.aabb(player.left, player.top, player.right, player.bottom,
                    powerUp.left, powerUp.top, powerUp.right, powerUp.bottom)) {
        powerUp.alive = false;
        hits.push({ powerUp });
      }
    }
    return hits;
  }

  checkEnemyBeamPlayer(
    beams: EnemyLaserBeam[],
    player: Player,
    canvasHeight: number,
    dt: number
  ): EnemyBeamPlayerHit[] {
    if (!player.alive || player.isInvincible) return [];

    const hits: EnemyBeamPlayerHit[] = [];
    for (const beam of beams) {
      if (!beam.isActive) continue;

      const halfWidth = beam.beamWidth / 2;
      const beamLeft = beam.beamX - halfWidth;
      const beamRight = beam.beamX + halfWidth;
      const beamTop = beam.originY;
      const beamBottom = canvasHeight;

      if (this.aabb(beamLeft, beamTop, beamRight, beamBottom,
                    player.left, player.top, player.right, player.bottom)) {
        hits.push({ beam, damage: beam.damage * dt });
      }
    }
    return hits;
  }

  private aabb(
    l1: number, t1: number, r1: number, b1: number,
    l2: number, t2: number, r2: number, b2: number
  ): boolean {
    return l1 < r2 && r1 > l2 && t1 < b2 && b1 > t2;
  }
}
