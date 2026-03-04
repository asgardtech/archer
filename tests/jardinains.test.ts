import { GameDescriptor, IGame } from "../src/shared/types";
import { GAME_REGISTRY } from "../src/launcher/registry";
import { jardinainsDescriptor } from "../src/games/jardinains";
import { LEVELS } from "../src/games/jardinains/levels";
import { Paddle } from "../src/games/jardinains/entities/Paddle";
import { Ball } from "../src/games/jardinains/entities/Ball";
import { Brick } from "../src/games/jardinains/entities/Brick";
import { Gnome } from "../src/games/jardinains/entities/Gnome";
import { FlowerPot } from "../src/games/jardinains/entities/FlowerPot";
import { PowerUp } from "../src/games/jardinains/entities/PowerUp";
import { CollisionSystem } from "../src/games/jardinains/systems/CollisionSystem";
import { PowerUpManager } from "../src/games/jardinains/systems/PowerUpManager";
import { GnomeAI } from "../src/games/jardinains/systems/GnomeAI";

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillText: jest.fn(),
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
// Game Registry
// ============================================================

describe("Game Registry includes Jardinains", () => {
  it('should contain a game with id "jardinains"', () => {
    const found = GAME_REGISTRY.find((g) => g.id === "jardinains");
    expect(found).toBeDefined();
  });

  it("should contain at least 2 games", () => {
    expect(GAME_REGISTRY.length).toBeGreaterThanOrEqual(2);
  });

  it('should contain both "archer" and "jardinains"', () => {
    const ids = GAME_REGISTRY.map((g) => g.id);
    expect(ids).toContain("archer");
    expect(ids).toContain("jardinains");
  });

  it("should have a valid createGame function for jardinains", () => {
    const desc = GAME_REGISTRY.find((g) => g.id === "jardinains");
    expect(typeof desc!.createGame).toBe("function");
  });
});

// ============================================================
// Jardinains Descriptor
// ============================================================

describe("Jardinains Descriptor", () => {
  it('should have id "jardinains"', () => {
    expect(jardinainsDescriptor.id).toBe("jardinains");
  });

  it('should have name "Jardinains"', () => {
    expect(jardinainsDescriptor.name).toBe("Jardinains");
  });

  it("should have a description mentioning gnomes or bricks", () => {
    const desc = jardinainsDescriptor.description.toLowerCase();
    expect(desc.includes("gnome") || desc.includes("brick")).toBe(true);
  });

  it("should have a valid thumbnailColor", () => {
    expect(jardinainsDescriptor.thumbnailColor).toBeTruthy();
  });
});

// ============================================================
// IGame Interface
// ============================================================

describe("JardinainsGame implements IGame", () => {
  let game: IGame;

  beforeEach(() => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = jardinainsDescriptor.createGame(canvas);
  });

  it("should expose start(), stop(), destroy() methods", () => {
    expect(typeof game.start).toBe("function");
    expect(typeof game.stop).toBe("function");
    expect(typeof game.destroy).toBe("function");
  });

  it("should have onExit initially set to null", () => {
    expect(game.onExit).toBeNull();
  });

  it("should accept an onExit callback", () => {
    const cb = jest.fn();
    game.onExit = cb;
    expect(game.onExit).toBe(cb);
  });
});

describe("JardinainsGame destroy()", () => {
  it("should stop the game loop and set destroyed flag", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas);
    game.start();
    expect(requestAnimationFrame).toHaveBeenCalled();

    game.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect((game as any).running).toBe(false);
    expect((game as any).destroyed).toBe(true);
  });

  it("should be safe to call destroy() twice (idempotent)", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas);
    game.start();
    game.destroy();
    game.destroy();
    expect((game as any).destroyed).toBe(true);
  });

  it("should remove event listeners on destroy", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas);
    game.start();
    game.destroy();
    const removedTypes = (canvas.removeEventListener as jest.Mock).mock.calls.map((c: any[]) => c[0]);
    expect(removedTypes).toContain("mousemove");
    expect(removedTypes).toContain("mousedown");
    expect(removedTypes).toContain("touchstart");
    expect(removedTypes).toContain("touchmove");
    expect(removedTypes).toContain("touchend");
  });
});

// ============================================================
// Exit Flow
// ============================================================

describe("JardinainsGame exit flow", () => {
  it("should call onExit when clicking on gameover screen", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas);
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
    const game = jardinainsDescriptor.createGame(canvas);
    const onExit = jest.fn();
    game.onExit = onExit;

    const internals = game as any;
    internals.state = "victory";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(onExit).toHaveBeenCalled();
  });

  it("should fall back to menu when onExit is not set", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas);

    const internals = game as any;
    internals.state = "gameover";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(internals.state).toBe("menu");
  });
});

// ============================================================
// Level Configuration
// ============================================================

describe("Level Configuration", () => {
  it("should have exactly 5 levels", () => {
    expect(LEVELS).toHaveLength(5);
  });

  it("should have correct level names", () => {
    expect(LEVELS[0].name).toBe("Garden Path");
    expect(LEVELS[1].name).toBe("Flower Bed");
    expect(LEVELS[2].name).toBe("Hedge Maze");
    expect(LEVELS[3].name).toBe("Greenhouse");
    expect(LEVELS[4].name).toBe("Gnome Fortress");
  });

  it("should have increasing ball speeds", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].ballSpeed).toBeGreaterThan(LEVELS[i - 1].ballSpeed);
    }
  });

  it("should have increasing gnome counts", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].gnomePositions.length).toBeGreaterThanOrEqual(LEVELS[i - 1].gnomePositions.length);
    }
  });
});

// ============================================================
// Paddle
// ============================================================

describe("Paddle", () => {
  it("should start centered", () => {
    const paddle = new Paddle(800, 600);
    expect(paddle.x).toBe(400);
  });

  it("should follow mouse x within bounds", () => {
    const paddle = new Paddle(800, 600);
    paddle.update(0.016, 200, 800);
    expect(paddle.x).toBe(200);
  });

  it("should clamp to left boundary", () => {
    const paddle = new Paddle(800, 600);
    paddle.update(0.016, 0, 800);
    expect(paddle.x).toBe(paddle.width / 2);
  });

  it("should clamp to right boundary", () => {
    const paddle = new Paddle(800, 600);
    paddle.update(0.016, 900, 800);
    expect(paddle.x).toBe(800 - paddle.width / 2);
  });

  it("should shrink when hit by flower pot", () => {
    const paddle = new Paddle(800, 600);
    const origWidth = paddle.width;
    paddle.applyShrink();
    expect(paddle.width).toBeLessThan(origWidth);
    expect(paddle.shrinkTimer).toBeGreaterThan(0);
  });

  it("should not shrink below minimum width (40px)", () => {
    const paddle = new Paddle(800, 600);
    paddle.applyShrink();
    paddle.applyShrink();
    paddle.applyShrink();
    expect(paddle.width).toBeGreaterThanOrEqual(40);
  });

  it("should widen with wide-paddle power-up", () => {
    const paddle = new Paddle(800, 600);
    const origWidth = paddle.width;
    paddle.applyWide();
    expect(paddle.width).toBeGreaterThan(origWidth);
  });

  it("should restore width after shrink timer expires", () => {
    const paddle = new Paddle(800, 600);
    const origWidth = paddle.width;
    paddle.applyShrink();
    expect(paddle.width).toBeLessThan(origWidth);
    paddle.update(6, 400, 800);
    expect(paddle.width).toBe(origWidth);
  });
});

// ============================================================
// Ball
// ============================================================

describe("Ball", () => {
  it("should start stuck", () => {
    const ball = new Ball(400, 560);
    expect(ball.stuck).toBe(true);
  });

  it("should launch with velocity", () => {
    const ball = new Ball(400, 560);
    ball.launch(250);
    expect(ball.stuck).toBe(false);
    expect(ball.getSpeed()).toBeCloseTo(250, 0);
  });

  it("should reflect off top wall", () => {
    const ball = new Ball(400, 5);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    ball.update(0.05, 800, 600);
    expect(ball.vel.y).toBeGreaterThan(0);
  });

  it("should reflect off left wall", () => {
    const ball = new Ball(5, 300);
    ball.stuck = false;
    ball.vel = { x: -250, y: 0 };
    ball.update(0.05, 800, 600);
    expect(ball.vel.x).toBeGreaterThan(0);
  });

  it("should reflect off right wall", () => {
    const ball = new Ball(795, 300);
    ball.stuck = false;
    ball.vel = { x: 250, y: 0 };
    ball.update(0.05, 800, 600);
    expect(ball.vel.x).toBeLessThan(0);
  });

  it("should be lost when exiting bottom", () => {
    const ball = new Ball(400, 610);
    ball.stuck = false;
    ball.vel = { x: 0, y: 250 };
    const result = ball.update(0.05, 800, 600);
    expect(result.lost).toBe(true);
    expect(ball.alive).toBe(false);
  });

  it("should enforce minimum vertical speed", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 250, y: 10 };
    ball.ensureMinVerticalSpeed();
    expect(Math.abs(ball.vel.y)).toBeGreaterThanOrEqual(60);
  });
});

// ============================================================
// Brick
// ============================================================

describe("Brick", () => {
  it("should be destroyed in one hit when HP=1", () => {
    const brick = new Brick(0, 0, 1);
    const destroyed = brick.hit();
    expect(destroyed).toBe(true);
    expect(brick.alive).toBe(false);
  });

  it("should survive first hit when HP=2", () => {
    const brick = new Brick(0, 0, 2);
    const destroyed = brick.hit();
    expect(destroyed).toBe(false);
    expect(brick.hitPoints).toBe(1);
    expect(brick.alive).toBe(true);
  });

  it("should require 3 hits when HP=3", () => {
    const brick = new Brick(0, 0, 3);
    brick.hit();
    expect(brick.hitPoints).toBe(2);
    brick.hit();
    expect(brick.hitPoints).toBe(1);
    const destroyed = brick.hit();
    expect(destroyed).toBe(true);
    expect(brick.alive).toBe(false);
  });
});

// ============================================================
// Gnome
// ============================================================

describe("Gnome", () => {
  it('should start in "sitting" state', () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    expect(gnome.state).toBe("sitting");
  });

  it("should transition to falling when brick is destroyed", () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    gnome.startFalling();
    expect(gnome.state).toBe("falling");
  });

  it("should accelerate downward when falling", () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    gnome.startFalling();
    const initialY = gnome.y;
    gnome.update(0.1);
    expect(gnome.y).toBeGreaterThan(initialY);
  });

  it("should transition to caught state", () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    gnome.startFalling();
    gnome.catch();
    expect(gnome.state).toBe("caught");
  });

  it('should become "gone" when falling off screen', () => {
    const gnome = new Gnome(100, 700, 0, 0, 5);
    gnome.startFalling();
    gnome.isGone(600);
    expect(gnome.state).toBe("gone");
  });

  it("should duck when prompted", () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    gnome.duck();
    expect(gnome.state).toBe("ducking");
  });
});

// ============================================================
// FlowerPot
// ============================================================

describe("FlowerPot", () => {
  it("should fall straight down", () => {
    const pot = new FlowerPot(100, 100);
    const initialY = pot.pos.y;
    pot.update(0.1, 600);
    expect(pot.pos.y).toBeGreaterThan(initialY);
    expect(pot.pos.x).toBe(100);
  });

  it("should become inactive when off screen", () => {
    const pot = new FlowerPot(100, 630);
    pot.update(0.1, 600);
    expect(pot.alive).toBe(false);
  });
});

// ============================================================
// PowerUp
// ============================================================

describe("PowerUp", () => {
  it("should fall straight down", () => {
    const pu = new PowerUp(100, 100, "wide-paddle");
    const initialY = pu.pos.y;
    pu.update(0.1, 600);
    expect(pu.pos.y).toBeGreaterThan(initialY);
  });

  it("should become inactive when off screen", () => {
    const pu = new PowerUp(100, 630, "extra-life");
    pu.update(0.1, 600);
    expect(pu.alive).toBe(false);
  });

  it("should store its type", () => {
    const pu = new PowerUp(100, 100, "multi-ball");
    expect(pu.type).toBe("multi-ball");
  });
});

// ============================================================
// Collision System
// ============================================================

describe("CollisionSystem", () => {
  let cs: CollisionSystem;

  beforeEach(() => {
    cs = new CollisionSystem();
  });

  describe("Ball vs Paddle", () => {
    it("should detect collision and reflect ball", () => {
      const ball = new Ball(400, 567);
      ball.stuck = false;
      ball.vel = { x: 0, y: 250 };
      const paddle = new Paddle(800, 600);

      const hit = cs.checkBallPaddle(ball, paddle, false);
      expect(hit).toBe(true);
      expect(ball.vel.y).toBeLessThan(0);
    });

    it("should not collide when ball is above paddle", () => {
      const ball = new Ball(400, 300);
      ball.stuck = false;
      ball.vel = { x: 0, y: 250 };
      const paddle = new Paddle(800, 600);

      const hit = cs.checkBallPaddle(ball, paddle, false);
      expect(hit).toBe(false);
    });

    it("should make ball stick when sticky is active", () => {
      const ball = new Ball(400, 567);
      ball.stuck = false;
      ball.vel = { x: 0, y: 250 };
      const paddle = new Paddle(800, 600);

      const hit = cs.checkBallPaddle(ball, paddle, true);
      expect(hit).toBe(true);
      expect(ball.stuck).toBe(true);
    });
  });

  describe("Ball vs Brick", () => {
    it("should detect collision with brick", () => {
      const brick = new Brick(0, 0, 1);
      const ball = new Ball(brick.centerX, brick.bottom + 5);
      ball.stuck = false;
      ball.vel = { x: 0, y: -250 };

      const hits = cs.checkBallBricks(ball, [brick]);
      expect(hits).toHaveLength(1);
    });

    it("should not collide with destroyed brick", () => {
      const brick = new Brick(0, 0, 1);
      brick.alive = false;
      const ball = new Ball(brick.centerX, brick.bottom + 5);
      ball.stuck = false;
      ball.vel = { x: 0, y: -250 };

      const hits = cs.checkBallBricks(ball, [brick]);
      expect(hits).toHaveLength(0);
    });
  });

  describe("Gnome vs Paddle", () => {
    it("should detect falling gnome on paddle", () => {
      const paddle = new Paddle(800, 600);
      const gnome = new Gnome(400, paddle.top + 5, 0, 0, 5);
      gnome.startFalling();

      const hit = cs.checkGnomePaddle(gnome, paddle);
      expect(hit).toBe(true);
    });

    it("should not detect sitting gnome", () => {
      const paddle = new Paddle(800, 600);
      const gnome = new Gnome(400, paddle.top + 5, 0, 0, 5);

      const hit = cs.checkGnomePaddle(gnome, paddle);
      expect(hit).toBe(false);
    });
  });

  describe("FlowerPot vs Paddle", () => {
    it("should detect pot hitting paddle", () => {
      const paddle = new Paddle(800, 600);
      const pot = new FlowerPot(400, paddle.y);

      const hit = cs.checkPotPaddle(pot, paddle);
      expect(hit).toBe(true);
    });
  });

  describe("PowerUp vs Paddle", () => {
    it("should detect power-up hitting paddle", () => {
      const paddle = new Paddle(800, 600);
      const pu = new PowerUp(400, paddle.y, "wide-paddle");

      const hit = cs.checkPowerUpPaddle(pu, paddle);
      expect(hit).toBe(true);
    });
  });
});

// ============================================================
// PowerUpManager
// ============================================================

describe("PowerUpManager", () => {
  it("should activate wide-paddle", () => {
    const pm = new PowerUpManager();
    pm.activate("wide-paddle");
    expect(pm.isWidePaddleActive()).toBe(true);
  });

  it("should indicate multi-ball spawn", () => {
    const pm = new PowerUpManager();
    const result = pm.activate("multi-ball");
    expect(result.spawnMultiBall).toBe(true);
  });

  it("should activate sticky", () => {
    const pm = new PowerUpManager();
    pm.activate("sticky");
    expect(pm.stickyActive).toBe(true);
  });

  it("should indicate extra life", () => {
    const pm = new PowerUpManager();
    const result = pm.activate("extra-life");
    expect(result.extraLife).toBe(true);
  });

  it("should expire wide-paddle after time", () => {
    const pm = new PowerUpManager();
    pm.activate("wide-paddle");
    pm.update(11);
    expect(pm.isWidePaddleActive()).toBe(false);
  });

  it("should reset all state", () => {
    const pm = new PowerUpManager();
    pm.activate("sticky");
    pm.activate("wide-paddle");
    pm.reset();
    expect(pm.stickyActive).toBe(false);
    expect(pm.isWidePaddleActive()).toBe(false);
  });
});

// ============================================================
// GnomeAI
// ============================================================

describe("GnomeAI", () => {
  it("should throw pots when cooldown expires", () => {
    const ai = new GnomeAI();
    const gnome = new Gnome(400, 100, 5, 0, 0);
    const ball = new Ball(400, 500);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };

    const pots = ai.update([gnome], [ball], 0.1, 5, 10);
    expect(pots.length).toBeGreaterThan(0);
    expect(gnome.potCooldown).toBeGreaterThan(0);
  });

  it("should not throw pots when cooldown is active", () => {
    const ai = new GnomeAI();
    const gnome = new Gnome(400, 100, 5, 0, 10);
    const ball = new Ball(400, 500);
    ball.stuck = false;

    const pots = ai.update([gnome], [ball], 0.1, 5, 10);
    expect(pots.length).toBe(0);
  });
});

// ============================================================
// Scoring (integration via game internals)
// ============================================================

describe("Scoring", () => {
  function createPlayingGame(): any {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas) as any;
    game.resetGame();
    game.state = "playing";
    return game;
  }

  it("should award 1 point for standard brick (1 HP) via updatePlaying", () => {
    const game = createPlayingGame();

    game.bricks = [new Brick(0, 0, 1)];
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const brick = game.bricks[0];
    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    const initialScore = game.score;
    game.updatePlaying(0.016);
    expect(game.score).toBeGreaterThanOrEqual(initialScore + 1);
  });

  it("should award 3 points for tough brick (2 HP) via updatePlaying", () => {
    const game = createPlayingGame();

    const brick = new Brick(0, 0, 2);
    game.bricks = [brick];
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    brick.hitPoints = 1;

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    const initialScore = game.score;
    game.updatePlaying(0.016);

    expect(brick.alive).toBe(false);
    expect(game.score).toBeGreaterThanOrEqual(initialScore + 3);
  });

  it("should award 3 points for very tough brick (3 HP) via updatePlaying", () => {
    const game = createPlayingGame();

    const brick = new Brick(0, 0, 3);
    game.bricks = [brick];
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    brick.hitPoints = 1;

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    const initialScore = game.score;
    game.updatePlaying(0.016);

    expect(brick.alive).toBe(false);
    expect(game.score).toBeGreaterThanOrEqual(initialScore + 3);
  });

  it("should award 5 points for catching a falling gnome via updatePlaying", () => {
    const game = createPlayingGame();

    game.bricks = [new Brick(5, 5, 1)];
    game.flowerPots = [];
    game.powerUps = [];

    const ball = new Ball(100, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    const paddle = game.paddle;
    const gnome = new Gnome(paddle.x, paddle.top + 2, 0, 0, 999);
    gnome.startFalling();
    game.gnomes = [gnome];

    const initialScore = game.score;
    game.updatePlaying(0.016);

    expect(gnome.state).toBe("caught");
    expect(game.score).toBe(initialScore + 5);
  });
});

// ============================================================
// Multi-ball edge case
// ============================================================

describe("Multi-ball life loss", () => {
  function createPlayingGame(): any {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas) as any;
    game.resetGame();
    game.state = "playing";
    return game;
  }

  it("should not lose life when one ball dies but others remain via updatePlaying", () => {
    const game = createPlayingGame();

    game.bricks = [new Brick(5, 5, 1)];
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const ball1 = new Ball(400, 300);
    ball1.stuck = false;
    ball1.vel = { x: 100, y: -200 };

    const ball2 = new Ball(400, 700);
    ball2.stuck = false;
    ball2.vel = { x: 0, y: 200 };
    ball2.alive = false;

    game.balls = [ball1, ball2];
    const livesBefore = game.lives;

    game.updatePlaying(0.016);

    expect(game.lives).toBe(livesBefore);
    expect(game.balls.length).toBe(1);
    expect(game.balls[0]).toBe(ball1);
  });

  it("should lose life when last ball dies via updatePlaying", () => {
    const game = createPlayingGame();

    game.bricks = [new Brick(5, 5, 1)];
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const ball = new Ball(400, 700);
    ball.stuck = false;
    ball.vel = { x: 0, y: 250 };
    ball.alive = false;

    game.balls = [ball];
    const livesBefore = game.lives;

    game.updatePlaying(0.016);

    expect(game.lives).toBe(livesBefore - 1);
  });
});

// ============================================================
// Ball horizontal loop edge case
// ============================================================

describe("Ball horizontal loop prevention", () => {
  it("should nudge vertical velocity when near zero", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 250, y: 5 };
    ball.ensureMinVerticalSpeed();
    expect(Math.abs(ball.vel.y)).toBeGreaterThanOrEqual(60);
  });

  it("should preserve direction when nudging", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 250, y: -5 };
    ball.ensureMinVerticalSpeed();
    expect(ball.vel.y).toBeLessThan(0);
    expect(Math.abs(ball.vel.y)).toBeGreaterThanOrEqual(60);
  });
});

// ============================================================
// File Structure validation
// ============================================================

describe("File structure", () => {
  it("should import all necessary modules without errors", () => {
    expect(jardinainsDescriptor).toBeDefined();
    expect(LEVELS).toBeDefined();
    expect(Paddle).toBeDefined();
    expect(Ball).toBeDefined();
    expect(Brick).toBeDefined();
    expect(Gnome).toBeDefined();
    expect(FlowerPot).toBeDefined();
    expect(PowerUp).toBeDefined();
    expect(CollisionSystem).toBeDefined();
    expect(PowerUpManager).toBeDefined();
    expect(GnomeAI).toBeDefined();
  });
});
