import { Vec2, EnemyVariant, EnemyConfig, EnemyWeaponType, GravityWell, ENEMY_CONFIGS } from "../types";

export function isBossVariant(variant: EnemyVariant): boolean {
  return variant === "boss" || variant === "boss_gunship" || variant === "boss_dreadnought"
    || variant === "boss_fortress" || variant === "boss_carrier"
    || variant === "boss_mothership" || variant === "boss_hydra" || variant === "boss_shadow"
    || variant === "boss_behemoth" || variant === "boss_architect" || variant === "boss_swarm_queen";
}

export class Enemy {
  public pos: Vec2;
  public vel: Vec2;
  public variant: EnemyVariant;
  public hitPoints: number;
  public maxHitPoints: number;
  public scoreValue: number;
  public fireRate: number;
  public fireCooldown: number;
  public width: number;
  public height: number;
  public weaponType: EnemyWeaponType;
  public alive = true;

  private flashTimer = 0;
  private time = 0;
  private sprite: HTMLImageElement | null = null;
  private static _flashCanvas: HTMLCanvasElement | null = null;
  private static _flashCtx: CanvasRenderingContext2D | null = null;

  private cloakTimer = 0;
  private cloakVisible = true;
  private readonly CLOAK_VISIBLE_DURATION = 2.0;
  private readonly CLOAK_HIDDEN_DURATION = 1.5;

  private phantomTimer = 0;
  private phantomVisible = true;
  private readonly PHANTOM_VISIBLE_DURATION = 0.8;
  private readonly PHANTOM_HIDDEN_DURATION = 0.6;

  private mineTimer = 0;
  private readonly MINE_DROP_INTERVAL = 2.0;
  private minelayerDirection = 0;
  private minelayerInitialized = false;

  private gunshipPhase: "entering" | "pausing" | "strafing" = "entering";
  private gunshipStrafeTarget = 0;
  private gunshipPauseTimer = 0;
  private gunshipStrafeDirection: 1 | -1 = 1;

  private dreadnoughtPhase: "entering" | "drifting" | "locking" = "entering";
  private dreadnoughtDriftTimer = 0;
  private dreadnoughtLockTimer = 0;
  private readonly DREADNOUGHT_DRIFT_DURATION_MIN = 3.0;
  private readonly DREADNOUGHT_DRIFT_DURATION_MAX = 5.0;
  private readonly DREADNOUGHT_LOCK_DURATION = 1.5;

  private fortressPhase: "entering" | "hovering" = "entering";
  public fortressAttackPhase: "A" | "B" = "A";

  private carrierPhase: "entering" | "patrolling" | "deploying" = "entering";
  private droneSpawnTimer = 0;
  private carrierDeployPauseTimer = 0;
  private droneSpawnReady = false;
  private droneWaveVariantToggle = false;
  private readonly DRONE_SPAWN_INTERVAL = 5.5;
  private readonly CARRIER_DEPLOY_PAUSE = 0.8;

  // Sentinel
  private sentinelPhase: "entering" | "hovering" = "entering";
  public static readonly SENTINEL_AURA_RADIUS = 60;

  // Lancer
  private lancerPhase: "drifting" | "charging" = "drifting";
  private lancerDriftTimer = 0;
  private lancerChargeTimer = 0;
  private lancerTargetX = 0;
  private readonly LANCER_DRIFT_INTERVAL = 3.0;
  private readonly LANCER_CHARGE_DURATION = 0.5;

  // Wraith
  private wraithTeleportsRemaining = 3;
  private wraithInvulnTimer = 0;
  private wraithCanvasWidth = 800;
  private wraithOffsetX = 0;
  private readonly WRAITH_INVULN_DURATION = 0.15;

  // Corsair
  private corsairPhase: "entering" | "strafing" = "entering";
  private corsairStrafeDirection: 1 | -1 = 1;
  private corsairBaseY = 0;

  // Vulture
  private vulturePhase: "entering" | "orbiting" = "entering";
  private vultureOrbitAngle = 0;
  private vultureCenterX = 0;
  private vultureCenterY = 0;

  // Titan — weapon-switching warship
  private titanWeaponTimer = 0;
  private readonly TITAN_WEAPON_SWITCH_INTERVAL = 4.0;
  private titanPhase: "entering" | "drifting" = "entering";

  // Bastion — stationary turret platform
  private bastionPhase: "entering" | "deployed" = "entering";
  private bastionDeployY = 0;
  private bastionTurretAngle = 0;

  // Siege Engine — long-range artillery
  private siegePhase: "entering" | "positioned" = "entering";

  // Warden — barrier generator
  private wardenPhase: "entering" | "patrolling" = "entering";
  private wardenPatrolDirection: 1 | -1 = 1;
  public barrierHP = 20;
  public barrierMaxHP = 20;
  public readonly barrierRegenRate = 2;
  public readonly barrierWidth = 120;
  public readonly barrierHeight = 6;

  // Leviathan — drone mothership
  private leviathanPhase: "entering" | "patrolling" | "deploying" = "entering";
  private leviathanDroneTimer = 0;
  private leviathanDeployPauseTimer = 0;
  private leviathanDroneSpawnReady = false;
  private readonly LEVIATHAN_DRONE_INTERVAL = 6.0;
  private readonly LEVIATHAN_DEPLOY_PAUSE = 0.8;
  public leviathanSpawnedDrones: Enemy[] = [];
  private readonly LEVIATHAN_MAX_DRONES = 6;

  // Mothership — fleet command boss
  private mothershipPhase: "entering" | "patrolling" | "deploying" = "entering";
  private mothershipDroneTimer = 0;
  private mothershipDeployPauseTimer = 0;
  private mothershipDroneSpawnReady = false;
  private mothershipWeaponTimer = 0;
  private mothershipCurrentPhase: 1 | 2 | 3 = 1;
  public mothershipSpawnedDrones: Enemy[] = [];
  private readonly MOTHERSHIP_P1_DEPLOY_INTERVAL = 8.0;
  private readonly MOTHERSHIP_P2_DEPLOY_INTERVAL = 6.0;
  private readonly MOTHERSHIP_DEPLOY_PAUSE = 1.0;
  private readonly MOTHERSHIP_MAX_DRONES = 8;

  // Hydra — multi-head weapons platform
  private hydraPhase: "entering" | "active" = "entering";
  private hydraPodHP: [number, number, number] = [15, 15, 15];
  private readonly hydraPodMaxHP = 15;
  private hydraPodAlive: [boolean, boolean, boolean] = [true, true, true];
  private hydraPodRegenTimers: [number, number, number] = [0, 0, 0];
  private hydraPodRegenerated: [boolean, boolean, boolean] = [false, false, false];
  private hydraVulnerabilityTimer = 0;
  private hydraVulnerable = false;
  private hydraOrbitAngle = 0;
  private readonly HYDRA_ORBIT_RADIUS = 35;
  private readonly HYDRA_ORBIT_SPEED = 0.8;

  // Shadow — stealth command vessel
  private shadowPhase: "entering" | "visible" | "cloaking" | "cloaked" | "decloaking" = "entering";
  private shadowCycleTimer = 0;
  private shadowCloakAlpha = 1.0;
  private shadowDashTimer = 0;
  private shadowDashTargetX = 0;
  private shadowDashActive = false;
  public shadowAmbushReady = false;
  private shadowBurstRemaining = 0;
  private shadowBurstTimer = 0;
  private shadowBurstSpreadIndex = 0;
  private readonly SHADOW_BURST_COUNT = 2;
  private readonly SHADOW_BURST_INTERVAL = 0.12;
  private readonly SHADOW_VISIBLE_DURATION = 4.0;
  private readonly SHADOW_CLOAK_DURATION = 3.0;
  private readonly SHADOW_DASH_INTERVAL = 3.0;
  private readonly SHADOW_CLOAK_TRANSITION = 0.3;

  // Behemoth — armored siege platform
  private behemothPhase: "entering" | "active" = "entering";
  private behemothShieldActive = true;
  private behemothShieldTimer = 0;
  private behemothShieldCyclePhase: "shielded" | "exposed" = "shielded";
  private readonly BEHEMOTH_SHIELD_DURATION = 8.0;
  private readonly BEHEMOTH_EXPOSED_DURATION = 4.0;

  // Architect — precursor war machine
  private architectPhase: "entering" | "active" | "exposed" = "entering";
  private architectGravityWellsArr: GravityWell[] = [];
  private architectGravityTimer = 0;
  private architectFragmentsDetached = false;
  private architectFragmentsSpawned = false;
  public architectRotation = 0;
  public architectSpawnedFragments: Enemy[] = [];
  private readonly ARCHITECT_GRAVITY_INTERVAL = 10.0;
  private readonly ARCHITECT_GRAVITY_DURATION = 4.0;
  private readonly ARCHITECT_GRAVITY_STRENGTH = 80;

  // Swarm Queen — hive mother
  private queenPhase: "entering" | "active" = "entering";
  private queenSpawnTimer = 0;
  private queenSpawnReady = false;
  public queenSpawnedLocusts: Enemy[] = [];
  private queenSwarmResponseTimer = 0;
  public queenSwarmResponseActive = false;
  private readonly QUEEN_MAX_LOCUSTS = 12;

  private burstRemaining = 0;
  private burstTimer = 0;
  private burstSpreadIndex = 0;
  private readonly BURST_COUNT = 4;
  private readonly BURST_INTERVAL = 0.15;

  // Splitter
  private splitterWeaveTime = 0;
  private splitterBaseX = 0;
  private splitterBaseXInitialized = false;

  // Healer
  private healerHealTimer = 0;
  private readonly HEALER_HEAL_INTERVAL = 2.0;
  private readonly HEALER_HEAL_RANGE = 80;
  private readonly HEALER_GRAVITATE_RANGE = 100;

  // Teleporter
  private teleporterBlinkTimer = 2.5;
  private teleporterPostBlinkFireTimer = -1;
  private teleporterFlashTimer = 0;
  private readonly TELEPORTER_BLINK_INTERVAL = 2.5;
  private readonly TELEPORTER_POST_BLINK_FIRE_DELAY = 0.1;
  private readonly TELEPORTER_FLASH_DURATION = 0.1;
  private teleporterBurstRemaining = 0;
  private teleporterBurstTimer = 0;
  private teleporterPendingFlash: { departX: number; departY: number; arriveX: number; arriveY: number } | null = null;

  // Mimic
  private mimicSmoothedX = 0;
  private mimicBaseY = 0;
  private mimicInitialized = false;

  // Kamikaze
  private kamikazePhase: "approaching" | "locked" | "diving" = "approaching";
  private kamikazeLockTimer = 0;
  private kamikazeTargetPos: Vec2 = { x: 0, y: 0 };
  private kamikazeCurrentSpeed = 100;
  private readonly KAMIKAZE_LOCK_DELAY = 1.5;
  private readonly KAMIKAZE_ACCELERATION = 150;
  private readonly KAMIKAZE_MAX_SPEED = 400;
  public kamikazeSelfDestructed = false;

  // Jammer
  private jammerPhase: "entering" | "drifting" = "entering";
  private jammerDriftDirection: 1 | -1 = 1;
  private jammerDeployY = 0;
  public static readonly JAMMER_FIELD_RADIUS = 120;
  public static readonly JAMMER_FIRE_RATE_PENALTY = 0.3;

  constructor(x: number, y: number, variant: EnemyVariant, speed?: number, overrideConfig?: Partial<EnemyConfig>) {
    const config = { ...ENEMY_CONFIGS[variant], ...overrideConfig };
    this.variant = variant;
    this.hitPoints = Math.max(config.hitPoints, isBossVariant(variant) ? 25 : 1);
    this.maxHitPoints = this.hitPoints;
    this.scoreValue = config.scoreValue;
    this.fireRate = config.fireRate;
    this.fireCooldown = Math.random() * (1 / Math.max(this.fireRate, 0.1));
    this.width = config.width;
    this.height = config.height;
    this.weaponType = config.weaponType ?? "standard";

    const actualSpeed = speed ?? config.speed;
    this.pos = { x, y };
    this.vel = { x: 0, y: actualSpeed };
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  update(dt: number, canvasHeight: number, targetX?: number, canvasWidth?: number, offsetX = 0, offsetY = 0, targetY?: number): void {
    if (!this.alive) return;
    this.time += dt;

    if (this.flashTimer > 0) this.flashTimer -= dt;

    if (this.variant === "boss_gunship") {
      const cw = (canvasWidth ?? 800) + offsetX;
      const margin = offsetX + 40;
      const parkY = offsetY + canvasHeight * 0.18;

      if (this.gunshipPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.gunshipPhase = "pausing";
          this.gunshipPauseTimer = 0.4 + Math.random() * 0.2;
          this.gunshipStrafeDirection = this.pos.x > offsetX + (canvasWidth ?? 800) / 2 ? -1 : 1;
        }
      } else if (this.gunshipPhase === "pausing") {
        this.gunshipPauseTimer -= dt;
        if (this.gunshipPauseTimer <= 0) {
          this.gunshipStrafeTarget = this.gunshipStrafeDirection > 0
            ? Math.max(margin, cw - margin)
            : Math.min(margin, cw - margin);
          this.gunshipPhase = "strafing";
        }
      } else if (this.gunshipPhase === "strafing") {
        const strafeSpeed = this.vel.y * 2.5;
        const dx = this.gunshipStrafeTarget - this.pos.x;
        if (Math.abs(dx) <= 5) {
          this.pos.x = this.gunshipStrafeTarget;
          this.gunshipStrafeDirection *= -1;
          this.gunshipPhase = "pausing";
          this.gunshipPauseTimer = 0.4 + Math.random() * 0.2;
        } else {
          const step = Math.sign(dx) * strafeSpeed * dt;
          if (Math.abs(step) > Math.abs(dx)) {
            this.pos.x = this.gunshipStrafeTarget;
          } else {
            this.pos.x += step;
          }
        }
      }

      this.pos.x = Math.max(margin, Math.min(cw - margin, this.pos.x));
    } else if (this.variant === "boss_dreadnought") {
      const dCw = (canvasWidth ?? 800) + offsetX;
      const dMargin = offsetX + 50;
      const parkY = offsetY + canvasHeight * 0.25;

      if (this.dreadnoughtPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.dreadnoughtPhase = "drifting";
          this.dreadnoughtDriftTimer = this.DREADNOUGHT_DRIFT_DURATION_MIN
            + Math.random() * (this.DREADNOUGHT_DRIFT_DURATION_MAX - this.DREADNOUGHT_DRIFT_DURATION_MIN);
        }
      } else if (this.dreadnoughtPhase === "drifting") {
        this.pos.x += Math.sin(this.time * 0.5) * 35 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.3) * 4;
        this.pos.x = Math.max(dMargin, Math.min(dCw - dMargin, this.pos.x));

        this.dreadnoughtDriftTimer -= dt;
        if (this.dreadnoughtDriftTimer <= 0) {
          this.dreadnoughtPhase = "locking";
          this.dreadnoughtLockTimer = this.DREADNOUGHT_LOCK_DURATION;
        }
      } else if (this.dreadnoughtPhase === "locking") {
        this.pos.x += Math.sin(this.time * 20) * 0.5;
        this.dreadnoughtLockTimer -= dt;
        if (this.dreadnoughtLockTimer <= 0) {
          this.initiateBurst();
          this.dreadnoughtPhase = "drifting";
          this.dreadnoughtDriftTimer = this.DREADNOUGHT_DRIFT_DURATION_MIN
            + Math.random() * (this.DREADNOUGHT_DRIFT_DURATION_MAX - this.DREADNOUGHT_DRIFT_DURATION_MIN);
        }
      }

      if (this.burstRemaining > 0) {
        this.burstTimer -= dt;
      }
    } else if (this.variant === "boss_fortress") {
      const fCw = (canvasWidth ?? 800) + offsetX;
      const fMargin = offsetX + 50;
      const parkY = offsetY + canvasHeight * 0.12;

      if (this.fortressPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.fortressPhase = "hovering";
        }
      } else {
        this.pos.x += Math.sin(this.time * 0.3) * 8 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.2) * 3;
        this.pos.x = Math.max(fMargin, Math.min(fCw - fMargin, this.pos.x));
      }
    } else if (this.variant === "boss_carrier") {
      const cCw = (canvasWidth ?? 800) + offsetX;
      const cMargin = offsetX + 50;
      const cParkY = offsetY + canvasHeight * 0.2;

      if (this.carrierPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= cParkY) {
          this.pos.y = cParkY;
          this.carrierPhase = "patrolling";
        }
      } else if (this.carrierPhase === "patrolling") {
        this.pos.x += Math.sin(this.time * 0.4) * 45 * dt;
        this.pos.y = cParkY + Math.sin(this.time * 0.25) * 5;
        this.pos.x = Math.max(cMargin, Math.min(cCw - cMargin, this.pos.x));

        if (this.hitPoints / this.maxHitPoints >= 0.25) {
          this.droneSpawnTimer += dt;
          if (this.droneSpawnTimer >= this.DRONE_SPAWN_INTERVAL) {
            this.droneSpawnTimer = 0;
            this.carrierPhase = "deploying";
            this.carrierDeployPauseTimer = this.CARRIER_DEPLOY_PAUSE;
            this.droneSpawnReady = true;
          }
        }
      } else if (this.carrierPhase === "deploying") {
        this.pos.y = cParkY + Math.sin(this.time * 0.25) * 5;
        this.carrierDeployPauseTimer -= dt;
        if (this.carrierDeployPauseTimer <= 0) {
          this.carrierPhase = "patrolling";
        }
      }
    } else if (this.variant === "boss_mothership") {
      const mCw = (canvasWidth ?? 800) + offsetX;
      const mMargin = offsetX + 50;
      const mParkY = offsetY + canvasHeight * 0.18;

      if (this.mothershipPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= mParkY) {
          this.pos.y = mParkY;
          this.mothershipPhase = "patrolling";
        }
      } else if (this.mothershipPhase === "patrolling" || this.mothershipPhase === "deploying") {
        const hpRatio = this.hitPoints / this.maxHitPoints;
        const prevPhase = this.mothershipCurrentPhase;
        if (hpRatio > 0.6) this.mothershipCurrentPhase = 1;
        else if (hpRatio > 0.3) this.mothershipCurrentPhase = 2;
        else this.mothershipCurrentPhase = 3;

        const patrolSpeed = this.mothershipCurrentPhase >= 2 ? 0.5 : 0.25;
        this.pos.x += Math.sin(this.time * patrolSpeed) * 50 * dt;
        this.pos.y = mParkY + Math.sin(this.time * 0.2) * 4;
        this.pos.x = Math.max(mMargin, Math.min(mCw - mMargin, this.pos.x));

        if (this.mothershipCurrentPhase === 2) {
          this.mothershipWeaponTimer += dt;
          if (this.mothershipWeaponTimer >= 4.0) {
            this.mothershipWeaponTimer = 0;
            this.weaponType = this.weaponType === "spread" ? "missile" : "spread";
          }
        } else if (this.mothershipCurrentPhase === 3) {
          this.weaponType = "scatter";
        }

        if (this.mothershipPhase === "deploying") {
          this.mothershipDeployPauseTimer -= dt;
          if (this.mothershipDeployPauseTimer <= 0) {
            this.mothershipPhase = "patrolling";
          }
        } else if (this.mothershipCurrentPhase < 3) {
          const interval = this.mothershipCurrentPhase === 1
            ? this.MOTHERSHIP_P1_DEPLOY_INTERVAL : this.MOTHERSHIP_P2_DEPLOY_INTERVAL;
          this.mothershipDroneTimer += dt;
          if (this.mothershipDroneTimer >= interval) {
            this.mothershipDroneTimer = 0;
            this.mothershipPhase = "deploying";
            this.mothershipDeployPauseTimer = this.MOTHERSHIP_DEPLOY_PAUSE;
            this.mothershipDroneSpawnReady = true;
          }
        }
      }

      this.mothershipSpawnedDrones = this.mothershipSpawnedDrones.filter(d => d.alive);
    } else if (this.variant === "boss_hydra") {
      const hCw = (canvasWidth ?? 800) + offsetX;
      const hMargin = offsetX + 50;
      const hParkY = offsetY + canvasHeight * 0.15;

      if (this.hydraPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= hParkY) {
          this.pos.y = hParkY;
          this.hydraPhase = "active";
        }
      } else {
        this.pos.x += Math.sin(this.time * 0.3) * 30 * dt;
        this.pos.y = hParkY + Math.cos(this.time * 0.2) * 8;
        this.pos.x = Math.max(hMargin, Math.min(hCw - hMargin, this.pos.x));
        this.hydraOrbitAngle += this.HYDRA_ORBIT_SPEED * dt;

        for (let i = 0; i < 3; i++) {
          if (!this.hydraPodAlive[i]) {
            this.hydraPodRegenTimers[i] += dt;
            if (this.hydraPodRegenTimers[i] >= 12.0) {
              this.hydraPodAlive[i] = true;
              this.hydraPodRegenerated[i] = true;
              this.hydraPodHP[i] = Math.ceil(this.hydraPodMaxHP * 0.5);
              this.hydraPodRegenTimers[i] = 0;
              if (this.hydraVulnerable) {
                this.hydraVulnerable = false;
                this.hydraVulnerabilityTimer = 0;
              }
            }
          }
        }

        if (this.hydraVulnerable) {
          this.hydraVulnerabilityTimer -= dt;
          if (this.hydraVulnerabilityTimer <= 0) {
            this.hydraVulnerable = false;
          }
        }

        if (!this.hydraVulnerable &&
          !this.hydraPodAlive[0] && !this.hydraPodAlive[1] && !this.hydraPodAlive[2] &&
          this.hydraPodRegenTimers[0] < 0.1 && this.hydraPodRegenTimers[1] < 0.1 && this.hydraPodRegenTimers[2] < 0.1) {
          this.hydraVulnerable = true;
          this.hydraVulnerabilityTimer = 3.0;
        }
      }
    } else if (this.variant === "boss_shadow") {
      const sCw = (canvasWidth ?? 800) + offsetX;
      const sMargin = offsetX + 40;
      const sParkY = offsetY + canvasHeight * 0.2;

      if (this.shadowPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= sParkY) {
          this.pos.y = sParkY;
          this.shadowPhase = "visible";
          this.shadowCycleTimer = 0;
          this.shadowCloakAlpha = 1.0;
        }
      } else if (this.shadowPhase === "visible") {
        this.shadowCycleTimer += dt;
        this.shadowCloakAlpha = 1.0;

        if (this.shadowBurstRemaining > 0) {
          this.shadowBurstTimer -= dt;
        }

        this.shadowDashTimer += dt;
        if (this.shadowDashTimer >= this.SHADOW_DASH_INTERVAL) {
          this.shadowDashTimer = 0;
          this.shadowDashTargetX = sMargin + Math.random() * (sCw - sMargin * 2);
          this.shadowDashActive = true;
        }
        if (this.shadowDashActive) {
          const dx = this.shadowDashTargetX - this.pos.x;
          const dashSpeed = this.vel.y * 3;
          if (Math.abs(dx) < 5) {
            this.pos.x = this.shadowDashTargetX;
            this.shadowDashActive = false;
          } else {
            const step = Math.sign(dx) * dashSpeed * dt;
            this.pos.x += Math.abs(step) > Math.abs(dx) ? dx : step;
          }
        }
        this.pos.x = Math.max(sMargin, Math.min(sCw - sMargin, this.pos.x));

        const hpRatio = this.hitPoints / this.maxHitPoints;
        const visDur = hpRatio < 0.4 ? 3.0 : this.SHADOW_VISIBLE_DURATION;
        if (this.shadowCycleTimer >= visDur) {
          this.shadowPhase = "cloaking";
          this.shadowCycleTimer = 0;
        }
      } else if (this.shadowPhase === "cloaking") {
        this.shadowCycleTimer += dt;
        this.shadowCloakAlpha = Math.max(0.05, 1.0 - (this.shadowCycleTimer / this.SHADOW_CLOAK_TRANSITION));
        if (this.shadowCycleTimer >= this.SHADOW_CLOAK_TRANSITION) {
          this.shadowPhase = "cloaked";
          this.shadowCycleTimer = 0;
          this.shadowCloakAlpha = 0.05;
          this.shadowDashTargetX = sMargin + Math.random() * (sCw - sMargin * 2);
        }
      } else if (this.shadowPhase === "cloaked") {
        this.shadowCycleTimer += dt;
        this.shadowCloakAlpha = 0.05;

        const dx = this.shadowDashTargetX - this.pos.x;
        const moveSpeed = this.vel.y * 2;
        if (Math.abs(dx) > 3) {
          const step = Math.sign(dx) * moveSpeed * dt;
          this.pos.x += Math.abs(step) > Math.abs(dx) ? dx : step;
        }
        this.pos.x = Math.max(sMargin, Math.min(sCw - sMargin, this.pos.x));

        const hpRatio = this.hitPoints / this.maxHitPoints;
        const cloakDur = hpRatio < 0.4 ? 4.0 : this.SHADOW_CLOAK_DURATION;
        if (this.shadowCycleTimer >= cloakDur) {
          this.shadowPhase = "decloaking";
          this.shadowCycleTimer = 0;
        }
      } else if (this.shadowPhase === "decloaking") {
        this.shadowCycleTimer += dt;
        this.shadowCloakAlpha = Math.min(1.0, 0.05 + (this.shadowCycleTimer / this.SHADOW_CLOAK_TRANSITION));
        if (this.shadowCycleTimer >= this.SHADOW_CLOAK_TRANSITION) {
          this.shadowPhase = "visible";
          this.shadowCycleTimer = 0;
          this.shadowCloakAlpha = 1.0;
          this.shadowDashTimer = 0;
          this.shadowAmbushReady = true;
        }
      }
    } else if (this.variant === "boss_behemoth") {
      const bCw = (canvasWidth ?? 800) + offsetX;
      const bMargin = offsetX + 50;
      const bParkY = offsetY + canvasHeight * 0.2;

      if (this.behemothPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= bParkY) {
          this.pos.y = bParkY;
          this.behemothPhase = "active";
          this.behemothShieldTimer = 0;
          this.behemothShieldCyclePhase = "shielded";
          this.behemothShieldActive = true;
        }
      } else {
        this.pos.x += Math.sin(this.time * 0.2) * 20 * dt;
        this.pos.y = bParkY + Math.sin(this.time * 0.15) * 3;
        this.pos.x = Math.max(bMargin, Math.min(bCw - bMargin, this.pos.x));

        this.behemothShieldTimer += dt;
        const hpRatio = this.hitPoints / this.maxHitPoints;
        const shieldDur = hpRatio < 0.4 ? 6.0 : this.BEHEMOTH_SHIELD_DURATION;
        const exposedDur = hpRatio < 0.4 ? 5.0 : this.BEHEMOTH_EXPOSED_DURATION;

        if (this.behemothShieldCyclePhase === "shielded") {
          this.behemothShieldActive = true;
          if (this.behemothShieldTimer >= shieldDur) {
            this.behemothShieldCyclePhase = "exposed";
            this.behemothShieldActive = false;
            this.behemothShieldTimer = 0;
          }
        } else {
          this.behemothShieldActive = false;
          if (this.behemothShieldTimer >= exposedDur) {
            this.behemothShieldCyclePhase = "shielded";
            this.behemothShieldActive = true;
            this.behemothShieldTimer = 0;
          }
        }
      }
    } else if (this.variant === "boss_architect") {
      const aCw = (canvasWidth ?? 800) + offsetX;
      const aMargin = offsetX + 50;
      const aParkY = offsetY + canvasHeight * 0.15;

      if (this.architectPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= aParkY) {
          this.pos.y = aParkY;
          this.pos.x = offsetX + (canvasWidth ?? 800) / 2;
          this.architectPhase = "active";
        }
      } else {
        this.architectRotation += dt * 0.5;
        this.pos.x += Math.sin(this.time * 0.15) * 15 * dt;
        this.pos.y = aParkY + Math.sin(this.time * 0.1) * 5;
        this.pos.x = Math.max(aMargin, Math.min(aCw - aMargin, this.pos.x));

        const hpRatio = this.hitPoints / this.maxHitPoints;

        for (let i = this.architectGravityWellsArr.length - 1; i >= 0; i--) {
          this.architectGravityWellsArr[i].timeRemaining -= dt;
          if (this.architectGravityWellsArr[i].timeRemaining <= 0) {
            this.architectGravityWellsArr.splice(i, 1);
          }
        }

        const gravInterval = hpRatio < 0.5 ? 8.0 : this.ARCHITECT_GRAVITY_INTERVAL;
        this.architectGravityTimer += dt;
        if (this.architectGravityTimer >= gravInterval) {
          this.architectGravityTimer = 0;
          const wellCount = hpRatio < 0.5 ? 2 : 1;
          for (let i = 0; i < wellCount; i++) {
            this.architectGravityWellsArr.push({
              x: offsetX + 60 + Math.random() * ((canvasWidth ?? 800) - 120),
              y: offsetY + canvasHeight * 0.3 + Math.random() * (canvasHeight * 0.5),
              timeRemaining: this.ARCHITECT_GRAVITY_DURATION,
              strength: this.ARCHITECT_GRAVITY_STRENGTH,
              radius: 120,
            });
          }
        }

        if (hpRatio < 0.25 && !this.architectFragmentsDetached) {
          this.architectFragmentsDetached = true;
          this.architectPhase = "exposed";
        }
      }

      this.architectSpawnedFragments = this.architectSpawnedFragments.filter(d => d.alive);
    } else if (this.variant === "boss_swarm_queen") {
      const qCw = (canvasWidth ?? 800) + offsetX;
      const qMargin = offsetX + 40;
      const qParkY = offsetY + canvasHeight * 0.18;

      if (this.queenPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= qParkY) {
          this.pos.y = qParkY;
          this.queenPhase = "active";
        }
      } else {
        const hpRatio = this.hitPoints / this.maxHitPoints;
        const amplitude = 40 + (1 - hpRatio) * 40;
        this.pos.x += Math.sin(this.time * 0.6) * amplitude * dt;
        this.pos.y = qParkY + Math.sin(this.time * 0.35) * 6;
        this.pos.x = Math.max(qMargin, Math.min(qCw - qMargin, this.pos.x));

        this.queenSpawnedLocusts = this.queenSpawnedLocusts.filter(d => d.alive);

        let spawnInterval: number;
        if (hpRatio > 0.7) spawnInterval = 5.0;
        else if (hpRatio > 0.4) spawnInterval = 4.0;
        else spawnInterval = 3.0;

        this.queenSpawnTimer += dt;
        if (this.queenSpawnTimer >= spawnInterval && this.queenSpawnedLocusts.length < this.QUEEN_MAX_LOCUSTS) {
          this.queenSpawnTimer = 0;
          this.queenSpawnReady = true;
        }

        if (this.queenSwarmResponseActive) {
          this.queenSwarmResponseTimer -= dt;
          if (this.queenSwarmResponseTimer <= 0) {
            this.queenSwarmResponseActive = false;
          }
        }
      }
    } else if (isBossVariant(this.variant)) {
      this.pos.x += Math.sin(this.time * 1.5) * 60 * dt;
      const bossTargetY = offsetY + canvasHeight * 0.15;
      if (this.pos.y < bossTargetY) {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y > bossTargetY) this.pos.y = bossTargetY;
      }
    } else if (this.variant === "interceptor") {
      this.pos.x += Math.sin(this.time * 4) * 120 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "drone") {
      this.pos.x += (Math.random() - 0.5) * 40 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "swarmer" && targetX !== undefined) {
      const dx = targetX - this.pos.x;
      this.pos.x += dx * 1.5 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "cruiser") {
      const patrolThreshold = offsetY + canvasHeight * 0.3;
      if (this.pos.y >= patrolThreshold) {
        this.pos.y += this.vel.y * 0.1 * dt;
        this.pos.x += Math.sin(this.time * 0.8) * 50 * dt;
      } else {
        this.pos.y += this.vel.y * dt;
      }
    } else if (this.variant === "destroyer") {
      const stopY = offsetY + canvasHeight * 0.25;
      if (this.pos.y < stopY) {
        this.pos.y += this.vel.y * dt;
      } else {
        this.pos.x += Math.sin(this.time * 0.6) * 40 * dt;
        this.pos.y += Math.sin(this.time * 0.3) * 5 * dt;
      }
    } else if (this.variant === "juggernaut") {
      const targetY = offsetY + canvasHeight * 0.2;
      if (this.pos.y < targetY) {
        this.pos.y += this.vel.y * dt;
      } else {
        this.pos.x += Math.sin(this.time * 1.0) * 70 * dt;
      }
    } else if (this.variant === "stealth") {
      this.pos.x += Math.sin(this.time * 2) * 40 * dt;
      this.pos.y += this.vel.y * dt;

      this.cloakTimer += dt;
      if (this.cloakVisible) {
        if (this.cloakTimer >= this.CLOAK_VISIBLE_DURATION) {
          this.cloakVisible = false;
          this.cloakTimer = 0;
        }
      } else {
        if (this.cloakTimer >= this.CLOAK_HIDDEN_DURATION) {
          this.cloakVisible = true;
          this.cloakTimer = 0;
        }
      }
    } else if (this.variant === "minelayer") {
      const rightEdge = offsetX + (canvasWidth ?? 800);
      if (!this.minelayerInitialized) {
        this.minelayerInitialized = true;
        this.minelayerDirection = Math.random() < 0.5 ? -1 : 1;
        this.vel.x = this.minelayerDirection * Math.abs(this.vel.y);
        this.vel.y = 20;
        if (this.minelayerDirection > 0) {
          this.pos.x = offsetX - 30;
        } else {
          this.pos.x = rightEdge + 30;
        }
        if (this.pos.y < 0) {
          this.pos.y = offsetY + 30 + Math.random() * 100;
        }
      }

      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      this.mineTimer += dt;

      if (
        (this.minelayerDirection > 0 && this.pos.x > rightEdge + 50) ||
        (this.minelayerDirection < 0 && this.pos.x < offsetX - 50)
      ) {
        this.alive = false;
      }
    } else if (this.variant === "wasp") {
      this.pos.x += Math.sin(this.time * 6) * 80 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "phantom") {
      this.pos.y += this.vel.y * dt;

      this.phantomTimer += dt;
      if (this.phantomVisible) {
        if (this.phantomTimer >= this.PHANTOM_VISIBLE_DURATION) {
          this.phantomVisible = false;
          this.phantomTimer = 0;
        }
      } else {
        if (this.phantomTimer >= this.PHANTOM_HIDDEN_DURATION) {
          this.phantomVisible = true;
          this.phantomTimer = 0;
        }
      }
    } else if (this.variant === "needle") {
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "locust") {
      this.pos.x += (Math.random() - 0.5) * 30 * dt;
      if (targetX !== undefined) {
        const dx = targetX - this.pos.x;
        this.pos.x += dx * 0.5 * dt;
      }
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "glider") {
      this.pos.x += Math.sin(this.time * 1.5) * 100 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "spark") {
      this.pos.x += (Math.random() - 0.5) * 60 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "sentinel") {
      const sentinelParkY = offsetY + canvasHeight * 0.3;
      if (this.sentinelPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= sentinelParkY) {
          this.pos.y = sentinelParkY;
          this.sentinelPhase = "hovering";
        }
      } else {
        this.pos.y = sentinelParkY + Math.sin(this.time * 2) * 3;
      }
    } else if (this.variant === "lancer") {
      if (this.lancerPhase === "drifting") {
        this.pos.y += this.vel.y * dt;
        this.lancerDriftTimer += dt;
        if (this.lancerDriftTimer >= this.LANCER_DRIFT_INTERVAL) {
          this.lancerDriftTimer = 0;
          this.lancerPhase = "charging";
          this.lancerChargeTimer = this.LANCER_CHARGE_DURATION;
          this.lancerTargetX = targetX ?? this.pos.x;
        }
      } else {
        const chargeSpeed = this.vel.y * 3;
        this.pos.y += chargeSpeed * dt;
        const dx = this.lancerTargetX - this.pos.x;
        this.pos.x += dx * 4 * dt;
        this.lancerChargeTimer -= dt;
        if (this.lancerChargeTimer <= 0) {
          this.lancerPhase = "drifting";
        }
      }
    } else if (this.variant === "ravager" && targetX !== undefined) {
      const dx = targetX - this.pos.x;
      this.pos.x += dx * 1.0 * dt;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "wraith") {
      this.pos.y += this.vel.y * dt;
      if (this.wraithInvulnTimer > 0) {
        this.wraithInvulnTimer -= dt;
      }
      this.wraithCanvasWidth = canvasWidth ?? 800;
      this.wraithOffsetX = offsetX;
    } else if (this.variant === "corsair") {
      const cw = canvasWidth ?? 800;
      const corsairParkY = offsetY + canvasHeight * 0.25;
      const corsairMargin = 40;

      if (this.corsairPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= corsairParkY) {
          this.pos.y = corsairParkY;
          this.corsairBaseY = corsairParkY;
          this.corsairPhase = "strafing";
          this.corsairStrafeDirection = this.pos.x > offsetX + cw / 2 ? -1 : 1;
        }
      } else {
        this.pos.x += this.corsairStrafeDirection * 180 * dt;
        this.pos.y = this.corsairBaseY + Math.sin(this.time * 2) * 3;

        if (this.pos.x >= offsetX + cw - corsairMargin) {
          this.pos.x = offsetX + cw - corsairMargin;
          this.corsairStrafeDirection = -1;
        } else if (this.pos.x <= offsetX + corsairMargin) {
          this.pos.x = offsetX + corsairMargin;
          this.corsairStrafeDirection = 1;
        }
      }
    } else if (this.variant === "vulture") {
      const vCw = canvasWidth ?? 800;

      if (this.vulturePhase === "entering") {
        this.vultureCenterX = offsetX + vCw / 2;
        this.vultureCenterY = offsetY + canvasHeight * 0.4;
        const radiusX = vCw * 0.3;
        const radiusY = canvasHeight * 0.2;

        const dx = this.vultureCenterX - this.pos.x;
        const dy = this.vultureCenterY - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 20) {
          this.vulturePhase = "orbiting";
          this.vultureOrbitAngle = Math.atan2(
            (this.pos.y - this.vultureCenterY) / radiusY,
            (this.pos.x - this.vultureCenterX) / radiusX
          );
        } else {
          const speed = 160 * dt;
          this.pos.x += (dx / dist) * speed;
          this.pos.y += (dy / dist) * speed;
        }
      } else {
        const radiusX = vCw * 0.3;
        const radiusY = canvasHeight * 0.2;
        const angularSpeed = 160 / Math.max(radiusX, radiusY);
        this.vultureOrbitAngle += angularSpeed * dt * (1 + 0.2 * Math.sin(this.time));
        this.pos.x = this.vultureCenterX + radiusX * Math.cos(this.vultureOrbitAngle);
        this.pos.y = this.vultureCenterY + radiusY * Math.sin(this.vultureOrbitAngle);
      }
    } else if (this.variant === "titan") {
      const cw = canvasWidth ?? 800;
      const margin = offsetX + 40;
      const parkY = offsetY + canvasHeight * 0.2;

      if (this.titanPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.titanPhase = "drifting";
        }
      } else {
        this.pos.x += Math.sin(this.time * 0.4) * 60 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.6) * 4;
        this.pos.x = Math.max(margin, Math.min(offsetX + cw - margin, this.pos.x));
      }

      this.titanWeaponTimer += dt;
      if (this.titanWeaponTimer >= this.TITAN_WEAPON_SWITCH_INTERVAL) {
        this.titanWeaponTimer = 0;
        this.weaponType = this.weaponType === "spread" ? "missile" : "spread";
      }
    } else if (this.variant === "bastion") {
      if (this.bastionPhase === "entering") {
        if (this.bastionDeployY === 0) {
          this.bastionDeployY = offsetY + canvasHeight * (0.15 + Math.random() * 0.2);
        }
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= this.bastionDeployY) {
          this.pos.y = this.bastionDeployY;
          this.bastionPhase = "deployed";
        }
      } else {
        if (targetX !== undefined) {
          this.bastionTurretAngle = Math.atan2(
            (canvasHeight + offsetY) - this.pos.y,
            targetX - this.pos.x
          );
        }
      }
    } else if (this.variant === "siege_engine") {
      const cw = canvasWidth ?? 800;
      const margin = offsetX + 40;
      const parkY = offsetY + canvasHeight * 0.15;

      if (this.siegePhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.siegePhase = "positioned";
        }
      } else {
        this.pos.x += Math.sin(this.time * 0.2) * 30 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.3) * 3;
        this.pos.x = Math.max(margin, Math.min(offsetX + cw - margin, this.pos.x));
      }
    } else if (this.variant === "colossus") {
      this.pos.y += this.vel.y * dt;
      if (targetX !== undefined) {
        const dx = targetX - this.pos.x;
        this.pos.x += dx * 0.3 * dt;
      }
    } else if (this.variant === "warden") {
      const cw = canvasWidth ?? 800;
      const margin = offsetX + 40;
      const parkY = offsetY + canvasHeight * 0.25;

      if (this.wardenPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.wardenPhase = "patrolling";
          this.wardenPatrolDirection = this.pos.x > offsetX + cw / 2 ? -1 : 1;
        }
      } else {
        this.pos.x += this.wardenPatrolDirection * 50 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.5) * 3;

        if (this.pos.x >= offsetX + cw - margin) {
          this.pos.x = offsetX + cw - margin;
          this.wardenPatrolDirection = -1;
        } else if (this.pos.x <= margin) {
          this.pos.x = margin;
          this.wardenPatrolDirection = 1;
        }
      }
      this.barrierHP = Math.min(this.barrierMaxHP, this.barrierHP + this.barrierRegenRate * dt);
    } else if (this.variant === "leviathan") {
      const cw = canvasWidth ?? 800;
      const margin = offsetX + 50;
      const parkY = offsetY + canvasHeight * 0.22;

      if (this.leviathanPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= parkY) {
          this.pos.y = parkY;
          this.leviathanPhase = "patrolling";
        }
      } else if (this.leviathanPhase === "patrolling") {
        this.pos.x += Math.sin(this.time * 0.35) * 40 * dt;
        this.pos.y = parkY + Math.sin(this.time * 0.25) * 4;
        this.pos.x = Math.max(margin, Math.min(offsetX + cw - margin, this.pos.x));

        this.leviathanDroneTimer += dt;
        if (this.leviathanDroneTimer >= this.LEVIATHAN_DRONE_INTERVAL) {
          this.leviathanDroneTimer = 0;
          this.leviathanPhase = "deploying";
          this.leviathanDeployPauseTimer = this.LEVIATHAN_DEPLOY_PAUSE;
          this.leviathanDroneSpawnReady = true;
        }
      } else if (this.leviathanPhase === "deploying") {
        this.pos.y = parkY + Math.sin(this.time * 0.25) * 4;
        this.leviathanDeployPauseTimer -= dt;
        if (this.leviathanDeployPauseTimer <= 0) {
          this.leviathanPhase = "patrolling";
        }
      }

      this.leviathanSpawnedDrones = this.leviathanSpawnedDrones.filter(d => d.alive);
    } else if (this.variant === "splitter") {
      if (!this.splitterBaseXInitialized) {
        this.splitterBaseX = this.pos.x;
        this.splitterBaseXInitialized = true;
      }
      this.splitterWeaveTime += dt;
      this.pos.x = this.splitterBaseX + Math.sin(this.splitterWeaveTime * 1.5 * Math.PI * 2) * 30;
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "splitter_minor") {
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "healer") {
      this.pos.y += this.vel.y * dt;
    } else if (this.variant === "teleporter") {
      this.teleporterBlinkTimer -= dt;

      if (this.teleporterFlashTimer > 0) {
        this.teleporterFlashTimer -= dt;
      }

      if (this.teleporterBlinkTimer <= 0) {
        const departX = this.pos.x;
        const departY = this.pos.y;
        const cw = canvasWidth ?? 800;
        const margin = 30;
        this.pos.x = offsetX + margin + Math.random() * (cw - margin * 2);
        this.pos.y = offsetY + margin + Math.random() * (canvasHeight * 0.6 - margin);
        this.teleporterBlinkTimer = this.TELEPORTER_BLINK_INTERVAL;
        this.teleporterPostBlinkFireTimer = this.TELEPORTER_POST_BLINK_FIRE_DELAY;
        this.teleporterFlashTimer = this.TELEPORTER_FLASH_DURATION;
        this.teleporterPendingFlash = { departX, departY, arriveX: this.pos.x, arriveY: this.pos.y };
      }

      if (this.teleporterPostBlinkFireTimer > 0) {
        this.teleporterPostBlinkFireTimer -= dt;
        if (this.teleporterPostBlinkFireTimer <= 0) {
          this.teleporterBurstRemaining = 2;
          this.teleporterBurstTimer = 0;
        }
      }

      if (this.teleporterBurstRemaining > 0) {
        this.teleporterBurstTimer -= dt;
      }
    } else if (this.variant === "mimic") {
      const cw = canvasWidth ?? 800;
      const playerX = targetX ?? (offsetX + cw / 2);

      if (!this.mimicInitialized) {
        this.mimicInitialized = true;
        this.mimicSmoothedX = playerX;
        this.mimicBaseY = offsetY + canvasHeight * 0.2;
      }

      this.mimicSmoothedX += (playerX - this.mimicSmoothedX) * (1 - Math.exp(-dt / 0.3));
      this.pos.x = this.mimicSmoothedX;
      this.pos.y = this.mimicBaseY + Math.sin(this.time * 1.5) * 20;
    } else if (this.variant === "kamikaze") {
      if (this.kamikazePhase === "approaching") {
        this.pos.y += this.vel.y * dt;
        this.kamikazeLockTimer += dt;
        if (this.kamikazeLockTimer >= this.KAMIKAZE_LOCK_DELAY) {
          this.kamikazePhase = "locked";
        }
        if (this.pos.y > offsetY + canvasHeight + 50) {
          this.alive = false;
        }
      } else if (this.kamikazePhase === "locked") {
        this.kamikazeTargetPos = { x: targetX ?? this.pos.x, y: targetY ?? (offsetY + canvasHeight * 0.85) };
        this.kamikazePhase = "diving";
      } else if (this.kamikazePhase === "diving") {
        this.kamikazeCurrentSpeed = Math.min(
          this.kamikazeCurrentSpeed + this.KAMIKAZE_ACCELERATION * dt,
          this.KAMIKAZE_MAX_SPEED
        );
        const dx = this.kamikazeTargetPos.x - this.pos.x;
        const dy = this.kamikazeTargetPos.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          this.kamikazeSelfDestructed = true;
          this.alive = false;
        } else {
          const nx = dx / dist;
          const ny = dy / dist;
          this.pos.x += nx * this.kamikazeCurrentSpeed * dt;
          this.pos.y += ny * this.kamikazeCurrentSpeed * dt;
        }

        if (this.pos.y > offsetY + canvasHeight + 50 || this.pos.x < offsetX - 50 ||
            this.pos.x > offsetX + (canvasWidth ?? 800) + 50) {
          this.alive = false;
        }
      }
    } else if (this.variant === "jammer") {
      const cw = canvasWidth ?? 800;
      const margin = 40;

      if (this.jammerPhase === "entering") {
        this.pos.y += this.vel.y * dt;
        if (this.pos.y >= offsetY + canvasHeight * 0.3) {
          this.pos.y = offsetY + canvasHeight * 0.3;
          this.jammerDeployY = this.pos.y;
          this.jammerPhase = "drifting";
          this.jammerDriftDirection = this.pos.x > offsetX + cw / 2 ? -1 : 1;
        }
      } else {
        this.pos.x += this.jammerDriftDirection * 40 * dt;
        this.pos.y = this.jammerDeployY + Math.sin(this.time * 0.5) * 8;

        if (this.pos.x >= offsetX + cw - margin) {
          this.pos.x = offsetX + cw - margin;
          this.jammerDriftDirection = -1;
        } else if (this.pos.x <= offsetX + margin) {
          this.pos.x = offsetX + margin;
          this.jammerDriftDirection = 1;
        }
      }
    } else {
      this.pos.y += this.vel.y * dt;
    }

    if (this.fireRate > 0) {
      const cooldownRate = (this.variant === "boss_behemoth" && !this.behemothShieldActive) ? 2
        : (this.variant === "boss_mothership" && this.mothershipCurrentPhase === 3) ? 2 : 1;
      this.fireCooldown -= dt * cooldownRate;
    }

    if (
      !isBossVariant(this.variant) && this.variant !== "destroyer" &&
      this.variant !== "juggernaut" && this.variant !== "minelayer" &&
      this.variant !== "sentinel" && this.variant !== "corsair" &&
      this.variant !== "vulture" &&
      this.variant !== "titan" && this.variant !== "bastion" &&
      this.variant !== "siege_engine" && this.variant !== "colossus" &&
      this.variant !== "warden" && this.variant !== "leviathan" &&
      this.variant !== "teleporter" && this.variant !== "mimic" &&
      this.variant !== "jammer" && this.variant !== "kamikaze" &&
      this.pos.y > offsetY + canvasHeight + 50
    ) {
      this.alive = false;
    }
  }

  canFire(): boolean {
    if (this.variant === "stealth" && !this.cloakVisible) return false;
    if (this.variant === "phantom" && !this.phantomVisible) return false;
    if (this.variant === "lancer" && this.lancerPhase !== "charging") return false;
    if (this.variant === "boss_shadow" && (this.shadowPhase === "cloaked" || this.shadowPhase === "cloaking")) return false;
    if (this.variant === "teleporter") return false;
    return this.fireRate > 0 && this.fireCooldown <= 0 && this.alive;
  }

  shouldDropMine(): boolean {
    if (this.variant !== "minelayer") return false;
    if (this.mineTimer >= this.MINE_DROP_INTERVAL) {
      this.mineTimer = 0;
      return true;
    }
    return false;
  }

  resetFireCooldown(multiplier = 1): void {
    this.fireCooldown = (1 / this.fireRate) * multiplier;
  }

  private initiateBurst(): void {
    this.burstRemaining = this.BURST_COUNT;
    this.burstTimer = 0;
    this.burstSpreadIndex = 0;
  }

  public hasPendingBurst(): boolean {
    return this.burstRemaining > 0 && this.burstTimer <= 0;
  }

  public consumeBurstTick(): { offsetX: number; offsetY: number } {
    this.burstRemaining--;
    this.burstTimer = this.BURST_INTERVAL;
    const spreadOffsets = [-24, -8, 8, 24];
    const offsetX = spreadOffsets[this.burstSpreadIndex % spreadOffsets.length];
    this.burstSpreadIndex++;
    return { offsetX, offsetY: this.height * 0.3 };
  }

  public initiateShadowBurst(): void {
    this.shadowBurstRemaining = this.SHADOW_BURST_COUNT;
    this.shadowBurstTimer = this.SHADOW_BURST_INTERVAL;
    this.shadowBurstSpreadIndex = 0;
  }

  public hasShadowBurst(): boolean {
    return this.shadowBurstRemaining > 0 && this.shadowBurstTimer <= 0;
  }

  public consumeShadowBurstTick(): { offsetX: number; offsetY: number } {
    this.shadowBurstRemaining--;
    this.shadowBurstTimer = this.SHADOW_BURST_INTERVAL;
    const spreadOffsets = [-12, 12];
    const offsetX = spreadOffsets[this.shadowBurstSpreadIndex % spreadOffsets.length];
    this.shadowBurstSpreadIndex++;
    return { offsetX, offsetY: this.height * 0.3 };
  }

  public toggleFortressPhase(): void {
    this.fortressAttackPhase = this.fortressAttackPhase === "A" ? "B" : "A";
  }

  public shouldSpawnDrones(): boolean {
    if (this.variant === "boss_carrier") {
      if (!this.droneSpawnReady) return false;
      this.droneSpawnReady = false;
      return true;
    }
    if (this.variant === "leviathan") {
      if (!this.leviathanDroneSpawnReady) return false;
      this.leviathanDroneSpawnReady = false;
      return true;
    }
    if (this.variant === "boss_mothership") {
      if (!this.mothershipDroneSpawnReady) return false;
      this.mothershipDroneSpawnReady = false;
      return true;
    }
    if (this.variant === "boss_architect" && this.architectFragmentsDetached && !this.architectFragmentsSpawned) {
      this.architectFragmentsSpawned = true;
      return true;
    }
    if (this.variant === "boss_swarm_queen") {
      if (!this.queenSpawnReady) return false;
      this.queenSpawnReady = false;
      return true;
    }
    return false;
  }

  public getDroneSpawnVariant(): EnemyVariant {
    if (this.variant === "leviathan") return "drone";
    if (this.variant === "boss_mothership") {
      if (this.mothershipCurrentPhase === 1) return "drone";
      this.droneWaveVariantToggle = !this.droneWaveVariantToggle;
      return this.droneWaveVariantToggle ? "swarmer" : "drone";
    }
    if (this.variant === "boss_architect") return "drone";
    if (this.variant === "boss_swarm_queen") return "locust";
    this.droneWaveVariantToggle = !this.droneWaveVariantToggle;
    return this.droneWaveVariantToggle ? "swarmer" : "drone";
  }

  public getDroneSpawnVariantForIndex(index: number): EnemyVariant {
    if (this.variant === "boss_mothership") {
      if (this.mothershipCurrentPhase === 1) return "drone";
      return index < 2 ? "swarmer" : "drone";
    }
    return this.getDroneSpawnVariant();
  }

  public getDroneSpawnCount(): number {
    if (this.variant === "boss_mothership") {
      return this.mothershipCurrentPhase === 1 ? 3 : 4;
    }
    if (this.variant === "boss_architect") return 4;
    if (this.variant === "boss_swarm_queen") {
      const hpRatio = this.hitPoints / this.maxHitPoints;
      if (hpRatio > 0.7) return 2;
      if (hpRatio > 0.4) return 3;
      return 4;
    }
    return 2;
  }

  public getDroneSpawnPositions(): Vec2[] {
    const offsetX = this.width * 0.4;
    return [
      { x: this.pos.x - offsetX, y: this.pos.y + this.height * 0.3 },
      { x: this.pos.x + offsetX, y: this.pos.y + this.height * 0.3 },
    ];
  }

  public get isDeploying(): boolean {
    return (this.variant === "boss_carrier" && this.carrierPhase === "deploying")
      || (this.variant === "leviathan" && this.leviathanPhase === "deploying")
      || (this.variant === "boss_mothership" && this.mothershipPhase === "deploying");
  }

  // --- Hydra accessors ---
  public getHydraPodHP(index: number): number { return this.hydraPodHP[index]; }
  public isHydraPodAlive(index: number): boolean { return this.hydraPodAlive[index]; }
  public isHydraVulnerable(): boolean { return this.hydraVulnerable; }

  public hitHydraPod(index: number, damage: number): boolean {
    if (!this.hydraPodAlive[index]) return false;
    this.hydraPodHP[index] -= damage;
    if (this.hydraPodHP[index] <= 0) {
      this.hydraPodHP[index] = 0;
      this.hydraPodAlive[index] = false;
      this.hydraPodRegenTimers[index] = 0;
      return true;
    }
    return false;
  }

  public getHydraPodPositions(): Vec2[] {
    const r = this.HYDRA_ORBIT_RADIUS;
    const baseAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    return baseAngles.map(base => {
      const angle = base + this.hydraOrbitAngle;
      return {
        x: this.pos.x + Math.cos(angle) * r,
        y: this.pos.y + Math.sin(angle) * r,
      };
    });
  }

  public getHydraPodWeapons(): EnemyWeaponType[] {
    return ["spread", "missile", "laser"];
  }

  // --- Shadow accessors ---
  public isShadowCloaked(): boolean {
    return this.shadowPhase === "cloaked" || this.shadowPhase === "cloaking";
  }
  public getShadowAlpha(): number { return this.shadowCloakAlpha; }

  // --- Behemoth accessors ---
  public isBehemothShielded(): boolean { return this.behemothShieldActive; }
  public getBehemothShieldCyclePhase(): "shielded" | "exposed" { return this.behemothShieldCyclePhase; }

  // --- Architect accessors ---
  public getArchitectGravityWells(): GravityWell[] { return this.architectGravityWellsArr; }
  public isArchitectExposed(): boolean { return this.architectFragmentsDetached; }
  public isArchitectFragmentsSpawned(): boolean { return this.architectFragmentsSpawned; }

  // --- Swarm Queen accessors ---
  public getQueenSpawnedLocusts(): Enemy[] { return this.queenSpawnedLocusts; }

  // --- Splitter accessors ---
  public getSplitterChildSpawnData(): { x1: number; y1: number; x2: number; y2: number; speed: number } {
    return {
      x1: this.pos.x - 15, y1: this.pos.y,
      x2: this.pos.x + 15, y2: this.pos.y,
      speed: this.vel.y,
    };
  }

  // --- Healer methods ---
  public updateHealerLogicWithDt(enemies: Enemy[], dt: number): { targetX: number; targetY: number } | null {
    if (!this.alive || this.variant !== "healer") return null;

    let nearestDamaged: Enemy | null = null;
    let nearestDist = Infinity;

    for (const other of enemies) {
      if (other === this || !other.alive || isBossVariant(other.variant)) continue;
      if (other.hitPoints >= other.maxHitPoints) continue;
      const dx = other.pos.x - this.pos.x;
      const dy = other.pos.y - this.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestDamaged = other;
      }
    }

    if (nearestDamaged && nearestDist <= this.HEALER_GRAVITATE_RANGE) {
      const dx = nearestDamaged.pos.x - this.pos.x;
      const dy = nearestDamaged.pos.y - this.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        this.pos.x += (dx / dist) * 30 * dt;
        this.pos.y += (dy / dist) * 30 * dt;
      }
    }

    if (nearestDamaged && nearestDist <= this.HEALER_HEAL_RANGE) {
      this.healerHealTimer += dt;
      if (this.healerHealTimer >= this.HEALER_HEAL_INTERVAL) {
        this.healerHealTimer -= this.HEALER_HEAL_INTERVAL;
        nearestDamaged.hitPoints = Math.min(nearestDamaged.hitPoints + 1, nearestDamaged.maxHitPoints);
        return { targetX: nearestDamaged.pos.x, targetY: nearestDamaged.pos.y };
      }
    } else {
      this.healerHealTimer = 0;
    }

    return null;
  }

  // --- Teleporter accessors ---
  public hasTeleporterBurst(): boolean {
    return this.teleporterBurstRemaining > 0 && this.teleporterBurstTimer <= 0;
  }

  public consumeTeleporterBurstTick(): void {
    this.teleporterBurstRemaining--;
    this.teleporterBurstTimer = 0.08;
  }

  public getTeleporterFlashAlpha(): number {
    if (this.teleporterFlashTimer <= 0) return 0;
    return this.teleporterFlashTimer / this.TELEPORTER_FLASH_DURATION;
  }

  public consumeTeleportFlash(): { departX: number; departY: number; arriveX: number; arriveY: number } | null {
    const flash = this.teleporterPendingFlash;
    this.teleporterPendingFlash = null;
    return flash;
  }

  // --- Kamikaze accessors ---
  public isKamikazeSelfDestructed(): boolean { return this.kamikazeSelfDestructed; }
  public getKamikazePhase(): string { return this.kamikazePhase; }

  // --- Jammer accessors ---
  public isJammerActive(): boolean {
    return this.variant === "jammer" && this.alive && this.jammerPhase === "drifting";
  }

  hit(damage = 1): boolean {
    if (!this.alive) return false;

    if (this.variant === "wraith" && this.wraithInvulnTimer > 0) return false;

    this.hitPoints -= damage;
    this.flashTimer = 0.08;
    if (this.hitPoints <= 0) {
      this.hitPoints = 0;
      this.alive = false;
      return true;
    }

    if (this.variant === "wraith" && this.wraithTeleportsRemaining > 0) {
      this.wraithTeleportsRemaining--;
      this.wraithInvulnTimer = this.WRAITH_INVULN_DURATION;
      const margin = 40;
      this.pos.x = this.wraithOffsetX + margin + Math.random() * (this.wraithCanvasWidth - margin * 2);
    }

    if (this.variant === "boss_swarm_queen" && this.queenSpawnedLocusts.length > 0) {
      this.queenSwarmResponseActive = true;
      this.queenSwarmResponseTimer = 1.0;
    }

    return false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const x = this.pos.x;
    const y = this.pos.y;
    const isFlashing = this.flashTimer > 0;

    ctx.save();

    if (this.variant === "sentinel") {
      ctx.fillStyle = "rgba(100, 200, 220, 0.12)";
      ctx.beginPath();
      ctx.arc(x, y, Enemy.SENTINEL_AURA_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.sprite) {
      this.renderSpriteVariant(ctx, x, y, isFlashing);
    } else {
      switch (this.variant) {
        case "scout":
          this.renderScout(ctx, x, y, isFlashing);
          break;
        case "fighter":
          this.renderFighter(ctx, x, y, isFlashing);
          break;
        case "bomber":
          this.renderBomber(ctx, x, y, isFlashing);
          break;
        case "boss":
          this.renderBoss(ctx, x, y, isFlashing);
          break;
        case "boss_gunship":
          this.renderBossGunship(ctx, x, y, isFlashing);
          break;
        case "boss_dreadnought":
          this.renderBossDreadnought(ctx, x, y, isFlashing);
          break;
        case "boss_fortress":
          this.renderBossFortress(ctx, x, y, isFlashing);
          break;
        case "boss_carrier":
          this.renderBossCarrier(ctx, x, y, isFlashing);
          break;
        case "interceptor":
          this.renderInterceptor(ctx, x, y, isFlashing);
          break;
        case "dart":
          this.renderDart(ctx, x, y, isFlashing);
          break;
        case "drone":
          this.renderDrone(ctx, x, y, isFlashing);
          break;
        case "swarmer":
          this.renderSwarmer(ctx, x, y, isFlashing);
          break;
        case "gunship":
          this.renderGunship(ctx, x, y, isFlashing);
          break;
        case "cruiser":
          this.renderCruiser(ctx, x, y, isFlashing);
          break;
        case "destroyer":
          this.renderDestroyer(ctx, x, y, isFlashing);
          break;
        case "juggernaut":
          this.renderJuggernaut(ctx, x, y, isFlashing);
          break;
        case "stealth":
          this.renderStealth(ctx, x, y, isFlashing);
          break;
        case "minelayer":
          this.renderMinelayer(ctx, x, y, isFlashing);
          break;
        case "wasp":
          this.renderWasp(ctx, x, y, isFlashing);
          break;
        case "phantom":
          this.renderPhantom(ctx, x, y, isFlashing);
          break;
        case "needle":
          this.renderNeedle(ctx, x, y, isFlashing);
          break;
        case "locust":
          this.renderLocust(ctx, x, y, isFlashing);
          break;
        case "glider":
          this.renderGlider(ctx, x, y, isFlashing);
          break;
        case "spark":
          this.renderSpark(ctx, x, y, isFlashing);
          break;
        case "sentinel":
          this.renderSentinel(ctx, x, y, isFlashing);
          break;
        case "lancer":
          this.renderLancer(ctx, x, y, isFlashing);
          break;
        case "ravager":
          this.renderRavager(ctx, x, y, isFlashing);
          break;
        case "wraith":
          this.renderWraith(ctx, x, y, isFlashing);
          break;
        case "corsair":
          this.renderCorsair(ctx, x, y, isFlashing);
          break;
        case "vulture":
          this.renderVulture(ctx, x, y, isFlashing);
          break;
        case "titan":
          this.renderTitan(ctx, x, y, isFlashing);
          break;
        case "bastion":
          this.renderBastion(ctx, x, y, isFlashing);
          break;
        case "siege_engine":
          this.renderSiegeEngine(ctx, x, y, isFlashing);
          break;
        case "colossus":
          this.renderColossus(ctx, x, y, isFlashing);
          break;
        case "warden":
          this.renderWarden(ctx, x, y, isFlashing);
          break;
        case "leviathan":
          this.renderLeviathan(ctx, x, y, isFlashing);
          break;
        case "boss_mothership":
          this.renderBossMothership(ctx, x, y, isFlashing);
          break;
        case "boss_hydra":
          this.renderBossHydra(ctx, x, y, isFlashing);
          break;
        case "boss_shadow":
          this.renderBossShadow(ctx, x, y, isFlashing);
          break;
        case "boss_behemoth":
          this.renderBossBehemoth(ctx, x, y, isFlashing);
          break;
        case "boss_architect":
          this.renderBossArchitect(ctx, x, y, isFlashing);
          break;
        case "boss_swarm_queen":
          this.renderBossSwarmQueen(ctx, x, y, isFlashing);
          break;
        case "splitter":
          this.renderSplitter(ctx, x, y, isFlashing);
          break;
        case "splitter_minor":
          this.renderSplitterMinor(ctx, x, y, isFlashing);
          break;
        case "healer":
          this.renderHealer(ctx, x, y, isFlashing);
          break;
        case "teleporter":
          this.renderTeleporter(ctx, x, y, isFlashing);
          break;
        case "mimic":
          this.renderMimic(ctx, x, y, isFlashing);
          break;
        case "kamikaze":
          this.renderKamikaze(ctx, x, y, isFlashing);
          break;
        case "jammer":
          this.renderJammer(ctx, x, y, isFlashing);
          break;
        default:
          this.renderFallbackShape(ctx, x, y, isFlashing);
          break;
      }
    }

    ctx.restore();
  }

  private static getFlashCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    if (!Enemy._flashCanvas || !Enemy._flashCtx) {
      Enemy._flashCanvas = document.createElement("canvas");
      Enemy._flashCtx = Enemy._flashCanvas.getContext("2d")!;
    }
    if (Enemy._flashCanvas.width < w) Enemy._flashCanvas.width = w;
    if (Enemy._flashCanvas.height < h) Enemy._flashCanvas.height = h;
    return [Enemy._flashCanvas, Enemy._flashCtx];
  }

  private renderSpriteVariant(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    if (isBossVariant(this.variant)) {
      ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
      ctx.beginPath();
      ctx.arc(x, y, this.width * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.variant === "juggernaut") {
      ctx.fillStyle = "rgba(102, 68, 136, 0.15)";
      ctx.beginPath();
      ctx.arc(x, y, this.width * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.variant === "stealth" && !this.cloakVisible && !flash) {
      ctx.globalAlpha = 0.1;
    }
    if (this.variant === "phantom" && !this.phantomVisible && !flash) {
      ctx.globalAlpha = 0.05;
    }
    if (this.variant === "boss_shadow" && !flash) {
      ctx.globalAlpha = this.shadowCloakAlpha;
    }

    if (flash) {
      const w = this.width;
      const h = this.height;
      const [offCanvas, offCtx] = Enemy.getFlashCanvas(w, h);
      offCtx.clearRect(0, 0, w, h);
      offCtx.globalCompositeOperation = "source-over";
      offCtx.drawImage(this.sprite!, 0, 0, w, h);
      offCtx.globalCompositeOperation = "source-atop";
      offCtx.fillStyle = "#ffffff";
      offCtx.fillRect(0, 0, w, h);
      offCtx.globalCompositeOperation = "source-over";

      ctx.globalAlpha = 0.6;
      ctx.drawImage(offCanvas, 0, 0, w, h, x - w / 2, y - h / 2, w, h);
      ctx.globalAlpha = 1;
    } else {
      if (this.variant === "scout") {
        ctx.save();
        ctx.translate(x, y);
        const bank = Math.sin(this.time * 2) * 0.1;
        ctx.rotate(bank);
        ctx.drawImage(this.sprite!, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
      } else {
        ctx.drawImage(this.sprite!, x - this.width / 2, y - this.height / 2, this.width, this.height);
      }
    }

    if (isBossVariant(this.variant) || this.variant === "cruiser" || this.variant === "destroyer"
        || this.variant === "juggernaut" || this.variant === "bastion"
        || this.variant === "colossus" || this.variant === "leviathan") {
      this.renderHPBar(ctx, x, y);
    }

    if (this.variant === "warden" && this.barrierHP > 0) {
      const barrierY = y + this.height / 2 + 10;
      const opacity = this.barrierHP / this.barrierMaxHP;
      ctx.fillStyle = `rgba(85, 204, 255, ${0.3 * opacity})`;
      ctx.fillRect(x - this.barrierWidth / 2, barrierY - this.barrierHeight / 2,
        this.barrierWidth, this.barrierHeight);
      ctx.strokeStyle = `rgba(85, 204, 255, ${0.8 * opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - this.barrierWidth / 2, barrierY);
      ctx.lineTo(x + this.barrierWidth / 2, barrierY);
      ctx.stroke();
    }
  }

  private renderHPBar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const hh = this.height / 2;
    const barW = this.width * 1.2;
    const barH = 5;
    const barX = x - barW / 2;
    const barY = y - hh - 12;
    const hpFrac = this.hitPoints / this.maxHitPoints;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX, barY, barW, barH);

    const fillColor = hpFrac > 0.5 ? "#2ecc71" : hpFrac > 0.25 ? "#f1c40f" : "#e74c3c";
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barW * hpFrac, barH);
  }

  private renderScout(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    ctx.fillStyle = flash ? "#ffffff" : "#44cc44";
    ctx.beginPath();
    ctx.moveTo(x, y + this.height / 2);
    ctx.lineTo(x - this.width / 2, y - this.height / 2);
    ctx.lineTo(x + this.width / 2, y - this.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#228822";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderFighter(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cc4444";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.lineTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#882222";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderBomber(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cc8844";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.6, y + hh * 0.3);
    ctx.lineTo(x - hw, y - hh * 0.2);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.6, y + hh * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#886633";
    ctx.fillRect(x - 6, y - 4, 12, 8);
  }

  private renderInterceptor(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#44cccc";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y - hh);
    ctx.lineTo(x - hw * 0.3, y - hh * 0.2);
    ctx.lineTo(x, y - hh * 0.5);
    ctx.lineTo(x + hw * 0.3, y - hh * 0.2);
    ctx.lineTo(x + hw, y - hh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#228888";
    ctx.beginPath();
    ctx.arc(x, y + hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDart(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cccc44";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y);
    ctx.lineTo(x - hw, y - hh * 0.7);
    ctx.lineTo(x - hw * 0.3, y - hh * 0.5);
    ctx.lineTo(x, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh * 0.5);
    ctx.lineTo(x + hw, y - hh * 0.7);
    ctx.lineTo(x + hw * 0.4, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#888822";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDrone(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const r = this.width / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#88ee88";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#338833";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSwarmer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#cc44cc";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y - hh);
    ctx.lineTo(x - hw * 0.3, y - hh * 0.1);
    ctx.lineTo(x, y - hh * 0.5);
    ctx.lineTo(x + hw * 0.3, y - hh * 0.1);
    ctx.lineTo(x + hw, y - hh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#662266";
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private static readonly VARIANT_CATEGORY_COLORS: Record<string, string> = {
    interceptor: "#66cc66",
    dart: "#66cc66",
    drone: "#88ee88",
    swarmer: "#cc44cc",
    gunship: "#cc9933",
    cruiser: "#cc9933",
    destroyer: "#cc3333",
    juggernaut: "#cc3333",
    stealth: "#9966cc",
    minelayer: "#9966cc",
    wasp: "#aacc22",
    phantom: "#7744dd",
    needle: "#ff2222",
    locust: "#889933",
    glider: "#aabbcc",
    spark: "#44ddff",
    sentinel: "#4488aa",
    lancer: "#dd7722",
    ravager: "#bb3333",
    wraith: "#6633aa",
    corsair: "#778899",
    vulture: "#774422",
    titan: "#556677",
    bastion: "#555555",
    siege_engine: "#336633",
    colossus: "#444455",
    warden: "#3366aa",
    leviathan: "#445533",
    splitter: "#22ccaa",
    splitter_minor: "#1a9980",
    healer: "#44cc66",
    teleporter: "#aa44ff",
    mimic: "#ccccdd",
    kamikaze: "#cc3300",
    jammer: "#666644",
  };

  private renderGunship(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#4466cc";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh * 0.4);
    ctx.lineTo(x - hw, y - hh * 0.1);
    ctx.lineTo(x - hw * 0.7, y - hh);
    ctx.lineTo(x + hw * 0.7, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.1);
    ctx.lineTo(x + hw * 0.5, y + hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#334499";
    ctx.fillRect(x - hw * 0.85 - 3, y - 3, 6, 6);
    ctx.fillRect(x + hw * 0.85 - 3, y - 3, 6, 6);

    ctx.fillStyle = flash ? "#cccccc" : "#224477";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderCruiser(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#556688";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y + hh * 0.6);
    ctx.lineTo(x - hw, y + hh * 0.2);
    ctx.lineTo(x - hw, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.6, y - hh);
    ctx.lineTo(x + hw * 0.6, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.4, y + hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#778899";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#445566";
    ctx.fillRect(x - hw * 0.8 - 2, y - hh * 0.2, 5, 8);
    ctx.fillRect(x + hw * 0.8 - 3, y - hh * 0.2, 5, 8);

    ctx.fillStyle = flash ? "#cccccc" : "#3a4d5e";
    ctx.fillRect(x - 5, y - 4, 10, 8);

    this.renderHPBar(ctx, x, y);
  }

  private renderDestroyer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#884444";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.7);
    ctx.lineTo(x - hw, y + hh * 0.1);
    ctx.lineTo(x - hw, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#aa5555";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#663333";
    ctx.fillRect(x - hw * 0.85 - 3, y - hh * 0.1, 6, 10);
    ctx.fillRect(x + hw * 0.85 - 3, y - hh * 0.1, 6, 10);

    ctx.fillStyle = flash ? "#cccccc" : "#552222";
    ctx.fillRect(x - 6, y - 5, 12, 10);

    this.renderHPBar(ctx, x, y);
  }

  private renderJuggernaut(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(102, 68, 136, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#664488";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.35, y + hh * 0.6);
    ctx.lineTo(x - hw, y + hh * 0.15);
    ctx.lineTo(x - hw * 0.9, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.9, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.15);
    ctx.lineTo(x + hw * 0.35, y + hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#8866aa";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#553377";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.6, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.6, y - hh * 0.2);
    ctx.moveTo(x - hw * 0.5, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.5, y + hh * 0.2);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#443366";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderStealth(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    if (!this.cloakVisible && !flash) {
      ctx.globalAlpha = 0.1;
    }

    ctx.fillStyle = flash ? "#ffffff" : "#666688";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.4);
    ctx.lineTo(x - hw, y - hh * 0.2);
    ctx.lineTo(x - hw * 0.6, y - hh);
    ctx.lineTo(x, y - hh * 0.6);
    ctx.lineTo(x + hw * 0.6, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#555577";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private renderMinelayer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#888844";
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.7, y - hh);
    ctx.lineTo(x + hw * 0.7, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.6, y + hh);
    ctx.lineTo(x - hw * 0.6, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#666633";
    ctx.fillRect(x - 5, y + hh * 0.2, 10, hh * 0.5);

    ctx.fillStyle = flash ? "#cccccc" : "#777733";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderWasp(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#aacc22";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y - hh);
    ctx.lineTo(x + hw, y - hh);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#88aa11";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.4, y - hh * 0.2);
    ctx.lineTo(x - hw * 1.1, y - hh * 0.8);
    ctx.moveTo(x + hw * 0.4, y - hh * 0.2);
    ctx.lineTo(x + hw * 1.1, y - hh * 0.8);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#ccee44";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderPhantom(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    if (!this.phantomVisible && !flash) {
      ctx.globalAlpha = 0.05;
    }

    const pulse = 0.7 + Math.sin(this.time * 4) * 0.3;
    ctx.fillStyle = flash ? "#ffffff" : `rgba(119, 68, 221, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();

    if (this.phantomVisible && !flash) {
      ctx.strokeStyle = `rgba(170, 120, 255, ${0.3 + Math.sin(this.time * 6) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, hw * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = flash ? "#cccccc" : "#aa88ee";
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private renderNeedle(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#ff2222";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.4, y - hh * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#ffcccc" : "#ff8844";
    ctx.beginPath();
    ctx.arc(x, y + hh - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderLocust(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const r = this.width / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#889933";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#667722";
    ctx.lineWidth = 1.5;
    const nubLen = r * 0.7;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.5);
    ctx.lineTo(x - r * 0.5 - nubLen * 0.7, y - r * 0.5 - nubLen * 0.7);
    ctx.moveTo(x + r * 0.5, y - r * 0.5);
    ctx.lineTo(x + r * 0.5 + nubLen * 0.7, y - r * 0.5 - nubLen * 0.7);
    ctx.moveTo(x - r * 0.5, y + r * 0.5);
    ctx.lineTo(x - r * 0.5 - nubLen * 0.7, y + r * 0.5 + nubLen * 0.7);
    ctx.moveTo(x + r * 0.5, y + r * 0.5);
    ctx.lineTo(x + r * 0.5 + nubLen * 0.7, y + r * 0.5 + nubLen * 0.7);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#aabb55";
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderGlider(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#aabbcc";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.quadraticCurveTo(x + hw * 0.3, y - hh * 0.3, x + hw, y + hh * 0.3);
    ctx.lineTo(x + hw * 0.6, y + hh);
    ctx.lineTo(x, y + hh * 0.5);
    ctx.lineTo(x - hw * 0.6, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.3);
    ctx.quadraticCurveTo(x - hw * 0.3, y - hh * 0.3, x, y - hh);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#8899aa";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#99aabb";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSpark(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const r = this.width / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#44ddff";
    ctx.beginPath();
    const sides = 8;
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#88eeff";
    ctx.lineWidth = 1;
    const arcCount = 3;
    for (let i = 0; i < arcCount; i++) {
      const angle = this.time * (3 + i) + i * 2.1;
      const startX = x + Math.cos(angle) * r * 0.6;
      const startY = y + Math.sin(angle) * r * 0.6;
      const endX = x + Math.cos(angle + 0.8) * r * 1.3;
      const endY = y + Math.sin(angle + 0.8) * r * 1.3;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.fillStyle = flash ? "#cccccc" : "#aaeeff";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSentinel(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const r = this.width / 2;
    ctx.fillStyle = flash ? "#ffffff" : "#4488aa";
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#66aacc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y - this.height * 0.15, this.width * 0.35, 0, Math.PI, true);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#336688";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderLancer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#dd7722";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.4, y - hh);
    ctx.lineTo(x, y - hh * 0.6);
    ctx.lineTo(x + hw * 0.4, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.3);
    ctx.closePath();
    ctx.fill();

    const exhaustAlpha = this.lancerPhase === "charging" ? 0.9 : 0.4;
    ctx.fillStyle = `rgba(255, 160, 50, ${exhaustAlpha})`;
    ctx.fillRect(x - hw * 0.3, y - hh - 4, hw * 0.6, 4);

    ctx.fillStyle = flash ? "#cccccc" : "#995511";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderRavager(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#bb3333";
    ctx.beginPath();
    ctx.moveTo(x, y + hh * 0.7);
    ctx.lineTo(x - hw * 0.4, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.2);
    ctx.lineTo(x - hw, y - hh * 0.5);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.5);
    ctx.lineTo(x + hw, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.4, y + hh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#ff4444";
    ctx.fillRect(x - hw - 3, y - 3, 6, 6);
    ctx.fillRect(x + hw - 3, y - 3, 6, 6);

    ctx.fillStyle = flash ? "#cccccc" : "#882222";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderWraith(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    if (this.wraithInvulnTimer > 0 && !flash) {
      ctx.globalAlpha = 0.2;
    }

    const pulse = 0.6 + Math.sin(this.time * 3) * 0.4;
    ctx.fillStyle = flash ? "#ffffff" : `rgba(102, 51, 170, ${pulse})`;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.6);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.6);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      ctx.strokeStyle = `rgba(170, 100, 255, ${0.2 + Math.sin(this.time * 5) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.fillStyle = flash ? "#cccccc" : "#aa88ee";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }

  private renderCorsair(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#778899";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.3, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.3);
    ctx.lineTo(x - hw * 0.8, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#cc6622";
    ctx.fillRect(x + hw * 0.5, y - hh * 0.6, hw * 0.4, hh * 0.5);

    ctx.fillStyle = flash ? "#cccccc" : "#556677";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderVulture(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#774422";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.7, y + hh);
    ctx.lineTo(x, y + hh * 0.5);
    ctx.lineTo(x - hw * 0.7, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.2);
    ctx.lineTo(x - hw * 0.3, y - hh * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#ff2222";
    ctx.beginPath();
    ctx.arc(x - hw * 0.25, y - hh * 0.15, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + hw * 0.25, y - hh * 0.15, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#cccccc" : "#553311";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderTitan(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#556677";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y + hh * 0.6);
    ctx.lineTo(x - hw, y + hh * 0.1);
    ctx.lineTo(x - hw, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.4, y + hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#778899";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const activeColor = this.weaponType === "spread" ? "#ff6644" : "#44aaff";
    const portGlow = flash ? "#cccccc" : activeColor;
    ctx.fillStyle = portGlow;
    ctx.fillRect(x - hw * 0.85 - 2, y - hh * 0.1, 5, 6);
    ctx.fillRect(x + hw * 0.85 - 3, y - hh * 0.1, 5, 6);

    ctx.fillStyle = flash ? "#cccccc" : "#cc4422";
    ctx.fillRect(x - hw * 0.3, y + hh * 0.3, hw * 0.15, hh * 0.3);
    ctx.fillRect(x + hw * 0.15, y + hh * 0.3, hw * 0.15, hh * 0.3);

    ctx.fillStyle = flash ? "#cccccc" : "#445566";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderBastion(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#555555";
    ctx.beginPath();
    const sides = 8;
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
      const px = x + hw * Math.cos(angle);
      const py = y + hh * 0.8 * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#777777";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.bastionTurretAngle);
    ctx.fillStyle = flash ? "#cccccc" : "#cc8833";
    ctx.fillRect(-3, -hh * 0.6, 6, hh * 0.6);
    ctx.fillStyle = flash ? "#cccccc" : "#aa6622";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.renderHPBar(ctx, x, y);
  }

  private renderSiegeEngine(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#336633";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.3, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.2);
    ctx.lineTo(x - hw * 0.8, y - hh * 0.5);
    ctx.lineTo(x - hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.8, y - hh * 0.5);
    ctx.lineTo(x + hw, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.3, y + hh);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#448844";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#224422";
    ctx.fillRect(x - 4, y - hh * 0.5, 8, hh * 1.2);

    const chargeGlow = 0.4 + Math.sin(this.time * 4) * 0.3;
    ctx.fillStyle = flash ? "#cccccc" : `rgba(100, 220, 100, ${chargeGlow})`;
    ctx.beginPath();
    ctx.arc(x, y + hh, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderColossus(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(68, 68, 85, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#444455";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y + hh * 0.7);
    ctx.lineTo(x - hw, y + hh * 0.2);
    ctx.lineTo(x - hw, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.4, y + hh * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#666677";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#555566";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.8, y - hh * 0.15);
    ctx.lineTo(x + hw * 0.8, y - hh * 0.15);
    ctx.moveTo(x - hw * 0.7, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.7, y + hh * 0.2);
    ctx.stroke();

    const seamGlow = 0.3 + Math.sin(this.time * 2) * 0.2;
    ctx.strokeStyle = flash ? "#cccccc" : `rgba(100, 100, 200, ${seamGlow})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.6, y);
    ctx.lineTo(x + hw * 0.6, y);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#333344";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderWarden(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#3366aa";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh * 0.5);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw * 0.5, y + hh * 0.5);
    ctx.lineTo(x, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh * 0.5);
    ctx.lineTo(x - hw, y);
    ctx.lineTo(x - hw * 0.5, y - hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#4488cc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#55ccff";
    ctx.fillRect(x - hw - 3, y - 2, 6, 4);
    ctx.fillRect(x + hw - 3, y - 2, 6, 4);

    ctx.fillStyle = flash ? "#cccccc" : "#224477";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (this.barrierHP > 0) {
      const barrierY = y + hh + 10;
      const opacity = this.barrierHP / this.barrierMaxHP;
      ctx.fillStyle = `rgba(85, 204, 255, ${0.3 * opacity})`;
      ctx.fillRect(x - this.barrierWidth / 2, barrierY - this.barrierHeight / 2,
        this.barrierWidth, this.barrierHeight);
      ctx.strokeStyle = `rgba(85, 204, 255, ${0.8 * opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - this.barrierWidth / 2, barrierY);
      ctx.lineTo(x + this.barrierWidth / 2, barrierY);
      ctx.stroke();
    }
  }

  private renderLeviathan(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#445533";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.35, y - hh);
    ctx.lineTo(x + hw * 0.35, y - hh);
    ctx.lineTo(x + hw * 0.7, y - hh * 0.5);
    ctx.lineTo(x + hw, y - hh * 0.1);
    ctx.lineTo(x + hw, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.5);
    ctx.lineTo(x - hw, y - hh * 0.1);
    ctx.lineTo(x - hw * 0.7, y - hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#5a6b44";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const bayGlow = this.leviathanPhase === "deploying"
      || (this.leviathanDroneTimer > this.LEVIATHAN_DRONE_INTERVAL - 1.0);
    const bayPulse = 0.5 + Math.sin(this.time * 6) * 0.5;
    const bayColor = flash ? "#cccccc"
      : bayGlow ? `rgba(204, 170, 34, ${0.5 + bayPulse * 0.5})` : "#556644";

    ctx.fillStyle = bayColor;
    ctx.fillRect(x - hw * 0.9 - 2, y + hh * 0.05, 8, 10);
    ctx.fillRect(x + hw * 0.9 - 6, y + hh * 0.05, 8, 10);

    ctx.fillStyle = flash ? "#cccccc" : "#667755";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 5, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossMothership(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(51, 68, 102, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#334466";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.6, y - hh * 0.6);
    ctx.lineTo(x + hw, y - hh * 0.2);
    ctx.lineTo(x + hw, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.5);
    ctx.lineTo(x - hw, y - hh * 0.2);
    ctx.lineTo(x - hw * 0.6, y - hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#4a5c7a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#2a3a55";
    ctx.fillRect(x - hw * 0.2, y - hh * 0.9, hw * 0.4, hh * 0.3);

    const bayGlow = this.mothershipPhase === "deploying"
      || (this.mothershipDroneTimer > (this.mothershipCurrentPhase === 1
        ? this.MOTHERSHIP_P1_DEPLOY_INTERVAL : this.MOTHERSHIP_P2_DEPLOY_INTERVAL) - 1.0
        && this.mothershipCurrentPhase < 3);
    const bayPulse = 0.5 + Math.sin(this.time * 6) * 0.5;
    const bayColor = flash ? "#cccccc"
      : bayGlow ? `rgba(204, 170, 50, ${0.5 + bayPulse * 0.5})` : "#445566";

    ctx.fillStyle = bayColor;
    ctx.fillRect(x - hw * 0.85 - 2, y + hh * 0.1, 10, 12);
    ctx.fillRect(x + hw * 0.85 - 8, y + hh * 0.1, 10, 12);

    const runPulse = 0.5 + Math.sin(this.time * 4) * 0.5;
    ctx.fillStyle = flash ? "#cccccc" : `rgba(255, 60, 60, ${runPulse})`;
    ctx.fillRect(x - hw * 0.9, y - hh * 0.1, 3, 3);
    ctx.fillRect(x + hw * 0.9 - 3, y - hh * 0.1, 3, 3);
    ctx.fillRect(x - hw * 0.7, y + hh * 0.4, 3, 3);
    ctx.fillRect(x + hw * 0.7 - 3, y + hh * 0.4, 3, 3);

    if (this.mothershipCurrentPhase === 3 && !flash) {
      for (let i = 0; i < 4; i++) {
        const sx = x + (Math.random() - 0.5) * this.width * 0.8;
        const sy = y + (Math.random() - 0.5) * this.height * 0.6;
        ctx.fillStyle = `rgba(255, ${150 + Math.random() * 105}, 0, ${0.5 + Math.random() * 0.5})`;
        ctx.fillRect(sx, sy, 2 + Math.random() * 3, 1 + Math.random() * 2);
      }
    }

    ctx.fillStyle = flash ? "#cccccc" : "#4a5c7a";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossHydra(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(85, 102, 102, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#556666";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i - Math.PI / 2;
      const r = hw * 0.5;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#778888";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (this.hydraVulnerable && !flash) {
      const vPulse = 0.4 + Math.sin(this.time * 8) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${vPulse})`;
      ctx.beginPath();
      ctx.arc(x, y, hw * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const podPositions = this.getHydraPodPositions();
    const podColors = ["#cc4444", "#4466cc", "#44cccc"];
    const podLabels = ["L", "R", "T"];
    for (let i = 0; i < 3; i++) {
      const px = podPositions[i].x;
      const py = podPositions[i].y;
      if (this.hydraPodAlive[i]) {
        ctx.fillStyle = flash ? "#ffffff" : podColors[i];
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flash ? "#cccccc" : "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.strokeStyle = flash ? "#999999" : "#666666";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.stroke();

        if (this.hydraPodRegenTimers[i] > 6 && !flash) {
          const regenAlpha = 0.2 + Math.sin(this.time * 4) * 0.2;
          ctx.fillStyle = `rgba(100, 255, 100, ${regenAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 8 * (this.hydraPodRegenTimers[i] / 12), 0, Math.PI * 2);
          ctx.fill();
        }

        if (!flash) {
          ctx.strokeStyle = `rgba(255, 200, 50, ${0.5 + Math.random() * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px - 5, py);
          ctx.lineTo(px + 3 + Math.random() * 4, py - 3 + Math.random() * 6);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = flash ? "#cccccc" : "#445555";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossShadow(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    if (!flash) {
      ctx.globalAlpha = this.shadowCloakAlpha;
    }

    if (this.shadowPhase === "decloaking" && this.shadowCycleTimer < 0.1 && !flash) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(x - hw, y - hh, this.width, this.height);
    }

    ctx.fillStyle = flash ? "#ffffff" : "#2a2a3a";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.3);
    ctx.lineTo(x - hw, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.7, y - hh);
    ctx.lineTo(x - hw * 0.15, y - hh * 0.6);
    ctx.lineTo(x, y - hh * 0.8);
    ctx.lineTo(x + hw * 0.15, y - hh * 0.6);
    ctx.lineTo(x + hw * 0.7, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.3);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.3);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      const edgePulse = 0.3 + Math.sin(this.time * 3) * 0.3;
      ctx.strokeStyle = `rgba(140, 80, 200, ${edgePulse * this.shadowCloakAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = flash ? "#cccccc" : "#44445a";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    this.renderHPBar(ctx, x, y);
  }

  private renderBossBehemoth(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(68, 68, 85, 0.12)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#444455";
    ctx.fillRect(x - hw, y - hh, this.width, this.height);

    ctx.fillStyle = flash ? "#eeeeee" : "#3a3a4a";
    ctx.fillRect(x - hw * 0.9, y - hh * 0.7, this.width * 0.9, hh * 0.3);
    ctx.fillRect(x - hw * 0.8, y + hh * 0.2, this.width * 0.8, hh * 0.3);

    ctx.strokeStyle = flash ? "#cccccc" : "#555566";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - hw, y - hh, this.width, this.height);

    if (this.behemothShieldActive && !flash) {
      const shieldPulse = 0.5 + Math.sin(this.time * 4) * 0.3;
      ctx.strokeStyle = `rgba(100, 180, 255, ${shieldPulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y + hh, hw * 1.1, Math.PI + 0.5, -0.5);
      ctx.stroke();

      ctx.fillStyle = `rgba(150, 220, 255, ${shieldPulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y + hh, hw * 1.0, Math.PI + 0.5, -0.5);
      ctx.fill();
    }

    const emitterColor = flash ? "#cccccc"
      : this.behemothShieldActive ? "#66ccff" : "#334455";
    ctx.fillStyle = emitterColor;
    ctx.fillRect(x - hw * 0.7, y + hh - 4, 5, 5);
    ctx.fillRect(x - hw * 0.3, y + hh - 4, 5, 5);
    ctx.fillRect(x + hw * 0.3 - 5, y + hh - 4, 5, 5);
    ctx.fillRect(x + hw * 0.7 - 5, y + hh - 4, 5, 5);

    if (!this.behemothShieldActive && !flash) {
      for (let i = 0; i < 2; i++) {
        const sx = x + (Math.random() - 0.5) * this.width * 0.6;
        ctx.strokeStyle = `rgba(255, 200, 50, ${0.3 + Math.random() * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, y + hh - 2);
        ctx.lineTo(sx + (Math.random() - 0.5) * 8, y + hh + 4 + Math.random() * 6);
        ctx.stroke();
      }
    }

    ctx.fillStyle = flash ? "#cccccc" : "#555566";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossArchitect(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(34, 136, 136, 0.12)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.architectRotation);

    const coreSize = hw * 0.45;
    ctx.fillStyle = flash ? "#ffffff" : "#228888";
    ctx.beginPath();
    ctx.moveTo(0, -coreSize);
    ctx.lineTo(coreSize, 0);
    ctx.lineTo(0, coreSize);
    ctx.lineTo(-coreSize, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    if (!this.architectFragmentsDetached) {
      for (let i = 0; i < 4; i++) {
        const fragAngle = this.architectRotation * 0.7 + (Math.PI / 2) * i;
        const fragDist = hw * 0.7;
        const fx = x + Math.cos(fragAngle) * fragDist;
        const fy = y + Math.sin(fragAngle) * fragDist;

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(fragAngle + this.time * 2);
        ctx.fillStyle = flash ? "#dddddd" : "#33aaaa";
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 3);
        ctx.lineTo(-5, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    for (const well of this.architectGravityWellsArr) {
      if (!flash) {
        const wellAlpha = Math.min(1, well.timeRemaining / 1.0) * 0.5;
        for (let r = 3; r >= 1; r--) {
          ctx.strokeStyle = `rgba(30, 0, 60, ${wellAlpha * (0.3 + r * 0.1)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(well.x, well.y, well.radius * (r / 3), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = flash ? "#cccccc" : "#44bbbb";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossSwarmQueen(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(68, 119, 51, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.2, 0, Math.PI * 2);
    ctx.fill();

    const wingWave = Math.sin(this.time * 3) * 5;

    ctx.fillStyle = flash ? "#ffffff" : "#447733";
    ctx.beginPath();
    ctx.moveTo(x, y - hh * 0.6);
    ctx.bezierCurveTo(x + hw * 0.4, y - hh, x + hw, y - hh * 0.3 + wingWave, x + hw * 0.8, y + hh * 0.3 + wingWave);
    ctx.bezierCurveTo(x + hw * 0.5, y + hh * 0.6, x + hw * 0.3, y + hh, x, y + hh * 0.7);
    ctx.bezierCurveTo(x - hw * 0.3, y + hh, x - hw * 0.5, y + hh * 0.6, x - hw * 0.8, y + hh * 0.3 - wingWave);
    ctx.bezierCurveTo(x - hw, y - hh * 0.3 - wingWave, x - hw * 0.4, y - hh, x, y - hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#558844";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const bodyPulse = 0.8 + Math.sin(this.time * 2) * 0.2;
    ctx.fillStyle = flash ? "#dddddd" : `rgba(80, 150, 50, ${bodyPulse})`;
    ctx.beginPath();
    ctx.ellipse(x, y, hw * 0.3, hh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!flash) {
      for (let i = 0; i < 5; i++) {
        const spotAngle = (Math.PI * 2 / 5) * i + this.time * 0.3;
        const spotDist = hw * 0.5;
        const sx = x + Math.cos(spotAngle) * spotDist;
        const sy = y + Math.sin(spotAngle) * spotDist * 0.7;
        const spotPulse = 0.3 + Math.sin(this.time * 3 + i) * 0.3;
        ctx.fillStyle = `rgba(150, 255, 80, ${spotPulse})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = flash ? "#cccccc" : "#335522";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  public getBarrierRect(): { x: number; y: number; width: number; height: number } | null {
    if (this.variant !== "warden" || this.barrierHP <= 0) return null;
    return {
      x: this.pos.x,
      y: this.pos.y + this.height / 2 + 10,
      width: this.barrierWidth,
      height: this.barrierHeight,
    };
  }

  private renderSplitter(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#22ccaa";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.quadraticCurveTo(x + hw, y - hh * 0.3, x + hw * 0.7, y + hh);
    ctx.lineTo(x - hw * 0.7, y + hh);
    ctx.quadraticCurveTo(x - hw, y - hh * 0.3, x, y - hh);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      ctx.strokeStyle = "#88ffdd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - hw * 0.3, y - hh * 0.2);
      ctx.lineTo(x + hw * 0.3, y + hh * 0.5);
      ctx.moveTo(x + hw * 0.3, y - hh * 0.2);
      ctx.lineTo(x - hw * 0.3, y + hh * 0.5);
      ctx.stroke();
    }

    ctx.strokeStyle = flash ? "#cccccc" : "#66eecc";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.quadraticCurveTo(x + hw, y - hh * 0.3, x + hw * 0.7, y + hh);
    ctx.lineTo(x - hw * 0.7, y + hh);
    ctx.quadraticCurveTo(x - hw, y - hh * 0.3, x, y - hh);
    ctx.stroke();
  }

  private renderSplitterMinor(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : "#1a9980";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y + hh);
    ctx.lineTo(x - hw, y + hh);
    ctx.closePath();
    ctx.fill();
  }

  private renderHealer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const r = this.width / 2;
    const pulse = 0.3 + Math.sin(this.time * 3) * 0.15;

    if (!flash) {
      ctx.fillStyle = `rgba(68, 204, 102, ${pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = flash ? "#ffffff" : "#44cc66";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#66ee88";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#dddddd" : "#ffffff";
    const crossW = r * 0.35;
    const crossH = r * 0.7;
    ctx.fillRect(x - crossW / 2, y - crossH / 2, crossW, crossH);
    ctx.fillRect(x - crossH / 2, y - crossW / 2, crossH, crossW);
  }

  private renderTeleporter(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const flashAlpha = this.getTeleporterFlashAlpha();

    if (flashAlpha > 0 && !flash) {
      ctx.fillStyle = `rgba(170, 68, 255, ${flashAlpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(x, y, hw * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!flash) {
      ctx.strokeStyle = `rgba(170, 68, 255, ${0.3 + Math.sin(this.time * 4) * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, hw + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = flash ? "#ffffff" : "#aa44ff";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw * 0.6, y + hh);
    ctx.lineTo(x - hw * 0.6, y + hh);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = flash ? "#dddddd" : "#dd88ff";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderMimic(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    if (!flash) {
      const shimmer = 0.15 + Math.sin(this.time * 5) * 0.08;
      ctx.fillStyle = `rgba(200, 200, 255, ${shimmer})`;
      ctx.beginPath();
      ctx.arc(x, y, hw + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = flash ? "#ffffff" : "#ccccdd";
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hh);
    ctx.lineTo(x + hw, y - hh);
    ctx.lineTo(x, y + hh);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#ddddef";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (!flash) {
      ctx.fillStyle = "#eeeeff";
      ctx.beginPath();
      ctx.arc(x, y - hh * 0.2, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderKamikaze(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const glowIntensity = this.kamikazePhase === "diving"
      ? 0.5 + Math.sin(this.time * 10) * 0.3
      : 0.2;

    if (!flash) {
      ctx.fillStyle = `rgba(255, 136, 0, ${glowIntensity})`;
      ctx.beginPath();
      ctx.arc(x, y - hh * 0.6, hw * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = flash ? "#ffffff" : "#cc3300";
    ctx.beginPath();
    ctx.moveTo(x, y - hh);
    ctx.lineTo(x + hw * 0.6, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.3);
    ctx.lineTo(x + hw * 0.7, y + hh);
    ctx.lineTo(x - hw * 0.7, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.3);
    ctx.lineTo(x - hw * 0.6, y - hh * 0.3);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      const noseBrightness = this.kamikazePhase === "diving" ? "#ffcc44" : "#ff8800";
      ctx.fillStyle = noseBrightness;
      ctx.beginPath();
      ctx.moveTo(x, y - hh);
      ctx.lineTo(x + hw * 0.3, y - hh * 0.3);
      ctx.lineTo(x - hw * 0.3, y - hh * 0.3);
      ctx.closePath();
      ctx.fill();
    }

    if (!flash && this.kamikazePhase === "diving") {
      ctx.fillStyle = `rgba(255, 200, 50, ${0.3 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(x - hw * 0.3, y + hh);
      ctx.lineTo(x, y + hh + 8 + Math.random() * 4);
      ctx.lineTo(x + hw * 0.3, y + hh);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderJammer(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    if (!flash && this.jammerPhase === "drifting") {
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const phase = (this.time * 2 + i * 0.8) % 2.4;
        const radius = Enemy.JAMMER_FIELD_RADIUS * (phase / 2.4);
        const alpha = Math.max(0, 0.2 * (1 - phase / 2.4));
        ctx.strokeStyle = `rgba(255, 60, 60, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.fillStyle = flash ? "#ffffff" : "#666644";
    ctx.beginPath();
    ctx.moveTo(x - hw, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.8, y - hh);
    ctx.lineTo(x + hw * 0.8, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.6, y + hh);
    ctx.lineTo(x - hw * 0.6, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.5);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      ctx.strokeStyle = "#888866";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - hw * 0.5, y - hh);
      ctx.lineTo(x - hw * 0.5, y - hh - 5);
      ctx.moveTo(x, y - hh);
      ctx.lineTo(x, y - hh - 7);
      ctx.moveTo(x + hw * 0.5, y - hh);
      ctx.lineTo(x + hw * 0.5, y - hh - 5);
      ctx.stroke();

      ctx.fillStyle = this.jammerPhase === "drifting"
        ? `rgba(255, 60, 60, ${0.5 + Math.sin(this.time * 4) * 0.3})`
        : "#555533";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderFallbackShape(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const color = Enemy.VARIANT_CATEGORY_COLORS[this.variant] ?? "#999999";
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = flash ? "#ffffff" : color;
    ctx.fillRect(x - hw, y - hh, this.width, this.height);

    ctx.fillStyle = flash ? "#cccccc" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, Math.min(hw, hh) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderBoss(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(255, 50, 50, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#aa2222";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.4, y + hh * 0.5);
    ctx.lineTo(x - hw, y + hh * 0.1);
    ctx.lineTo(x - hw * 0.8, y - hh * 0.4);
    ctx.lineTo(x - hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.3, y - hh);
    ctx.lineTo(x + hw * 0.8, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.4, y + hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#ff6666";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.1, 8, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossGunship(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(51, 85, 170, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#3355aa";
    ctx.beginPath();
    ctx.moveTo(x, y + hh * 0.7);
    ctx.lineTo(x - hw * 0.5, y + hh * 0.4);
    ctx.lineTo(x - hw, y);
    ctx.lineTo(x - hw * 0.9, y - hh * 0.5);
    ctx.lineTo(x - hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.9, y - hh * 0.5);
    ctx.lineTo(x + hw, y);
    ctx.lineTo(x + hw * 0.5, y + hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#5577cc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#445566";
    ctx.fillRect(x - hw * 0.9 - 4, y - hh * 0.15, 8, 10);
    ctx.fillRect(x + hw * 0.9 - 4, y - hh * 0.15, 8, 10);

    ctx.fillStyle = flash ? "#cccccc" : "#5577cc";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 6, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossDreadnought(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(136, 34, 68, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#882244";
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x - hw * 0.35, y + hh * 0.6);
    ctx.lineTo(x - hw, y + hh * 0.1);
    ctx.lineTo(x - hw, y - hh * 0.3);
    ctx.lineTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.3);
    ctx.lineTo(x + hw, y + hh * 0.1);
    ctx.lineTo(x + hw * 0.35, y + hh * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#aa3366";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#773355";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.7, y - hh * 0.1);
    ctx.lineTo(x + hw * 0.7, y - hh * 0.1);
    ctx.moveTo(x - hw * 0.6, y + hh * 0.3);
    ctx.lineTo(x + hw * 0.6, y + hh * 0.3);
    ctx.stroke();

    ctx.fillStyle = flash ? "#cccccc" : "#663344";
    ctx.fillRect(x - hw * 0.95 - 4, y - hh * 0.15, 8, 14);
    ctx.fillRect(x + hw * 0.95 - 4, y - hh * 0.15, 8, 14);

    ctx.fillStyle = flash ? "#999999" : "#441122";
    for (let i = 0; i < 3; i++) {
      const ty = y - hh * 0.1 + i * 4;
      ctx.fillRect(x - hw * 0.95 - 1, ty, 2, 2);
      ctx.fillRect(x + hw * 0.95 - 1, ty, 2, 2);
    }

    ctx.fillStyle = flash ? "#cccccc" : "#aa4466";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossFortress(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(0, 204, 255, 0.12)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#556677";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.5, y - hh);
    ctx.lineTo(x + hw * 0.5, y - hh);
    ctx.lineTo(x + hw, y - hh * 0.4);
    ctx.lineTo(x + hw, y + hh * 0.4);
    ctx.lineTo(x + hw * 0.5, y + hh);
    ctx.lineTo(x - hw * 0.5, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.4);
    ctx.lineTo(x - hw, y - hh * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#6688aa";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#445566";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.7, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.7, y - hh * 0.2);
    ctx.moveTo(x - hw * 0.6, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.6, y + hh * 0.2);
    ctx.stroke();

    const pulse = 0.5 + Math.sin(this.time * 3) * 0.5;
    const turretGlow = `rgba(0, 204, 255, ${0.4 + pulse * 0.6})`;

    ctx.fillStyle = flash ? "#cccccc" : "#445566";
    ctx.fillRect(x - hw * 0.85 - 4, y - hh * 0.15, 8, 14);
    ctx.fillRect(x + hw * 0.85 - 4, y - hh * 0.15, 8, 14);

    ctx.fillStyle = flash ? "#aaaaaa" : turretGlow;
    ctx.fillRect(x - hw * 0.85 - 2, y - hh * 0.1, 4, 4);
    ctx.fillRect(x + hw * 0.85 - 2, y - hh * 0.1, 4, 4);

    ctx.fillStyle = flash ? "#cccccc" : "#00ccff";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.15, 7, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }

  private renderBossCarrier(ctx: CanvasRenderingContext2D, x: number, y: number, flash: boolean): void {
    const hw = this.width / 2;
    const hh = this.height / 2;

    ctx.fillStyle = "rgba(85, 102, 68, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, hw * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? "#ffffff" : "#556644";
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.4, y - hh);
    ctx.lineTo(x + hw * 0.8, y - hh * 0.5);
    ctx.lineTo(x + hw, y - hh * 0.1);
    ctx.lineTo(x + hw, y + hh * 0.5);
    ctx.lineTo(x + hw * 0.6, y + hh);
    ctx.lineTo(x - hw * 0.6, y + hh);
    ctx.lineTo(x - hw, y + hh * 0.5);
    ctx.lineTo(x - hw, y - hh * 0.1);
    ctx.lineTo(x - hw * 0.8, y - hh * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = flash ? "#cccccc" : "#6b7a55";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = flash ? "#cccccc" : "#4a5a3a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.7, y - hh * 0.2);
    ctx.lineTo(x + hw * 0.7, y - hh * 0.2);
    ctx.moveTo(x - hw * 0.6, y + hh * 0.2);
    ctx.lineTo(x + hw * 0.6, y + hh * 0.2);
    ctx.stroke();

    const bayGlow = this.carrierPhase === "deploying"
      || (this.droneSpawnTimer > this.DRONE_SPAWN_INTERVAL - 1.0
          && this.hitPoints / this.maxHitPoints >= 0.25);
    const bayPulse = 0.5 + Math.sin(this.time * 6) * 0.5;
    const bayColor = flash ? "#cccccc"
      : bayGlow ? `rgba(204, 170, 34, ${0.5 + bayPulse * 0.5})` : "#445533";

    ctx.fillStyle = bayColor;
    ctx.fillRect(x - hw * 0.9 - 2, y + hh * 0.05, 8, 12);
    ctx.fillRect(x + hw * 0.9 - 6, y + hh * 0.05, 8, 12);

    ctx.fillStyle = flash ? "#cccccc" : "#667755";
    ctx.beginPath();
    ctx.arc(x, y - hh * 0.2, 6, 0, Math.PI * 2);
    ctx.fill();

    this.renderHPBar(ctx, x, y);
  }
}
