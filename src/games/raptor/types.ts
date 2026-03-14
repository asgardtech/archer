export interface Vec2 {
  x: number;
  y: number;
}

export type RaptorGameState =
  | "loading"
  | "menu"
  | "story_intro"
  | "briefing"
  | "playing"
  | "level_complete"
  | "gameover"
  | "victory";

export type EnemyVariant =
  | "scout" | "fighter" | "bomber" | "boss"
  | "interceptor" | "dart" | "drone" | "swarmer"
  | "gunship" | "cruiser"
  | "destroyer" | "juggernaut"
  | "stealth" | "minelayer";

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
  | "repair-kit"
  | "weapon-missile"
  | "weapon-laser"
  | "weapon-plasma"
  | "weapon-ion"
  | "weapon-autogun"
  | "weapon-rocket"
  | "mega-bomb"
  | "shield-battery"
  | "deflector";

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
  | "weapon_upgrade"
  | "enemy_spread_fire"
  | "enemy_missile_fire"
  | "enemy_laser_fire"
  | "enemy_missile_hit"
  | "enemy_laser_hit"
  | "plasma_fire"
  | "plasma_hit"
  | "ion_fire"
  | "ion_hit"
  | "rocket_fire"
  | "mega_bomb_fire"
  | "dodge"
  | "emp_burst"
  | "deflect";

export type WeaponType = "machine-gun" | "missile" | "laser" | "plasma" | "ion-cannon" | "auto-gun" | "rocket";

export const WEAPON_SLOT_ORDER: WeaponType[] = [
  "machine-gun", "rocket", "laser", "plasma", "ion-cannon", "auto-gun", "missile"
];

export const HUD_BAR_HEIGHT = 48;

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
  /** Mega bomb count at save point (0-5). */
  bombs?: number;
  /** Shield battery HP at save point (0-100). */
  shieldBattery?: number;
  /** Hull armor HP at save point (0-100). */
  armor?: number;
  /** Energy level at save point (0-100). */
  energy?: number;
  /** @deprecated Kept for backward compat; use weaponInventory instead. */
  weaponTier?: number;
  /** Full weapon inventory mapping weapon type to tier (1-3). */
  weaponInventory?: Record<string, number>;
}

export interface WeaponTierConfig {
  damageMultiplier: number;
  fireRateMultiplier: number;
  projectileCount: number;
  projectileSpread: number;
  visualScale: number;
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
  splashDamageRatio: number;
  rapidFireBonus: number;
  spreadShotBehavior: "multi-projectile" | "wider-beam";
  chargeTime?: number;
  tiers: [WeaponTierConfig, WeaponTierConfig, WeaponTierConfig];
}

const TIER_1: WeaponTierConfig = { damageMultiplier: 1, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1 };

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
    splashDamageRatio: 0,
    rapidFireBonus: 2.0,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      TIER_1,
      { damageMultiplier: 1, fireRateMultiplier: 1.3, projectileCount: 1, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1, fireRateMultiplier: 1.3, projectileCount: 3, projectileSpread: 0.1, visualScale: 1 },
    ],
  },
  "missile": {
    type: "missile",
    damage: 3,
    fireRateMultiplier: 0.35,
    projectileSpeed: 350,
    piercing: false,
    homing: true,
    homingStrength: 1.8,
    splashRadius: 30,
    splashDamageRatio: 0.4,
    rapidFireBonus: 1.3,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      TIER_1,
      { damageMultiplier: 1.33, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.33, fireRateMultiplier: 1, projectileCount: 2, projectileSpread: 0.15, visualScale: 1 },
    ],
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
    splashDamageRatio: 0,
    rapidFireBonus: 1.8,
    spreadShotBehavior: "wider-beam",
    tiers: [
      TIER_1,
      { damageMultiplier: 1.5, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1.33 },
      { damageMultiplier: 2.0, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1.67 },
    ],
  },
  "plasma": {
    type: "plasma",
    damage: 2,
    fireRateMultiplier: 0.7,
    projectileSpeed: 400,
    piercing: false,
    homing: false,
    homingStrength: 0,
    splashRadius: 35,
    splashDamageRatio: 0.5,
    rapidFireBonus: 1.8,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      TIER_1,
      { damageMultiplier: 1.5, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1.25 },
      { damageMultiplier: 1.5, fireRateMultiplier: 1, projectileCount: 2, projectileSpread: 0.12, visualScale: 1 },
    ],
  },
  "ion-cannon": {
    type: "ion-cannon",
    damage: 5,
    fireRateMultiplier: 0,
    projectileSpeed: 600,
    piercing: true,
    homing: false,
    homingStrength: 0,
    splashRadius: 0,
    splashDamageRatio: 0,
    rapidFireBonus: 1.4,
    spreadShotBehavior: "multi-projectile",
    chargeTime: 1.6,
    tiers: [
      TIER_1,
      { damageMultiplier: 1.5, fireRateMultiplier: 1.2, projectileCount: 1, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.8, fireRateMultiplier: 1.4, projectileCount: 1, projectileSpread: 0, visualScale: 1.3 },
    ],
  },
  "auto-gun": {
    type: "auto-gun",
    damage: 1,
    fireRateMultiplier: 1.4,
    projectileSpeed: 480,
    piercing: false,
    homing: true,
    homingStrength: 2.0,
    splashRadius: 0,
    splashDamageRatio: 0,
    rapidFireBonus: 1.8,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      TIER_1,
      { damageMultiplier: 1.2, fireRateMultiplier: 1.3, projectileCount: 1, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.2, fireRateMultiplier: 1.3, projectileCount: 3, projectileSpread: 0.06, visualScale: 1 },
    ],
  },
  "rocket": {
    type: "rocket",
    damage: 5,
    fireRateMultiplier: 0.3,
    projectileSpeed: 450,
    piercing: false,
    homing: false,
    homingStrength: 0,
    splashRadius: 60,
    splashDamageRatio: 0.6,
    rapidFireBonus: 1.4,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      TIER_1,
      { damageMultiplier: 1.4, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.4, fireRateMultiplier: 1, projectileCount: 2, projectileSpread: 0.1, visualScale: 1 },
    ],
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

export type SpeakerType = "pilot" | "wingman" | "hq" | "sensor";

export interface InGameStoryMessage {
  /** When to show this message (in seconds from level start) */
  triggerTime: number;
  /** The text to display */
  text: string;
  /** How long to display the message in seconds (default: 3) */
  duration?: number;
  /** Which character portrait to show (auto-detected from text prefix if omitted) */
  speaker?: SpeakerType;
}

export interface LevelStoryConfig {
  /** Brief 1-2 sentence mission briefing shown before the level starts */
  briefing: string;
  /** Short narrative text shown when the level is completed */
  completionText: string;
  /** In-game story messages triggered at specific moments */
  inGameMessages?: InGameStoryMessage[];
}

export interface ActStory {
  act: number;
  name: string;
  opening: string[];
  ending: string[];
  isFinal: boolean;
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
  story?: LevelStoryConfig;
  act?: number;
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
  interceptor: {
    variant: "interceptor",
    hitPoints: 1,
    speed: 250,
    scoreValue: 15,
    fireRate: 0.5,
    width: 22,
    height: 22,
    weaponType: "standard",
  },
  dart: {
    variant: "dart",
    hitPoints: 1,
    speed: 300,
    scoreValue: 12,
    fireRate: 0,
    width: 18,
    height: 20,
  },
  drone: {
    variant: "drone",
    hitPoints: 1,
    speed: 160,
    scoreValue: 8,
    fireRate: 0.3,
    width: 16,
    height: 16,
    weaponType: "standard",
  },
  swarmer: {
    variant: "swarmer",
    hitPoints: 1,
    speed: 170,
    scoreValue: 12,
    fireRate: 0.4,
    width: 18,
    height: 18,
    weaponType: "standard",
  },
  gunship: {
    variant: "gunship",
    hitPoints: 3,
    speed: 110,
    scoreValue: 40,
    fireRate: 0.9,
    width: 34,
    height: 32,
    weaponType: "spread",
  },
  cruiser: {
    variant: "cruiser",
    hitPoints: 5,
    speed: 60,
    scoreValue: 75,
    fireRate: 0.6,
    width: 48,
    height: 44,
    weaponType: "missile",
  },
  destroyer: {
    variant: "destroyer",
    hitPoints: 6,
    speed: 50,
    scoreValue: 100,
    fireRate: 0.8,
    width: 52,
    height: 48,
    weaponType: "laser",
  },
  juggernaut: {
    variant: "juggernaut",
    hitPoints: 12,
    speed: 35,
    scoreValue: 150,
    fireRate: 1.2,
    width: 56,
    height: 52,
    weaponType: "missile",
  },
  stealth: {
    variant: "stealth",
    hitPoints: 2,
    speed: 160,
    scoreValue: 35,
    fireRate: 0.7,
    width: 28,
    height: 26,
    weaponType: "standard",
  },
  minelayer: {
    variant: "minelayer",
    hitPoints: 2,
    speed: 100,
    scoreValue: 30,
    fireRate: 0,
    width: 32,
    height: 28,
  },
};
