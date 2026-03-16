import { SaveSystem } from "../src/games/raptor/systems/SaveSystem";
import { EnemySpawner } from "../src/games/raptor/systems/EnemySpawner";
import { RaptorSaveData, WeaponType, SAVE_FORMAT_VERSION, SaveMigration, MAX_SAVE_SLOTS } from "../src/games/raptor/types";
import { LEVELS } from "../src/games/raptor/levels";
import { raptorDescriptor } from "../src/games/raptor";
import { StorageBackend, setStorageBackend } from "../src/shared/storage";

// ─── Mock StorageBackend ────────────────────────────────────────

class MockStorageBackend implements StorageBackend {
  data: Record<string, string> = {};

  async get(key: string): Promise<string | null> {
    return this.data[key] ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data[key] = value;
  }

  async remove(key: string): Promise<void> {
    delete this.data[key];
  }
}

class NoOpStorageBackend implements StorageBackend {
  async get(): Promise<string | null> { return null; }
  async set(): Promise<void> { }
  async remove(): Promise<void> { }
}

// ─── Test Helpers ───────────────────────────────────────────────

let mockBackend: MockStorageBackend;

beforeEach(() => {
  mockBackend = new MockStorageBackend();
  setStorageBackend(mockBackend);
  SaveSystem.resetMigrationFlag();
});

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
    roundRect: jest.fn(),
    drawImage: jest.fn(),
    setTransform: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
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
    devicePixelRatio: 1,
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

function validSaveData(overrides?: Partial<RaptorSaveData>): RaptorSaveData {
  return {
    version: SAVE_FORMAT_VERSION,
    levelReached: 2,
    totalScore: 500,
    lives: 2,
    weapon: "machine-gun",
    savedAt: "2026-03-10T12:00:00.000Z",
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════
// SAVE SYSTEM UNIT TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: SaveSystem.save() and load() round-trip correctly", () => {
  test("save then load returns matching data", async () => {
    const data = validSaveData();
    await SaveSystem.save(data, 0);
    const loaded = await SaveSystem.load(0);
    expect(loaded).toEqual({ ...data, slotIndex: 0 });
  });

  test("save stores data under slot-specific key", async () => {
    const data = validSaveData();
    await SaveSystem.save(data, 0);
    expect(mockBackend.data["raptor_save_0"]).toBe(
      JSON.stringify({ ...data, slotIndex: 0 })
    );
  });
});

describe("Scenario: SaveSystem.clear() removes saved data", () => {
  test("hasSave returns false after clear", async () => {
    await SaveSystem.save(validSaveData(), 0);
    expect(await SaveSystem.hasSave(0)).toBe(true);
    await SaveSystem.clear(0);
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });

  test("load returns null after clear", async () => {
    await SaveSystem.save(validSaveData(), 0);
    await SaveSystem.clear(0);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: SaveSystem.hasSave() returns false when no save exists", () => {
  test("hasSave returns false with empty storage", async () => {
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Save data includes a version number for forward compatibility", () => {
  test("saved data has version field set to SAVE_FORMAT_VERSION", async () => {
    const data = validSaveData();
    await SaveSystem.save(data, 0);
    const loaded = await SaveSystem.load(0);
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
  });
});

describe("Scenario: Save data includes a timestamp", () => {
  test("saved data has a valid ISO-8601 savedAt field", async () => {
    const data = validSaveData();
    await SaveSystem.save(data, 0);
    const loaded = await SaveSystem.load(0);
    expect(loaded!.savedAt).toBeDefined();
    const parsed = new Date(loaded!.savedAt);
    expect(parsed.getTime()).not.toBeNaN();
  });
});

// ════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Corrupt save data is handled gracefully", () => {
  test("invalid JSON returns null from load", async () => {
    mockBackend.data["raptor_save_0"] = "not-json{{{";
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("invalid JSON causes hasSave to return false", async () => {
    mockBackend.data["raptor_save_0"] = "not-json{{{";
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });

  test("no error is thrown for corrupt data", async () => {
    mockBackend.data["raptor_save_0"] = "not-json{{{";
    await expect(SaveSystem.load(0)).resolves.toBeNull();
    await expect(SaveSystem.hasSave(0)).resolves.toBe(false);
  });
});

describe("Scenario: Save data with out-of-range level is rejected", () => {
  test("levelReached of 99 is invalid", async () => {
    const data = validSaveData({ levelReached: 99 } as any);
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });

  test("negative levelReached is invalid", async () => {
    const data = validSaveData({ levelReached: -1 } as any);
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Save data with zero or negative lives is rejected", () => {
  test("lives of 0 is invalid", async () => {
    const data = validSaveData({ lives: 0 } as any);
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });

  test("negative lives is invalid", async () => {
    const data = validSaveData({ lives: -1 } as any);
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Save data with unknown weapon type is rejected", () => {
  test("weapon 'plasma-cannon' is invalid", async () => {
    const data = { ...validSaveData(), weapon: "plasma-cannon" };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Save data with missing version field is rejected", () => {
  test("missing version returns null", async () => {
    const data = { ...validSaveData() } as any;
    delete data.version;
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });

  test("wrong version number returns null", async () => {
    const data = { ...validSaveData(), version: 99 } as any;
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Storage backend is unavailable", () => {
  test("save does not throw when storage backend is unavailable", async () => {
    setStorageBackend(new NoOpStorageBackend());
    await SaveSystem.save(validSaveData(), 0);
  });

  test("load returns null when storage backend is unavailable", async () => {
    setStorageBackend(new NoOpStorageBackend());
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("hasSave returns false when storage backend is unavailable", async () => {
    setStorageBackend(new NoOpStorageBackend());
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });

  test("clear does not throw when storage backend is unavailable", async () => {
    setStorageBackend(new NoOpStorageBackend());
    await SaveSystem.clear(0);
  });

  test("listSlots returns [null, null, null] when storage backend is unavailable", async () => {
    setStorageBackend(new NoOpStorageBackend());
    expect(await SaveSystem.listSlots()).toEqual([null, null, null]);
  });
});

// ════════════════════════════════════════════════════════════════
// VALIDATION EDGE CASES
// ════════════════════════════════════════════════════════════════

describe("Scenario: Additional validation edge cases", () => {
  test("valid data for each weapon type loads correctly", async () => {
    const weapons: WeaponType[] = ["machine-gun", "missile", "laser"];
    for (const weapon of weapons) {
      const data = validSaveData({ weapon });
      await SaveSystem.save(data, 0);
      const loaded = await SaveSystem.load(0);
      expect(loaded!.weapon).toBe(weapon);
    }
  });

  test("levelReached at max valid index (LEVELS.length - 1) is valid", async () => {
    const data = validSaveData({ levelReached: LEVELS.length - 1 });
    await SaveSystem.save(data, 0);
    expect(await SaveSystem.load(0)).not.toBeNull();
  });

  test("levelReached at 0 is valid", async () => {
    const data = validSaveData({ levelReached: 0 });
    await SaveSystem.save(data, 0);
    expect(await SaveSystem.load(0)).not.toBeNull();
  });

  test("non-integer levelReached is rejected", async () => {
    const data = { ...validSaveData(), levelReached: 1.5 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("non-integer lives is rejected", async () => {
    const data = { ...validSaveData(), lives: 2.5 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("negative totalScore is rejected", async () => {
    const data = { ...validSaveData(), totalScore: -100 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("empty savedAt string is rejected", async () => {
    const data = { ...validSaveData(), savedAt: "" };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("null data in storage returns null", async () => {
    mockBackend.data["raptor_save_0"] = "null";
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("levelReached values 5 through 11 are valid for the 12-level game", async () => {
    for (let level = 5; level <= 11; level++) {
      const data = validSaveData({ levelReached: level });
      await SaveSystem.save(data, 0);
      const loaded = await SaveSystem.load(0);
      expect(loaded).not.toBeNull();
      expect(loaded!.levelReached).toBe(level);
    }
  });

  test("levelReached of 20 (out of bounds) is rejected", async () => {
    const data = validSaveData({ levelReached: 20 } as any);
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// AUTO-SAVE INTEGRATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Progress is saved automatically when a level is completed", () => {
  test("completing a non-final level saves progress", async () => {
    const { game } = createPlayingGame();
    game.currentLevel = 1;
    game.totalScore = 200;
    game.score = 100;
    game.player.lives = 2;
    game.powerUpManager.setWeapon("missile");
    game.spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      game.spawner.update(0.1, 800);
    }
    game.spawner.spawnBoss(800);
    game.spawner.markBossDefeated();
    game.enemies = [];

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("level_complete");
    const saved = await SaveSystem.load(0);
    expect(saved).not.toBeNull();
    expect(saved!.levelReached).toBe(2);
    expect(saved!.totalScore).toBe(300);
    expect(saved!.lives).toBe(2);
    expect(saved!.weapon).toBe("missile");
    expect(saved!.version).toBe(SAVE_FORMAT_VERSION);
    expect(saved!.savedAt).toBeDefined();
  });
});

describe("Scenario: Save data is cleared on victory", () => {
  test("completing the final level clears save data", async () => {
    await SaveSystem.save(validSaveData(), 0);
    expect(await SaveSystem.hasSave(0)).toBe(true);

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
    await new Promise(r => setTimeout(r, 0));
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Save data is preserved on game over", () => {
  test("save data survives when player dies", async () => {
    await SaveSystem.save(validSaveData({ levelReached: 2 }), 0);

    const { game } = createPlayingGame();
    game.player.alive = false;
    game.state = "playing";

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("gameover");
    expect(await SaveSystem.hasSave(0)).toBe(true);
    expect((await SaveSystem.load(0))!.levelReached).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════
// CONTINUE & NEW GAME
// ════════════════════════════════════════════════════════════════

describe("Scenario: Clicking Continue resumes from the saved level", () => {
  test("continueGame restores saved state", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({
      levelReached: 3,
      totalScore: 500,
      lives: 2,
      weapon: "missile",
    }), 0);

    await (game as any).continueGame();

    expect(game.currentLevel).toBe(3);
    expect(game.totalScore).toBe(500);
    expect(game.player.lives).toBe(2);
    expect(game.powerUpManager.currentWeapon).toBe("missile");
    expect(game.player.alive).toBe(true);
  });

  test("continueGame falls back to resetGame when no save exists", async () => {
    const { game } = createPlayingGame();

    await (game as any).continueGame();

    expect(game.currentLevel).toBe(0);
    expect(game.totalScore).toBe(0);
    expect(game.player.lives).toBe(3);
  });
});

describe("Scenario: Starting a New Game clears existing save data", () => {
  test("new game from menu resets state and auto-saves at level 0", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({ levelReached: 3 }), 0);
    game.state = "menu";

    const newBtn = game.hud.isNewGameButtonHit;
    expect(typeof newBtn).toBe("function");

    await SaveSystem.clear(0);
    (game as any).resetGame();

    expect(game.currentLevel).toBe(0);
    expect(game.totalScore).toBe(0);
    expect(game.player.lives).toBe(3);
    const saved = await SaveSystem.load(0);
    expect(saved).not.toBeNull();
    expect(saved!.isAutoSave).toBe(true);
    expect(saved!.levelReached).toBe(0);
  });
});

describe("Scenario: Saved weapon type is restored on continue", () => {
  test("laser weapon is restored", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({ weapon: "laser" }), 0);
    await (game as any).continueGame();
    expect(game.powerUpManager.currentWeapon).toBe("laser");
  });

  test("missile weapon is restored", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({ weapon: "missile" }), 0);
    await (game as any).continueGame();
    expect(game.powerUpManager.currentWeapon).toBe("missile");
  });
});

// ════════════════════════════════════════════════════════════════
// MENU HUD RENDERING
// ════════════════════════════════════════════════════════════════

describe("Scenario: Menu shows a PLAY button", () => {
  test("menu renders PLAY button when save exists", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600, undefined, undefined, true);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasPlay = fillTextCalls.some((c: any) => c.text === "PLAY");
    expect(hasPlay).toBe(true);
  });
});

describe("Scenario: Menu shows PLAY button when no save exists", () => {
  test("menu renders PLAY button when no save exists", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600, undefined, undefined, false);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasPlay = fillTextCalls.some((c: any) => c.text === "PLAY");
    expect(hasPlay).toBe(true);
  });

  test("menu renders PLAY button on touch devices when no save exists", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(true);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600, undefined, undefined, false);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasPlay = fillTextCalls.some((c: any) => c.text === "PLAY");
    expect(hasPlay).toBe(true);
  });
});

describe("Scenario: Continue and New Game button hit tests", () => {
  test("isContinueButtonHit returns true for in-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const btn = (hud as any).getContinueButtonRect(800, 600);
    expect(hud.isContinueButtonHit(btn.x + btn.w / 2, btn.y + btn.h / 2, 800, 600)).toBe(true);
  });

  test("isContinueButtonHit returns false for out-of-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    expect(hud.isContinueButtonHit(0, 0, 800, 600)).toBe(false);
  });

  test("isNewGameButtonHit returns true for in-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const btn = (hud as any).getNewGameButtonRect(800, 600);
    expect(hud.isNewGameButtonHit(btn.x + btn.w / 2, btn.y + btn.h / 2, 800, 600)).toBe(true);
  });

  test("isNewGameButtonHit returns false for out-of-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    expect(hud.isNewGameButtonHit(0, 0, 800, 600)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// SETTINGS PANEL CLEAR SAVE
// ════════════════════════════════════════════════════════════════

describe("Scenario: Player can clear save data from the settings panel", () => {
  test("isClearSaveButtonHit returns true for in-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const btn = (hud as any).getClearSaveButtonRect(800, 600);
    expect(hud.isClearSaveButtonHit(btn.x + btn.w / 2, btn.y + btn.h / 2, 800, 600)).toBe(true);
  });

  test("isClearSaveButtonHit returns false for out-of-bounds click", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    expect(hud.isClearSaveButtonHit(0, 0, 800, 600)).toBe(false);
  });

  test("clear save removes data and menu no longer shows Continue", async () => {
    await SaveSystem.save(validSaveData(), 0);
    expect(await SaveSystem.hasSave(0)).toBe(true);
    await SaveSystem.clear(0);
    expect(await SaveSystem.hasSave(0)).toBe(false);

    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600, undefined, undefined, false);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasContinue = fillTextCalls.some((c: any) => c.text === "Continue");
    expect(hasContinue).toBe(false);
  });
});

describe("Scenario: Settings panel renders Clear Save button when save exists", () => {
  test("Clear Save button is rendered when hasSave is true", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.renderSettingsPanel(ctx, 800, 600, 0.5, 0.25, true);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasClearSave = fillTextCalls.some((c: any) => c.text === "Clear Save");
    expect(hasClearSave).toBe(true);
  });

  test("Clear Save button is not rendered when hasSave is false", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.renderSettingsPanel(ctx, 800, 600, 0.5, 0.25, false);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasClearSave = fillTextCalls.some((c: any) => c.text === "Clear Save");
    expect(hasClearSave).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// GAME hasSaveData GETTER
// ════════════════════════════════════════════════════════════════

describe("Scenario: RaptorGame exposes hasSaveData getter", () => {
  test("hasSaveData returns false when no save exists", async () => {
    const { game } = createPlayingGame();
    await (game as any).refreshSaveStatus();
    expect(game.hasSaveData).toBe(false);
  });

  test("hasSaveData returns true when a valid save exists", async () => {
    await SaveSystem.save(validSaveData(), 0);
    const { game } = createPlayingGame();
    await (game as any).refreshSaveStatus();
    expect(game.hasSaveData).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SAVE FORMAT VERSIONING & MIGRATION TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: SAVE_FORMAT_VERSION constant is exported from types", () => {
  test("SAVE_FORMAT_VERSION is a number equal to 4", () => {
    expect(typeof SAVE_FORMAT_VERSION).toBe("number");
    expect(SAVE_FORMAT_VERSION).toBe(4);
  });
});

describe("Scenario: SaveMigration interface is exported from types", () => {
  test("SaveMigration has the expected shape", () => {
    const migration: SaveMigration = {
      fromVersion: 1,
      toVersion: 2,
      migrate(data) {
        data.version = 2;
        return data;
      },
    };
    expect(migration.fromVersion).toBe(1);
    expect(migration.toVersion).toBe(2);
    expect(typeof migration.migrate).toBe("function");
  });
});

describe("Scenario: Loading a v1 save runs the v1→v2→v3→v4 migration", () => {
  test("v1 save is migrated to current version with HP values doubled", async () => {
    const v1Save = {
      version: 1,
      levelReached: 3,
      totalScore: 1200,
      lives: 2,
      weapon: "laser",
      savedAt: "2026-03-10T12:00:00.000Z",
      bombs: 3,
      shieldBattery: 50,
      armor: 80,
      energy: 60,
      weaponTier: 2,
      weaponInventory: { "machine-gun": 1, "laser": 2 },
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v1Save);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
    expect(loaded!.levelReached).toBe(3);
    expect(loaded!.totalScore).toBe(1200);
    expect(loaded!.lives).toBe(2);
    expect(loaded!.weapon).toBe("laser");
    expect(loaded!.bombs).toBe(3);
    expect(loaded!.shieldBattery).toBe(100);
    expect(loaded!.armor).toBe(160);
    expect(loaded!.energy).toBe(120);
    expect(loaded!.weaponTier).toBe(2);
    expect(loaded!.weaponInventory).toEqual({ "machine-gun": 1, "laser": 2 });
  });
});

describe("Scenario: A save at current version skips migrations", () => {
  test("current-version save loads without migration", async () => {
    const data = validSaveData();
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(data);
  });
});

describe("Scenario: Loading an unknown future version returns null", () => {
  test("version 99 returns null", async () => {
    const data = { ...validSaveData(), version: 99 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Loading a save with missing version returns null", () => {
  test("missing version field returns null", async () => {
    const data = { ...validSaveData() } as any;
    delete data.version;
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Loading a save with a non-integer version returns null", () => {
  test("version 1.5 returns null", async () => {
    const data = { ...validSaveData(), version: 1.5 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Loading a save with zero or negative version returns null", () => {
  test("version 0 returns null", async () => {
    const data = { ...validSaveData(), version: 0 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });

  test("version -1 returns null", async () => {
    const data = { ...validSaveData(), version: -1 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Migration that throws is handled gracefully", () => {
  test("exception in migration pipeline returns null from load", async () => {
    const corruptData = { version: 1, levelReached: "not-a-number" };
    mockBackend.data["raptor_save_0"] = JSON.stringify(corruptData);
    await expect(SaveSystem.load(0)).resolves.toBeNull();
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Saving always writes the current SAVE_FORMAT_VERSION", () => {
  test("saved data in backend has version equal to SAVE_FORMAT_VERSION", async () => {
    const data = validSaveData();
    await SaveSystem.save(data, 0);
    const raw = JSON.parse(mockBackend.data["raptor_save_0"]);
    expect(raw.version).toBe(SAVE_FORMAT_VERSION);
  });
});

describe("Scenario: hasSave with old and future versions", () => {
  test("hasSave returns true for a migratable v1 save", async () => {
    const v1Save = {
      version: 1,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v1Save);
    expect(await SaveSystem.hasSave(0)).toBe(true);
  });

  test("hasSave returns false for a future-version save", async () => {
    const data = { ...validSaveData(), version: 99 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: v1 saves with and without optional fields migrate correctly", () => {
  test("v1 save with optional fields has HP values doubled after migration", async () => {
    const v1Save = {
      version: 1,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
      bombs: 2,
      shieldBattery: 75,
      armor: 90,
      energy: 50,
      weaponTier: 3,
      weaponInventory: { "machine-gun": 1, "missile": 2 },
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v1Save);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
    expect(loaded!.bombs).toBe(2);
    expect(loaded!.shieldBattery).toBe(150);
    expect(loaded!.armor).toBe(180);
    expect(loaded!.energy).toBe(100);
    expect(loaded!.weaponTier).toBe(3);
    expect(loaded!.weaponInventory).toEqual({ "machine-gun": 1, "missile": 2 });
  });

  test("v1 save without optional fields migrates correctly", async () => {
    const v1Save = {
      version: 1,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v1Save);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
    expect(loaded!.bombs).toBeUndefined();
    expect(loaded!.shieldBattery).toBeUndefined();
    expect(loaded!.armor).toBeUndefined();
    expect(loaded!.energy).toBeUndefined();
    expect(loaded!.weaponTier).toBeUndefined();
    expect(loaded!.weaponInventory).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════
// MULTIPLE SAVE SLOTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: MAX_SAVE_SLOTS is exported and set to 3", () => {
  test("MAX_SAVE_SLOTS equals 3", () => {
    expect(MAX_SAVE_SLOTS).toBe(3);
  });
});

describe("Scenario: Saving to a slot stores data independently", () => {
  test("slots store and retrieve data independently", async () => {
    await SaveSystem.save(validSaveData({ levelReached: 3, totalScore: 500 }), 0);
    await SaveSystem.save(validSaveData({ levelReached: 1, totalScore: 100 }), 1);

    const slot0 = await SaveSystem.load(0);
    const slot1 = await SaveSystem.load(1);
    const slot2 = await SaveSystem.load(2);

    expect(slot0!.levelReached).toBe(3);
    expect(slot0!.totalScore).toBe(500);
    expect(slot1!.levelReached).toBe(1);
    expect(slot1!.totalScore).toBe(100);
    expect(slot2).toBeNull();
  });
});

describe("Scenario: Each slot uses its own storage key", () => {
  test("saving to slot 0 only writes raptor_save_0", async () => {
    await SaveSystem.save(validSaveData(), 0);
    expect(mockBackend.data["raptor_save_0"]).toBeDefined();
    expect(mockBackend.data["raptor_save_1"]).toBeUndefined();
    expect(mockBackend.data["raptor_save_2"]).toBeUndefined();
  });
});

describe("Scenario: Saving to slot 1 does not affect slot 0", () => {
  test("slot 0 is unaffected by writing slot 1", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 500 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 999 }), 1);
    expect((await SaveSystem.load(0))!.totalScore).toBe(500);
  });
});

describe("Scenario: Saving stamps the slotIndex field on the data", () => {
  test("slotIndex matches the slot parameter", async () => {
    await SaveSystem.save(validSaveData(), 2);
    expect((await SaveSystem.load(2))!.slotIndex).toBe(2);
  });
});

describe("Scenario: hasSave checks only the specified slot", () => {
  test("hasSave is slot-specific", async () => {
    await SaveSystem.save(validSaveData(), 0);
    expect(await SaveSystem.hasSave(0)).toBe(true);
    expect(await SaveSystem.hasSave(1)).toBe(false);
    expect(await SaveSystem.hasSave(2)).toBe(false);
  });
});

describe("Scenario: Clearing one slot does not affect others", () => {
  test("clearing slot 1 preserves slots 0 and 2", async () => {
    await SaveSystem.save(validSaveData(), 0);
    await SaveSystem.save(validSaveData(), 1);
    await SaveSystem.save(validSaveData(), 2);

    await SaveSystem.clear(1);

    expect(await SaveSystem.hasSave(0)).toBe(true);
    expect(await SaveSystem.hasSave(1)).toBe(false);
    expect(await SaveSystem.hasSave(2)).toBe(true);
  });
});

describe("Scenario: Loading a cleared slot returns null", () => {
  test("load returns null after clearing", async () => {
    await SaveSystem.save(validSaveData(), 0);
    await SaveSystem.clear(0);
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: listSlots returns metadata for all slots", () => {
  test("listSlots reflects populated and empty slots", async () => {
    await SaveSystem.save(validSaveData({ levelReached: 3 }), 0);
    await SaveSystem.save(validSaveData({ levelReached: 7 }), 2);

    const result = await SaveSystem.listSlots();
    expect(result).toHaveLength(3);
    expect(result[0]!.levelReached).toBe(3);
    expect(result[1]).toBeNull();
    expect(result[2]!.levelReached).toBe(7);
  });

  test("listSlots returns all nulls when no saves exist", async () => {
    expect(await SaveSystem.listSlots()).toEqual([null, null, null]);
  });
});

describe("Scenario: Invalid slot index is rejected gracefully", () => {
  test("save to slot -1 is a no-op", async () => {
    await SaveSystem.save(validSaveData(), -1);
    expect(Object.keys(mockBackend.data)).toHaveLength(0);
  });

  test("save to slot 3 is a no-op", async () => {
    await SaveSystem.save(validSaveData(), 3);
    expect(Object.keys(mockBackend.data)).toHaveLength(0);
  });

  test("load from slot 1.5 returns null", async () => {
    expect(await SaveSystem.load(1.5)).toBeNull();
  });

  test("hasSave for slot 99 returns false", async () => {
    expect(await SaveSystem.hasSave(99)).toBe(false);
  });

  test("clear for invalid slot is a no-op", async () => {
    await SaveSystem.save(validSaveData(), 0);
    await SaveSystem.clear(-1);
    expect(await SaveSystem.hasSave(0)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// LEGACY MIGRATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Existing single-key save is migrated to slot 0", () => {
  test("legacy raptor_save is migrated to raptor_save_0 and removed", async () => {
    mockBackend.data["raptor_save"] = JSON.stringify(validSaveData());

    expect(await SaveSystem.hasSave(0)).toBe(true);
    expect(mockBackend.data["raptor_save_0"]).toBeDefined();
    expect(mockBackend.data["raptor_save"]).toBeUndefined();
  });
});

describe("Scenario: Legacy migration does not overwrite existing slot 0", () => {
  test("slot 0 data takes precedence over legacy key", async () => {
    mockBackend.data["raptor_save"] = JSON.stringify(validSaveData({ levelReached: 1 }));
    mockBackend.data["raptor_save_0"] = JSON.stringify(validSaveData({ levelReached: 5 }));

    const loaded = await SaveSystem.load(0);
    expect(loaded!.levelReached).toBe(5);
    expect(mockBackend.data["raptor_save"]).toBeDefined();
  });
});

describe("Scenario: Legacy migration runs only once per session", () => {
  test("migration logic executes only on the first call", async () => {
    mockBackend.data["raptor_save"] = JSON.stringify(validSaveData());

    const getSpy = jest.spyOn(mockBackend, 'get');

    await SaveSystem.hasSave(0);
    const legacyReads1 = getSpy.mock.calls
      .filter((c: string[]) => c[0] === "raptor_save").length;

    getSpy.mockClear();

    await SaveSystem.hasSave(0);
    const legacyReads2 = getSpy.mock.calls
      .filter((c: string[]) => c[0] === "raptor_save").length;

    expect(legacyReads1).toBeGreaterThan(0);
    expect(legacyReads2).toBe(0);

    getSpy.mockRestore();
  });
});

describe("Scenario: Legacy migration with corrupt data copies verbatim and load rejects it", () => {
  test("corrupt legacy data is migrated but load returns null", async () => {
    mockBackend.data["raptor_save"] = "not-valid-json{{{";

    await expect(SaveSystem.load(0)).resolves.toBeNull();
    expect(await SaveSystem.load(0)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════
// RAPTORGAME ACTIVE SLOT TRACKING
// ════════════════════════════════════════════════════════════════

describe("Scenario: RaptorGame defaults to active slot 0", () => {
  test("activeSlot is 0 by default", () => {
    const { game } = createPlayingGame();
    expect(game.saveSlot).toBe(0);
  });
});

describe("Scenario: RaptorGame passes activeSlot to SaveSystem on level complete", () => {
  test("SaveSystem.save is called with the active slot", async () => {
    const { game } = createPlayingGame();
    game.saveSlot = 1;
    game.currentLevel = 1;
    game.totalScore = 200;
    game.score = 100;
    game.player.lives = 2;
    game.spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      game.spawner.update(0.1, 800);
    }
    game.spawner.spawnBoss(800);
    game.spawner.markBossDefeated();
    game.enemies = [];

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("level_complete");
    expect(await SaveSystem.hasSave(1)).toBe(true);
    expect(await SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: RaptorGame passes activeSlot to SaveSystem.load on continue", () => {
  test("continueGame loads from the active slot", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({ levelReached: 5, totalScore: 999 }), 2);
    game.saveSlot = 2;

    await (game as any).continueGame();

    expect(game.currentLevel).toBe(5);
    expect(game.totalScore).toBe(999);
  });
});

describe("Scenario: RaptorGame passes activeSlot to SaveSystem.clear on New Game", () => {
  test("new game clears old save and auto-saves fresh state to active slot", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({ levelReached: 5 }), 1);
    game.saveSlot = 1;
    game.state = "menu";

    await SaveSystem.clear(game.saveSlot);
    (game as any).resetGame();

    const saved = await SaveSystem.load(1);
    expect(saved).not.toBeNull();
    expect(saved!.isAutoSave).toBe(true);
    expect(saved!.levelReached).toBe(0);
  });
});

describe("Scenario: RaptorGame passes activeSlot to SaveSystem.hasSave in hasSaveData getter", () => {
  test("hasSaveData checks the active slot", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData(), 1);

    game.saveSlot = 0;
    await (game as any).refreshSaveStatus();
    expect(game.hasSaveData).toBe(false);

    game.saveSlot = 1;
    await (game as any).refreshSaveStatus();
    expect(game.hasSaveData).toBe(true);
  });
});

describe("Scenario: RaptorGame saveSlot setter validates input", () => {
  test("invalid slot values are ignored", () => {
    const { game } = createPlayingGame();
    game.saveSlot = -1;
    expect(game.saveSlot).toBe(0);

    game.saveSlot = 3;
    expect(game.saveSlot).toBe(0);

    game.saveSlot = 1.5;
    expect(game.saveSlot).toBe(0);

    game.saveSlot = 2;
    expect(game.saveSlot).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════
// FULL ROUND-TRIP INDEPENDENCE
// ════════════════════════════════════════════════════════════════

describe("Scenario: Full round-trip independence across all three slots", () => {
  test("three slots store and retrieve independent data", async () => {
    await SaveSystem.save(validSaveData({ levelReached: 2, lives: 3, weapon: "machine-gun" }), 0);
    await SaveSystem.save(validSaveData({ levelReached: 5, lives: 1, weapon: "laser" }), 1);
    await SaveSystem.save(validSaveData({ levelReached: 8, lives: 2, weapon: "missile" }), 2);

    const s0 = (await SaveSystem.load(0))!;
    const s1 = (await SaveSystem.load(1))!;
    const s2 = (await SaveSystem.load(2))!;

    expect(s0.levelReached).toBe(2);
    expect(s0.lives).toBe(3);
    expect(s0.weapon).toBe("machine-gun");

    expect(s1.levelReached).toBe(5);
    expect(s1.lives).toBe(1);
    expect(s1.weapon).toBe("laser");

    expect(s2.levelReached).toBe(8);
    expect(s2.lives).toBe(2);
    expect(s2.weapon).toBe("missile");
  });
});

describe("Scenario: Overwriting a slot replaces only that slot's data", () => {
  test("overwriting slot 1 does not affect other slots", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 1);

    await SaveSystem.save(validSaveData({ totalScore: 999 }), 1);

    expect((await SaveSystem.load(1))!.totalScore).toBe(999);
    expect((await SaveSystem.load(0))!.totalScore).toBe(100);
  });
});

// ════════════════════════════════════════════════════════════════
// AUTO-SAVE SYSTEM TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: SaveSystem.autoSave sets isAutoSave flag", () => {
  test("autoSave sets isAutoSave to true on saved data", async () => {
    const data = validSaveData();
    await SaveSystem.autoSave(0, data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.isAutoSave).toBe(true);
  });

  test("autoSave delegates to save (same slot, same key)", async () => {
    const data = validSaveData();
    await SaveSystem.autoSave(1, data);
    expect(mockBackend.data["raptor_save_1"]).toBeDefined();
    const loaded = await SaveSystem.load(1);
    expect(loaded!.slotIndex).toBe(1);
  });
});

describe("Scenario: Validation accepts and sanitizes new optional fields", () => {
  test("validation accepts isAutoSave: true", async () => {
    const data = validSaveData({ isAutoSave: true });
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.isAutoSave).toBe(true);
  });

  test("validation accepts isAutoSave: false", async () => {
    const data = validSaveData({ isAutoSave: false });
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.isAutoSave).toBe(false);
  });

  test("validation sanitizes non-boolean isAutoSave to undefined", async () => {
    const data = { ...validSaveData(), isAutoSave: "yes" };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.isAutoSave).toBeUndefined();
  });

  test("validation accepts valid waveIndex (non-negative integer)", async () => {
    const data = validSaveData({ waveIndex: 3 });
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.waveIndex).toBe(3);
  });

  test("validation accepts waveIndex: 0", async () => {
    const data = validSaveData({ waveIndex: 0 });
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.waveIndex).toBe(0);
  });

  test("validation sanitizes waveIndex: -1 to undefined", async () => {
    const data = { ...validSaveData(), waveIndex: -1 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.waveIndex).toBeUndefined();
  });

  test("validation sanitizes waveIndex: 1.5 to undefined", async () => {
    const data = { ...validSaveData(), waveIndex: 1.5 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.waveIndex).toBeUndefined();
  });

  test("validation accepts playTimeSeconds: 0", async () => {
    const data = validSaveData({ playTimeSeconds: 0 });
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.playTimeSeconds).toBe(0);
  });

  test("validation accepts positive playTimeSeconds", async () => {
    const data = validSaveData({ playTimeSeconds: 120.5 });
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.playTimeSeconds).toBe(120.5);
  });

  test("validation sanitizes negative playTimeSeconds to undefined", async () => {
    const data = { ...validSaveData(), playTimeSeconds: -10 };
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.playTimeSeconds).toBeUndefined();
  });

  test("saves without new fields load correctly (backward compat)", async () => {
    const data = validSaveData();
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.isAutoSave).toBeUndefined();
    expect(loaded!.waveIndex).toBeUndefined();
    expect(loaded!.playTimeSeconds).toBeUndefined();
  });

  test("validation accepts save data with all three new valid fields", async () => {
    const data = validSaveData({ isAutoSave: true, waveIndex: 3, playTimeSeconds: 120.5 });
    mockBackend.data["raptor_save_0"] = JSON.stringify(data);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.isAutoSave).toBe(true);
    expect(loaded!.waveIndex).toBe(3);
    expect(loaded!.playTimeSeconds).toBe(120.5);
  });
});

// ════════════════════════════════════════════════════════════════
// ENEMY SPAWNER WAVE TRACKING
// ════════════════════════════════════════════════════════════════

describe("Scenario: EnemySpawner completedWaveCount tracking", () => {
  test("completedWaveCount returns 0 before any waves complete", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);
    expect(spawner.completedWaveCount).toBe(0);
  });

  test("completedWaveCount increments as waves complete", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 50; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.completedWaveCount).toBeGreaterThan(0);
  });

  test("completedWaveCount equals total wave count when all waves are done", () => {
    const spawner = new EnemySpawner();
    const level = LEVELS[0];
    spawner.configure(level);

    for (let t = 0; t < 200; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.completedWaveCount).toBe(level.waves.length);
    expect(spawner.allWavesComplete).toBe(true);
  });

  test("shouldSpawnBoss still works correctly after refactor", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    expect(spawner.shouldSpawnBoss()).toBe(false);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.shouldSpawnBoss()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// RAPTORGAME AUTO-SAVE INTEGRATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Auto-save triggers at level start", () => {
  test("auto-save exists with isAutoSave: true after startLevel", async () => {
    const { game } = createPlayingGame();
    game.currentLevel = 0;
    (game as any).startLevel(3);

    const saved = await SaveSystem.load(0);
    expect(saved).not.toBeNull();
    expect(saved!.isAutoSave).toBe(true);
    expect(saved!.levelReached).toBe(3);
  });

  test("auto-save at level start has waveIndex: 0", async () => {
    const { game } = createPlayingGame();
    (game as any).startLevel(2);

    const saved = await SaveSystem.load(0);
    expect(saved).not.toBeNull();
    expect(saved!.waveIndex).toBe(0);
  });

  test("auto-save at level start has playTimeSeconds in save data", async () => {
    const { game } = createPlayingGame();
    (game as any).playTimeSeconds = 120;
    (game as any).startLevel(1);

    const saved = await SaveSystem.load(0);
    expect(saved).not.toBeNull();
    expect(saved!.playTimeSeconds).toBe(120);
  });

  test("auto-save at level 0 on new game", async () => {
    const { game } = createPlayingGame();
    (game as any).resetGame();

    const saved = await SaveSystem.load(0);
    expect(saved).not.toBeNull();
    expect(saved!.isAutoSave).toBe(true);
    expect(saved!.levelReached).toBe(0);
  });
});

describe("Scenario: Between-wave checkpoint auto-save", () => {
  test("auto-save fires when wave completes and throttle permits", async () => {
    const { game } = createPlayingGame();
    game.currentLevel = 0;
    (game as any).startLevel(0);
    await SaveSystem.clear(0);

    (game as any).levelElapsed = 35;
    (game as any).lastAutoSaveTime = 0;
    (game as any).lastCompletedWaveCount = 0;

    for (let t = 0; t < 50; t += 0.1) {
      game.spawner.update(0.1, 800);
    }

    const wavesBefore = game.spawner.completedWaveCount;
    if (wavesBefore > 0) {
      (game as any).updatePlaying(0.001);
      const saved = await SaveSystem.load(0);
      expect(saved).not.toBeNull();
      expect(saved!.isAutoSave).toBe(true);
      expect(saved!.waveIndex).toBe(wavesBefore);
    }
  });

  test("auto-save is suppressed when throttle interval has not elapsed", async () => {
    const { game } = createPlayingGame();
    game.currentLevel = 0;
    (game as any).startLevel(0);
    await new Promise(r => setTimeout(r, 0));
    await SaveSystem.clear(0);

    (game as any).levelElapsed = 10;
    (game as any).lastAutoSaveTime = 5;
    (game as any).lastCompletedWaveCount = 0;

    for (let t = 0; t < 50; t += 0.1) {
      game.spawner.update(0.1, 800);
    }

    (game as any).updatePlaying(0.001);
    const saved = await SaveSystem.load(0);
    expect(saved).toBeNull();
  });
});

describe("Scenario: Level-complete save does not have isAutoSave flag", () => {
  test("level-complete save has isAutoSave undefined", async () => {
    const { game } = createPlayingGame();
    game.currentLevel = 1;
    game.totalScore = 200;
    game.score = 100;
    game.player.lives = 2;
    game.spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      game.spawner.update(0.1, 800);
    }
    game.spawner.spawnBoss(800);
    game.spawner.markBossDefeated();
    game.enemies = [];

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("level_complete");
    const saved = await SaveSystem.load(0);
    expect(saved).not.toBeNull();
    expect(saved!.isAutoSave).toBeUndefined();
    expect(saved!.levelReached).toBe(2);
  });
});

describe("Scenario: buildSaveData produces correct payload", () => {
  test("buildSaveData contains all expected fields", () => {
    const { game } = createPlayingGame();
    game.currentLevel = 2;
    game.totalScore = 500;
    game.player.lives = 2;
    game.player.bombs = 3;
    game.player.shieldBattery = 50;
    game.player.armor = 80;
    game.player.energy = 60;
    (game as any).playTimeSeconds = 120;
    game.powerUpManager.setWeapon("laser");

    const data = (game as any).buildSaveData();

    expect(data.version).toBe(SAVE_FORMAT_VERSION);
    expect(data.levelReached).toBe(2);
    expect(data.totalScore).toBe(500);
    expect(data.lives).toBe(2);
    expect(data.weapon).toBe("laser");
    expect(data.savedAt).toBeDefined();
    expect(data.bombs).toBe(3);
    expect(data.shieldBattery).toBe(50);
    expect(data.armor).toBe(80);
    expect(data.energy).toBe(60);
    expect(data.playTimeSeconds).toBe(120);
    expect(data.weaponInventory).toBeDefined();
  });

  test("buildSaveData accepts overrides", () => {
    const { game } = createPlayingGame();
    game.currentLevel = 2;

    const data = (game as any).buildSaveData({ levelReached: 3 });

    expect(data.levelReached).toBe(3);
    expect(data.totalScore).toBe(game.totalScore);
  });
});

describe("Scenario: playTimeSeconds tracking", () => {
  test("playTimeSeconds accumulates during updatePlaying", () => {
    const { game } = createPlayingGame();
    (game as any).playTimeSeconds = 0;
    game.currentLevel = 0;
    (game as any).startLevel(0);
    (game as any).playTimeSeconds = 0;

    for (let i = 0; i < 100; i++) {
      (game as any).updatePlaying(0.1);
    }

    expect((game as any).playTimeSeconds).toBeCloseTo(10, 0);
  });

  test("playTimeSeconds is restored by continueGame", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({ playTimeSeconds: 300 }), 0);

    await (game as any).continueGame();

    expect((game as any).playTimeSeconds).toBe(300);
  });

  test("playTimeSeconds defaults to 0 for old saves without the field", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData(), 0);

    await (game as any).continueGame();

    expect((game as any).playTimeSeconds).toBe(0);
  });

  test("playTimeSeconds is reset to 0 by resetGame", () => {
    const { game } = createPlayingGame();
    (game as any).playTimeSeconds = 200;

    (game as any).resetGame();

    expect((game as any).playTimeSeconds).toBe(0);
  });
});

describe("Scenario: Auto-save failure does not crash the game", () => {
  test("game continues when storage backend fails", async () => {
    const failingBackend: StorageBackend = {
      async get(): Promise<string | null> { return null; },
      async set(): Promise<void> { throw new Error("storage full"); },
      async remove(): Promise<void> { },
    };

    const { game } = createPlayingGame();
    setStorageBackend(failingBackend);

    expect(() => {
      (game as any).startLevel(0);
    }).not.toThrow();
  });
});

describe("Scenario: Loading an auto-save resumes at the beginning of the saved level", () => {
  test("continueGame starts at the saved level with restored state", async () => {
    const { game } = createPlayingGame();
    await SaveSystem.save(validSaveData({
      isAutoSave: true,
      levelReached: 3,
      waveIndex: 2,
      totalScore: 500,
      lives: 2,
      weapon: "missile",
      playTimeSeconds: 150,
    }), 0);

    await (game as any).continueGame();

    expect(game.currentLevel).toBe(3);
    expect(game.totalScore).toBe(500);
    expect(game.player.lives).toBe(2);
    expect(game.powerUpManager.currentWeapon).toBe("missile");
    expect((game as any).playTimeSeconds).toBe(150);
  });
});

// ════════════════════════════════════════════════════════════════
// CHECKSUM & BACKUP SAVE INTEGRITY TESTS
// ════════════════════════════════════════════════════════════════

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

describe("Scenario: save() stores checksum in saved data", () => {
  test("saved data contains a checksum field that is an 8-char hex string", async () => {
    await SaveSystem.save(validSaveData(), 0);
    const raw = JSON.parse(mockBackend.data["raptor_save_0"]);
    expect(raw.checksum).toBeDefined();
    expect(raw.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  test("checksum matches FNV-1a hash of payload without checksum", async () => {
    await SaveSystem.save(validSaveData(), 0);
    const raw = JSON.parse(mockBackend.data["raptor_save_0"]);
    const storedChecksum = raw.checksum;
    delete raw.checksum;
    const expected = fnv1aHash(JSON.stringify(raw));
    expect(storedChecksum).toBe(expected);
  });
});

describe("Scenario: load() accepts valid checksum", () => {
  test("save then load returns data correctly with checksum", async () => {
    const data = validSaveData();
    await SaveSystem.save(data, 0);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.levelReached).toBe(data.levelReached);
    expect(loaded!.totalScore).toBe(data.totalScore);
    expect(loaded!.weapon).toBe(data.weapon);
  });
});

describe("Scenario: load() rejects corrupted data and falls back to backup", () => {
  test("corrupted primary falls back to backup data", async () => {
    const dataA = validSaveData({ totalScore: 100 });
    const dataB = validSaveData({ totalScore: 200 });
    await SaveSystem.save(dataA, 0);
    await SaveSystem.save(dataB, 0);

    const parsed = JSON.parse(mockBackend.data["raptor_save_0"]);
    parsed.checksum = "deadbeef";
    mockBackend.data["raptor_save_0"] = JSON.stringify(parsed);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.totalScore).toBe(100);
  });
});

describe("Scenario: load() returns null when both primary and backup are corrupted", () => {
  test("both corrupted returns null", async () => {
    const dataA = validSaveData({ totalScore: 100 });
    const dataB = validSaveData({ totalScore: 200 });
    await SaveSystem.save(dataA, 0);
    await SaveSystem.save(dataB, 0);

    const primary = JSON.parse(mockBackend.data["raptor_save_0"]);
    primary.checksum = "deadbeef";
    mockBackend.data["raptor_save_0"] = JSON.stringify(primary);

    const backup = JSON.parse(mockBackend.data["raptor_save_0_backup"]);
    backup.checksum = "cafebabe";
    mockBackend.data["raptor_save_0_backup"] = JSON.stringify(backup);

    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: load() accepts legacy save without checksum", () => {
  test("legacy save without checksum field loads correctly", async () => {
    const legacy = {
      version: SAVE_FORMAT_VERSION,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(legacy);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.levelReached).toBe(2);
    expect(loaded!.totalScore).toBe(500);
  });

  test("v1 save without checksum migrates and loads", async () => {
    const v1Save = {
      version: 1,
      levelReached: 3,
      totalScore: 1200,
      lives: 2,
      weapon: "laser",
      savedAt: "2026-03-10T12:00:00.000Z",
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v1Save);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
    expect(loaded!.levelReached).toBe(3);
  });
});

describe("Scenario: load() rejects data with wrong checksum", () => {
  test("tampered checksum falls back to backup", async () => {
    const dataA = validSaveData({ totalScore: 100 });
    const dataB = validSaveData({ totalScore: 200 });
    await SaveSystem.save(dataA, 0);
    await SaveSystem.save(dataB, 0);

    const primary = JSON.parse(mockBackend.data["raptor_save_0"]);
    primary.checksum = "00000000";
    mockBackend.data["raptor_save_0"] = JSON.stringify(primary);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.totalScore).toBe(100);
  });

  test("tampered checksum with no backup returns null", async () => {
    await SaveSystem.save(validSaveData(), 0);

    const primary = JSON.parse(mockBackend.data["raptor_save_0"]);
    primary.checksum = "00000000";
    mockBackend.data["raptor_save_0"] = JSON.stringify(primary);

    expect(await SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: save() creates backup of previous save", () => {
  test("second save creates backup containing first save's data", async () => {
    const dataA = validSaveData({ totalScore: 100 });
    await SaveSystem.save(dataA, 0);
    const firstSaveRaw = mockBackend.data["raptor_save_0"];

    const dataB = validSaveData({ totalScore: 200 });
    await SaveSystem.save(dataB, 0);

    expect(mockBackend.data["raptor_save_0_backup"]).toBe(firstSaveRaw);
  });

  test("first save does not create a backup", async () => {
    await SaveSystem.save(validSaveData(), 0);
    expect(mockBackend.data["raptor_save_0_backup"]).toBeUndefined();
  });
});

describe("Scenario: autoSave also creates a backup", () => {
  test("auto-save creates backup of previous save", async () => {
    const dataA = validSaveData({ totalScore: 100 });
    await SaveSystem.save(dataA, 0);
    const firstSaveRaw = mockBackend.data["raptor_save_0"];

    const dataB = validSaveData({ totalScore: 200 });
    await SaveSystem.autoSave(0, dataB);

    expect(mockBackend.data["raptor_save_0_backup"]).toBe(firstSaveRaw);
  });
});

describe("Scenario: clear() removes both primary and backup", () => {
  test("clear removes primary and backup keys", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    expect(mockBackend.data["raptor_save_0"]).toBeDefined();
    expect(mockBackend.data["raptor_save_0_backup"]).toBeDefined();

    await SaveSystem.clear(0);

    expect(mockBackend.data["raptor_save_0"]).toBeUndefined();
    expect(mockBackend.data["raptor_save_0_backup"]).toBeUndefined();
  });
});

describe("Scenario: restoreFromBackup()", () => {
  test("returns backup data when backup exists", async () => {
    const dataA = validSaveData({ totalScore: 100 });
    await SaveSystem.save(dataA, 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const restored = await SaveSystem.restoreFromBackup(0);
    expect(restored).not.toBeNull();
    expect(restored!.totalScore).toBe(100);
  });

  test("returns null when no backup exists", async () => {
    expect(await SaveSystem.restoreFromBackup(0)).toBeNull();
  });

  test("returns null when backup is corrupted", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const backup = JSON.parse(mockBackend.data["raptor_save_0_backup"]);
    backup.checksum = "deadbeef";
    mockBackend.data["raptor_save_0_backup"] = JSON.stringify(backup);

    expect(await SaveSystem.restoreFromBackup(0)).toBeNull();
  });

  test("does not overwrite the primary key", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const primaryBefore = mockBackend.data["raptor_save_0"];
    await SaveSystem.restoreFromBackup(0);

    expect(mockBackend.data["raptor_save_0"]).toBe(primaryBefore);
  });
});

describe("Scenario: hasSave() with checksum integrity checks", () => {
  test("returns true with valid checksum", async () => {
    await SaveSystem.save(validSaveData(), 0);
    expect(await SaveSystem.hasSave(0)).toBe(true);
  });

  test("falls back to backup on corrupted primary", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const primary = JSON.parse(mockBackend.data["raptor_save_0"]);
    primary.checksum = "deadbeef";
    mockBackend.data["raptor_save_0"] = JSON.stringify(primary);

    expect(await SaveSystem.hasSave(0)).toBe(true);
  });

  test("returns false when both primary and backup are corrupted", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const primary = JSON.parse(mockBackend.data["raptor_save_0"]);
    primary.checksum = "deadbeef";
    mockBackend.data["raptor_save_0"] = JSON.stringify(primary);

    const backup = JSON.parse(mockBackend.data["raptor_save_0_backup"]);
    backup.checksum = "cafebabe";
    mockBackend.data["raptor_save_0_backup"] = JSON.stringify(backup);

    expect(await SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Backup write failure does not prevent primary save", () => {
  test("primary save succeeds even when backup write fails", async () => {
    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);

    const originalSet = mockBackend.set.bind(mockBackend);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(mockBackend, "set").mockImplementation(async (key: string, value: string) => {
      if (key === "raptor_save_0_backup") {
        throw new Error("storage full");
      }
      return originalSet(key, value);
    });

    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.totalScore).toBe(200);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("failed to write backup")
    );

    warnSpy.mockRestore();
  });
});

describe("Scenario: No infinite loop on double corruption", () => {
  test("returns null in bounded time when both primary and backup are corrupted", async () => {
    mockBackend.data["raptor_save_0"] = "corrupted{{{not-json";
    mockBackend.data["raptor_save_0_backup"] = "also-corrupted{{{";

    const start = Date.now();
    const result = await SaveSystem.load(0);
    const elapsed = Date.now() - start;

    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(1000);
  });
});

describe("Scenario: Checksum warnings are logged appropriately", () => {
  test("logs warning on checksum mismatch with backup recovery", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const primary = JSON.parse(mockBackend.data["raptor_save_0"]);
    primary.checksum = "deadbeef";
    mockBackend.data["raptor_save_0"] = JSON.stringify(primary);

    await SaveSystem.load(0);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("checksum mismatch")
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("recovered from backup")
    );

    warnSpy.mockRestore();
  });

  test("logs unrecoverable warning when both are corrupted", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    await SaveSystem.save(validSaveData({ totalScore: 200 }), 0);

    const primary = JSON.parse(mockBackend.data["raptor_save_0"]);
    primary.checksum = "deadbeef";
    mockBackend.data["raptor_save_0"] = JSON.stringify(primary);

    const backup = JSON.parse(mockBackend.data["raptor_save_0_backup"]);
    backup.checksum = "cafebabe";
    mockBackend.data["raptor_save_0_backup"] = JSON.stringify(backup);

    await SaveSystem.load(0);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("backup also corrupted")
    );

    warnSpy.mockRestore();
  });
});

// ════════════════════════════════════════════════════════════════
// ISSUE 745: HP AND SHIELDS DOUBLED (v3 → v4 MIGRATION)
// ════════════════════════════════════════════════════════════════

describe("Scenario: Legacy v3 save is migrated correctly (v3→v4)", () => {
  test("v3 save with armor 80, energy 60, shieldBattery 40 doubles to 160, 120, 80", async () => {
    const v3Save = {
      version: 3,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
      armor: 80,
      energy: 60,
      shieldBattery: 40,
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v3Save);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(4);
    expect(loaded!.armor).toBe(160);
    expect(loaded!.energy).toBe(120);
    expect(loaded!.shieldBattery).toBe(80);
  });

  test("v3 save with max values (100) migrates to 200 without overflow", async () => {
    const v3Save = {
      version: 3,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
      armor: 100,
      energy: 100,
      shieldBattery: 100,
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v3Save);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.armor).toBe(200);
    expect(loaded!.energy).toBe(200);
    expect(loaded!.shieldBattery).toBe(200);
  });

  test("v3 save without HP fields migrates without errors", async () => {
    const v3Save = {
      version: 3,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
    };
    mockBackend.data["raptor_save_0"] = JSON.stringify(v3Save);

    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(4);
    expect(loaded!.armor).toBeUndefined();
    expect(loaded!.energy).toBeUndefined();
    expect(loaded!.shieldBattery).toBeUndefined();
  });
});

describe("Scenario: Player max values are doubled", () => {
  test("player starts with 200 armor and 200 energy", () => {
    const { Player } = require("../src/games/raptor/entities/Player");
    const player = new Player(800, 600);
    expect(player.armor).toBe(200);
    expect(player.maxArmor).toBe(200);
    expect(player.energy).toBe(200);
    expect(player.maxEnergy).toBe(200);
    expect(player.maxShieldBattery).toBe(200);
  });

  test("player reset restores to 200 armor and 200 energy", () => {
    const { Player } = require("../src/games/raptor/entities/Player");
    const player = new Player(800, 600);
    player.armor = 50;
    player.energy = 30;
    player.reset(800, 600);
    expect(player.armor).toBe(200);
    expect(player.energy).toBe(200);
  });
});

describe("Scenario: Save and load preserves new HP values", () => {
  test("saving 150 armor and 120 energy round-trips correctly", async () => {
    const data = validSaveData({ armor: 150, energy: 120 });
    await SaveSystem.save(data, 0);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.armor).toBe(150);
    expect(loaded!.energy).toBe(120);
  });

  test("saving 200 armor and 200 energy round-trips correctly", async () => {
    const data = validSaveData({ armor: 200, energy: 200, shieldBattery: 200 });
    await SaveSystem.save(data, 0);
    const loaded = await SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.armor).toBe(200);
    expect(loaded!.energy).toBe(200);
    expect(loaded!.shieldBattery).toBe(200);
  });
});

describe("Scenario: Enemy weapon damage values remain unchanged", () => {
  test("standard enemy weapon deals 25 damage", () => {
    const { ENEMY_WEAPON_CONFIGS } = require("../src/games/raptor/types");
    expect(ENEMY_WEAPON_CONFIGS.standard.damage).toBe(25);
  });

  test("spread enemy weapon deals 15 damage", () => {
    const { ENEMY_WEAPON_CONFIGS } = require("../src/games/raptor/types");
    expect(ENEMY_WEAPON_CONFIGS.spread.damage).toBe(15);
  });

  test("missile enemy weapon deals 40 damage", () => {
    const { ENEMY_WEAPON_CONFIGS } = require("../src/games/raptor/types");
    expect(ENEMY_WEAPON_CONFIGS.missile.damage).toBe(40);
  });

  test("laser enemy weapon deals 10 DPS", () => {
    const { ENEMY_WEAPON_CONFIGS } = require("../src/games/raptor/types");
    expect(ENEMY_WEAPON_CONFIGS.laser.damage).toBe(10);
  });
});
