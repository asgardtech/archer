export interface Vec2 {
  x: number;
  y: number;
}

export interface UserSettings {
  musicVolume: number;   // 0–1, default 0.5
  sfxVolume: number;     // 0–1, default 0.25
  muted: boolean;        // default false
  showFps: boolean;      // default false
}

export type RaptorGameState =
  | "loading"
  | "menu"
  | "slot_select"
  | "story_intro"
  | "briefing"
  | "playing"
  | "paused"
  | "level_complete"
  | "gameover"
  | "victory";

export type EnemyVariant =
  | "scout" | "fighter" | "bomber" | "boss" | "boss_gunship" | "boss_dreadnought" | "boss_fortress" | "boss_carrier"
  | "interceptor" | "dart" | "drone" | "swarmer"
  | "gunship" | "cruiser"
  | "destroyer" | "juggernaut"
  | "stealth" | "minelayer"
  | "wasp" | "phantom" | "needle" | "locust" | "glider" | "spark"
  | "sentinel" | "lancer" | "ravager" | "wraith" | "corsair" | "vulture"
  | "titan" | "bastion" | "siege_engine" | "colossus" | "warden" | "leviathan"
  | "boss_mothership" | "boss_hydra" | "boss_shadow" | "boss_behemoth" | "boss_architect" | "boss_swarm_queen"
  | "splitter" | "splitter_minor" | "healer" | "teleporter" | "mimic" | "kamikaze" | "jammer";

export type EnemyWeaponType = "standard" | "spread" | "missile" | "laser" | "chain" | "charge_beam" | "scatter" | "shockwave";

export type BossType = "standard" | "gunship_commander" | "missile_dreadnought" | "laser_fortress" | "carrier"
  | "mothership" | "hydra" | "shadow_commander" | "behemoth" | "architect" | "swarm_queen";

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
  expansionSpeed?: number;
  maxRadius?: number;
}

export interface BeamLike {
  readonly isActive: boolean;
  readonly originX: number;
  readonly originY: number;
  readonly beamX: number;
  readonly beamWidth: number;
  readonly damage: number;
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
  chain: {
    type: "chain",
    damage: 20,
    projectileSpeed: 350,
    projectileCount: 1,
    spreadAngle: 0,
    homing: false,
    homingStrength: 0,
    fireRateMultiplier: 0.8,
    spriteKey: "bullet_enemy_chain",
  },
  charge_beam: {
    type: "charge_beam",
    damage: 35,
    projectileSpeed: 0,
    projectileCount: 1,
    spreadAngle: 0,
    homing: false,
    homingStrength: 0,
    fireRateMultiplier: 1.0,
    spriteKey: "beam_enemy_charge",
    beamWarmupDuration: 1.2,
    beamActiveDuration: 0.4,
    beamCooldownDuration: 4.0,
    beamWidth: 14,
    beamTrackingSpeed: 20,
  },
  scatter: {
    type: "scatter",
    damage: 10,
    projectileSpeed: 250,
    projectileCount: 6,
    spreadAngle: 1.2,
    homing: false,
    homingStrength: 0,
    fireRateMultiplier: 0.5,
    spriteKey: "bullet_enemy_scatter",
  },
  shockwave: {
    type: "shockwave",
    damage: 15,
    projectileSpeed: 0,
    projectileCount: 0,
    spreadAngle: 0,
    homing: false,
    homingStrength: 0,
    fireRateMultiplier: 0.3,
    spriteKey: "shockwave_enemy",
    expansionSpeed: 200,
    maxRadius: 150,
  },
};

/** Visual skin override for enemy projectiles — cosmetic only. */
export interface ProjectileSkin {
  /** Override the weapon-type default sprite key. Optional. */
  spriteKey?: string;
  /** Fallback fill color when no sprite is loaded. */
  fallbackColor: string;
  /** Inner core color for fallback rendering. */
  coreColor?: string;
  /** Glow/shadow color for fallback rendering. */
  glowColor?: string;
}

export const ENEMY_PROJECTILE_SKINS: Partial<Record<EnemyVariant, ProjectileSkin>> = {
  scout:        { fallbackColor: "#44ff44", coreColor: "#aaffaa", glowColor: "#88ff88" },
  interceptor:  { fallbackColor: "#44ff44", coreColor: "#aaffaa", glowColor: "#88ff88" },
  dart:         { fallbackColor: "#44ff44", coreColor: "#aaffaa", glowColor: "#88ff88" },
  drone:        { fallbackColor: "#cc44ff", coreColor: "#ee99ff", glowColor: "#dd88ff" },
  swarmer:      { fallbackColor: "#cc44ff", coreColor: "#ee99ff", glowColor: "#dd88ff" },
  fighter:      { fallbackColor: "#ff3333", coreColor: "#ff8888", glowColor: "#ff6666" },
  stealth:      { fallbackColor: "#ff3333", coreColor: "#ff8888", glowColor: "#ff6666" },
  bomber:       { fallbackColor: "#ff8800", coreColor: "#ffcc66", glowColor: "#ffbb44" },
  gunship:      { fallbackColor: "#ff8800", coreColor: "#ffcc66", glowColor: "#ffbb44" },
  cruiser:      { fallbackColor: "#4488ff", coreColor: "#99ccff", glowColor: "#88bbff" },
  destroyer:    { fallbackColor: "#4488ff", coreColor: "#99ccff", glowColor: "#88bbff" },
  juggernaut:   { fallbackColor: "#4488ff", coreColor: "#99ccff", glowColor: "#88bbff" },
  boss:         { fallbackColor: "#ff4444", coreColor: "#ff9999", glowColor: "#ff6666" },
  boss_carrier: { fallbackColor: "#ff4444", coreColor: "#ff9999", glowColor: "#ff6666" },
  boss_gunship: { fallbackColor: "#5577ff", coreColor: "#99aaff", glowColor: "#7799ff" },
  boss_dreadnought: { fallbackColor: "#ff44aa", coreColor: "#ff88cc", glowColor: "#ff66bb" },
  boss_fortress:    { fallbackColor: "#00ccff", coreColor: "#88eeff", glowColor: "#66ddff" },
  wasp:             { fallbackColor: "#ccff44", coreColor: "#eeff88", glowColor: "#ddff66" },
  phantom:          { fallbackColor: "#9966ff", coreColor: "#ccaaff", glowColor: "#bb88ff" },
  locust:           { fallbackColor: "#aaaa44", coreColor: "#cccc88", glowColor: "#bbbb66" },
  glider:           { fallbackColor: "#88aacc", coreColor: "#bbccee", glowColor: "#99bbdd" },
  spark:            { fallbackColor: "#44eeff", coreColor: "#88ffff", glowColor: "#66eeff" },
  sentinel:         { fallbackColor: "#66aacc", coreColor: "#aaccee", glowColor: "#88bbdd" },
  lancer:           { fallbackColor: "#ff9944", coreColor: "#ffcc88", glowColor: "#ffbb66" },
  ravager:          { fallbackColor: "#ff4444", coreColor: "#ff8888", glowColor: "#ff6666" },
  wraith:           { fallbackColor: "#8844cc", coreColor: "#bb88ee", glowColor: "#aa66dd" },
  corsair:          { fallbackColor: "#99aabb", coreColor: "#bbccdd", glowColor: "#aabbcc" },
  vulture:          { fallbackColor: "#aa6633", coreColor: "#cc9966", glowColor: "#bb7744" },
  titan:            { fallbackColor: "#778899", coreColor: "#aabbcc", glowColor: "#8899aa" },
  bastion:          { fallbackColor: "#aa8833", coreColor: "#ccaa66", glowColor: "#bb9944" },
  siege_engine:     { fallbackColor: "#55aa55", coreColor: "#88cc88", glowColor: "#66bb66" },
  colossus:         { fallbackColor: "#5555aa", coreColor: "#8888cc", glowColor: "#6666bb" },
  warden:           { fallbackColor: "#4488dd", coreColor: "#88bbff", glowColor: "#66aaee" },
  leviathan:        { fallbackColor: "#667744", coreColor: "#99aa77", glowColor: "#778855" },
  boss_mothership:  { fallbackColor: "#334466", coreColor: "#667799", glowColor: "#4d6688" },
  boss_hydra:       { fallbackColor: "#556666", coreColor: "#889999", glowColor: "#667777" },
  boss_shadow:      { fallbackColor: "#2a2a3a", coreColor: "#55556a", glowColor: "#3d3d55" },
  boss_behemoth:    { fallbackColor: "#444455", coreColor: "#777788", glowColor: "#555566" },
  boss_architect:   { fallbackColor: "#228888", coreColor: "#55bbbb", glowColor: "#33aa9a" },
  boss_swarm_queen: { fallbackColor: "#447733", coreColor: "#77aa66", glowColor: "#558844" },
  splitter:    { fallbackColor: "#44ddbb", coreColor: "#88ffdd", glowColor: "#66eecc" },
  healer:      { fallbackColor: "#66dd88", coreColor: "#aaffcc", glowColor: "#88eebb" },
  teleporter:  { fallbackColor: "#cc66ff", coreColor: "#ee99ff", glowColor: "#dd88ff" },
  mimic:       { fallbackColor: "#bbbbdd", coreColor: "#ddddef", glowColor: "#ccccee" },
  jammer:      { fallbackColor: "#888866", coreColor: "#aaaa88", glowColor: "#999977" },
};

export interface GravityWell {
  x: number;
  y: number;
  timeRemaining: number;
  strength: number;
  radius: number;
}

export interface EnemyConfig {
  variant: EnemyVariant;
  hitPoints: number;
  speed: number;
  scoreValue: number;
  fireRate: number;
  width: number;
  height: number;
  weaponType?: EnemyWeaponType;
  projectileSkin?: ProjectileSkin;
  collisionDamage?: number;
  projectileDamageMultiplier?: number;
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
  | "weapon-autoturret"
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
  | "enemy_chain_fire"
  | "enemy_charge_fire"
  | "enemy_scatter_fire"
  | "enemy_shockwave_fire"
  | "plasma_fire"
  | "plasma_hit"
  | "ion_fire"
  | "ion_hit"
  | "rocket_fire"
  | "mega_bomb_fire"
  | "dodge"
  | "emp_burst"
  | "deflect"
  | "turret_fire"
  | "achievement_unlock";

export type WeaponType = "machine-gun" | "missile" | "laser" | "plasma" | "ion-cannon" | "auto-gun" | "rocket" | "auto-turret";

export const WEAPON_SLOT_ORDER: WeaponType[] = [
  "machine-gun", "rocket", "laser", "plasma", "ion-cannon", "auto-gun", "auto-turret", "missile"
];

export const HUD_BAR_HEIGHT = 48;
export const HUD_LEFT_PANEL_WIDTH = 60;
export const HUD_RIGHT_PANEL_WIDTH = 60;
export const HUD_TOP_BAR_HEIGHT = 44;

export const SAVE_FORMAT_VERSION = 5;

export const MAX_WEAPON_TIER = 10;

export const WEAPON_SPEED_BONUS_THRESHOLD = 5;
export const WEAPON_SPEED_BONUS_PER_TYPE = 0.01;

export const MAX_SAVE_SLOTS = 3;

export const MIN_ENEMY_RENDER_SIZE = 24;

/** Global multiplier applied to all ship movement speeds (enemy & player). */
export const SHIP_SPEED_SCALE = 0.85;

export interface SaveMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(data: Record<string, unknown>): Record<string, unknown>;
}

export interface RaptorSaveData {
  version: number;
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
  /** Shield battery HP at save point (0-200). */
  shieldBattery?: number;
  /** Hull armor HP at save point (0-200). */
  armor?: number;
  /** Energy level at save point (0-200). */
  energy?: number;
  /** @deprecated Kept for backward compat; use weaponInventory instead. */
  weaponTier?: number;
  /** Full weapon inventory mapping weapon type to tier (1-5). */
  weaponInventory?: Record<string, number>;
  /** Which save slot this data was written to (0-based). */
  slotIndex?: number;
  /** Whether this save was created by the auto-save system (vs. level-complete). */
  isAutoSave?: boolean;
  /** The wave index the player had reached when auto-saved (0-based). */
  waveIndex?: number;
  /** Cumulative play time in seconds across all sessions. */
  playTimeSeconds?: number;
  /** FNV-1a hash of the serialized save payload (excluding this field). Optional for backward compat with pre-checksum saves. */
  checksum?: string;
}

export interface WeaponTierConfig {
  damageMultiplier: number;
  fireRateMultiplier: number;
  projectileCount: number;
  projectileSpread: number;
  visualScale: number;
  homingStrength?: number;
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
  tiers: [WeaponTierConfig, WeaponTierConfig, WeaponTierConfig, WeaponTierConfig, WeaponTierConfig,
          WeaponTierConfig, WeaponTierConfig, WeaponTierConfig, WeaponTierConfig, WeaponTierConfig];
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
      { damageMultiplier: 1, fireRateMultiplier: 1.6, projectileCount: 3, projectileSpread: 0.1, visualScale: 1 },
      { damageMultiplier: 1, fireRateMultiplier: 1.6, projectileCount: 5, projectileSpread: 0.08, visualScale: 1 },
      { damageMultiplier: 1, fireRateMultiplier: 1.8, projectileCount: 5, projectileSpread: 0.08, visualScale: 1, homingStrength: 0.8 },
      { damageMultiplier: 1, fireRateMultiplier: 2.0, projectileCount: 7, projectileSpread: 0.06, visualScale: 1, homingStrength: 1.0 },
      { damageMultiplier: 1.2, fireRateMultiplier: 2.0, projectileCount: 7, projectileSpread: 0.06, visualScale: 1, homingStrength: 1.2 },
      { damageMultiplier: 1.2, fireRateMultiplier: 2.2, projectileCount: 9, projectileSpread: 0.05, visualScale: 1, homingStrength: 1.4 },
      { damageMultiplier: 1.5, fireRateMultiplier: 2.5, projectileCount: 9, projectileSpread: 0.05, visualScale: 1, homingStrength: 1.8 },
    ],
  },
  "missile": {
    type: "missile",
    damage: 3,
    fireRateMultiplier: 0.35,
    projectileSpeed: 350,
    piercing: false,
    homing: false,
    homingStrength: 0,
    splashRadius: 30,
    splashDamageRatio: 0.4,
    rapidFireBonus: 1.3,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      TIER_1,
      { damageMultiplier: 1.33, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.33, fireRateMultiplier: 1, projectileCount: 2, projectileSpread: 0.15, visualScale: 1, homingStrength: 1.0 },
      { damageMultiplier: 1.67, fireRateMultiplier: 1, projectileCount: 2, projectileSpread: 0.15, visualScale: 1, homingStrength: 1.4 },
      { damageMultiplier: 2.0, fireRateMultiplier: 1.2, projectileCount: 3, projectileSpread: 0.12, visualScale: 1, homingStrength: 1.8 },
      { damageMultiplier: 2.5, fireRateMultiplier: 1.4, projectileCount: 3, projectileSpread: 0.12, visualScale: 1, homingStrength: 2.2 },
      { damageMultiplier: 3.0, fireRateMultiplier: 1.4, projectileCount: 4, projectileSpread: 0.10, visualScale: 1, homingStrength: 2.5 },
      { damageMultiplier: 3.5, fireRateMultiplier: 1.6, projectileCount: 4, projectileSpread: 0.10, visualScale: 1, homingStrength: 2.8 },
      { damageMultiplier: 4.0, fireRateMultiplier: 1.8, projectileCount: 5, projectileSpread: 0.08, visualScale: 1, homingStrength: 3.0 },
      { damageMultiplier: 5.0, fireRateMultiplier: 2.0, projectileCount: 5, projectileSpread: 0.08, visualScale: 1, homingStrength: 3.5 },
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
      { damageMultiplier: 2.5, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 2.0 },
      { damageMultiplier: 3.0, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 2.5 },
      { damageMultiplier: 3.5, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 2.8 },
      { damageMultiplier: 4.0, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 3.2 },
      { damageMultiplier: 4.5, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 3.5 },
      { damageMultiplier: 5.0, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 4.0 },
      { damageMultiplier: 6.0, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 5.0 },
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
      { damageMultiplier: 2.0, fireRateMultiplier: 1, projectileCount: 3, projectileSpread: 0.1, visualScale: 1 },
      { damageMultiplier: 2.5, fireRateMultiplier: 1.2, projectileCount: 3, projectileSpread: 0.1, visualScale: 1.25 },
      { damageMultiplier: 3.0, fireRateMultiplier: 1.3, projectileCount: 4, projectileSpread: 0.08, visualScale: 1.25, homingStrength: 0.8 },
      { damageMultiplier: 3.5, fireRateMultiplier: 1.4, projectileCount: 4, projectileSpread: 0.08, visualScale: 1.25, homingStrength: 1.0 },
      { damageMultiplier: 4.0, fireRateMultiplier: 1.5, projectileCount: 5, projectileSpread: 0.06, visualScale: 1.5, homingStrength: 1.2 },
      { damageMultiplier: 4.5, fireRateMultiplier: 1.6, projectileCount: 5, projectileSpread: 0.06, visualScale: 1.5, homingStrength: 1.5 },
      { damageMultiplier: 5.0, fireRateMultiplier: 1.8, projectileCount: 6, projectileSpread: 0.05, visualScale: 1.75, homingStrength: 2.0 },
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
      { damageMultiplier: 2.0, fireRateMultiplier: 1.6, projectileCount: 2, projectileSpread: 0.08, visualScale: 1.3 },
      { damageMultiplier: 2.5, fireRateMultiplier: 1.8, projectileCount: 2, projectileSpread: 0.08, visualScale: 1.5 },
      { damageMultiplier: 3.0, fireRateMultiplier: 2.0, projectileCount: 3, projectileSpread: 0.06, visualScale: 1.5, homingStrength: 0.6 },
      { damageMultiplier: 3.5, fireRateMultiplier: 2.2, projectileCount: 3, projectileSpread: 0.06, visualScale: 1.5, homingStrength: 0.8 },
      { damageMultiplier: 4.0, fireRateMultiplier: 2.4, projectileCount: 3, projectileSpread: 0.06, visualScale: 1.7, homingStrength: 1.0 },
      { damageMultiplier: 4.5, fireRateMultiplier: 2.6, projectileCount: 4, projectileSpread: 0.05, visualScale: 1.7, homingStrength: 1.2 },
      { damageMultiplier: 5.0, fireRateMultiplier: 3.0, projectileCount: 4, projectileSpread: 0.05, visualScale: 2.0, homingStrength: 1.5 },
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
      { damageMultiplier: 1.4, fireRateMultiplier: 1.6, projectileCount: 3, projectileSpread: 0.06, visualScale: 1 },
      { damageMultiplier: 1.6, fireRateMultiplier: 1.8, projectileCount: 5, projectileSpread: 0.05, visualScale: 1 },
      { damageMultiplier: 1.8, fireRateMultiplier: 2.0, projectileCount: 5, projectileSpread: 0.05, visualScale: 1, homingStrength: 2.5 },
      { damageMultiplier: 2.0, fireRateMultiplier: 2.2, projectileCount: 7, projectileSpread: 0.04, visualScale: 1, homingStrength: 2.8 },
      { damageMultiplier: 2.2, fireRateMultiplier: 2.4, projectileCount: 7, projectileSpread: 0.04, visualScale: 1, homingStrength: 3.0 },
      { damageMultiplier: 2.5, fireRateMultiplier: 2.6, projectileCount: 9, projectileSpread: 0.03, visualScale: 1, homingStrength: 3.2 },
      { damageMultiplier: 3.0, fireRateMultiplier: 3.0, projectileCount: 9, projectileSpread: 0.03, visualScale: 1, homingStrength: 3.5 },
    ],
  },
  "auto-turret": {
    type: "auto-turret",
    damage: 1,
    fireRateMultiplier: 1.2,
    projectileSpeed: 400,
    piercing: false,
    homing: true,
    homingStrength: 2.5,
    splashRadius: 0,
    splashDamageRatio: 0,
    rapidFireBonus: 1.6,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      { damageMultiplier: 1,   fireRateMultiplier: 1,   projectileCount: 2, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.3, fireRateMultiplier: 1.2, projectileCount: 2, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.3, fireRateMultiplier: 1.2, projectileCount: 3, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.6, fireRateMultiplier: 1.5, projectileCount: 3, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.8, fireRateMultiplier: 1.8, projectileCount: 4, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 2.0, fireRateMultiplier: 2.0, projectileCount: 5, projectileSpread: 0, visualScale: 1, homingStrength: 3.0 },
      { damageMultiplier: 2.2, fireRateMultiplier: 2.2, projectileCount: 5, projectileSpread: 0, visualScale: 1, homingStrength: 3.2 },
      { damageMultiplier: 2.5, fireRateMultiplier: 2.5, projectileCount: 6, projectileSpread: 0, visualScale: 1, homingStrength: 3.5 },
      { damageMultiplier: 2.8, fireRateMultiplier: 2.8, projectileCount: 6, projectileSpread: 0, visualScale: 1, homingStrength: 3.8 },
      { damageMultiplier: 3.0, fireRateMultiplier: 3.0, projectileCount: 8, projectileSpread: 0, visualScale: 1, homingStrength: 4.0 },
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
    splashRadius: 0,
    splashDamageRatio: 0,
    rapidFireBonus: 1.4,
    spreadShotBehavior: "multi-projectile",
    tiers: [
      TIER_1,
      { damageMultiplier: 1.4, fireRateMultiplier: 1, projectileCount: 1, projectileSpread: 0, visualScale: 1 },
      { damageMultiplier: 1.4, fireRateMultiplier: 1, projectileCount: 2, projectileSpread: 0.1, visualScale: 1 },
      { damageMultiplier: 1.8, fireRateMultiplier: 1, projectileCount: 2, projectileSpread: 0.1, visualScale: 1 },
      { damageMultiplier: 2.0, fireRateMultiplier: 1.2, projectileCount: 3, projectileSpread: 0.08, visualScale: 1.1 },
      { damageMultiplier: 2.5, fireRateMultiplier: 1.4, projectileCount: 3, projectileSpread: 0.08, visualScale: 1.1, homingStrength: 0.8 },
      { damageMultiplier: 3.0, fireRateMultiplier: 1.5, projectileCount: 4, projectileSpread: 0.06, visualScale: 1.2, homingStrength: 1.0 },
      { damageMultiplier: 3.5, fireRateMultiplier: 1.6, projectileCount: 4, projectileSpread: 0.06, visualScale: 1.2, homingStrength: 1.2 },
      { damageMultiplier: 4.0, fireRateMultiplier: 1.8, projectileCount: 5, projectileSpread: 0.05, visualScale: 1.3, homingStrength: 1.5 },
      { damageMultiplier: 5.0, fireRateMultiplier: 2.0, projectileCount: 5, projectileSpread: 0.05, visualScale: 1.4, homingStrength: 2.0 },
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
  sourceWeapon: WeaponType;
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
  bossType?: BossType;
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
  | "shipyard" | "wasteland" | "industrial" | "orbital" | "stronghold"
  | "colony" | "asteroid" | "nebula" | "jungle" | "volcano"
  | "ocean" | "tundra" | "ruins" | "megacity" | "dominion_base"
  | "void_station" | "dark_nebula" | "hive_world" | "crystal_caves" | "forge_world"
  | "nexus_array" | "architect_temple" | "warp_corridor" | "titan_graveyard" | "final_void";

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

export interface StateTransitionMap {
  [from: string]: RaptorGameState[];
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
    width: 28,
    height: 28,
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
    hitPoints: 50,
    speed: 40,
    scoreValue: 400,
    fireRate: 1.5,
    width: 64,
    height: 56,
    weaponType: "standard",
  },
  boss_gunship: {
    variant: "boss_gunship",
    hitPoints: 50,
    speed: 50,
    scoreValue: 500,
    fireRate: 1.5,
    width: 72,
    height: 60,
    weaponType: "spread",
  },
  interceptor: {
    variant: "interceptor",
    hitPoints: 1,
    speed: 250,
    scoreValue: 15,
    fireRate: 0.5,
    width: 26,
    height: 26,
    weaponType: "standard",
  },
  dart: {
    variant: "dart",
    hitPoints: 1,
    speed: 300,
    scoreValue: 12,
    fireRate: 0,
    width: 24,
    height: 26,
  },
  drone: {
    variant: "drone",
    hitPoints: 1,
    speed: 160,
    scoreValue: 8,
    fireRate: 0.3,
    width: 24,
    height: 24,
    weaponType: "standard",
  },
  swarmer: {
    variant: "swarmer",
    hitPoints: 1,
    speed: 170,
    scoreValue: 12,
    fireRate: 0.4,
    width: 24,
    height: 24,
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
  boss_dreadnought: {
    variant: "boss_dreadnought",
    hitPoints: 80,
    speed: 25,
    scoreValue: 800,
    fireRate: 1.0,
    width: 80,
    height: 68,
    weaponType: "missile",
  },
  boss_fortress: {
    variant: "boss_fortress",
    hitPoints: 60,
    speed: 15,
    scoreValue: 600,
    fireRate: 1.8,
    width: 76,
    height: 64,
    weaponType: "laser",
  },
  boss_carrier: {
    variant: "boss_carrier",
    hitPoints: 55,
    speed: 30,
    scoreValue: 700,
    fireRate: 0.8,
    width: 84,
    height: 70,
    weaponType: "standard",
  },
  wasp: {
    variant: "wasp",
    hitPoints: 1,
    speed: 220,
    scoreValue: 14,
    fireRate: 1.0,
    width: 26,
    height: 26,
    weaponType: "standard",
  },
  phantom: {
    variant: "phantom",
    hitPoints: 1,
    speed: 200,
    scoreValue: 18,
    fireRate: 0.6,
    width: 26,
    height: 26,
    weaponType: "standard",
  },
  needle: {
    variant: "needle",
    hitPoints: 1,
    speed: 350,
    scoreValue: 8,
    fireRate: 0,
    width: 18,
    height: 28,
    collisionDamage: 200,
  },
  locust: {
    variant: "locust",
    hitPoints: 1,
    speed: 190,
    scoreValue: 5,
    fireRate: 0.3,
    width: 20,
    height: 20,
    weaponType: "standard",
    projectileDamageMultiplier: 0.5,
  },
  glider: {
    variant: "glider",
    hitPoints: 1,
    speed: 100,
    scoreValue: 12,
    fireRate: 0.5,
    width: 28,
    height: 18,
    weaponType: "standard",
  },
  spark: {
    variant: "spark",
    hitPoints: 1,
    speed: 170,
    scoreValue: 15,
    fireRate: 0.4,
    width: 24,
    height: 24,
    weaponType: "chain",
  },
  sentinel: {
    variant: "sentinel",
    hitPoints: 3,
    speed: 80,
    scoreValue: 45,
    fireRate: 0.6,
    width: 30,
    height: 30,
    weaponType: "standard",
  },
  lancer: {
    variant: "lancer",
    hitPoints: 2,
    speed: 60,
    scoreValue: 30,
    fireRate: 0.8,
    width: 28,
    height: 32,
    weaponType: "standard",
  },
  ravager: {
    variant: "ravager",
    hitPoints: 3,
    speed: 130,
    scoreValue: 40,
    fireRate: 0.7,
    width: 36,
    height: 28,
    weaponType: "spread",
  },
  wraith: {
    variant: "wraith",
    hitPoints: 3,
    speed: 140,
    scoreValue: 50,
    fireRate: 0.5,
    width: 26,
    height: 26,
    weaponType: "standard",
  },
  corsair: {
    variant: "corsair",
    hitPoints: 3,
    speed: 180,
    scoreValue: 45,
    fireRate: 0.5,
    width: 32,
    height: 30,
    weaponType: "missile",
  },
  vulture: {
    variant: "vulture",
    hitPoints: 2,
    speed: 160,
    scoreValue: 35,
    fireRate: 0.6,
    width: 26,
    height: 22,
    weaponType: "standard",
  },
  titan: {
    variant: "titan",
    hitPoints: 8,
    speed: 40,
    scoreValue: 120,
    fireRate: 0.8,
    width: 52,
    height: 48,
    weaponType: "spread",
  },
  bastion: {
    variant: "bastion",
    hitPoints: 10,
    speed: 60,
    scoreValue: 100,
    fireRate: 1.5,
    width: 40,
    height: 32,
    weaponType: "standard",
  },
  siege_engine: {
    variant: "siege_engine",
    hitPoints: 7,
    speed: 35,
    scoreValue: 90,
    fireRate: 0.3,
    width: 44,
    height: 40,
    weaponType: "charge_beam",
  },
  colossus: {
    variant: "colossus",
    hitPoints: 15,
    speed: 25,
    scoreValue: 200,
    fireRate: 0.6,
    width: 60,
    height: 56,
    weaponType: "missile",
    projectileDamageMultiplier: 1.5,
  },
  warden: {
    variant: "warden",
    hitPoints: 6,
    speed: 50,
    scoreValue: 80,
    fireRate: 0.5,
    width: 38,
    height: 36,
    weaponType: "missile",
  },
  leviathan: {
    variant: "leviathan",
    hitPoints: 10,
    speed: 35,
    scoreValue: 130,
    fireRate: 0.5,
    width: 56,
    height: 48,
    weaponType: "spread",
  },
  boss_mothership: {
    variant: "boss_mothership",
    hitPoints: 120,
    speed: 25,
    scoreValue: 3000,
    fireRate: 1.0,
    width: 96,
    height: 80,
    weaponType: "spread",
  },
  boss_hydra: {
    variant: "boss_hydra",
    hitPoints: 50,
    speed: 20,
    scoreValue: 2500,
    fireRate: 1.2,
    width: 88,
    height: 72,
    weaponType: "spread",
  },
  boss_shadow: {
    variant: "boss_shadow",
    hitPoints: 80,
    speed: 60,
    scoreValue: 2000,
    fireRate: 1.0,
    width: 72,
    height: 60,
    weaponType: "standard",
  },
  boss_behemoth: {
    variant: "boss_behemoth",
    hitPoints: 150,
    speed: 15,
    scoreValue: 3500,
    fireRate: 0.8,
    width: 84,
    height: 70,
    weaponType: "missile",
  },
  boss_architect: {
    variant: "boss_architect",
    hitPoints: 180,
    speed: 15,
    scoreValue: 4000,
    fireRate: 0.5,
    width: 80,
    height: 76,
    weaponType: "charge_beam",
  },
  boss_swarm_queen: {
    variant: "boss_swarm_queen",
    hitPoints: 100,
    speed: 30,
    scoreValue: 2200,
    fireRate: 0.6,
    width: 76,
    height: 64,
    weaponType: "scatter",
  },
  splitter: {
    variant: "splitter",
    hitPoints: 3,
    speed: 120,
    scoreValue: 35,
    fireRate: 0.5,
    width: 28,
    height: 26,
    weaponType: "standard",
  },
  splitter_minor: {
    variant: "splitter_minor",
    hitPoints: 1,
    speed: 160,
    scoreValue: 8,
    fireRate: 0,
    width: 18,
    height: 18,
  },
  healer: {
    variant: "healer",
    hitPoints: 2,
    speed: 90,
    scoreValue: 55,
    fireRate: 0.3,
    width: 26,
    height: 26,
    weaponType: "standard",
  },
  teleporter: {
    variant: "teleporter",
    hitPoints: 2,
    speed: 0,
    scoreValue: 40,
    fireRate: 0,
    width: 26,
    height: 26,
    weaponType: "standard",
  },
  mimic: {
    variant: "mimic",
    hitPoints: 2,
    speed: 0,
    scoreValue: 45,
    fireRate: 0.7,
    width: 26,
    height: 26,
    weaponType: "standard",
  },
  kamikaze: {
    variant: "kamikaze",
    hitPoints: 2,
    speed: 100,
    scoreValue: 25,
    fireRate: 0,
    width: 26,
    height: 30,
    collisionDamage: 200,
  },
  jammer: {
    variant: "jammer",
    hitPoints: 2,
    speed: 80,
    scoreValue: 50,
    fireRate: 0.4,
    width: 34,
    height: 26,
    weaponType: "standard",
  },
};

export type AchievementCategory =
  | "combat"
  | "survival"
  | "progression"
  | "collection"
  | "mastery";

export interface AchievementCondition {
  type: "stat_threshold" | "single_event" | "composite";
  /** Stat key to compare (for stat_threshold). */
  stat?: string;
  /** Minimum value to unlock (for stat_threshold). */
  threshold?: number;
  /** Event name that triggers unlock (for single_event). */
  eventType?: string;
  /** Sub-conditions, all of which must be true (for composite). */
  conditions?: AchievementCondition[];
}

export interface AchievementDefinition {
  /** Unique machine-readable identifier (snake_case). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Player-facing description of how to earn the achievement. */
  description: string;
  /** Icon key for UI rendering. */
  icon: string;
  /** Grouping category. */
  category: AchievementCategory;
  /** Condition tree evaluated by the runtime tracker. */
  condition: AchievementCondition;
  /** If true, hidden from the achievement list until unlocked. */
  hidden?: boolean;
}

export interface UnlockedAchievement {
  /** Achievement definition id. */
  id: string;
  /** Unix-epoch milliseconds when the achievement was unlocked. */
  unlockedAt: number;
}
