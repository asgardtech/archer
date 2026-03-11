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
// DRONE CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Drone enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a drone entry", () => {
    expect(ENEMY_CONFIGS.drone).toBeDefined();
  });

  test("drone config has HP 1", () => {
    expect(ENEMY_CONFIGS.drone.hitPoints).toBe(1);
  });

  test("drone config has speed 160", () => {
    expect(ENEMY_CONFIGS.drone.speed).toBe(160);
  });

  test("drone config has scoreValue 8", () => {
    expect(ENEMY_CONFIGS.drone.scoreValue).toBe(8);
  });

  test("drone config has size 16x16", () => {
    expect(ENEMY_CONFIGS.drone.width).toBe(16);
    expect(ENEMY_CONFIGS.drone.height).toBe(16);
  });

  test("drone config has fireRate 0.3", () => {
    expect(ENEMY_CONFIGS.drone.fireRate).toBe(0.3);
  });

  test("drone config has weaponType standard", () => {
    expect(ENEMY_CONFIGS.drone.weaponType).toBe("standard");
  });
});

// ════════════════════════════════════════════════════════════════
// DRONE CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Drone enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(200, 0, "drone");
    expect(e.hitPoints).toBe(1);
    expect(e.scoreValue).toBe(8);
    expect(e.width).toBe(16);
    expect(e.height).toBe(16);
    expect(e.vel.y).toBe(160);
    expect(e.alive).toBe(true);
  });

  test("drifts horizontally during descent", () => {
    const e = new Enemy(200, 0, "drone");
    // Run multiple updates to ensure at least some drift occurs
    let drifted = false;
    for (let i = 0; i < 20; i++) {
      const x0 = e.pos.x;
      e.update(0.5, 600);
      if (e.pos.x !== x0) drifted = true;
    }
    expect(drifted).toBe(true);
  });

  test("y position increases (descends)", () => {
    const e = new Enemy(200, 0, "drone");
    e.update(0.1, 600);
    expect(e.pos.y).toBeGreaterThan(0);
  });

  test("descends at approximately its configured speed", () => {
    const e = new Enemy(200, 0, "drone");
    const dt = 0.1;
    e.update(dt, 600);
    expect(e.pos.y).toBeCloseTo(160 * dt, 0);
  });

  test("is culled when off-screen past bottom", () => {
    const e = new Enemy(200, 700, "drone");
    e.update(0.016, 600);
    expect(e.alive).toBe(false);
  });

  test("dies in one hit", () => {
    const e = new Enemy(200, 100, "drone");
    const destroyed = e.hit(1);
    expect(destroyed).toBe(true);
    expect(e.alive).toBe(false);
  });

  test("can fire when cooldown expires", () => {
    const e = new Enemy(200, 100, "drone");
    expect(e.fireRate).toBeGreaterThan(0);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// DRONE RENDERING
// ════════════════════════════════════════════════════════════════

describe("Drone enemy variant — rendering", () => {
  test("renders without error using hexagonal fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "drone");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (hexagon path)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "drone");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// SWARMER CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Swarmer enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a swarmer entry", () => {
    expect(ENEMY_CONFIGS.swarmer).toBeDefined();
  });

  test("swarmer config has HP 1", () => {
    expect(ENEMY_CONFIGS.swarmer.hitPoints).toBe(1);
  });

  test("swarmer config has speed 170", () => {
    expect(ENEMY_CONFIGS.swarmer.speed).toBe(170);
  });

  test("swarmer config has scoreValue 12", () => {
    expect(ENEMY_CONFIGS.swarmer.scoreValue).toBe(12);
  });

  test("swarmer config has size 18x18", () => {
    expect(ENEMY_CONFIGS.swarmer.width).toBe(18);
    expect(ENEMY_CONFIGS.swarmer.height).toBe(18);
  });

  test("swarmer config has fireRate 0.4", () => {
    expect(ENEMY_CONFIGS.swarmer.fireRate).toBe(0.4);
  });

  test("swarmer config has weaponType standard", () => {
    expect(ENEMY_CONFIGS.swarmer.weaponType).toBe("standard");
  });
});

// ════════════════════════════════════════════════════════════════
// SWARMER CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Swarmer enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(200, 0, "swarmer");
    expect(e.hitPoints).toBe(1);
    expect(e.scoreValue).toBe(12);
    expect(e.width).toBe(18);
    expect(e.height).toBe(18);
    expect(e.vel.y).toBe(170);
    expect(e.alive).toBe(true);
  });

  test("homes toward player X position (rightward)", () => {
    const e = new Enemy(100, 0, "swarmer");
    e.update(0.5, 600, 400);
    expect(e.pos.x).toBeGreaterThan(100);
    expect(e.pos.x).toBeLessThan(400);
  });

  test("homes toward player X position (leftward)", () => {
    const e = new Enemy(400, 0, "swarmer");
    e.update(0.5, 600, 100);
    expect(e.pos.x).toBeLessThan(400);
    expect(e.pos.x).toBeGreaterThan(100);
  });

  test("falls back to straight-line descent without targetX", () => {
    const e = new Enemy(200, 0, "swarmer");
    e.update(0.5, 600);
    expect(e.pos.x).toBe(200);
    expect(e.pos.y).toBeGreaterThan(0);
  });

  test("descends at approximately its configured speed", () => {
    const e = new Enemy(200, 0, "swarmer");
    const dt = 0.1;
    e.update(dt, 600, 200);
    expect(e.pos.y).toBeCloseTo(170 * dt, 0);
  });

  test("is culled when off-screen past bottom", () => {
    const e = new Enemy(200, 700, "swarmer");
    e.update(0.016, 600);
    expect(e.alive).toBe(false);
  });

  test("dies in one hit", () => {
    const e = new Enemy(200, 100, "swarmer");
    const destroyed = e.hit(1);
    expect(destroyed).toBe(true);
    expect(e.alive).toBe(false);
  });

  test("can fire when cooldown expires", () => {
    const e = new Enemy(200, 100, "swarmer");
    expect(e.fireRate).toBeGreaterThan(0);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SWARMER RENDERING
// ════════════════════════════════════════════════════════════════

describe("Swarmer enemy variant — rendering", () => {
  test("renders without error using angular fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "swarmer");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (angular shape)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "swarmer");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// DRONE vs SWARMER MOVEMENT COMPARISON
// ════════════════════════════════════════════════════════════════

describe("Drone vs Swarmer movement comparison", () => {
  test("swarmer tracks toward targetX while drone drifts randomly", () => {
    const drone = new Enemy(300, 0, "drone");
    const swarmer = new Enemy(300, 0, "swarmer");
    const targetX = 500;

    swarmer.update(1.0, 600, targetX);
    drone.update(1.0, 600, targetX);

    // Swarmer should be closer to targetX than it started
    expect(Math.abs(swarmer.pos.x - targetX)).toBeLessThan(Math.abs(300 - targetX));
  });

  test("drone drift is non-deterministic", () => {
    const results = new Set<number>();
    for (let i = 0; i < 10; i++) {
      const e = new Enemy(300, 0, "drone");
      e.update(1.0, 600);
      results.add(Math.round(e.pos.x * 100));
    }
    // With random drift, we should see multiple distinct x values
    expect(results.size).toBeGreaterThan(1);
  });
});

// ════════════════════════════════════════════════════════════════
// SPRITE ASSETS
// ════════════════════════════════════════════════════════════════

describe("Sprite assets for Drone and Swarmer", () => {
  test("enemy_drone.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_drone.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("enemy_swarmer.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_swarmer.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("ASSET_MANIFEST contains enemy_drone key", () => {
    expect(ASSET_MANIFEST.enemy_drone).toBe("assets/raptor/enemy_drone.png");
  });

  test("ASSET_MANIFEST contains enemy_swarmer key", () => {
    expect(ASSET_MANIFEST.enemy_swarmer).toBe("assets/raptor/enemy_swarmer.png");
  });
});
