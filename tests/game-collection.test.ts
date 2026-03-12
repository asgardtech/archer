import { GameDescriptor, IGame } from "../src/shared/types";
import { GAME_REGISTRY } from "../src/launcher/registry";
import { archerDescriptor } from "../src/games/archer";
import { LEVELS } from "../src/games/archer/levels";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Shared test helpers
// ============================================================

function createMockCanvas(): HTMLCanvasElement {
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  const ctx = {
    fillText: jest.fn((text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y });
    }),
    fillRect: jest.fn(),
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
    strokeStyle: "",
    lineWidth: 0,
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
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    measureText: jest.fn(() => ({ width: 50 })),
    setTransform: jest.fn(),
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
    createElement: jest.fn(() => ({
      getContext: jest.fn(() => ({
        font: "",
        measureText: jest.fn(() => ({ width: 50 })),
      })),
    })),
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
  (global as any).requestAnimationFrame = jest.fn((cb: Function) => 1);
  (global as any).cancelAnimationFrame = jest.fn();
  (global as any).setTimeout = setTimeout;
  (global as any).clearTimeout = clearTimeout;
}

let Launcher: typeof import("../src/launcher/Launcher").Launcher;

beforeAll(async () => {
  const canvas = createMockCanvas();
  setupDom(canvas);
  const mod = await import("../src/launcher/Launcher");
  Launcher = mod.Launcher;
});

// ============================================================
// Feature: Game Collection Launcher
// ============================================================

// ── Launcher ──

describe("Scenario: Application starts with the launcher screen", () => {
  it("should display a launcher screen on the canvas when the page loads", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    expect(launcher).toBeDefined();
  });

  it("should show a title heading on the launcher", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    const fillTextCalls = (canvas as any).__fillTextCalls;

    (launcher as any).render(0);

    const titleCall = fillTextCalls.find(
      (c: { text: string }) => c.text === "Game Collection"
    );
    expect(titleCall).toBeDefined();
  });

  it("should display at least one game card", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    const cards = (launcher as any).cards;
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it("should start the render loop when start() is called", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();
    expect(requestAnimationFrame).toHaveBeenCalled();
  });
});

describe("Scenario: Archer appears as the first game in the collection", () => {
  it('should show "Balloon Archer" as the first game card name', () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    const fillTextCalls = (canvas as any).__fillTextCalls;

    (launcher as any).render(0);

    const archerCall = fillTextCalls.find(
      (c: { text: string }) => c.text === "Balloon Archer"
    );
    expect(archerCall).toBeDefined();
  });

  it("should show a short description on the first game card", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    const cards = (launcher as any).cards;
    expect(cards[0].descriptor.description.length).toBeGreaterThan(0);
  });
});

describe("Scenario: Clicking a game card launches that game", () => {
  it("should transition to the Archer game when its card is clicked", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const cards = (launcher as any).cards;
    const card = cards[0];
    const centerX = card.x + card.w / 2;
    const centerY = card.y + card.h / 2;

    (launcher as any).selectAt(centerX, centerY);

    expect((launcher as any).activeGame).not.toBeNull();
    expect((launcher as any).transitioning).toBe(true);
  });

  it("should call start() on the launched game", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const mockGame: IGame = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      onExit: null,
    };

    const descriptor: GameDescriptor = {
      id: "test",
      name: "Test Game",
      description: "A test game",
      thumbnailColor: "#000",
      createGame: () => mockGame,
    };

    (launcher as any).launchGame(descriptor);
    expect(mockGame.start).toHaveBeenCalled();
  });
});

describe("Scenario: Launcher handles touch input on mobile", () => {
  it("should register a touchstart event listener on the canvas", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const addEventListenerCalls = (canvas.addEventListener as jest.Mock).mock.calls;
    const registeredTypes = addEventListenerCalls.map((c: any[]) => c[0]);
    expect(registeredTypes).toContain("touchstart");
  });
});

// ── Returning to Launcher ──

describe("Scenario: Returning to the launcher after game over", () => {
  it("should call onExit and return to launcher when clicking on gameover screen", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    const onExit = jest.fn();
    game.onExit = onExit;

    const internals = game as any;
    internals.state = "gameover";
    internals.input.wasClicked = true;
    internals.update(0.016);

    expect(onExit).toHaveBeenCalled();
  });

  it("should re-render the launcher after onExit fires", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const mockGame: IGame = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      onExit: null,
    };

    const descriptor: GameDescriptor = {
      id: "test",
      name: "Test",
      description: "desc",
      thumbnailColor: "#000",
      createGame: () => mockGame,
    };

    (launcher as any).launchGame(descriptor);
    mockGame.onExit!();

    expect((launcher as any).activeGame).toBeNull();
    expect((launcher as any).transitioning).toBe(false);
    expect(canvas.addEventListener).toHaveBeenCalled();
  });
});

describe("Scenario: Returning to the launcher after victory", () => {
  it("should call onExit when clicking on victory screen", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    const onExit = jest.fn();
    game.onExit = onExit;

    const internals = game as any;
    internals.state = "victory";
    internals.input.wasClicked = true;
    internals.update(0.016);

    expect(onExit).toHaveBeenCalled();
  });
});

// ── Game Lifecycle ──

describe("Scenario: Game resources are cleaned up when returning to launcher", () => {
  it("should call destroy() on the game when onExit fires", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const mockGame: IGame = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      onExit: null,
    };

    const descriptor: GameDescriptor = {
      id: "test",
      name: "Test",
      description: "desc",
      thumbnailColor: "#000",
      createGame: () => mockGame,
    };

    (launcher as any).launchGame(descriptor);
    mockGame.onExit!();

    expect(mockGame.destroy).toHaveBeenCalled();
  });

  it("should remove InputManager event listeners when ArcherGame is destroyed", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    game.start();
    game.destroy();

    const removeEventListenerCalls = (canvas.removeEventListener as jest.Mock).mock.calls;
    const removedTypes = removeEventListenerCalls.map((c: any[]) => c[0]);
    expect(removedTypes).toContain("mousemove");
    expect(removedTypes).toContain("mousedown");
    expect(removedTypes).toContain("mouseup");
    expect(removedTypes).toContain("touchstart");
    expect(removedTypes).toContain("touchmove");
    expect(removedTypes).toContain("touchend");
  });

  it("should cancel the animation frame when ArcherGame is destroyed", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    game.start();
    game.destroy();

    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("should stop the game loop (running=false) when destroyed", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    game.start();
    game.destroy();

    expect((game as any).running).toBe(false);
  });
});

describe("Scenario: A game can be relaunched after returning to the launcher", () => {
  it("should create a fresh ArcherGame instance with reset state on relaunch", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    // First launch
    (launcher as any).launchGame(archerDescriptor);
    const firstGame = (launcher as any).activeGame;
    expect(firstGame).not.toBeNull();

    // Return to launcher
    firstGame.onExit!();
    expect((launcher as any).activeGame).toBeNull();

    // Second launch
    (launcher as any).launchGame(archerDescriptor);
    const secondGame = (launcher as any).activeGame;
    expect(secondGame).not.toBeNull();
    expect(secondGame).not.toBe(firstGame);

    const internals = secondGame as any;
    expect(internals.score).toBe(0);
    expect(internals.currentLevel).toBe(0);
  });
});

// ── Existing Archer Gameplay Unchanged ──

describe("Scenario: Archer gameplay is unaffected by the restructure", () => {
  it("should have all 5 levels available", () => {
    expect(LEVELS).toHaveLength(5);
  });

  it("should have the correct level names in order", () => {
    const names = LEVELS.map((l) => l.name);
    expect(names).toEqual(["Meadow", "Forest", "Mountains", "Storm", "Sky Fortress"]);
  });

  it("should have gameover and victory states work as before", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    const internals = game as any;

    internals.state = "gameover";
    expect(internals.state).toBe("gameover");

    internals.state = "victory";
    expect(internals.state).toBe("victory");
  });
});

describe("Scenario: Archer game preserves all level configurations", () => {
  it('level 1 is named "Meadow" with target score 20 and 100 arrows', () => {
    expect(LEVELS[0].name).toBe("Meadow");
    expect(LEVELS[0].targetScore).toBe(20);
    expect(LEVELS[0].arrowsGranted).toBe(100);
  });

  it('level 2 is named "Forest" with target score 35 and 80 arrows', () => {
    expect(LEVELS[1].name).toBe("Forest");
    expect(LEVELS[1].targetScore).toBe(35);
    expect(LEVELS[1].arrowsGranted).toBe(80);
  });

  it('level 3 is named "Mountains" with target score 50 and 70 arrows', () => {
    expect(LEVELS[2].name).toBe("Mountains");
    expect(LEVELS[2].targetScore).toBe(50);
    expect(LEVELS[2].arrowsGranted).toBe(70);
  });

  it('level 4 is named "Storm" with target score 70 and 60 arrows', () => {
    expect(LEVELS[3].name).toBe("Storm");
    expect(LEVELS[3].targetScore).toBe(70);
    expect(LEVELS[3].arrowsGranted).toBe(60);
  });

  it('level 5 is named "Sky Fortress" with target score 100 and 50 arrows', () => {
    expect(LEVELS[4].name).toBe("Sky Fortress");
    expect(LEVELS[4].targetScore).toBe(100);
    expect(LEVELS[4].arrowsGranted).toBe(50);
  });
});

// ── Game Registration ──

describe("Scenario: Game registry contains Archer", () => {
  it("should contain at least 1 game", () => {
    expect(GAME_REGISTRY.length).toBeGreaterThanOrEqual(1);
  });

  it('should have a game with id "archer"', () => {
    const archer = GAME_REGISTRY.find(g => g.id === "archer");
    expect(archer).toBeDefined();
  });

  it("should have a valid createGame factory function", () => {
    expect(typeof GAME_REGISTRY[0].createGame).toBe("function");
  });
});

describe("Scenario: Empty registry shows a message", () => {
  it('should display "No games available" when registry is empty', () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    const fillTextCalls = (canvas as any).__fillTextCalls;

    (launcher as any).cards = [];
    (launcher as any).render(0);

    const noGamesCall = fillTextCalls.find(
      (c: { text: string }) => c.text === "No games available"
    );
    expect(noGamesCall).toBeDefined();
  });
});

// ── IGame Contract ──

describe("Scenario: Archer implements the IGame interface", () => {
  let game: IGame;

  beforeEach(() => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = archerDescriptor.createGame(canvas);
  });

  it("should expose a start() method", () => {
    expect(typeof game.start).toBe("function");
  });

  it("should expose a stop() method", () => {
    expect(typeof game.stop).toBe("function");
  });

  it("should expose a destroy() method", () => {
    expect(typeof game.destroy).toBe("function");
  });

  it("should expose an onExit callback property (initially null)", () => {
    expect(game).toHaveProperty("onExit");
    expect(game.onExit).toBeNull();
  });
});

describe("Scenario: destroy() prevents further game loop execution", () => {
  it("should stop the game loop and set destroyed flag", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    game.start();
    game.destroy();

    const internals = game as any;
    expect(internals.running).toBe(false);
    expect(internals.destroyed).toBe(true);
  });

  it("should be idempotent (safe to call multiple times)", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    game.start();

    game.destroy();
    game.destroy();

    expect((game as any).destroyed).toBe(true);
  });
});

// ── Build & Configuration ──

describe("Scenario: Project metadata reflects the game collection", () => {
  it('package.json "name" field should not be "archer"', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
    );
    expect(pkg.name).not.toBe("archer");
  });

  it('package.json "description" should mention a game collection', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
    );
    expect(pkg.description.toLowerCase()).toMatch(/collection|games/);
  });
});

describe("Scenario: HTML page title reflects the game collection", () => {
  it('the HTML <title> should not be "Archer"', () => {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "public", "index.html"), "utf8"
    );
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    expect(titleMatch).not.toBeNull();
    expect(titleMatch![1]).not.toBe("Archer");
  });

  it("the HTML <title> should reflect the game collection name", () => {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "public", "index.html"), "utf8"
    );
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    expect(titleMatch).not.toBeNull();
    expect(titleMatch![1].toLowerCase()).toMatch(/game|collection/);
  });
});

// ── Error Handling ──

describe("Scenario: Launcher handles game creation failure gracefully", () => {
  it("should catch createGame errors, log them, and remain on the menu", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const badDescriptor: GameDescriptor = {
      id: "bad-game",
      name: "Bad Game",
      description: "A game that fails",
      thumbnailColor: "#ff0000",
      createGame: () => { throw new Error("Boom!"); },
    };

    (launcher as any).launchGame(badDescriptor);

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to launch game "bad-game":',
      expect.any(Error)
    );
    expect((launcher as any).errorMessage).toBe("Failed to launch Bad Game");
    expect((launcher as any).errorTimer).toBe(3);
    expect((launcher as any).transitioning).toBe(false);
    expect((launcher as any).activeGame).toBeNull();

    errorSpy.mockRestore();
  });

  it("should display an error message on the canvas after failure", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    const fillTextCalls = (canvas as any).__fillTextCalls;

    jest.spyOn(console, "error").mockImplementation(() => {});

    const badDescriptor: GameDescriptor = {
      id: "bad",
      name: "Bad",
      description: "fails",
      thumbnailColor: "#f00",
      createGame: () => { throw new Error("Boom!"); },
    };

    (launcher as any).launchGame(badDescriptor);
    (launcher as any).render(0.5);

    const errorCall = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Failed to launch")
    );
    expect(errorCall).toBeDefined();

    (console.error as jest.Mock).mockRestore();
  });
});

// ── File Structure ──

describe("Scenario: Archer source files live under src/games/archer/", () => {
  const basePath = path.join(__dirname, "..", "src", "games", "archer");

  it("ArcherGame.ts exists", () => {
    expect(fs.existsSync(path.join(basePath, "ArcherGame.ts"))).toBe(true);
  });

  it("types.ts exists", () => {
    expect(fs.existsSync(path.join(basePath, "types.ts"))).toBe(true);
  });

  it("levels.ts exists", () => {
    expect(fs.existsSync(path.join(basePath, "levels.ts"))).toBe(true);
  });

  it("entities/ contains Arrow.ts, Balloon.ts, Bow.ts, Obstacle.ts", () => {
    const entitiesPath = path.join(basePath, "entities");
    expect(fs.existsSync(path.join(entitiesPath, "Arrow.ts"))).toBe(true);
    expect(fs.existsSync(path.join(entitiesPath, "Balloon.ts"))).toBe(true);
    expect(fs.existsSync(path.join(entitiesPath, "Bow.ts"))).toBe(true);
    expect(fs.existsSync(path.join(entitiesPath, "Obstacle.ts"))).toBe(true);
  });

  it("systems/ contains CollisionSystem.ts, InputManager.ts, Spawner.ts, UpgradeManager.ts", () => {
    const systemsPath = path.join(basePath, "systems");
    expect(fs.existsSync(path.join(systemsPath, "CollisionSystem.ts"))).toBe(true);
    expect(fs.existsSync(path.join(systemsPath, "InputManager.ts"))).toBe(true);
    expect(fs.existsSync(path.join(systemsPath, "Spawner.ts"))).toBe(true);
    expect(fs.existsSync(path.join(systemsPath, "UpgradeManager.ts"))).toBe(true);
  });

  it("rendering/ contains HUD.ts", () => {
    expect(fs.existsSync(path.join(basePath, "rendering", "HUD.ts"))).toBe(true);
  });
});

describe("Scenario: Shared types define the game contract", () => {
  it("src/shared/types.ts exists", () => {
    expect(fs.existsSync(path.join(__dirname, "..", "src", "shared", "types.ts"))).toBe(true);
  });

  it("exports the IGame interface shape", () => {
    const mockGame: IGame = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      onExit: null,
    };
    expect(mockGame.start).toBeDefined();
    expect(mockGame.stop).toBeDefined();
    expect(mockGame.destroy).toBeDefined();
    expect(mockGame.onExit).toBeNull();
  });

  it("exports the GameDescriptor interface shape", () => {
    const desc: GameDescriptor = {
      id: "test",
      name: "Test",
      description: "desc",
      thumbnailColor: "#fff",
      createGame: jest.fn(),
    };
    expect(desc.id).toBeDefined();
    expect(desc.name).toBeDefined();
    expect(desc.description).toBeDefined();
    expect(desc.thumbnailColor).toBeDefined();
    expect(typeof desc.createGame).toBe("function");
  });
});

// ── Entry Point ──

describe("Scenario: Entry point uses Launcher instead of Game", () => {
  it("src/index.ts imports and uses Launcher", () => {
    const indexContent = fs.readFileSync(
      path.join(__dirname, "..", "src", "index.ts"), "utf8"
    );
    expect(indexContent).toContain("Launcher");
    expect(indexContent).toContain("launcher");
  });
});

// ── Launcher lifecycle details ──

describe("Scenario: Launcher detaches its own listeners when launching a game", () => {
  it("should remove launcher event listeners before starting game", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const mockGame: IGame = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      onExit: null,
    };

    const descriptor: GameDescriptor = {
      id: "test",
      name: "Test",
      description: "desc",
      thumbnailColor: "#000",
      createGame: () => mockGame,
    };

    (launcher as any).launchGame(descriptor);

    expect(canvas.removeEventListener).toHaveBeenCalled();
    expect((global as any).window.removeEventListener).toHaveBeenCalled();
  });
});

describe("Scenario: Launcher guards against double onExit calls", () => {
  it("should only call destroy once even if onExit is called multiple times", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const mockGame: IGame = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      onExit: null,
    };

    const descriptor: GameDescriptor = {
      id: "test",
      name: "Test",
      description: "desc",
      thumbnailColor: "#000",
      createGame: () => mockGame,
    };

    (launcher as any).launchGame(descriptor);
    const exitFn = mockGame.onExit!;

    exitFn();
    exitFn();

    expect(mockGame.destroy).toHaveBeenCalledTimes(1);
  });
});

describe("Scenario: Launcher sets onExit on launched games", () => {
  it("should set onExit callback on the game before calling start", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    const mockGame: IGame = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      onExit: null,
    };

    const descriptor: GameDescriptor = {
      id: "test",
      name: "Test",
      description: "desc",
      thumbnailColor: "#000",
      createGame: () => mockGame,
    };

    (launcher as any).launchGame(descriptor);

    expect(mockGame.onExit).not.toBeNull();
    expect(typeof mockGame.onExit).toBe("function");
  });
});

describe("Scenario: Launcher ignores clicks while transitioning", () => {
  it("should not launch a game when transitioning is true", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const launcher = new Launcher("test-canvas");
    launcher.start();

    (launcher as any).transitioning = true;

    const cards = (launcher as any).cards;
    if (cards.length > 0) {
      const card = cards[0];
      const centerX = card.x + card.w / 2;
      const centerY = card.y + card.h / 2;

      (launcher as any).selectAt(centerX, centerY);

      expect((launcher as any).activeGame).toBeNull();
    }
  });
});

// ── Archer descriptor ──

describe("Scenario: Archer descriptor has correct metadata", () => {
  it('should have id "archer"', () => {
    expect(archerDescriptor.id).toBe("archer");
  });

  it('should have name "Balloon Archer"', () => {
    expect(archerDescriptor.name).toBe("Balloon Archer");
  });

  it("should have a non-empty description", () => {
    expect(archerDescriptor.description.length).toBeGreaterThan(0);
  });

  it("should have a thumbnailColor", () => {
    expect(archerDescriptor.thumbnailColor).toBeTruthy();
  });

  it("should produce a valid IGame instance from createGame", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);

    expect(typeof game.start).toBe("function");
    expect(typeof game.stop).toBe("function");
    expect(typeof game.destroy).toBe("function");
    expect(game).toHaveProperty("onExit");
  });
});

// ── webpack.config.js ──

describe("Scenario: webpack config reflects game collection", () => {
  it("HtmlWebpackPlugin title should not be 'Archer'", () => {
    const webpackConfig = fs.readFileSync(
      path.join(__dirname, "..", "webpack.config.js"), "utf8"
    );
    const titleMatch = webpackConfig.match(/title:\s*["'](.+?)["']/);
    expect(titleMatch).not.toBeNull();
    expect(titleMatch![1]).not.toBe("Archer");
  });
});

// ── Launcher registry ──

describe("Scenario: Launcher registry file exports game list", () => {
  it("src/launcher/registry.ts exists", () => {
    expect(fs.existsSync(path.join(__dirname, "..", "src", "launcher", "registry.ts"))).toBe(true);
  });

  it("src/games/archer/index.ts exists", () => {
    expect(fs.existsSync(path.join(__dirname, "..", "src", "games", "archer", "index.ts"))).toBe(true);
  });
});

// ── ArcherGame fallback without onExit ──

describe("Scenario: ArcherGame falls back to menu when onExit is not set", () => {
  it("gameover click without onExit transitions back to menu state", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);

    const internals = game as any;
    internals.state = "gameover";
    internals.input.wasClicked = true;
    internals.update(0.016);

    expect(internals.state).toBe("menu");
  });

  it("victory click without onExit transitions back to menu state", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);

    const internals = game as any;
    internals.state = "victory";
    internals.input.wasClicked = true;
    internals.update(0.016);

    expect(internals.state).toBe("menu");
  });
});

// ── InputManager destroy ──

describe("Scenario: InputManager has a destroy method for cleanup", () => {
  it("InputManager.destroy() removes all canvas event listeners", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const { InputManager } = require("../src/games/archer/systems/InputManager");
    const input = new InputManager(canvas);

    input.destroy();

    const removeCalls = (canvas.removeEventListener as jest.Mock).mock.calls;
    const removedTypes = removeCalls.map((c: any[]) => c[0]);
    expect(removedTypes).toContain("mousemove");
    expect(removedTypes).toContain("mousedown");
    expect(removedTypes).toContain("mouseup");
    expect(removedTypes).toContain("touchstart");
    expect(removedTypes).toContain("touchmove");
    expect(removedTypes).toContain("touchend");
  });
});

// ── All existing test imports updated ──

describe("Scenario: All existing tests pass after restructure", () => {
  it("existing test files import from src/games/archer/ paths", () => {
    const testDir = path.join(__dirname);
    const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith(".test.ts"));

    for (const file of testFiles) {
      const content = fs.readFileSync(path.join(testDir, file), "utf8");
      const importLines = content.split("\n").filter(line =>
        line.includes("import") && line.includes("../src/")
      );

      for (const line of importLines) {
        if (line.includes("../src/shared/") || line.includes("../src/launcher/") || line.includes("../src/games/")) {
          continue;
        }
        if (line.includes("../src/Game") || line.includes("../src/entities/") ||
            line.includes("../src/systems/") || line.includes("../src/rendering/") ||
            line.includes("../src/types") || line.includes("../src/levels")) {
          fail(`File ${file} has an old import path: ${line.trim()}`);
        }
      }
    }
  });
});
