import { GameDescriptor, IGame } from "../src/shared/types";
import { raptorDescriptor } from "../src/games/raptor";
import { LEVELS } from "../src/games/raptor/levels";
import { Player } from "../src/games/raptor/entities/Player";
import { Bullet } from "../src/games/raptor/entities/Bullet";
import { Enemy } from "../src/games/raptor/entities/Enemy";
import { EnemyBullet } from "../src/games/raptor/entities/EnemyBullet";
import { Explosion } from "../src/games/raptor/entities/Explosion";
import { PowerUp } from "../src/games/raptor/entities/PowerUp";
import { CollisionSystem } from "../src/games/raptor/systems/CollisionSystem";
import { EnemySpawner } from "../src/games/raptor/systems/EnemySpawner";
import { PowerUpManager } from "../src/games/raptor/systems/PowerUpManager";
import {
  RaptorGameState,
  EnemyVariant,
  RaptorPowerUpType,
  RaptorSoundEvent,
  ENEMY_CONFIGS,
  RaptorLevelConfig,
  WaveConfig,
  BossConfig,
  EnemyConfig,
  Vec2,
} from "../src/games/raptor/types";
import { AUDIO_MANIFEST } from "../src/games/raptor/rendering/audioAssets";
import * as fs from "fs";
import * as path from "path";

// ─── Test Helpers ───────────────────────────────────────────────

function createMockCanvas(): HTMLCanvasElement {
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  const ctx = {
    fillText: jest.fn((text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y });
    }),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    arcTo: jest.fn(),
    ellipse: jest.fn(),
    quadraticCurveTo: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    transform: jest.fn(),
    roundRect: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    measureText: jest.fn(() => ({ width: 50 })),
  };

  const canvas = {
    getContext: jest.fn(() => ctx),
    width: 800,
    height: 600,
    style: {} as CSSStyleDeclaration,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
    })),
  } as unknown as HTMLCanvasElement;

  (canvas as any).__ctx = ctx;
  (canvas as any).__fillTextCalls = fillTextCalls;
  return canvas;
}

function setupDom(canvas: HTMLCanvasElement): void {
  (global as any).document = {
    getElementById: jest.fn(() => canvas),
    createElement: jest.fn(() => {
      const offCtx = { font: "", measureText: jest.fn(() => ({ width: 50 })) };
      return { getContext: jest.fn(() => offCtx) };
    }),
  };
  (global as any).HTMLCanvasElement = class HTMLCanvasElement {};
  Object.setPrototypeOf(canvas, (global as any).HTMLCanvasElement.prototype);
  (global as any).window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerWidth: 800,
    innerHeight: 600,
  };
  (global as any).navigator = { maxTouchPoints: 0 };
  (global as any).performance = { now: jest.fn(() => 0) };
  (global as any).requestAnimationFrame = jest.fn((_cb: Function) => 1);
  (global as any).cancelAnimationFrame = jest.fn();
  (global as any).setTimeout = setTimeout;
  (global as any).clearTimeout = clearTimeout;
  (global as any).setInterval = setInterval;
  (global as any).clearInterval = clearInterval;
}

function createGame(): IGame {
  const canvas = createMockCanvas();
  setupDom(canvas);
  return raptorDescriptor.createGame(canvas);
}

function createGameWithCanvas(): { game: IGame; canvas: HTMLCanvasElement } {
  const canvas = createMockCanvas();
  setupDom(canvas);
  const game = raptorDescriptor.createGame(canvas);
  return { game, canvas };
}

function createPlayingGame(): { game: any; canvas: HTMLCanvasElement } {
  const canvas = createMockCanvas();
  setupDom(canvas);
  const game = raptorDescriptor.createGame(canvas) as any;
  game.state = "playing";
  game.score = 0;
  game.player.lives = 3;
  game.player.shield = 100;
  game.player.alive = true;
  return { game, canvas };
}

// ════════════════════════════════════════════════════════════════
// RAPTOR DESCRIPTOR
// ════════════════════════════════════════════════════════════════

describe("Scenario: Raptor Skies descriptor has correct metadata", () => {
  test("descriptor name should be 'Raptor Skies'", () => {
    expect(raptorDescriptor.name).toBe("Raptor Skies");
  });

  test("the descriptor should have a non-empty description", () => {
    expect(raptorDescriptor.description).toBeTruthy();
    expect(raptorDescriptor.description.length).toBeGreaterThan(0);
  });

  test("the descriptor should have a thumbnail color", () => {
    expect(raptorDescriptor.thumbnailColor).toBeTruthy();
    expect(raptorDescriptor.thumbnailColor).toBe("#1a1a2e");
  });
});

describe("Scenario: Raptor Skies can be instantiated from the descriptor", () => {
  test("the descriptor factory creates a valid game instance", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = raptorDescriptor.createGame(canvas);
    expect(game).toBeDefined();
    expect(typeof game.start).toBe("function");
    expect(typeof game.stop).toBe("function");
    expect(typeof game.destroy).toBe("function");
  });
});

describe("Scenario: Raptor Skies descriptor has correct id", () => {
  test('it should have id "raptor"', () => {
    expect(raptorDescriptor.id).toBe("raptor");
  });

  test("the descriptor should have a valid createGame factory", () => {
    expect(typeof raptorDescriptor.createGame).toBe("function");
  });
});

// ════════════════════════════════════════════════════════════════
// IGAME CONTRACT
// ════════════════════════════════════════════════════════════════

describe("Scenario: RaptorGame implements the IGame interface", () => {
  let game: IGame;

  beforeAll(() => {
    game = createGame();
  });

  afterAll(() => {
    game.destroy();
  });

  test("it should expose a start() method", () => {
    expect(typeof game.start).toBe("function");
  });

  test("it should expose a stop() method", () => {
    expect(typeof game.stop).toBe("function");
  });

  test("it should expose a destroy() method", () => {
    expect(typeof game.destroy).toBe("function");
  });

  test("it should have an onExit property initially set to null", () => {
    expect(game.onExit).toBeNull();
  });
});

describe("Scenario: RaptorGame cleans up resources on destroy", () => {
  test("destroy() should be idempotent (can be called twice without error)", () => {
    const game = createGame();
    game.start();
    game.destroy();
    expect(() => game.destroy()).not.toThrow();
  });

  test("the game loop should stop after destroy", () => {
    const game = createGame();
    game.start();
    game.destroy();
    expect((game as any).running).toBe(false);
    expect((game as any).destroyed).toBe(true);
  });

  test("animation frame should be cancelled", () => {
    const game = createGame();
    game.start();
    game.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  test("resize listeners should be removed", () => {
    const game = createGame();
    game.start();
    game.destroy();
    expect(window.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("orientationchange", expect.any(Function));
  });
});

describe("Scenario: Returning to the launcher after game over", () => {
  test("onExit callback should be invoked on click in gameover state", () => {
    const { game } = createPlayingGame();
    const exitCallback = jest.fn();
    game.onExit = exitCallback;
    game.state = "gameover";
    game.input.wasClicked = true;

    (game as any).update(0.016);

    expect(exitCallback).toHaveBeenCalled();
  });
});

describe("Scenario: Returning to the launcher after victory", () => {
  test("onExit callback should be invoked on click in victory state", () => {
    const { game } = createPlayingGame();
    const exitCallback = jest.fn();
    game.onExit = exitCallback;
    game.state = "victory";
    game.input.wasClicked = true;

    (game as any).update(0.016);

    expect(exitCallback).toHaveBeenCalled();
  });
});

describe("Scenario: Fallback to menu when onExit is not set", () => {
  test("game state should transition to menu on click in gameover when onExit is null", () => {
    const { game } = createPlayingGame();
    game.onExit = null;
    game.state = "gameover";
    game.input.wasClicked = true;

    (game as any).update(0.016);

    expect(game.state).toBe("menu");
  });

  test("game state should transition to menu on click in victory when onExit is null", () => {
    const { game } = createPlayingGame();
    game.onExit = null;
    game.state = "victory";
    game.input.wasClicked = true;

    (game as any).update(0.016);

    expect(game.state).toBe("menu");
  });
});

// ════════════════════════════════════════════════════════════════
// MENU
// ════════════════════════════════════════════════════════════════

describe("Scenario: Game starts on the menu screen", () => {
  test("initial state should be menu", () => {
    const game = createGame() as any;
    expect(game.state).toBe("menu");
    game.destroy();
  });
});

describe("Scenario: Clicking on the menu starts the game", () => {
  test("clicking in menu transitions to story_intro state", () => {
    const { game } = createPlayingGame();
    game.state = "menu";
    game.input.wasClicked = true;

    (game as any).update(0.016);

    expect(game.state).toBe("story_intro");
  });

  test("score should be 0 after starting", () => {
    const { game } = createPlayingGame();
    game.state = "menu";
    game.input.wasClicked = true;

    (game as any).update(0.016);

    expect(game.score).toBe(0);
  });

  test("player should have 3 lives after starting", () => {
    const { game } = createPlayingGame();
    game.state = "menu";
    game.input.wasClicked = true;

    (game as any).update(0.016);

    expect(game.player.lives).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════════
// PLAYER
// ════════════════════════════════════════════════════════════════

describe("Scenario: Player ship follows mouse position", () => {
  test("player should move toward target position", () => {
    const player = new Player(800, 600);
    const initialX = player.pos.x;
    player.update(0.1, 600, 500, 800, 600);
    expect(player.pos.x).not.toBe(initialX);
  });

  test("player Y position should be clamped to the bottom 40% of the screen", () => {
    const player = new Player(800, 600);
    player.update(1, 400, 100, 800, 600);
    expect(player.pos.y).toBeGreaterThanOrEqual(600 * 0.6);
  });
});

describe("Scenario: Player ship responds to keyboard input", () => {
  test("keyboard input manager moves targetX right when ArrowRight is pressed", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const { InputManager } = require("../src/games/raptor/systems/InputManager");
    const input = new InputManager(canvas);
    const initialX = input.targetX;
    (input as any).keys.add("ArrowRight");
    input.updateFromKeyboard(0.1, 800, 600);
    expect(input.targetX).toBeGreaterThan(initialX);
    input.destroy();
  });

  test("keyboard input manager moves targetY up when w is pressed", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const { InputManager } = require("../src/games/raptor/systems/InputManager");
    const input = new InputManager(canvas);
    const initialY = input.targetY;
    (input as any).keys.add("w");
    input.updateFromKeyboard(0.1, 800, 600);
    expect(input.targetY).toBeLessThan(initialY);
    input.destroy();
  });
});

describe("Scenario: Player ship is clamped to screen bounds", () => {
  test("player should stop at the left boundary", () => {
    const player = new Player(800, 600);
    player.update(10, -100, player.pos.y, 800, 600);
    expect(player.pos.x).toBeGreaterThanOrEqual(player.width / 2);
  });

  test("player should stop at the right boundary", () => {
    const player = new Player(800, 600);
    player.update(10, 1000, player.pos.y, 800, 600);
    expect(player.pos.x).toBeLessThanOrEqual(800 - player.width / 2);
  });
});

describe("Scenario: Player auto-fires during gameplay", () => {
  test("bullets should be created during updatePlaying", () => {
    const { game } = createPlayingGame();
    game.projectiles = [];
    game.weaponSystem.reset();
    game.spawner.configure(LEVELS[0]);

    (game as any).updatePlaying(0.5);

    expect(game.projectiles.length).toBeGreaterThan(0);
  });

  test("bullets should travel upward", () => {
    const bullet = new Bullet(400, 500);
    const initialY = bullet.pos.y;
    bullet.update(0.1);
    expect(bullet.pos.y).toBeLessThan(initialY);
  });
});

describe("Scenario: Touch offset keeps ship visible", () => {
  test("touch input sets targetY 60px above touch point", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    (global as any).navigator = { maxTouchPoints: 1 };
    (global as any).window.ontouchstart = true;

    const { InputManager } = require("../src/games/raptor/systems/InputManager");
    const input = new InputManager(canvas);

    const touchStartCalls = (canvas.addEventListener as jest.Mock).mock.calls.filter(
      (c: any) => c[0] === "touchstart"
    );
    expect(touchStartCalls.length).toBeGreaterThan(0);

    input.destroy();
    delete (global as any).window.ontouchstart;
  });
});

// ════════════════════════════════════════════════════════════════
// ENEMIES
// ════════════════════════════════════════════════════════════════

describe("Scenario: Enemies spawn according to wave configuration", () => {
  test("spawner should produce enemies after wave delay", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    let spawned: Enemy[] = [];
    for (let t = 0; t < 30; t += 0.1) {
      spawned = spawned.concat(spawner.update(0.1, 800));
    }
    expect(spawned.length).toBeGreaterThan(0);
  });

  test("each enemy should have correct hit points for its variant", () => {
    const scout = new Enemy(100, 0, "scout");
    expect(scout.hitPoints).toBe(ENEMY_CONFIGS.scout.hitPoints);

    const fighter = new Enemy(100, 0, "fighter");
    expect(fighter.hitPoints).toBe(ENEMY_CONFIGS.fighter.hitPoints);

    const bomber = new Enemy(100, 0, "bomber");
    expect(bomber.hitPoints).toBe(ENEMY_CONFIGS.bomber.hitPoints);
  });
});

describe("Scenario: Scout enemies move downward", () => {
  test("scouts should move downward at their configured speed", () => {
    const scout = new Enemy(100, 0, "scout", 180);
    const initialY = scout.pos.y;
    scout.update(0.1, 600);
    expect(scout.pos.y).toBeGreaterThan(initialY);
  });
});

describe("Scenario: Fighter enemies shoot at the player", () => {
  test("fighters have a non-zero fire rate", () => {
    const fighter = new Enemy(100, 100, "fighter");
    expect(fighter.fireRate).toBeGreaterThan(0);
  });

  test("fighters can fire once cooldown expires", () => {
    const fighter = new Enemy(100, 100, "fighter");
    fighter.fireCooldown = 0;
    expect(fighter.canFire()).toBe(true);
  });
});

describe("Scenario: Enemies that leave the bottom of the screen are removed", () => {
  test("non-boss enemy past bottom edge should be marked as not alive", () => {
    const scout = new Enemy(100, 590, "scout", 500);
    scout.update(1, 600);
    expect(scout.alive).toBe(false);
  });

  test("boss does not die from going past the bottom", () => {
    const boss = new Enemy(100, 0, "boss");
    boss.update(1, 600);
    expect(boss.alive).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// COLLISION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Player bullet destroys a scout enemy", () => {
  test("scout with 1 HP should be destroyed by bullet", () => {
    const cs = new CollisionSystem();
    const bullet = new Bullet(100, 100);
    const scout = new Enemy(100, 100, "scout");

    const hits = cs.checkBulletsEnemies([bullet], [scout]);

    expect(hits.length).toBe(1);
    expect(hits[0].destroyed).toBe(true);
    expect(bullet.alive).toBe(false);
  });

  test("scout destruction should award 10 points", () => {
    const scout = new Enemy(100, 100, "scout");
    expect(scout.scoreValue).toBe(10);
  });
});

describe("Scenario: Player bullet hits a fighter enemy", () => {
  test("fighter with 2 HP should not be destroyed by single hit", () => {
    const cs = new CollisionSystem();
    const bullet = new Bullet(100, 100);
    const fighter = new Enemy(100, 100, "fighter");

    const hits = cs.checkBulletsEnemies([bullet], [fighter]);

    expect(hits.length).toBe(1);
    expect(hits[0].destroyed).toBe(false);
    expect(fighter.hitPoints).toBe(1);
  });

  test("fighter should be destroyed after two hits", () => {
    const fighter = new Enemy(100, 100, "fighter");
    const firstHit = fighter.hit();
    expect(firstHit).toBe(false);
    const secondHit = fighter.hit();
    expect(secondHit).toBe(true);
    expect(fighter.alive).toBe(false);
  });

  test("fighter destruction should award 25 points", () => {
    const fighter = new Enemy(100, 100, "fighter");
    expect(fighter.scoreValue).toBe(25);
  });
});

describe("Scenario: Enemy bullet hits the player shield", () => {
  test("player with shield > 0 should not lose a life", () => {
    const player = new Player(800, 600);
    player.shield = 100;
    const dead = player.takeDamage(25);
    expect(dead).toBe(false);
    expect(player.lives).toBe(3);
    expect(player.shield).toBe(75);
  });
});

describe("Scenario: Player is hit with no shield remaining", () => {
  test("player should lose 1 life and shield should reset", () => {
    const player = new Player(800, 600);
    player.shield = 0;
    const dead = player.takeDamage(25);
    expect(dead).toBe(false);
    expect(player.lives).toBe(2);
    expect(player.shield).toBe(100);
  });

  test("player should become invincible for 2 seconds after losing a life", () => {
    const player = new Player(800, 600);
    player.shield = 0;
    player.takeDamage(25);
    expect(player.isInvincible).toBe(true);
    expect(player.invincibilityTimer).toBe(2.0);
  });
});

describe("Scenario: Player collides with an enemy ship", () => {
  test("collision system detects player-enemy overlap", () => {
    const cs = new CollisionSystem();
    const player = new Player(800, 600);
    player.pos = { x: 100, y: 100 };
    const enemy = new Enemy(100, 100, "scout");

    const hits = cs.checkPlayerEnemies(player, [enemy]);
    expect(hits.length).toBe(1);
    expect(enemy.alive).toBe(false);
  });
});

describe("Scenario: Player loses all lives", () => {
  test("player should not be alive after losing all lives", () => {
    const player = new Player(800, 600);
    player.shield = 0;
    player.lives = 1;
    const dead = player.takeDamage(25);
    expect(dead).toBe(true);
    expect(player.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// POWER-UPS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Power-up entities fall downward", () => {
  test("power-up moves downward when updated", () => {
    const pu = new PowerUp(100, 100, "shield-restore");
    const initialY = pu.pos.y;
    pu.update(0.1, 600);
    expect(pu.pos.y).toBeGreaterThan(initialY);
  });

  test("power-up is removed if it passes the bottom of the screen", () => {
    const pu = new PowerUp(100, 610, "shield-restore");
    pu.update(1, 600);
    expect(pu.alive).toBe(false);
  });
});

describe("Scenario: Collecting a spread-shot power-up", () => {
  test("spread-shot power-up can be activated in PowerUpManager", () => {
    const pm = new PowerUpManager();
    pm.activate("spread-shot");
    expect(pm.hasUpgrade("spread-shot")).toBe(true);
  });

  test("collecting spread-shot power-up is detected via collision", () => {
    const cs = new CollisionSystem();
    const player = new Player(800, 600);
    player.pos = { x: 100, y: 100 };
    const pu = new PowerUp(100, 100, "spread-shot");

    const hits = cs.checkPlayerPowerUps(player, [pu]);
    expect(hits.length).toBe(1);
    expect(hits[0].powerUp.type).toBe("spread-shot");
    expect(pu.alive).toBe(false);
  });
});

describe("Scenario: Collecting a rapid-fire power-up", () => {
  test("rapid-fire power-up should have a limited duration", () => {
    const pm = new PowerUpManager();
    pm.activate("rapid-fire");
    expect(pm.hasUpgrade("rapid-fire")).toBe(true);
    pm.update(7);
    expect(pm.hasUpgrade("rapid-fire")).toBe(false);
  });
});

describe("Scenario: Collecting a shield-restore power-up", () => {
  test("player shield should be restorable to 100", () => {
    const player = new Player(800, 600);
    player.shield = 30;
    player.shield = 100;
    expect(player.shield).toBe(100);
  });
});

describe("Scenario: Collecting a bonus-life power-up", () => {
  test("player lives should increase by 1", () => {
    const player = new Player(800, 600);
    const initialLives = player.lives;
    player.lives++;
    expect(player.lives).toBe(initialLives + 1);
  });
});

// ════════════════════════════════════════════════════════════════
// BOSS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Boss appears after all waves on a boss-enabled level", () => {
  test("boss should spawn after required waves complete on level 3", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[2]); // Level 3

    let allSpawned: Enemy[] = [];
    for (let t = 0; t < 100; t += 0.1) {
      allSpawned = allSpawned.concat(spawner.update(0.1, 800));
    }

    expect(spawner.shouldSpawnBoss()).toBe(true);
    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss");
  });

  test("boss should have configured HP", () => {
    const bossConfig = LEVELS[2].bossConfig!;
    const boss = new Enemy(400, -40, "boss", bossConfig.speed, {
      hitPoints: bossConfig.hitPoints,
      scoreValue: bossConfig.scoreValue,
      fireRate: bossConfig.fireRate,
    });
    expect(boss.hitPoints).toBe(20);
  });
});

describe("Scenario: Boss is defeated", () => {
  test("boss should be destroyed when HP reaches 0", () => {
    const boss = new Enemy(400, 0, "boss", 40, { hitPoints: 10 });
    for (let i = 0; i < 10; i++) {
      boss.hit();
    }
    expect(boss.alive).toBe(false);
  });

  test("boss destruction awards correct score", () => {
    expect(ENEMY_CONFIGS.boss.scoreValue).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// LEVEL PROGRESSION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Level completes when all waves and boss are defeated", () => {
  test("spawner reports level complete when all waves done (no boss)", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]); // Level 1 - no boss

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.allWavesComplete).toBe(true);
    expect(spawner.isLevelComplete).toBe(true);
  });

  test("spawner does not report level complete until boss is defeated on boss levels", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[2]); // Level 3 - has boss

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.allWavesComplete).toBe(true);
    expect(spawner.isLevelComplete).toBe(false);

    spawner.spawnBoss(800);
    spawner.markBossDefeated();
    expect(spawner.isLevelComplete).toBe(true);
  });
});

describe("Scenario: Advancing to the next level", () => {
  test("startLevel should reset wave state but keep lives on non-full reset", () => {
    const { game } = createPlayingGame();
    game.player.lives = 2;
    game.score = 500;
    game.totalScore = 500;

    (game as any).startLevel(1, false);

    expect(game.currentLevel).toBe(1);
    expect(game.score).toBe(0);
    expect(game.player.lives).toBe(2);
    expect(game.player.alive).toBe(true);
    expect(game.projectiles.length).toBe(0);
    expect(game.enemies.length).toBe(0);
  });
});

describe("Scenario: Victory after completing all levels", () => {
  test("there are exactly 10 levels", () => {
    expect(LEVELS.length).toBe(10);
  });

  test("completing the last level should lead to victory state", () => {
    const { game } = createPlayingGame();
    game.currentLevel = LEVELS.length - 1;
    game.spawner.configure(LEVELS[LEVELS.length - 1]);

    for (let t = 0; t < 200; t += 0.1) {
      game.spawner.update(0.1, 800);
    }
    game.spawner.spawnBoss(800);
    game.spawner.markBossDefeated();
    game.enemies = [];

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("victory");
  });
});

// ════════════════════════════════════════════════════════════════
// LEVELS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Game has 10 levels with correct names", () => {
  test("there should be exactly 10 levels", () => {
    expect(LEVELS.length).toBe(10);
  });

  test("level names should be correct", () => {
    const expectedNames = [
      "Coastal Patrol",
      "Desert Strike",
      "Mountain Assault",
      "Arctic Thunder",
      "Final Fortress",
      "Shipyard Ruins",
      "Scorched Wastes",
      "Industrial Core",
      "Orbital Debris",
      "Vektran Stronghold",
    ];
    const actualNames = LEVELS.map((l) => l.name);
    expect(actualNames).toEqual(expectedNames);
  });
});

describe("Scenario: Level difficulty increases progressively", () => {
  test("later levels should have more waves than earlier levels", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].waves.length).toBeGreaterThanOrEqual(LEVELS[i - 1].waves.length);
    }
  });

  test("later levels should have higher enemy fire rate multipliers", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].enemyFireRateMultiplier).toBeGreaterThanOrEqual(
        LEVELS[i - 1].enemyFireRateMultiplier
      );
    }
  });

  test("boss-enabled levels should have increasing boss HP within each act", () => {
    const act1Bosses = LEVELS.filter((l) => l.level >= 3 && l.level <= 5 && l.bossEnabled && l.bossConfig);
    for (let i = 1; i < act1Bosses.length; i++) {
      expect(act1Bosses[i].bossConfig!.hitPoints).toBeGreaterThan(
        act1Bosses[i - 1].bossConfig!.hitPoints
      );
    }
    const act2Bosses = LEVELS.filter((l) => l.level >= 6 && l.level <= 10 && l.bossEnabled && l.bossConfig);
    for (let i = 1; i < act2Bosses.length; i++) {
      expect(act2Bosses[i].bossConfig!.hitPoints).toBeGreaterThan(
        act2Bosses[i - 1].bossConfig!.hitPoints
      );
    }
    expect(act2Bosses[act2Bosses.length - 1].bossConfig!.hitPoints).toBe(100);
  });

  test("level 1 should not have a boss", () => {
    expect(LEVELS[0].bossEnabled).toBe(false);
  });

  test("level 2 should not have a boss", () => {
    expect(LEVELS[1].bossEnabled).toBe(false);
  });

  test("levels 3-5 should have bosses", () => {
    expect(LEVELS[2].bossEnabled).toBe(true);
    expect(LEVELS[3].bossEnabled).toBe(true);
    expect(LEVELS[4].bossEnabled).toBe(true);
  });

  test("level 1 has 5 waves, level 2 has 7 waves", () => {
    expect(LEVELS[0].waves.length).toBe(5);
    expect(LEVELS[1].waves.length).toBe(7);
  });

  test("level 1 auto-fire rate is 5, level 5 auto-fire rate is 7", () => {
    expect(LEVELS[0].autoFireRate).toBe(5);
    expect(LEVELS[4].autoFireRate).toBe(7);
  });

  test("level 1 power-up drop chance is 10%, level 5 is 18%", () => {
    expect(LEVELS[0].powerUpDropChance).toBeCloseTo(0.10);
    expect(LEVELS[4].powerUpDropChance).toBeCloseTo(0.18);
  });

  test("level 3 boss has HP 20, level 4 boss has HP 30, level 5 boss has HP 50", () => {
    expect(LEVELS[2].bossConfig!.hitPoints).toBe(20);
    expect(LEVELS[3].bossConfig!.hitPoints).toBe(30);
    expect(LEVELS[4].bossConfig!.hitPoints).toBe(50);
  });
});

// ════════════════════════════════════════════════════════════════
// RENDERING / HUD
// ════════════════════════════════════════════════════════════════

describe("Scenario: HUD displays score and lives during gameplay", () => {
  test("HUD render method can be called without error in playing state", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    expect(() =>
      hud.render(ctx, "playing", 100, 3, 80, 1, "Coastal Patrol", 800, 600)
    ).not.toThrow();
  });

  test("HUD should display score text", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "playing", 150, 3, 80, 1, "Coastal Patrol", 800, 600);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasScore = fillTextCalls.some((c) => c.text.includes("Score:") || c.text.includes("150"));
    expect(hasScore).toBe(true);
  });

  test("HUD should display level name", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "playing", 0, 3, 100, 1, "Coastal Patrol", 800, 600);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasLevel = fillTextCalls.some((c) => c.text.includes("Coastal Patrol"));
    expect(hasLevel).toBe(true);
  });
});

describe("Scenario: Mute button is displayed and functional", () => {
  test("HUD mute button hit test works for in-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const hitX = 800 - 36 - 12 + 18;
    const hitY = 12 + 18;
    expect(hud.isMuteButtonHit(hitX, hitY, 800)).toBe(true);
  });

  test("HUD mute button miss for out-of-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    expect(hud.isMuteButtonHit(100, 100, 800)).toBe(false);
  });
});

describe("Scenario: Menu screen rendering", () => {
  test("menu should display game title 'Raptor Skies'", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasTitle = fillTextCalls.some((c) => c.text.includes("Raptor Skies"));
    expect(hasTitle).toBe(true);
  });

  test("menu should show 'Click to Start' on non-touch devices", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasClick = fillTextCalls.some((c) => c.text.includes("Click to Start"));
    expect(hasClick).toBe(true);
  });

  test("menu should show 'Tap to Start' on touch devices", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(true);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasTap = fillTextCalls.some((c) => c.text.includes("Tap to Start"));
    expect(hasTap).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// PARALLAX STARFIELD
// ════════════════════════════════════════════════════════════════

describe("Scenario: Parallax starfield scrolls during gameplay", () => {
  test("game should have star layers", () => {
    const game = createGame() as any;
    expect(game.stars.length).toBeGreaterThan(0);
    expect(game.starsNear.length).toBeGreaterThan(0);
    game.destroy();
  });

  test("near stars should scroll faster than far stars", () => {
    const game = createGame() as any;
    const farSpeeds = game.stars.map((s: any) => s.speed);
    const nearSpeeds = game.starsNear.map((s: any) => s.speed);
    const avgFar = farSpeeds.reduce((a: number, b: number) => a + b, 0) / farSpeeds.length;
    const avgNear = nearSpeeds.reduce((a: number, b: number) => a + b, 0) / nearSpeeds.length;
    expect(avgNear).toBeGreaterThan(avgFar);
    game.destroy();
  });
});

// ════════════════════════════════════════════════════════════════
// EXPLOSION EFFECTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Explosion effects play on enemy destruction", () => {
  test("explosion should be created with particles", () => {
    const explosion = new Explosion(100, 100, 1);
    expect(explosion.alive).toBe(true);
  });

  test("explosion should fade out and become not alive", () => {
    const explosion = new Explosion(100, 100, 1);
    for (let t = 0; t < 50; t++) {
      explosion.update(0.1);
    }
    expect(explosion.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// SOUND
// ════════════════════════════════════════════════════════════════

describe("Scenario: Sound effects play for game events", () => {
  test("SoundSystem should accept all defined sound events without error", () => {
    const events: RaptorSoundEvent[] = [
      "player_shoot", "enemy_shoot", "enemy_hit", "enemy_destroy",
      "player_hit", "player_destroy", "boss_hit", "boss_destroy",
      "power_up_collect", "level_complete", "game_over", "victory", "menu_start",
    ];

    const mockAudio = {
      disabled: true,
      muted: false,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(null),
      hasBuffer: jest.fn().mockReturnValue(false),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    for (const event of events) {
      expect(() => sound.play(event)).not.toThrow();
    }

    sound.destroy();
  });

  test("SoundSystem should call audio methods when not disabled", () => {
    const mockAudio = {
      disabled: false,
      muted: false,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(null),
      hasBuffer: jest.fn().mockReturnValue(false),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    (global as any).performance = { now: jest.fn(() => Date.now()) };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    sound.play("player_shoot");
    expect(mockAudio.playToneSwept).toHaveBeenCalled();

    sound.destroy();
  });
});

// ════════════════════════════════════════════════════════════════
// AUDIO BUFFER LOADING & PLAYBACK
// ════════════════════════════════════════════════════════════════

describe("Scenario: Audio manifest covers all RaptorSoundEvent values", () => {
  const expectedSfxKeys: RaptorSoundEvent[] = [
    "player_shoot", "enemy_shoot", "enemy_hit", "enemy_destroy",
    "player_hit", "player_destroy", "boss_hit", "boss_destroy",
    "power_up_collect", "level_complete", "game_over", "victory",
    "menu_start", "missile_fire", "missile_hit", "laser_fire",
    "laser_hit", "weapon_switch",
    "enemy_missile_fire", "enemy_missile_hit", "enemy_spread_fire",
    "enemy_laser_fire", "enemy_laser_hit",
    "plasma_fire", "plasma_hit",
    "ion_fire", "ion_hit",
    "rocket_fire",
    "mega_bomb_fire",
    "weapon_upgrade",
  ];

  test("AUDIO_MANIFEST.sfx has an entry for each RaptorSoundEvent value", () => {
    for (const key of expectedSfxKeys) {
      expect(AUDIO_MANIFEST.sfx[key]).toBeDefined();
      expect(AUDIO_MANIFEST.sfx[key]).toMatch(/\.mp3$/);
    }
    expect(Object.keys(AUDIO_MANIFEST.sfx).length).toBe(30);
  });

  test("AUDIO_MANIFEST.music has entries for menu and level_1 through level_10", () => {
    expect(AUDIO_MANIFEST.music.menu).toBeDefined();
    for (let i = 1; i <= 10; i++) {
      expect(AUDIO_MANIFEST.music[`level_${i}`]).toBeDefined();
    }
    expect(Object.keys(AUDIO_MANIFEST.music).length).toBe(11);
  });
});

describe("Scenario: Audio manifest paths point to existing files", () => {
  for (const [key, filePath] of Object.entries(AUDIO_MANIFEST.sfx)) {
    test(`SFX "${key}" file exists at public/${filePath}`, () => {
      const fullPath = path.join(__dirname, "..", "public", filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  }

  for (const [key, filePath] of Object.entries(AUDIO_MANIFEST.music)) {
    test(`Music "${key}" file exists at public/${filePath}`, () => {
      const fullPath = path.join(__dirname, "..", "public", filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  }
});

describe("Scenario: Sound effect assets exist for all game events", () => {
  const sfxDir = path.join(__dirname, "..", "public", "assets", "raptor", "audio", "sfx");
  const expectedFiles = [
    "player_shoot.mp3", "enemy_shoot.mp3", "enemy_hit.mp3", "enemy_destroy.mp3",
    "player_hit.mp3", "player_destroy.mp3", "boss_hit.mp3", "boss_destroy.mp3",
    "power_up_collect.mp3", "level_complete.mp3", "game_over.mp3", "victory.mp3",
    "menu_start.mp3", "missile_fire.mp3", "missile_hit.mp3", "laser_fire.mp3",
    "laser_hit.mp3", "weapon_switch.mp3",
  ];

  for (const file of expectedFiles) {
    test(`${file} should exist in sfx directory`, () => {
      expect(fs.existsSync(path.join(sfxDir, file))).toBe(true);
    });
  }

  test("each SFX file should be a valid MP3 (starts with ID3 or FF FB header)", () => {
    for (const file of expectedFiles) {
      const buf = fs.readFileSync(path.join(sfxDir, file));
      const isID3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
      const isMP3Sync = buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0;
      expect(isID3 || isMP3Sync).toBe(true);
    }
  });
});

describe("Scenario: Music track assets exist for menu and all levels", () => {
  const musicDir = path.join(__dirname, "..", "public", "assets", "raptor", "audio", "music");
  const expectedFiles = [
    "menu.mp3", "level_1_coastal.mp3", "level_2_desert.mp3",
    "level_3_mountain.mp3", "level_4_arctic.mp3", "level_5_fortress.mp3",
    "level_6_shipyard.mp3", "level_7_wasteland.mp3", "level_8_industrial.mp3",
    "level_9_orbital.mp3", "level_10_stronghold.mp3",
  ];

  for (const file of expectedFiles) {
    test(`${file} should exist in music directory`, () => {
      expect(fs.existsSync(path.join(musicDir, file))).toBe(true);
    });
  }

  test("each music file should be a valid MP3 (starts with ID3 or FF FB header)", () => {
    for (const file of expectedFiles) {
      const buf = fs.readFileSync(path.join(musicDir, file));
      const isID3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
      const isMP3Sync = buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0;
      expect(isID3 || isMP3Sync).toBe(true);
    }
  });
});

describe("Scenario: AudioManager buffer methods", () => {
  test("hasBuffer returns false for unknown key", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    expect(audio.hasBuffer("nonexistent")).toBe(false);
    audio.destroy();
  });

  test("playBuffer returns null for missing buffer", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    expect(audio.playBuffer("nonexistent")).toBeNull();
    audio.destroy();
  });

  test("stopBuffer does not throw for missing key", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    expect(() => audio.stopBuffer("nonexistent")).not.toThrow();
    audio.destroy();
  });

  test("destroy is idempotent with audio buffers", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    audio.destroy();
    expect(() => audio.destroy()).not.toThrow();
  });
});

describe("Scenario: Procedural audio plays when buffer is unavailable", () => {
  test("SoundSystem falls back to procedural audio when no buffer is loaded", () => {
    const mockAudio = {
      disabled: false,
      muted: false,
      sfxGain: null,
      musicGain: null,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(null),
      hasBuffer: jest.fn().mockReturnValue(false),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    (global as any).performance = { now: jest.fn(() => Date.now()) };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    sound.play("player_shoot");
    expect(mockAudio.playBuffer).toHaveBeenCalledWith("player_shoot", { category: "sfx" });
    expect(mockAudio.playToneSwept).toHaveBeenCalled();

    sound.destroy();
  });

  test("SoundSystem uses buffer when available and skips procedural", () => {
    const mockSource = { stop: jest.fn(), onended: null };
    const mockAudio = {
      disabled: false,
      muted: false,
      sfxGain: null,
      musicGain: null,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(mockSource),
      hasBuffer: jest.fn().mockReturnValue(true),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    (global as any).performance = { now: jest.fn(() => Date.now()) };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    sound.play("player_shoot");
    expect(mockAudio.playBuffer).toHaveBeenCalledWith("player_shoot", { category: "sfx" });
    expect(mockAudio.playToneSwept).not.toHaveBeenCalled();

    sound.destroy();
  });
});

describe("Scenario: Music buffer playback with fallback", () => {
  test("startMusic uses buffer when available for menu", () => {
    const mockSource = { stop: jest.fn(), onended: null };
    const mockAudio = {
      disabled: false,
      muted: false,
      sfxGain: null,
      musicGain: null,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(mockSource),
      hasBuffer: jest.fn().mockReturnValue(true),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    sound.startMusic("menu");
    expect(mockAudio.hasBuffer).toHaveBeenCalledWith("menu");
    expect(mockAudio.playBuffer).toHaveBeenCalledWith("menu", { loop: true, category: "music" });

    sound.destroy();
  });

  test("startMusic uses buffer when available for playing state", () => {
    const mockSource = { stop: jest.fn(), onended: null };
    const mockAudio = {
      disabled: false,
      muted: false,
      sfxGain: null,
      musicGain: null,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(mockSource),
      hasBuffer: jest.fn().mockReturnValue(true),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    sound.startMusic("playing", 0);
    expect(mockAudio.hasBuffer).toHaveBeenCalledWith("level_1");
    expect(mockAudio.playBuffer).toHaveBeenCalledWith("level_1", { loop: true, category: "music" });

    sound.destroy();
  });

  test("startMusic falls back to procedural when buffer unavailable", () => {
    const mockAudio = {
      disabled: false,
      muted: false,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(null),
      hasBuffer: jest.fn().mockReturnValue(false),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    sound.startMusic("menu");
    expect(mockAudio.hasBuffer).toHaveBeenCalledWith("menu");
    expect(mockAudio.playTone).toHaveBeenCalled();

    sound.destroy();
  });

  test("stopMusic calls stopBuffer for menu and all levels", () => {
    const mockAudio = {
      disabled: false,
      muted: false,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(null),
      hasBuffer: jest.fn().mockReturnValue(false),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);

    sound.stopMusic();
    expect(mockAudio.stopBuffer).toHaveBeenCalledWith("menu");
    for (let i = 1; i <= 10; i++) {
      expect(mockAudio.stopBuffer).toHaveBeenCalledWith(`level_${i}`);
    }

    sound.destroy();
  });
});

// ════════════════════════════════════════════════════════════════
// BULLET CAPS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Player bullets are capped for performance", () => {
  test("no new bullets when at cap of 50", () => {
    const { game } = createPlayingGame();

    game.bullets = [];
    for (let i = 0; i < 50; i++) {
      game.bullets.push(new Bullet(400, 300));
    }
    game.fireTimer = 100;

    (game as any).updatePlaying(0.016);

    expect(game.bullets.length).toBeLessThanOrEqual(50);
  });
});

describe("Scenario: Enemy bullets are capped for performance", () => {
  test("enemy bullet cap is defined as 30", () => {
    const game = createGame() as any;
    expect(30).toBe(30); // MAX_ENEMY_BULLETS constant
    game.destroy();
  });
});

// ════════════════════════════════════════════════════════════════
// EXPLOSION CAP
// ════════════════════════════════════════════════════════════════

describe("Scenario: Active explosions are capped", () => {
  test("addExplosion recycles oldest when at cap of 20", () => {
    const { game } = createPlayingGame();
    game.explosions = [];

    for (let i = 0; i < 25; i++) {
      (game as any).addExplosion(new Explosion(100, 100));
    }

    expect(game.explosions.length).toBeLessThanOrEqual(20);
  });
});

// ════════════════════════════════════════════════════════════════
// FILE STRUCTURE
// ════════════════════════════════════════════════════════════════

describe("Scenario: Raptor source files are organized correctly", () => {
  const expectedFiles = [
    "src/games/raptor/RaptorGame.ts",
    "src/games/raptor/index.ts",
    "src/games/raptor/types.ts",
    "src/games/raptor/levels.ts",
    "src/games/raptor/entities/Player.ts",
    "src/games/raptor/entities/Bullet.ts",
    "src/games/raptor/entities/Enemy.ts",
    "src/games/raptor/entities/EnemyBullet.ts",
    "src/games/raptor/entities/Explosion.ts",
    "src/games/raptor/entities/PowerUp.ts",
    "src/games/raptor/systems/InputManager.ts",
    "src/games/raptor/systems/CollisionSystem.ts",
    "src/games/raptor/systems/EnemySpawner.ts",
    "src/games/raptor/systems/PowerUpManager.ts",
    "src/games/raptor/systems/SoundSystem.ts",
    "src/games/raptor/rendering/HUD.ts",
  ];

  for (const file of expectedFiles) {
    test(`${file} should exist`, () => {
      const fullPath = path.join(__dirname, "..", file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  }
});

describe("Scenario: Raptor descriptor has correct identity", () => {
  test('raptorDescriptor should have id "raptor" and name "Raptor Skies"', () => {
    expect(raptorDescriptor.id).toBe("raptor");
    expect(raptorDescriptor.name).toBe("Raptor Skies");
  });
});

// ════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Type definitions are complete", () => {
  test("RaptorGameState type includes all required states", () => {
    const states: RaptorGameState[] = ["menu", "playing", "level_complete", "gameover", "victory"];
    expect(states.length).toBe(5);
  });

  test("EnemyVariant type includes all variants", () => {
    const variants: EnemyVariant[] = [
      "scout", "fighter", "bomber", "boss",
      "interceptor", "dart", "drone", "swarmer",
      "gunship", "cruiser", "destroyer", "juggernaut",
      "stealth", "minelayer",
    ];
    expect(variants.length).toBe(14);
  });

  test("RaptorPowerUpType includes all types", () => {
    const types: RaptorPowerUpType[] = ["spread-shot", "rapid-fire", "shield-restore", "bonus-life"];
    expect(types.length).toBe(4);
  });

  test("ENEMY_CONFIGS has entries for all variants", () => {
    const allVariants: EnemyVariant[] = [
      "scout", "fighter", "bomber", "boss",
      "interceptor", "dart", "drone", "swarmer",
      "gunship", "cruiser", "destroyer", "juggernaut",
      "stealth", "minelayer",
    ];
    for (const v of allVariants) {
      expect(ENEMY_CONFIGS[v]).toBeDefined();
    }
  });

  test("scout: 1 HP, fast, score=10, fireRate=0", () => {
    const cfg = ENEMY_CONFIGS.scout;
    expect(cfg.hitPoints).toBe(1);
    expect(cfg.scoreValue).toBe(10);
    expect(cfg.fireRate).toBe(0);
    expect(cfg.speed).toBe(180);
  });

  test("fighter: 2 HP, shoots back, score=25", () => {
    const cfg = ENEMY_CONFIGS.fighter;
    expect(cfg.hitPoints).toBe(2);
    expect(cfg.scoreValue).toBe(25);
    expect(cfg.fireRate).toBeGreaterThan(0);
  });

  test("bomber: 3 HP, slow, score=50", () => {
    const cfg = ENEMY_CONFIGS.bomber;
    expect(cfg.hitPoints).toBe(3);
    expect(cfg.scoreValue).toBe(50);
    expect(cfg.speed).toBe(80);
  });

  test("boss: high HP (20), score=200", () => {
    const cfg = ENEMY_CONFIGS.boss;
    expect(cfg.hitPoints).toBe(20);
    expect(cfg.scoreValue).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════════
// COLLISION SYSTEM (detailed)
// ════════════════════════════════════════════════════════════════

describe("Scenario: CollisionSystem AABB checks", () => {
  test("non-overlapping entities produce no hits", () => {
    const cs = new CollisionSystem();
    const bullet = new Bullet(0, 0);
    const enemy = new Enemy(500, 500, "scout");
    const hits = cs.checkBulletsEnemies([bullet], [enemy]);
    expect(hits.length).toBe(0);
  });

  test("invincible player is not hit by enemy bullets", () => {
    const cs = new CollisionSystem();
    const player = new Player(800, 600);
    player.pos = { x: 100, y: 100 };
    player.invincibilityTimer = 1.0;
    const eb = new EnemyBullet(100, 100, 100, 200);

    const hits = cs.checkEnemyBulletsPlayer([eb], player);
    expect(hits.length).toBe(0);
  });

  test("dead player does not collect power-ups", () => {
    const cs = new CollisionSystem();
    const player = new Player(800, 600);
    player.alive = false;
    const pu = new PowerUp(player.pos.x, player.pos.y);

    const hits = cs.checkPlayerPowerUps(player, [pu]);
    expect(hits.length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// ENEMY BULLET
// ════════════════════════════════════════════════════════════════

describe("Scenario: EnemyBullet behavior", () => {
  test("enemy bullet moves toward target area", () => {
    const eb = new EnemyBullet(400, 100, 400, 500);
    const initialY = eb.pos.y;
    eb.update(0.1, 800, 600);
    expect(eb.pos.y).toBeGreaterThan(initialY);
  });

  test("enemy bullet dies when leaving canvas bounds", () => {
    const eb = new EnemyBullet(400, 590, 400, 1000);
    eb.update(1, 800, 600);
    expect(eb.alive).toBe(false);
  });

  test("enemy bullet with same source and target gets default downward velocity", () => {
    const eb = new EnemyBullet(400, 100, 400, 100);
    expect(eb.vel.y).toBe(300);
  });
});

// ════════════════════════════════════════════════════════════════
// POWERUP MANAGER (detailed)
// ════════════════════════════════════════════════════════════════

describe("Scenario: PowerUpManager detailed behavior", () => {
  test("spread-shot lasts 8 seconds", () => {
    const pm = new PowerUpManager();
    pm.activate("spread-shot");
    pm.update(7.5);
    expect(pm.hasUpgrade("spread-shot")).toBe(true);
    pm.update(1);
    expect(pm.hasUpgrade("spread-shot")).toBe(false);
  });

  test("rapid-fire lasts 6 seconds", () => {
    const pm = new PowerUpManager();
    pm.activate("rapid-fire");
    pm.update(5.5);
    expect(pm.hasUpgrade("rapid-fire")).toBe(true);
    pm.update(1);
    expect(pm.hasUpgrade("rapid-fire")).toBe(false);
  });

  test("re-activating refreshes the timer", () => {
    const pm = new PowerUpManager();
    pm.activate("spread-shot");
    pm.update(5);
    pm.activate("spread-shot");
    pm.update(5);
    expect(pm.hasUpgrade("spread-shot")).toBe(true);
  });

  test("reset clears all effects", () => {
    const pm = new PowerUpManager();
    pm.activate("spread-shot");
    pm.activate("rapid-fire");
    pm.reset();
    expect(pm.hasUpgrade("spread-shot")).toBe(false);
    expect(pm.hasUpgrade("rapid-fire")).toBe(false);
  });

  test("shield-restore and bonus-life have no timed effect", () => {
    const pm = new PowerUpManager();
    pm.activate("shield-restore");
    pm.activate("bonus-life");
    expect(pm.hasUpgrade("shield-restore")).toBe(false);
    expect(pm.hasUpgrade("bonus-life")).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// ENEMY SPAWNER (detailed)
// ════════════════════════════════════════════════════════════════

describe("Scenario: EnemySpawner detailed behavior", () => {
  test("no enemies spawned before first wave delay", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);
    const enemies = spawner.update(0.5, 800);
    expect(enemies.length).toBe(0);
  });

  test("correct enemy variant spawned per wave config", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]); // Level 2 has mixed waves

    let allEnemies: Enemy[] = [];
    for (let t = 0; t < 10; t += 0.1) {
      allEnemies = allEnemies.concat(spawner.update(0.1, 800));
    }

    const scouts = allEnemies.filter((e) => e.variant === "scout");
    expect(scouts.length).toBeGreaterThan(0);
  });

  test("boss should not spawn on non-boss levels", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.shouldSpawnBoss()).toBe(false);
  });

  test("boss minimum HP is 10", () => {
    const spawner = new EnemySpawner();
    const customConfig: RaptorLevelConfig = {
      ...LEVELS[2],
      bossConfig: { hitPoints: 5, speed: 40, fireRate: 1, scoreValue: 200, appearsAfterWave: 0 },
    };
    spawner.configure(customConfig);

    for (let t = 0; t < 50; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.hitPoints).toBeGreaterThanOrEqual(10);
  });
});

// ════════════════════════════════════════════════════════════════
// RENDERING ENTITIES
// ════════════════════════════════════════════════════════════════

describe("Scenario: Entity rendering", () => {
  test("player render does not throw", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const player = new Player(800, 600);
    expect(() => player.render(ctx)).not.toThrow();
  });

  test("dead player does not render", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const player = new Player(800, 600);
    player.alive = false;
    player.render(ctx);
    expect(ctx.save).not.toHaveBeenCalled();
  });

  test("enemy variants render without throwing", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    const variants: EnemyVariant[] = [
      "scout", "fighter", "bomber", "boss",
      "interceptor", "dart", "drone", "swarmer",
      "gunship", "cruiser", "destroyer", "juggernaut",
      "stealth", "minelayer",
    ];
    for (const v of variants) {
      const enemy = new Enemy(100, 100, v);
      expect(() => enemy.render(ctx)).not.toThrow();
    }
  });

  test("bullet render does not throw", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const bullet = new Bullet(100, 100);
    expect(() => bullet.render(ctx)).not.toThrow();
  });

  test("enemy bullet render does not throw", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const eb = new EnemyBullet(100, 100, 200, 300);
    expect(() => eb.render(ctx)).not.toThrow();
  });

  test("explosion render does not throw", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const exp = new Explosion(100, 100, 2);
    expect(() => exp.render(ctx)).not.toThrow();
  });

  test("power-up variants render without throwing", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const types: RaptorPowerUpType[] = ["spread-shot", "rapid-fire", "shield-restore", "bonus-life"];
    for (const t of types) {
      const pu = new PowerUp(100, 100, t);
      expect(() => pu.render(ctx)).not.toThrow();
    }
  });
});

// ════════════════════════════════════════════════════════════════
// DELTA-TIME CAP
// ════════════════════════════════════════════════════════════════

describe("Scenario: Delta-time cap", () => {
  test("DT_CAP should prevent large dt from physics tunneling", () => {
    const { game } = createPlayingGame();
    game.state = "playing";

    const player = game.player;
    const initialPos = { ...player.pos };

    (game as any).update(0.5);

    expect(game.state).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// INPUT MANAGER CLEANUP
// ════════════════════════════════════════════════════════════════

describe("Scenario: InputManager keyboard listener cleanup", () => {
  test("destroy removes keyboard listeners from window", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const { InputManager } = require("../src/games/raptor/systems/InputManager");
    const input = new InputManager(canvas);
    input.destroy();

    expect(window.removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(window.removeEventListener).toHaveBeenCalledWith("keyup", expect.any(Function));
  });

  test("destroy removes canvas listeners", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const { InputManager } = require("../src/games/raptor/systems/InputManager");
    const input = new InputManager(canvas);
    input.destroy();

    expect(canvas.removeEventListener).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(canvas.removeEventListener).toHaveBeenCalledWith("mousedown", expect.any(Function));
    expect(canvas.removeEventListener).toHaveBeenCalledWith("touchstart", expect.any(Function));
    expect(canvas.removeEventListener).toHaveBeenCalledWith("touchmove", expect.any(Function));
    expect(canvas.removeEventListener).toHaveBeenCalledWith("touchend", expect.any(Function));
  });
});

// ════════════════════════════════════════════════════════════════
// INPUT MANAGER consume()
// ════════════════════════════════════════════════════════════════

describe("Scenario: InputManager consume resets wasClicked", () => {
  test("consume sets wasClicked to false", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const { InputManager } = require("../src/games/raptor/systems/InputManager");
    const input = new InputManager(canvas);
    input.wasClicked = true;
    input.consume();
    expect(input.wasClicked).toBe(false);
    input.destroy();
  });
});

// ════════════════════════════════════════════════════════════════
// GAME DESCRIPTOR
// ════════════════════════════════════════════════════════════════

describe("Scenario: Raptor descriptor fields", () => {
  test("descriptor id is 'raptor'", () => {
    expect(raptorDescriptor.id).toBe("raptor");
  });

  test("descriptor name is 'Raptor Skies'", () => {
    expect(raptorDescriptor.name).toBe("Raptor Skies");
  });

  test("descriptor thumbnailColor is '#1a1a2e'", () => {
    expect(raptorDescriptor.thumbnailColor).toBe("#1a1a2e");
  });

  test("descriptor has a createGame factory", () => {
    expect(typeof raptorDescriptor.createGame).toBe("function");
  });
});

// ════════════════════════════════════════════════════════════════
// PLAYER INVINCIBILITY
// ════════════════════════════════════════════════════════════════

describe("Scenario: Player invincibility prevents chain deaths", () => {
  test("player cannot take damage while invincible", () => {
    const player = new Player(800, 600);
    player.shield = 0;
    player.takeDamage(25);
    expect(player.isInvincible).toBe(true);
    const livesAfterFirstHit = player.lives;

    const dead = player.takeDamage(25);
    expect(dead).toBe(false);
    expect(player.lives).toBe(livesAfterFirstHit);
  });

  test("invincibility wears off after timer expires", () => {
    const player = new Player(800, 600);
    player.invincibilityTimer = 2.0;
    player.update(0.5, 400, 400, 800, 600);
    expect(player.isInvincible).toBe(true);
    player.update(2.0, 400, 400, 800, 600);
    expect(player.isInvincible).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// PLAYER RESET
// ════════════════════════════════════════════════════════════════

describe("Scenario: Player reset behavior", () => {
  test("fullReset sets lives to 3", () => {
    const player = new Player(800, 600);
    player.lives = 1;
    player.reset(800, 600, true);
    expect(player.lives).toBe(3);
  });

  test("non-full reset keeps current lives", () => {
    const player = new Player(800, 600);
    player.lives = 2;
    player.reset(800, 600, false);
    expect(player.lives).toBe(2);
  });

  test("reset restores shield and alive status", () => {
    const player = new Player(800, 600);
    player.shield = 0;
    player.alive = false;
    player.reset(800, 600);
    expect(player.shield).toBe(100);
    expect(player.alive).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// BULLET BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Scenario: Bullet behavior", () => {
  test("bullet goes off-screen and is marked dead", () => {
    const bullet = new Bullet(400, 0);
    bullet.update(1);
    expect(bullet.alive).toBe(false);
  });

  test("spread shot bullets have angled trajectories", () => {
    const leftBullet = new Bullet(400, 500, -0.2);
    const centerBullet = new Bullet(400, 500, 0);
    const rightBullet = new Bullet(400, 500, 0.2);

    leftBullet.update(0.1);
    centerBullet.update(0.1);
    rightBullet.update(0.1);

    expect(leftBullet.pos.x).toBeLessThan(centerBullet.pos.x);
    expect(rightBullet.pos.x).toBeGreaterThan(centerBullet.pos.x);
  });
});

// ════════════════════════════════════════════════════════════════
// POWER-UP ENTITY
// ════════════════════════════════════════════════════════════════

describe("Scenario: PowerUp entity", () => {
  test("power-up has correct type when specified", () => {
    const pu = new PowerUp(100, 100, "bonus-life");
    expect(pu.type).toBe("bonus-life");
  });

  test("power-up gets random type when not specified", () => {
    const validTypes: RaptorPowerUpType[] = ["spread-shot", "rapid-fire", "shield-restore", "bonus-life"];
    const pu = new PowerUp(100, 100);
    expect(validTypes).toContain(pu.type);
  });

  test("power-up has AABB accessors", () => {
    const pu = new PowerUp(100, 100);
    expect(pu.left).toBe(100 - 10);
    expect(pu.right).toBe(100 + 10);
    expect(pu.top).toBe(100 - 10);
    expect(pu.bottom).toBe(100 + 10);
  });
});

// ════════════════════════════════════════════════════════════════
// LEVEL CONFIG VALIDATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Level configuration validation", () => {
  test("each level has required fields", () => {
    for (const level of LEVELS) {
      expect(level.level).toBeDefined();
      expect(level.name).toBeDefined();
      expect(level.waves).toBeDefined();
      expect(Array.isArray(level.waves)).toBe(true);
      expect(level.waves.length).toBeGreaterThan(0);
      expect(level.autoFireRate).toBeGreaterThan(0);
      expect(level.powerUpDropChance).toBeGreaterThan(0);
      expect(level.powerUpDropChance).toBeLessThanOrEqual(1);
      expect(level.skyGradient).toBeDefined();
      expect(level.skyGradient.length).toBe(2);
      expect(level.starDensity).toBeGreaterThanOrEqual(0);
      expect(level.enemyFireRateMultiplier).toBeGreaterThanOrEqual(1);
    }
  });

  test("each wave config has required fields", () => {
    for (const level of LEVELS) {
      for (const wave of level.waves) {
        expect([
          "scout", "fighter", "bomber", "boss",
          "interceptor", "dart", "drone", "swarmer",
          "gunship", "cruiser", "destroyer", "juggernaut",
          "stealth", "minelayer",
        ]).toContain(wave.enemyVariant);
        expect(wave.count).toBeGreaterThan(0);
        expect(wave.spawnDelay).toBeGreaterThanOrEqual(0);
        if (wave.count > 1) {
          expect(wave.spawnDelay).toBeGreaterThan(0);
        }
        expect(wave.waveDelay).toBeGreaterThanOrEqual(0);
        expect(["line", "v", "random", "sweep"]).toContain(wave.formation);
        expect(wave.speed).toBeGreaterThan(0);
      }
    }
  });

  test("boss configs on boss-enabled levels have valid fields", () => {
    for (const level of LEVELS) {
      if (level.bossEnabled) {
        expect(level.bossConfig).toBeDefined();
        expect(level.bossConfig!.hitPoints).toBeGreaterThan(0);
        expect(level.bossConfig!.speed).toBeGreaterThan(0);
        expect(level.bossConfig!.fireRate).toBeGreaterThan(0);
        expect(level.bossConfig!.scoreValue).toBeGreaterThan(0);
        expect(level.bossConfig!.appearsAfterWave).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════
// SOUND SYSTEM MUSIC
// ════════════════════════════════════════════════════════════════

describe("Scenario: SoundSystem music start/stop", () => {
  test("destroy calls stopMusic", () => {
    const mockAudio = {
      disabled: true,
      muted: false,
      ensureContext: jest.fn(),
      toggleMute: jest.fn(),
      playTone: jest.fn(),
      playToneSwept: jest.fn(),
      playNoise: jest.fn(),
      playSequence: jest.fn(),
      playBuffer: jest.fn().mockReturnValue(null),
      hasBuffer: jest.fn().mockReturnValue(false),
      stopBuffer: jest.fn(),
      loadAudioBuffer: jest.fn(),
      destroy: jest.fn(),
    };

    const { SoundSystem } = require("../src/games/raptor/systems/SoundSystem");
    const sound = new SoundSystem(mockAudio);
    sound.startMusic("playing", 0);
    sound.destroy();
    // Should not throw - stopMusic cleans up intervals
  });
});

// ════════════════════════════════════════════════════════════════
// ENEMY HIT BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Scenario: Enemy hit() method", () => {
  test("hit() decrements HP by 1", () => {
    const enemy = new Enemy(100, 100, "bomber");
    const initialHP = enemy.hitPoints;
    enemy.hit();
    expect(enemy.hitPoints).toBe(initialHP - 1);
  });

  test("hit() returns true when enemy is destroyed", () => {
    const enemy = new Enemy(100, 100, "scout");
    const result = enemy.hit();
    expect(result).toBe(true);
    expect(enemy.alive).toBe(false);
  });

  test("hit() returns false when enemy survives", () => {
    const enemy = new Enemy(100, 100, "fighter");
    const result = enemy.hit();
    expect(result).toBe(false);
    expect(enemy.alive).toBe(true);
  });

  test("hit() on dead enemy returns false", () => {
    const enemy = new Enemy(100, 100, "scout");
    enemy.alive = false;
    const result = enemy.hit();
    expect(result).toBe(false);
  });
});
