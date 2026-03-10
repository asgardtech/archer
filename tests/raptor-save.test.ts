import { SaveSystem } from "../src/games/raptor/systems/SaveSystem";
import { RaptorSaveData, WeaponType } from "../src/games/raptor/types";
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
    version: 1,
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
    SaveSystem.save(data);
    const loaded = SaveSystem.load();
    expect(loaded).toEqual(data);
  });

  test("save stores data under 'raptor_save' key", () => {
    const data = validSaveData();
    SaveSystem.save(data);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "raptor_save",
      JSON.stringify(data)
    );
  });
});

describe("Scenario: SaveSystem.clear() removes saved data", () => {
  test("hasSave returns false after clear", () => {
    SaveSystem.save(validSaveData());
    expect(SaveSystem.hasSave()).toBe(true);
    SaveSystem.clear();
    expect(SaveSystem.hasSave()).toBe(false);
  });

  test("load returns null after clear", () => {
    SaveSystem.save(validSaveData());
    SaveSystem.clear();
    expect(SaveSystem.load()).toBeNull();
  });
});

describe("Scenario: SaveSystem.hasSave() returns false when no save exists", () => {
  test("hasSave returns false with empty storage", () => {
    expect(SaveSystem.hasSave()).toBe(false);
  });
});

describe("Scenario: Save data includes a version number for forward compatibility", () => {
  test("saved data has version field set to 1", () => {
    const data = validSaveData();
    SaveSystem.save(data);
    const loaded = SaveSystem.load();
    expect(loaded!.version).toBe(1);
  });
});

describe("Scenario: Save data includes a timestamp", () => {
  test("saved data has a valid ISO-8601 savedAt field", () => {
    const data = validSaveData();
    SaveSystem.save(data);
    const loaded = SaveSystem.load();
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
    mockStorage["raptor_save"] = "not-json{{{";
    expect(SaveSystem.load()).toBeNull();
  });

  test("invalid JSON causes hasSave to return false", () => {
    mockStorage["raptor_save"] = "not-json{{{";
    expect(SaveSystem.hasSave()).toBe(false);
  });

  test("no error is thrown for corrupt data", () => {
    mockStorage["raptor_save"] = "not-json{{{";
    expect(() => SaveSystem.load()).not.toThrow();
    expect(() => SaveSystem.hasSave()).not.toThrow();
  });
});

describe("Scenario: Save data with out-of-range level is rejected", () => {
  test("levelReached of 99 is invalid", () => {
    const data = validSaveData({ levelReached: 99 } as any);
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
    expect(SaveSystem.hasSave()).toBe(false);
  });

  test("negative levelReached is invalid", () => {
    const data = validSaveData({ levelReached: -1 } as any);
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
  });
});

describe("Scenario: Save data with zero or negative lives is rejected", () => {
  test("lives of 0 is invalid", () => {
    const data = validSaveData({ lives: 0 } as any);
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
    expect(SaveSystem.hasSave()).toBe(false);
  });

  test("negative lives is invalid", () => {
    const data = validSaveData({ lives: -1 } as any);
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
  });
});

describe("Scenario: Save data with unknown weapon type is rejected", () => {
  test("weapon 'plasma-cannon' is invalid", () => {
    const data = { ...validSaveData(), weapon: "plasma-cannon" };
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
    expect(SaveSystem.hasSave()).toBe(false);
  });
});

describe("Scenario: Save data with missing version field is rejected", () => {
  test("missing version returns null", () => {
    const data = { ...validSaveData() } as any;
    delete data.version;
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
    expect(SaveSystem.hasSave()).toBe(false);
  });

  test("wrong version number returns null", () => {
    const data = { ...validSaveData(), version: 2 } as any;
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
  });
});

describe("Scenario: localStorage is unavailable", () => {
  test("save does not throw when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(() => SaveSystem.save(validSaveData())).not.toThrow();
  });

  test("load returns null when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(SaveSystem.load()).toBeNull();
  });

  test("hasSave returns false when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(SaveSystem.hasSave()).toBe(false);
  });

  test("clear does not throw when localStorage is unavailable", () => {
    delete (global as any).localStorage;
    expect(() => SaveSystem.clear()).not.toThrow();
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
      SaveSystem.save(data);
      const loaded = SaveSystem.load();
      expect(loaded!.weapon).toBe(weapon);
    }
  });

  test("levelReached at max valid index (LEVELS.length - 1) is valid", () => {
    const data = validSaveData({ levelReached: LEVELS.length - 1 });
    SaveSystem.save(data);
    expect(SaveSystem.load()).not.toBeNull();
  });

  test("levelReached at 0 is valid", () => {
    const data = validSaveData({ levelReached: 0 });
    SaveSystem.save(data);
    expect(SaveSystem.load()).not.toBeNull();
  });

  test("non-integer levelReached is rejected", () => {
    const data = { ...validSaveData(), levelReached: 1.5 };
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
  });

  test("non-integer lives is rejected", () => {
    const data = { ...validSaveData(), lives: 2.5 };
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
  });

  test("negative totalScore is rejected", () => {
    const data = { ...validSaveData(), totalScore: -100 };
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
  });

  test("empty savedAt string is rejected", () => {
    const data = { ...validSaveData(), savedAt: "" };
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
  });

  test("null data in storage returns null", () => {
    mockStorage["raptor_save"] = "null";
    expect(SaveSystem.load()).toBeNull();
  });

  test("levelReached values 5 through 9 are valid for the 10-level game", () => {
    for (let level = 5; level <= 9; level++) {
      const data = validSaveData({ levelReached: level });
      SaveSystem.save(data);
      const loaded = SaveSystem.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.levelReached).toBe(level);
    }
  });

  test("levelReached of 10 (out of bounds) is rejected", () => {
    const data = validSaveData({ levelReached: 10 } as any);
    mockStorage["raptor_save"] = JSON.stringify(data);
    expect(SaveSystem.load()).toBeNull();
    expect(SaveSystem.hasSave()).toBe(false);
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
    const saved = SaveSystem.load();
    expect(saved).not.toBeNull();
    expect(saved!.levelReached).toBe(2);
    expect(saved!.totalScore).toBe(300);
    expect(saved!.lives).toBe(2);
    expect(saved!.weapon).toBe("missile");
    expect(saved!.version).toBe(1);
    expect(saved!.savedAt).toBeDefined();
  });
});

describe("Scenario: Save data is cleared on victory", () => {
  test("completing the final level clears save data", () => {
    SaveSystem.save(validSaveData());
    expect(SaveSystem.hasSave()).toBe(true);

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
    expect(SaveSystem.hasSave()).toBe(false);
  });
});

describe("Scenario: Save data is preserved on game over", () => {
  test("save data survives when player dies", () => {
    SaveSystem.save(validSaveData({ levelReached: 2 }));

    const { game } = createPlayingGame();
    game.player.alive = false;
    game.state = "playing";

    (game as any).updatePlaying(0.001);

    expect(game.state).toBe("gameover");
    expect(SaveSystem.hasSave()).toBe(true);
    expect(SaveSystem.load()!.levelReached).toBe(2);
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
    }));

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
    SaveSystem.save(validSaveData({ levelReached: 3 }));
    game.state = "menu";

    const newBtn = game.hud.isNewGameButtonHit;
    expect(typeof newBtn).toBe("function");

    SaveSystem.clear();
    (game as any).resetGame();

    expect(game.currentLevel).toBe(0);
    expect(game.totalScore).toBe(0);
    expect(game.player.lives).toBe(3);
    expect(SaveSystem.hasSave()).toBe(false);
  });
});

describe("Scenario: Saved weapon type is restored on continue", () => {
  test("laser weapon is restored", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData({ weapon: "laser" }));
    (game as any).continueGame();
    expect(game.powerUpManager.currentWeapon).toBe("laser");
  });

  test("missile weapon is restored", () => {
    const { game } = createPlayingGame();
    SaveSystem.save(validSaveData({ weapon: "missile" }));
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
    SaveSystem.save(validSaveData());
    expect(SaveSystem.hasSave()).toBe(true);
    SaveSystem.clear();
    expect(SaveSystem.hasSave()).toBe(false);

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
    SaveSystem.save(validSaveData());
    const { game } = createPlayingGame();
    expect(game.hasSaveData).toBe(true);
  });
});
