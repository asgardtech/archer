/**
 * Tests for Issue #434 — Developer console commands for enemy spawning and game state
 * (spawn, killall, score, fps, status)
 */

import { Player } from "../src/games/raptor/entities/Player";
import { Enemy } from "../src/games/raptor/entities/Enemy";
import { EnemyBullet } from "../src/games/raptor/entities/EnemyBullet";
import { ENEMY_CONFIGS, EnemyVariant } from "../src/games/raptor/types";
import {
  CommandRegistry,
  CommandContext,
  registerCombatCommands,
} from "../src/games/raptor/systems/CommandRegistry";
import { PowerUpManager } from "../src/games/raptor/systems/PowerUpManager";
import { WeaponSystem } from "../src/games/raptor/systems/WeaponSystem";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function makePlayer(): Player {
  return new Player(CANVAS_WIDTH, CANVAS_HEIGHT);
}

function makeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  const enemies: Enemy[] = [];
  const enemyBullets: EnemyBullet[] = [];
  let score = 0;
  let totalScore = 0;
  let showFps = false;

  return {
    currentLevel: 0,
    levelCount: 5,
    levels: [
      { level: 1, name: "Coastal Raid" },
      { level: 2, name: "Desert Storm" },
      { level: 3, name: "Mountain Assault" },
      { level: 4, name: "Arctic Fury" },
      { level: 5, name: "Fortress" },
    ] as any,
    startLevel: () => {},
    setState: () => {},
    startMusic: () => {},
    stopMusic: () => {},
    gameState: "playing",
    player: makePlayer(),
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    powerUpManager: new PowerUpManager(),
    weaponSystem: new WeaponSystem(),
    score,
    totalScore,
    setScore: (value: number) => {
      score = value;
    },
    addScore: (value: number) => {
      score += value;
      return score;
    },
    enemies,
    enemyBullets,
    spawnEnemy: (variant: EnemyVariant) => {
      const margin = 50;
      const x = margin + Math.random() * (CANVAS_WIDTH - 2 * margin);
      const enemy = new Enemy(x, -30, variant);
      enemies.push(enemy);
      return enemy;
    },
    destroyAllEnemies: () => {
      const count = enemies.length;
      for (const enemy of enemies) {
        enemy.alive = false;
      }
      enemyBullets.length = 0;
      return count;
    },
    showFps,
    toggleFps: () => {
      showFps = !showFps;
      return showFps;
    },
    ...overrides,
  };
}

function makeRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registerCombatCommands(registry);
  return registry;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: spawn command
// ═══════════════════════════════════════════════════════════════════════════

describe("spawn command", () => {
  test("Spawn a single enemy of a valid variant (fighter)", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn fighter", ctx);
    expect(result).toEqual(["Spawned 1 fighter(s)"]);
    expect(ctx.enemies.length).toBe(1);
    expect(ctx.enemies[0].variant).toBe("fighter");
    expect(ctx.enemies[0].pos.y).toBe(-30);
    expect(ctx.enemies[0].hitPoints).toBe(ENEMY_CONFIGS.fighter.hitPoints);
  });

  test("Spawned enemy x position is within playable bounds", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    registry.dispatch("spawn scout", ctx);
    const enemy = ctx.enemies[0];
    const margin = 50;
    expect(enemy.pos.x).toBeGreaterThanOrEqual(margin);
    expect(enemy.pos.x).toBeLessThanOrEqual(CANVAS_WIDTH - margin);
  });

  test("Spawn multiple enemies (scout 5)", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn scout 5", ctx);
    expect(result).toEqual(["Spawned 5 scout(s)"]);
    expect(ctx.enemies.length).toBe(5);
    for (const e of ctx.enemies) {
      expect(e.variant).toBe("scout");
      expect(e.pos.y).toBe(-30);
    }
  });

  test("Spawn a boss enemy with correct HP", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn boss", ctx);
    expect(result).toEqual(["Spawned 1 boss(s)"]);
    expect(ctx.enemies.length).toBe(1);
    expect(ctx.enemies[0].variant).toBe("boss");
    expect(ctx.enemies[0].hitPoints).toBe(20);
  });

  test("Spawn count is clamped to maximum of 20", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn scout 50", ctx);
    expect(result).toEqual(["Spawned 20 scout(s)"]);
    expect(ctx.enemies.length).toBe(20);
  });

  test("Spawn count of 0 is clamped to 1", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn fighter 0", ctx);
    expect(ctx.enemies.length).toBe(1);
    expect(ctx.enemies[0].variant).toBe("fighter");
  });

  test("Spawn with invalid variant shows error", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn dragon", ctx);
    expect(result).toEqual([
      "Unknown enemy variant 'dragon'. Available: scout, fighter, bomber, boss",
    ]);
    expect(ctx.enemies.length).toBe(0);
  });

  test("Spawn with no arguments shows usage", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn", ctx);
    expect(result[0]).toContain("Usage: spawn <variant> [count]");
    expect(ctx.enemies.length).toBe(0);
  });

  test("Spawn rejected when not in playing state (menu)", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "menu" });

    const result = registry.dispatch("spawn fighter", ctx);
    expect(result).toEqual(["Command only available while playing"]);
    expect(ctx.enemies.length).toBe(0);
  });

  test("Spawn rejected when not in playing state (gameover)", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "gameover" });

    const result = registry.dispatch("spawn boss", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });

  test("Spawn all valid variants", () => {
    const variants: EnemyVariant[] = ["scout", "fighter", "bomber", "boss"];
    for (const variant of variants) {
      const registry = makeRegistry();
      const ctx = makeContext();
      const result = registry.dispatch(`spawn ${variant}`, ctx);
      expect(result).toEqual([`Spawned 1 ${variant}(s)`]);
      expect(ctx.enemies.length).toBe(1);
      expect(ctx.enemies[0].variant).toBe(variant);
    }
  });

  test("Spawn with invalid count (non-numeric) shows error", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn fighter abc", ctx);
    expect(result).toEqual(["Count must be a positive number"]);
    expect(ctx.enemies.length).toBe(0);
  });

  test("Spawn with negative count shows error", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn fighter -5", ctx);
    expect(result).toEqual(["Count must be a positive number"]);
    expect(ctx.enemies.length).toBe(0);
  });

  test("Spawn variant name is case-insensitive", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn FIGHTER", ctx);
    expect(result).toEqual(["Spawned 1 fighter(s)"]);
    expect(ctx.enemies.length).toBe(1);
    expect(ctx.enemies[0].variant).toBe("fighter");
  });

  test("Spawned enemies are alive by default", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    registry.dispatch("spawn bomber 3", ctx);
    for (const e of ctx.enemies) {
      expect(e.alive).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: killall command
// ═══════════════════════════════════════════════════════════════════════════

describe("killall command", () => {
  test("Kill all enemies on the battlefield", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    // Pre-populate enemies
    for (let i = 0; i < 4; i++) {
      ctx.enemies.push(new Enemy(100 + i * 50, 100, "fighter"));
    }
    // Pre-populate enemy bullets
    ctx.enemyBullets.push(new EnemyBullet(100, 100, 200, 300));
    ctx.enemyBullets.push(new EnemyBullet(200, 200, 300, 400));

    const result = registry.dispatch("killall", ctx);
    expect(result).toEqual(["Destroyed 4 enemies"]);
    for (const e of ctx.enemies) {
      expect(e.alive).toBe(false);
    }
    expect(ctx.enemyBullets.length).toBe(0);
  });

  test("Kill all when no enemies are present", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("killall", ctx);
    expect(result).toEqual(["No enemies to destroy"]);
  });

  test("Killall rejected when not in playing state (gameover)", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "gameover" });

    const result = registry.dispatch("killall", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });

  test("Killall rejected when not in playing state (menu)", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "menu" });

    const result = registry.dispatch("killall", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });

  test("Killall clears enemy bullets", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    ctx.enemies.push(new Enemy(100, 100, "scout"));
    ctx.enemyBullets.push(new EnemyBullet(100, 100, 200, 300));
    ctx.enemyBullets.push(new EnemyBullet(200, 200, 300, 400));
    ctx.enemyBullets.push(new EnemyBullet(300, 300, 400, 500));

    registry.dispatch("killall", ctx);
    expect(ctx.enemyBullets.length).toBe(0);
  });

  test("Killall extra arguments are silently ignored", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    ctx.enemies.push(new Enemy(100, 100, "scout"));
    const result = registry.dispatch("killall extra args here", ctx);
    expect(result).toEqual(["Destroyed 1 enemies"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: score command
// ═══════════════════════════════════════════════════════════════════════════

describe("score command", () => {
  test("Set score to a specific value", () => {
    const registry = makeRegistry();
    let currentScore = 0;
    const ctx = makeContext({
      score: 0,
      setScore: (v: number) => { currentScore = v; },
    });

    const result = registry.dispatch("score 5000", ctx);
    expect(result).toEqual(["Score set to 5000"]);
    expect(currentScore).toBe(5000);
  });

  test("Add to the current score", () => {
    const registry = makeRegistry();
    let currentScore = 1000;
    const ctx = makeContext({
      score: 1000,
      addScore: (v: number) => {
        currentScore += v;
        return currentScore;
      },
    });

    const result = registry.dispatch("score add 250", ctx);
    expect(result).toEqual(["Added 250 to score (total: 1250)"]);
    expect(currentScore).toBe(1250);
  });

  test("Display current score when no arguments given", () => {
    const registry = makeRegistry();
    const ctx = makeContext({
      score: 300,
      totalScore: 1500,
    });

    const result = registry.dispatch("score", ctx);
    expect(result).toEqual(["Score: 300 (Total: 1500)"]);
  });

  test("Reject non-numeric score value", () => {
    const registry = makeRegistry();
    let currentScore = 100;
    const ctx = makeContext({
      score: 100,
      setScore: (v: number) => { currentScore = v; },
    });

    const result = registry.dispatch("score abc", ctx);
    expect(result).toEqual(["Score must be a non-negative number"]);
    expect(currentScore).toBe(100);
  });

  test("Reject negative score value", () => {
    const registry = makeRegistry();
    let currentScore = 100;
    const ctx = makeContext({
      score: 100,
      setScore: (v: number) => { currentScore = v; },
    });

    const result = registry.dispatch("score -100", ctx);
    expect(result).toEqual(["Score must be a non-negative number"]);
    expect(currentScore).toBe(100);
  });

  test("Score rejected when not in playing state (menu)", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "menu" });

    const result = registry.dispatch("score 5000", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });

  test("Score rejected when not in playing state (gameover)", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "gameover" });

    const result = registry.dispatch("score 5000", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });

  test("Score add with missing amount returns error", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("score add", ctx);
    expect(result).toEqual(["Score must be a number"]);
  });

  test("Score add with non-numeric amount returns error", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("score add xyz", ctx);
    expect(result).toEqual(["Score must be a number"]);
  });

  test("Score add with negative value is allowed", () => {
    const registry = makeRegistry();
    let currentScore = 1000;
    const ctx = makeContext({
      score: 1000,
      addScore: (v: number) => {
        currentScore += v;
        return currentScore;
      },
    });

    const result = registry.dispatch("score add -50", ctx);
    expect(result).toEqual(["Added -50 to score (total: 950)"]);
    expect(currentScore).toBe(950);
  });

  test("Score set to 0 is valid", () => {
    const registry = makeRegistry();
    let currentScore = 500;
    const ctx = makeContext({
      score: 500,
      setScore: (v: number) => { currentScore = v; },
    });

    const result = registry.dispatch("score 0", ctx);
    expect(result).toEqual(["Score set to 0"]);
    expect(currentScore).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: fps command
// ═══════════════════════════════════════════════════════════════════════════

describe("fps command", () => {
  test("Toggle FPS display on", () => {
    const registry = makeRegistry();
    let fpsState = false;
    const ctx = makeContext({
      showFps: false,
      toggleFps: () => {
        fpsState = !fpsState;
        return fpsState;
      },
    });

    const result = registry.dispatch("fps", ctx);
    expect(result).toEqual(["FPS display: ON"]);
    expect(fpsState).toBe(true);
  });

  test("Toggle FPS display off", () => {
    const registry = makeRegistry();
    let fpsState = true;
    const ctx = makeContext({
      showFps: true,
      toggleFps: () => {
        fpsState = !fpsState;
        return fpsState;
      },
    });

    const result = registry.dispatch("fps", ctx);
    expect(result).toEqual(["FPS display: OFF"]);
    expect(fpsState).toBe(false);
  });

  test("FPS toggled twice returns ON then OFF", () => {
    const registry = makeRegistry();
    let fpsState = false;
    const ctx = makeContext({
      showFps: false,
      toggleFps: () => {
        fpsState = !fpsState;
        return fpsState;
      },
    });

    const result1 = registry.dispatch("fps", ctx);
    expect(result1).toEqual(["FPS display: ON"]);

    const result2 = registry.dispatch("fps", ctx);
    expect(result2).toEqual(["FPS display: OFF"]);
  });

  test("FPS command works in menu state", () => {
    const registry = makeRegistry();
    let fpsState = false;
    const ctx = makeContext({
      gameState: "menu",
      showFps: false,
      toggleFps: () => {
        fpsState = !fpsState;
        return fpsState;
      },
    });

    const result = registry.dispatch("fps", ctx);
    expect(result).toEqual(["FPS display: ON"]);
  });

  test("FPS command works in gameover state", () => {
    const registry = makeRegistry();
    let fpsState = false;
    const ctx = makeContext({
      gameState: "gameover",
      showFps: false,
      toggleFps: () => {
        fpsState = !fpsState;
        return fpsState;
      },
    });

    const result = registry.dispatch("fps", ctx);
    expect(result).toEqual(["FPS display: ON"]);
  });

  test("FPS command works in level_complete state", () => {
    const registry = makeRegistry();
    let fpsState = false;
    const ctx = makeContext({
      gameState: "level_complete",
      showFps: false,
      toggleFps: () => {
        fpsState = !fpsState;
        return fpsState;
      },
    });

    const result = registry.dispatch("fps", ctx);
    expect(result).toEqual(["FPS display: ON"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: status command
// ═══════════════════════════════════════════════════════════════════════════

describe("status command", () => {
  test("Display game state summary during play", () => {
    const registry = makeRegistry();
    const player = makePlayer();
    player.lives = 3;
    player.shield = 75;

    const powerUpManager = new PowerUpManager();
    powerUpManager.activate("spread-shot");
    powerUpManager.activate("rapid-fire");

    const weaponSystem = new WeaponSystem();
    weaponSystem.setWeapon("missile");

    const enemies: Enemy[] = [];
    for (let i = 0; i < 4; i++) {
      enemies.push(new Enemy(100 + i * 50, 100, "fighter"));
    }
    const enemyBullets: EnemyBullet[] = [];
    for (let i = 0; i < 12; i++) {
      enemyBullets.push(new EnemyBullet(100, 100, 200, 300));
    }

    const ctx = makeContext({
      gameState: "playing",
      currentLevel: 2,
      player,
      score: 1250,
      totalScore: 3400,
      enemies,
      enemyBullets,
      powerUpManager,
      weaponSystem,
    });

    const result = registry.dispatch("status", ctx);
    expect(result).toContainEqual("Game State: playing");
    expect(result).toContainEqual("Level: 3 - Mountain Assault");
    expect(result).toContainEqual("Score: 1250 (Total: 3400)");
    expect(result).toContainEqual("Lives: 3 | Shield: 75");
    expect(result).toContainEqual("Weapon: missile");
    expect(result).toContainEqual("Enemies: 4 | Bullets: 12");

    const effectsLine = result.find((l: string) => l.startsWith("Active effects:"));
    expect(effectsLine).toBeDefined();
    expect(effectsLine).toContain("spread-shot");
    expect(effectsLine).toContain("rapid-fire");
  });

  test("Status shows no active effects", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("status", ctx);
    expect(result).toContainEqual("Active effects: none");
  });

  test("Status command works in gameover state", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "gameover" });

    const result = registry.dispatch("status", ctx);
    expect(result).toContainEqual("Game State: gameover");
  });

  test("Status command works in menu state", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ gameState: "menu" });

    const result = registry.dispatch("status", ctx);
    expect(result).toContainEqual("Game State: menu");
  });

  test("Status includes all 7 expected lines", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("status", ctx);
    expect(result.length).toBe(7);
  });

  test("Status shows correct level info", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ currentLevel: 0 });

    const result = registry.dispatch("status", ctx);
    expect(result).toContainEqual("Level: 1 - Coastal Raid");
  });

  test("Status shows correct weapon", () => {
    const registry = makeRegistry();
    const weaponSystem = new WeaponSystem();
    weaponSystem.setWeapon("laser");
    const ctx = makeContext({ weaponSystem });

    const result = registry.dispatch("status", ctx);
    expect(result).toContainEqual("Weapon: laser");
  });

  test("Status shows enemy and bullet counts", () => {
    const registry = makeRegistry();
    const enemies = [
      new Enemy(100, 100, "scout"),
      new Enemy(200, 200, "fighter"),
    ];
    const enemyBullets = [
      new EnemyBullet(100, 100, 200, 300),
    ];
    const ctx = makeContext({ enemies, enemyBullets });

    const result = registry.dispatch("status", ctx);
    expect(result).toContainEqual("Enemies: 2 | Bullets: 1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Integration / Combined Scenarios
// ═══════════════════════════════════════════════════════════════════════════

describe("Integration scenarios", () => {
  test("Spawn then killall clears all spawned enemies", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    registry.dispatch("spawn fighter 5", ctx);
    expect(ctx.enemies.length).toBe(5);

    const result = registry.dispatch("killall", ctx);
    expect(result).toEqual(["Destroyed 5 enemies"]);
    for (const e of ctx.enemies) {
      expect(e.alive).toBe(false);
    }
  });

  test("Spawn boss is independent of wave system (spawnEnemy creates Enemy directly)", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    registry.dispatch("spawn boss", ctx);
    const boss = ctx.enemies[0];
    expect(boss.variant).toBe("boss");
    expect(boss.hitPoints).toBe(20);
    expect(boss.alive).toBe(true);
  });

  test("Spawned fighter enemies have correct fire rate from config", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    registry.dispatch("spawn fighter", ctx);
    const fighter = ctx.enemies[0];
    expect(fighter.fireRate).toBe(ENEMY_CONFIGS.fighter.fireRate);
  });

  test("Spawned scout enemies have zero fire rate", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    registry.dispatch("spawn scout", ctx);
    const scout = ctx.enemies[0];
    expect(scout.fireRate).toBe(0);
  });

  test("Spawned bomber enemies have correct config", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    registry.dispatch("spawn bomber", ctx);
    const bomber = ctx.enemies[0];
    expect(bomber.variant).toBe("bomber");
    expect(bomber.hitPoints).toBe(ENEMY_CONFIGS.bomber.hitPoints);
    expect(bomber.fireRate).toBe(ENEMY_CONFIGS.bomber.fireRate);
  });

  test("Enemy update causes downward movement", () => {
    const enemy = new Enemy(400, -30, "fighter");
    const initialY = enemy.pos.y;
    enemy.update(0.016, CANVAS_HEIGHT);
    expect(enemy.pos.y).toBeGreaterThan(initialY);
  });

  test("Enemy that exits screen bottom becomes not alive", () => {
    const enemy = new Enemy(400, CANVAS_HEIGHT + 100, "scout");
    enemy.update(0.016, CANVAS_HEIGHT);
    expect(enemy.alive).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  test("spawn command is case-insensitive (SPAWN)", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("SPAWN fighter", ctx);
    expect(result).toEqual(["Spawned 1 fighter(s)"]);
  });

  test("killall command is case-insensitive (KILLALL)", () => {
    const registry = makeRegistry();
    const ctx = makeContext();
    ctx.enemies.push(new Enemy(100, 100, "scout"));

    const result = registry.dispatch("KILLALL", ctx);
    expect(result).toEqual(["Destroyed 1 enemies"]);
  });

  test("score command is case-insensitive (SCORE)", () => {
    const registry = makeRegistry();
    const ctx = makeContext({ score: 100, totalScore: 200 });

    const result = registry.dispatch("SCORE", ctx);
    expect(result).toEqual(["Score: 100 (Total: 200)"]);
  });

  test("fps command is case-insensitive (FPS)", () => {
    const registry = makeRegistry();
    let fpsState = false;
    const ctx = makeContext({
      toggleFps: () => {
        fpsState = !fpsState;
        return fpsState;
      },
    });

    const result = registry.dispatch("FPS", ctx);
    expect(result).toEqual(["FPS display: ON"]);
  });

  test("status command is case-insensitive (STATUS)", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("STATUS", ctx);
    expect(result).toContainEqual("Game State: playing");
  });

  test("spawn count of 1 works correctly (no plural confusion)", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn scout 1", ctx);
    expect(result).toEqual(["Spawned 1 scout(s)"]);
    expect(ctx.enemies.length).toBe(1);
  });

  test("spawn count at exact boundary 20", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn scout 20", ctx);
    expect(result).toEqual(["Spawned 20 scout(s)"]);
    expect(ctx.enemies.length).toBe(20);
  });

  test("spawn count at 21 is clamped to 20", () => {
    const registry = makeRegistry();
    const ctx = makeContext();

    const result = registry.dispatch("spawn scout 21", ctx);
    expect(result).toEqual(["Spawned 20 scout(s)"]);
    expect(ctx.enemies.length).toBe(20);
  });

  test("Score: setting score to large value works", () => {
    const registry = makeRegistry();
    let currentScore = 0;
    const ctx = makeContext({
      setScore: (v: number) => { currentScore = v; },
    });

    const result = registry.dispatch("score 999999", ctx);
    expect(result).toEqual(["Score set to 999999"]);
    expect(currentScore).toBe(999999);
  });
});
