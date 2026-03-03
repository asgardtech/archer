import { Balloon } from "../src/entities/Balloon";
import { Arrow } from "../src/entities/Arrow";
import { CollisionSystem } from "../src/systems/CollisionSystem";
import { Spawner } from "../src/systems/Spawner";
import { HUD } from "../src/rendering/HUD";

// ============================================================
// Helpers
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
    get balloons() { return game["balloons"]; },
    set balloons(v: any[]) { game["balloons"] = v; },
    get score() { return game["score"]; },
    set score(v: number) { game["score"] = v; },
    get nextAmmoMilestone() { return game["nextAmmoMilestone"]; },
    set nextAmmoMilestone(v: number) { game["nextAmmoMilestone"] = v; },
    get balloonsEscaped() { return game["balloonsEscaped"]; },
    set balloonsEscaped(v: number) { game["balloonsEscaped"] = v; },
    get upgradeManager() { return game["upgradeManager"]; },
    get hud() { return game["hud"]; },
    resetGame: () => game["resetGame"](),
    updatePlaying: (dt: number) => game["updatePlaying"](dt),
    get input() { return game["input"]; },
  };
}

let Game: typeof import("../src/Game").Game;

beforeAll(async () => {
  const canvas = createMockCanvas();
  setupDom(canvas);
  (global as any).performance = { now: jest.fn(() => 0) };
  (global as any).requestAnimationFrame = jest.fn();

  const mod = await import("../src/Game");
  Game = mod.Game;
});

// ============================================================
// Feature: Boss Balloon
// ============================================================

describe("Feature: Boss Balloon", () => {

  // ----------------------------------------------------------
  // Scenario: Boss balloon spawns after 45 seconds of gameplay
  // ----------------------------------------------------------
  describe("Scenario: Boss balloon spawns after 45 seconds of gameplay", () => {
    it("should spawn a boss balloon after at least 45 seconds of gameplay", () => {
      const spawner = new Spawner();
      const allBalloons: Balloon[] = [];

      // Simulate exactly 45 seconds in 0.1s increments
      for (let i = 0; i < 450; i++) {
        const spawned = spawner.update(0.1, 800, 600);
        allBalloons.push(...spawned);
      }

      const bossBalloons = allBalloons.filter((b) => b.variant === "boss");
      expect(bossBalloons.length).toBeGreaterThanOrEqual(1);
    });

    it("should NOT spawn a boss balloon before 45 seconds", () => {
      const spawner = new Spawner();
      const allBalloons: Balloon[] = [];

      // Simulate 44 seconds (< 45s threshold)
      for (let i = 0; i < 440; i++) {
        const spawned = spawner.update(0.1, 800, 600);
        allBalloons.push(...spawned);
      }

      const bossBalloons = allBalloons.filter((b) => b.variant === "boss");
      expect(bossBalloons.length).toBe(0);
    });

    it("boss balloon should rise from the bottom of the screen", () => {
      const spawner = new Spawner();
      let firstBoss: Balloon | undefined;

      for (let i = 0; i < 460; i++) {
        const spawned = spawner.update(0.1, 800, 600);
        for (const b of spawned) {
          if (b.variant === "boss" && !firstBoss) {
            firstBoss = b;
          }
        }
      }

      expect(firstBoss).toBeDefined();
      expect(firstBoss!.pos.y).toBeGreaterThan(600);
      expect(firstBoss!.vel.y).toBeLessThan(0);
    });
  });

  // ----------------------------------------------------------
  // Scenario: Boss balloon requires multiple hits to defeat
  // ----------------------------------------------------------
  describe("Scenario: Boss balloon requires multiple hits to defeat", () => {
    it("boss balloon should still be alive after 1 hit with 4 HP remaining", () => {
      const boss = new Balloon(100, 300, 35, "boss");
      expect(boss.hitPoints).toBe(5);

      const killed = boss.hit();

      expect(killed).toBe(false);
      expect(boss.alive).toBe(true);
      expect(boss.hitPoints).toBe(4);
    });

    it("CollisionSystem: single arrow hit does not kill boss balloon", () => {
      const cs = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, 0);
      const boss = new Balloon(100, 100, 35, "boss");

      const events = cs.check([arrow], [boss]);

      expect(events).toHaveLength(1);
      expect(boss.alive).toBe(true);
      expect(boss.hitPoints).toBe(4);
      expect(events[0].isBossKill).toBeUndefined();
      expect(arrow.alive).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // Scenario: Boss balloon is defeated when hit points reach zero
  // ----------------------------------------------------------
  describe("Scenario: Boss balloon is defeated when hit points reach zero", () => {
    it("boss with 1 HP remaining should be destroyed on 1 hit", () => {
      const boss = new Balloon(100, 300, 35, "boss");
      for (let i = 0; i < 4; i++) boss.hit();
      expect(boss.hitPoints).toBe(1);
      expect(boss.alive).toBe(true);

      const killed = boss.hit();

      expect(killed).toBe(true);
      expect(boss.hitPoints).toBe(0);
      expect(boss.alive).toBe(false);
    });

    it("defeating boss via CollisionSystem awards isBossKill flag", () => {
      const cs = new CollisionSystem();
      const boss = new Balloon(100, 100, 35, "boss");
      for (let i = 0; i < 4; i++) {
        const a = new Arrow({ x: 100, y: 100 }, 0);
        cs.check([a], [boss]);
      }
      expect(boss.hitPoints).toBe(1);

      const finalArrow = new Arrow({ x: 100, y: 100 }, 0);
      const events = cs.check([finalArrow], [boss]);

      expect(events).toHaveLength(1);
      expect(events[0].isBossKill).toBe(true);
      expect(boss.alive).toBe(false);
    });

    it("defeating boss awards 10 points", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 0;
      internals.arrowsRemaining = 50;
      internals.nextAmmoMilestone = 100;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.hitPoints = 1;
      internals.balloons = [boss];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.score).toBe(10);
      randomSpy.mockRestore();
    });

    it("defeating boss awards 15 bonus arrows", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 0;
      internals.arrowsRemaining = 50;
      internals.nextAmmoMilestone = 100;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.hitPoints = 1;
      internals.balloons = [boss];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.arrowsRemaining).toBe(65);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Boss balloon displays a health bar
  // ----------------------------------------------------------
  describe("Scenario: Boss balloon displays a health bar", () => {
    it("rendering a boss balloon calls fillRect for the HP bar", () => {
      const canvas = createMockCanvas();
      const ctx = (canvas as any).__ctx;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.render(ctx as any);

      expect(ctx.fillRect).toHaveBeenCalled();
      const fillRectCalls = ctx.fillRect.mock.calls;
      expect(fillRectCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("HP bar fill changes as HP decreases", () => {
      const canvas1 = createMockCanvas();
      const ctx1 = (canvas1 as any).__ctx;
      const boss1 = new Balloon(400, 300, 35, "boss");
      boss1.render(ctx1 as any);

      const canvas2 = createMockCanvas();
      const ctx2 = (canvas2 as any).__ctx;
      const boss2 = new Balloon(400, 300, 35, "boss");
      boss2.hitPoints = 2;
      boss2.render(ctx2 as any);

      expect(ctx1.fillRect).toHaveBeenCalled();
      expect(ctx2.fillRect).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Boss balloon flashes when hit
  // ----------------------------------------------------------
  describe("Scenario: Boss balloon flashes when hit", () => {
    it("hit() sets flashTimer to 0.1 seconds", () => {
      const boss = new Balloon(400, 300, 35, "boss");
      boss.hit();
      expect((boss as any).flashTimer).toBeCloseTo(0.1);
    });

    it("flash renders white fill when flashTimer > 0", () => {
      const canvas = createMockCanvas();
      const ctx = (canvas as any).__ctx;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.hit();

      const fillStyles: string[] = [];
      Object.defineProperty(ctx, "fillStyle", {
        get: () => fillStyles[fillStyles.length - 1] || "",
        set: (v: string) => fillStyles.push(v),
        configurable: true,
      });

      boss.render(ctx as any);

      expect(fillStyles).toContain("#FFFFFF");
    });

    it("flash expires after 0.1 seconds of update time", () => {
      const boss = new Balloon(400, 300, 35, "boss");
      boss.hit();
      expect((boss as any).flashTimer).toBeCloseTo(0.1);

      boss.update(0.11);
      expect((boss as any).flashTimer).toBeLessThanOrEqual(0);
    });
  });

  // ----------------------------------------------------------
  // Scenario: Boss balloon escaping counts as an escaped balloon
  // ----------------------------------------------------------
  describe("Scenario: Boss balloon escaping counts as an escaped balloon", () => {
    it("boss balloon floating off the top sets alive=false", () => {
      const boss = new Balloon(400, 600, 35, "boss");
      for (let i = 0; i < 600; i++) boss.update(0.1);
      expect(boss.alive).toBe(false);
    });

    it("escaped boss counts as 1 escaped balloon in Game", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.balloonsEscaped = 0;

      const boss = new Balloon(400, 600, 35, "boss");
      boss.pos.y = -(boss.radius - 0.5);
      internals.balloons = [boss];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.1);

      expect(internals.balloonsEscaped).toBe(1);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Boss balloon is visually distinct
  // ----------------------------------------------------------
  describe("Scenario: Boss balloon is visually distinct", () => {
    it("boss balloon should be noticeably larger than standard balloons", () => {
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
      const standard = new Balloon(100, 500, 60);
      const boss = new Balloon(100, 500, 35, "boss");

      expect(boss.radius).toBeGreaterThan(standard.radius * 1.5);
      randomSpy.mockRestore();
    });

    it("boss balloon should have dark crimson color #8B0000", () => {
      const boss = new Balloon(100, 500, 35, "boss");
      expect(boss.color).toBe("#8B0000");
    });

    it("boss balloon should have wider wobble amplitude (50px)", () => {
      const boss = new Balloon(100, 500, 35, "boss");
      expect((boss as any).wobbleAmplitude).toBe(50);
    });
  });

  // ----------------------------------------------------------
  // Scenario: Subsequent boss balloons spawn periodically
  // ----------------------------------------------------------
  describe("Scenario: Subsequent boss balloons spawn periodically", () => {
    it("subsequent boss spawns at 60-90 second intervals after the first", () => {
      const spawner = new Spawner();
      const bossSpawnTimes: number[] = [];
      let elapsed = 0;

      for (let i = 0; i < 2000; i++) {
        const dt = 0.1;
        const spawned = spawner.update(dt, 800, 600);
        elapsed += dt;
        for (const b of spawned) {
          if (b.variant === "boss") {
            bossSpawnTimes.push(elapsed);
          }
        }
      }

      expect(bossSpawnTimes.length).toBeGreaterThanOrEqual(2);

      const firstBossTime = bossSpawnTimes[0];
      expect(firstBossTime).toBeCloseTo(45, 0);

      if (bossSpawnTimes.length >= 2) {
        const interval = bossSpawnTimes[1] - bossSpawnTimes[0];
        expect(interval).toBeGreaterThanOrEqual(59);
        expect(interval).toBeLessThanOrEqual(91);
      }
    });
  });

  // ----------------------------------------------------------
  // Scenario: Piercing arrow damages boss and continues
  // ----------------------------------------------------------
  describe("Scenario: Piercing arrow damages boss and continues", () => {
    it("piercing arrow hits boss (-1 HP) and also destroys standard balloon", () => {
      const cs = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, 0);
      arrow.piercing = true;
      const boss = new Balloon(100, 100, 35, "boss");
      const standard = new Balloon(100, 100, 60);

      const events = cs.check([arrow], [boss, standard]);

      expect(events).toHaveLength(2);
      expect(boss.alive).toBe(true);
      expect(boss.hitPoints).toBe(4);
      expect(standard.alive).toBe(false);
      expect(arrow.alive).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Scenario: Multi-shot arrows can each hit the boss
  // ----------------------------------------------------------
  describe("Scenario: Multi-shot arrows can each hit the boss", () => {
    it("3 arrows hitting a boss with 5 HP reduces it to 2 HP", () => {
      const cs = new CollisionSystem();
      const boss = new Balloon(100, 100, 35, "boss");
      const a1 = new Arrow({ x: 100, y: 100 }, 0);
      const a2 = new Arrow({ x: 100, y: 100 }, 0);
      const a3 = new Arrow({ x: 100, y: 100 }, 0);

      cs.check([a1, a2, a3], [boss]);

      expect(boss.hitPoints).toBe(2);
      expect(boss.alive).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // Additional boss balloon edge cases
  // ----------------------------------------------------------
  describe("Edge cases", () => {
    it("hit() returns false if boss is already dead", () => {
      const boss = new Balloon(100, 300, 35, "boss");
      for (let i = 0; i < 5; i++) boss.hit();
      expect(boss.alive).toBe(false);

      const result = boss.hit();
      expect(result).toBe(false);
    });

    it("boss balloon has 5 hit points initially", () => {
      const boss = new Balloon(100, 300, 35, "boss");
      expect(boss.hitPoints).toBe(5);
      expect(boss.maxHitPoints).toBe(5);
    });

    it("boss balloon speed is between 30-40 px/s", () => {
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
      const boss = new Balloon(100, 600, 35, "boss");
      expect(Math.abs(boss.vel.y)).toBe(35);
      randomSpy.mockRestore();
    });

    it("non-boss hit does not trigger isBossKill", () => {
      const cs = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, 0);
      const standard = new Balloon(100, 100, 60);

      const events = cs.check([arrow], [standard]);

      expect(events).toHaveLength(1);
      expect(events[0].isBossKill).toBeUndefined();
    });

    it("hitting boss without killing awards no score in Game", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 0;
      internals.arrowsRemaining = 50;

      const boss = new Balloon(400, 300, 35, "boss");
      internals.balloons = [boss];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.score).toBe(0);
      expect(internals.arrowsRemaining).toBe(50);
      randomSpy.mockRestore();
    });

    it("piercing arrow killing boss also kills nearby standard balloon", () => {
      const cs = new CollisionSystem();
      const boss = new Balloon(100, 100, 35, "boss");
      for (let i = 0; i < 4; i++) boss.hit();

      const arrow = new Arrow({ x: 100, y: 100 }, 0);
      arrow.piercing = true;
      const standard = new Balloon(100, 100, 60);

      const events = cs.check([arrow], [boss, standard]);

      expect(events.length).toBe(2);
      const bossEvent = events.find((e) => e.balloon === boss);
      const stdEvent = events.find((e) => e.balloon === standard);

      expect(bossEvent).toBeDefined();
      expect(bossEvent!.isBossKill).toBe(true);
      expect(boss.alive).toBe(false);
      expect(stdEvent).toBeDefined();
      expect(standard.alive).toBe(false);
      expect(arrow.alive).toBe(true);
    });
  });
});

// ============================================================
// Feature: Progressive Ammo Replenishment
// ============================================================

describe("Feature: Progressive Ammo Replenishment", () => {

  // ----------------------------------------------------------
  // Scenario: Player receives bonus arrows at score milestone of 25
  // ----------------------------------------------------------
  describe("Scenario: Player receives bonus arrows at score milestone of 25", () => {
    it("popping a standard balloon to reach score 25 grants +5 bonus arrows", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 24;
      internals.arrowsRemaining = 80;
      internals.nextAmmoMilestone = 25;

      const balloon = new Balloon(400, 300, 60);
      internals.balloons = [balloon];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.score).toBe(25);
      expect(internals.arrowsRemaining).toBe(85);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Milestones repeat every 25 points
  // ----------------------------------------------------------
  describe("Scenario: Milestones repeat every 25 points", () => {
    it("reaching 50 after already receiving milestone at 25 grants another +5 arrows", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 49;
      internals.arrowsRemaining = 60;
      internals.nextAmmoMilestone = 50;

      const balloon = new Balloon(400, 300, 60);
      internals.balloons = [balloon];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.score).toBe(50);
      expect(internals.arrowsRemaining).toBe(65);
      expect(internals.nextAmmoMilestone).toBe(75);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Multiple milestones can trigger at once
  // ----------------------------------------------------------
  describe("Scenario: Multiple milestones can trigger at once", () => {
    it("boss kill earning 10 points from score 20 crosses 25-point milestone", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 20;
      internals.arrowsRemaining = 50;
      internals.nextAmmoMilestone = 25;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.hitPoints = 1;
      internals.balloons = [boss];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.score).toBe(30);
      // 50 + 15 (boss kill ammo) + 5 (milestone at 25) = 70
      expect(internals.arrowsRemaining).toBe(70);
      expect(internals.nextAmmoMilestone).toBe(50);
      randomSpy.mockRestore();
    });

    it("crossing two milestones at once grants both bonuses", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 43;
      internals.arrowsRemaining = 40;
      internals.nextAmmoMilestone = 50;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.hitPoints = 1;
      internals.balloons = [boss];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      // 43 + 10 = 53, crosses 50 milestone
      expect(internals.score).toBe(53);
      // 40 + 15 (boss) + 5 (milestone 50) = 60
      expect(internals.arrowsRemaining).toBe(60);
      expect(internals.nextAmmoMilestone).toBe(75);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Ammo gain is shown on the HUD
  // ----------------------------------------------------------
  describe("Scenario: Ammo gain is shown on the HUD", () => {
    it("showAmmoGain queues a floating text entry in HUD", () => {
      const hud = new HUD();
      hud.showAmmoGain(5);

      const canvas = createMockCanvas();
      const ctx = (canvas as any).__ctx;
      const fillTextCalls = (canvas as any).__fillTextCalls;

      hud.render(ctx as any, "playing", 25, 105, 800, 600, [], 0.016);

      const ammoGainCall = fillTextCalls.find(
        (c: { text: string }) => c.text.includes("+5")
      );
      expect(ammoGainCall).toBeDefined();
    });

    it("boss kill ammo gain shows +15 on HUD", () => {
      const hud = new HUD();
      hud.showAmmoGain(15);

      const canvas = createMockCanvas();
      const ctx = (canvas as any).__ctx;
      const fillTextCalls = (canvas as any).__fillTextCalls;

      hud.render(ctx as any, "playing", 10, 65, 800, 600, [], 0.016);

      const ammoGainCall = fillTextCalls.find(
        (c: { text: string }) => c.text.includes("+15")
      );
      expect(ammoGainCall).toBeDefined();
    });

    it("ammo gain text fades away after 1.5 seconds", () => {
      const hud = new HUD();
      hud.showAmmoGain(5);

      const canvas = createMockCanvas();
      const ctx = (canvas as any).__ctx;

      // Simulate time passing by rendering with dt
      for (let i = 0; i < 20; i++) {
        hud.render(ctx as any, "playing", 25, 105, 800, 600, [], 0.1);
      }

      // After 2 seconds of rendering, the text should be gone
      const fillTextCalls: Array<{ text: string }> = [];
      const freshCanvas = createMockCanvas();
      const freshCtx = (freshCanvas as any).__ctx;
      const freshFillTextCalls = (freshCanvas as any).__fillTextCalls;

      hud.render(freshCtx as any, "playing", 25, 105, 800, 600, [], 0.016);

      const ammoGainCall = freshFillTextCalls.find(
        (c: { text: string }) => c.text.includes("+5")
      );
      expect(ammoGainCall).toBeUndefined();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Boss kill ammo stacks with milestone ammo
  // ----------------------------------------------------------
  describe("Scenario: Boss kill ammo stacks with milestone ammo", () => {
    it("boss kill at score 23 grants 15 + 5 arrows (milestone at 25)", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 23;
      internals.arrowsRemaining = 50;
      internals.nextAmmoMilestone = 25;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.hitPoints = 1;
      internals.balloons = [boss];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      // 23 + 10 = 33, crosses 25 milestone
      expect(internals.score).toBe(33);
      // 50 + 15 (boss) + 5 (milestone) = 70
      expect(internals.arrowsRemaining).toBe(70);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Ammo has no upper cap
  // ----------------------------------------------------------
  describe("Scenario: Ammo has no upper cap", () => {
    it("milestone bonus at 120 arrows brings total to 125", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.arrowsRemaining = 120;
      internals.score = 24;
      internals.nextAmmoMilestone = 25;

      const balloon = new Balloon(400, 300, 60);
      internals.balloons = [balloon];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.arrowsRemaining).toBe(125);
      randomSpy.mockRestore();
    });

    it("boss kill ammo can push arrows well above 100", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.arrowsRemaining = 95;
      internals.score = 0;
      internals.nextAmmoMilestone = 100;

      const boss = new Balloon(400, 300, 35, "boss");
      boss.hitPoints = 1;
      internals.balloons = [boss];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.arrowsRemaining).toBe(110);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Game reset clears milestone progress
  // ----------------------------------------------------------
  describe("Scenario: Game reset clears milestone progress", () => {
    it("after game over and restart, milestone resets to 25 and arrows to 100", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.score = 60;
      internals.nextAmmoMilestone = 75;
      internals.arrowsRemaining = 30;

      internals.resetGame();

      expect(internals.nextAmmoMilestone).toBe(25);
      expect(internals.arrowsRemaining).toBe(100);
      expect(internals.score).toBe(0);
      randomSpy.mockRestore();
    });
  });

  // ----------------------------------------------------------
  // Scenario: Existing bonus-arrows upgrade still works
  // ----------------------------------------------------------
  describe("Scenario: Existing bonus-arrows upgrade still works", () => {
    it("popping a bonus-arrows balloon grants +10 arrows", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.arrowsRemaining = 30;
      internals.nextAmmoMilestone = 100;

      const upgBalloon = new Balloon(400, 300, 60, "bonus-arrows");
      internals.balloons = [upgBalloon];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      expect(internals.arrowsRemaining).toBe(40);
      randomSpy.mockRestore();
    });

    it("bonus-arrows stacks with milestone bonus", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      const game = new Game("test-canvas");
      const internals = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      internals.resetGame();
      internals.state = "playing";
      internals.arrowsRemaining = 50;
      internals.score = 22;
      internals.nextAmmoMilestone = 25;

      const upgBalloon = new Balloon(400, 300, 60, "bonus-arrows");
      internals.balloons = [upgBalloon];
      internals.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];

      (internals.input as any).wasClicked = false;
      internals.updatePlaying(0.016);

      // score: 22 + 3 (upgrade balloon) = 25, triggering milestone
      // arrows: 50 + 10 (bonus-arrows) + 5 (milestone) = 65
      expect(internals.score).toBe(25);
      expect(internals.arrowsRemaining).toBe(65);
      randomSpy.mockRestore();
    });
  });
});

// ============================================================
// Spawner boss timer reset
// ============================================================

describe("Spawner boss timer reset", () => {
  it("reset() clears boss timer so no boss spawns immediately after", () => {
    const spawner = new Spawner();
    spawner.update(40, 800, 600);
    spawner.reset();
    const spawned = spawner.update(0.016, 800, 600);
    const bossBalloons = spawned.filter((b) => b.variant === "boss");
    expect(bossBalloons).toHaveLength(0);
  });

  it("after reset, boss spawns again after 45s", () => {
    const spawner = new Spawner();
    spawner.update(50, 800, 600);
    spawner.reset();

    const allBalloons: Balloon[] = [];
    for (let i = 0; i < 460; i++) {
      const spawned = spawner.update(0.1, 800, 600);
      allBalloons.push(...spawned);
    }

    const bossBalloons = allBalloons.filter((b) => b.variant === "boss");
    expect(bossBalloons.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Data model / type-level checks
// ============================================================

describe("Data model correctness", () => {
  it('BalloonVariant "boss" is valid on the Balloon entity', () => {
    const boss = new Balloon(100, 500, 35, "boss");
    expect(boss.variant).toBe("boss");
  });

  it("CollisionEvent.isBossKill is typed as optional boolean", () => {
    const cs = new CollisionSystem();
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    const std = new Balloon(100, 100, 60);
    const events = cs.check([arrow], [std]);
    expect(events[0].isBossKill).toBeUndefined();
  });

  it("standard and upgrade balloons have hitPoints=1", () => {
    const std = new Balloon(100, 500, 60);
    const upg = new Balloon(100, 500, 60, "piercing");
    expect(std.hitPoints).toBe(1);
    expect(upg.hitPoints).toBe(1);
  });
});
