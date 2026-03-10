import { WeaponType, WEAPON_CONFIGS, Projectile, RaptorLevelConfig, RaptorSoundEvent } from "../types";
import { Player } from "../entities/Player";
import { Bullet } from "../entities/Bullet";
import { Missile } from "../entities/Missile";
import { LaserBeam } from "../entities/LaserBeam";
import { PowerUpManager } from "./PowerUpManager";

const MAX_PROJECTILES = 60;
const LASER_SOUND_COOLDOWN = 0.1;

export class WeaponSystem {
  public currentWeapon: WeaponType = "machine-gun";
  public laserBeam: LaserBeam = new LaserBeam();
  private fireTimer = 0;
  private laserSoundTimer = 0;

  setWeapon(type: WeaponType): void {
    if (this.currentWeapon === type) return;
    this.currentWeapon = type;
    this.fireTimer = 0;
    this.laserBeam.active = type === "laser";
  }

  getCurrentConfig() {
    return WEAPON_CONFIGS[this.currentWeapon];
  }

  update(
    dt: number,
    player: Player,
    config: RaptorLevelConfig,
    powerUpManager: PowerUpManager,
    canvasWidth: number,
    existingProjectiles: Projectile[]
  ): { newProjectiles: Projectile[]; soundEvent: RaptorSoundEvent | null } {
    const weaponConfig = WEAPON_CONFIGS[this.currentWeapon];
    const rapidFire = powerUpManager.hasUpgrade("rapid-fire");
    const spreadShot = powerUpManager.hasUpgrade("spread-shot");
    const newProjectiles: Projectile[] = [];
    let soundEvent: RaptorSoundEvent | null = null;

    if (this.currentWeapon === "laser") {
      this.laserBeam.active = player.alive;
      this.laserBeam.setModifiers(rapidFire, spreadShot);
      this.laserBeam.updatePosition(player.pos.x, player.top);
      return { newProjectiles: [], soundEvent: null };
    }

    this.laserBeam.active = false;
    this.laserSoundTimer = 0;

    const rapidMultiplier = rapidFire ? weaponConfig.rapidFireBonus : 1;
    const baseFireRate = config.autoFireRate * weaponConfig.fireRateMultiplier;
    const fireRate = baseFireRate * rapidMultiplier;

    if (fireRate <= 0) return { newProjectiles, soundEvent };

    const fireInterval = 1 / fireRate;
    this.fireTimer += dt;

    if (this.fireTimer >= fireInterval && existingProjectiles.length < MAX_PROJECTILES) {
      this.fireTimer -= fireInterval;

      if (this.currentWeapon === "machine-gun") {
        if (spreadShot) {
          newProjectiles.push(this.createBullet(player.pos.x, player.top, -0.2));
          newProjectiles.push(this.createBullet(player.pos.x, player.top, 0));
          newProjectiles.push(this.createBullet(player.pos.x, player.top, 0.2));
        } else {
          newProjectiles.push(this.createBullet(player.pos.x, player.top));
        }
        soundEvent = "player_shoot";
      } else if (this.currentWeapon === "missile") {
        if (spreadShot) {
          newProjectiles.push(this.createMissile(player.pos.x, player.top, -0.25));
          newProjectiles.push(this.createMissile(player.pos.x, player.top, 0));
          newProjectiles.push(this.createMissile(player.pos.x, player.top, 0.25));
        } else {
          newProjectiles.push(this.createMissile(player.pos.x, player.top));
        }
        soundEvent = "missile_fire";
      }
    }

    return { newProjectiles, soundEvent };
  }

  private createBullet(x: number, y: number, angle = 0): Bullet {
    return new Bullet(x, y, angle);
  }

  private createMissile(x: number, y: number, angle = 0): Missile {
    const config = WEAPON_CONFIGS["missile"];
    return new Missile(x, y, angle, config.homingStrength);
  }

  getLaserSoundEvent(dt: number, hasHits: boolean): RaptorSoundEvent | null {
    if (hasHits) {
      this.laserSoundTimer = 0;
      return "laser_hit";
    }
    if (this.laserBeam.active) {
      this.laserSoundTimer += dt;
      if (this.laserSoundTimer >= LASER_SOUND_COOLDOWN) {
        this.laserSoundTimer -= LASER_SOUND_COOLDOWN;
        return "laser_fire";
      }
    }
    return null;
  }

  renderLaser(ctx: CanvasRenderingContext2D): void {
    this.laserBeam.render(ctx);
  }

  resetForNewLevel(): void {
    this.fireTimer = 0;
    this.laserSoundTimer = 0;
    if (this.currentWeapon === "laser") {
      this.laserBeam.active = true;
      this.laserBeam.resetTimers();
    } else {
      this.laserBeam.active = false;
    }
  }

  reset(): void {
    this.currentWeapon = "machine-gun";
    this.fireTimer = 0;
    this.laserSoundTimer = 0;
    this.laserBeam.reset();
  }
}
