import { UpgradeManager } from "../src/games/archer/systems/UpgradeManager";
import { Balloon } from "../src/games/archer/entities/Balloon";
import { Arrow } from "../src/games/archer/entities/Arrow";
import { Bow } from "../src/games/archer/entities/Bow";
import { CollisionSystem } from "../src/games/archer/systems/CollisionSystem";
import { Spawner } from "../src/games/archer/systems/Spawner";
import { HUD } from "../src/games/archer/rendering/HUD";
import { UpgradeType } from "../src/games/archer/types";

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

  it("bonus-arrows calls onInstant with 10 and does not add to active list", () => {
    const fn = jest.fn();
    mgr.activate("bonus-arrows", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(10);
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

// --- Persistent Upgrade System ---

describe("UpgradeManager: collection counting", () => {
  let mgr: UpgradeManager;

  beforeEach(() => {
    mgr = new UpgradeManager();
  });

  it("increments collection count on each activation", () => {
    mgr.activate("multi-shot");
    expect(mgr.getCollectionCount("multi-shot")).toBe(1);
    mgr.activate("multi-shot");
    expect(mgr.getCollectionCount("multi-shot")).toBe(2);
  });

  it("tracks collection counts independently per upgrade type", () => {
    mgr.activate("multi-shot");
    mgr.activate("multi-shot");
    mgr.activate("rapid-fire");
    expect(mgr.getCollectionCount("multi-shot")).toBe(2);
    expect(mgr.getCollectionCount("rapid-fire")).toBe(1);
    expect(mgr.getCollectionCount("piercing")).toBe(0);
  });

  it("returns all collection counts via getCollectionCounts()", () => {
    mgr.activate("piercing");
    mgr.activate("piercing");
    const counts = mgr.getCollectionCounts();
    expect(counts.get("piercing")).toBe(2);
  });

  it("tracks bonus-arrows collection counts", () => {
    const fn = jest.fn();
    mgr.activate("bonus-arrows", fn);
    mgr.activate("bonus-arrows", fn);
    expect(mgr.getCollectionCount("bonus-arrows")).toBe(2);
  });
});

describe("UpgradeManager: permanent threshold", () => {
  let mgr: UpgradeManager;

  beforeEach(() => {
    mgr = new UpgradeManager();
  });

  it("upgrade becomes permanent at exactly 3 collections", () => {
    mgr.activate("multi-shot");
    mgr.activate("multi-shot");
    expect(mgr.isPermanent("multi-shot")).toBe(false);
    mgr.activate("multi-shot");
    expect(mgr.isPermanent("multi-shot")).toBe(true);
  });

  it("upgrade is not permanent at 2 collections", () => {
    mgr.activate("piercing");
    mgr.activate("piercing");
    expect(mgr.isPermanent("piercing")).toBe(false);
  });

  it("4th+ collection keeps upgrade permanent", () => {
    for (let i = 0; i < 4; i++) mgr.activate("multi-shot");
    expect(mgr.isPermanent("multi-shot")).toBe(true);
    expect(mgr.getCollectionCount("multi-shot")).toBe(4);
  });

  it("bonus-arrows cannot become permanent", () => {
    const fn = jest.fn();
    for (let i = 0; i < 3; i++) mgr.activate("bonus-arrows", fn);
    expect(mgr.isPermanent("bonus-arrows")).toBe(false);
    expect(mgr.hasUpgrade("bonus-arrows")).toBe(false);
  });

  it("bonus-arrows 3rd collection grants 25 instead of 10", () => {
    const fn = jest.fn();
    mgr.activate("bonus-arrows", fn);
    mgr.activate("bonus-arrows", fn);
    mgr.activate("bonus-arrows", fn);
    expect(fn).toHaveBeenNthCalledWith(1, 10);
    expect(fn).toHaveBeenNthCalledWith(2, 10);
    expect(fn).toHaveBeenNthCalledWith(3, 25);
  });

  it("bonus-arrows 4th collection grants standard 10", () => {
    const fn = jest.fn();
    for (let i = 0; i < 4; i++) mgr.activate("bonus-arrows", fn);
    expect(fn).toHaveBeenNthCalledWith(4, 10);
  });

  it("getPermanentUpgrades returns all permanent types", () => {
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    for (let i = 0; i < 3; i++) mgr.activate("piercing");
    const perms = mgr.getPermanentUpgrades();
    expect(perms.has("multi-shot")).toBe(true);
    expect(perms.has("piercing")).toBe(true);
    expect(perms.has("rapid-fire")).toBe(false);
  });
});

describe("UpgradeManager: resetForNewLevel", () => {
  let mgr: UpgradeManager;

  beforeEach(() => {
    mgr = new UpgradeManager();
  });

  it("preserves permanent upgrades with fresh timers", () => {
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    mgr.update(8.1); // expire the timer
    expect(mgr.hasUpgrade("multi-shot")).toBe(false);

    mgr.resetForNewLevel();
    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
    expect(mgr.getActive()[0].remainingTime).toBe(8);
    expect(mgr.isPermanent("multi-shot")).toBe(true);
  });

  it("clears non-permanent upgrades", () => {
    mgr.activate("piercing"); // only 1 collection
    expect(mgr.hasUpgrade("piercing")).toBe(true);

    mgr.resetForNewLevel();
    expect(mgr.hasUpgrade("piercing")).toBe(false);
  });

  it("preserves collection counts across level transitions", () => {
    mgr.activate("rapid-fire");
    mgr.activate("rapid-fire");
    expect(mgr.getCollectionCount("rapid-fire")).toBe(2);

    mgr.resetForNewLevel();
    expect(mgr.getCollectionCount("rapid-fire")).toBe(2);
  });

  it("reactivates permanent upgrade that was in cooldown", () => {
    for (let i = 0; i < 3; i++) mgr.activate("rapid-fire");
    mgr.update(5.1); // expire timer, enter cooldown
    mgr.update(3); // partial cooldown elapsed
    expect(mgr.hasUpgrade("rapid-fire")).toBe(false);
    expect(mgr.getCooldown("rapid-fire")).toBeGreaterThan(0);

    mgr.resetForNewLevel();
    expect(mgr.hasUpgrade("rapid-fire")).toBe(true);
    expect(mgr.getActive().find((u: any) => u.type === "rapid-fire")!.remainingTime).toBe(5);
    expect(mgr.getCooldown("rapid-fire")).toBe(0);
  });

  it("player with 0 active upgrades but has permanents gets them reactivated", () => {
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    mgr.update(8.1); // expire
    mgr.update(10.1); // cooldown done, reactivated
    mgr.update(8.1); // expire again
    // Now in cooldown again

    mgr.resetForNewLevel();
    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
  });
});

describe("UpgradeManager: resetAll", () => {
  let mgr: UpgradeManager;

  beforeEach(() => {
    mgr = new UpgradeManager();
  });

  it("clears everything including permanent state and collection counts", () => {
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    mgr.activate("piercing");
    mgr.activate("piercing");

    mgr.resetAll();

    expect(mgr.hasUpgrade("multi-shot")).toBe(false);
    expect(mgr.isPermanent("multi-shot")).toBe(false);
    expect(mgr.getCollectionCount("multi-shot")).toBe(0);
    expect(mgr.getCollectionCount("piercing")).toBe(0);
    expect(mgr.getActive()).toHaveLength(0);
    expect(mgr.getPermanentUpgrades().size).toBe(0);
  });
});

describe("UpgradeManager: permanent upgrade cooldown", () => {
  let mgr: UpgradeManager;

  beforeEach(() => {
    mgr = new UpgradeManager();
  });

  it("permanent upgrade reactivates after 10s cooldown", () => {
    for (let i = 0; i < 3; i++) mgr.activate("rapid-fire");
    expect(mgr.hasUpgrade("rapid-fire")).toBe(true);

    mgr.update(5.1); // timer expires
    expect(mgr.hasUpgrade("rapid-fire")).toBe(false);

    mgr.update(5); // 5s into cooldown
    expect(mgr.hasUpgrade("rapid-fire")).toBe(false);

    mgr.update(5.1); // cooldown done
    expect(mgr.hasUpgrade("rapid-fire")).toBe(true);
    expect(mgr.getActive().find((u: any) => u.type === "rapid-fire")!.remainingTime).toBe(5);
  });

  it("permanent upgrade in cooldown is still permanent", () => {
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    mgr.update(8.1); // expire
    mgr.update(5); // partial cooldown

    expect(mgr.hasUpgrade("multi-shot")).toBe(false);
    expect(mgr.isPermanent("multi-shot")).toBe(true);
  });

  it("re-collecting permanent upgrade during cooldown resets timer and clears cooldown", () => {
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    mgr.update(8.1); // expire
    mgr.update(3); // partial cooldown

    mgr.activate("multi-shot"); // 4th collection
    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
    expect(mgr.getActive().find((u: any) => u.type === "multi-shot")!.remainingTime).toBe(8);
    expect(mgr.getCooldown("multi-shot")).toBe(0);
  });

  it("multiple permanent upgrades can cycle cooldowns independently", () => {
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    for (let i = 0; i < 3; i++) mgr.activate("piercing");

    mgr.update(5.5); // piercing (6s) still active, rapid would expire if present
    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
    expect(mgr.hasUpgrade("piercing")).toBe(true);

    mgr.update(1); // 6.5s total: piercing expired
    expect(mgr.hasUpgrade("piercing")).toBe(false);

    mgr.update(1.5); // 8s: multi-shot about to expire
    mgr.update(0.1); // 8.1s: multi-shot expired
    expect(mgr.hasUpgrade("multi-shot")).toBe(false);
    expect(mgr.hasUpgrade("piercing")).toBe(false);
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
    strokeRect: jest.fn(),
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
    get balloons() { return game["balloons"]; },
    set balloons(v: any[]) { game["balloons"] = v; },
    get score() { return game["score"]; },
    set score(v: number) { game["score"] = v; },
    get nextAmmoMilestone() { return game["nextAmmoMilestone"]; },
    set nextAmmoMilestone(v: number) { game["nextAmmoMilestone"] = v; },
    get upgradeManager() { return game["upgradeManager"]; },
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

describe("Game integration: upgrades", () => {
  let game: any;
  let internals: ReturnType<typeof getGameInternals>;
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = new Game("test-canvas");
    internals = getGameInternals(game);
    internals.resetGame();
    internals.state = "playing";
  });

  afterEach(() => {
    randomSpy.mockRestore();
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

// --- Game integration: persistent upgrades ---

describe("Game integration: persistent upgrades across levels", () => {
  let game: any;
  let internals: ReturnType<typeof getGameInternals>;
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = new Game("test-canvas");
    internals = getGameInternals(game);
    internals.resetGame();
    internals.state = "playing";
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("collection counts persist across levels", () => {
    const mgr = internals.upgradeManager;
    mgr.activate("rapid-fire");
    mgr.activate("rapid-fire");
    expect(mgr.getCollectionCount("rapid-fire")).toBe(2);

    mgr.resetForNewLevel();
    expect(mgr.getCollectionCount("rapid-fire")).toBe(2);
  });

  it("permanent upgrade carries over to next level with fresh timer", () => {
    const mgr = internals.upgradeManager;
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    expect(mgr.isPermanent("multi-shot")).toBe(true);

    mgr.resetForNewLevel();
    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
    expect(mgr.getActive().find((u: any) => u.type === "multi-shot")!.remainingTime).toBe(8);
  });

  it("non-permanent upgrade is cleared on level transition", () => {
    const mgr = internals.upgradeManager;
    mgr.activate("piercing");
    expect(mgr.hasUpgrade("piercing")).toBe(true);

    mgr.resetForNewLevel();
    expect(mgr.hasUpgrade("piercing")).toBe(false);
  });

  it("collecting one more after level transition reaches permanent threshold", () => {
    const mgr = internals.upgradeManager;
    mgr.activate("piercing");
    mgr.activate("piercing");
    expect(mgr.isPermanent("piercing")).toBe(false);

    mgr.resetForNewLevel();
    mgr.activate("piercing");
    expect(mgr.isPermanent("piercing")).toBe(true);
  });

  it("game reset clears all permanent state and collection counts", () => {
    const mgr = internals.upgradeManager;
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    mgr.activate("piercing");
    mgr.activate("piercing");

    internals.resetGame();
    const mgr2 = internals.upgradeManager;
    expect(mgr2.hasUpgrade("multi-shot")).toBe(false);
    expect(mgr2.isPermanent("multi-shot")).toBe(false);
    expect(mgr2.getCollectionCount("multi-shot")).toBe(0);
    expect(mgr2.getCollectionCount("piercing")).toBe(0);
  });

  it("bonus-arrows 3rd collection grants +25 arrows via game callback", () => {
    internals.arrowsRemaining = 50;
    const mgr = internals.upgradeManager;

    // First two bonus-arrows collections (each +10)
    const fn1 = jest.fn();
    mgr.activate("bonus-arrows", fn1);
    mgr.activate("bonus-arrows", fn1);

    // Third collection via game integration
    const upgBalloon = new Balloon(400, 300, 60, "bonus-arrows");
    internals.balloons = [upgBalloon];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    // 50 + 25 = 75
    expect(internals.arrowsRemaining).toBe(75);
  });

  it("bonus-arrows 4th collection grants standard +10 arrows", () => {
    internals.arrowsRemaining = 50;
    const mgr = internals.upgradeManager;

    const fn = jest.fn();
    for (let i = 0; i < 3; i++) mgr.activate("bonus-arrows", fn);

    const upgBalloon = new Balloon(400, 300, 60, "bonus-arrows");
    internals.balloons = [upgBalloon];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    // 50 + 10 = 60
    expect(internals.arrowsRemaining).toBe(60);
  });

  it("multiple permanent upgrades active simultaneously on new level", () => {
    const mgr = internals.upgradeManager;
    for (let i = 0; i < 3; i++) mgr.activate("multi-shot");
    for (let i = 0; i < 3; i++) mgr.activate("piercing");

    mgr.resetForNewLevel();

    expect(mgr.hasUpgrade("multi-shot")).toBe(true);
    expect(mgr.hasUpgrade("piercing")).toBe(true);
    expect(mgr.getActive()).toHaveLength(2);
  });

  it("permanent upgrade in cooldown survives level transition", () => {
    const mgr = internals.upgradeManager;
    for (let i = 0; i < 3; i++) mgr.activate("rapid-fire");
    mgr.update(5.1); // expire, enter cooldown
    mgr.update(3); // partial cooldown
    expect(mgr.hasUpgrade("rapid-fire")).toBe(false);

    mgr.resetForNewLevel();
    expect(mgr.hasUpgrade("rapid-fire")).toBe(true);
    expect(mgr.getActive().find((u: any) => u.type === "rapid-fire")!.remainingTime).toBe(5);
    expect(mgr.getCooldown("rapid-fire")).toBe(0);
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

  it("shows star prefix for permanent upgrades on the HUD", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    const permanentSet = new Set<UpgradeType>(["multi-shot" as UpgradeType]);

    hud.render(
      ctx as any, "playing", 10, 50, 800, 600,
      [{ type: "multi-shot", remainingTime: 8 }],
      0.016, 1, "Meadow", 10,
      permanentSet, new Map()
    );

    const upgradeCall = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("★") && c.text.includes("Multi-Shot")
    );
    expect(upgradeCall).toBeDefined();
  });

  it("does not show star prefix for non-permanent upgrades", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    hud.render(
      ctx as any, "playing", 10, 50, 800, 600,
      [{ type: "multi-shot", remainingTime: 8 }],
      0.016, 1, "Meadow", 10,
      new Set(), new Map()
    );

    const starCall = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("★")
    );
    expect(starCall).toBeUndefined();
  });
});

describe("HUD level-complete screen collection progress", () => {
  it("shows collection progress for upgrades with at least 1 collection", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    const counts = new Map<UpgradeType, number>();
    counts.set("multi-shot", 2);
    counts.set("piercing", 1);

    hud.render(
      ctx as any, "level_complete", 20, 50, 800, 600,
      [], 0, 1, "Meadow", 20,
      new Set(), counts
    );

    const multiShotProgress = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Multi-Shot") && c.text.includes("●●○")
    );
    expect(multiShotProgress).toBeDefined();

    const piercingProgress = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Piercing") && c.text.includes("●○○")
    );
    expect(piercingProgress).toBeDefined();
  });

  it("does not show progress for upgrade types with 0 collections", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    const counts = new Map<UpgradeType, number>();
    counts.set("multi-shot", 1);

    hud.render(
      ctx as any, "level_complete", 20, 50, 800, 600,
      [], 0, 1, "Meadow", 20,
      new Set(), counts
    );

    const rapidFireProgress = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Rapid Fire")
    );
    expect(rapidFireProgress).toBeUndefined();

    const multiShotProgress = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Multi-Shot")
    );
    expect(multiShotProgress).toBeDefined();
  });

  it("shows full dots for upgrade that reached permanent threshold", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    const counts = new Map<UpgradeType, number>();
    counts.set("piercing", 3);

    hud.render(
      ctx as any, "level_complete", 20, 50, 800, 600,
      [], 0, 1, "Meadow", 20,
      new Set(), counts
    );

    const piercingProgress = fillTextCalls.find(
      (c: { text: string }) => c.text.includes("Piercing") && c.text.includes("●●●")
    );
    expect(piercingProgress).toBeDefined();
  });
});

// --- Boss Balloon ---

describe("Boss Balloon", () => {
  it("creates a boss balloon with 5 HP, larger radius, and distinct color", () => {
    const b = new Balloon(100, 500, 35, "boss");
    expect(b.variant).toBe("boss");
    expect(b.hitPoints).toBe(5);
    expect(b.maxHitPoints).toBe(5);
    expect(b.color).toBe("#8B0000");
    expect(b.radius).toBeGreaterThanOrEqual(40);
  });

  it("hit() decrements HP and returns false when HP > 0", () => {
    const b = new Balloon(100, 500, 35, "boss");
    const killed = b.hit();
    expect(killed).toBe(false);
    expect(b.hitPoints).toBe(4);
    expect(b.alive).toBe(true);
  });

  it("hit() returns true and sets alive=false when HP reaches 0", () => {
    const b = new Balloon(100, 500, 35, "boss");
    for (let i = 0; i < 4; i++) b.hit();
    expect(b.hitPoints).toBe(1);
    expect(b.alive).toBe(true);

    const killed = b.hit();
    expect(killed).toBe(true);
    expect(b.hitPoints).toBe(0);
    expect(b.alive).toBe(false);
  });

  it("hit() returns false if already dead", () => {
    const b = new Balloon(100, 500, 35, "boss");
    for (let i = 0; i < 5; i++) b.hit();
    expect(b.alive).toBe(false);
    const result = b.hit();
    expect(result).toBe(false);
  });

  it("boss balloon escaping counts as missed (alive becomes false)", () => {
    const b = new Balloon(100, 500, 35, "boss");
    for (let i = 0; i < 500; i++) b.update(0.1);
    expect(b.alive).toBe(false);
  });
});

describe("CollisionSystem with boss balloon", () => {
  let cs: CollisionSystem;

  beforeEach(() => {
    cs = new CollisionSystem();
  });

  it("boss balloon survives a single arrow hit", () => {
    const arrow = new Arrow({ x: 100, y: 100 }, 0);
    const boss = new Balloon(100, 100, 35, "boss");
    const events = cs.check([arrow], [boss]);
    expect(events).toHaveLength(1);
    expect(events[0].isBossKill).toBeUndefined();
    expect(boss.alive).toBe(true);
    expect(boss.hitPoints).toBe(4);
    expect(arrow.alive).toBe(false);
  });

  it("boss balloon dies after 5 hits and isBossKill is true", () => {
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

  it("piercing arrow damages boss and continues to other balloons", () => {
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

  it("multi-shot arrows can each hit the boss dealing multiple HP", () => {
    const boss = new Balloon(100, 100, 35, "boss");
    const a1 = new Arrow({ x: 100, y: 100 }, 0);
    const a2 = new Arrow({ x: 100, y: 100 }, 0);
    const a3 = new Arrow({ x: 100, y: 100 }, 0);
    cs.check([a1, a2, a3], [boss]);
    expect(boss.hitPoints).toBe(2);
    expect(boss.alive).toBe(true);
  });
});

describe("Game integration: boss balloon and ammo milestones", () => {
  let game: any;
  let internals: ReturnType<typeof getGameInternals>;
  let randomSpy: jest.SpyInstance;

  beforeEach(() => {
    randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    const canvas = createMockCanvas();
    setupDom(canvas);
    game = new Game("test-canvas");
    internals = getGameInternals(game);
    internals.resetGame();
    internals.state = "playing";
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it("defeating a boss balloon awards 10 points and 15 arrows", () => {
    internals.score = 0;
    internals.arrowsRemaining = 50;
    internals.nextAmmoMilestone = 100;

    const boss = new Balloon(400, 300, 35, "boss");
    boss.hitPoints = 1;
    internals.balloons = [boss];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.score).toBe(10);
    expect(internals.arrowsRemaining).toBe(65);
  });

  it("score milestone at 25 grants +5 arrows", () => {
    internals.score = 24;
    internals.arrowsRemaining = 80;
    internals.nextAmmoMilestone = 25;

    const balloon = new Balloon(400, 300, 60);
    internals.balloons = [balloon];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.score).toBe(25);
    expect(internals.arrowsRemaining).toBe(85);
    expect(internals.nextAmmoMilestone).toBe(50);
  });

  it("multiple milestones can trigger in a single frame", () => {
    internals.score = 20;
    internals.arrowsRemaining = 50;
    internals.nextAmmoMilestone = 25;

    const boss = new Balloon(400, 300, 35, "boss");
    boss.hitPoints = 1;
    internals.balloons = [boss];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    // Score: 20 + 10 = 30, crosses 25 milestone
    expect(internals.score).toBe(30);
    // 50 + 15 (boss kill) + 5 (milestone at 25) = 70
    expect(internals.arrowsRemaining).toBe(70);
    expect(internals.nextAmmoMilestone).toBe(50);
  });

  it("boss kill ammo stacks with milestone ammo", () => {
    internals.score = 23;
    internals.arrowsRemaining = 50;
    internals.nextAmmoMilestone = 25;

    const boss = new Balloon(400, 300, 35, "boss");
    boss.hitPoints = 1;
    internals.balloons = [boss];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    // Score: 23 + 10 = 33, crosses 25 milestone
    expect(internals.score).toBe(33);
    // 50 + 15 (boss) + 5 (milestone) = 70
    expect(internals.arrowsRemaining).toBe(70);
  });

  it("ammo has no upper cap", () => {
    internals.arrowsRemaining = 120;
    internals.score = 24;
    internals.nextAmmoMilestone = 25;

    const balloon = new Balloon(400, 300, 60);
    internals.balloons = [balloon];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.arrowsRemaining).toBe(125);
  });

  it("game reset clears milestone progress", () => {
    internals.score = 60;
    internals.nextAmmoMilestone = 75;
    internals.resetGame();
    expect(internals.nextAmmoMilestone).toBe(25);
    expect(internals.arrowsRemaining).toBe(100);
    expect(internals.score).toBe(0);
  });

  it("hitting a boss without killing it awards no score", () => {
    internals.score = 0;
    internals.arrowsRemaining = 50;

    const boss = new Balloon(400, 300, 35, "boss");
    internals.balloons = [boss];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.score).toBe(0);
    expect(internals.arrowsRemaining).toBe(50);
  });
});

describe("Spawner boss balloon spawning", () => {
  it("spawns a boss balloon after 45 seconds", () => {
    const spawner = new Spawner();
    const allBalloons: Balloon[] = [];

    for (let i = 0; i < 460; i++) {
      const spawned = spawner.update(0.1, 800, 600);
      allBalloons.push(...spawned);
    }

    const bossBalloons = allBalloons.filter((b) => b.variant === "boss");
    expect(bossBalloons.length).toBeGreaterThan(0);
    expect(bossBalloons[0].hitPoints).toBe(5);
  });

  it("does not spawn a boss balloon before 45 seconds", () => {
    const spawner = new Spawner();
    const allBalloons: Balloon[] = [];

    for (let i = 0; i < 440; i++) {
      const spawned = spawner.update(0.1, 800, 600);
      allBalloons.push(...spawned);
    }

    const bossBalloons = allBalloons.filter((b) => b.variant === "boss");
    expect(bossBalloons.length).toBe(0);
  });

  it("reset clears boss timer", () => {
    const spawner = new Spawner();
    spawner.update(40, 800, 600);
    spawner.reset();
    const spawned = spawner.update(0.016, 800, 600);
    const bossBalloons = spawned.filter((b) => b.variant === "boss");
    expect(bossBalloons).toHaveLength(0);
  });
});
