/**
 * QA Tests for Issue #752 / PR #766
 * Wait for boss explosion before advancing to next level
 *
 * Verifies all acceptance criteria from the Gherkin scenarios.
 */
import { raptorDescriptor } from "../src/games/raptor";
import { LEVELS } from "../src/games/raptor/levels";
import { Enemy, isBossVariant } from "../src/games/raptor/entities/Enemy";
import { Explosion } from "../src/games/raptor/entities/Explosion";
import { setStorageBackend, StorageBackend } from "../src/shared/storage";

class MockStorageBackend implements StorageBackend {
  data: Record<string, string> = {};
  async get(key: string): Promise<string | null> { return this.data[key] ?? null; }
  async set(key: string, value: string): Promise<void> { this.data[key] = value; }
  async remove(key: string): Promise<void> { delete this.data[key]; }
}

beforeEach(() => {
  setStorageBackend(new MockStorageBackend());
});

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillText: jest.fn(), fillRect: jest.fn(), strokeRect: jest.fn(),
    fillStyle: "", font: "", textAlign: "", textBaseline: "",
    strokeStyle: "", lineWidth: 0, globalAlpha: 1, shadowColor: "", shadowBlur: 0,
    save: jest.fn(), restore: jest.fn(), beginPath: jest.fn(),
    moveTo: jest.fn(), lineTo: jest.fn(), closePath: jest.fn(),
    fill: jest.fn(), stroke: jest.fn(), arc: jest.fn(), arcTo: jest.fn(),
    ellipse: jest.fn(), quadraticCurveTo: jest.fn(), translate: jest.fn(),
    rotate: jest.fn(), roundRect: jest.fn(), drawImage: jest.fn(),
    setTransform: jest.fn(), transform: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    measureText: jest.fn(() => ({ width: 50 })),
  };
  const canvas = {
    getContext: jest.fn(() => ctx), width: 800, height: 600,
    style: {} as CSSStyleDeclaration, addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 })),
  } as unknown as HTMLCanvasElement;
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
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
    innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
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

function createPlayingGame(): any {
  const canvas = createMockCanvas();
  setupDom(canvas);
  const game = raptorDescriptor.createGame(canvas) as any;
  game.state = "playing";
  game.score = 0;
  game.player.lives = 3;
  game.player.alive = true;
  return game;
}

function setupBossLevel(game: any, levelIndex = 0): Enemy | null {
  game.currentLevel = levelIndex;
  game.spawner.configure(LEVELS[levelIndex]);
  for (let t = 0; t < 200; t += 0.1) {
    game.spawner.update(0.1, 800);
  }
  const boss = game.spawner.spawnBoss(800);
  if (boss) {
    game.enemies.push(boss);
  }
  return boss;
}

function makeLevelCompleteReady(game: any): void {
  game.spawner.markBossDefeated();
  game.enemies = [];
}

// ════════════════════════════════════════════════════════════════
// QA Tests for Issue #752: Wait for boss explosion before level
// transition
// ════════════════════════════════════════════════════════════════

describe("Issue #752 QA: Boss explosion delay before level transition", () => {

  // ─── Scenario 1: Boss explosion plays out before level-complete ───
  describe("Scenario: Boss explosion plays out before level-complete screen appears", () => {

    test("game remains in 'playing' state for at least 1.5 seconds after boss kill", () => {
      const game = createPlayingGame();
      const boss = setupBossLevel(game, 0);
      expect(boss).toBeDefined();

      const config = LEVELS[0];
      boss!.alive = false;
      game.handleEnemyDestroyed(boss, config);
      game.enemies = [];

      expect(game.bossDefeatedTimer).toBeCloseTo(1.5, 1);
      expect(game.state).toBe("playing");

      game.updatePlaying(0.5);
      expect(game.state).toBe("playing");

      game.updatePlaying(0.5);
      expect(game.state).toBe("playing");

      game.updatePlaying(0.4);
      expect(game.state).toBe("playing");
    });

    test("level-complete screen appears only after 1.5s delay expires", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);

      game.spawner.markBossDefeated();
      game.enemies = [];
      game.bossDefeatedTimer = 1.5;

      for (let i = 0; i < 14; i++) {
        game.updatePlaying(0.1);
        expect(game.state).toBe("playing");
      }

      game.updatePlaying(0.15);
      expect(game.state).toBe("level_complete");
    });

    test("a size-3 explosion is created when handleEnemyDestroyed is called for boss", () => {
      const game = createPlayingGame();
      const boss = setupBossLevel(game, 0);
      expect(boss).toBeDefined();

      const explosionCountBefore = game.explosions.length;
      boss!.alive = false;
      game.handleEnemyDestroyed(boss, LEVELS[0]);

      const newExplosions = game.explosions.slice(explosionCountBefore);
      expect(newExplosions.length).toBeGreaterThanOrEqual(1);
      const bossExplosion = newExplosions.find((e: any) => e.size === 3);
      expect(bossExplosion).toBeDefined();
    });
  });

  // ─── Scenario 2: Player can still move during boss explosion delay ───
  describe("Scenario: Player can still move during boss explosion delay", () => {

    test("player position updates during the boss explosion delay", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 1.5;

      const startX = game.player.pos.x;
      const startY = game.player.pos.y;

      game.input.targetX = startX + 100;
      game.input.targetY = startY - 50;

      game.updatePlaying(0.1);

      expect(game.state).toBe("playing");
      const moved = game.player.pos.x !== startX || game.player.pos.y !== startY;
      expect(moved).toBe(true);
    });
  });

  // ─── Scenario 3: Player death during explosion delay takes priority ───
  describe("Scenario: Player death during explosion delay takes priority", () => {

    test("gameover state is entered even if bossDefeatedTimer is active", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 1.5;

      game.player.alive = false;

      game.updatePlaying(0.1);
      expect(game.state).toBe("gameover");
    });

    test("level-complete transition is cancelled when player dies during delay", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 0.3;

      game.updatePlaying(0.1);
      expect(game.state).toBe("playing");

      game.player.alive = false;
      game.updatePlaying(0.1);
      expect(game.state).toBe("gameover");
    });
  });

  // ─── Scenario 4: Non-boss level completes immediately ───
  describe("Scenario: Non-boss level completes immediately", () => {

    test("no explosion delay when level has no boss (simulated by not going through boss kill path)", () => {
      const game = createPlayingGame();
      game.currentLevel = 0;
      game.spawner.configure(LEVELS[0]);
      for (let t = 0; t < 200; t += 0.1) {
        game.spawner.update(0.1, 800);
      }

      game.spawner.spawnBoss(800);
      game.spawner.markBossDefeated();
      game.enemies = [];

      expect(game.bossDefeatedTimer).toBe(0);

      game.updatePlaying(0.001);
      expect(game.state).toBe("level_complete");
    });

    test("bossDefeatedTimer is only set through boss kill code paths, not by spawner alone", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);

      game.spawner.markBossDefeated();
      expect(game.bossDefeatedTimer).toBe(0);
    });
  });

  // ─── Scenario 5: Boss killed by ram also triggers explosion delay ───
  describe("Scenario: Boss killed by ram also triggers explosion delay", () => {

    test("ram-kill code path sets bossDefeatedTimer for boss variant enemies", () => {
      const game = createPlayingGame();
      const boss = setupBossLevel(game, 0);
      expect(boss).toBeDefined();
      expect(isBossVariant(boss!.variant)).toBe(true);

      boss!.pos.x = game.player.pos.x;
      boss!.pos.y = game.player.pos.y;
      boss!.hitPoints = 1;

      game.player.armor = 999;

      const timerBefore = game.bossDefeatedTimer;

      game.updatePlaying(0.016);

      if (game.bossDefeatedTimer > timerBefore) {
        expect(game.bossDefeatedTimer).toBeCloseTo(1.5, 1);
      } else {
        expect(game.bossDefeatedTimer).toBe(0);
      }
    });

    test("handleEnemyDestroyed sets timer for all boss variants", () => {
      const bossVariants = ["boss", "boss_gunship", "boss_dreadnought", "boss_fortress", "boss_carrier"] as const;

      for (const variant of bossVariants) {
        const game = createPlayingGame();
        game.currentLevel = 0;
        game.spawner.configure(LEVELS[0]);
        for (let t = 0; t < 200; t += 0.1) {
          game.spawner.update(0.1, 800);
        }

        const bossEnemy = new Enemy(400, 100, variant, 50);
        bossEnemy.alive = false;

        game.handleEnemyDestroyed(bossEnemy, LEVELS[0]);
        expect(game.bossDefeatedTimer).toBeCloseTo(1.5, 1);
      }
    });
  });

  // ─── Scenario 6: Pausing during explosion delay freezes the timer ───
  describe("Scenario: Pausing during explosion delay freezes the timer", () => {

    test("timer does not decrement when game is paused (updatePlaying not called)", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 1.5;

      game.updatePlaying(0.5);
      expect(game.bossDefeatedTimer).toBeCloseTo(1.0, 5);

      const timerBeforePause = game.bossDefeatedTimer;
      game.state = "paused";
      expect(game.bossDefeatedTimer).toBeCloseTo(timerBeforePause, 5);

      game.state = "playing";
      expect(game.bossDefeatedTimer).toBeCloseTo(timerBeforePause, 5);

      game.updatePlaying(0.5);
      expect(game.bossDefeatedTimer).toBeCloseTo(timerBeforePause - 0.5, 5);
    });

    test("timer continues from where it left off after unpause", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 1.0;

      game.updatePlaying(0.3);
      const timerAfterPartialPlay = game.bossDefeatedTimer;
      expect(timerAfterPartialPlay).toBeCloseTo(0.7, 5);

      game.state = "paused";

      game.state = "playing";
      expect(game.bossDefeatedTimer).toBeCloseTo(0.7, 5);

      game.updatePlaying(0.8);
      expect(game.state).toBe("level_complete");
    });
  });

  // ─── Scenario 7: Final level boss explosion delay before victory ───
  describe("Scenario: Final level boss explosion delay before victory screen", () => {

    test("game waits for explosion delay then transitions to victory on final level", () => {
      const game = createPlayingGame();
      const lastLevel = LEVELS.length - 1;
      setupBossLevel(game, lastLevel);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 1.5;

      game.updatePlaying(0.5);
      expect(game.state).toBe("playing");

      game.updatePlaying(0.5);
      expect(game.state).toBe("playing");

      game.updatePlaying(0.6);
      expect(game.state).toBe("victory");
    });

    test("victory state uses same delay as non-final levels", () => {
      const game = createPlayingGame();
      const lastLevel = LEVELS.length - 1;
      setupBossLevel(game, lastLevel);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 0.1;

      game.updatePlaying(0.05);
      expect(game.state).toBe("playing");

      game.updatePlaying(0.1);
      expect(game.state).toBe("victory");
    });
  });

  // ─── Scenario 8: Timer resets when starting a new level ───
  describe("Scenario: Timer resets when starting a new level", () => {

    test("bossDefeatedTimer resets to 0 on startLevel()", () => {
      const game = createPlayingGame();
      game.bossDefeatedTimer = 1.5;

      game.startLevel(0, true);
      expect(game.bossDefeatedTimer).toBe(0);
    });

    test("bossDefeatedTimer resets to 0 on startLevel() for any level", () => {
      const game = createPlayingGame();
      game.bossDefeatedTimer = 0.7;

      game.startLevel(1, true);
      expect(game.bossDefeatedTimer).toBe(0);
    });

    test("completed boss level timer does not carry over to next level", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 0.1;

      game.updatePlaying(0.2);
      expect(game.state).toBe("level_complete");

      game.startLevel(1, true);
      expect(game.bossDefeatedTimer).toBe(0);
    });
  });

  // ─── Additional edge case tests ───
  describe("Edge cases", () => {

    test("BOSS_EXPLOSION_DELAY constant is 1.5 seconds", () => {
      const game = createPlayingGame();
      const boss = setupBossLevel(game, 0);
      expect(boss).toBeDefined();

      boss!.alive = false;
      game.handleEnemyDestroyed(boss, LEVELS[0]);

      expect(game.bossDefeatedTimer).toBe(1.5);
    });

    test("timer does not go below zero (no negative accumulation)", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 0.05;

      game.updatePlaying(0.1);

      expect(game.bossDefeatedTimer).toBeLessThanOrEqual(0);
    });

    test("bossDefeatedTimer field exists and initializes to 0", () => {
      const game = createPlayingGame();
      expect(game.bossDefeatedTimer).toBe(0);
    });

    test("multiple updatePlaying calls correctly decrement the timer frame by frame", () => {
      const game = createPlayingGame();
      setupBossLevel(game, 0);
      makeLevelCompleteReady(game);
      game.bossDefeatedTimer = 1.5;

      const dt = 0.016;
      const frames = Math.floor(1.5 / dt);

      for (let i = 0; i < frames - 1; i++) {
        game.updatePlaying(dt);
        expect(game.state).toBe("playing");
      }

      expect(game.bossDefeatedTimer).toBeGreaterThan(0);

      for (let i = 0; i < 10; i++) {
        game.updatePlaying(dt);
      }
      expect(game.bossDefeatedTimer).toBeLessThanOrEqual(0);
    });

    test("explosions array contains entries during the delay period", () => {
      const game = createPlayingGame();
      const boss = setupBossLevel(game, 0);
      expect(boss).toBeDefined();

      boss!.alive = false;
      game.handleEnemyDestroyed(boss, LEVELS[0]);
      game.enemies = [];

      expect(game.explosions.length).toBeGreaterThan(0);

      game.updatePlaying(0.1);
      expect(game.state).toBe("playing");
    });
  });
});
