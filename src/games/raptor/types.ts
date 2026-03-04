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

export interface EnemyConfig {
  variant: EnemyVariant;
  hitPoints: number;
  speed: number;
  scoreValue: number;
  fireRate: number;
  width: number;
  height: number;
}

export type RaptorPowerUpType = "spread-shot" | "rapid-fire" | "shield-restore" | "bonus-life";

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
  | "menu_start";

export interface WaveConfig {
  enemyVariant: EnemyVariant;
  count: number;
  spawnDelay: number;
  waveDelay: number;
  formation: "line" | "v" | "random" | "sweep";
  speed: number;
}

export interface BossConfig {
  hitPoints: number;
  speed: number;
  fireRate: number;
  scoreValue: number;
  appearsAfterWave: number;
}

export interface BackgroundLayerConfig {
  asset: string;
  scrollSpeed: number;
  opacity: number;
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
  },
  bomber: {
    variant: "bomber",
    hitPoints: 3,
    speed: 80,
    scoreValue: 50,
    fireRate: 0.5,
    width: 40,
    height: 36,
  },
  boss: {
    variant: "boss",
    hitPoints: 20,
    speed: 40,
    scoreValue: 200,
    fireRate: 1.5,
    width: 64,
    height: 56,
  },
};
