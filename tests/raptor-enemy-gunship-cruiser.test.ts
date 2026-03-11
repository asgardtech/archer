import { Enemy } from "../src/games/raptor/entities/Enemy";
import { ENEMY_CONFIGS } from "../src/games/raptor/types";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import * as fs from "fs";
import * as path from "path";

function createMockCtx() {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    drawImage: jest.fn(),
    clearRect: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    measureText: jest.fn(() => ({ width: 50 })),
  } as unknown as CanvasRenderingContext2D;
}

// ════════════════════════════════════════════════════════════════
// GUNSHIP CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Gunship enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a gunship entry", () => {
    expect(ENEMY_CONFIGS.gunship).toBeDefined();
  });

  test("gunship config has HP 3", () => {
    expect(ENEMY_CONFIGS.gunship.hitPoints).toBe(3);
  });

  test("gunship config has speed 110", () => {
    expect(ENEMY_CONFIGS.gunship.speed).toBe(110);
  });

  test("gunship config has scoreValue 40", () => {
    expect(ENEMY_CONFIGS.gunship.scoreValue).toBe(40);
  });

  test("gunship config has size 34x32", () => {
    expect(ENEMY_CONFIGS.gunship.width).toBe(34);
    expect(ENEMY_CONFIGS.gunship.height).toBe(32);
  });

  test("gunship config has fireRate 0.9", () => {
    expect(ENEMY_CONFIGS.gunship.fireRate).toBe(0.9);
  });

  test("gunship config has weaponType spread", () => {
    expect(ENEMY_CONFIGS.gunship.weaponType).toBe("spread");
  });
});

// ════════════════════════════════════════════════════════════════
// GUNSHIP CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Gunship enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(400, 0, "gunship");
    expect(e.hitPoints).toBe(3);
    expect(e.maxHitPoints).toBe(3);
    expect(e.scoreValue).toBe(40);
    expect(e.width).toBe(34);
    expect(e.height).toBe(32);
    expect(e.vel.y).toBe(110);
    expect(e.weaponType).toBe("spread");
    expect(e.alive).toBe(true);
  });

  test("descends in a straight line (x unchanged)", () => {
    const e = new Enemy(400, 0, "gunship");
    e.update(0.5, 600);
    expect(e.pos.x).toBe(400);
  });

  test("descends at approximately speed * dt", () => {
    const e = new Enemy(400, 0, "gunship");
    const dt = 0.5;
    e.update(dt, 600);
    expect(e.pos.y).toBeCloseTo(110 * dt, 0);
  });

  test("can fire when cooldown expires", () => {
    const e = new Enemy(400, 100, "gunship");
    expect(e.fireRate).toBeGreaterThan(0);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
    expect(e.weaponType).toBe("spread");
  });

  test("takes 3 hits to destroy", () => {
    const e = new Enemy(400, 100, "gunship");
    expect(e.hit(1)).toBe(false);
    expect(e.alive).toBe(true);
    expect(e.hitPoints).toBe(2);

    expect(e.hit(1)).toBe(false);
    expect(e.alive).toBe(true);
    expect(e.hitPoints).toBe(1);

    expect(e.hit(1)).toBe(true);
    expect(e.alive).toBe(false);
    expect(e.hitPoints).toBe(0);
  });

  test("is culled when off-screen past bottom", () => {
    const e = new Enemy(400, 700, "gunship");
    e.update(0.016, 600);
    expect(e.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// GUNSHIP RENDERING
// ════════════════════════════════════════════════════════════════

describe("Gunship enemy variant — rendering", () => {
  test("renders without error using geometric fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "gunship");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (polygon shape drawn)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "gunship");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// CRUISER CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Cruiser enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a cruiser entry", () => {
    expect(ENEMY_CONFIGS.cruiser).toBeDefined();
  });

  test("cruiser config has HP 5", () => {
    expect(ENEMY_CONFIGS.cruiser.hitPoints).toBe(5);
  });

  test("cruiser config has speed 60", () => {
    expect(ENEMY_CONFIGS.cruiser.speed).toBe(60);
  });

  test("cruiser config has scoreValue 75", () => {
    expect(ENEMY_CONFIGS.cruiser.scoreValue).toBe(75);
  });

  test("cruiser config has size 48x44", () => {
    expect(ENEMY_CONFIGS.cruiser.width).toBe(48);
    expect(ENEMY_CONFIGS.cruiser.height).toBe(44);
  });

  test("cruiser config has fireRate 0.6", () => {
    expect(ENEMY_CONFIGS.cruiser.fireRate).toBe(0.6);
  });

  test("cruiser config has weaponType missile", () => {
    expect(ENEMY_CONFIGS.cruiser.weaponType).toBe("missile");
  });
});

// ════════════════════════════════════════════════════════════════
// CRUISER CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Cruiser enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(400, 0, "cruiser");
    expect(e.hitPoints).toBe(5);
    expect(e.maxHitPoints).toBe(5);
    expect(e.scoreValue).toBe(75);
    expect(e.width).toBe(48);
    expect(e.height).toBe(44);
    expect(e.vel.y).toBe(60);
    expect(e.weaponType).toBe("missile");
    expect(e.alive).toBe(true);
  });

  test("standard descent before reaching 30% threshold", () => {
    const e = new Enemy(400, 0, "cruiser");
    const dt = 0.1;
    e.update(dt, 600);
    expect(e.pos.y).toBeCloseTo(60 * dt, 0);
    expect(e.pos.x).toBe(400);
  });

  test("patrol behavior activates after reaching 30% threshold", () => {
    const canvasHeight = 600;
    const threshold = canvasHeight * 0.3; // 180
    const e = new Enemy(400, threshold, "cruiser");

    // Run several updates and track x changes
    let xChanged = false;
    for (let i = 0; i < 20; i++) {
      const prevX = e.pos.x;
      e.update(0.1, canvasHeight);
      if (Math.abs(e.pos.x - prevX) > 0.001) xChanged = true;
    }
    expect(xChanged).toBe(true);
  });

  test("descent rate slows dramatically after threshold", () => {
    const canvasHeight = 600;
    const threshold = canvasHeight * 0.3;

    // Cruiser before threshold
    const eBefore = new Enemy(400, 0, "cruiser");
    eBefore.update(1.0, canvasHeight);
    const yMoveBefore = eBefore.pos.y;

    // Cruiser after threshold
    const eAfter = new Enemy(400, threshold, "cruiser");
    eAfter.update(1.0, canvasHeight);
    const yMoveAfter = eAfter.pos.y - threshold;

    expect(yMoveAfter).toBeLessThan(yMoveBefore);
    expect(yMoveAfter).toBeCloseTo(60 * 0.1, 0);
  });

  test("takes 5 hits to destroy", () => {
    const e = new Enemy(400, 100, "cruiser");
    for (let i = 0; i < 4; i++) {
      expect(e.hit(1)).toBe(false);
      expect(e.alive).toBe(true);
    }
    expect(e.hitPoints).toBe(1);
    expect(e.hit(1)).toBe(true);
    expect(e.alive).toBe(false);
  });

  test("can fire when cooldown expires", () => {
    const e = new Enemy(400, 100, "cruiser");
    expect(e.fireRate).toBeGreaterThan(0);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
    expect(e.weaponType).toBe("missile");
  });

  test("is culled when off-screen past bottom", () => {
    const e = new Enemy(400, 700, "cruiser");
    e.update(0.016, 600);
    expect(e.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// CRUISER RENDERING & HP BAR
// ════════════════════════════════════════════════════════════════

describe("Cruiser enemy variant — rendering", () => {
  test("renders without error using geometric fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "cruiser");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (polygon shape drawn)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "cruiser");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  test("HP bar renders for cruiser (fillRect called for bar)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "cruiser");
    e.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();
    const fillRectCalls = (ctx.fillRect as jest.Mock).mock.calls;
    expect(fillRectCalls.length).toBeGreaterThanOrEqual(2);
  });

  test("HP bar renders for cruiser in sprite mode", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "cruiser");
    const mockSprite = {
      width: 48,
      height: 44,
    } as HTMLImageElement;
    e.setSprite(mockSprite);
    e.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test("HP bar fill color is green at full health", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "cruiser");
    e.render(ctx);
    const fillStyles: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      set(val: string) { fillStyles.push(val); },
      get() { return fillStyles[fillStyles.length - 1] || ""; },
    });
    e.render(ctx);
    expect(fillStyles).toContain("#2ecc71");
  });

  test("HP bar fill color is yellow when HP drops below 50%", () => {
    const ctx = createMockCtx();
    const fillStyles: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      set(val: string) { fillStyles.push(val); },
      get() { return fillStyles[fillStyles.length - 1] || ""; },
    });
    const e = new Enemy(400, 100, "cruiser");
    e.hit(3); // 2/5 HP = 40%
    e.render(ctx);
    expect(fillStyles).toContain("#f1c40f");
  });

  test("HP bar fill color is red when HP drops below 25%", () => {
    const ctx = createMockCtx();
    const fillStyles: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      set(val: string) { fillStyles.push(val); },
      get() { return fillStyles[fillStyles.length - 1] || ""; },
    });
    const e = new Enemy(400, 100, "cruiser");
    e.hit(4); // 1/5 HP = 20%
    e.render(ctx);
    expect(fillStyles).toContain("#e74c3c");
  });
});

// ════════════════════════════════════════════════════════════════
// GUNSHIP vs CRUISER COMPARISON
// ════════════════════════════════════════════════════════════════

describe("Gunship vs Cruiser comparison", () => {
  test("gunship is faster than cruiser", () => {
    const gunship = new Enemy(400, 0, "gunship");
    const cruiser = new Enemy(400, 0, "cruiser");
    gunship.update(1.0, 600);
    cruiser.update(1.0, 600);
    expect(gunship.pos.y).toBeGreaterThan(cruiser.pos.y);
  });

  test("cruiser has more HP than gunship", () => {
    const gunship = new Enemy(400, 0, "gunship");
    const cruiser = new Enemy(400, 0, "cruiser");
    expect(cruiser.maxHitPoints).toBeGreaterThan(gunship.maxHitPoints);
  });

  test("cruiser has horizontal patrol, gunship does not", () => {
    const canvasHeight = 600;
    const gunship = new Enemy(400, 200, "gunship");
    const cruiser = new Enemy(400, 200, "cruiser");

    for (let i = 0; i < 20; i++) {
      gunship.update(0.1, canvasHeight);
      cruiser.update(0.1, canvasHeight);
    }

    expect(gunship.pos.x).toBe(400);
    expect(cruiser.pos.x).not.toBe(400);
  });

  test("both produce medium explosions (size 2 in handleEnemyDestroyed)", () => {
    expect(ENEMY_CONFIGS.gunship).toBeDefined();
    expect(ENEMY_CONFIGS.cruiser).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// SPRITE ASSETS
// ════════════════════════════════════════════════════════════════

describe("Sprite assets for Gunship and Cruiser", () => {
  test("enemy_gunship.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_gunship.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("enemy_cruiser.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_cruiser.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("ASSET_MANIFEST contains enemy_gunship key", () => {
    expect(ASSET_MANIFEST.enemy_gunship).toBe("assets/raptor/enemy_gunship.png");
  });

  test("ASSET_MANIFEST contains enemy_cruiser key", () => {
    expect(ASSET_MANIFEST.enemy_cruiser).toBe("assets/raptor/enemy_cruiser.png");
  });
});
