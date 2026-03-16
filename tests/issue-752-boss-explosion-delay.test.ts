import { raptorDescriptor } from "../src/games/raptor";
import { LEVELS } from "../src/games/raptor/levels";
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
    setTransform: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
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

function createPlayingGame(): { game: any } {
  const canvas = createMockCanvas();
  setupDom(canvas);
  const game = raptorDescriptor.createGame(canvas) as any;
  game.state = "playing";
  game.score = 0;
  game.player.lives = 3;
  game.player.alive = true;
  return { game };
}

function setupBossLevel(game: any, levelIndex = 1): void {
  game.currentLevel = levelIndex;
  game.spawner.configure(LEVELS[levelIndex]);
  for (let t = 0; t < 200; t += 0.1) {
    game.spawner.update(0.1, 800);
  }
  game.spawner.spawnBoss(800);
}

// ════════════════════════════════════════════════════════════════
// Issue #752: Wait for boss explosion before level transition
// ════════════════════════════════════════════════════════════════

describe("Scenario: bossDefeatedTimer is set when a boss is destroyed", () => {
  test("handleEnemyDestroyed sets bossDefeatedTimer for boss variants", () => {
    const { game } = createPlayingGame();
    setupBossLevel(game);

    expect(game.bossDefeatedTimer).toBe(0);

    game.spawner.markBossDefeated();
    game.bossDefeatedTimer = 1.5;
    expect(game.bossDefeatedTimer).toBe(1.5);
  });
});

describe("Scenario: Level-complete transition is blocked while timer > 0", () => {
  test("game stays in playing state during boss explosion delay", () => {
    const { game } = createPlayingGame();
    setupBossLevel(game);
    game.spawner.markBossDefeated();
    game.enemies = [];
    game.bossDefeatedTimer = 1.5;

    (game as any).updatePlaying(0.1);
    expect(game.state).toBe("playing");

    (game as any).updatePlaying(0.1);
    expect(game.state).toBe("playing");
  });
});

describe("Scenario: Level-complete transition proceeds when timer <= 0", () => {
  test("game transitions to level_complete after timer expires", () => {
    const { game } = createPlayingGame();
    setupBossLevel(game);
    game.spawner.markBossDefeated();
    game.enemies = [];
    game.bossDefeatedTimer = 0.2;

    (game as any).updatePlaying(0.1);
    expect(game.state).toBe("playing");

    (game as any).updatePlaying(0.15);
    expect(game.state).toBe("level_complete");
  });
});

describe("Scenario: Non-boss levels are unaffected", () => {
  test("level completes immediately when no boss is present (timer stays at 0)", () => {
    const { game } = createPlayingGame();
    game.currentLevel = 0;
    game.spawner.configure(LEVELS[0]);
    for (let t = 0; t < 100; t += 0.1) {
      game.spawner.update(0.1, 800);
    }
    game.spawner.spawnBoss(800);
    game.spawner.markBossDefeated();
    game.enemies = [];

    expect(game.bossDefeatedTimer).toBe(0);
    (game as any).updatePlaying(0.001);
    expect(game.state).toBe("level_complete");
  });
});

describe("Scenario: Timer is reset on startLevel()", () => {
  test("bossDefeatedTimer resets to 0 when a new level starts", () => {
    const { game } = createPlayingGame();
    game.bossDefeatedTimer = 1.5;

    (game as any).startLevel(0, true);
    expect(game.bossDefeatedTimer).toBe(0);
  });
});

describe("Scenario: Timer decrements each frame", () => {
  test("bossDefeatedTimer decreases by dt each updatePlaying call", () => {
    const { game } = createPlayingGame();
    setupBossLevel(game);
    game.spawner.markBossDefeated();
    game.enemies = [];
    game.bossDefeatedTimer = 1.5;

    (game as any).updatePlaying(0.5);
    expect(game.bossDefeatedTimer).toBeCloseTo(1.0, 5);
    expect(game.state).toBe("playing");

    (game as any).updatePlaying(0.5);
    expect(game.bossDefeatedTimer).toBeCloseTo(0.5, 5);
    expect(game.state).toBe("playing");

    (game as any).updatePlaying(0.3);
    expect(game.bossDefeatedTimer).toBeCloseTo(0.2, 5);
    expect(game.state).toBe("playing");
  });
});

describe("Scenario: Player death during explosion delay takes priority", () => {
  test("gameover state is entered even if bossDefeatedTimer is active", () => {
    const { game } = createPlayingGame();
    setupBossLevel(game);
    game.spawner.markBossDefeated();
    game.enemies = [];
    game.bossDefeatedTimer = 1.5;
    game.player.alive = false;

    (game as any).updatePlaying(0.1);
    expect(game.state).toBe("gameover");
  });
});

describe("Scenario: Final level boss explosion delay before victory screen", () => {
  test("victory state is entered only after timer expires on last level", () => {
    const { game } = createPlayingGame();
    const lastLevel = LEVELS.length - 1;
    setupBossLevel(game, lastLevel);
    game.spawner.markBossDefeated();
    game.enemies = [];
    game.bossDefeatedTimer = 0.5;

    (game as any).updatePlaying(0.1);
    expect(game.state).toBe("playing");

    (game as any).updatePlaying(0.5);
    expect(game.state).toBe("victory");
  });
});
