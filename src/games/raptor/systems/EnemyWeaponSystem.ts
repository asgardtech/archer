import { EnemyWeaponType, ENEMY_WEAPON_CONFIGS, RaptorSoundEvent } from "../types";
import { EnemyBullet } from "../entities/EnemyBullet";
import { EnemyMissile } from "../entities/EnemyMissile";
import { EnemyLaserBeam, EnemyLaserBeamConfig } from "../entities/EnemyLaserBeam";
import { Enemy } from "../entities/Enemy";

export interface EnemyFireResult {
  bullets: EnemyBullet[];
  soundEvent: RaptorSoundEvent | null;
  laserActivated?: boolean;
}

const WEAPON_SOUND_MAP: Record<EnemyWeaponType, RaptorSoundEvent> = {
  standard: "enemy_shoot",
  spread: "enemy_spread_fire",
  missile: "enemy_missile_fire",
  laser: "enemy_laser_fire",
};

export class EnemyWeaponSystem {
  private laserBeams: Map<Enemy, EnemyLaserBeam[]> = new Map();

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
        return this.fireLaser(enemy, targetX);
      default:
        console.warn(`[EnemyWeaponSystem] Unhandled weapon type "${weaponType}", falling back to standard`);
        return this.fireStandard(enemy, targetX, targetY);
    }
  }

  fireLaser(enemy: Enemy, playerX: number): EnemyFireResult {
    let beams = this.laserBeams.get(enemy);

    if (!beams) {
      const config = ENEMY_WEAPON_CONFIGS["laser"];
      const beamConfig: EnemyLaserBeamConfig = {
        warmupDuration: config.beamWarmupDuration ?? 0.5,
        activeDuration: config.beamActiveDuration ?? 2.5,
        cooldownDuration: config.beamCooldownDuration ?? 3.0,
        beamWidth: config.beamWidth ?? 8,
        trackingSpeed: config.beamTrackingSpeed ?? 40,
        damage: config.damage,
      };
      beams = [new EnemyLaserBeam(beamConfig)];
      this.laserBeams.set(enemy, beams);
    }

    const beam = beams[0];
    if (beam.canFire) {
      beam.activate(enemy.pos.x, enemy.bottom, playerX);
      return { bullets: [], soundEvent: null, laserActivated: true };
    }

    return { bullets: [], soundEvent: null };
  }

  fireFortressLaser(enemy: Enemy, playerX: number, canvasWidth: number): EnemyFireResult {
    const phase = enemy.fortressAttackPhase;

    if (phase === "A") {
      let beams = this.laserBeams.get(enemy);
      if (!beams || beams.length !== 1) {
        const beamConfig: EnemyLaserBeamConfig = {
          warmupDuration: 0.7,
          activeDuration: 3.0,
          cooldownDuration: 2.5,
          beamWidth: 10,
          trackingSpeed: 25,
          damage: 10,
        };
        beams = [new EnemyLaserBeam(beamConfig)];
        this.laserBeams.set(enemy, beams);
      }

      const beam = beams[0];
      if (beam.canFire) {
        beam.activate(enemy.pos.x, enemy.bottom, playerX);
        enemy.toggleFortressPhase();
        return { bullets: [], soundEvent: null, laserActivated: true };
      }
    } else {
      let beams = this.laserBeams.get(enemy);
      if (!beams || beams.length !== 2) {
        const makeConfig = (): EnemyLaserBeamConfig => ({
          warmupDuration: 0.5,
          activeDuration: 2.0,
          cooldownDuration: 2.5,
          beamWidth: 7,
          trackingSpeed: 60,
          damage: 8,
        });
        beams = [new EnemyLaserBeam(makeConfig()), new EnemyLaserBeam(makeConfig())];
        this.laserBeams.set(enemy, beams);
      }

      if (beams[0].canFire && beams[1].canFire) {
        const leftOriginX = enemy.pos.x - enemy.width * 0.4;
        const rightOriginX = enemy.pos.x + enemy.width * 0.4;
        beams[0].activate(leftOriginX, enemy.bottom, canvasWidth * 0.9);
        beams[1].activate(rightOriginX, enemy.bottom, canvasWidth * 0.1);
        enemy.toggleFortressPhase();
        return { bullets: [], soundEvent: null, laserActivated: true };
      }
    }

    return { bullets: [], soundEvent: null };
  }

  updateLasers(dt: number, playerX: number): RaptorSoundEvent[] {
    const soundEvents: RaptorSoundEvent[] = [];

    for (const [enemy, beams] of this.laserBeams.entries()) {
      if (!enemy.alive) {
        for (const beam of beams) beam.reset();
        this.laserBeams.delete(enemy);
        continue;
      }

      for (const beam of beams) {
        beam.update(dt, enemy.pos.x, enemy.bottom, playerX);

        if (beam.didJustActivate) {
          soundEvents.push("enemy_laser_fire");
        }
      }
    }

    return soundEvents;
  }

  getActiveLasers(): EnemyLaserBeam[] {
    const active: EnemyLaserBeam[] = [];
    for (const beams of this.laserBeams.values()) {
      for (const beam of beams) {
        if (beam.isFiring) {
          active.push(beam);
        }
      }
    }
    return active;
  }

  resetLasers(): void {
    for (const beams of this.laserBeams.values()) {
      for (const beam of beams) beam.reset();
    }
    this.laserBeams.clear();
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

  fireMissileFrom(enemy: Enemy, targetX: number, targetY: number, offsetX: number, offsetY: number): EnemyFireResult {
    const config = ENEMY_WEAPON_CONFIGS["missile"];
    const bullet = new EnemyMissile(
      enemy.pos.x + offsetX,
      enemy.bottom + offsetY,
      targetX, targetY,
      {
        damage: config.damage,
        speed: config.projectileSpeed,
        homing: config.homing,
        homingStrength: config.homingStrength,
        spriteKey: config.spriteKey,
        radius: 7,
      }
    );
    return {
      bullets: [bullet],
      soundEvent: WEAPON_SOUND_MAP["missile"],
    };
  }
}
