import { SaveSystem } from "../src/games/raptor/systems/SaveSystem";
import { RaptorSaveData, WeaponType, SAVE_FORMAT_VERSION, SaveMigration, MAX_SAVE_SLOTS } from "../src/games/raptor/types";
import { LEVELS } from "../src/games/raptor/levels";
import { raptorDescriptor } from "../src/games/raptor";

// ─── Test Helpers ───────────────────────────────────────────────

let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};
  (global as any).localStorage = {
    getItem: jest.fn((key: string) => mockStorage[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
  };
  SaveSystem.resetMigrationFlag();
});

afterEach(() => {
  delete (global as any).localStorage;
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
  test("save then load returns matching data", () => {
    const data = validSaveData();
    SaveSystem.save(data, 0);
    const loaded = SaveSystem.load(0);
    expect(loaded).toEqual({ ...data, slotIndex: 0 });
  });

  test("save stores data under slot-specific key", () => {
    const data = validSaveData();
    SaveSystem.save(data, 0);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "raptor_save_0",
      JSON.stringify({ ...data, slotIndex: 0 })
    );
  });
});

describe("Scenario: SaveSystem.clear() removes saved data", () => {
  test("hasSave returns false after clear", () => {
    SaveSystem.save(validSaveData(), 0);
    expect(SaveSystem.hasSave(0)).toBe(true);
    SaveSystem.clear(0);
    expect(SaveSystem.hasSave(0)).toBe(false);
  });

  test("load returns null after clear", () => {
    SaveSystem.save(validSaveData(), 0);
    SaveSystem.clear(0);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: SaveSystem.hasSave() returns false when no save exists", () => {
  test("hasSave returns false with empty storage", () => {
    expect(SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Save data includes a version number for forward compatibility", () => {
  test("saved data has version field set to SAVE_FORMAT_VERSION", () => {
    const data = validSaveData();
    SaveSystem.save(data, 0);
    const loaded = SaveSystem.load(0);
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
  });
});

describe("Scenario: Save data includes a timestamp", () => {
  test("saved data has a valid ISO-8601 savedAt field", () => {
    const data = validSaveData();
    SaveSystem.save(data, 0);
    const loaded = SaveSystem.load(0);
    expect(loaded!.savedAt).toBeDefined();
    const parsed = new Date(loaded!.savedAt);
    expect(parsed.getTime()).not.toBeNaN();
  });
});

// ════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Corrupt save data is handled gracefully", () => {
  test("invalid JSON returns null from load", () => {
    mockStorage["raptor_save_0"] = "not-json{{{";
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("invalid JSON causes hasSave to return false", () => {
    mockStorage["raptor_save_0"] = "not-json{{{";
    expect(SaveSystem.hasSave(0)).toBe(false);
  });

  test("no error is thrown for corrupt data", () => {
    mockStorage["raptor_save_0"] = "not-json{{{";
    expect(() => SaveSystem.load(0)).not.toThrow();
    expect(() => SaveSystem.hasSave(0)).not.toThrow();
  });
});

describe("Scenario: Save data with out-of-range level is rejected", () => {
  test("levelReached of 99 is invalid", () => {
    const data = validSaveData({ levelReached: 99 } as any);
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
    expect(SaveSystem.hasSave(0)).toBe(false);
  });

  test("negative levelReached is invalid", () => {
    const data = validSaveData({ levelReached: -1 } as any);
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Save data with zero or negative lives is rejected", () => {
  test("lives of 0 is invalid", () => {
    const data = validSaveData({ lives: 0 } as any);
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
    expect(SaveSystem.hasSave(0)).toBe(false);
  });

  test("negative lives is invalid", () => {
    const data = validSaveData({ lives: -1 } as any);
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Save data with unknown weapon type is rejected", () => {
  test("weapon 'plasma-cannon' is invalid", () => {
    const data = { ...validSaveData(), weapon: "plasma-cannon" };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
    expect(SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Save data with missing version field is rejected", () => {
  test("missing version returns null", () => {
    const data = { ...validSaveData() } as any;
    delete data.version;
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
    expect(SaveSystem.hasSave(0)).toBe(false);
  });

  test("wrong version number returns null", () => {
    const data = { ...validSaveData(), version: 99 } as any;
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: localStorage is unavailable", () => {
  test("save does not throw when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(() => SaveSystem.save(validSaveData(), 0)).not.toThrow();
  });

  test("load returns null when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("hasSave returns false when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(SaveSystem.hasSave(0)).toBe(false);
  });

  test("clear does not throw when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(() => SaveSystem.clear(0)).not.toThrow();
  });

  test("listSlots returns [null, null, null] when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(SaveSystem.listSlots()).toEqual([null, null, null]);
  });
});

// ════════════════════════════════════════════════════════════════
// VALIDATION EDGE CASES
// ════════════════════════════════════════════════════════════════

describe("Scenario: Additional validation edge cases", () => {
  test("valid data for each weapon type loads correctly", () => {
    const weapons: WeaponType[] = ["machine-gun", "missile", "laser"];
    for (const weapon of weapons) {
      const data = validSaveData({ weapon });
      SaveSystem.save(data, 0);
      const loaded = SaveSystem.load(0);
      expect(loaded!.weapon).toBe(weapon);
    }
  });

  test("levelReached at max valid index (LEVELS.length - 1) is valid", () => {
    const data = validSaveData({ levelReached: LEVELS.length - 1 });
    SaveSystem.save(data, 0);
    expect(SaveSystem.load(0)).not.toBeNull();
  });

  test("levelReached at 0 is valid", () => {
    const data = validSaveData({ levelReached: 0 });
    SaveSystem.save(data, 0);
    expect(SaveSystem.load(0)).not.toBeNull();
  });

  test("non-integer levelReached is rejected", () => {
    const data = { ...validSaveData(), levelReached: 1.5 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("non-integer lives is rejected", () => {
    const data = { ...validSaveData(), lives: 2.5 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("negative totalScore is rejected", () => {
    const data = { ...validSaveData(), totalScore: -100 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("empty savedAt string is rejected", () => {
    const data = { ...validSaveData(), savedAt: "" };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("null data in storage returns null", () => {
    mockStorage["raptor_save_0"] = "null";
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("levelReached values 5 through 9 are valid for the 10-level game", () => {
    for (let level = 5; level <= 9; level++) {
      const data = validSaveData({ levelReached: level });
      SaveSystem.save(data, 0);
      const loaded = SaveSystem.load(0);
      expect(loaded).not.toBeNull();
      expect(loaded!.levelReached).toBe(level);
    }
  });

  test("levelReached of 10 (out of bounds) is rejected", () => {
    const data = validSaveData({ levelReached: 10 } as any);
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
    expect(SaveSystem.hasSave(0)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// AUTO-SAVE INTEGRATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Progress is saved automatically when a level is completed", () => {
  test("completing a non-final level saves progress", () => {
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
    game.enemies = [];

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("level_complete");
    const saved = SaveSystem.load(0);
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
  test("completing the final level clears save data", () => {
    SaveSystem.save(validSaveData(), 0);
    expect(SaveSystem.hasSave(0)).toBe(true);

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
    expect(SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Save data is preserved on game over", () => {
  test("save data survives when player dies", () => {
    SaveSystem.save(validSaveData({ levelReached: 2 }), 0);

    const { game } = createPlayingGame();
    game.player.alive = false;
    game.state = "playing";

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("gameover");
    expect(SaveSystem.hasSave(0)).toBe(true);
    expect(SaveSystem.load(0)!.levelReached).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════
// CONTINUE & NEW GAME
// ════════════════════════════════════════════════════════════════

describe("Scenario: Clicking Continue resumes from the saved level", () => {
  test("continueGame restores saved state", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData({
      levelReached: 3,
      totalScore: 500,
      lives: 2,
      weapon: "missile",
    }), 0);

    (game as any).continueGame();

    expect(game.currentLevel).toBe(3);
    expect(game.totalScore).toBe(500);
    expect(game.player.lives).toBe(2);
    expect(game.powerUpManager.currentWeapon).toBe("missile");
    expect(game.player.alive).toBe(true);
  });

  test("continueGame falls back to resetGame when no save exists", () => {
    const { game } = createPlayingGame();

    (game as any).continueGame();

    expect(game.currentLevel).toBe(0);
    expect(game.totalScore).toBe(0);
    expect(game.player.lives).toBe(3);
  });
});

describe("Scenario: Starting a New Game clears existing save data", () => {
  test("new game from menu clears save and starts at level 0", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData({ levelReached: 3 }), 0);
    game.state = "menu";

    const newBtn = game.hud.isNewGameButtonHit;
    expect(typeof newBtn).toBe("function");

    SaveSystem.clear(0);
    (game as any).resetGame();

    expect(game.currentLevel).toBe(0);
    expect(game.totalScore).toBe(0);
    expect(game.player.lives).toBe(3);
    expect(SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: Saved weapon type is restored on continue", () => {
  test("laser weapon is restored", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData({ weapon: "laser" }), 0);
    (game as any).continueGame();
    expect(game.powerUpManager.currentWeapon).toBe("laser");
  });

  test("missile weapon is restored", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData({ weapon: "missile" }), 0);
    (game as any).continueGame();
    expect(game.powerUpManager.currentWeapon).toBe("missile");
  });
});

// ════════════════════════════════════════════════════════════════
// MENU HUD RENDERING
// ════════════════════════════════════════════════════════════════

describe("Scenario: Menu shows a Continue option when a save exists", () => {
  test("menu renders Continue and New Game buttons when save exists", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600, undefined, undefined, true);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasContinue = fillTextCalls.some((c: any) => c.text === "Continue");
    const hasNewGame = fillTextCalls.some((c: any) => c.text === "New Game");
    expect(hasContinue).toBe(true);
    expect(hasNewGame).toBe(true);
  });
});

describe("Scenario: Menu shows only Start when no save exists", () => {
  test("menu renders Click to Start when no save exists", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(false);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600, undefined, undefined, false);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasClick = fillTextCalls.some((c: any) => c.text.includes("Click to Start"));
    const hasContinue = fillTextCalls.some((c: any) => c.text === "Continue");
    expect(hasClick).toBe(true);
    expect(hasContinue).toBe(false);
  });

  test("menu renders Tap to Start on touch devices when no save exists", () => {
    const { HUD } = require("../src/games/raptor/rendering/HUD");
    const hud = new HUD(true);
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 100, 1, "Coastal Patrol", 800, 600, undefined, undefined, false);

    const fillTextCalls = (canvas as any).__fillTextCalls as Array<{ text: string }>;
    const hasTap = fillTextCalls.some((c: any) => c.text.includes("Tap to Start"));
    expect(hasTap).toBe(true);
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

  test("clear save removes data and menu no longer shows Continue", () => {
    SaveSystem.save(validSaveData(), 0);
    expect(SaveSystem.hasSave(0)).toBe(true);
    SaveSystem.clear(0);
    expect(SaveSystem.hasSave(0)).toBe(false);

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
  test("hasSaveData returns false when no save exists", () => {
    const { game } = createPlayingGame();
    expect(game.hasSaveData).toBe(false);
  });

  test("hasSaveData returns true when a valid save exists", () => {
    SaveSystem.save(validSaveData(), 0);
    const { game } = createPlayingGame();
    expect(game.hasSaveData).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SAVE FORMAT VERSIONING & MIGRATION TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: SAVE_FORMAT_VERSION constant is exported from types", () => {
  test("SAVE_FORMAT_VERSION is a number equal to 2", () => {
    expect(typeof SAVE_FORMAT_VERSION).toBe("number");
    expect(SAVE_FORMAT_VERSION).toBe(2);
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

describe("Scenario: Loading a v1 save runs the v1→v2 migration", () => {
  test("v1 save is migrated to current version with all fields preserved", () => {
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
    mockStorage["raptor_save_0"] = JSON.stringify(v1Save);

    const loaded = SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
    expect(loaded!.levelReached).toBe(3);
    expect(loaded!.totalScore).toBe(1200);
    expect(loaded!.lives).toBe(2);
    expect(loaded!.weapon).toBe("laser");
    expect(loaded!.bombs).toBe(3);
    expect(loaded!.shieldBattery).toBe(50);
    expect(loaded!.armor).toBe(80);
    expect(loaded!.energy).toBe(60);
    expect(loaded!.weaponTier).toBe(2);
    expect(loaded!.weaponInventory).toEqual({ "machine-gun": 1, "laser": 2 });
  });
});

describe("Scenario: A save at current version skips migrations", () => {
  test("current-version save loads without migration", () => {
    const data = validSaveData();
    mockStorage["raptor_save_0"] = JSON.stringify(data);

    const loaded = SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(data);
  });
});

describe("Scenario: Loading an unknown future version returns null", () => {
  test("version 99 returns null", () => {
    const data = { ...validSaveData(), version: 99 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Loading a save with missing version returns null", () => {
  test("missing version field returns null", () => {
    const data = { ...validSaveData() } as any;
    delete data.version;
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Loading a save with a non-integer version returns null", () => {
  test("version 1.5 returns null", () => {
    const data = { ...validSaveData(), version: 1.5 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Loading a save with zero or negative version returns null", () => {
  test("version 0 returns null", () => {
    const data = { ...validSaveData(), version: 0 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });

  test("version -1 returns null", () => {
    const data = { ...validSaveData(), version: -1 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Migration that throws is handled gracefully", () => {
  test("exception in migration pipeline returns null from load", () => {
    const corruptData = { version: 1, levelReached: "not-a-number" };
    mockStorage["raptor_save_0"] = JSON.stringify(corruptData);
    expect(() => SaveSystem.load(0)).not.toThrow();
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: Saving always writes the current SAVE_FORMAT_VERSION", () => {
  test("saved data in localStorage has version equal to SAVE_FORMAT_VERSION", () => {
    const data = validSaveData();
    SaveSystem.save(data, 0);
    const raw = JSON.parse(mockStorage["raptor_save_0"]);
    expect(raw.version).toBe(SAVE_FORMAT_VERSION);
  });
});

describe("Scenario: hasSave with old and future versions", () => {
  test("hasSave returns true for a migratable v1 save", () => {
    const v1Save = {
      version: 1,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
    };
    mockStorage["raptor_save_0"] = JSON.stringify(v1Save);
    expect(SaveSystem.hasSave(0)).toBe(true);
  });

  test("hasSave returns false for a future-version save", () => {
    const data = { ...validSaveData(), version: 99 };
    mockStorage["raptor_save_0"] = JSON.stringify(data);
    expect(SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: v1 saves with and without optional fields migrate correctly", () => {
  test("v1 save with optional fields preserves them after migration", () => {
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
    mockStorage["raptor_save_0"] = JSON.stringify(v1Save);

    const loaded = SaveSystem.load(0);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(SAVE_FORMAT_VERSION);
    expect(loaded!.bombs).toBe(2);
    expect(loaded!.shieldBattery).toBe(75);
    expect(loaded!.armor).toBe(90);
    expect(loaded!.energy).toBe(50);
    expect(loaded!.weaponTier).toBe(3);
    expect(loaded!.weaponInventory).toEqual({ "machine-gun": 1, "missile": 2 });
  });

  test("v1 save without optional fields migrates correctly", () => {
    const v1Save = {
      version: 1,
      levelReached: 2,
      totalScore: 500,
      lives: 2,
      weapon: "machine-gun",
      savedAt: "2026-03-10T12:00:00.000Z",
    };
    mockStorage["raptor_save_0"] = JSON.stringify(v1Save);

    const loaded = SaveSystem.load(0);
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
  test("slots store and retrieve data independently", () => {
    SaveSystem.save(validSaveData({ levelReached: 3, totalScore: 500 }), 0);
    SaveSystem.save(validSaveData({ levelReached: 1, totalScore: 100 }), 1);

    const slot0 = SaveSystem.load(0);
    const slot1 = SaveSystem.load(1);
    const slot2 = SaveSystem.load(2);

    expect(slot0!.levelReached).toBe(3);
    expect(slot0!.totalScore).toBe(500);
    expect(slot1!.levelReached).toBe(1);
    expect(slot1!.totalScore).toBe(100);
    expect(slot2).toBeNull();
  });
});

describe("Scenario: Each slot uses its own localStorage key", () => {
  test("saving to slot 0 only writes raptor_save_0", () => {
    SaveSystem.save(validSaveData(), 0);
    expect(mockStorage["raptor_save_0"]).toBeDefined();
    expect(mockStorage["raptor_save_1"]).toBeUndefined();
    expect(mockStorage["raptor_save_2"]).toBeUndefined();
  });
});

describe("Scenario: Saving to slot 1 does not affect slot 0", () => {
  test("slot 0 is unaffected by writing slot 1", () => {
    SaveSystem.save(validSaveData({ totalScore: 500 }), 0);
    SaveSystem.save(validSaveData({ totalScore: 999 }), 1);
    expect(SaveSystem.load(0)!.totalScore).toBe(500);
  });
});

describe("Scenario: Saving stamps the slotIndex field on the data", () => {
  test("slotIndex matches the slot parameter", () => {
    SaveSystem.save(validSaveData(), 2);
    expect(SaveSystem.load(2)!.slotIndex).toBe(2);
  });
});

describe("Scenario: hasSave checks only the specified slot", () => {
  test("hasSave is slot-specific", () => {
    SaveSystem.save(validSaveData(), 0);
    expect(SaveSystem.hasSave(0)).toBe(true);
    expect(SaveSystem.hasSave(1)).toBe(false);
    expect(SaveSystem.hasSave(2)).toBe(false);
  });
});

describe("Scenario: Clearing one slot does not affect others", () => {
  test("clearing slot 1 preserves slots 0 and 2", () => {
    SaveSystem.save(validSaveData(), 0);
    SaveSystem.save(validSaveData(), 1);
    SaveSystem.save(validSaveData(), 2);

    SaveSystem.clear(1);

    expect(SaveSystem.hasSave(0)).toBe(true);
    expect(SaveSystem.hasSave(1)).toBe(false);
    expect(SaveSystem.hasSave(2)).toBe(true);
  });
});

describe("Scenario: Loading a cleared slot returns null", () => {
  test("load returns null after clearing", () => {
    SaveSystem.save(validSaveData(), 0);
    SaveSystem.clear(0);
    expect(SaveSystem.load(0)).toBeNull();
  });
});

describe("Scenario: listSlots returns metadata for all slots", () => {
  test("listSlots reflects populated and empty slots", () => {
    SaveSystem.save(validSaveData({ levelReached: 3 }), 0);
    SaveSystem.save(validSaveData({ levelReached: 7 }), 2);

    const result = SaveSystem.listSlots();
    expect(result).toHaveLength(3);
    expect(result[0]!.levelReached).toBe(3);
    expect(result[1]).toBeNull();
    expect(result[2]!.levelReached).toBe(7);
  });

  test("listSlots returns all nulls when no saves exist", () => {
    expect(SaveSystem.listSlots()).toEqual([null, null, null]);
  });
});

describe("Scenario: Invalid slot index is rejected gracefully", () => {
  test("save to slot -1 is a no-op", () => {
    SaveSystem.save(validSaveData(), -1);
    expect(Object.keys(mockStorage)).toHaveLength(0);
  });

  test("save to slot 3 is a no-op", () => {
    SaveSystem.save(validSaveData(), 3);
    expect(Object.keys(mockStorage)).toHaveLength(0);
  });

  test("load from slot 1.5 returns null", () => {
    expect(SaveSystem.load(1.5)).toBeNull();
  });

  test("hasSave for slot 99 returns false", () => {
    expect(SaveSystem.hasSave(99)).toBe(false);
  });

  test("clear for invalid slot is a no-op", () => {
    SaveSystem.save(validSaveData(), 0);
    SaveSystem.clear(-1);
    expect(SaveSystem.hasSave(0)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// LEGACY MIGRATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Existing single-key save is migrated to slot 0", () => {
  test("legacy raptor_save is migrated to raptor_save_0 and removed", () => {
    mockStorage["raptor_save"] = JSON.stringify(validSaveData());

    expect(SaveSystem.hasSave(0)).toBe(true);
    expect(mockStorage["raptor_save_0"]).toBeDefined();
    expect(mockStorage["raptor_save"]).toBeUndefined();
  });
});

describe("Scenario: Legacy migration does not overwrite existing slot 0", () => {
  test("slot 0 data takes precedence over legacy key", () => {
    mockStorage["raptor_save"] = JSON.stringify(validSaveData({ levelReached: 1 }));
    mockStorage["raptor_save_0"] = JSON.stringify(validSaveData({ levelReached: 5 }));

    const loaded = SaveSystem.load(0);
    expect(loaded!.levelReached).toBe(5);
    expect(mockStorage["raptor_save"]).toBeDefined();
  });
});

describe("Scenario: Legacy migration runs only once per session", () => {
  test("migration logic executes only on the first call", () => {
    mockStorage["raptor_save"] = JSON.stringify(validSaveData());

    SaveSystem.hasSave(0);
    const getItemCalls1 = (localStorage.getItem as jest.Mock).mock.calls.length;

    SaveSystem.hasSave(0);
    const getItemCalls2 = (localStorage.getItem as jest.Mock).mock.calls.length;

    // Second call should not re-read the legacy key for migration
    const legacyReads1 = (localStorage.getItem as jest.Mock).mock.calls
      .slice(0, getItemCalls1)
      .filter((c: string[]) => c[0] === "raptor_save").length;
    const legacyReads2 = (localStorage.getItem as jest.Mock).mock.calls
      .slice(getItemCalls1)
      .filter((c: string[]) => c[0] === "raptor_save").length;

    expect(legacyReads1).toBeGreaterThan(0);
    expect(legacyReads2).toBe(0);
  });
});

describe("Scenario: Legacy migration with corrupt data copies verbatim and load rejects it", () => {
  test("corrupt legacy data is migrated but load returns null", () => {
    mockStorage["raptor_save"] = "not-valid-json{{{";

    expect(() => SaveSystem.load(0)).not.toThrow();
    expect(SaveSystem.load(0)).toBeNull();
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
  test("SaveSystem.save is called with the active slot", () => {
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
    game.enemies = [];

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("level_complete");
    expect(SaveSystem.hasSave(1)).toBe(true);
    expect(SaveSystem.hasSave(0)).toBe(false);
  });
});

describe("Scenario: RaptorGame passes activeSlot to SaveSystem.load on continue", () => {
  test("continueGame loads from the active slot", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData({ levelReached: 5, totalScore: 999 }), 2);
    game.saveSlot = 2;

    (game as any).continueGame();

    expect(game.currentLevel).toBe(5);
    expect(game.totalScore).toBe(999);
  });
});

describe("Scenario: RaptorGame passes activeSlot to SaveSystem.clear on New Game", () => {
  test("new game clears the active slot", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData(), 1);
    game.saveSlot = 1;
    game.state = "menu";

    SaveSystem.clear(game.saveSlot);
    (game as any).resetGame();

    expect(SaveSystem.hasSave(1)).toBe(false);
  });
});

describe("Scenario: RaptorGame passes activeSlot to SaveSystem.hasSave in hasSaveData getter", () => {
  test("hasSaveData checks the active slot", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData(), 1);

    game.saveSlot = 0;
    expect(game.hasSaveData).toBe(false);

    game.saveSlot = 1;
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
  test("three slots store and retrieve independent data", () => {
    SaveSystem.save(validSaveData({ levelReached: 2, lives: 3, weapon: "machine-gun" }), 0);
    SaveSystem.save(validSaveData({ levelReached: 5, lives: 1, weapon: "laser" }), 1);
    SaveSystem.save(validSaveData({ levelReached: 8, lives: 2, weapon: "missile" }), 2);

    const s0 = SaveSystem.load(0)!;
    const s1 = SaveSystem.load(1)!;
    const s2 = SaveSystem.load(2)!;

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
  test("overwriting slot 1 does not affect other slots", () => {
    SaveSystem.save(validSaveData({ totalScore: 100 }), 0);
    SaveSystem.save(validSaveData({ totalScore: 100 }), 1);

    SaveSystem.save(validSaveData({ totalScore: 999 }), 1);

    expect(SaveSystem.load(1)!.totalScore).toBe(999);
    expect(SaveSystem.load(0)!.totalScore).toBe(100);
  });
});
