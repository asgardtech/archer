export interface Vec2 {
  x: number;
  y: number;
}

export type RaptorGameState =
  | "loading"
  | "menu"
  | "playing"
  | "level_complete"
  | "gameover"
  | "victory";

export type EnemyVariant = "scout" | "fighter" | "bomber" | "boss";

export type EnemyWeaponType = "standard" | "spread" | "missile" | "laser";

export interface EnemyWeaponConfig {
  type: EnemyWeaponType;
  damage: number;
  projectileSpeed: number;
  projectileCount: number;
  spreadAngle: number;
  homing: boolean;
  homingStrength: number;
  fireRateMultiplier: number;
  spriteKey: string;
  beamWarmupDuration?: number;
  beamActiveDuration?: number;
  beamCooldownDuration?: number;
  beamWidth?: number;
  beamTrackingSpeed?: number;
}

export const ENEMY_WEAPON_CONFIGS: Record<EnemyWeaponType, EnemyWeaponConfig> = {
  standard: {
    type: "standard",
    damage: 25,
    projectileSpeed: 300,
    projectileCount: 1,
    spreadAngle: 0,
    homing: false,
    homingStrength: 0,
    fireRateMultiplier: 1.0,
    spriteKey: "bullet_enemy",
  },
  spread: {
    type: "spread",
    damage: 15,
    projectileSpeed: 280,
    projectileCount: 3,
    spreadAngle: 0.5, // radians between each adjacent bullet in the fan
    homing: false,
    homingStrength: 0,
    fireRateMultiplier: 0.7,
    spriteKey: "bullet_enemy_spread",
  },
  missile: {
    type: "missile",
    damage: 40,
    projectileSpeed: 200,
    projectileCount: 1,
    spreadAngle: 0,
    homing: true,
    homingStrength: 1.5,
    fireRateMultiplier: 0.4,
    spriteKey: "missile_enemy",
  },
  laser: {
    type: "laser",
    damage: 10,
    projectileSpeed: 0,
    projectileCount: 1,
    spreadAngle: 0,
    homing: false,
    homingStrength: 0,
    fireRateMultiplier: 0.0,
    spriteKey: "laser_enemy",
    beamWarmupDuration: 0.5,
    beamActiveDuration: 2.5,
    beamCooldownDuration: 3.0,
    beamWidth: 8,
    beamTrackingSpeed: 40,
  },
};

export interface EnemyConfig {
  variant: EnemyVariant;
  hitPoints: number;
  speed: number;
  scoreValue: number;
  fireRate: number;
  width: number;
  height: number;
  weaponType?: EnemyWeaponType;
}

export type RaptorPowerUpType =
  | "spread-shot"
  | "rapid-fire"
  | "shield-restore"
  | "bonus-life"
  | "weapon-missile"
  | "weapon-laser";

export type RaptorSoundEvent =
  | "player_shoot"
  | "enemy_shoot"
  | "enemy_hit"
  | "enemy_destroy"
  | "player_hit"
  | "player_destroy"
  | "boss_hit"
  | "boss_destroy"
  | "power_up_collect"
  | "level_complete"
  | "game_over"
  | "victory"
  | "menu_start"
  | "missile_fire"
  | "missile_hit"
  | "laser_fire"
  | "laser_hit"
  | "weapon_switch"
  | "enemy_spread_fire"
  | "enemy_missile_fire"
  | "enemy_laser_fire"
  | "enemy_missile_hit"
  | "enemy_laser_hit";

export type WeaponType = "machine-gun" | "missile" | "laser";

export interface RaptorSaveData {
  version: 1;
  /** The highest level index the player has unlocked (0-based). */
  levelReached: number;
  /** Cumulative score at the time of save. */
  totalScore: number;
  /** Player lives remaining at save point. */
  lives: number;
  /** Active weapon type at save point. */
  weapon: WeaponType;
  /** ISO-8601 timestamp of when the save was created. */
  savedAt: string;
}

export interface WeaponConfig {
  type: WeaponType;
  damage: number;
  fireRateMultiplier: number;
  projectileSpeed: number;
  piercing: boolean;
  homing: boolean;
  homingStrength: number;
  splashRadius: number;
  rapidFireBonus: number;
  spreadShotBehavior: "multi-projectile" | "wider-beam";
}

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  "machine-gun": {
    type: "machine-gun",
    damage: 1,
    fireRateMultiplier: 1.0,
    projectileSpeed: 500,
    piercing: false,
    homing: false,
    homingStrength: 0,
    splashRadius: 0,
    rapidFireBonus: 2.0,
    spreadShotBehavior: "multi-projectile",
  },
  "missile": {
    type: "missile",
    damage: 3,
    fireRateMultiplier: 0.35,
    projectileSpeed: 350,
    piercing: false,
    homing: true,
    homingStrength: 2.5,
    splashRadius: 40,
    rapidFireBonus: 1.5,
    spreadShotBehavior: "multi-projectile",
  },
  "laser": {
    type: "laser",
    damage: 1,
    fireRateMultiplier: 0,
    projectileSpeed: 0,
    piercing: true,
    homing: false,
    homingStrength: 0,
    splashRadius: 0,
    rapidFireBonus: 1.5,
    spreadShotBehavior: "wider-beam",
  },
};

export interface Projectile {
  pos: Vec2;
  alive: boolean;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  damage: number;
  piercing: boolean;
  update(dt: number, canvasWidth: number, canvasHeight: number, enemies?: import("./entities/Enemy").Enemy[]): void;
  render(ctx: CanvasRenderingContext2D): void;
}

export interface WaveConfig {
  enemyVariant: EnemyVariant;
  count: number;
  spawnDelay: number;
  waveDelay: number;
  formation: "line" | "v" | "random" | "sweep";
  speed: number;
  weaponType?: EnemyWeaponType;
}

export interface BossConfig {
  hitPoints: number;
  speed: number;
  fireRate: number;
  scoreValue: number;
  appearsAfterWave: number;
  weaponType?: EnemyWeaponType;
}

export interface BackgroundLayerConfig {
  asset: string;
  scrollSpeed: number;
  opacity: number;
}

export type LevelTheme =
  | "coastal" | "desert" | "mountain" | "arctic" | "fortress"
  | "shipyard" | "wasteland" | "industrial" | "orbital" | "stronghold";

export interface AmbientParticleConfig {
  color: string;
  count: number;
  speedRange: [number, number];
  sizeRange: [number, number];
  drift: number;
}

export interface TerrainLayerConfig {
  theme: LevelTheme;
  horizonAssets?: string[];
  groundColor: string;
  groundTexture?: string;
  structurePool: string[];
  structureDensity: number;
  propPool: string[];
  propDensity: number;
  hasWater: boolean;
  hasRoads: boolean;
  ambientParticles?: AmbientParticleConfig;
  hazeColor?: string;
  hazeOpacity?: number;
  secondaryParticles?: AmbientParticleConfig;
  scanlines?: boolean;
  litStructures?: string[];
}

export interface RaptorLevelConfig {
  level: number;
  name: string;
  waves: WaveConfig[];
  bossEnabled: boolean;
  bossConfig?: BossConfig;
  autoFireRate: number;
  powerUpDropChance: number;
  skyGradient: [string, string];
  starDensity: number;
  enemyFireRateMultiplier: number;
  backgroundLayers?: BackgroundLayerConfig[];
  planetAssets?: string[];
  weaponDrops?: WeaponType[];
  terrain?: TerrainLayerConfig;
}

export type AssetManifest = Record<string, string>;
export type LoadedAssets = Map<string, HTMLImageElement>;

export const ENEMY_CONFIGS: Record<EnemyVariant, EnemyConfig> = {
  scout: {
    variant: "scout",
    hitPoints: 1,
    speed: 180,
    scoreValue: 10,
    fireRate: 0,
    width: 24,
    height: 24,
  },
  fighter: {
    variant: "fighter",
    hitPoints: 2,
    speed: 130,
    scoreValue: 25,
    fireRate: 0.8,
    width: 30,
    height: 30,
    weaponType: "standard",
  },
  bomber: {
    variant: "bomber",
    hitPoints: 3,
    speed: 80,
    scoreValue: 50,
    fireRate: 0.5,
    width: 40,
    height: 36,
    weaponType: "spread",
  },
  boss: {
    variant: "boss",
    hitPoints: 20,
    speed: 40,
    scoreValue: 200,
    fireRate: 1.5,
    width: 64,
    height: 56,
    weaponType: "standard",
  },
};
