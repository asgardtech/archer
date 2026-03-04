import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import { EnemyBullet } from "../entities/EnemyBullet";
import { Player } from "../entities/Player";
import { PowerUp } from "../entities/PowerUp";

export interface BulletEnemyHit {
  bullet: Bullet;
  enemy: Enemy;
  destroyed: boolean;
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

export class CollisionSystem {
  checkBulletsEnemies(bullets: Bullet[], enemies: Enemy[]): BulletEnemyHit[] {
    const hits: BulletEnemyHit[] = [];

    for (const bullet of bullets) {
      if (!bullet.alive) continue;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (this.aabb(bullet.left, bullet.top, bullet.right, bullet.bottom,
                      enemy.left, enemy.top, enemy.right, enemy.bottom)) {
          const destroyed = enemy.hit();
          bullet.alive = false;
          hits.push({ bullet, enemy, destroyed });
          break;
        }
      }
    }

    return hits;
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

  private aabb(
    l1: number, t1: number, r1: number, b1: number,
    l2: number, t2: number, r2: number, b2: number
  ): boolean {
    return l1 < r2 && r1 > l2 && t1 < b2 && b1 > t2;
  }
}
