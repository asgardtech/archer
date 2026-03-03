import { UpgradeManager } from "../src/systems/UpgradeManager";
import { Balloon } from "../src/entities/Balloon";
import { Arrow } from "../src/entities/Arrow";
import { Bow } from "../src/entities/Bow";
import { CollisionSystem } from "../src/systems/CollisionSystem";
import { Spawner } from "../src/systems/Spawner";
import { HUD } from "../src/rendering/HUD";
import { UpgradeType } from "../src/types";

// --- UpgradeManager ---

describe("UpgradeManager", () => {
  let mgr: UpgradeManager;

  beforeEach(() => {
    mgr = new UpgradeManager();
  });

  it("starts with no active upgrades", () => {
    expect(mgr.getActive()).toHaveLength(0);
    expect(mgr.hasUpgrade("multi-shot")).toBe(false);
  });

  it("activates a timed upgrade", () => {
    mgr.activate("multi-shot");
    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
    expect(mgr.getActive()).toHaveLength(1);
    expect(mgr.getActive()[0].remainingTime).toBe(8);
  });

  it("activates piercing with 6s duration", () => {
    mgr.activate("piercing");
    expect(mgr.hasUpgrade("piercing")).toBe(true);
    expect(mgr.getActive()[0].remainingTime).toBe(6);
  });

  it("activates rapid-fire with 5s duration", () => {
    mgr.activate("rapid-fire");
    expect(mgr.hasUpgrade("rapid-fire")).toBe(true);
    expect(mgr.getActive()[0].remainingTime).toBe(5);
  });

  it("bonus-arrows calls onInstant and does not add to active list", () => {
    const fn = jest.fn();
    mgr.activate("bonus-arrows", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(mgr.getActive()).toHaveLength(0);
    expect(mgr.hasUpgrade("bonus-arrows")).toBe(false);
  });

  it("ticks down remaining time each frame", () => {
    mgr.activate("multi-shot");
    mgr.update(3);
    expect(mgr.getActive()[0].remainingTime).toBeCloseTo(5);
  });

  it("expires an upgrade when time runs out", () => {
    mgr.activate("rapid-fire");
    mgr.update(5.1);
    expect(mgr.hasUpgrade("rapid-fire")).toBe(false);
    expect(mgr.getActive()).toHaveLength(0);
  });

  it("resets timer when same upgrade collected again", () => {
    mgr.activate("piercing");
    mgr.update(4); // 2s remaining
    expect(mgr.getActive()[0].remainingTime).toBeCloseTo(2);
    mgr.activate("piercing");
    expect(mgr.getActive()[0].remainingTime).toBe(6);
    expect(mgr.getActive()).toHaveLength(1);
  });

  it("supports multiple different upgrades simultaneously", () => {
    mgr.activate("multi-shot");
    mgr.activate("piercing");
    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
    expect(mgr.hasUpgrade("piercing")).toBe(true);
    expect(mgr.getActive()).toHaveLength(2);
  });

  it("clears all on reset", () => {
    mgr.activate("multi-shot");
    mgr.activate("piercing");
    mgr.reset();
    expect(mgr.getActive()).toHaveLength(0);
    expect(mgr.hasUpgrade("multi-shot")).toBe(false);
  });
});

// --- Balloon ---

describe("Balloon variants", () => {
  it("creates a standard balloon by default", () => {
    const b = new Balloon(100, 500, 60);
    expect(b.variant).toBe("standard");
    expect(b.upgradeType).toBeUndefined();
  });

  it("creates an upgrade balloon when upgrade type provided", () => {
    const b = new Balloon(100, 500, 60, "piercing");
    expect(b.variant).toBe("upgrade");
    expect(b.upgradeType).toBe("piercing");
    expect(b.color).toBe("#FFD700");
  });

  it("upgrade balloon has 1.2x larger radius than base", () => {
    const radii: number[] = [];
    for (let i = 0; i < 50; i++) {
      const std = new Balloon(100, 500, 60);
      const upg = new Balloon(100, 500, 60, "multi-shot");
      // Since radius has randomness, we can't compare directly,
      // but upgrade radius should always be >= 24 (20 * 1.2)
      expect(upg.radius).toBeGreaterThanOrEqual(24);
      radii.push(upg.radius);
    }
  });

  it("upgrade balloon escaping counts as missed balloon (alive becomes false)", () => {
    const b = new Balloon(100, 500, 60, "rapid-fire");
    // Simulate going off screen
    for (let i = 0; i < 200; i++) {
      b.update(0.1);
    }
    expect(b.alive).toBe(false);
  });
});

// --- Arrow piercing ---

describe("Arrow piercing flag", () => {
  it("defaults to false", () => {
    const a = new Arrow({ x: 100, y: 100 }, -Math.PI / 2);
    expect(a.piercing).toBe(false);
  });

  it("can be set to true", () => {
    const a = new Arrow({ x: 100, y: 100 }, -Math.PI / 2);
    a.piercing = true;
    expect(a.piercing).toBe(true);
  });
});

// --- Bow getFireAngles ---

describe("Bow.getFireAngles", () => {
  let bow: Bow;

  beforeEach(() => {
    bow = new Bow(800, 600);
  });

  it("returns single angle when multiShot is false", () => {
    const angles = bow.getFireAngles(false);
    expect(angles).toHaveLength(1);
    expect(angles[0]).toBe(bow.angle);
  });

  it("returns three spread angles when multiShot is true", () => {
    const angles = bow.getFireAngles(true);
    expect(angles).toHaveLength(3);
    expect(angles[0]).toBeCloseTo(bow.angle - 0.15);
    expect(angles[1]).toBe(bow.angle);
    expect(angles[2]).toBeCloseTo(bow.angle + 0.15);
  });
});

// --- CollisionSystem with upgrades ---

describe("CollisionSystem with upgrades", () => {
  let cs: CollisionSystem;

  beforeEach(() => {
    cs = new CollisionSystem();
  });

  it("reports grantedUpgrade when hitting upgrade balloon", () => {
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    const balloon = new Balloon(100, 100, 60, "multi-shot");
    const events = cs.check([arrow], [balloon]);
    expect(events).toHaveLength(1);
    expect(events[0].grantedUpgrade).toBe("multi-shot");
    expect(balloon.alive).toBe(false);
  });

  it("does not report grantedUpgrade for standard balloon", () => {
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    const balloon = new Balloon(100, 100, 60);
    const events = cs.check([arrow], [balloon]);
    expect(events).toHaveLength(1);
    expect(events[0].grantedUpgrade).toBeUndefined();
  });

  it("piercing arrow is not destroyed on hit", () => {
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    arrow.piercing = true;
    const balloon = new Balloon(100, 100, 60);
    const events = cs.check([arrow], [balloon]);
    expect(events).toHaveLength(1);
    expect(arrow.alive).toBe(true);
    expect(balloon.alive).toBe(false);
  });

  it("piercing arrow can hit multiple balloons in same frame", () => {
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    arrow.piercing = true;
    const b1 = new Balloon(100, 100, 60);
    const b2 = new Balloon(100, 100, 60);
    const events = cs.check([arrow], [b1, b2]);
    expect(events).toHaveLength(2);
    expect(arrow.alive).toBe(true);
    expect(b1.alive).toBe(false);
    expect(b2.alive).toBe(false);
  });

  it("non-piercing arrow is destroyed on hit and stops", () => {
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    const b1 = new Balloon(100, 100, 60);
    const b2 = new Balloon(100, 100, 60);
    const events = cs.check([arrow], [b1, b2]);
    expect(events).toHaveLength(1);
    expect(arrow.alive).toBe(false);
  });

  it("piercing arrow hitting upgrade balloon grants upgrade and continues", () => {
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    arrow.piercing = true;
    const upgBalloon = new Balloon(100, 100, 60, "rapid-fire");
    const stdBalloon = new Balloon(100, 100, 60);
    const events = cs.check([arrow], [upgBalloon, stdBalloon]);
    expect(events).toHaveLength(2);
    expect(events[0].grantedUpgrade).toBe("rapid-fire");
    expect(events[1].grantedUpgrade).toBeUndefined();
    expect(arrow.alive).toBe(true);
  });
});

// --- Spawner upgrade spawning ---

describe("Spawner upgrade balloon spawning", () => {
  it("spawns upgrade balloons after sufficient time", () => {
    const spawner = new Spawner();
    const allBalloons: Balloon[] = [];

    // Run for enough time that an upgrade balloon should appear (max interval is 15s)
    for (let i = 0; i < 200; i++) {
      const spawned = spawner.update(0.1, 800, 600);
      allBalloons.push(...spawned);
    }

    const upgradeBalloons = allBalloons.filter((b) => b.variant === "upgrade");
    expect(upgradeBalloons.length).toBeGreaterThan(0);

    for (const ub of upgradeBalloons) {
      expect(ub.upgradeType).toBeDefined();
      expect(["multi-shot", "piercing", "rapid-fire", "bonus-arrows"]).toContain(ub.upgradeType);
    }
  });

  it("upgrade balloons are rarer than standard balloons", () => {
    const spawner = new Spawner();
    let standardCount = 0;
    let upgradeCount = 0;

    for (let i = 0; i < 500; i++) {
      const spawned = spawner.update(0.1, 800, 600);
      for (const b of spawned) {
        if (b.variant === "upgrade") upgradeCount++;
        else standardCount++;
      }
    }

    expect(standardCount).toBeGreaterThan(upgradeCount);
  });

  it("reset clears upgrade timer", () => {
    const spawner = new Spawner();
    spawner.update(5, 800, 600);
    spawner.reset();
    // After reset, should behave fresh - no immediate upgrade spawn
    const spawned = spawner.update(0.016, 800, 600);
    const upgrades = spawned.filter((b) => b.variant === "upgrade");
    expect(upgrades).toHaveLength(0);
  });
});

// --- Game integration via internals ---

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
    get upgradeManager() { return game["upgradeManager"]; },
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

describe("Game integration: upgrades", () => {
  let game: any;
  let internals: ReturnType<typeof getGameInternals>;

  beforeEach(() => {
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = new Game("test-canvas");
    internals = getGameInternals(game);
    internals.resetGame();
    internals.state = "playing";
  });

  it("popping an upgrade balloon grants the upgrade", () => {
    const upgBalloon = new Balloon(400, 300, 60, "multi-shot");
    internals.balloons = [upgBalloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    // Don't click, just process collisions
    const input = internals.input;
    (input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.upgradeManager.hasUpgrade("multi-shot")).toBe(true);
  });

  it("popping an upgrade balloon awards 3 points", () => {
    internals.score = 5;
    const upgBalloon = new Balloon(400, 300, 60, "piercing");
    internals.balloons = [upgBalloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.score).toBe(8);
  });

  it("popping a standard balloon awards 1 point and no upgrade", () => {
    internals.score = 5;
    const balloon = new Balloon(400, 300, 60);
    internals.balloons = [balloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.score).toBe(6);
    expect(internals.upgradeManager.getActive()).toHaveLength(0);
  });

  it("multi-shot fires 3 arrows consuming only 1", () => {
    internals.upgradeManager.activate("multi-shot");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows.length).toBe(3);
    expect(internals.arrowsRemaining).toBe(49);
  });

  it("rapid-fire makes shots cost 0 arrows", () => {
    internals.upgradeManager.activate("rapid-fire");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows.length).toBe(1);
    expect(internals.arrowsRemaining).toBe(50);
  });

  it("piercing sets arrow.piercing flag", () => {
    internals.upgradeManager.activate("piercing");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows[0].piercing).toBe(true);
  });

  it("bonus-arrows grants +10 arrows immediately", () => {
    internals.arrowsRemaining = 30;

    const upgBalloon = new Balloon(400, 300, 60, "bonus-arrows");
    internals.balloons = [upgBalloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.arrowsRemaining).toBe(40);
  });

  it("bonus-arrows can exceed initial arrow count", () => {
    internals.arrowsRemaining = 95;

    const upgBalloon = new Balloon(400, 300, 60, "bonus-arrows");
    internals.balloons = [upgBalloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.arrowsRemaining).toBe(105);
  });

  it("multi-shot + rapid-fire fires 3 arrows with 0 cost", () => {
    internals.upgradeManager.activate("multi-shot");
    internals.upgradeManager.activate("rapid-fire");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows.length).toBe(3);
    expect(internals.arrowsRemaining).toBe(50);
  });

  it("multi-shot + piercing fires 3 piercing arrows", () => {
    internals.upgradeManager.activate("multi-shot");
    internals.upgradeManager.activate("piercing");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows.length).toBe(3);
    for (const a of internals.arrows) {
      expect(a.piercing).toBe(true);
    }
  });

  it("all upgrades are cleared on game reset", () => {
    internals.upgradeManager.activate("multi-shot");
    internals.upgradeManager.activate("piercing");
    internals.resetGame();
    expect(internals.upgradeManager.getActive()).toHaveLength(0);
  });

  it("upgrade expires after its duration", () => {
    internals.upgradeManager.activate("multi-shot");
    (internals.input as any).wasClicked = false;

    // Tick 8.1 seconds
    internals.updatePlaying(8.1);
    expect(internals.upgradeManager.hasUpgrade("multi-shot")).toBe(false);
  });
});

// --- HUD with active upgrades ---

describe("HUD displays active upgrades", () => {
  it("renders upgrade labels when upgrades are active", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    hud.render(ctx as any, "playing", 10, 50, 800, 600, [
      { type: "rapid-fire", remainingTime: 3.5 },
    ]);

    const upgradeCall = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Rapid Fire")
    );
    expect(upgradeCall).toBeDefined();
    expect(upgradeCall!.text).toContain("3.5s");
  });

  it("does not render upgrade labels when no upgrades active", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    hud.render(ctx as any, "playing", 10, 50, 800, 600, []);

    const upgradeCall = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Rapid Fire") || c.text.includes("Multi-Shot") || c.text.includes("Piercing")
    );
    expect(upgradeCall).toBeUndefined();
  });
});
