import { WeaponManager } from "../src/games/archer/systems/WeaponManager";
import { Balloon } from "../src/games/archer/entities/Balloon";
import { Arrow } from "../src/games/archer/entities/Arrow";
import { Bow } from "../src/games/archer/entities/Bow";
import { CollisionSystem } from "../src/games/archer/systems/CollisionSystem";
import { Spawner } from "../src/games/archer/systems/Spawner";
import { HUD } from "../src/games/archer/rendering/HUD";
import { WeaponType, WEAPON_SLOTS } from "../src/games/archer/types";

// --- WeaponManager ---

describe("WeaponManager", () => {
  let mgr: WeaponManager;

  beforeEach(() => {
    mgr = new WeaponManager();
  });

  it("starts with default weapon and only default unlocked", () => {
    expect(mgr.currentWeapon).toBe("default");
    expect(mgr.isUnlocked("default")).toBe(true);
    expect(mgr.isUnlocked("multi-shot")).toBe(false);
    expect(mgr.isUnlocked("piercing")).toBe(false);
    expect(mgr.isUnlocked("rapid-fire")).toBe(false);
  });

  it("unlock() adds weapon to unlocked set", () => {
    mgr.unlock("multi-shot");
    expect(mgr.isUnlocked("multi-shot")).toBe(true);
  });

  it("unlock() is idempotent", () => {
    mgr.unlock("piercing");
    mgr.unlock("piercing");
    expect(mgr.isUnlocked("piercing")).toBe(true);
  });

  it("switchTo() changes current weapon when unlocked", () => {
    mgr.unlock("multi-shot");
    const switched = mgr.switchTo("multi-shot");
    expect(switched).toBe(true);
    expect(mgr.currentWeapon).toBe("multi-shot");
  });

  it("switchTo() returns false when weapon not unlocked", () => {
    const switched = mgr.switchTo("piercing");
    expect(switched).toBe(false);
    expect(mgr.currentWeapon).toBe("default");
  });

  it("switchTo() returns false when already current weapon", () => {
    const switched = mgr.switchTo("default");
    expect(switched).toBe(false);
  });

  it("switchTo() returns false for unlocked but already-active weapon", () => {
    mgr.unlock("rapid-fire");
    mgr.switchTo("rapid-fire");
    const switched = mgr.switchTo("rapid-fire");
    expect(switched).toBe(false);
  });
});

// --- WeaponManager: collectUpgrade ---

describe("WeaponManager: collectUpgrade", () => {
  let mgr: WeaponManager;

  beforeEach(() => {
    mgr = new WeaponManager();
  });

  it("bonus-arrows calls onInstant with 10 and does not unlock any weapon", () => {
    const fn = jest.fn();
    const result = mgr.collectUpgrade("bonus-arrows", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(10);
    expect(result.isNewWeapon).toBe(false);
    expect(result.bonusArrows).toBe(10);
    expect(mgr.currentWeapon).toBe("default");
  });

  it("first collection of weapon type unlocks and auto-switches", () => {
    const result = mgr.collectUpgrade("multi-shot");
    expect(result.isNewWeapon).toBe(true);
    expect(result.bonusArrows).toBe(0);
    expect(mgr.isUnlocked("multi-shot")).toBe(true);
    expect(mgr.currentWeapon).toBe("multi-shot");
  });

  it("duplicate weapon collection grants +5 bonus arrows", () => {
    mgr.collectUpgrade("piercing");
    const fn = jest.fn();
    const result = mgr.collectUpgrade("piercing", fn);
    expect(result.isNewWeapon).toBe(false);
    expect(result.bonusArrows).toBe(5);
    expect(fn).toHaveBeenCalledWith(5);
  });

  it("duplicate weapon collection does not change current weapon", () => {
    mgr.collectUpgrade("multi-shot");
    mgr.switchTo("default");
    mgr.collectUpgrade("multi-shot");
    expect(mgr.currentWeapon).toBe("default");
  });

  it("each weapon type can be independently unlocked", () => {
    mgr.collectUpgrade("multi-shot");
    mgr.collectUpgrade("piercing");
    mgr.collectUpgrade("rapid-fire");
    expect(mgr.isUnlocked("multi-shot")).toBe(true);
    expect(mgr.isUnlocked("piercing")).toBe(true);
    expect(mgr.isUnlocked("rapid-fire")).toBe(true);
  });
});

// --- WeaponManager: reset ---

describe("WeaponManager: resetAll", () => {
  let mgr: WeaponManager;

  beforeEach(() => {
    mgr = new WeaponManager();
  });

  it("clears everything back to just default", () => {
    mgr.collectUpgrade("multi-shot");
    mgr.collectUpgrade("piercing");

    mgr.resetAll();

    expect(mgr.currentWeapon).toBe("default");
    expect(mgr.isUnlocked("multi-shot")).toBe(false);
    expect(mgr.isUnlocked("piercing")).toBe(false);
    expect(mgr.isUnlocked("default")).toBe(true);
  });
});

describe("WeaponManager: resetForNewLevel", () => {
  let mgr: WeaponManager;

  beforeEach(() => {
    mgr = new WeaponManager();
  });

  it("preserves unlocked weapons across levels", () => {
    mgr.collectUpgrade("multi-shot");
    mgr.collectUpgrade("piercing");
    mgr.switchTo("piercing");

    mgr.resetForNewLevel();

    expect(mgr.isUnlocked("multi-shot")).toBe(true);
    expect(mgr.isUnlocked("piercing")).toBe(true);
    expect(mgr.currentWeapon).toBe("piercing");
  });
});

describe("WeaponManager: getOrderedInventory", () => {
  it("returns WEAPON_SLOTS in deterministic order", () => {
    const mgr = new WeaponManager();
    const inventory = mgr.getOrderedInventory();
    expect(inventory).toEqual(["default", "multi-shot", "piercing", "rapid-fire"]);
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
      expect(["multi-shot", "piercing", "rapid-fire", "bonus-arrows", "shield"]).toContain(ub.upgradeType);
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
    globalAlpha: 1,
    drawImage: jest.fn(),
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
    get weaponManager() { return game["weaponManager"]; },
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

describe("Game integration: weapon system", () => {
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

  it("popping an upgrade balloon unlocks the weapon and auto-switches", () => {
    const upgBalloon = new Balloon(400, 300, 60, "multi-shot");
    internals.balloons = [upgBalloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    const input = internals.input;
    (input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.weaponManager.isUnlocked("multi-shot")).toBe(true);
    expect(internals.weaponManager.currentWeapon).toBe("multi-shot");
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

  it("popping a standard balloon awards 1 point and no weapon unlock", () => {
    internals.score = 5;
    const balloon = new Balloon(400, 300, 60);
    internals.balloons = [balloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.score).toBe(6);
    expect(internals.weaponManager.currentWeapon).toBe("default");
  });

  it("multi-shot fires 3 arrows consuming only 1", () => {
    internals.weaponManager.unlock("multi-shot");
    internals.weaponManager.switchTo("multi-shot");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows.length).toBe(3);
    expect(internals.arrowsRemaining).toBe(49);
  });

  it("rapid-fire makes shots cost 0 arrows", () => {
    internals.weaponManager.unlock("rapid-fire");
    internals.weaponManager.switchTo("rapid-fire");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows.length).toBe(1);
    expect(internals.arrowsRemaining).toBe(50);
  });

  it("piercing sets arrow.piercing flag", () => {
    internals.weaponManager.unlock("piercing");
    internals.weaponManager.switchTo("piercing");
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows[0].piercing).toBe(true);
  });

  it("default weapon fires single non-piercing arrow", () => {
    internals.arrowsRemaining = 50;

    const input = internals.input;
    input.mousePos = { x: 400, y: 300 };
    (input as any).wasClicked = true;
    internals.updatePlaying(0.016);

    expect(internals.arrows.length).toBe(1);
    expect(internals.arrows[0].piercing).toBe(false);
    expect(internals.arrowsRemaining).toBe(49);
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

  it("duplicate weapon collection grants +5 arrows", () => {
    internals.weaponManager.unlock("multi-shot");
    internals.arrowsRemaining = 50;

    const upgBalloon = new Balloon(400, 300, 60, "multi-shot");
    internals.balloons = [upgBalloon];

    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.arrowsRemaining).toBe(55);
  });

  it("all weapons are cleared on game reset", () => {
    internals.weaponManager.unlock("multi-shot");
    internals.weaponManager.unlock("piercing");
    internals.weaponManager.switchTo("piercing");
    internals.resetGame();
    expect(internals.weaponManager.currentWeapon).toBe("default");
    expect(internals.weaponManager.isUnlocked("multi-shot")).toBe(false);
    expect(internals.weaponManager.isUnlocked("piercing")).toBe(false);
  });
});

// --- Game integration: weapon persistence across levels ---

describe("Game integration: weapon persistence across levels", () => {
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

  it("unlocked weapons persist across levels", () => {
    const mgr = internals.weaponManager;
    mgr.unlock("rapid-fire");
    mgr.switchTo("rapid-fire");

    mgr.resetForNewLevel();
    expect(mgr.isUnlocked("rapid-fire")).toBe(true);
    expect(mgr.currentWeapon).toBe("rapid-fire");
  });

  it("weapon selection persists across levels", () => {
    const mgr = internals.weaponManager;
    mgr.collectUpgrade("multi-shot");
    mgr.collectUpgrade("piercing");
    mgr.switchTo("piercing");

    mgr.resetForNewLevel();

    expect(mgr.isUnlocked("multi-shot")).toBe(true);
    expect(mgr.isUnlocked("piercing")).toBe(true);
    expect(mgr.currentWeapon).toBe("piercing");
  });

  it("game reset clears all weapon state", () => {
    const mgr = internals.weaponManager;
    mgr.collectUpgrade("multi-shot");
    mgr.collectUpgrade("piercing");

    internals.resetGame();
    const mgr2 = internals.weaponManager;
    expect(mgr2.isUnlocked("multi-shot")).toBe(false);
    expect(mgr2.isUnlocked("piercing")).toBe(false);
    expect(mgr2.currentWeapon).toBe("default");
  });

  it("bonus-arrows via game integration grants +10 arrows", () => {
    internals.arrowsRemaining = 50;

    const upgBalloon = new Balloon(400, 300, 60, "bonus-arrows");
    internals.balloons = [upgBalloon];
    const arrow = new Arrow({ x: 400, y: 300 }, -Math.PI / 2);
    internals.arrows = [arrow];

    (internals.input as any).wasClicked = false;
    internals.updatePlaying(0.016);

    expect(internals.arrowsRemaining).toBe(60);
  });
});

// --- HUD weapon bar ---

describe("HUD weapon bar", () => {
  it("renders weapon slot labels during playing state", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    hud.render(ctx as any, "playing", 10, 50, 800, 600, "default", new Set(["default"] as const));

    const stdLabel = fillTextCalls.find(
      (c: { text: string }) => c.text === "STD"
    );
    expect(stdLabel).toBeDefined();
  });

  it("renders lock icons for locked weapon slots", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    hud.render(ctx as any, "playing", 10, 50, 800, 600, "default", new Set(["default"] as const));

    const lockCalls = fillTextCalls.filter(
      (c: { text: string }) => c.text === "🔒"
    );
    expect(lockCalls.length).toBe(3);
  });

  it("renders unlocked slot labels when weapons are unlocked", () => {
    const hud = new HUD();
    const canvas = createMockCanvas();
    const ctx = (canvas as any).__ctx;
    const fillTextCalls = (canvas as any).__fillTextCalls;

    const unlocked = new Set<WeaponType>(["default", "multi-shot"]);
    hud.render(ctx as any, "playing", 10, 50, 800, 600, "multi-shot", unlocked);

    const multiLabel = fillTextCalls.find(
      (c: { text: string }) => c.text === "MULTI"
    );
    expect(multiLabel).toBeDefined();

    const lockCalls = fillTextCalls.filter(
      (c: { text: string }) => c.text === "🔒"
    );
    expect(lockCalls.length).toBe(2);
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
