import { Obstacle } from "../src/games/archer/entities/Obstacle";
import { Arrow } from "../src/games/archer/entities/Arrow";
import { Balloon } from "../src/games/archer/entities/Balloon";
import { CollisionSystem, ObstacleCollisionEvent } from "../src/games/archer/systems/CollisionSystem";
import { Spawner } from "../src/games/archer/systems/Spawner";
import { LEVELS, LevelConfig } from "../src/games/archer/levels";
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
    roundRect: jest.fn(),
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
    get obstacles() { return game["obstacles"]; },
    set obstacles(v: any[]) { game["obstacles"] = v; },
    get balloons() { return game["balloons"]; },
    set balloons(v: any[]) { game["balloons"] = v; },
    get score() { return game["score"]; },
    set score(v: number) { game["score"] = v; },
    resetGame: () => game["resetGame"](),
    updatePlaying: (dt: number) => game["updatePlaying"](dt),
    startLevel: (idx: number) => game["startLevel"](idx),
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

// ----- Obstacle entity tests -----

describe("Obstacle entity", () => {
  it("should create a bird obstacle moving left-to-right", () => {
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    expect(obs.obstacleType).toBe("bird");
    expect(obs.alive).toBe(true);
    expect(obs.pos.x).toBeLessThan(0);
    expect(obs.vel.x).toBeGreaterThan(0);
  });

  it("should create an airplane obstacle moving right-to-left", () => {
    const obs = new Obstacle("airplane", 800, 600, 200, -1);
    expect(obs.obstacleType).toBe("airplane");
    expect(obs.pos.x).toBeGreaterThan(800);
    expect(obs.vel.x).toBeLessThan(0);
  });

  it("should create a UFO obstacle", () => {
    const obs = new Obstacle("ufo", 800, 600, 80, 1);
    expect(obs.obstacleType).toBe("ufo");
    expect(obs.alive).toBe(true);
  });

  it("should move horizontally on update", () => {
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    const startX = obs.pos.x;
    obs.update(1.0);
    expect(obs.pos.x).toBeGreaterThan(startX);
  });

  it("bird should be removed after exiting the right edge", () => {
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    for (let i = 0; i < 200; i++) {
      obs.update(0.1);
    }
    expect(obs.alive).toBe(false);
  });

  it("bird should be removed after exiting the left edge (RTL)", () => {
    const obs = new Obstacle("bird", 800, 600, 100, -1);
    for (let i = 0; i < 200; i++) {
      obs.update(0.1);
    }
    expect(obs.alive).toBe(false);
  });

  it("UFO should have sine-wave vertical bobbing", () => {
    const obs = new Obstacle("ufo", 800, 600, 80, 1);
    const yValues: number[] = [];
    for (let i = 0; i < 50; i++) {
      obs.update(0.05);
      yValues.push(obs.pos.y);
    }
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    expect(maxY - minY).toBeGreaterThan(5);
  });

  it("UFO bobbing stays within upper 70% of screen", () => {
    const canvasH = 600;
    const obs = new Obstacle("ufo", 800, canvasH, 80, 1);
    for (let i = 0; i < 200; i++) {
      obs.update(0.05);
      expect(obs.pos.y).toBeLessThanOrEqual(canvasH * 0.7);
    }
  });

  it("should spawn in upper 70% of the screen", () => {
    for (let i = 0; i < 50; i++) {
      const obs = new Obstacle("bird", 800, 600, 100, 1);
      expect(obs.pos.y).toBeLessThanOrEqual(600 * 0.7);
    }
  });
});

// ----- CollisionSystem.checkObstacles tests -----

describe("CollisionSystem.checkObstacles", () => {
  let collisions: CollisionSystem;

  beforeEach(() => {
    collisions = new CollisionSystem();
  });

  it("should detect arrow-obstacle collision", () => {
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    obs.pos = { x: 400, y: 300 };

    const arrow = new Arrow({ x: 400, y: 300 }, 0);
    arrow.pos = { x: 400, y: 300 };

    const events = collisions.checkObstacles([arrow], [obs]);
    expect(events.length).toBe(1);
    expect(events[0].arrow).toBe(arrow);
    expect(events[0].obstacle).toBe(obs);
    expect(arrow.alive).toBe(false);
    expect(obs.alive).toBe(false);
  });

  it("should not detect collision when arrow misses obstacle", () => {
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    obs.pos = { x: 400, y: 300 };

    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    arrow.pos = { x: 100, y: 100 };

    const events = collisions.checkObstacles([arrow], [obs]);
    expect(events.length).toBe(0);
    expect(arrow.alive).toBe(true);
    expect(obs.alive).toBe(true);
  });

  it("piercing arrow is stopped by obstacle", () => {
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    obs.pos = { x: 400, y: 300 };

    const arrow = new Arrow({ x: 400, y: 300 }, 0);
    arrow.pos = { x: 400, y: 300 };
    arrow.piercing = true;

    const events = collisions.checkObstacles([arrow], [obs]);
    expect(events.length).toBe(1);
    expect(arrow.alive).toBe(false);
    expect(obs.alive).toBe(false);
  });

  it("only first hit on same obstacle applies (obstacle marked dead immediately)", () => {
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    obs.pos = { x: 400, y: 300 };

    const arrow1 = new Arrow({ x: 400, y: 300 }, 0);
    arrow1.pos = { x: 400, y: 300 };
    const arrow2 = new Arrow({ x: 400, y: 300 }, 0);
    arrow2.pos = { x: 400, y: 300 };

    const events = collisions.checkObstacles([arrow1, arrow2], [obs]);
    expect(events.length).toBe(1);
  });

  it("obstacles and balloons do not interact through checkObstacles", () => {
    const balloon = new Balloon(400, 300, 50);
    const obs = new Obstacle("bird", 800, 600, 100, 1);
    obs.pos = { x: 400, y: 300 };

    const events = collisions.checkObstacles([], [obs]);
    expect(events.length).toBe(0);
    expect(balloon.alive).toBe(true);
    expect(obs.alive).toBe(true);
  });
});

// ----- Spawner obstacle spawning tests -----

describe("Spawner obstacle spawning", () => {
  it("should spawn obstacles when enough time passes", () => {
    const spawner = new Spawner();
    spawner.configure(LEVELS[0]);

    let totalObstacles = 0;
    for (let i = 0; i < 200; i++) {
      const obs = spawner.updateObstacles(0.1, 800, 600);
      totalObstacles += obs.length;
    }
    expect(totalObstacles).toBeGreaterThanOrEqual(1);
  });

  it("should only spawn bird types for Level 1", () => {
    const spawner = new Spawner();
    spawner.configure(LEVELS[0]);

    const allObstacles: Obstacle[] = [];
    for (let i = 0; i < 300; i++) {
      const obs = spawner.updateObstacles(0.1, 800, 600);
      allObstacles.push(...obs);
    }

    for (const obs of allObstacles) {
      expect(obs.obstacleType).toBe("bird");
    }
  });

  it("should not spawn airplane on Level 1-2", () => {
    for (const level of [LEVELS[0], LEVELS[1]]) {
      const spawner = new Spawner();
      spawner.configure(level);

      const allObstacles: Obstacle[] = [];
      for (let i = 0; i < 300; i++) {
        const obs = spawner.updateObstacles(0.1, 800, 600);
        allObstacles.push(...obs);
      }

      const airplanes = allObstacles.filter((o) => o.obstacleType === "airplane");
      expect(airplanes.length).toBe(0);
    }
  });

  it("Level 3 config includes airplane type", () => {
    expect(LEVELS[2].obstacleTypes).toContain("airplane");
  });

  it("Level 5 config includes UFO type", () => {
    expect(LEVELS[4].obstacleTypes).toContain("ufo");
  });
});

// ----- Level config tests -----

describe("Level obstacle configuration", () => {
  it("Level 1-2 have only bird obstacles", () => {
    expect(LEVELS[0].obstacleTypes).toEqual(["bird"]);
    expect(LEVELS[1].obstacleTypes).toEqual(["bird"]);
  });

  it("Level 3-4 have bird and airplane obstacles", () => {
    expect(LEVELS[2].obstacleTypes).toEqual(["bird", "airplane"]);
    expect(LEVELS[3].obstacleTypes).toEqual(["bird", "airplane"]);
  });

  it("Level 5 has bird, airplane and UFO obstacles", () => {
    expect(LEVELS[4].obstacleTypes).toEqual(["bird", "airplane", "ufo"]);
  });

  it("all levels have obstacleEnabled set to true", () => {
    for (const level of LEVELS) {
      expect(level.obstacleEnabled).toBe(true);
    }
  });

  it("Level 5 has shorter obstacle intervals than Level 1", () => {
    expect(LEVELS[4].obstacleMinInterval).toBeLessThan(LEVELS[0].obstacleMinInterval);
    expect(LEVELS[4].obstacleMaxInterval).toBeLessThan(LEVELS[0].obstacleMaxInterval);
  });
});

// ----- Game integration tests -----

describe("Game obstacle integration", () => {
  let game: any;
  let internals: ReturnType<typeof getGameInternals>;

  beforeEach(() => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = new Game("test-canvas");
    internals = getGameInternals(game);
  });

  describe("Scenario: Hitting a bird incurs a score penalty", () => {
    it("should decrease score by 3 when hitting a bird", () => {
      internals.resetGame();
      internals.state = "playing";
      internals.score = 10;

      const obs = new Obstacle("bird", 800, 600, 100, 1);
      obs.pos = { x: 400, y: 300 };
      internals.obstacles = [obs];

      const arrow = new Arrow({ x: 400, y: 300 }, 0);
      arrow.pos = { x: 400, y: 300 };
      internals.arrows = [arrow];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.001);

      expect(internals.score).toBe(7);
    });
  });

  describe("Scenario: Hitting a bird incurs an arrow penalty", () => {
    it("should lose 2 additional arrows when hitting a bird", () => {
      internals.resetGame();
      internals.state = "playing";
      internals.arrowsRemaining = 50;

      const obs = new Obstacle("bird", 800, 600, 100, 1);
      obs.pos = { x: 400, y: 300 };
      internals.obstacles = [obs];

      const arrow = new Arrow({ x: 400, y: 300 }, 0);
      arrow.pos = { x: 400, y: 300 };
      internals.arrows = [arrow];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.001);

      expect(internals.arrowsRemaining).toBe(48);
    });
  });

  describe("Scenario: Score penalty cannot reduce score below zero", () => {
    it("should clamp score at 0 when penalty exceeds current score", () => {
      internals.resetGame();
      internals.state = "playing";
      internals.score = 1;

      const obs = new Obstacle("bird", 800, 600, 100, 1);
      obs.pos = { x: 400, y: 300 };
      internals.obstacles = [obs];

      const arrow = new Arrow({ x: 400, y: 300 }, 0);
      arrow.pos = { x: 400, y: 300 };
      internals.arrows = [arrow];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.001);

      expect(internals.score).toBe(0);
    });
  });

  describe("Scenario: Arrow penalty cannot reduce arrows below zero", () => {
    it("should clamp arrows at 0 when penalty exceeds remaining arrows", () => {
      internals.resetGame();
      internals.state = "playing";
      internals.arrowsRemaining = 1;

      const obs = new Obstacle("bird", 800, 600, 100, 1);
      obs.pos = { x: 400, y: 300 };
      internals.obstacles = [obs];

      const arrow = new Arrow({ x: 400, y: 300 }, 0);
      arrow.pos = { x: 400, y: 300 };
      internals.arrows = [arrow];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.001);

      expect(internals.arrowsRemaining).toBe(0);
    });
  });

  describe("Scenario: Hitting an airplane incurs a larger penalty", () => {
    it("should decrease score by 5 and arrows by 3 for airplane", () => {
      internals.resetGame();
      internals.state = "playing";
      internals.score = 20;
      internals.arrowsRemaining = 40;

      const obs = new Obstacle("airplane", 800, 600, 200, 1);
      obs.pos = { x: 400, y: 300 };
      internals.obstacles = [obs];

      const arrow = new Arrow({ x: 400, y: 300 }, 0);
      arrow.pos = { x: 400, y: 300 };
      internals.arrows = [arrow];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.001);

      expect(internals.score).toBe(15);
      expect(internals.arrowsRemaining).toBe(37);
    });
  });

  describe("Scenario: Hitting a UFO incurs the highest penalty", () => {
    it("should decrease score by 8 and arrows by 5 for UFO", () => {
      internals.resetGame();
      internals.state = "playing";
      internals.score = 30;
      internals.arrowsRemaining = 40;

      const obs = new Obstacle("ufo", 800, 600, 80, 1);
      obs.pos = { x: 400, y: 300 };
      (obs as any).baseY = 300;
      internals.obstacles = [obs];

      const arrow = new Arrow({ x: 400, y: 300 }, 0);
      arrow.pos = { x: 400, y: 300 };
      internals.arrows = [arrow];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.001);

      expect(internals.score).toBe(22);
      expect(internals.arrowsRemaining).toBe(35);
    });
  });

  describe("Scenario: Piercing arrow is stopped by obstacle", () => {
    it("should destroy piercing arrow and obstacle but leave balloon alive", () => {
      internals.resetGame();
      internals.state = "playing";
      internals.score = 10;
      internals.arrowsRemaining = 50;

      const obs = new Obstacle("bird", 800, 600, 100, 1);
      obs.pos = { x: 400, y: 300 };

      const balloon = new Balloon(400, 310, 50);

      internals.obstacles = [obs];
      internals.balloons = [balloon];

      const arrow = new Arrow({ x: 400, y: 300 }, 0);
      arrow.pos = { x: 400, y: 300 };
      arrow.piercing = true;
      internals.arrows = [arrow];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.001);

      expect(arrow.alive).toBe(false);
      expect(obs.alive).toBe(false);
      expect(balloon.alive).toBe(true);
    });
  });

  describe("Scenario: Obstacles are cleared on level transition", () => {
    it("should clear obstacles when starting a new level", () => {
      internals.resetGame();
      internals.state = "playing";

      const obs = new Obstacle("bird", 800, 600, 100, 1);
      internals.obstacles = [obs];
      expect(internals.obstacles.length).toBe(1);

      internals.startLevel(1);
      expect(internals.obstacles.length).toBe(0);
    });
  });

  describe("Scenario: Obstacles are cleared on game reset", () => {
    it("should clear obstacles when the game is reset", () => {
      internals.resetGame();
      internals.state = "playing";

      const obs = new Obstacle("bird", 800, 600, 100, 1);
      internals.obstacles = [obs];
      expect(internals.obstacles.length).toBe(1);

      internals.resetGame();
      expect(internals.obstacles.length).toBe(0);
    });
  });

  describe("Scenario: Multiple obstacles can exist simultaneously", () => {
    it("should handle multiple obstacles independently", () => {
      internals.resetGame();
      internals.state = "playing";

      const obs1 = new Obstacle("bird", 800, 600, 100, 1);
      obs1.pos = { x: 200, y: 200 };
      const obs2 = new Obstacle("airplane", 800, 600, 200, -1);
      obs2.pos = { x: 600, y: 300 };
      internals.obstacles = [obs1, obs2];

      const input = internals.input;
      (input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.obstacles.length).toBe(2);
      expect(internals.obstacles[0].alive).toBe(true);
      expect(internals.obstacles[1].alive).toBe(true);
    });
  });
});

// ----- HUD penalty text tests -----

describe("HUD penalty text", () => {
  it("should show penalty text when showPenalty is called", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    hud.showPenalty(3);
    hud.render(ctx as any, "playing", 0, 100, 800, 600, "default", new Set(["default"] as const), 0.016);

    const penaltyCall = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("3") && c.text.includes("\u2212")
    );
    expect(penaltyCall).toBeDefined();
  });

  it("penalty text should fade after PENALTY_DURATION", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    hud.showPenalty(3);

    // Render with enough dt to exceed 1.5s duration
    hud.render(ctx as any, "playing", 0, 100, 800, 600, "default", new Set(["default"] as const), 2.0);

    const fillTextCalls2: Array<{ text: string }> = [];
    ctx.fillText.mockImplementation((text: string, x: number, y: number) => {
      fillTextCalls2.push({ text });
    });

    hud.render(ctx as any, "playing", 0, 100, 800, 600, "default", new Set(["default"] as const), 0.016);

    const penaltyCall = fillTextCalls2.find(
      (c: { text: string }) => c.text.includes("\u2212")
    );
    expect(penaltyCall).toBeUndefined();
  });
});
