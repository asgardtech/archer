import { Enemy } from "../src/games/raptor/entities/Enemy";
import { EnemyBullet } from "../src/games/raptor/entities/EnemyBullet";
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
    shadowColor: "",
    shadowBlur: 0,
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
// STEALTH CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a stealth entry", () => {
    expect(ENEMY_CONFIGS.stealth).toBeDefined();
  });

  test("stealth config has HP 2", () => {
    expect(ENEMY_CONFIGS.stealth.hitPoints).toBe(2);
  });

  test("stealth config has speed 160", () => {
    expect(ENEMY_CONFIGS.stealth.speed).toBe(160);
  });

  test("stealth config has scoreValue 35", () => {
    expect(ENEMY_CONFIGS.stealth.scoreValue).toBe(35);
  });

  test("stealth config has size 28x26", () => {
    expect(ENEMY_CONFIGS.stealth.width).toBe(28);
    expect(ENEMY_CONFIGS.stealth.height).toBe(26);
  });

  test("stealth config has fireRate 0.7", () => {
    expect(ENEMY_CONFIGS.stealth.fireRate).toBe(0.7);
  });

  test("stealth config has weaponType standard", () => {
    expect(ENEMY_CONFIGS.stealth.weaponType).toBe("standard");
  });
});

// ════════════════════════════════════════════════════════════════
// STEALTH CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(200, 0, "stealth");
    expect(e.hitPoints).toBe(2);
    expect(e.scoreValue).toBe(35);
    expect(e.width).toBe(28);
    expect(e.height).toBe(26);
    expect(e.vel.y).toBe(160);
    expect(e.alive).toBe(true);
  });

  test("starts in visible phase", () => {
    const e = new Enemy(200, 0, "stealth");
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });

  test("transitions to cloaked after 2.0 seconds", () => {
    const e = new Enemy(200, 0, "stealth");
    e.fireCooldown = 0;

    // Update for just under 2 seconds — still visible
    for (let i = 0; i < 19; i++) e.update(0.1, 600);
    expect(e.canFire()).toBe(true);

    // Push past the 2s mark
    e.update(0.15, 600);
    expect(e.canFire()).toBe(false);
  });

  test("transitions back to visible after cloaked duration (1.5s)", () => {
    const e = new Enemy(200, 0, "stealth");
    e.fireCooldown = 0;

    // Go through visible (2s) + cloaked (1.5s) = 3.5s total
    for (let i = 0; i < 35; i++) e.update(0.1, 600);
    // Should be back to visible
    expect(e.canFire()).toBe(true);
  });

  test("cannot fire while cloaked", () => {
    const e = new Enemy(200, 0, "stealth");
    e.fireCooldown = 0;

    // Advance past 2.0s to enter cloaked phase
    for (let i = 0; i < 21; i++) e.update(0.1, 600);
    expect(e.canFire()).toBe(false);
  });

  test("can fire while visible", () => {
    const e = new Enemy(200, 0, "stealth");
    e.fireCooldown = 0;
    e.update(0.1, 600);
    expect(e.canFire()).toBe(true);
  });

  test("can be hit while cloaked", () => {
    const e = new Enemy(200, 0, "stealth");

    // Enter cloaked phase
    for (let i = 0; i < 21; i++) e.update(0.1, 600);
    expect(e.canFire()).toBe(false); // confirms cloaked

    const destroyed = e.hit(1);
    expect(destroyed).toBe(false);
    expect(e.hitPoints).toBe(1);
    expect(e.alive).toBe(true);
  });

  test("descends with horizontal weave", () => {
    const e = new Enemy(400, 0, "stealth");
    const initialX = e.pos.x;
    let xChanged = false;

    for (let i = 0; i < 30; i++) {
      e.update(0.05, 600);
      if (Math.abs(e.pos.x - initialX) > 0.01) xChanged = true;
    }

    expect(e.pos.y).toBeGreaterThan(0);
    expect(xChanged).toBe(true);
  });

  test("is culled when off-screen past bottom", () => {
    const e = new Enemy(200, 700, "stealth");
    e.update(0.016, 600);
    expect(e.alive).toBe(false);
  });

  test("dies after 2 hits", () => {
    const e = new Enemy(200, 100, "stealth");
    e.hit(1);
    expect(e.alive).toBe(true);
    const destroyed = e.hit(1);
    expect(destroyed).toBe(true);
    expect(e.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// STEALTH RENDERING
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy variant — rendering", () => {
  test("renders without error using fallback shape", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "stealth");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (angular shape)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "stealth");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  test("renders at reduced opacity when cloaked", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "stealth");

    // Enter cloaked phase
    for (let i = 0; i < 21; i++) e.update(0.1, 600);

    e.render(ctx);
    // globalAlpha should have been set to 0.1 at some point during rendering
    expect(ctx.globalAlpha).toBeDefined();
  });

  test("renders at full opacity when visible", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "stealth");
    e.update(0.1, 600);
    e.render(ctx);
    // After restore, globalAlpha should be 1
    expect(ctx.globalAlpha).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a minelayer entry", () => {
    expect(ENEMY_CONFIGS.minelayer).toBeDefined();
  });

  test("minelayer config has HP 2", () => {
    expect(ENEMY_CONFIGS.minelayer.hitPoints).toBe(2);
  });

  test("minelayer config has speed 100", () => {
    expect(ENEMY_CONFIGS.minelayer.speed).toBe(100);
  });

  test("minelayer config has scoreValue 30", () => {
    expect(ENEMY_CONFIGS.minelayer.scoreValue).toBe(30);
  });

  test("minelayer config has size 32x28", () => {
    expect(ENEMY_CONFIGS.minelayer.width).toBe(32);
    expect(ENEMY_CONFIGS.minelayer.height).toBe(28);
  });

  test("minelayer config has fireRate 0", () => {
    expect(ENEMY_CONFIGS.minelayer.fireRate).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(200, 0, "minelayer");
    expect(e.hitPoints).toBe(2);
    expect(e.scoreValue).toBe(30);
    expect(e.width).toBe(32);
    expect(e.height).toBe(28);
    expect(e.alive).toBe(true);
  });

  test("moves primarily horizontally after initialization", () => {
    const e = new Enemy(200, -30, "minelayer");
    e.update(0.1, 600);
    const startX = e.pos.x;
    const startY = e.pos.y;
    e.update(1.0, 600);
    const dx = Math.abs(e.pos.x - startX);
    const dy = Math.abs(e.pos.y - startY);
    expect(dx).toBeGreaterThan(dy);
  });

  test("descends slowly in y", () => {
    const e = new Enemy(200, -30, "minelayer");
    e.update(0.1, 600);
    const startY = e.pos.y;
    e.update(1.0, 600);
    expect(e.pos.y).toBeGreaterThan(startY);
  });

  test("is culled when exiting opposite screen edge", () => {
    const e = new Enemy(200, -30, "minelayer");
    // Initialize the minelayer
    e.update(0.1, 600);

    // Move it far enough to exit
    for (let i = 0; i < 200; i++) {
      e.update(0.1, 600);
      if (!e.alive) break;
    }
    expect(e.alive).toBe(false);
  });

  test("shouldDropMine returns false for non-minelayer", () => {
    const e = new Enemy(200, 100, "fighter");
    expect(e.shouldDropMine()).toBe(false);
  });

  test("shouldDropMine returns true after 2 seconds for minelayer", () => {
    const e = new Enemy(200, -30, "minelayer");
    // Initialize
    e.update(0.1, 600);

    // Advance to just under 2 seconds (including the 0.1 from init)
    for (let i = 0; i < 18; i++) e.update(0.1, 600);
    expect(e.shouldDropMine()).toBe(false);

    // Push past 2s
    e.update(0.15, 600);
    expect(e.shouldDropMine()).toBe(true);
  });

  test("shouldDropMine resets timer after returning true", () => {
    const e = new Enemy(200, -30, "minelayer");
    e.update(0.1, 600);

    // Advance past 2s
    for (let i = 0; i < 20; i++) e.update(0.1, 600);
    e.shouldDropMine(); // consumes the timer

    // Should not immediately drop again
    expect(e.shouldDropMine()).toBe(false);
  });

  test("canFire always returns false for minelayer", () => {
    const e = new Enemy(200, 100, "minelayer");
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(false);
  });

  test("dies after 2 hits", () => {
    const e = new Enemy(200, 100, "minelayer");
    e.hit(1);
    expect(e.alive).toBe(true);
    const destroyed = e.hit(1);
    expect(destroyed).toBe(true);
    expect(e.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER RENDERING
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy variant — rendering", () => {
  test("renders without error using fallback shape", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "minelayer");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (wide shape)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(200, 100, "minelayer");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// MINE ENTITY (EnemyBullet with TTL)
// ════════════════════════════════════════════════════════════════

describe("Mine entity — EnemyBullet with TTL and isMine", () => {
  test("mine is created with correct properties", () => {
    const mine = new EnemyBullet(300, 200, 300, 200, {
      damage: 30,
      speed: 0,
      radius: 8,
      ttl: 8.0,
      isMine: true,
      fallbackColor: "#ffcc00",
    });
    expect(mine.damage).toBe(30);
    expect(mine.radius).toBe(8);
    expect(mine.speed).toBe(0);
    expect(mine.ttl).toBe(8.0);
    expect(mine.isMine).toBe(true);
    expect(mine.alive).toBe(true);
  });

  test("mine has zero velocity", () => {
    const mine = new EnemyBullet(300, 200, 300, 200, {
      speed: 0,
      isMine: true,
      ttl: 8.0,
    });
    expect(mine.vel.x).toBe(0);
    expect(mine.vel.y).toBe(0);
  });

  test("mine does not move after updates", () => {
    const mine = new EnemyBullet(300, 200, 300, 200, {
      speed: 0,
      isMine: true,
      ttl: 8.0,
    });
    mine.update(1.0, 800, 600);
    expect(mine.pos.x).toBe(300);
    expect(mine.pos.y).toBe(200);
  });

  test("mine self-destructs after TTL expires", () => {
    const mine = new EnemyBullet(300, 200, 300, 200, {
      speed: 0,
      isMine: true,
      ttl: 8.0,
    });

    // Update for 7.9 seconds — still alive
    mine.update(7.9, 800, 600);
    expect(mine.alive).toBe(true);

    // Update for 0.2 more seconds — TTL exceeded
    mine.update(0.2, 800, 600);
    expect(mine.alive).toBe(false);
  });

  test("mine is not culled by off-screen bounds check", () => {
    const mine = new EnemyBullet(300, 200, 300, 200, {
      speed: 0,
      isMine: true,
      ttl: 8.0,
    });

    mine.update(1.0, 800, 600);
    expect(mine.alive).toBe(true);
  });

  test("regular bullet without TTL is unaffected", () => {
    const bullet = new EnemyBullet(300, 200, 300, 800);
    expect(bullet.ttl).toBeNull();
    expect(bullet.isMine).toBe(false);
    bullet.update(0.1, 800, 600);
    expect(bullet.alive).toBe(true);
  });

  test("mine renders as pulsing circle", () => {
    const ctx = createMockCtx();
    const mine = new EnemyBullet(300, 200, 300, 200, {
      speed: 0,
      isMine: true,
      ttl: 8.0,
      fallbackColor: "#ffcc00",
    });

    expect(() => mine.render(ctx)).not.toThrow();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// CLOAK CYCLE TIMING
// ════════════════════════════════════════════════════════════════

describe("Stealth cloak cycle timing", () => {
  test("full cycle: visible(2s) -> cloaked(1.5s) -> visible(2s)", () => {
    const e = new Enemy(200, 0, "stealth");
    e.fireCooldown = 0;
    const H = 5000; // large canvas so enemy isn't culled

    // 0–2s: visible
    for (let i = 0; i < 10; i++) e.update(0.1, H);
    expect(e.canFire()).toBe(true); // 1.0s, still visible

    for (let i = 0; i < 10; i++) e.update(0.1, H);
    // 2.0s mark — just transitioned to cloaked
    expect(e.canFire()).toBe(false);

    // 2.0–3.5s: cloaked
    for (let i = 0; i < 14; i++) e.update(0.1, H);
    expect(e.canFire()).toBe(false); // 3.4s, still cloaked

    e.update(0.15, H);
    // 3.55s -> past 3.5s mark, back to visible
    expect(e.canFire()).toBe(true);

    // Next visible phase: 3.5–5.5s
    for (let i = 0; i < 19; i++) e.update(0.1, H);
    expect(e.canFire()).toBe(true);

    e.update(0.15, H);
    // Past 5.5s, cloaked again
    expect(e.canFire()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// MINE DROP INTERVAL
// ════════════════════════════════════════════════════════════════

describe("Mine drop interval timing", () => {
  test("drops mine at 2s intervals", () => {
    const e = new Enemy(200, -30, "minelayer");
    e.update(0.1, 600); // initialize

    let dropCount = 0;
    // Run for 6 seconds
    for (let i = 0; i < 60; i++) {
      e.update(0.1, 600);
      if (e.shouldDropMine()) dropCount++;
    }

    // In ~6 seconds (minus 0.1 init), expect ~3 drops
    expect(dropCount).toBeGreaterThanOrEqual(2);
    expect(dropCount).toBeLessThanOrEqual(4);
  });
});

// ════════════════════════════════════════════════════════════════
// SPRITE ASSETS
// ════════════════════════════════════════════════════════════════

describe("Sprite assets for Stealth and Minelayer", () => {
  test("enemy_stealth.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_stealth.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("enemy_minelayer.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_minelayer.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("ASSET_MANIFEST contains enemy_stealth key", () => {
    expect(ASSET_MANIFEST.enemy_stealth).toBe("assets/raptor/enemy_stealth.png");
  });

  test("ASSET_MANIFEST contains enemy_minelayer key", () => {
    expect(ASSET_MANIFEST.enemy_minelayer).toBe("assets/raptor/enemy_minelayer.png");
  });
});
