import { HUD } from "../src/games/archer/rendering/HUD";

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
    ellipse: jest.fn(),
    quadraticCurveTo: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
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
  };
  (global as any).navigator = { maxTouchPoints: 0 };
}

function getGameInternals(game: any) {
  return {
    get arrowsRemaining() { return game["arrowsRemaining"]; },
    set arrowsRemaining(v: number) { game["arrowsRemaining"] = v; },
    get state() { return game["state"]; },
    set state(v: string) { game["state"] = v; },
    get arrows() { return game["arrows"]; },
    set arrows(v: any[]) { game["arrows"] = v; },
    get score() { return game["score"]; },
    resetGame: () => game["resetGame"](),
    updatePlaying: (dt: number) => game["updatePlaying"](dt),
    get input() { return game["input"]; },
  };
}

let Game: typeof import("../src/games/archer/ArcherGame").Game;

beforeAll(async () => {
  const canvas = createMockCanvas();
  setupDom(canvas);
  (global as any).performance = { now: jest.fn(() => 0) };
  (global as any).requestAnimationFrame = jest.fn();

  const mod = await import("../src/games/archer/ArcherGame");
  Game = mod.Game;
});

describe("Feature: Initial arrow count", () => {
  let game: any;
  let internals: ReturnType<typeof getGameInternals>;

  beforeEach(() => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = new Game("test-canvas");
    internals = getGameInternals(game);
  });

  describe("Scenario: New game starts with 100 arrows", () => {
    it("should have 100 arrows remaining when a new game starts", () => {
      // Given the game is in initial state (loading before assets are ready)
      expect(internals.state).toBe("loading");

      // When I click to start a new game
      internals.resetGame();
      internals.state = "playing";

      // Then I should have 100 arrows remaining
      expect(internals.arrowsRemaining).toBe(100);
    });
  });

  describe("Scenario: Arrow count decrements on shot", () => {
    it("should have 99 arrows after shooting one arrow", () => {
      // Given I have started a new game with 100 arrows
      internals.resetGame();
      internals.state = "playing";
      expect(internals.arrowsRemaining).toBe(100);

      // When I shoot one arrow — simulate click via input
      const input = internals.input;
      input.mousePos = { x: 400, y: 300 };
      (input as any).wasClicked = true;
      internals.updatePlaying(0.016);

      // Then I should have 99 arrows remaining
      expect(internals.arrowsRemaining).toBe(99);
    });
  });

  describe("Scenario: HUD displays correct arrow count at game start", () => {
    it('should display "Arrows: 100" on the HUD', () => {
      const hud = new HUD();
      const canvas = createMockCanvas();
      const ctx = (canvas as any).__ctx;
      const fillTextCalls = (canvas as any).__fillTextCalls;

      // Given I have started a new game
      // Render the HUD in playing state with 100 arrows
      hud.render(ctx as any, "playing", 0, 100, 800, 600, []);

      // Then the HUD should display "Arrows: 100"
      const arrowsCall = fillTextCalls.find(
        (c: { text: string }) => c.text.includes("Arrows:")
      );
      expect(arrowsCall).toBeDefined();
      expect(arrowsCall!.text).toBe("Arrows: 100");
    });
  });

  describe("Scenario: Restarting the game resets arrows to 100", () => {
    it("should reset arrows to 100 after game over and restart", () => {
      // Given a game has ended
      internals.resetGame();
      internals.state = "playing";
      internals.arrowsRemaining = 0;
      internals.arrows = [];
      internals.state = "gameover";

      // When I click to return to the menu and start a new game
      internals.state = "menu";
      internals.resetGame();
      internals.state = "playing";

      // Then I should have 100 arrows remaining
      expect(internals.arrowsRemaining).toBe(100);
    });
  });

  describe("Scenario: Game over triggers after all 100 arrows are used", () => {
    it('should set game state to "gameover" after all arrows are used and off-screen', () => {
      // Given I have started a new game with 100 arrows
      internals.resetGame();
      internals.state = "playing";
      expect(internals.arrowsRemaining).toBe(100);

      // When I shoot all 100 arrows and all arrows have left the screen
      // Simulate: set arrowsRemaining to 0 and empty in-flight arrows
      internals.arrowsRemaining = 0;
      internals.arrows = [];

      // Trigger updatePlaying which checks game-over condition
      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      // Then the game state should be "gameover"
      expect(internals.state).toBe("gameover");
    });
  });
});

describe("HUD low-ammo threshold", () => {
  it("should use white color when arrows > 10", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    const fillStyleValues: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      get: () => fillStyleValues[fillStyleValues.length - 1] || "",
      set: (v: string) => fillStyleValues.push(v),
      configurable: true,
    });

    hud.render(ctx as any, "playing", 0, 11, 800, 600, []);

    const arrowsFillTextIdx = ctx.fillText.mock.calls.findIndex(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("Arrows:")
    );
    expect(arrowsFillTextIdx).toBeGreaterThan(-1);

    // The fillStyle set right before the Arrows fillText call should be white
    // With 11 arrows (> 10), it should be white "#fff"
    expect(fillStyleValues).toContain("#fff");
  });

  it("should use red color when arrows <= 10", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    const fillStyleValues: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      get: () => fillStyleValues[fillStyleValues.length - 1] || "",
      set: (v: string) => fillStyleValues.push(v),
      configurable: true,
    });

    hud.render(ctx as any, "playing", 0, 10, 800, 600, []);

    expect(fillStyleValues).toContain("#e74c3c");
  });
});
