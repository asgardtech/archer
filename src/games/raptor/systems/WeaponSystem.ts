import { WeaponType, WEAPON_CONFIGS, Projectile, RaptorLevelConfig } from "../types";
import { Player } from "../entities/Player";
import { Bullet } from "../entities/Bullet";
import { Missile } from "../entities/Missile";
import { LaserBeam } from "../entities/LaserBeam";
import { Enemy } from "../entities/Enemy";
import { PowerUpManager } from "./PowerUpManager";

const MAX_PROJECTILES = 60;

export class WeaponSystem {
  public currentWeapon: WeaponType = "machine-gun";
  public laserBeam: LaserBeam = new LaserBeam();
  private fireTimer = 0;

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
    existingProjectiles: Projectile[],
    enemies: Enemy[]
  ): { newProjectiles: Projectile[]; laserHits: Enemy[]; soundEvent: string | null } {
    const weaponConfig = WEAPON_CONFIGS[this.currentWeapon];
    const rapidFire = powerUpManager.hasUpgrade("rapid-fire");
    const spreadShot = powerUpManager.hasUpgrade("spread-shot");
    const newProjectiles: Projectile[] = [];
    let soundEvent: string | null = null;

    if (this.currentWeapon === "laser") {
      this.laserBeam.active = player.alive;
      this.laserBeam.setModifiers(rapidFire, spreadShot);
      this.laserBeam.updatePosition(player.pos.x, player.top);
      const laserHits = this.laserBeam.update(dt, enemies);
      return { newProjectiles: [], laserHits, soundEvent: laserHits.length > 0 ? "laser_hit" : (this.laserBeam.active ? "laser_fire" : null) };
    }

    this.laserBeam.active = false;
    const laserHits: Enemy[] = [];

    const rapidMultiplier = rapidFire ? weaponConfig.rapidFireBonus : 1;
    const baseFireRate = config.autoFireRate * weaponConfig.fireRateMultiplier;
    const fireRate = baseFireRate * rapidMultiplier;

    if (fireRate <= 0) return { newProjectiles, laserHits, soundEvent };

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

    return { newProjectiles, laserHits, soundEvent };
  }

  private createBullet(x: number, y: number, angle = 0): Bullet {
    return new Bullet(x, y, angle);
  }

  private createMissile(x: number, y: number, angle = 0): Missile {
    const config = WEAPON_CONFIGS["missile"];
    return new Missile(x, y, angle, config.homingStrength);
  }

  renderLaser(ctx: CanvasRenderingContext2D): void {
    this.laserBeam.render(ctx);
  }

  reset(): void {
    this.currentWeapon = "machine-gun";
    this.fireTimer = 0;
    this.laserBeam.reset();
  }
}
