import { Projectile, WEAPON_CONFIGS, BeamLike } from "../types";
import { Bullet } from "../entities/Bullet";
import { Missile } from "../entities/Missile";
import { PlasmaBolt } from "../entities/PlasmaBolt";
import { LaserBeam } from "../entities/LaserBeam";
import { EnemyShockwave } from "../entities/EnemyShockwave";
import { EnemyChainBolt } from "../entities/EnemyChainBolt";
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

export interface EnemyBeamPlayerHit {
  beam: BeamLike;
  damage: number;
}

export interface ShockwavePlayerHit {
  shockwave: EnemyShockwave;
  damage: number;
}

export interface ChainArcTarget {
  pos: { x: number; y: number };
  active: boolean;
  takeDamage?: (amount: number) => boolean;
}

export interface ChainArcHit {
  target: ChainArcTarget;
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

function getAuraDamageMultiplier(target: Enemy, enemies: Enemy[]): number {
  if (target.variant === "sentinel") return 1.0;
  const r2 = Enemy.SENTINEL_AURA_RADIUS * Enemy.SENTINEL_AURA_RADIUS;
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.variant !== "sentinel") continue;
    const dx = enemy.pos.x - target.pos.x;
    const dy = enemy.pos.y - target.pos.y;
    if (dx * dx + dy * dy <= r2) {
      return 0.5;
    }
  }
  return 1.0;
}

export { getAuraDamageMultiplier };

export class CollisionSystem {
  private hitFlashTimers: Map<Enemy, number> = new Map();
  private enemyGrid: SpatialGrid<Enemy>;
  private queryBuffer: Enemy[] = [];
  private activeBarriers: { x: number; y: number; width: number; height: number }[] = [];

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
        let blockedByBarrier = false;
        for (const barrier of this.activeBarriers) {
          const bLeft = barrier.x - barrier.width / 2;
          const bRight = barrier.x + barrier.width / 2;
          if (enemy.right > bLeft && enemy.left < bRight && enemy.pos.y < barrier.y) {
            blockedByBarrier = true;
            break;
          }
        }
        if (blockedByBarrier) continue;

        const canFlash = !this.hitFlashTimers.has(enemy) ||
          this.hitFlashTimers.get(enemy)! <= 0;

        const auraMult = getAuraDamageMultiplier(enemy, enemies);
        let effectiveBeamDmg = Math.max(1, Math.floor(beam.damage * auraMult));

        if (enemy.variant === "boss_shadow" && enemy.isShadowCloaked()) {
          effectiveBeamDmg = Math.max(1, Math.floor(effectiveBeamDmg * 0.25));
        }
        if (enemy.variant === "boss_behemoth" && enemy.isBehemothShielded()) {
          effectiveBeamDmg = Math.max(1, Math.floor(effectiveBeamDmg * 0.25));
        }
        if (enemy.variant === "boss_architect" && enemy.isArchitectExposed()) {
          effectiveBeamDmg = Math.floor(effectiveBeamDmg * 2.0);
        }
        if (enemy.variant === "boss_hydra") {
          const podPositions = enemy.getHydraPodPositions();
          const podRadius = 10;
          let hitPod = false;
          for (let pi = 0; pi < podPositions.length; pi++) {
            if (!enemy.isHydraPodAlive(pi)) continue;
            const pp = podPositions[pi];
            if (pp.x + podRadius > beamLeft && pp.x - podRadius < beamRight && pp.y < beam.pos.y) {
              enemy.hitHydraPod(pi, effectiveBeamDmg);
              hitPod = true;
            }
          }
          if (!hitPod && !enemy.isHydraVulnerable()) {
            const anyPodAlive = enemy.isHydraPodAlive(0) || enemy.isHydraPodAlive(1) || enemy.isHydraPodAlive(2);
            if (anyPodAlive) {
              effectiveBeamDmg = Math.max(1, Math.floor(effectiveBeamDmg * 0.5));
            }
          }
        }

        if (isBossVariant(enemy.variant) && !canFlash) {
          enemy.hitPoints -= effectiveBeamDmg;
          if (enemy.hitPoints <= 0) {
            enemy.hitPoints = 0;
            enemy.alive = false;
          }
        } else {
          enemy.hit(effectiveBeamDmg);
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
          const auraMult = getAuraDamageMultiplier(enemy, enemies);
          let effectiveDamage = Math.max(1, Math.floor(bullet.damage * auraMult));
          if (enemy.variant === "colossus") {
            const projCenterY = (bullet.top + bullet.bottom) / 2;
            if (projCenterY < enemy.pos.y) {
              effectiveDamage = Math.max(1, Math.floor(effectiveDamage * 0.5));
            }
          }
          if (enemy.variant === "boss_shadow" && enemy.isShadowCloaked()) {
            effectiveDamage = Math.max(1, Math.floor(effectiveDamage * 0.25));
          }
          if (enemy.variant === "boss_behemoth" && enemy.isBehemothShielded()) {
            effectiveDamage = Math.max(1, Math.floor(effectiveDamage * 0.25));
          }
          if (enemy.variant === "boss_architect" && enemy.isArchitectExposed()) {
            effectiveDamage = Math.floor(effectiveDamage * 2.0);
          }
          if (enemy.variant === "boss_hydra") {
            const podPositions = enemy.getHydraPodPositions();
            let hitPod = false;
            const bx = (bullet.left + bullet.right) / 2;
            const by = (bullet.top + bullet.bottom) / 2;
            for (let pi = 0; pi < 3; pi++) {
              if (!enemy.isHydraPodAlive(pi)) continue;
              const pdx = bx - podPositions[pi].x;
              const pdy = by - podPositions[pi].y;
              if (Math.abs(pdx) < 10 && Math.abs(pdy) < 10) {
                enemy.hitHydraPod(pi, effectiveDamage);
                hitPod = true;
                if (!bullet.piercing) bullet.alive = false;
                hits.push({ bullet, enemy, destroyed: false, damage: effectiveDamage });
                break;
              }
            }
            if (hitPod) {
              if (!bullet.piercing) break;
              continue;
            }
            if (!enemy.isHydraVulnerable()) {
              const anyPodAlive = enemy.isHydraPodAlive(0) || enemy.isHydraPodAlive(1) || enemy.isHydraPodAlive(2);
              if (anyPodAlive) {
                effectiveDamage = Math.max(1, Math.floor(effectiveDamage * 0.5));
              }
            }
          }
          const destroyed = enemy.hit(effectiveDamage);
          if (!bullet.piercing) {
            bullet.alive = false;
          }
          hits.push({ bullet, enemy, destroyed, damage: effectiveDamage });

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
        const auraMult = getAuraDamageMultiplier(enemy, enemies);
        const effectiveSplash = Math.max(1, Math.floor(splashDamage * auraMult));
        const destroyed = enemy.hit(effectiveSplash);
        splashHits.push({ enemy, destroyed });
      }
    }

    return splashHits;
  }

  checkBarrierAbsorption(bullets: Projectile[], enemies: Enemy[]): void {
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.variant !== "warden") continue;
      const barrier = enemy.getBarrierRect();
      if (!barrier) continue;

      const bLeft = barrier.x - barrier.width / 2;
      const bRight = barrier.x + barrier.width / 2;
      const bTop = barrier.y - barrier.height / 2;
      const bBottom = barrier.y + barrier.height / 2;

      for (const bullet of bullets) {
        if (!bullet.alive) continue;
        if (this.aabb(bullet.left, bullet.top, bullet.right, bullet.bottom,
                      bLeft, bTop, bRight, bBottom)) {
          enemy.barrierHP = Math.max(0, enemy.barrierHP - bullet.damage);
          bullet.alive = false;
        }
      }
    }
  }

  checkBeamBarrierBlock(beam: LaserBeam, enemies: Enemy[], dt: number): void {
    this.activeBarriers.length = 0;
    if (!beam.active) return;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.variant !== "warden") continue;
      const barrier = enemy.getBarrierRect();
      if (!barrier) continue;

      const halfWidth = beam.beamWidth / 2;
      const beamLeft = beam.pos.x - halfWidth;
      const beamRight = beam.pos.x + halfWidth;
      const bLeft = barrier.x - barrier.width / 2;
      const bRight = barrier.x + barrier.width / 2;

      if (beamRight > bLeft && beamLeft < bRight && barrier.y < beam.pos.y) {
        enemy.barrierHP = Math.max(0, enemy.barrierHP - beam.damage * dt);
        this.activeBarriers.push(barrier);
      }
    }
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

  checkChainArc(
    bolt: EnemyChainBolt,
    playerPos: { x: number; y: number },
    targets: ChainArcTarget[],
    arcRange = 120
  ): ChainArcHit[] {
    const hits: ChainArcHit[] = [];
    const arcDamage = bolt.damage * bolt.arcDamageRatio;
    const r2 = arcRange * arcRange;

    for (const target of targets) {
      if (!target.active) continue;
      const dx = target.pos.x - playerPos.x;
      const dy = target.pos.y - playerPos.y;
      if (dx * dx + dy * dy <= r2) {
        hits.push({ target, damage: arcDamage });
      }
    }
    return hits;
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
