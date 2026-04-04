/**
 * Tests for Issue #449: EnemyWeaponType type system and configuration
 */

import {
  EnemyWeaponType,
  EnemyWeaponConfig,
  ENEMY_WEAPON_CONFIGS,
  EnemyConfig,
  ENEMY_CONFIGS,
  ENEMY_PROJECTILE_SKINS,
  RaptorSoundEvent,
} from "../src/games/raptor/types";
import { Enemy } from "../src/games/raptor/entities/Enemy";

// ─── EnemyWeaponType union type ──────────────────────────────────

describe("EnemyWeaponType", () => {
  test("all four values are assignable to EnemyWeaponType", () => {
    const types: EnemyWeaponType[] = ["standard", "spread", "missile", "laser"];
    expect(types).toHaveLength(4);
  });
});

// ─── ENEMY_WEAPON_CONFIGS record ──────────────────────────────────

describe("ENEMY_WEAPON_CONFIGS", () => {
  test("has exactly 8 entries", () => {
    expect(Object.keys(ENEMY_WEAPON_CONFIGS)).toHaveLength(8);
  });

  test("has a key for each EnemyWeaponType", () => {
    expect(ENEMY_WEAPON_CONFIGS["standard"]).toBeDefined();
    expect(ENEMY_WEAPON_CONFIGS["spread"]).toBeDefined();
    expect(ENEMY_WEAPON_CONFIGS["missile"]).toBeDefined();
    expect(ENEMY_WEAPON_CONFIGS["laser"]).toBeDefined();
  });

  test("each config type field matches its key", () => {
    for (const key of Object.keys(ENEMY_WEAPON_CONFIGS) as EnemyWeaponType[]) {
      expect(ENEMY_WEAPON_CONFIGS[key].type).toBe(key);
    }
  });

  test("all weapon configs have positive damage", () => {
    for (const key of Object.keys(ENEMY_WEAPON_CONFIGS) as EnemyWeaponType[]) {
      expect(ENEMY_WEAPON_CONFIGS[key].damage).toBeGreaterThan(0);
    }
  });

  test("all weapon configs have non-negative projectile speed", () => {
    for (const key of Object.keys(ENEMY_WEAPON_CONFIGS) as EnemyWeaponType[]) {
      expect(ENEMY_WEAPON_CONFIGS[key].projectileSpeed).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Standard weapon config ──────────────────────────────────────

describe("ENEMY_WEAPON_CONFIGS standard", () => {
  const cfg = ENEMY_WEAPON_CONFIGS["standard"];

  test("preserves existing enemy bullet behavior", () => {
    expect(cfg.damage).toBe(25);
    expect(cfg.projectileSpeed).toBe(300);
    expect(cfg.projectileCount).toBe(1);
    expect(cfg.spreadAngle).toBe(0);
    expect(cfg.homing).toBe(false);
    expect(cfg.homingStrength).toBe(0);
    expect(cfg.fireRateMultiplier).toBe(1.0);
    expect(cfg.spriteKey).toBe("bullet_enemy");
  });
});

// ─── Spread weapon config ────────────────────────────────────────

describe("ENEMY_WEAPON_CONFIGS spread", () => {
  const cfg = ENEMY_WEAPON_CONFIGS["spread"];

  test("defines multi-projectile behavior", () => {
    expect(cfg.projectileCount).toBeGreaterThan(1);
    expect(cfg.spreadAngle).toBeGreaterThan(0);
    expect(cfg.damage).toBeLessThan(25);
    expect(cfg.fireRateMultiplier).toBeLessThan(1.0);
  });
});

// ─── Missile weapon config ───────────────────────────────────────

describe("ENEMY_WEAPON_CONFIGS missile", () => {
  const cfg = ENEMY_WEAPON_CONFIGS["missile"];

  test("defines homing behavior", () => {
    expect(cfg.homing).toBe(true);
    expect(cfg.homingStrength).toBeGreaterThan(0);
    expect(cfg.homingStrength).toBeLessThan(2.5);
    expect(cfg.damage).toBeGreaterThan(25);
    expect(cfg.fireRateMultiplier).toBeLessThan(1.0);
  });
});

// ─── Laser weapon config ─────────────────────────────────────────

describe("ENEMY_WEAPON_CONFIGS laser", () => {
  const cfg = ENEMY_WEAPON_CONFIGS["laser"];

  test("defines continuous beam behavior", () => {
    expect(cfg.projectileSpeed).toBe(0);
    expect(cfg.fireRateMultiplier).toBe(0);
    expect(cfg.damage).toBeLessThan(25);
  });
});

// ─── EnemyConfig optional weaponType field ───────────────────────

describe("EnemyConfig weaponType field", () => {
  test("EnemyConfig without weaponType is valid", () => {
    const config: EnemyConfig = {
      variant: "scout",
      hitPoints: 1,
      speed: 180,
      scoreValue: 10,
      fireRate: 0,
      width: 24,
      height: 24,
    };
    expect(config.weaponType).toBeUndefined();
  });

  test("ENEMY_CONFIGS fighter has weaponType standard", () => {
    expect(ENEMY_CONFIGS["fighter"].weaponType).toBe("standard");
  });

  test("ENEMY_CONFIGS bomber has weaponType spread", () => {
    expect(ENEMY_CONFIGS["bomber"].weaponType).toBe("spread");
  });

  test("ENEMY_CONFIGS boss has weaponType standard", () => {
    expect(ENEMY_CONFIGS["boss"].weaponType).toBe("standard");
  });

  test("ENEMY_CONFIGS scout has no weaponType", () => {
    expect(ENEMY_CONFIGS["scout"].weaponType).toBeUndefined();
  });
});

// ─── Enemy entity weaponType property ────────────────────────────

describe("Enemy weaponType property", () => {
  test("defaults to standard when not in config (scout)", () => {
    const enemy = new Enemy(100, 0, "scout");
    expect(enemy.weaponType).toBe("standard");
  });

  test("reads weaponType from ENEMY_CONFIGS (fighter)", () => {
    const enemy = new Enemy(100, 0, "fighter");
    expect(enemy.weaponType).toBe("standard");
  });

  test("reads weaponType from ENEMY_CONFIGS (boss)", () => {
    const enemy = new Enemy(400, 0, "boss");
    expect(enemy.weaponType).toBe("standard");
  });

  test("can be overridden via overrideConfig", () => {
    const enemy = new Enemy(100, 0, "fighter", undefined, { weaponType: "spread" });
    expect(enemy.weaponType).toBe("spread");
  });

  test("override to missile works", () => {
    const enemy = new Enemy(100, 0, "bomber", undefined, { weaponType: "missile" });
    expect(enemy.weaponType).toBe("missile");
  });

  test("override to laser works", () => {
    const enemy = new Enemy(100, 0, "boss", undefined, { weaponType: "laser" });
    expect(enemy.weaponType).toBe("laser");
  });
});

// ─── RaptorSoundEvent extensions ─────────────────────────────────

describe("RaptorSoundEvent enemy weapon events", () => {
  test("enemy_spread_fire is a valid RaptorSoundEvent", () => {
    const event: RaptorSoundEvent = "enemy_spread_fire";
    expect(event).toBe("enemy_spread_fire");
  });

  test("enemy_missile_fire is a valid RaptorSoundEvent", () => {
    const event: RaptorSoundEvent = "enemy_missile_fire";
    expect(event).toBe("enemy_missile_fire");
  });

  test("enemy_laser_fire is a valid RaptorSoundEvent", () => {
    const event: RaptorSoundEvent = "enemy_laser_fire";
    expect(event).toBe("enemy_laser_fire");
  });

  test("enemy_missile_hit is a valid RaptorSoundEvent", () => {
    const event: RaptorSoundEvent = "enemy_missile_hit";
    expect(event).toBe("enemy_missile_hit");
  });

  test("enemy_laser_hit is a valid RaptorSoundEvent", () => {
    const event: RaptorSoundEvent = "enemy_laser_hit";
    expect(event).toBe("enemy_laser_hit");
  });
});

// ─── Act 2 Dominion enemy spriteKey assignments ───────────────────

describe("ENEMY_PROJECTILE_SKINS Act 2 Dominion assignments", () => {
  test("wasp uses bullet_enemy_green", () => {
    expect(ENEMY_PROJECTILE_SKINS["wasp"]?.spriteKey).toBe("bullet_enemy_green");
  });

  test("phantom uses bullet_enemy_purple", () => {
    expect(ENEMY_PROJECTILE_SKINS["phantom"]?.spriteKey).toBe("bullet_enemy_purple");
  });

  test("glider uses bullet_enemy_blue", () => {
    expect(ENEMY_PROJECTILE_SKINS["glider"]?.spriteKey).toBe("bullet_enemy_blue");
  });

  test("lancer uses bullet_enemy_orange", () => {
    expect(ENEMY_PROJECTILE_SKINS["lancer"]?.spriteKey).toBe("bullet_enemy_orange");
  });

  test("ravager uses bullet_enemy_orange", () => {
    expect(ENEMY_PROJECTILE_SKINS["ravager"]?.spriteKey).toBe("bullet_enemy_orange");
  });

  test("ravager fallbackColor is orange, not red", () => {
    const color = ENEMY_PROJECTILE_SKINS["ravager"]?.fallbackColor ?? "";
    // Must not be the old red (#ff4444); should be in the orange range
    expect(color).not.toBe("#ff4444");
    expect(color.toLowerCase()).toMatch(/^#ff[89a-f]/i);
  });

  test("wraith uses bullet_enemy_purple", () => {
    expect(ENEMY_PROJECTILE_SKINS["wraith"]?.spriteKey).toBe("bullet_enemy_purple");
  });

  test("titan uses bullet_enemy_blue", () => {
    expect(ENEMY_PROJECTILE_SKINS["titan"]?.spriteKey).toBe("bullet_enemy_blue");
  });

  test("leviathan uses bullet_enemy_green", () => {
    expect(ENEMY_PROJECTILE_SKINS["leviathan"]?.spriteKey).toBe("bullet_enemy_green");
  });

  test("boss_mothership uses missile_enemy_blue", () => {
    expect(ENEMY_PROJECTILE_SKINS["boss_mothership"]?.spriteKey).toBe("missile_enemy_blue");
  });

  test("boss_behemoth uses missile_enemy_magenta", () => {
    expect(ENEMY_PROJECTILE_SKINS["boss_behemoth"]?.spriteKey).toBe("missile_enemy_magenta");
  });

  test("boss_shadow uses bullet_enemy_purple", () => {
    expect(ENEMY_PROJECTILE_SKINS["boss_shadow"]?.spriteKey).toBe("bullet_enemy_purple");
  });
});

// ─── Act 2 spread-shot spriteKey overrides ────────────────────────

describe("ENEMY_PROJECTILE_SKINS spreadSpriteKey assignments", () => {
  test("ravager has spreadSpriteKey bullet_spread_orange", () => {
    expect(ENEMY_PROJECTILE_SKINS["ravager"]?.spreadSpriteKey).toBe("bullet_spread_orange");
  });

  test("titan has spreadSpriteKey bullet_spread_blue", () => {
    expect(ENEMY_PROJECTILE_SKINS["titan"]?.spreadSpriteKey).toBe("bullet_spread_blue");
  });

  test("boss_mothership has spreadSpriteKey bullet_spread_blue", () => {
    expect(ENEMY_PROJECTILE_SKINS["boss_mothership"]?.spreadSpriteKey).toBe("bullet_spread_blue");
  });

  test("boss_hydra has spreadSpriteKey bullet_spread_blue", () => {
    expect(ENEMY_PROJECTILE_SKINS["boss_hydra"]?.spreadSpriteKey).toBe("bullet_spread_blue");
  });
});
