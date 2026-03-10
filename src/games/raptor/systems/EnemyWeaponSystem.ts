import { EnemyWeaponType, ENEMY_WEAPON_CONFIGS, RaptorSoundEvent } from "../types";
import { EnemyBullet } from "../entities/EnemyBullet";
import { EnemyMissile } from "../entities/EnemyMissile";
import { Enemy } from "../entities/Enemy";

export interface EnemyFireResult {
  bullets: EnemyBullet[];
  soundEvent: RaptorSoundEvent;
}

const WEAPON_SOUND_MAP: Record<EnemyWeaponType, RaptorSoundEvent> = {
  standard: "enemy_shoot",
  spread: "enemy_spread_fire",
  missile: "enemy_missile_fire",
  laser: "enemy_laser_fire",
};

export class EnemyWeaponSystem {
  fire(enemy: Enemy, targetX: number, targetY: number): EnemyFireResult {
    const weaponType = enemy.weaponType;
    const config = ENEMY_WEAPON_CONFIGS[weaponType];

    if (!config) {
      console.warn(`[EnemyWeaponSystem] Unknown weapon type "${weaponType}", falling back to standard`);
      return this.fireStandard(enemy, targetX, targetY);
    }

    switch (weaponType) {
      case "standard":
        return this.fireStandard(enemy, targetX, targetY);
      case "spread":
        return this.fireSpread(enemy, targetX, targetY);
      case "missile":
        return this.fireMissile(enemy, targetX, targetY);
      case "laser":
        return { bullets: [], soundEvent: "enemy_laser_fire" };
      default:
        console.warn(`[EnemyWeaponSystem] Unhandled weapon type "${weaponType}", falling back to standard`);
        return this.fireStandard(enemy, targetX, targetY);
    }
  }

  private fireStandard(enemy: Enemy, targetX: number, targetY: number): EnemyFireResult {
    const config = ENEMY_WEAPON_CONFIGS["standard"];
    const bullet = new EnemyBullet(enemy.pos.x, enemy.bottom, targetX, targetY, {
      damage: config.damage,
      speed: config.projectileSpeed,
      spriteKey: config.spriteKey,
    });
    return {
      bullets: [bullet],
      soundEvent: WEAPON_SOUND_MAP["standard"],
    };
  }

  private fireSpread(enemy: Enemy, targetX: number, targetY: number): EnemyFireResult {
    const config = ENEMY_WEAPON_CONFIGS["spread"];
    const dx = targetX - enemy.pos.x;
    const dy = targetY - enemy.bottom;
    const baseAngle = Math.atan2(dx, dy);
    const count = config.projectileCount;
    const bullets: EnemyBullet[] = [];

    for (let i = 0; i < count; i++) {
      const angleOffset = (i - (count - 1) / 2) * config.spreadAngle;
      const angle = baseAngle + angleOffset;
      const dist = 1000;
      const bTargetX = enemy.pos.x + Math.sin(angle) * dist;
      const bTargetY = enemy.bottom + Math.cos(angle) * dist;

      bullets.push(new EnemyBullet(enemy.pos.x, enemy.bottom, bTargetX, bTargetY, {
        damage: config.damage,
        speed: config.projectileSpeed,
        radius: 3,
        spriteKey: config.spriteKey,
        fallbackColor: "#ff8800",
      }));
    }

    return {
      bullets,
      soundEvent: WEAPON_SOUND_MAP["spread"],
    };
  }

  private fireMissile(enemy: Enemy, targetX: number, targetY: number): EnemyFireResult {
    const config = ENEMY_WEAPON_CONFIGS["missile"];
    const bullet = new EnemyMissile(enemy.pos.x, enemy.bottom, targetX, targetY, {
      damage: config.damage,
      speed: config.projectileSpeed,
      homing: config.homing,
      homingStrength: config.homingStrength,
      spriteKey: config.spriteKey,
      radius: 7,
    });
    return {
      bullets: [bullet],
      soundEvent: WEAPON_SOUND_MAP["missile"],
    };
  }
}
