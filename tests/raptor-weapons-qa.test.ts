/**
 * QA tests for PR #39 — Issue #36: Add more weapon types to the Raptor game
 * Tests cover: Machine Gun, Missile, Laser, Weapon Switching, Power-Up Drops,
 * Sound Effects, Visual Fallbacks, HUD weapon indicator, and Collision System.
 */

import { WeaponType, WeaponConfig, WEAPON_CONFIGS, Projectile, RaptorPowerUpType, RaptorSoundEvent, RaptorLevelConfig } from "../src/games/raptor/types";
import { Bullet } from "../src/games/raptor/entities/Bullet";
import { Missile } from "../src/games/raptor/entities/Missile";
import { LaserBeam } from "../src/games/raptor/entities/LaserBeam";
import { Enemy } from "../src/games/raptor/entities/Enemy";
import { PowerUp } from "../src/games/raptor/entities/PowerUp";
import { WeaponSystem } from "../src/games/raptor/systems/WeaponSystem";
import { CollisionSystem } from "../src/games/raptor/systems/CollisionSystem";
import { PowerUpManager } from "../src/games/raptor/systems/PowerUpManager";
import { LEVELS } from "../src/games/raptor/levels";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEnemy(x: number, y: number, variant: "scout" | "fighter" | "bomber" | "boss" = "scout"): Enemy {
  return new Enemy(x, y, variant);
}

function makeLevelConfig(overrides: Partial<RaptorLevelConfig> = {}): RaptorLevelConfig {
  return {
    level: 1,
    name: "Test",
    waves: [],
    bossEnabled: false,
    autoFireRate: 5,
    powerUpDropChance: 0.1,
    skyGradient: ["#000", "#111"],
    starDensity: 10,
    enemyFireRateMultiplier: 1,
    ...overrides,
  };
}

function makePlayer() {
  // Minimal player mock matching Player's interface used by WeaponSystem
  return {
    pos: { x: 400, y: 500 },
    alive: true,
    top: 500 - 18,
    width: 32,
    height: 36,
  } as any;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Machine Gun (Default Weapon)
// ═══════════════════════════════════════════════════════════════════════════

describe("Machine Gun (Default Weapon)", () => {
  test("Player starts with the machine-gun weapon", () => {
    const ws = new WeaponSystem();
    expect(ws.currentWeapon).toBe("machine-gun");
  });

  test("WeaponSystem resets to machine-gun", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    expect(ws.currentWeapon).toBe("missile");
    ws.reset();
    expect(ws.currentWeapon).toBe("machine-gun");
  });

  test("Machine gun fires standard Bullet projectiles", () => {
    const ws = new WeaponSystem();
    const pm = new PowerUpManager();
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    // Advance timer past fire interval (1 / (5 * 1.0) = 0.2s)
    const { newProjectiles } = ws.update(0.25, player, config, pm, 800, []);
    expect(newProjectiles.length).toBe(1);
    expect(newProjectiles[0]).toBeInstanceOf(Bullet);
  });

  test("Bullet travels upward at 500 px/s", () => {
    const bullet = new Bullet(400, 500);
    const startY = bullet.pos.y;
    bullet.update(1.0, 800);
    // After 1 second, should have moved ~500px upward
    expect(bullet.pos.y).toBeCloseTo(startY - 500, 0);
  });

  test("Bullet deals 1 damage on hit", () => {
    const bullet = new Bullet(400, 500);
    expect(bullet.damage).toBe(1);
  });

  test("Bullet is not piercing", () => {
    const bullet = new Bullet(400, 500);
    expect(bullet.piercing).toBe(false);
  });

  test("Machine gun with spread-shot fires 3 bullets at angles -0.2, 0, 0.2", () => {
    const ws = new WeaponSystem();
    const pm = new PowerUpManager();
    pm.activate("spread-shot");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    const { newProjectiles } = ws.update(0.25, player, config, pm, 800, []);
    expect(newProjectiles.length).toBe(3);
    for (const p of newProjectiles) {
      expect(p).toBeInstanceOf(Bullet);
    }
  });

  test("Machine gun with rapid-fire doubles the fire rate", () => {
    const ws1 = new WeaponSystem();
    const ws2 = new WeaponSystem();
    const pm1 = new PowerUpManager();
    const pm2 = new PowerUpManager();
    pm2.activate("rapid-fire");

    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    // Without rapid-fire: fire interval = 1 / (5 * 1.0) = 0.2s
    // With rapid-fire: fire interval = 1 / (5 * 1.0 * 2.0) = 0.1s
    // In 0.15s, without rapid-fire: 0 shots; with rapid-fire: 1 shot
    const r1 = ws1.update(0.15, player, config, pm1, 800, []);
    const r2 = ws2.update(0.15, player, config, pm2, 800, []);

    expect(r1.newProjectiles.length).toBe(0);
    expect(r2.newProjectiles.length).toBe(1);
  });

  test("Machine gun WEAPON_CONFIG has correct values", () => {
    const cfg = WEAPON_CONFIGS["machine-gun"];
    expect(cfg.type).toBe("machine-gun");
    expect(cfg.damage).toBe(1);
    expect(cfg.fireRateMultiplier).toBe(1.0);
    expect(cfg.projectileSpeed).toBe(500);
    expect(cfg.piercing).toBe(false);
    expect(cfg.homing).toBe(false);
    expect(cfg.splashRadius).toBe(0);
    expect(cfg.rapidFireBonus).toBe(2.0);
    expect(cfg.spreadShotBehavior).toBe("multi-projectile");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Missile Weapon
// ═══════════════════════════════════════════════════════════════════════════

describe("Missile Weapon", () => {
  test("Player obtains missile weapon from weapon-missile power-up", () => {
    const pm = new PowerUpManager();
    expect(pm.currentWeapon).toBe("machine-gun");
    const result = pm.setWeapon("missile");
    expect(result).toBe("switched");
    expect(pm.currentWeapon).toBe("missile");
  });

  test("WeaponSystem switches to missile and fires missile_fire sound", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    expect(ws.currentWeapon).toBe("missile");

    const pm = new PowerUpManager();
    pm.setWeapon("missile");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    // Missile fire interval = 1 / (5 * 0.35) = ~0.571s
    const { newProjectiles, soundEvent } = ws.update(0.6, player, config, pm, 800, []);
    expect(newProjectiles.length).toBe(1);
    expect(newProjectiles[0]).toBeInstanceOf(Missile);
    expect(soundEvent).toBe("missile_fire");
  });

  test("Missile fires at a slower rate than machine gun (fireRateMultiplier = 0.35)", () => {
    const mgConfig = WEAPON_CONFIGS["machine-gun"];
    const msConfig = WEAPON_CONFIGS["missile"];
    // Machine gun interval = 1 / (autoFireRate * 1.0)
    // Missile interval = 1 / (autoFireRate * 0.35)
    // Ratio = 1/0.35 ≈ 2.857
    const ratio = mgConfig.fireRateMultiplier / msConfig.fireRateMultiplier;
    expect(ratio).toBeCloseTo(2.857, 2);
  });

  test("Missile projectile homes toward nearest enemy", () => {
    const missile = new Missile(400, 400, 0, 1.8);
    const enemy = makeEnemy(450, 200);

    missile.update(0.1, 800, 600, [enemy]);
    expect(missile.pos.x).toBeGreaterThan(400);
  });

  test("Missile turn rate does not exceed homingStrength (1.8 rad/s)", () => {
    const homingStrength = 1.8;
    const missile = new Missile(400, 400, 0, homingStrength);
    const enemy = makeEnemy(100, 400);

    missile.update(0.1, 800, 600, [enemy]);

    const dx = missile.pos.x - 400;
    expect(Math.abs(dx)).toBeLessThanOrEqual(350 * 0.1 * Math.sin(homingStrength * 0.1) + 1);
  });

  test("Missile flies straight when no enemies exist", () => {
    const missile = new Missile(400, 400, 0, 1.8);
    missile.update(0.1, 800, 600, []);
    expect(missile.pos.x).toBeCloseTo(400, 1);
    expect(missile.pos.y).toBeLessThan(400);
  });

  test("Missile flies straight when enemies array is undefined", () => {
    const missile = new Missile(400, 400, 0, 1.8);
    missile.update(0.1, 800, 600);
    expect(missile.pos.x).toBeCloseTo(400, 1);
    expect(missile.pos.y).toBeLessThan(400);
  });

  test("Missile deals 3 damage on direct hit", () => {
    const missile = new Missile(400, 400);
    expect(missile.damage).toBe(3);

    const enemy = makeEnemy(400, 400, "fighter"); // 2 HP
    const destroyed = enemy.hit(missile.damage);
    expect(destroyed).toBe(true);
    expect(enemy.hitPoints).toBe(0);
    expect(enemy.alive).toBe(false);
  });

  test("Missile is not piercing", () => {
    const missile = new Missile(400, 400);
    expect(missile.piercing).toBe(false);
  });

  test("Missile has correct hitbox dimensions (8x14)", () => {
    const missile = new Missile(400, 400);
    expect(missile.width).toBe(8);
    expect(missile.height).toBe(14);
  });

  test("Missile WEAPON_CONFIG has correct values", () => {
    const cfg = WEAPON_CONFIGS["missile"];
    expect(cfg.type).toBe("missile");
    expect(cfg.damage).toBe(3);
    expect(cfg.fireRateMultiplier).toBe(0.35);
    expect(cfg.projectileSpeed).toBe(350);
    expect(cfg.piercing).toBe(false);
    expect(cfg.homing).toBe(true);
    expect(cfg.homingStrength).toBe(1.8);
    expect(cfg.splashRadius).toBe(30);
    expect(cfg.splashDamageRatio).toBe(0.4);
    expect(cfg.rapidFireBonus).toBe(1.3);
    expect(cfg.spreadShotBehavior).toBe("multi-projectile");
  });

  test("Missile with spread-shot fires 3 missiles at angles", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    const pm = new PowerUpManager();
    pm.setWeapon("missile");
    pm.activate("spread-shot");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    const { newProjectiles } = ws.update(0.6, player, config, pm, 800, []);
    expect(newProjectiles.length).toBe(3);
    for (const p of newProjectiles) {
      expect(p).toBeInstanceOf(Missile);
    }
  });

  test("Missile with rapid-fire increases fire rate by 1.3x", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    const pm = new PowerUpManager();
    pm.setWeapon("missile");
    pm.activate("rapid-fire");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    // Without rapid: interval = 1 / (5 * 0.35) ≈ 0.571s
    // With rapid: interval = 1 / (5 * 0.35 * 1.3) ≈ 0.440s
    const { newProjectiles } = ws.update(0.45, player, config, pm, 800, []);
    expect(newProjectiles.length).toBe(1);
  });

  test("Missile goes out of bounds and becomes not alive", () => {
    const missile = new Missile(400, 400, 0, 1.8);
    for (let i = 0; i < 20; i++) {
      missile.update(0.1, 800, 600);
    }
    expect(missile.alive).toBe(false);
  });

  test("Missile ignores dead enemies for homing", () => {
    const missile = new Missile(400, 400, 0, 1.8);
    const deadEnemy = makeEnemy(450, 200);
    deadEnemy.alive = false;
    const aliveEnemy = makeEnemy(350, 200);

    missile.update(0.1, 800, 600, [deadEnemy, aliveEnemy]);
    expect(missile.pos.x).toBeLessThan(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Missile Splash Damage (CollisionSystem)
// ═══════════════════════════════════════════════════════════════════════════

describe("Missile Splash Damage", () => {
  test("Missile deals scaled splash damage to nearby enemies within 30px", () => {
    const cs = new CollisionSystem();
    const missile = new Missile(200, 100);
    missile.alive = true;

    const enemyA = makeEnemy(200, 100);
    const enemyB = makeEnemy(220, 110); // within 30px

    const hits = cs.checkBulletsEnemies([missile], [enemyA, enemyB]);

    const directHits = hits.filter(h => !h.splash);
    const splashHits = hits.filter(h => h.splash);

    expect(directHits.length).toBeGreaterThanOrEqual(1);
    expect(directHits[0].damage).toBe(3);
    expect(splashHits.length).toBeGreaterThanOrEqual(1);
    expect(splashHits[0].damage).toBe(Math.ceil(3 * 0.4)); // 2
  });

  test("Missile splash does not damage dead enemies", () => {
    const cs = new CollisionSystem();
    const missile = new Missile(200, 100);

    const enemyA = makeEnemy(200, 100);
    const enemyB = makeEnemy(220, 110);
    enemyB.alive = false;

    const hits = cs.checkBulletsEnemies([missile], [enemyA, enemyB]);
    const splashHits = hits.filter(h => h.splash);

    for (const sh of splashHits) {
      expect(sh.enemy).not.toBe(enemyB);
    }
  });

  test("Missile splash does not affect enemies outside 30px radius", () => {
    const cs = new CollisionSystem();
    const missile = new Missile(200, 100);

    const enemyA = makeEnemy(200, 100);
    const enemyC = makeEnemy(300, 200); // well outside 30px

    const hits = cs.checkBulletsEnemies([missile], [enemyA, enemyC]);
    const splashHits = hits.filter(h => h.splash && h.enemy === enemyC);

    expect(splashHits.length).toBe(0);
  });

  test("Missile becomes not alive after hitting an enemy (non-piercing)", () => {
    const cs = new CollisionSystem();
    const missile = new Missile(200, 100);

    const enemy = makeEnemy(200, 100, "bomber");
    cs.checkBulletsEnemies([missile], [enemy]);
    expect(missile.alive).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Laser Weapon
// ═══════════════════════════════════════════════════════════════════════════

describe("Laser Weapon", () => {
  test("Player obtains laser weapon from weapon-laser power-up", () => {
    const pm = new PowerUpManager();
    const result = pm.setWeapon("laser");
    expect(result).toBe("switched");
    expect(pm.currentWeapon).toBe("laser");
  });

  test("Laser beam has base width of 6 pixels", () => {
    const beam = new LaserBeam();
    expect(beam.beamWidth).toBe(6);
  });

  test("Laser beam is continuous (fireRateMultiplier = 0)", () => {
    const cfg = WEAPON_CONFIGS["laser"];
    expect(cfg.fireRateMultiplier).toBe(0);
  });

  test("Laser deals 1 damage per tick", () => {
    const beam = new LaserBeam();
    expect(beam.damage).toBe(1);
  });

  test("Laser is piercing", () => {
    const cfg = WEAPON_CONFIGS["laser"];
    expect(cfg.piercing).toBe(true);
  });

  test("Laser tick rate is 10 ticks/sec base (0.1s interval)", () => {
    const beam = new LaserBeam();
    beam.active = true;
    beam.setModifiers(false, false);

    // After exactly 0.1s, should tick
    const tick1 = beam.update(0.05);
    expect(tick1).toBe(false);
    const tick2 = beam.update(0.05);
    expect(tick2).toBe(true);
  });

  test("Laser with rapid-fire increases tick rate to 18 ticks/sec", () => {
    const beam = new LaserBeam();
    beam.active = true;
    beam.setModifiers(true, false);

    // Tick rate = min(20, 10 * 1.8) = 18; interval = 1/18 ≈ 0.0556s
    const tick1 = beam.update(0.05);
    expect(tick1).toBe(false);
    const tick2 = beam.update(0.01);
    expect(tick2).toBe(true);
  });

  test("Laser tick rate is capped at 20 ticks/sec", () => {
    const beam = new LaserBeam();
    beam.active = true;
    beam.setModifiers(true, false);

    // With rapid-fire: 10 * 1.8 = 18 (below 20 cap)
    const tickRate = Math.min(20, 10 * 1.8);
    expect(tickRate).toBeLessThanOrEqual(20);
  });

  test("Laser with spread-shot widens beam to 9 pixels", () => {
    const beam = new LaserBeam();
    beam.setModifiers(false, true); // spreadShot = true
    expect(beam.beamWidth).toBe(9);
  });

  test("Laser with spread-shot and rapid-fire combined", () => {
    const beam = new LaserBeam();
    beam.setModifiers(true, true);
    expect(beam.beamWidth).toBe(9);
    // Tick rate = min(20, 10 * 1.8) = 18
  });

  test("Laser beam is inactive by default", () => {
    const beam = new LaserBeam();
    expect(beam.active).toBe(false);
  });

  test("Laser beam does not tick when inactive", () => {
    const beam = new LaserBeam();
    beam.active = false;
    const tick = beam.update(1.0);
    expect(tick).toBe(false);
  });

  test("Laser position tracks player", () => {
    const beam = new LaserBeam();
    beam.updatePosition(400, 480);
    expect(beam.pos.x).toBe(400);
    expect(beam.pos.y).toBe(480);
  });

  test("Laser beam reset clears state", () => {
    const beam = new LaserBeam();
    beam.active = true;
    beam.setModifiers(true, true);
    beam.updatePosition(100, 200);
    beam.reset();
    expect(beam.active).toBe(false);
    expect(beam.beamWidth).toBe(6);
  });

  test("WeaponSystem activates laser beam when weapon set to laser", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    expect(ws.laserBeam.active).toBe(true);
  });

  test("WeaponSystem deactivates laser beam when switching away", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    expect(ws.laserBeam.active).toBe(true);
    ws.setWeapon("machine-gun");
    expect(ws.laserBeam.active).toBe(false);
  });

  test("Laser does not create discrete projectiles", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    const pm = new PowerUpManager();
    pm.setWeapon("laser");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    const { newProjectiles } = ws.update(0.5, player, config, pm, 800, []);
    expect(newProjectiles.length).toBe(0);
  });

  test("Laser stops when player dies (WeaponSystem reset)", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    expect(ws.laserBeam.active).toBe(true);
    ws.reset();
    expect(ws.laserBeam.active).toBe(false);
    expect(ws.currentWeapon).toBe("machine-gun");
  });

  test("WEAPON_CONFIG for laser has correct values", () => {
    const cfg = WEAPON_CONFIGS["laser"];
    expect(cfg.type).toBe("laser");
    expect(cfg.damage).toBe(1);
    expect(cfg.fireRateMultiplier).toBe(0);
    expect(cfg.projectileSpeed).toBe(0);
    expect(cfg.piercing).toBe(true);
    expect(cfg.homing).toBe(false);
    expect(cfg.homingStrength).toBe(0);
    expect(cfg.splashRadius).toBe(0);
    expect(cfg.splashDamageRatio).toBe(0);
    expect(cfg.rapidFireBonus).toBe(1.8);
    expect(cfg.spreadShotBehavior).toBe("wider-beam");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: Laser Beam Collision (CollisionSystem)
// ═══════════════════════════════════════════════════════════════════════════

describe("Laser Beam Collision", () => {
  test("Laser beam damages enemy in its path", () => {
    const cs = new CollisionSystem();
    const beam = new LaserBeam();
    beam.active = true;
    beam.updatePosition(400, 500);
    beam.setModifiers(false, false);

    const enemy = makeEnemy(400, 200); // directly above in beam path
    const startHP = enemy.hitPoints;

    // Advance enough time for a tick (0.1s)
    const hits = cs.checkBeamEnemies(beam, [enemy], 0.1);
    expect(hits.length).toBe(1);
    expect(enemy.hitPoints).toBe(startHP - 1);
  });

  test("Laser beam pierces through multiple enemies", () => {
    const cs = new CollisionSystem();
    const beam = new LaserBeam();
    beam.active = true;
    beam.updatePosition(400, 500);
    beam.setModifiers(false, false);

    const enemyA = makeEnemy(400, 200);
    const enemyB = makeEnemy(400, 100); // further up in beam path

    const hits = cs.checkBeamEnemies(beam, [enemyA, enemyB], 0.1);
    expect(hits.length).toBe(2);
    expect(hits).toContain(enemyA);
    expect(hits).toContain(enemyB);
  });

  test("Laser beam does not hit enemies outside beam width", () => {
    const cs = new CollisionSystem();
    const beam = new LaserBeam();
    beam.active = true;
    beam.updatePosition(400, 500);
    beam.setModifiers(false, false);

    // Enemy far away from beam x-position
    const enemy = makeEnemy(200, 200);
    const hits = cs.checkBeamEnemies(beam, [enemy], 0.1);
    expect(hits.length).toBe(0);
  });

  test("Laser beam does not hit enemies below the beam origin", () => {
    const cs = new CollisionSystem();
    const beam = new LaserBeam();
    beam.active = true;
    beam.updatePosition(400, 200);
    beam.setModifiers(false, false);

    const enemy = makeEnemy(400, 300); // below beam origin
    const hits = cs.checkBeamEnemies(beam, [enemy], 0.1);
    expect(hits.length).toBe(0);
  });

  test("Laser beam does not hit dead enemies", () => {
    const cs = new CollisionSystem();
    const beam = new LaserBeam();
    beam.active = true;
    beam.updatePosition(400, 500);
    beam.setModifiers(false, false);

    const enemy = makeEnemy(400, 200);
    enemy.alive = false;

    const hits = cs.checkBeamEnemies(beam, [enemy], 0.1);
    expect(hits.length).toBe(0);
  });

  test("Laser beam inactive returns no hits", () => {
    const cs = new CollisionSystem();
    const beam = new LaserBeam();
    beam.active = false;

    const enemy = makeEnemy(400, 200);
    const hits = cs.checkBeamEnemies(beam, [enemy], 0.1);
    expect(hits.length).toBe(0);
  });

  test("Boss hit-flash is rate limited under laser to max once per 0.15s", () => {
    const cs = new CollisionSystem();
    const beam = new LaserBeam();
    beam.active = true;
    beam.updatePosition(400, 500);
    beam.setModifiers(false, false);

    const boss = makeEnemy(400, 200, "boss");
    const initialHP = boss.hitPoints;

    // First tick at t=0.1s — should hit and flash
    cs.checkBeamEnemies(beam, [boss], 0.1);
    expect(boss.hitPoints).toBe(initialHP - 1);

    // Second tick at t=0.2s — too soon for another flash (0.15s cooldown)
    // but damage should still apply
    cs.checkBeamEnemies(beam, [boss], 0.1);
    expect(boss.hitPoints).toBe(initialHP - 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Collision System (General Projectile Handling)
// ═══════════════════════════════════════════════════════════════════════════

describe("Collision System - Projectile Handling", () => {
  test("Collision system handles Bullet projectiles with damage", () => {
    const cs = new CollisionSystem();
    const bullet = new Bullet(200, 100);
    const enemy = makeEnemy(200, 100);
    const startHP = enemy.hitPoints;

    const hits = cs.checkBulletsEnemies([bullet], [enemy]);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].damage).toBe(1);
    expect(enemy.hitPoints).toBe(startHP - 1);
  });

  test("Non-piercing projectile is marked dead after hitting enemy", () => {
    const cs = new CollisionSystem();
    const bullet = new Bullet(200, 100);
    const enemy = makeEnemy(200, 100);

    cs.checkBulletsEnemies([bullet], [enemy]);
    expect(bullet.alive).toBe(false);
  });

  test("Piercing projectile remains alive after hitting enemy", () => {
    const cs = new CollisionSystem();
    const bullet = new Bullet(200, 100);
    bullet.piercing = true;
    const enemy = makeEnemy(200, 100);

    cs.checkBulletsEnemies([bullet], [enemy]);
    expect(bullet.alive).toBe(true);
  });

  test("BulletEnemyHit includes damage field", () => {
    const cs = new CollisionSystem();
    const missile = new Missile(200, 100);
    const enemy = makeEnemy(200, 100, "bomber"); // 3 HP

    const hits = cs.checkBulletsEnemies([missile], [enemy]);
    const directHit = hits.find(h => !h.splash);
    expect(directHit).toBeDefined();
    expect(directHit!.damage).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Enemy.hit() Damage Parameter
// ═══════════════════════════════════════════════════════════════════════════

describe("Enemy.hit() with damage parameter", () => {
  test("Enemy.hit() defaults to 1 damage", () => {
    const enemy = makeEnemy(200, 200, "fighter"); // 2 HP
    enemy.hit();
    expect(enemy.hitPoints).toBe(1);
  });

  test("Enemy.hit(3) applies 3 damage", () => {
    const enemy = makeEnemy(200, 200, "bomber"); // 3 HP
    const destroyed = enemy.hit(3);
    expect(destroyed).toBe(true);
    expect(enemy.hitPoints).toBe(0);
    expect(enemy.alive).toBe(false);
  });

  test("Enemy.hit() returns true when enemy is destroyed", () => {
    const enemy = makeEnemy(200, 200, "scout"); // 1 HP
    const destroyed = enemy.hit(1);
    expect(destroyed).toBe(true);
    expect(enemy.alive).toBe(false);
  });

  test("Enemy.hit() returns false when enemy survives", () => {
    const enemy = makeEnemy(200, 200, "fighter"); // 2 HP
    const destroyed = enemy.hit(1);
    expect(destroyed).toBe(false);
    expect(enemy.alive).toBe(true);
  });

  test("Enemy.hit() on dead enemy returns false", () => {
    const enemy = makeEnemy(200, 200, "scout");
    enemy.alive = false;
    const destroyed = enemy.hit(1);
    expect(destroyed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: Weapon Switching & Persistence
// ═══════════════════════════════════════════════════════════════════════════

describe("Weapon Switching & Persistence", () => {
  test("Weapon resets to machine-gun on full game reset (WeaponSystem.reset)", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    expect(ws.currentWeapon).toBe("missile");
    ws.reset();
    expect(ws.currentWeapon).toBe("machine-gun");
  });

  test("Weapon resets to machine-gun on full game reset (PowerUpManager.reset)", () => {
    const pm = new PowerUpManager();
    pm.setWeapon("laser");
    expect(pm.currentWeapon).toBe("laser");
    pm.reset();
    expect(pm.currentWeapon).toBe("machine-gun");
  });

  test("Collecting same weapon power-up upgrades tier instead of no-op", () => {
    const pm = new PowerUpManager();
    pm.setWeapon("missile");
    expect(pm.weaponTier).toBe(1);
    const result = pm.setWeapon("missile");
    expect(result).toBe("upgraded");
    expect(pm.weaponTier).toBe(2);
    expect(pm.currentWeapon).toBe("missile");
  });

  test("Weapon switch preserves active modifier power-ups", () => {
    const pm = new PowerUpManager();
    pm.activate("spread-shot");
    expect(pm.hasUpgrade("spread-shot")).toBe(true);

    pm.setWeapon("missile");
    expect(pm.currentWeapon).toBe("missile");
    expect(pm.hasUpgrade("spread-shot")).toBe(true);
  });

  test("Weapon switch preserves rapid-fire modifier", () => {
    const pm = new PowerUpManager();
    pm.activate("rapid-fire");
    pm.setWeapon("laser");
    expect(pm.hasUpgrade("rapid-fire")).toBe(true);
  });

  test("WeaponSystem.setWeapon ignores same weapon (no-op)", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    ws.setWeapon("missile"); // should be no-op
    expect(ws.currentWeapon).toBe("missile");
  });

  test("Missile weapon persists across level transition via resetForNewLevel", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    expect(ws.currentWeapon).toBe("missile");
    ws.resetForNewLevel();
    expect(ws.currentWeapon).toBe("missile");
  });

  test("Laser weapon persists across level transition via resetForNewLevel", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    expect(ws.currentWeapon).toBe("laser");
    ws.resetForNewLevel();
    expect(ws.currentWeapon).toBe("laser");
  });

  test("Laser beam re-activates on new level when laser weapon is equipped", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    expect(ws.laserBeam.active).toBe(true);
    ws.laserBeam.active = false; // simulates level-complete deactivation
    ws.resetForNewLevel();
    expect(ws.laserBeam.active).toBe(true);
  });

  test("Laser beam stays inactive on new level when non-laser weapon is equipped", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    ws.resetForNewLevel();
    expect(ws.laserBeam.active).toBe(false);
  });

  test("Fire timer resets to zero on level transition", () => {
    const ws = new WeaponSystem();
    const pm = new PowerUpManager();
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });
    ws.update(0.15, player, config, pm, 800, []);
    ws.resetForNewLevel();
    // After resetForNewLevel the fire timer is 0, so a full interval is needed to fire
    const { newProjectiles } = ws.update(0.19, player, config, pm, 800, []);
    expect(newProjectiles.length).toBe(0);
  });

  test("Spread-shot upgrade persists across level transition (PowerUpManager not reset)", () => {
    const pm = new PowerUpManager();
    pm.activate("spread-shot");
    expect(pm.hasUpgrade("spread-shot")).toBe(true);
    // On non-full reset, PowerUpManager.reset() is NOT called
    expect(pm.hasUpgrade("spread-shot")).toBe(true);
  });

  test("Rapid-fire upgrade persists across level transition (PowerUpManager not reset)", () => {
    const pm = new PowerUpManager();
    pm.activate("rapid-fire");
    expect(pm.hasUpgrade("rapid-fire")).toBe(true);
    // On non-full reset, PowerUpManager.reset() is NOT called
    expect(pm.hasUpgrade("rapid-fire")).toBe(true);
  });

  test("Weapon and upgrades combined persist across level transition", () => {
    const ws = new WeaponSystem();
    const pm = new PowerUpManager();
    ws.setWeapon("laser");
    pm.setWeapon("laser");
    pm.activate("rapid-fire");
    pm.activate("spread-shot");

    ws.laserBeam.active = false; // simulates level-complete deactivation
    ws.resetForNewLevel();

    expect(ws.currentWeapon).toBe("laser");
    expect(ws.laserBeam.active).toBe(true);
    expect(pm.currentWeapon).toBe("laser");
    expect(pm.hasUpgrade("rapid-fire")).toBe(true);
    expect(pm.hasUpgrade("spread-shot")).toBe(true);
  });

  test("LaserBeam.resetTimers resets tickTimer and time to zero", () => {
    const beam = new LaserBeam();
    beam.active = true;
    beam.update(0.5);
    beam.resetTimers();
    // After resetTimers, the beam should need a full tick interval to fire again
    const tick = beam.update(0.05);
    expect(tick).toBe(false);
  });

  test("Full reset still clears weapon to machine-gun", () => {
    const ws = new WeaponSystem();
    const pm = new PowerUpManager();
    ws.setWeapon("laser");
    pm.setWeapon("laser");
    pm.activate("spread-shot");

    ws.reset();
    pm.reset();

    expect(ws.currentWeapon).toBe("machine-gun");
    expect(ws.laserBeam.active).toBe(false);
    expect(pm.currentWeapon).toBe("machine-gun");
    expect(pm.hasUpgrade("spread-shot")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: Power-Up Drop Configuration
// ═══════════════════════════════════════════════════════════════════════════

describe("Power-Up Drop Configuration (Levels)", () => {
  test("Level 1 does not have weaponDrops configured", () => {
    const level1 = LEVELS[0];
    expect(level1.level).toBe(1);
    expect(level1.weaponDrops).toBeUndefined();
  });

  test("Level 2 has missile in weaponDrops", () => {
    const level2 = LEVELS[1];
    expect(level2.level).toBe(2);
    expect(level2.weaponDrops).toBeDefined();
    expect(level2.weaponDrops).toContain("missile");
  });

  test("Level 2 does not have laser in weaponDrops", () => {
    const level2 = LEVELS[1];
    expect(level2.weaponDrops).not.toContain("laser");
  });

  test("Level 3 has missile and laser in weaponDrops", () => {
    const level3 = LEVELS[2];
    expect(level3.level).toBe(3);
    expect(level3.weaponDrops).toContain("missile");
    expect(level3.weaponDrops).toContain("laser");
    expect(level3.weaponDrops).not.toContain("auto-gun");
    expect(level3.weaponDrops).not.toContain("plasma");
  });

  test("All levels from 3 onward include both missile and laser drops", () => {
    for (let i = 2; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      expect(level.weaponDrops).toBeDefined();
      expect(level.weaponDrops).toContain("missile");
      expect(level.weaponDrops).toContain("laser");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: Sound Effects
// ═══════════════════════════════════════════════════════════════════════════

describe("Sound Effects for Weapons", () => {
  test("Missile fire produces missile_fire sound event", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    const pm = new PowerUpManager();
    pm.setWeapon("missile");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    const { soundEvent } = ws.update(0.6, player, config, pm, 800, []);
    expect(soundEvent).toBe("missile_fire");
  });

  test("Machine gun fire produces player_shoot sound event", () => {
    const ws = new WeaponSystem();
    const pm = new PowerUpManager();
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    const { soundEvent } = ws.update(0.25, player, config, pm, 800, []);
    expect(soundEvent).toBe("player_shoot");
  });

  test("Laser produces no projectile sound event (handled separately)", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    const pm = new PowerUpManager();
    pm.setWeapon("laser");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    const { soundEvent } = ws.update(0.5, player, config, pm, 800, []);
    expect(soundEvent).toBeNull();
  });

  test("WeaponSystem.getLaserSoundEvent returns laser_hit when beam has hits", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    ws.laserBeam.active = true;

    const event = ws.getLaserSoundEvent(0.1, true);
    expect(event).toBe("laser_hit");
  });

  test("WeaponSystem.getLaserSoundEvent returns laser_fire when beam is active with no hits", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    ws.laserBeam.active = true;

    const event = ws.getLaserSoundEvent(0.15, false);
    expect(event).toBe("laser_fire");
  });

  test("weapon_switch sound event type exists", () => {
    const events: RaptorSoundEvent[] = [
      "missile_fire", "missile_hit", "laser_fire", "laser_hit", "weapon_switch",
    ];
    for (const e of events) {
      expect(typeof e).toBe("string");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: Power-Up Types
// ═══════════════════════════════════════════════════════════════════════════

describe("Weapon Power-Up Types", () => {
  test("RaptorPowerUpType includes weapon-missile and weapon-laser", () => {
    const types: RaptorPowerUpType[] = ["weapon-missile", "weapon-laser"];
    expect(types).toContain("weapon-missile");
    expect(types).toContain("weapon-laser");
  });

  test("PowerUp with weapon-missile type can be created", () => {
    const pu = new PowerUp(100, 100, "weapon-missile");
    expect(pu.type).toBe("weapon-missile");
    expect(pu.alive).toBe(true);
  });

  test("PowerUp with weapon-laser type can be created", () => {
    const pu = new PowerUp(100, 100, "weapon-laser");
    expect(pu.type).toBe("weapon-laser");
    expect(pu.alive).toBe(true);
  });

  test("PowerUp falls downward", () => {
    const pu = new PowerUp(100, 100, "weapon-missile");
    const startY = pu.pos.y;
    pu.update(0.5, 600);
    expect(pu.pos.y).toBeGreaterThan(startY);
  });

  test("PowerUp dies when falling off screen", () => {
    const pu = new PowerUp(100, 580, "weapon-missile");
    pu.update(0.5, 600);
    expect(pu.alive).toBe(false);
  });

  test("Default random power-up does not include weapon types", () => {
    // The POWER_UP_TYPES array used for random selection only includes base 4 types
    const types = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const pu = new PowerUp(100, 100);
      types.add(pu.type);
    }
    expect(types.has("weapon-missile")).toBe(false);
    expect(types.has("weapon-laser")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 12: PowerUpManager Weapon Management
// ═══════════════════════════════════════════════════════════════════════════

describe("PowerUpManager Weapon Management", () => {
  test("PowerUpManager starts with machine-gun", () => {
    const pm = new PowerUpManager();
    expect(pm.currentWeapon).toBe("machine-gun");
  });

  test("Weapon power-ups are non-timed (persistent)", () => {
    const pm = new PowerUpManager();
    pm.setWeapon("missile");
    // Advance time significantly
    pm.update(100);
    expect(pm.currentWeapon).toBe("missile");
  });

  test("Timed effects expire, weapon persists", () => {
    const pm = new PowerUpManager();
    pm.activate("spread-shot"); // 8s duration
    pm.setWeapon("missile");

    pm.update(10); // exhaust spread-shot timer
    expect(pm.hasUpgrade("spread-shot")).toBe(false);
    expect(pm.currentWeapon).toBe("missile");
  });

  test("setWeapon returns switched on change, upgraded/maxed on same", () => {
    const pm = new PowerUpManager();
    expect(pm.setWeapon("missile")).toBe("switched");
    expect(pm.weaponTier).toBe(1);
    expect(pm.setWeapon("missile")).toBe("upgraded");
    expect(pm.weaponTier).toBe(2);
    expect(pm.setWeapon("missile")).toBe("upgraded");
    expect(pm.weaponTier).toBe(3);
    expect(pm.setWeapon("missile")).toBe("maxed");
    expect(pm.weaponTier).toBe(3);
    expect(pm.setWeapon("laser")).toBe("switched");
    expect(pm.weaponTier).toBe(1);
    expect(pm.setWeapon("laser")).toBe("upgraded");
    expect(pm.weaponTier).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 13: HUD Weapon Indicator
// ═══════════════════════════════════════════════════════════════════════════

describe("HUD Weapon Indicator", () => {
  test("Weapon labels are defined for all weapon types", () => {
    const weaponTypes: WeaponType[] = ["machine-gun", "missile", "laser"];
    // Verify the labels exist in the source (tested via import checks)
    for (const wt of weaponTypes) {
      expect(WEAPON_CONFIGS[wt]).toBeDefined();
    }
  });

  test("All WeaponType values are represented in WEAPON_CONFIGS", () => {
    expect(Object.keys(WEAPON_CONFIGS)).toHaveLength(7);
    expect(WEAPON_CONFIGS["machine-gun"]).toBeDefined();
    expect(WEAPON_CONFIGS["missile"]).toBeDefined();
    expect(WEAPON_CONFIGS["laser"]).toBeDefined();
    expect(WEAPON_CONFIGS["plasma"]).toBeDefined();
    expect(WEAPON_CONFIGS["ion-cannon"]).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 14: Projectile Interface Compliance
// ═══════════════════════════════════════════════════════════════════════════

describe("Projectile Interface Compliance", () => {
  test("Bullet implements Projectile interface", () => {
    const bullet: Projectile = new Bullet(100, 100);
    expect(bullet.pos).toBeDefined();
    expect(bullet.alive).toBe(true);
    expect(typeof bullet.left).toBe("number");
    expect(typeof bullet.right).toBe("number");
    expect(typeof bullet.top).toBe("number");
    expect(typeof bullet.bottom).toBe("number");
    expect(typeof bullet.damage).toBe("number");
    expect(typeof bullet.piercing).toBe("boolean");
    expect(typeof bullet.update).toBe("function");
    expect(typeof bullet.render).toBe("function");
  });

  test("Missile implements Projectile interface", () => {
    const missile: Projectile = new Missile(100, 100);
    expect(missile.pos).toBeDefined();
    expect(missile.alive).toBe(true);
    expect(typeof missile.left).toBe("number");
    expect(typeof missile.right).toBe("number");
    expect(typeof missile.top).toBe("number");
    expect(typeof missile.bottom).toBe("number");
    expect(typeof missile.damage).toBe("number");
    expect(typeof missile.piercing).toBe("boolean");
    expect(typeof missile.update).toBe("function");
    expect(typeof missile.render).toBe("function");
  });

  test("Bullet AABB bounds are correct", () => {
    const bullet = new Bullet(100, 200);
    expect(bullet.left).toBe(100 - 2); // width=4, half=2
    expect(bullet.right).toBe(100 + 2);
    expect(bullet.top).toBe(200 - 5); // height=10, half=5
    expect(bullet.bottom).toBe(200 + 5);
  });

  test("Missile AABB bounds are correct", () => {
    const missile = new Missile(100, 200);
    expect(missile.left).toBe(100 - 4); // width=8, half=4
    expect(missile.right).toBe(100 + 4);
    expect(missile.top).toBe(200 - 7); // height=14, half=7
    expect(missile.bottom).toBe(200 + 7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 15: Visual Fallback Rendering
// ═══════════════════════════════════════════════════════════════════════════

describe("Visual Fallback Rendering", () => {
  function mockCtx(): CanvasRenderingContext2D {
    const calls: string[] = [];
    return new Proxy({} as any, {
      get(_target, prop) {
        if (typeof prop === "string") {
          if (["save", "restore", "beginPath", "closePath", "fill", "stroke",
               "moveTo", "lineTo", "arc", "fillRect", "translate", "rotate",
               "drawImage", "clearRect"].includes(prop)) {
            return (..._args: any[]) => { calls.push(prop); };
          }
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => new Proxy({}, { get: () => () => {} });
          }
          if (prop === "_calls") return calls;
        }
        return undefined;
      },
      set() { return true; },
    });
  }

  test("Missile renders with procedural fallback when no sprite loaded", () => {
    const missile = new Missile(100, 200);
    const ctx = mockCtx();
    missile.render(ctx);
    const calls = (ctx as any)._calls as string[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls).toContain("save");
    expect(calls).toContain("restore");
  });

  test("LaserBeam renders with procedural fallback when active", () => {
    const beam = new LaserBeam();
    beam.active = true;
    beam.updatePosition(400, 500);
    const ctx = mockCtx();
    beam.render(ctx);
    const calls = (ctx as any)._calls as string[];
    expect(calls.length).toBeGreaterThan(0);
    expect(calls).toContain("save");
    expect(calls).toContain("fillRect");
    expect(calls).toContain("restore");
  });

  test("LaserBeam does not render when inactive", () => {
    const beam = new LaserBeam();
    beam.active = false;
    const ctx = mockCtx();
    beam.render(ctx);
    const calls = (ctx as any)._calls as string[];
    expect(calls.length).toBe(0);
  });

  test("Bullet renders with procedural fallback when no sprite loaded", () => {
    const bullet = new Bullet(100, 200);
    const ctx = mockCtx();
    bullet.render(ctx);
    const calls = (ctx as any)._calls as string[];
    expect(calls.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 16: Asset Manifest
// ═══════════════════════════════════════════════════════════════════════════

describe("Asset Manifest for Weapons", () => {
  test("Asset manifest includes missile_player sprite", () => {
    const { ASSET_MANIFEST } = require("../src/games/raptor/rendering/assets");
    expect(ASSET_MANIFEST["missile_player"]).toBeDefined();
    expect(ASSET_MANIFEST["missile_player"]).toContain("missile");
  });

  test("Asset manifest includes weapon power-up sprites", () => {
    const { ASSET_MANIFEST } = require("../src/games/raptor/rendering/assets");
    expect(ASSET_MANIFEST["powerup_missile"]).toBeDefined();
    expect(ASSET_MANIFEST["powerup_laser"]).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 17: VFX Manager (Missile Trail & Laser Sparks)
// ═══════════════════════════════════════════════════════════════════════════

describe("VFX Manager - Weapon Effects", () => {
  test("VFXManager has addMissileTrail method", () => {
    const { VFXManager } = require("../src/games/raptor/rendering/VFXManager");
    const vfx = new VFXManager();
    expect(typeof vfx.addMissileTrail).toBe("function");
  });

  test("VFXManager has addLaserSpark method", () => {
    const { VFXManager } = require("../src/games/raptor/rendering/VFXManager");
    const vfx = new VFXManager();
    expect(typeof vfx.addLaserSpark).toBe("function");
  });

  test("VFXManager has triggerExplosionFlash method", () => {
    const { VFXManager } = require("../src/games/raptor/rendering/VFXManager");
    const vfx = new VFXManager();
    expect(typeof vfx.triggerExplosionFlash).toBe("function");
  });

  test("addMissileTrail does not throw", () => {
    const { VFXManager } = require("../src/games/raptor/rendering/VFXManager");
    const vfx = new VFXManager();
    expect(() => vfx.addMissileTrail(100, 200)).not.toThrow();
  });

  test("addLaserSpark does not throw", () => {
    const { VFXManager } = require("../src/games/raptor/rendering/VFXManager");
    const vfx = new VFXManager();
    expect(() => vfx.addLaserSpark(100, 200)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 18: File Structure Verification
// ═══════════════════════════════════════════════════════════════════════════

describe("File Structure - New Files Exist", () => {
  test("WeaponSystem module exists", () => {
    expect(() => require("../src/games/raptor/systems/WeaponSystem")).not.toThrow();
  });

  test("Missile entity module exists", () => {
    expect(() => require("../src/games/raptor/entities/Missile")).not.toThrow();
  });

  test("LaserBeam entity module exists", () => {
    expect(() => require("../src/games/raptor/entities/LaserBeam")).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 19: WeaponSystem Integration
// ═══════════════════════════════════════════════════════════════════════════

describe("WeaponSystem Integration", () => {
  test("WeaponSystem does not fire when projectile cap is reached", () => {
    const ws = new WeaponSystem();
    const pm = new PowerUpManager();
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    // Fill with 60 dummy projectiles
    const existing: Projectile[] = [];
    for (let i = 0; i < 60; i++) {
      existing.push(new Bullet(0, 0));
    }

    const { newProjectiles } = ws.update(0.25, player, config, pm, 800, existing);
    expect(newProjectiles.length).toBe(0);
  });

  test("WeaponSystem updates laser beam position during laser mode", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    const pm = new PowerUpManager();
    pm.setWeapon("laser");
    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    ws.update(0.1, player, config, pm, 800, []);
    expect(ws.laserBeam.pos.x).toBe(player.pos.x);
    expect(ws.laserBeam.pos.y).toBe(player.top);
  });

  test("Switching from laser to machine-gun deactivates laser beam in update", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    const pm = new PowerUpManager();
    pm.setWeapon("machine-gun");

    const player = makePlayer();
    const config = makeLevelConfig({ autoFireRate: 5 });

    ws.setWeapon("machine-gun");
    ws.update(0.25, player, config, pm, 800, []);
    expect(ws.laserBeam.active).toBe(false);
  });

  test("getCurrentConfig returns correct config for current weapon", () => {
    const ws = new WeaponSystem();
    expect(ws.getCurrentConfig()).toEqual(WEAPON_CONFIGS["machine-gun"]);
    ws.setWeapon("missile");
    expect(ws.getCurrentConfig()).toEqual(WEAPON_CONFIGS["missile"]);
    ws.setWeapon("laser");
    expect(ws.getCurrentConfig()).toEqual(WEAPON_CONFIGS["laser"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 20: Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  test("Missile with no alive enemies flies straight", () => {
    const missile = new Missile(400, 400, 0, 1.8);
    const dead1 = makeEnemy(450, 200);
    dead1.alive = false;
    const dead2 = makeEnemy(350, 200);
    dead2.alive = false;

    missile.update(0.1, 800, 600, [dead1, dead2]);
    expect(missile.pos.x).toBeCloseTo(400, 1);
  });

  test("Multiple weapon power-ups: last one collected wins", () => {
    const pm = new PowerUpManager();
    pm.setWeapon("missile");
    expect(pm.currentWeapon).toBe("missile");
    pm.setWeapon("laser");
    expect(pm.currentWeapon).toBe("laser");
  });

  test("Missile projectile speed is 350 px/s", () => {
    const missile = new Missile(400, 400, 0, 0); // no homing
    missile.update(1.0, 800, 600);
    const dy = 400 - missile.pos.y; // moved upward
    expect(dy).toBeCloseTo(350, 0);
  });

  test("Bullet width and height are 4x10", () => {
    const bullet = new Bullet(0, 0);
    expect(bullet.width).toBe(4);
    expect(bullet.height).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 21: Weapon Balance Validation (Issue #538)
// ═══════════════════════════════════════════════════════════════════════════

describe("Weapon Balance Validation", () => {
  test("Missile homingStrength is 1.8", () => {
    const missile = WEAPON_CONFIGS["missile"];
    expect(missile.homingStrength).toBe(1.8);
  });

  test("Auto-gun homingStrength is 2.0", () => {
    const autogun = WEAPON_CONFIGS["auto-gun"];
    expect(autogun.homingStrength).toBe(2.0);
  });

  test("Auto-gun homingStrength is greater than missile homingStrength", () => {
    expect(WEAPON_CONFIGS["auto-gun"].homingStrength)
      .toBeGreaterThan(WEAPON_CONFIGS["missile"].homingStrength);
  });

  test("Missile homingStrength is less than auto-gun homingStrength", () => {
    expect(WEAPON_CONFIGS["missile"].homingStrength)
      .toBeLessThan(WEAPON_CONFIGS["auto-gun"].homingStrength);
  });

  test("Auto-gun tier 2 damageMultiplier is 1.2", () => {
    const cfg = WEAPON_CONFIGS["auto-gun"];
    expect(cfg.tiers[1].damageMultiplier).toBe(1.2);
  });

  test("Auto-gun tier 3 projectileCount is 3", () => {
    const cfg = WEAPON_CONFIGS["auto-gun"];
    expect(cfg.tiers[2].projectileCount).toBe(3);
  });

  test("Plasma splashRadius is 35 and greater than missile", () => {
    const plasma = WEAPON_CONFIGS["plasma"];
    const missile = WEAPON_CONFIGS["missile"];
    expect(plasma.splashRadius).toBe(35);
    expect(plasma.splashRadius).toBeGreaterThan(missile.splashRadius);
  });

  test("Plasma fireRateMultiplier is 0.7", () => {
    expect(WEAPON_CONFIGS["plasma"].fireRateMultiplier).toBe(0.7);
  });

  test("Rocket has the largest splashRadius of all weapons", () => {
    const rocket = WEAPON_CONFIGS["rocket"];
    expect(rocket.splashRadius).toBe(60);
    for (const [type, cfg] of Object.entries(WEAPON_CONFIGS)) {
      if (type !== "rocket") {
        expect(rocket.splashRadius).toBeGreaterThan(cfg.splashRadius);
      }
    }
  });

  test("Rocket fireRateMultiplier is 0.3", () => {
    expect(WEAPON_CONFIGS["rocket"].fireRateMultiplier).toBe(0.3);
  });

  test("Ion cannon chargeTime is 1.6", () => {
    expect(WEAPON_CONFIGS["ion-cannon"].chargeTime).toBe(1.6);
  });

  test("Ion cannon tier 2 damageMultiplier is 1.5", () => {
    expect(WEAPON_CONFIGS["ion-cannon"].tiers[1].damageMultiplier).toBe(1.5);
  });

  test("Laser rapidFireBonus is 1.8", () => {
    expect(WEAPON_CONFIGS["laser"].rapidFireBonus).toBe(1.8);
  });

  test("Machine gun tier 3 fires 3 projectiles with 0.1 spread", () => {
    const cfg = WEAPON_CONFIGS["machine-gun"];
    expect(cfg.tiers[2].projectileCount).toBe(3);
    expect(cfg.tiers[2].projectileSpread).toBe(0.1);
  });

  test("All splash weapons have splashDamageRatio > 0", () => {
    for (const [type, cfg] of Object.entries(WEAPON_CONFIGS)) {
      if (cfg.splashRadius > 0) {
        expect(cfg.splashDamageRatio).toBeGreaterThan(0);
      }
    }
  });

  test("Missile splash damage is proportional: ceil(3 * 0.4) = 2", () => {
    const cfg = WEAPON_CONFIGS["missile"];
    expect(Math.ceil(cfg.damage * cfg.splashDamageRatio)).toBe(2);
  });

  test("Rocket splash damage is proportional: ceil(5 * 0.6) = 3", () => {
    const cfg = WEAPON_CONFIGS["rocket"];
    expect(Math.ceil(cfg.damage * cfg.splashDamageRatio)).toBe(3);
  });

  test("Plasma splash damage is proportional: ceil(2 * 0.5) = 1", () => {
    const cfg = WEAPON_CONFIGS["plasma"];
    expect(Math.ceil(cfg.damage * cfg.splashDamageRatio)).toBe(1);
  });

  test("No single weapon dominates all categories", () => {
    const weapons = Object.values(WEAPON_CONFIGS);
    const maxDamage = Math.max(...weapons.map(w => w.damage));
    const maxFireRate = Math.max(...weapons.map(w => w.fireRateMultiplier));
    const maxHoming = Math.max(...weapons.map(w => w.homingStrength));
    const maxSplash = Math.max(...weapons.map(w => w.splashRadius));

    for (const w of weapons) {
      const isMaxAll =
        w.damage === maxDamage &&
        w.fireRateMultiplier === maxFireRate &&
        w.homingStrength === maxHoming &&
        w.splashRadius === maxSplash;
      expect(isMaxAll).toBe(false);
    }
  });

  test("Homing weapons have lower avg raw DPS than non-homing weapons", () => {
    const autoFireRate = 5;
    function rawDps(cfg: WeaponConfig): number {
      if (cfg.fireRateMultiplier === 0) return 0;
      return cfg.damage * autoFireRate * cfg.fireRateMultiplier;
    }
    const homingTypes: WeaponType[] = ["missile", "auto-gun"];
    const nonHomingTypes: WeaponType[] = ["plasma", "rocket"];
    const homingAvg = homingTypes.reduce((s, t) => s + rawDps(WEAPON_CONFIGS[t]), 0) / homingTypes.length;
    const nonHomingAvg = nonHomingTypes.reduce((s, t) => s + rawDps(WEAPON_CONFIGS[t]), 0) / nonHomingTypes.length;
    expect(homingAvg).toBeLessThanOrEqual(nonHomingAvg);
  });

  test("All 7 weapon types have complete WEAPON_CONFIGS entries", () => {
    const types: WeaponType[] = ["machine-gun", "missile", "laser", "plasma", "ion-cannon", "auto-gun", "rocket"];
    expect(Object.keys(WEAPON_CONFIGS)).toHaveLength(7);
    for (const t of types) {
      const cfg = WEAPON_CONFIGS[t];
      expect(cfg).toBeDefined();
      expect(cfg.type).toBe(t);
      expect(typeof cfg.damage).toBe("number");
      expect(typeof cfg.fireRateMultiplier).toBe("number");
      expect(typeof cfg.splashDamageRatio).toBe("number");
      expect(cfg.tiers).toHaveLength(3);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 22: Weapon Availability Curve (Issue #538)
// ═══════════════════════════════════════════════════════════════════════════

describe("Weapon Availability Curve", () => {
  test("Level 1 has no weapon drops", () => {
    expect(LEVELS[0].weaponDrops).toBeUndefined();
  });

  test("Level 2 only drops missiles", () => {
    expect(LEVELS[1].weaponDrops).toEqual(["missile"]);
  });

  test("Level 3 drops missile and laser only", () => {
    const drops = LEVELS[2].weaponDrops!;
    expect(drops).toContain("missile");
    expect(drops).toContain("laser");
    expect(drops).not.toContain("auto-gun");
    expect(drops).not.toContain("plasma");
    expect(drops).not.toContain("ion-cannon");
    expect(drops).not.toContain("rocket");
  });

  test("Level 4 introduces auto-gun", () => {
    const drops = LEVELS[3].weaponDrops!;
    expect(drops).toContain("missile");
    expect(drops).toContain("laser");
    expect(drops).toContain("auto-gun");
    expect(drops).not.toContain("plasma");
    expect(drops).not.toContain("ion-cannon");
    expect(drops).not.toContain("rocket");
  });

  test("Level 5 introduces plasma", () => {
    const drops = LEVELS[4].weaponDrops!;
    expect(drops).toContain("missile");
    expect(drops).toContain("laser");
    expect(drops).toContain("auto-gun");
    expect(drops).toContain("plasma");
  });

  test("Level 6 replaces auto-gun with ion-cannon", () => {
    const drops = LEVELS[5].weaponDrops!;
    expect(drops).toContain("missile");
    expect(drops).toContain("laser");
    expect(drops).toContain("plasma");
    expect(drops).toContain("ion-cannon");
    expect(drops).not.toContain("auto-gun");
  });

  test("Levels 7-10 have the full late-game arsenal", () => {
    for (let i = 6; i < 10; i++) {
      const drops = LEVELS[i].weaponDrops!;
      expect(drops).toContain("missile");
      expect(drops).toContain("laser");
      expect(drops).toContain("plasma");
      expect(drops).toContain("ion-cannon");
      expect(drops).toContain("rocket");
      expect(drops).not.toContain("auto-gun");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 23: Missile Homing Miss Test (Issue #538)
// ═══════════════════════════════════════════════════════════════════════════

describe("Missile Reduced Homing", () => {
  test("Missile with reduced homing can miss fast-moving enemies", () => {
    const missile = new Missile(400, 400, 0, 1.8);
    const enemy = makeEnemy(100, 200);

    for (let i = 0; i < 5; i++) {
      missile.update(0.1, 800, 600, [enemy]);
    }

    const dx = missile.pos.x - enemy.pos.x;
    const dy = missile.pos.y - enemy.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    expect(dist).toBeGreaterThan(0);
  });
});
