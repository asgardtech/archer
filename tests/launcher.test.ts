import { GameDescriptor, IGame } from "../src/shared/types";
import { GAME_REGISTRY } from "../src/launcher/registry";
import { archerDescriptor } from "../src/games/archer";

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
  };
  (global as any).navigator = { maxTouchPoints: 0 };
  (global as any).performance = { now: jest.fn(() => 0) };
  (global as any).requestAnimationFrame = jest.fn((cb: Function) => 1);
  (global as any).cancelAnimationFrame = jest.fn();
}

// ============================================================
// Game Registry Tests
// ============================================================

describe("Game Registry", () => {
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
});

// ============================================================
// Archer Descriptor Tests
// ============================================================

describe("Archer Descriptor", () => {
  it('should have id "archer"', () => {
    expect(archerDescriptor.id).toBe("archer");
  });

  it('should have name "Balloon Archer"', () => {
    expect(archerDescriptor.name).toBe("Balloon Archer");
  });

  it("should have a non-empty description", () => {
    expect(archerDescriptor.description.length).toBeGreaterThan(0);
  });

  it("should have a valid thumbnailColor", () => {
    expect(archerDescriptor.thumbnailColor).toBeTruthy();
  });

  it("should have a createGame function", () => {
    expect(typeof archerDescriptor.createGame).toBe("function");
  });
});

// ============================================================
// IGame Contract Tests (ArcherGame)
// ============================================================

describe("ArcherGame implements IGame", () => {
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

  it("should expose an onExit callback property", () => {
    expect(game).toHaveProperty("onExit");
    expect(game.onExit).toBeNull();
  });

  it("should accept an onExit callback", () => {
    const callback = jest.fn();
    game.onExit = callback;
    expect(game.onExit).toBe(callback);
  });
});

describe("ArcherGame destroy()", () => {
  it("should prevent further game loop execution", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);

    game.start();
    expect(requestAnimationFrame).toHaveBeenCalled();

    game.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalled();

    const internals = game as any;
    expect(internals.running).toBe(false);
    expect(internals.destroyed).toBe(true);
  });

  it("should be safe to call destroy() multiple times", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);
    game.start();

    game.destroy();
    game.destroy();

    expect(canvas.removeEventListener).toHaveBeenCalled();
  });

  it("should clean up InputManager listeners", () => {
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
});

// ============================================================
// ArcherGame exit flow Tests
// ============================================================

describe("ArcherGame exit flow", () => {
  it("should call onExit when clicking on game-over screen", () => {
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

  it("should fall back to menu state when onExit is not set", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = archerDescriptor.createGame(canvas);

    const internals = game as any;
    internals.state = "gameover";
    internals.input.wasClicked = true;
    internals.update(0.016);

    expect(internals.state).toBe("menu");
  });
});

// ============================================================
// Launcher Tests
// ============================================================

let Launcher: typeof import("../src/launcher/Launcher").Launcher;

beforeAll(async () => {
  const canvas = createMockCanvas();
  setupDom(canvas);
  const mod = await import("../src/launcher/Launcher");
  Launcher = mod.Launcher;
});

describe("Launcher", () => {
  describe("Scenario: Application starts with the launcher screen", () => {
    it("should create a Launcher instance", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const launcher = new Launcher("test-canvas");
      expect(launcher).toBeDefined();
    });

    it("should start the render loop when start() is called", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const launcher = new Launcher("test-canvas");
      launcher.start();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe("Scenario: Launcher renders game cards", () => {
    it("should render title and game cards", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const launcher = new Launcher("test-canvas");
      const ctx = (canvas as any).__ctx;
      const fillTextCalls = (canvas as any).__fillTextCalls;

      (launcher as any).render(0);

      const titleCall = fillTextCalls.find(
        (c: { text: string }) => c.text === "Game Collection"
      );
      expect(titleCall).toBeDefined();

      const archerCall = fillTextCalls.find(
        (c: { text: string }) => c.text === "Balloon Archer"
      );
      expect(archerCall).toBeDefined();
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

  describe("Scenario: Launcher handles game creation failure gracefully", () => {
    it("should catch createGame errors, log them, and show an error message", () => {
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

      errorSpy.mockRestore();
    });
  });

  describe("Scenario: Launcher game lifecycle", () => {
    it("should detach listeners when launching a game", () => {
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

      expect(canvas.removeEventListener).toHaveBeenCalled();
      expect(mockGame.start).toHaveBeenCalled();
      expect(mockGame.onExit).not.toBeNull();
    });

    it("should call destroy and re-render when game fires onExit", () => {
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

      expect(mockGame.onExit).not.toBeNull();
      mockGame.onExit!();

      expect(mockGame.destroy).toHaveBeenCalled();
      expect((launcher as any).activeGame).toBeNull();
      expect((launcher as any).transitioning).toBe(false);
    });

    it("should guard against double onExit calls", () => {
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

      const exitFn = mockGame.onExit!;
      exitFn();
      exitFn();

      expect(mockGame.destroy).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================
// Shared Types Tests
// ============================================================

describe("Shared types", () => {
  it("should export IGame interface shape", () => {
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

  it("should export GameDescriptor interface shape", () => {
    const desc: GameDescriptor = {
      id: "test",
      name: "Test",
      description: "desc",
      thumbnailColor: "#fff",
      createGame: jest.fn(),
    };
    expect(desc.id).toBe("test");
    expect(typeof desc.createGame).toBe("function");
  });
});
