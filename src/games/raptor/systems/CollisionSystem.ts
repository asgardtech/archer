import { Projectile, WEAPON_CONFIGS } from "../types";
import { Bullet } from "../entities/Bullet";
import { Missile } from "../entities/Missile";
import { PlasmaBolt } from "../entities/PlasmaBolt";
import { LaserBeam } from "../entities/LaserBeam";
import { EnemyLaserBeam } from "../entities/EnemyLaserBeam";
import { EnemyShockwave } from "../entities/EnemyShockwave";
import { Enemy, isBossVariant } from "../entities/Enemy";
import { EnemyBullet } from "../entities/EnemyBullet";
import { EnemyMissile } from "../entities/EnemyMissile";
import { Player } from "../entities/Player";
import { PowerUp } from "../entities/PowerUp";
import { SpatialGrid } from "./SpatialGrid";

export interface BulletEnemyHit {
  bullet: Projectile;
  enemy: Enemy;
  destroyed: boolean;
  damage: number;
  splash?: boolean;
}

export interface EnemyBulletPlayerHit {
  bullet: EnemyBullet;
  reflected?: boolean;
}

export interface EnemyPlayerHit {
  enemy: Enemy;
}

export interface PowerUpPlayerHit {
  powerUp: PowerUp;
}

export interface BeamLike {
  readonly isActive: boolean;
  readonly originX: number;
  readonly originY: number;
  readonly beamX: number;
  readonly beamWidth: number;
  readonly damage: number;
}

export interface EnemyBeamPlayerHit {
  beam: BeamLike;
  damage: number;
}

export interface ShockwavePlayerHit {
  shockwave: EnemyShockwave;
  damage: number;
}

export interface ReflectedBulletHit {
  bullet: EnemyBullet;
  enemy: Enemy;
  destroyed: boolean;
  damage: number;
}

export interface ProjectileEnemyMissileHit {
  projectile: Projectile;
  missile: EnemyMissile;
}

export interface SplashHit {
  enemy: Enemy;
  destroyed: boolean;
}

const BOSS_HIT_FLASH_COOLDOWN = 0.15;

export class CollisionSystem {
  private hitFlashTimers: Map<Enemy, number> = new Map();
  private enemyGrid: SpatialGrid<Enemy>;
  private queryBuffer: Enemy[] = [];

  constructor(width = 800, height = 600) {
    this.enemyGrid = new SpatialGrid<Enemy>(width, height, 8, 6);
  }

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

        if (isBossVariant(enemy.variant) && !canFlash) {
          enemy.hitPoints -= beam.damage;
          if (enemy.hitPoints <= 0) {
            enemy.hitPoints = 0;
            enemy.alive = false;
          }
        } else {
          enemy.hit(beam.damage);
        }
        hitEnemies.push(enemy);

        if (isBossVariant(enemy.variant) && canFlash) {
          this.hitFlashTimers.set(enemy, BOSS_HIT_FLASH_COOLDOWN);
        }
      }
    }

    return hitEnemies;
  }

  checkBulletsEnemies(bullets: Projectile[], enemies: Enemy[]): BulletEnemyHit[] {
    this.enemyGrid.clear();
    for (const enemy of enemies) {
      this.enemyGrid.insert(enemy);
    }

    const hits: BulletEnemyHit[] = [];

    for (const bullet of bullets) {
      if (!bullet.alive) continue;

      this.enemyGrid.beginQuery();
      this.enemyGrid.query(bullet.left, bullet.top, bullet.right, bullet.bottom, this.queryBuffer);

      for (const enemy of this.queryBuffer) {
        if (!enemy.alive) continue;
        if (this.aabb(bullet.left, bullet.top, bullet.right, bullet.bottom,
                      enemy.left, enemy.top, enemy.right, enemy.bottom)) {
          const destroyed = enemy.hit(bullet.damage);
          if (!bullet.piercing) {
            bullet.alive = false;
          }
          hits.push({ bullet, enemy, destroyed, damage: bullet.damage });

          if (bullet instanceof Missile) {
            const cfg = WEAPON_CONFIGS["missile"];
            const splashDamage = Math.ceil(bullet.damage * cfg.splashDamageRatio);
            const splashHits = this.applySplashDamage(enemy, enemies, cfg.splashRadius, splashDamage);
            for (const sh of splashHits) {
              hits.push({
                bullet,
                enemy: sh.enemy,
                destroyed: sh.destroyed,
                damage: splashDamage,
                splash: true,
              });
            }
          }

          if (bullet instanceof PlasmaBolt) {
            const cfg = WEAPON_CONFIGS["plasma"];
            const splashDamage = Math.ceil(bullet.damage * cfg.splashDamageRatio);
            const splashHits = this.applySplashDamage(enemy, enemies, cfg.splashRadius, splashDamage);
            for (const sh of splashHits) {
              hits.push({
                bullet,
                enemy: sh.enemy,
                destroyed: sh.destroyed,
                damage: splashDamage,
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

  private applySplashDamage(origin: Enemy, enemies: Enemy[], radius: number, splashDamage: number): SplashHit[] {
    if (splashDamage <= 0) return [];

    const splashHits: SplashHit[] = [];
    const r2 = radius * radius;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy === origin) continue;
      const dx = enemy.pos.x - origin.pos.x;
      const dy = enemy.pos.y - origin.pos.y;
      if (dx * dx + dy * dy <= r2) {
        const destroyed = enemy.hit(splashDamage);
        splashHits.push({ enemy, destroyed });
      }
    }

    return splashHits;
  }

  checkEnemyBulletsPlayer(bullets: EnemyBullet[], player: Player): EnemyBulletPlayerHit[] {
    if (!player.alive || player.isInvincible) return [];

    const hits: EnemyBulletPlayerHit[] = [];
    for (const bullet of bullets) {
      if (!bullet.alive || bullet.reflected) continue;
      if (this.aabb(bullet.left, bullet.top, bullet.right, bullet.bottom,
                    player.left, player.top, player.right, player.bottom)) {
        if (player.deflectorActive && !bullet.isMine && !(bullet instanceof EnemyMissile) && Math.random() < 0.4) {
          bullet.vel.x = -bullet.vel.x;
          bullet.vel.y = -bullet.vel.y;
          bullet.reflected = true;
          bullet.homing = false;
          hits.push({ bullet, reflected: true });
        } else {
          bullet.alive = false;
          hits.push({ bullet });
        }
      }
    }
    return hits;
  }

  checkReflectedBulletsEnemies(bullets: EnemyBullet[], enemies: Enemy[]): ReflectedBulletHit[] {
    this.enemyGrid.clear();
    for (const enemy of enemies) {
      this.enemyGrid.insert(enemy);
    }

    const hits: ReflectedBulletHit[] = [];
    for (const bullet of bullets) {
      if (!bullet.alive || !bullet.reflected) continue;

      this.enemyGrid.beginQuery();
      this.enemyGrid.query(bullet.left, bullet.top, bullet.right, bullet.bottom, this.queryBuffer);

      for (const enemy of this.queryBuffer) {
        if (!enemy.alive) continue;
        if (this.aabb(bullet.left, bullet.top, bullet.right, bullet.bottom,
                      enemy.left, enemy.top, enemy.right, enemy.bottom)) {
          const destroyed = enemy.hit(bullet.damage);
          bullet.alive = false;
          hits.push({ bullet, enemy, destroyed, damage: bullet.damage });
          break;
        }
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
    beams: BeamLike[],
    player: Player,
    canvasHeight: number,
    dt: number
  ): EnemyBeamPlayerHit[] {
    if (!player.alive || player.isInvincible) return [];

    const hits: EnemyBeamPlayerHit[] = [];
    const playerCenterY = (player.top + player.bottom) / 2;

    for (const beam of beams) {
      if (!beam.isActive) continue;

      const halfWidth = beam.beamWidth / 2;
      const beamTop = beam.originY;
      const beamBottom = canvasHeight;
      const totalHeight = beamBottom - beamTop;
      const t = totalHeight > 0 ? (playerCenterY - beamTop) / totalHeight : 0;
      const beamXAtPlayerY = beam.originX + (beam.beamX - beam.originX) * t;
      const beamLeft = beamXAtPlayerY - halfWidth;
      const beamRight = beamXAtPlayerY + halfWidth;

      if (this.aabb(beamLeft, beamTop, beamRight, beamBottom,
                    player.left, player.top, player.right, player.bottom)) {
        hits.push({ beam, damage: beam.damage * dt });
      }
    }
    return hits;
  }

  checkProjectilesEnemyMissiles(
    projectiles: Projectile[],
    enemyBullets: EnemyBullet[]
  ): ProjectileEnemyMissileHit[] {
    const hits: ProjectileEnemyMissileHit[] = [];

    for (const eb of enemyBullets) {
      if (!(eb instanceof EnemyMissile) || !eb.alive) continue;

      for (const proj of projectiles) {
        if (!proj.alive || proj instanceof Missile) continue;

        if (this.aabb(proj.left, proj.top, proj.right, proj.bottom,
                      eb.left, eb.top, eb.right, eb.bottom)) {
          eb.alive = false;
          if (!proj.piercing) {
            proj.alive = false;
          }
          hits.push({ projectile: proj, missile: eb });
          break;
        }
      }
    }

    return hits;
  }

  checkBeamEnemyMissiles(
    beam: LaserBeam,
    enemyBullets: EnemyBullet[],
    dt: number
  ): EnemyMissile[] {
    if (!beam.active) return [];

    const halfWidth = beam.beamWidth / 2;
    const beamLeft = beam.pos.x - halfWidth;
    const beamRight = beam.pos.x + halfWidth;
    const destroyed: EnemyMissile[] = [];

    for (const eb of enemyBullets) {
      if (!(eb instanceof EnemyMissile) || !eb.alive) continue;
      if (eb.pos.y > beam.pos.y) continue;

      if (eb.right > beamLeft && eb.left < beamRight) {
        eb.alive = false;
        destroyed.push(eb);
      }
    }

    return destroyed;
  }

  checkShockwavePlayer(
    shockwaves: EnemyShockwave[],
    player: Player
  ): ShockwavePlayerHit[] {
    if (!player.alive || player.isInvincible) return [];

    const hits: ShockwavePlayerHit[] = [];
    const playerCenterX = (player.left + player.right) / 2;
    const playerCenterY = (player.top + player.bottom) / 2;

    for (const shockwave of shockwaves) {
      if (!shockwave.alive || shockwave.hasHitPlayer) continue;

      const dx = playerCenterX - shockwave.origin.x;
      const dy = playerCenterY - shockwave.origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const innerEdge = shockwave.currentRadius - shockwave.ringWidth / 2;
      const outerEdge = shockwave.currentRadius + shockwave.ringWidth / 2;

      if (dist >= innerEdge && dist <= outerEdge) {
        shockwave.hasHitPlayer = true;
        hits.push({ shockwave, damage: shockwave.damage });
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
