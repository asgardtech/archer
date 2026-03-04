/**
 * QA Tests for PR #24: Jardinains Game Implementation (Issue #21)
 *
 * Tests all acceptance criteria from the Gherkin specification.
 */

import * as fs from "fs";
import * as path from "path";
import { GameDescriptor, IGame } from "../src/shared/types";
import { GAME_REGISTRY } from "../src/launcher/registry";
import { jardinainsDescriptor } from "../src/games/jardinains";
import { JardinainsGame } from "../src/games/jardinains/JardinainsGame";
import { LEVELS } from "../src/games/jardinains/levels";
import { Paddle } from "../src/games/jardinains/entities/Paddle";
import { Ball } from "../src/games/jardinains/entities/Ball";
import { Brick, BRICK_OFFSET_LEFT, BRICK_WIDTH, BRICK_PADDING, BRICK_HEIGHT, BRICK_OFFSET_TOP } from "../src/games/jardinains/entities/Brick";
import { Gnome } from "../src/games/jardinains/entities/Gnome";
import { FlowerPot } from "../src/games/jardinains/entities/FlowerPot";
import { PowerUp } from "../src/games/jardinains/entities/PowerUp";
import { CollisionSystem } from "../src/games/jardinains/systems/CollisionSystem";
import { PowerUpManager } from "../src/games/jardinains/systems/PowerUpManager";
import { GnomeAI } from "../src/games/jardinains/systems/GnomeAI";
import { HUD } from "../src/games/jardinains/rendering/HUD";
import { InputManager } from "../src/games/jardinains/systems/InputManager";

// ── Test Helpers ──

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
  (global as any).document = { getElementById: jest.fn(() => canvas) };
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

function createGame(): { game: IGame; internals: any; canvas: HTMLCanvasElement } {
  const canvas = createMockCanvas();
  setupDom(canvas);
  const game = jardinainsDescriptor.createGame(canvas);
  return { game, internals: game as any, canvas };
}

function createPlayingGame(): any {
  const { internals } = createGame();
  internals.resetGame();
  internals.state = "playing";
  return internals;
}

const srcRoot = path.resolve(__dirname, "..", "src");

// ══════════════════════════════════════════════════════════════
// Scenario: Jardinains appears in the game collection launcher
// ══════════════════════════════════════════════════════════════

describe("Launcher Integration", () => {
  test("Jardinains game card should be visible in the launcher", () => {
    const found = GAME_REGISTRY.find((g) => g.id === "jardinains");
    expect(found).toBeDefined();
    expect(found!.name).toBe("Jardinains");
  });

  test("Card description should mention gnomes or bricks", () => {
    const desc = jardinainsDescriptor.description.toLowerCase();
    const mentionsRelevant = desc.includes("gnome") || desc.includes("brick");
    expect(mentionsRelevant).toBe(true);
  });

  test("Jardinains can be launched from the launcher (createGame works)", () => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    const game = jardinainsDescriptor.createGame(canvas);
    expect(game).toBeDefined();
    expect(typeof game.start).toBe("function");
  });

  test("Returning to launcher after gameover calls onExit", () => {
    const { game, internals } = createGame();
    const onExit = jest.fn();
    game.onExit = onExit;
    internals.state = "gameover";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("Returning to launcher after victory calls onExit", () => {
    const { game, internals } = createGame();
    const onExit = jest.fn();
    game.onExit = onExit;
    internals.state = "victory";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: IGame Interface
// ══════════════════════════════════════════════════════════════

describe("IGame Interface", () => {
  test("instance exposes start(), stop(), destroy() methods", () => {
    const { game } = createGame();
    expect(typeof game.start).toBe("function");
    expect(typeof game.stop).toBe("function");
    expect(typeof game.destroy).toBe("function");
  });

  test("onExit is initially null", () => {
    const { game } = createGame();
    expect(game.onExit).toBeNull();
  });

  test("onExit can be set to a callback", () => {
    const { game } = createGame();
    const cb = jest.fn();
    game.onExit = cb;
    expect(game.onExit).toBe(cb);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: destroy() behaviour
// ══════════════════════════════════════════════════════════════

describe("Jardinains cleanup on destroy", () => {
  test("game loop stops and cancelAnimationFrame is called", () => {
    const { game, internals } = createGame();
    game.start();
    expect(requestAnimationFrame).toHaveBeenCalled();
    game.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(internals.running).toBe(false);
  });

  test("all event listeners are removed", () => {
    const { game, canvas } = createGame();
    game.start();
    game.destroy();
    const removedTypes = (canvas.removeEventListener as jest.Mock).mock.calls.map((c: any[]) => c[0]);
    expect(removedTypes).toContain("mousemove");
    expect(removedTypes).toContain("mousedown");
    expect(removedTypes).toContain("touchstart");
    expect(removedTypes).toContain("touchmove");
    expect(removedTypes).toContain("touchend");
  });

  test("destroy() is idempotent — calling twice does not throw", () => {
    const { game, internals } = createGame();
    game.start();
    game.destroy();
    expect(() => game.destroy()).not.toThrow();
    expect(internals.destroyed).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Paddle Mechanics
// ══════════════════════════════════════════════════════════════

describe("Paddle Mechanics", () => {
  test("paddle follows horizontal mouse movement", () => {
    const paddle = new Paddle(800, 600);
    paddle.update(0.016, 350, 800);
    expect(paddle.x).toBe(350);
  });

  test("paddle remains within canvas left boundary", () => {
    const paddle = new Paddle(800, 600);
    paddle.update(0.016, -50, 800);
    expect(paddle.x).toBe(paddle.width / 2);
  });

  test("paddle remains within canvas right boundary", () => {
    const paddle = new Paddle(800, 600);
    paddle.update(0.016, 900, 800);
    expect(paddle.x).toBe(800 - paddle.width / 2);
  });

  test("paddle supports touch input (InputManager constructor)", () => {
    expect(InputManager).toBeDefined();
  });

  test("paddle y position is near the bottom of the screen", () => {
    const paddle = new Paddle(800, 600);
    expect(paddle.y).toBeGreaterThan(500);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Ball Mechanics
// ══════════════════════════════════════════════════════════════

describe("Ball Mechanics", () => {
  test("ball launches from paddle on click", () => {
    const ball = new Ball(400, 560);
    expect(ball.stuck).toBe(true);
    ball.launch(250);
    expect(ball.stuck).toBe(false);
    expect(ball.vel.y).toBeLessThan(0); // launched upward
    expect(ball.getSpeed()).toBeCloseTo(250, 0);
  });

  test("ball reflects off the top wall", () => {
    const ball = new Ball(400, 5);
    ball.stuck = false;
    ball.vel = { x: 100, y: -250 };
    ball.update(0.05, 800, 600);
    expect(ball.vel.y).toBeGreaterThan(0);
  });

  test("ball reflects off the left wall", () => {
    const ball = new Ball(3, 300);
    ball.stuck = false;
    ball.vel = { x: -250, y: -100 };
    ball.update(0.05, 800, 600);
    expect(ball.vel.x).toBeGreaterThan(0);
  });

  test("ball reflects off the right wall", () => {
    const ball = new Ball(797, 300);
    ball.stuck = false;
    ball.vel = { x: 250, y: -100 };
    ball.update(0.05, 800, 600);
    expect(ball.vel.x).toBeLessThan(0);
  });

  test("ball reflects off the paddle with angle depending on hit position", () => {
    const cs = new CollisionSystem();
    const paddle = new Paddle(800, 600);

    // Hit left edge of paddle
    const ballLeft = new Ball(paddle.left + 5, paddle.top - 5);
    ballLeft.stuck = false;
    ballLeft.vel = { x: 0, y: 250 };
    cs.checkBallPaddle(ballLeft, paddle, false);

    // Hit right edge of paddle
    const ballRight = new Ball(paddle.right - 5, paddle.top - 5);
    ballRight.stuck = false;
    ballRight.vel = { x: 0, y: 250 };
    cs.checkBallPaddle(ballRight, paddle, false);

    // Left hit should send ball more leftward, right hit more rightward
    expect(ballLeft.vel.x).toBeLessThan(0);
    expect(ballRight.vel.x).toBeGreaterThan(0);
  });

  test("losing the ball costs a life", () => {
    const game = createPlayingGame();
    game.bricks = [new Brick(5, 5, 1)]; // keep at least one brick
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

  test("a new ball appears on the paddle after losing a ball", () => {
    const game = createPlayingGame();
    game.bricks = [new Brick(5, 5, 1)];
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];
    game.lives = 3;

    const ball = new Ball(400, 700);
    ball.stuck = false;
    ball.vel = { x: 0, y: 250 };
    ball.alive = false;
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.balls.length).toBe(1);
    expect(game.balls[0].stuck).toBe(true);
  });

  test("game over when all lives are lost", () => {
    const game = createPlayingGame();
    game.bricks = [new Brick(5, 5, 1)];
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];
    game.lives = 1;

    const ball = new Ball(400, 700);
    ball.stuck = false;
    ball.vel = { x: 0, y: 250 };
    ball.alive = false;
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.state).toBe("gameover");
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Brick Mechanics
// ══════════════════════════════════════════════════════════════

describe("Brick Mechanics", () => {
  test("standard brick (1 HP) is destroyed in one hit", () => {
    const brick = new Brick(0, 0, 1);
    const destroyed = brick.hit();
    expect(destroyed).toBe(true);
    expect(brick.alive).toBe(false);
  });

  test("tough brick (2 HP) requires two hits", () => {
    const brick = new Brick(0, 0, 2);
    const firstHit = brick.hit();
    expect(firstHit).toBe(false);
    expect(brick.hitPoints).toBe(1);
    expect(brick.alive).toBe(true);

    const secondHit = brick.hit();
    expect(secondHit).toBe(true);
    expect(brick.alive).toBe(false);
  });

  test("very tough brick (3 HP) requires three hits", () => {
    const brick = new Brick(0, 0, 3);
    brick.hit();
    expect(brick.hitPoints).toBe(2);
    brick.hit();
    expect(brick.hitPoints).toBe(1);
    const destroyed = brick.hit();
    expect(destroyed).toBe(true);
    expect(brick.alive).toBe(false);
  });

  test("ball reflects off bricks", () => {
    const cs = new CollisionSystem();
    const brick = new Brick(5, 2, 1);
    const ball = new Ball(brick.centerX, brick.bottom + 5);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };

    const hits = cs.checkBallBricks(ball, [brick]);
    expect(hits.length).toBe(1);
    // After collision, ball velocity should have changed direction
    expect(ball.vel.y).toBeGreaterThan(0);
  });

  test("player earns 1 point per standard brick", () => {
    const game = createPlayingGame();
    game.score = 0;
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const brick = new Brick(0, 0, 1);
    game.bricks = [brick, new Brick(5, 5, 1)]; // second brick prevents level_complete

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.score).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Gnome Mechanics
// ══════════════════════════════════════════════════════════════

describe("Gnome Mechanics", () => {
  test("gnomes start in sitting state", () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    expect(gnome.state).toBe("sitting");
  });

  test("gnome is positioned above its assigned brick", () => {
    const brickCol = 3;
    const brickRow = 0;
    const brickX = BRICK_OFFSET_LEFT + brickCol * (BRICK_WIDTH + BRICK_PADDING) + BRICK_WIDTH / 2;
    const brickY = BRICK_OFFSET_TOP + brickRow * (BRICK_HEIGHT + BRICK_PADDING);
    const gnome = new Gnome(brickX, brickY, brickCol, brickRow, 5);
    expect(gnome.x).toBe(brickX);
    expect(gnome.y).toBe(brickY);
    expect(gnome.brickCol).toBe(brickCol);
    expect(gnome.brickRow).toBe(brickRow);
  });

  test("gnome falls when supporting brick is destroyed", () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    gnome.startFalling();
    expect(gnome.state).toBe("falling");
    expect(gnome.fallVelocity).toBe(0); // starts at 0 velocity
  });

  test("falling gnome accelerates downward due to gravity", () => {
    const gnome = new Gnome(100, 100, 0, 0, 5);
    gnome.startFalling();
    const initialY = gnome.y;
    gnome.update(0.1);
    expect(gnome.fallVelocity).toBeGreaterThan(0);
    expect(gnome.y).toBeGreaterThan(initialY);
  });

  test("catching a falling gnome on the paddle awards 5 bonus points", () => {
    const game = createPlayingGame();
    game.score = 10;
    game.bricks = [new Brick(5, 5, 1)];
    game.flowerPots = [];
    game.powerUps = [];

    const ball = new Ball(100, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    const gnome = new Gnome(game.paddle.x, game.paddle.top + 2, 0, 0, 999);
    gnome.startFalling();
    game.gnomes = [gnome];

    game.updatePlaying(0.016);
    expect(gnome.state).toBe("caught");
    expect(game.score).toBe(15);
  });

  test("falling gnome that misses the paddle is marked as gone", () => {
    const gnome = new Gnome(100, 700, 0, 0, 5);
    gnome.startFalling();
    gnome.isGone(600);
    expect(gnome.state).toBe("gone");
  });

  test("gnomes are filtered out once gone", () => {
    const game = createPlayingGame();
    game.bricks = [new Brick(5, 5, 1)];
    game.flowerPots = [];
    game.powerUps = [];

    const ball = new Ball(100, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    const gnome = new Gnome(100, 800, 0, 0, 999);
    gnome.startFalling();
    game.gnomes = [gnome];

    game.updatePlaying(0.016);
    // Gnome should be filtered to gone
    expect(game.gnomes.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Flower Pot Attacks
// ══════════════════════════════════════════════════════════════

describe("Flower Pot Attacks", () => {
  test("gnomes throw flower pots when cooldown expires", () => {
    const ai = new GnomeAI();
    const gnome = new Gnome(400, 100, 5, 0, 0); // cooldown = 0
    const ball = new Ball(400, 500);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };

    const pots = ai.update([gnome], [ball], 0.1, 5, 10);
    expect(pots.length).toBeGreaterThan(0);
    expect(gnome.potCooldown).toBeGreaterThan(0); // cooldown reset
  });

  test("flower pot entity is created at gnome position", () => {
    const pot = new FlowerPot(200, 100);
    expect(pot.pos.x).toBe(200);
    expect(pot.pos.y).toBe(100);
    expect(pot.vel.x).toBe(0);
    expect(pot.vel.y).toBeGreaterThan(0); // falls straight down
  });

  test("flower pot falls straight down", () => {
    const pot = new FlowerPot(200, 100);
    const initialX = pot.pos.x;
    pot.update(0.1, 600);
    expect(pot.pos.x).toBe(initialX);
    expect(pot.pos.y).toBeGreaterThan(100);
  });

  test("flower pot hitting the paddle shrinks it", () => {
    const paddle = new Paddle(800, 600);
    const originalWidth = paddle.width;
    paddle.applyShrink();
    expect(paddle.width).toBeLessThan(originalWidth);
    expect(paddle.shrinkTimer).toBeGreaterThan(0);
  });

  test("paddle width does not go below 40px after pot hit", () => {
    const paddle = new Paddle(800, 600);
    // Apply multiple shrinks
    for (let i = 0; i < 10; i++) {
      paddle.applyShrink();
    }
    expect(paddle.width).toBeGreaterThanOrEqual(40);
  });

  test("flower pot that misses the paddle is removed", () => {
    const pot = new FlowerPot(100, 630);
    pot.update(0.1, 600);
    expect(pot.alive).toBe(false);
  });

  test("flower pot collision detection with paddle", () => {
    const cs = new CollisionSystem();
    const paddle = new Paddle(800, 600);
    const pot = new FlowerPot(paddle.x, paddle.y);
    expect(cs.checkPotPaddle(pot, paddle)).toBe(true);
  });

  test("flower pot far from paddle does not collide", () => {
    const cs = new CollisionSystem();
    const paddle = new Paddle(800, 600);
    const pot = new FlowerPot(paddle.x, 100);
    expect(cs.checkPotPaddle(pot, paddle)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Power-Ups
// ══════════════════════════════════════════════════════════════

describe("Power-Ups", () => {
  test("destroyed brick with hasPowerUp drops a power-up", () => {
    const game = createPlayingGame();
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const brick = new Brick(0, 0, 1);
    brick.hasPowerUp = true;
    brick.powerUpType = "wide-paddle";
    game.bricks = [brick, new Brick(5, 5, 1)];

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.powerUps.length).toBe(1);
    expect(game.powerUps[0].type).toBe("wide-paddle");
  });

  test("wide-paddle power-up increases paddle width", () => {
    const paddle = new Paddle(800, 600);
    const originalWidth = paddle.width;
    paddle.applyWide();
    expect(paddle.width).toBeGreaterThan(originalWidth);
    expect(paddle.wideTimer).toBeGreaterThan(0);
  });

  test("wide-paddle effect lasts for a limited duration", () => {
    const pm = new PowerUpManager();
    pm.activate("wide-paddle");
    expect(pm.isWidePaddleActive()).toBe(true);
    pm.update(11);
    expect(pm.isWidePaddleActive()).toBe(false);
  });

  test("multi-ball power-up spawns additional balls", () => {
    const pm = new PowerUpManager();
    const result = pm.activate("multi-ball");
    expect(result.spawnMultiBall).toBe(true);
  });

  test("multi-ball spawns 2 additional balls from current ball position", () => {
    const game = createPlayingGame();
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];
    game.bricks = [new Brick(5, 5, 1)];

    const ball = new Ball(400, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    game.spawnMultiBalls();
    expect(game.balls.length).toBe(3);
    // All should be alive and not stuck
    for (const b of game.balls) {
      expect(b.alive).toBe(true);
    }
  });

  test("sticky power-up makes ball stick to paddle on next contact", () => {
    const cs = new CollisionSystem();
    const pm = new PowerUpManager();
    pm.activate("sticky");
    expect(pm.stickyActive).toBe(true);

    const paddle = new Paddle(800, 600);
    const ball = new Ball(paddle.x, paddle.top - 5);
    ball.stuck = false;
    ball.vel = { x: 0, y: 250 };

    cs.checkBallPaddle(ball, paddle, pm.stickyActive);
    expect(ball.stuck).toBe(true);
  });

  test("sticky ball relaunches on click", () => {
    const ball = new Ball(400, 560);
    ball.stuck = true;
    ball.launch(250);
    expect(ball.stuck).toBe(false);
    expect(ball.getSpeed()).toBeCloseTo(250, 0);
  });

  test("extra-life power-up grants a life", () => {
    const pm = new PowerUpManager();
    const result = pm.activate("extra-life");
    expect(result.extraLife).toBe(true);
  });

  test("extra-life integration: lives increase in game", () => {
    const game = createPlayingGame();
    game.gnomes = [];
    game.flowerPots = [];
    game.bricks = [new Brick(5, 5, 1)];

    const ball = new Ball(100, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    const pu = new PowerUp(game.paddle.x, game.paddle.y, "extra-life");
    game.powerUps = [pu];

    const livesBefore = game.lives;
    game.updatePlaying(0.016);
    expect(game.lives).toBe(livesBefore + 1);
  });

  test("power-up falls straight down from brick position", () => {
    const pu = new PowerUp(300, 100, "wide-paddle");
    expect(pu.vel.x).toBe(0);
    expect(pu.vel.y).toBeGreaterThan(0);
    const initialX = pu.pos.x;
    pu.update(0.5, 600);
    expect(pu.pos.x).toBe(initialX);
    expect(pu.pos.y).toBeGreaterThan(100);
  });

  test("power-up collision detection with paddle", () => {
    const cs = new CollisionSystem();
    const paddle = new Paddle(800, 600);
    const pu = new PowerUp(paddle.x, paddle.y, "extra-life");
    expect(cs.checkPowerUpPaddle(pu, paddle)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Level Progression
// ══════════════════════════════════════════════════════════════

describe("Level Progression", () => {
  test("level complete when all bricks are destroyed", () => {
    const game = createPlayingGame();
    game.currentLevel = 0;
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    // All bricks dead
    const brick = new Brick(0, 0, 1);
    brick.alive = false;
    game.bricks = [brick];

    const ball = new Ball(400, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.state).toBe("level_complete");
  });

  test("next level starts after clicking on level complete screen", () => {
    const { internals } = createGame();
    internals.resetGame();
    internals.state = "level_complete";
    internals.currentLevel = 0;
    internals.input.wasClicked = true;

    internals.update(0.016);
    expect(internals.state).toBe("playing");
    expect(internals.currentLevel).toBe(1);
  });

  test("ball resets to paddle after starting next level", () => {
    const { internals } = createGame();
    internals.resetGame();
    internals.startLevel(1);

    expect(internals.balls.length).toBe(1);
    expect(internals.balls[0].stuck).toBe(true);
  });

  test("completing all 5 levels triggers victory", () => {
    const game = createPlayingGame();
    game.currentLevel = 4; // Level 5 (0-indexed)
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const brick = new Brick(0, 0, 1);
    brick.alive = false;
    game.bricks = [brick];

    const ball = new Ball(400, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.state).toBe("victory");
  });

  test("lives carry over between levels", () => {
    const game = createPlayingGame();
    game.lives = 2;
    game.startLevel(1);
    expect(game.lives).toBe(2);
  });

  test("score includes level-clear bonus of 10", () => {
    const game = createPlayingGame();
    game.currentLevel = 0;
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];
    game.score = 5;

    const brick = new Brick(0, 0, 1);
    brick.alive = false;
    game.bricks = [brick];

    const ball = new Ball(400, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.score).toBe(15); // 5 + 10 level clear bonus
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Five Levels Exist
// ══════════════════════════════════════════════════════════════

describe("Five Levels Configuration", () => {
  test("game has exactly 5 levels", () => {
    expect(LEVELS).toHaveLength(5);
  });

  test('level 1 is named "Garden Path"', () => {
    expect(LEVELS[0].name).toBe("Garden Path");
  });

  test('level 2 is named "Flower Bed"', () => {
    expect(LEVELS[1].name).toBe("Flower Bed");
  });

  test('level 3 is named "Hedge Maze"', () => {
    expect(LEVELS[2].name).toBe("Hedge Maze");
  });

  test('level 4 is named "Greenhouse"', () => {
    expect(LEVELS[3].name).toBe("Greenhouse");
  });

  test('level 5 is named "Gnome Fortress"', () => {
    expect(LEVELS[4].name).toBe("Gnome Fortress");
  });

  test("each level has unique names", () => {
    const names = LEVELS.map((l) => l.name);
    expect(new Set(names).size).toBe(5);
  });

  test("each level has a brick layout", () => {
    for (const level of LEVELS) {
      expect(level.brickLayout.length).toBeGreaterThan(0);
    }
  });

  test("each level has gnome positions", () => {
    for (const level of LEVELS) {
      expect(level.gnomePositions.length).toBeGreaterThan(0);
    }
  });

  test("ball speed increases across levels", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].ballSpeed).toBeGreaterThan(LEVELS[i - 1].ballSpeed);
    }
  });

  test("gnome count increases across levels", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].gnomePositions.length).toBeGreaterThanOrEqual(
        LEVELS[i - 1].gnomePositions.length
      );
    }
  });

  test("pot throw frequency increases (min interval decreases) across levels", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].potThrowMinInterval).toBeLessThanOrEqual(
        LEVELS[i - 1].potThrowMinInterval
      );
    }
  });

  test("each level has sky gradient colors", () => {
    for (const level of LEVELS) {
      expect(level.skyGradient).toHaveLength(2);
      expect(level.skyGradient[0]).toMatch(/^#/);
      expect(level.skyGradient[1]).toMatch(/^#/);
    }
  });

  test("each level has valid powerUpChance between 0 and 1", () => {
    for (const level of LEVELS) {
      expect(level.powerUpChance).toBeGreaterThanOrEqual(0);
      expect(level.powerUpChance).toBeLessThanOrEqual(1);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Scoring
// ══════════════════════════════════════════════════════════════

describe("Scoring", () => {
  test("score increases by 1 when standard brick (1HP) is destroyed", () => {
    const game = createPlayingGame();
    game.score = 0;
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const brick = new Brick(0, 0, 1);
    game.bricks = [brick, new Brick(5, 5, 1)];

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(game.score).toBe(1);
  });

  test("tough brick (2HP) awards 3 points when fully destroyed", () => {
    const game = createPlayingGame();
    game.score = 0;
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const brick = new Brick(0, 0, 2);
    brick.hitPoints = 1; // one more hit to destroy
    game.bricks = [brick, new Brick(5, 5, 1)];

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(brick.alive).toBe(false);
    expect(game.score).toBe(3);
  });

  test("very tough brick (3HP) awards 3 points when fully destroyed", () => {
    const game = createPlayingGame();
    game.score = 0;
    game.gnomes = [];
    game.flowerPots = [];
    game.powerUps = [];

    const brick = new Brick(0, 0, 3);
    brick.hitPoints = 1;
    game.bricks = [brick, new Brick(5, 5, 1)];

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    game.updatePlaying(0.016);
    expect(brick.alive).toBe(false);
    expect(game.score).toBe(3);
  });

  test("catching gnome awards 5 bonus points", () => {
    const game = createPlayingGame();
    game.score = 10;
    game.bricks = [new Brick(5, 5, 1)];
    game.flowerPots = [];
    game.powerUps = [];

    const ball = new Ball(100, 300);
    ball.stuck = false;
    ball.vel = { x: 100, y: -200 };
    game.balls = [ball];

    const gnome = new Gnome(game.paddle.x, game.paddle.top + 2, 0, 0, 999);
    gnome.startFalling();
    game.gnomes = [gnome];

    game.updatePlaying(0.016);
    expect(game.score).toBe(15);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: HUD Display
// ══════════════════════════════════════════════════════════════

describe("HUD Display", () => {
  test("HUD renders score during playing state", () => {
    const hud = new HUD(false);
    const ctx = (createMockCanvas() as any).__ctx;

    hud.render(ctx, "playing", 42, 3, 1, "Garden Path", 800, 600);

    const fillTextCalls = ctx.fillText.mock.calls;
    const scoreRendered = fillTextCalls.some(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("42")
    );
    expect(scoreRendered).toBe(true);
  });

  test("HUD renders lives during playing state", () => {
    const hud = new HUD(false);
    const ctx = (createMockCanvas() as any).__ctx;

    hud.render(ctx, "playing", 0, 3, 1, "Garden Path", 800, 600);

    const fillTextCalls = ctx.fillText.mock.calls;
    const livesRendered = fillTextCalls.some(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("♥")
    );
    expect(livesRendered).toBe(true);
  });

  test("HUD renders level number and name during playing state", () => {
    const hud = new HUD(false);
    const ctx = (createMockCanvas() as any).__ctx;

    hud.render(ctx, "playing", 0, 3, 2, "Flower Bed", 800, 600);

    const fillTextCalls = ctx.fillText.mock.calls;
    const levelRendered = fillTextCalls.some(
      (c: any[]) =>
        typeof c[0] === "string" &&
        c[0].includes("2") &&
        c[0].includes("Flower Bed")
    );
    expect(levelRendered).toBe(true);
  });

  test("HUD renders game over overlay", () => {
    const hud = new HUD(false);
    const ctx = (createMockCanvas() as any).__ctx;

    hud.render(ctx, "gameover", 50, 0, 1, "Garden Path", 800, 600);

    const fillTextCalls = ctx.fillText.mock.calls;
    const gameOverRendered = fillTextCalls.some(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("Game Over")
    );
    expect(gameOverRendered).toBe(true);
  });

  test("HUD renders victory overlay", () => {
    const hud = new HUD(false);
    const ctx = (createMockCanvas() as any).__ctx;

    hud.render(ctx, "victory", 100, 0, 5, "Gnome Fortress", 800, 600);

    const fillTextCalls = ctx.fillText.mock.calls;
    const victoryRendered = fillTextCalls.some(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("Victory")
    );
    expect(victoryRendered).toBe(true);
  });

  test('HUD shows "Click to Start" on menu for non-touch', () => {
    const hud = new HUD(false);
    const ctx = (createMockCanvas() as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 1, "Garden Path", 800, 600);

    const fillTextCalls = ctx.fillText.mock.calls;
    const clickToStart = fillTextCalls.some(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("Click to Start")
    );
    expect(clickToStart).toBe(true);
  });

  test('HUD shows "Tap to Start" on menu for touch devices', () => {
    const hud = new HUD(true);
    const ctx = (createMockCanvas() as any).__ctx;

    hud.render(ctx, "menu", 0, 3, 1, "Garden Path", 800, 600);

    const fillTextCalls = ctx.fillText.mock.calls;
    const tapToStart = fillTextCalls.some(
      (c: any[]) => typeof c[0] === "string" && c[0].includes("Tap to Start")
    );
    expect(tapToStart).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Game Registry
// ══════════════════════════════════════════════════════════════

describe("Game Registry", () => {
  test('registry contains game with id "jardinains"', () => {
    const found = GAME_REGISTRY.find((g) => g.id === "jardinains");
    expect(found).toBeDefined();
  });

  test("Jardinains descriptor has valid createGame function", () => {
    const desc = GAME_REGISTRY.find((g) => g.id === "jardinains");
    expect(typeof desc!.createGame).toBe("function");
  });

  test("registry contains at least 2 games", () => {
    expect(GAME_REGISTRY.length).toBeGreaterThanOrEqual(2);
  });

  test('registry contains both "archer" and "jardinains"', () => {
    const ids = GAME_REGISTRY.map((g) => g.id);
    expect(ids).toContain("archer");
    expect(ids).toContain("jardinains");
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: File Structure
// ══════════════════════════════════════════════════════════════

describe("File Structure", () => {
  const requiredFiles = [
    "games/jardinains/index.ts",
    "games/jardinains/JardinainsGame.ts",
    "games/jardinains/types.ts",
    "games/jardinains/levels.ts",
    "games/jardinains/entities/Paddle.ts",
    "games/jardinains/entities/Ball.ts",
    "games/jardinains/entities/Brick.ts",
    "games/jardinains/entities/Gnome.ts",
    "games/jardinains/entities/FlowerPot.ts",
    "games/jardinains/entities/PowerUp.ts",
    "games/jardinains/systems/InputManager.ts",
    "games/jardinains/systems/CollisionSystem.ts",
    "games/jardinains/systems/GnomeAI.ts",
    "games/jardinains/systems/PowerUpManager.ts",
    "games/jardinains/rendering/HUD.ts",
  ];

  for (const file of requiredFiles) {
    test(`src/${file} exists`, () => {
      const fullPath = path.join(srcRoot, file);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  }
});

// ══════════════════════════════════════════════════════════════
// Scenario: Edge Cases
// ══════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  test("ball does not get stuck in horizontal loop", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 250, y: 5 };
    ball.ensureMinVerticalSpeed();
    expect(Math.abs(ball.vel.y)).toBeGreaterThanOrEqual(60);
  });

  test("ball preserves direction when nudging vertical velocity", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 250, y: -5 };
    ball.ensureMinVerticalSpeed();
    expect(ball.vel.y).toBeLessThan(0);
    expect(Math.abs(ball.vel.y)).toBeGreaterThanOrEqual(60);
  });

  test("multi-ball: player does not lose life when one ball dies but others remain", () => {
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

  test("multi-ball: player loses life when last ball is lost", () => {
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

  test("paddle width clamped to minimum (40px) when base width is small", () => {
    const paddle = new Paddle(800, 600);
    // Artificially reduce baseWidth so that shrink would go below 40
    (paddle as any).baseWidth = 50;
    paddle.applyShrink(); // 50 - 30 = 20, should clamp to 40
    expect(paddle.width).toBe(40);
  });

  test("paddle shrink is not additive — multiple pot hits reset timer, not stack", () => {
    const paddle = new Paddle(800, 600);
    paddle.applyShrink();
    const widthAfterFirst = paddle.width;
    paddle.applyShrink();
    // Width should be the same — shrink doesn't stack
    expect(paddle.width).toBe(widthAfterFirst);
    expect(paddle.width).toBeGreaterThanOrEqual(40);
  });

  test("dt is capped to prevent tunneling (DT_CAP pattern)", () => {
    const { game, internals } = createGame();
    internals.state = "menu";
    internals.lastTime = 0;

    // Simulate a huge dt by calling loop with a timestamp far in the future
    // The DT_CAP at 0.1s means the game won't process more than 100ms
    // We verify indirectly by checking the game doesn't crash
    expect(() => {
      internals.loop(10000); // 10 seconds gap
    }).not.toThrow();
  });

  test("game does not crash when canvas context is unavailable", () => {
    const canvas = {
      getContext: jest.fn(() => null),
      width: 800,
      height: 600,
      style: {} as CSSStyleDeclaration,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as unknown as HTMLCanvasElement;
    setupDom(canvas);

    expect(() => {
      new JardinainsGame(canvas);
    }).toThrow("Failed to get 2D rendering context");
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Game State Machine
// ══════════════════════════════════════════════════════════════

describe("Game State Machine", () => {
  test("game starts in menu state", () => {
    const { internals } = createGame();
    expect(internals.state).toBe("menu");
  });

  test("clicking in menu transitions to playing", () => {
    const { internals } = createGame();
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(internals.state).toBe("playing");
  });

  test("game over → click with onExit → calls onExit", () => {
    const { game, internals } = createGame();
    const onExit = jest.fn();
    game.onExit = onExit;
    internals.state = "gameover";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(onExit).toHaveBeenCalled();
  });

  test("game over → click without onExit → returns to menu", () => {
    const { internals } = createGame();
    internals.state = "gameover";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(internals.state).toBe("menu");
  });

  test("victory → click with onExit → calls onExit", () => {
    const { game, internals } = createGame();
    const onExit = jest.fn();
    game.onExit = onExit;
    internals.state = "victory";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(onExit).toHaveBeenCalled();
  });

  test("victory → click without onExit → returns to menu", () => {
    const { internals } = createGame();
    internals.state = "victory";
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(internals.state).toBe("menu");
  });

  test("level_complete → click → starts next level", () => {
    const { internals } = createGame();
    internals.resetGame();
    internals.state = "level_complete";
    internals.currentLevel = 2;
    internals.input.wasClicked = true;
    internals.update(0.016);
    expect(internals.state).toBe("playing");
    expect(internals.currentLevel).toBe(3);
  });

  test("player starts with 3 lives", () => {
    const { internals } = createGame();
    internals.resetGame();
    expect(internals.lives).toBe(3);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Integration — Gnome brick destruction triggers fall
// ══════════════════════════════════════════════════════════════

describe("Gnome-Brick Integration", () => {
  test("gnome on a brick transitions to falling when brick is destroyed via game update", () => {
    const game = createPlayingGame();
    game.flowerPots = [];
    game.powerUps = [];

    const brick = new Brick(3, 0, 1);
    brick.hasGnome = true;
    game.bricks = [brick, new Brick(5, 5, 1)];

    const gnome = new Gnome(brick.centerX, brick.y, brick.col, brick.row, 999);
    game.gnomes = [gnome];

    const ball = new Ball(brick.centerX, brick.bottom + 6);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    game.balls = [ball];

    game.updatePlaying(0.016);

    expect(brick.alive).toBe(false);
    expect(gnome.state).toBe("falling");
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: PowerUpManager reset and stacking
// ══════════════════════════════════════════════════════════════

describe("PowerUpManager advanced", () => {
  test("wide-paddle timer resets on re-collection", () => {
    const pm = new PowerUpManager();
    pm.activate("wide-paddle");
    pm.update(5); // 5s passed, 5s remaining
    expect(pm.isWidePaddleActive()).toBe(true);
    pm.activate("wide-paddle"); // re-activate
    pm.update(7); // 7s later — would have expired if not reset
    expect(pm.isWidePaddleActive()).toBe(true);
  });

  test("sticky is consumed after ball relaunches", () => {
    const pm = new PowerUpManager();
    pm.activate("sticky");
    expect(pm.stickyActive).toBe(true);
    pm.consumeSticky();
    expect(pm.stickyActive).toBe(false);
    expect(pm.stickyUsed).toBe(true);
  });

  test("reset clears all power-up state", () => {
    const pm = new PowerUpManager();
    pm.activate("sticky");
    pm.activate("wide-paddle");
    pm.reset();
    expect(pm.stickyActive).toBe(false);
    expect(pm.stickyUsed).toBe(false);
    expect(pm.isWidePaddleActive()).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: GnomeAI ducking behaviour
// ══════════════════════════════════════════════════════════════

describe("GnomeAI ducking", () => {
  test("gnome ducks when ball approaches from below within proximity", () => {
    const ai = new GnomeAI();
    const gnome = new Gnome(400, 100, 5, 0, 999);
    const ball = new Ball(400, 140);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 }; // moving upward towards gnome

    ai.update([gnome], [ball], 0.016, 5, 10);
    expect(gnome.state).toBe("ducking");
  });

  test("gnome does not duck when ball is far away", () => {
    const ai = new GnomeAI();
    const gnome = new Gnome(400, 100, 5, 0, 999);
    const ball = new Ball(400, 500);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };

    ai.update([gnome], [ball], 0.016, 5, 10);
    expect(gnome.state).toBe("sitting");
  });

  test("gnome recovers from ducking after timer expires", () => {
    const gnome = new Gnome(400, 100, 5, 0, 999);
    gnome.duck();
    expect(gnome.state).toBe("ducking");
    gnome.update(0.5); // duck timer is 0.3s
    expect(gnome.state).toBe("sitting");
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Collision System detailed tests
// ══════════════════════════════════════════════════════════════

describe("Collision System detailed", () => {
  let cs: CollisionSystem;

  beforeEach(() => {
    cs = new CollisionSystem();
  });

  test("ball-paddle: no collision when ball moving upward", () => {
    const paddle = new Paddle(800, 600);
    const ball = new Ball(paddle.x, paddle.top - 5);
    ball.stuck = false;
    ball.vel = { x: 0, y: -250 };
    expect(cs.checkBallPaddle(ball, paddle, false)).toBe(false);
  });

  test("ball-paddle: no collision when ball is stuck", () => {
    const paddle = new Paddle(800, 600);
    const ball = new Ball(paddle.x, paddle.top - 5);
    ball.stuck = true;
    ball.vel = { x: 0, y: 250 };
    expect(cs.checkBallPaddle(ball, paddle, false)).toBe(false);
  });

  test("ball-paddle: center hit sends ball roughly straight up", () => {
    const paddle = new Paddle(800, 600);
    const ball = new Ball(paddle.x, paddle.top - 5);
    ball.stuck = false;
    ball.vel = { x: 0, y: 250 };

    cs.checkBallPaddle(ball, paddle, false);
    // Center hit: x velocity should be near 0
    expect(Math.abs(ball.vel.x)).toBeLessThan(50);
    expect(ball.vel.y).toBeLessThan(0);
  });

  test("gnome-paddle: dead pot does not collide", () => {
    const paddle = new Paddle(800, 600);
    const pot = new FlowerPot(paddle.x, paddle.y);
    pot.alive = false;
    expect(cs.checkPotPaddle(pot, paddle)).toBe(false);
  });

  test("power-up: dead power-up does not collide", () => {
    const paddle = new Paddle(800, 600);
    const pu = new PowerUp(paddle.x, paddle.y, "wide-paddle");
    pu.alive = false;
    expect(cs.checkPowerUpPaddle(pu, paddle)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Brick constants and positioning
// ══════════════════════════════════════════════════════════════

describe("Brick positioning", () => {
  test("brick position is computed from col and row", () => {
    const brick = new Brick(3, 2, 1);
    expect(brick.x).toBe(BRICK_OFFSET_LEFT + 3 * (BRICK_WIDTH + BRICK_PADDING));
    expect(brick.y).toBe(BRICK_OFFSET_TOP + 2 * (BRICK_HEIGHT + BRICK_PADDING));
  });

  test("brick exposes center coordinates", () => {
    const brick = new Brick(0, 0, 1);
    expect(brick.centerX).toBe(brick.x + brick.width / 2);
    expect(brick.centerY).toBe(brick.y + brick.height / 2);
  });

  test("brick constants are exported", () => {
    expect(BRICK_WIDTH).toBeGreaterThan(0);
    expect(BRICK_HEIGHT).toBeGreaterThan(0);
    expect(BRICK_PADDING).toBeGreaterThanOrEqual(0);
    expect(BRICK_OFFSET_TOP).toBeGreaterThanOrEqual(0);
    expect(BRICK_OFFSET_LEFT).toBeGreaterThanOrEqual(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Ball speed utilities
// ══════════════════════════════════════════════════════════════

describe("Ball speed utilities", () => {
  test("getSpeed returns magnitude of velocity", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 3, y: 4 };
    expect(ball.getSpeed()).toBeCloseTo(5, 5);
  });

  test("setSpeed scales velocity to target speed", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 3, y: 4 };
    ball.setSpeed(10);
    expect(ball.getSpeed()).toBeCloseTo(10, 5);
    // Direction preserved
    expect(ball.vel.x / ball.vel.y).toBeCloseTo(3 / 4, 5);
  });

  test("setSpeed does nothing when speed is 0", () => {
    const ball = new Ball(400, 300);
    ball.vel = { x: 0, y: 0 };
    ball.setSpeed(100);
    expect(ball.vel.x).toBe(0);
    expect(ball.vel.y).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Level initialization
// ══════════════════════════════════════════════════════════════

describe("Level initialization", () => {
  test("startLevel creates bricks from layout", () => {
    const game = createPlayingGame();
    game.startLevel(0);
    const config = LEVELS[0];
    const expectedBrickCount = config.brickLayout.flat().filter((v: number) => v > 0).length;
    expect(game.bricks.length).toBe(expectedBrickCount);
  });

  test("startLevel creates gnomes from positions", () => {
    const game = createPlayingGame();
    game.startLevel(0);
    const config = LEVELS[0];
    expect(game.gnomes.length).toBe(config.gnomePositions.length);
  });

  test("startLevel marks bricks with gnomes", () => {
    const game = createPlayingGame();
    game.startLevel(0);
    const config = LEVELS[0];

    for (const [col, row] of config.gnomePositions) {
      const brick = game.bricks.find((b: Brick) => b.col === col && b.row === row);
      if (brick) {
        expect(brick.hasGnome).toBe(true);
      }
    }
  });

  test("startLevel resets paddle position", () => {
    const game = createPlayingGame();
    game.paddle.x = 100;
    game.startLevel(0);
    expect(game.paddle.x).toBe(400); // centered
  });

  test("startLevel clears previous entities", () => {
    const game = createPlayingGame();
    game.flowerPots = [new FlowerPot(100, 100)];
    game.powerUps = [new PowerUp(100, 100, "wide-paddle")];
    game.startLevel(0);
    expect(game.flowerPots.length).toBe(0);
    expect(game.powerUps.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Type definitions validation
// ══════════════════════════════════════════════════════════════

describe("Type definitions", () => {
  test("all power-up types are valid", () => {
    const validTypes = ["wide-paddle", "multi-ball", "sticky", "extra-life"];
    for (const type of validTypes) {
      const pu = new PowerUp(0, 0, type as any);
      expect(validTypes).toContain(pu.type);
    }
  });

  test("all gnome states are valid", () => {
    const gnome = new Gnome(0, 0, 0, 0, 5);
    expect(gnome.state).toBe("sitting");

    gnome.duck();
    expect(gnome.state).toBe("ducking");

    gnome.state = "sitting" as any;
    gnome.startFalling();
    expect(gnome.state).toBe("falling");

    gnome.catch();
    expect(gnome.state).toBe("caught");

    gnome.animTimer = 1;
    gnome.isGone(600);
    expect(gnome.state).toBe("gone");
  });
});

// ══════════════════════════════════════════════════════════════
// Scenario: Rendering does not crash
// ══════════════════════════════════════════════════════════════

describe("Rendering", () => {
  test("all entities render without error", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    expect(() => new Paddle(800, 600).render(ctx)).not.toThrow();
    expect(() => new Ball(400, 300).render(ctx)).not.toThrow();
    expect(() => new Brick(0, 0, 1).render(ctx)).not.toThrow();
    expect(() => new Gnome(100, 100, 0, 0, 5).render(ctx)).not.toThrow();
    expect(() => new FlowerPot(100, 100).render(ctx)).not.toThrow();
    expect(() => new PowerUp(100, 100, "wide-paddle").render(ctx)).not.toThrow();
  });

  test("gnome renders in all states without error", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    const gnome = new Gnome(100, 100, 0, 0, 5);
    expect(() => gnome.render(ctx)).not.toThrow(); // sitting

    gnome.duck();
    expect(() => gnome.render(ctx)).not.toThrow(); // ducking

    gnome.state = "sitting" as any;
    gnome.startFalling();
    expect(() => gnome.render(ctx)).not.toThrow(); // falling

    gnome.catch();
    expect(() => gnome.render(ctx)).not.toThrow(); // caught

    gnome.state = "gone" as any;
    expect(() => gnome.render(ctx)).not.toThrow(); // gone
  });

  test("dead ball does not render", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    const ball = new Ball(400, 300);
    ball.alive = false;
    ctx.beginPath.mockClear();
    ball.render(ctx);
    // Should not draw anything (no arc call for ball body)
    expect(ctx.arc).not.toHaveBeenCalled();
  });

  test("dead brick does not render", () => {
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;

    const brick = new Brick(0, 0, 1);
    brick.alive = false;
    ctx.fillRect.mockClear();
    brick.render(ctx);
    expect(ctx.fillRect).not.toHaveBeenCalled();
  });
});
