import { WeaponType, WEAPON_CONFIGS, WeaponTierConfig, Projectile, RaptorLevelConfig, RaptorSoundEvent, MAX_WEAPON_TIER } from "../types";
import { Player } from "../entities/Player";
import { Bullet } from "../entities/Bullet";
import { Missile } from "../entities/Missile";
import { PlasmaBolt } from "../entities/PlasmaBolt";
import { IonBolt } from "../entities/IonBolt";
import { TrackingBullet } from "../entities/TrackingBullet";
import { Rocket } from "../entities/Rocket";
import { LaserBeam } from "../entities/LaserBeam";
import { AutoTurretDrone } from "../entities/AutoTurretDrone";
import { Enemy } from "../entities/Enemy";
import { PowerUpManager } from "./PowerUpManager";

const MAX_PROJECTILES = 60;
const LASER_SOUND_COOLDOWN = 0.1;

const MAX_TURRET_DRONES = 4;

export class WeaponSystem {
  public currentWeapon: WeaponType = "machine-gun";
  public laserBeam: LaserBeam = new LaserBeam();
  private fireTimer = 0;
  private laserSoundTimer = 0;
  private chargeTimer = 0;
  private turretDrones: AutoTurretDrone[] = [];

  constructor() {
    for (let i = 0; i < MAX_TURRET_DRONES; i++) {
      this.turretDrones.push(new AutoTurretDrone((i / MAX_TURRET_DRONES) * Math.PI * 2));
    }
  }

  setWeapon(type: WeaponType): void {
    if (this.currentWeapon === type) return;
    this.currentWeapon = type;
    this.fireTimer = 0;
    this.chargeTimer = 0;
    this.laserBeam.active = type === "laser";
    this.setTurretsActive(type === "auto-turret");
  }

  private setTurretsActive(active: boolean): void {
    for (const drone of this.turretDrones) {
      drone.active = active;
    }
  }

  get chargeLevel(): number {
    if (this.currentWeapon !== "ion-cannon") return 0;
    const config = WEAPON_CONFIGS["ion-cannon"];
    const maxCharge = config.chargeTime ?? 2.0;
    return Math.min(1, this.chargeTimer / maxCharge);
  }

  getCurrentConfig() {
    return WEAPON_CONFIGS[this.currentWeapon];
  }

  private getTierConfig(powerUpManager: PowerUpManager): WeaponTierConfig {
    const config = WEAPON_CONFIGS[this.currentWeapon];
    const tierIndex = Math.max(0, Math.min(MAX_WEAPON_TIER - 1, powerUpManager.weaponTier - 1));
    return config.tiers[tierIndex];
  }

  update(
    dt: number,
    player: Player,
    config: RaptorLevelConfig,
    powerUpManager: PowerUpManager,
    canvasWidth: number,
    existingProjectiles: Projectile[],
    enemies?: Enemy[]
  ): { newProjectiles: Projectile[]; soundEvent: RaptorSoundEvent | null } {
    const weaponConfig = WEAPON_CONFIGS[this.currentWeapon];
    const tierConfig = this.getTierConfig(powerUpManager);
    const rapidFire = powerUpManager.hasUpgrade("rapid-fire");
    const spreadShot = powerUpManager.hasUpgrade("spread-shot");
    const newProjectiles: Projectile[] = [];
    let soundEvent: RaptorSoundEvent | null = null;

    if (this.currentWeapon === "laser") {
      this.laserBeam.active = player.alive;
      this.laserBeam.setModifiers(rapidFire, spreadShot, tierConfig.visualScale, tierConfig.damageMultiplier, weaponConfig.rapidFireBonus);
      this.laserBeam.updatePosition(player.pos.x, player.top);
      return { newProjectiles: [], soundEvent: null };
    }

    this.laserBeam.active = false;
    this.laserSoundTimer = 0;

    if (this.currentWeapon === "auto-turret") {
      this.setTurretsActive(player.alive);
      const droneCount = tierConfig.projectileCount;
      const tierDamage = weaponConfig.damage * tierConfig.damageMultiplier;
      const fireRateMult = tierConfig.fireRateMultiplier;
      const totalProjectiles = existingProjectiles.length;
      let soundEvent: RaptorSoundEvent | null = null;

      for (let i = 0; i < this.turretDrones.length; i++) {
        const drone = this.turretDrones[i];
        drone.active = i < droneCount && player.alive;
        if (!drone.active) continue;

        const result = drone.update(
          dt, player.pos, enemies ?? [], fireRateMult,
          rapidFire, spreadShot, tierDamage,
          totalProjectiles + newProjectiles.length, MAX_PROJECTILES
        );
        for (const proj of result.projectiles) {
          proj.sourceWeapon = "auto-turret";
          newProjectiles.push(proj);
        }
        if (result.fired) {
          soundEvent = "turret_fire";
        }
      }

      return { newProjectiles, soundEvent };
    }

    const tierDamage = weaponConfig.damage * tierConfig.damageMultiplier;

    if (this.currentWeapon === "ion-cannon") {
      const maxCharge = weaponConfig.chargeTime ?? 2.0;
      const effectiveMaxCharge = rapidFire
        ? maxCharge / (weaponConfig.rapidFireBonus * tierConfig.fireRateMultiplier)
        : maxCharge / tierConfig.fireRateMultiplier;

      this.chargeTimer = Math.min(this.chargeTimer + dt, effectiveMaxCharge);

      if (this.chargeTimer >= effectiveMaxCharge && existingProjectiles.length < MAX_PROJECTILES) {
        const chargeLevel = 1.0;
        if (spreadShot) {
          for (let i = 0; i < tierConfig.projectileCount; i++) {
            const offset = tierConfig.projectileCount > 1
              ? (i - (tierConfig.projectileCount - 1) / 2) * tierConfig.projectileSpread
              : 0;
            newProjectiles.push(this.createIonBolt(player.pos.x, player.top, chargeLevel, -0.1 + offset, tierDamage));
            newProjectiles.push(this.createIonBolt(player.pos.x, player.top, chargeLevel, 0.1 + offset, tierDamage));
          }
        } else {
          this.spawnProjectiles(
            tierConfig, player.pos.x, player.top,
            (x, y, angle) => this.createIonBolt(x, y, chargeLevel, angle, tierDamage),
            newProjectiles
          );
        }
        soundEvent = "ion_fire";
        this.chargeTimer = 0;
      }

      return { newProjectiles, soundEvent };
    }

    const rapidMultiplier = rapidFire ? weaponConfig.rapidFireBonus : 1;
    const baseFireRate = config.autoFireRate * weaponConfig.fireRateMultiplier * tierConfig.fireRateMultiplier;
    const fireRate = baseFireRate * rapidMultiplier;

    if (fireRate <= 0) return { newProjectiles, soundEvent };

    const fireInterval = 1 / fireRate;
    this.fireTimer += dt;

    if (this.fireTimer >= fireInterval && existingProjectiles.length < MAX_PROJECTILES) {
      this.fireTimer -= fireInterval;

      if (this.currentWeapon === "machine-gun") {
        if (spreadShot) {
          this.spawnProjectilesWithSpread(
            tierConfig, player.pos.x, player.top,
            [-0.2, 0, 0.2],
            (x, y, angle) => this.createBullet(x, y, angle, tierDamage),
            newProjectiles
          );
        } else {
          this.spawnProjectiles(
            tierConfig, player.pos.x, player.top,
            (x, y, angle) => this.createBullet(x, y, angle, tierDamage),
            newProjectiles
          );
        }
        soundEvent = "player_shoot";
      } else if (this.currentWeapon === "missile") {
        const effectiveHomingStrength = tierConfig.homingStrength ?? weaponConfig.homingStrength;
        if (spreadShot) {
          this.spawnProjectilesWithSpread(
            tierConfig, player.pos.x, player.top,
            [-0.25, 0, 0.25],
            (x, y, angle) => this.createMissile(x, y, angle, tierDamage, effectiveHomingStrength),
            newProjectiles
          );
        } else {
          this.spawnProjectiles(
            tierConfig, player.pos.x, player.top,
            (x, y, angle) => this.createMissile(x, y, angle, tierDamage, effectiveHomingStrength),
            newProjectiles
          );
        }
        soundEvent = "missile_fire";
      } else if (this.currentWeapon === "plasma") {
        if (spreadShot) {
          this.spawnProjectilesWithSpread(
            tierConfig, player.pos.x, player.top,
            [-0.2, 0, 0.2],
            (x, y, angle) => this.createPlasmaBolt(x, y, angle, tierDamage),
            newProjectiles
          );
        } else {
          this.spawnProjectiles(
            tierConfig, player.pos.x, player.top,
            (x, y, angle) => this.createPlasmaBolt(x, y, angle, tierDamage),
            newProjectiles
          );
        }
        soundEvent = "plasma_fire";
      } else if (this.currentWeapon === "auto-gun") {
        if (spreadShot) {
          const baseOffsets = [-12, -4, 4, 12];
          for (let t = 0; t < tierConfig.projectileCount; t++) {
            const tierOffset = tierConfig.projectileCount > 1
              ? (t - (tierConfig.projectileCount - 1) / 2) * tierConfig.projectileSpread
              : 0;
            for (const xOff of baseOffsets) {
              const b = this.createTrackingBullet(player.pos.x + xOff, player.top, tierOffset, tierDamage);
              newProjectiles.push(b);
            }
          }
        } else {
          const baseOffsets = [-4, 4];
          for (let t = 0; t < tierConfig.projectileCount; t++) {
            const tierOffset = tierConfig.projectileCount > 1
              ? (t - (tierConfig.projectileCount - 1) / 2) * tierConfig.projectileSpread
              : 0;
            for (const xOff of baseOffsets) {
              const b = this.createTrackingBullet(player.pos.x + xOff, player.top, tierOffset, tierDamage);
              newProjectiles.push(b);
            }
          }
        }
        soundEvent = "player_shoot";
      } else if (this.currentWeapon === "rocket") {
        if (spreadShot) {
          this.spawnProjectilesWithSpread(
            tierConfig, player.pos.x, player.top,
            [-0.15, 0, 0.15],
            (x, y, angle) => this.createRocket(x, y, angle, tierDamage),
            newProjectiles
          );
        } else {
          this.spawnProjectiles(
            tierConfig, player.pos.x, player.top,
            (x, y, angle) => this.createRocket(x, y, angle, tierDamage),
            newProjectiles
          );
        }
        soundEvent = "rocket_fire";
      }
    }

    return { newProjectiles, soundEvent };
  }

  private spawnProjectiles(
    tierConfig: WeaponTierConfig,
    x: number, y: number,
    factory: (x: number, y: number, angle: number) => Projectile,
    out: Projectile[]
  ): void {
    for (let i = 0; i < tierConfig.projectileCount; i++) {
      const angle = tierConfig.projectileCount > 1
        ? (i - (tierConfig.projectileCount - 1) / 2) * tierConfig.projectileSpread
        : 0;
      out.push(factory(x, y, angle));
    }
  }

  private spawnProjectilesWithSpread(
    tierConfig: WeaponTierConfig,
    x: number, y: number,
    spreadAngles: number[],
    factory: (x: number, y: number, angle: number) => Projectile,
    out: Projectile[]
  ): void {
    for (let t = 0; t < tierConfig.projectileCount; t++) {
      const tierOffset = tierConfig.projectileCount > 1
        ? (t - (tierConfig.projectileCount - 1) / 2) * tierConfig.projectileSpread
        : 0;
      for (const spreadAngle of spreadAngles) {
        out.push(factory(x, y, spreadAngle + tierOffset));
      }
    }
  }

  private createBullet(x: number, y: number, angle = 0, damage?: number): Bullet {
    const b = new Bullet(x, y, angle);
    b.sourceWeapon = this.currentWeapon;
    if (damage !== undefined) b.damage = damage;
    return b;
  }

  private createMissile(x: number, y: number, angle = 0, damage?: number, homingStrength?: number): Missile {
    const m = new Missile(x, y, angle, homingStrength ?? 0);
    m.sourceWeapon = this.currentWeapon;
    if (damage !== undefined) m.damage = damage;
    return m;
  }

  private createPlasmaBolt(x: number, y: number, angle = 0, damage?: number): PlasmaBolt {
    const p = new PlasmaBolt(x, y, angle);
    p.sourceWeapon = this.currentWeapon;
    if (damage !== undefined) p.damage = damage;
    return p;
  }

  private createTrackingBullet(x: number, y: number, angle = 0, damage?: number): TrackingBullet {
    const config = WEAPON_CONFIGS["auto-gun"];
    const t = new TrackingBullet(x, y, angle, config.homingStrength);
    t.sourceWeapon = this.currentWeapon;
    if (damage !== undefined) t.damage = damage;
    return t;
  }

  private createRocket(x: number, y: number, angle = 0, damage?: number): Rocket {
    const r = new Rocket(x, y, angle);
    r.sourceWeapon = this.currentWeapon;
    if (damage !== undefined) r.damage = damage;
    return r;
  }

  private createIonBolt(x: number, y: number, chargeLevel: number, angle = 0, damage?: number): IonBolt {
    const bolt = new IonBolt(x, y, chargeLevel, angle);
    bolt.sourceWeapon = this.currentWeapon;
    if (damage !== undefined) bolt.damage = damage;
    return bolt;
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

  getActiveTurretDrones(): AutoTurretDrone[] {
    return this.turretDrones.filter(d => d.active);
  }

  renderLaser(ctx: CanvasRenderingContext2D): void {
    this.laserBeam.render(ctx);
  }

  renderTurrets(ctx: CanvasRenderingContext2D): void {
    for (const drone of this.turretDrones) {
      if (drone.active) {
        drone.render(ctx);
      }
    }
  }

  resetForNewLevel(): void {
    this.fireTimer = 0;
    this.laserSoundTimer = 0;
    this.chargeTimer = 0;
    if (this.currentWeapon === "laser") {
      this.laserBeam.active = true;
      this.laserBeam.resetTimers();
    } else {
      this.laserBeam.active = false;
    }
    this.setTurretsActive(this.currentWeapon === "auto-turret");
  }

  reset(): void {
    this.currentWeapon = "machine-gun";
    this.fireTimer = 0;
    this.laserSoundTimer = 0;
    this.chargeTimer = 0;
    this.laserBeam.reset();
    this.setTurretsActive(false);
  }
}
