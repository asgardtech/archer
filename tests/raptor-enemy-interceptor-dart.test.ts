import { Enemy } from "../src/games/raptor/entities/Enemy";
import { ENEMY_CONFIGS, EnemyVariant } from "../src/games/raptor/types";

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
// INTERCEPTOR CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Interceptor enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains an interceptor entry", () => {
    expect(ENEMY_CONFIGS.interceptor).toBeDefined();
  });

  test("interceptor config has HP 1", () => {
    expect(ENEMY_CONFIGS.interceptor.hitPoints).toBe(1);
  });

  test("interceptor config has speed 250", () => {
    expect(ENEMY_CONFIGS.interceptor.speed).toBe(250);
  });

  test("interceptor config has scoreValue 15", () => {
    expect(ENEMY_CONFIGS.interceptor.scoreValue).toBe(15);
  });

  test("interceptor config has size 22x22", () => {
    expect(ENEMY_CONFIGS.interceptor.width).toBe(22);
    expect(ENEMY_CONFIGS.interceptor.height).toBe(22);
  });

  test("interceptor config has fireRate 0.5", () => {
    expect(ENEMY_CONFIGS.interceptor.fireRate).toBe(0.5);
  });

  test("interceptor config has weaponType standard", () => {
    expect(ENEMY_CONFIGS.interceptor.weaponType).toBe("standard");
  });
});

// ════════════════════════════════════════════════════════════════
// INTERCEPTOR CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Interceptor enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(100, 0, "interceptor");
    expect(e.hitPoints).toBe(1);
    expect(e.scoreValue).toBe(15);
    expect(e.width).toBe(22);
    expect(e.height).toBe(22);
    expect(e.alive).toBe(true);
  });

  test("sinusoidal movement changes x position", () => {
    const e = new Enemy(400, 0, "interceptor");
    const initialX = e.pos.x;
    e.update(0.5, 600);
    expect(e.pos.x).not.toBe(initialX);
  });

  test("vertical descent continues during movement", () => {
    const e = new Enemy(400, 0, "interceptor");
    e.update(0.1, 600);
    expect(e.pos.y).toBeGreaterThan(0);
  });

  test("vertical descent is approximately speed * dt", () => {
    const e = new Enemy(400, 0, "interceptor");
    const dt = 0.1;
    e.update(dt, 600);
    expect(e.pos.y).toBeCloseTo(250 * dt, 0);
  });

  test("interceptor continues descending past boss stop point", () => {
    const e = new Enemy(400, 0, "interceptor");
    const bossStopY = 600 * 0.15; // 90
    for (let t = 0; t < 2; t += 0.016) {
      e.update(0.016, 600);
    }
    expect(e.pos.y).toBeGreaterThan(bossStopY);
    expect(e.alive).toBe(true);
  });

  test("dies in one hit", () => {
    const e = new Enemy(400, 100, "interceptor");
    const destroyed = e.hit(1);
    expect(destroyed).toBe(true);
    expect(e.alive).toBe(false);
  });

  test("can fire (fireRate > 0)", () => {
    const e = new Enemy(400, 100, "interceptor");
    expect(e.fireRate).toBeGreaterThan(0);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });

  test("is culled when off-screen past bottom", () => {
    const e = new Enemy(400, 700, "interceptor");
    e.update(0.016, 600);
    expect(e.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// INTERCEPTOR RENDERING
// ════════════════════════════════════════════════════════════════

describe("Interceptor enemy variant — rendering", () => {
  test("renders without error using chevron fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "interceptor");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("uses cyan/teal color #44cccc when rendering", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "interceptor");
    e.render(ctx);
    const fillStyleSets = Object.getOwnPropertyDescriptor(ctx, "fillStyle");
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// DART CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Dart enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a dart entry", () => {
    expect(ENEMY_CONFIGS.dart).toBeDefined();
  });

  test("dart config has HP 1", () => {
    expect(ENEMY_CONFIGS.dart.hitPoints).toBe(1);
  });

  test("dart config has speed 300", () => {
    expect(ENEMY_CONFIGS.dart.speed).toBe(300);
  });

  test("dart config has scoreValue 12", () => {
    expect(ENEMY_CONFIGS.dart.scoreValue).toBe(12);
  });

  test("dart config has size 18x20", () => {
    expect(ENEMY_CONFIGS.dart.width).toBe(18);
    expect(ENEMY_CONFIGS.dart.height).toBe(20);
  });

  test("dart config has fireRate 0", () => {
    expect(ENEMY_CONFIGS.dart.fireRate).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// DART CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Dart enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(100, 0, "dart");
    expect(e.hitPoints).toBe(1);
    expect(e.scoreValue).toBe(12);
    expect(e.width).toBe(18);
    expect(e.height).toBe(20);
    expect(e.vel.y).toBe(300);
    expect(e.alive).toBe(true);
  });

  test("moves in a straight line (x unchanged)", () => {
    const e = new Enemy(400, 0, "dart");
    e.update(1, 600);
    expect(e.pos.x).toBe(400);
  });

  test("descends at high speed (approximately 300 px/s)", () => {
    const e = new Enemy(400, 0, "dart");
    const dt = 1;
    e.update(dt, 10000);
    expect(e.pos.y).toBeCloseTo(300, 0);
  });

  test("cannot fire (canFire always false)", () => {
    const e = new Enemy(400, 100, "dart");
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(false);
    e.update(10, 600);
    expect(e.canFire()).toBe(false);
  });

  test("dies in one hit", () => {
    const e = new Enemy(400, 100, "dart");
    const destroyed = e.hit(1);
    expect(destroyed).toBe(true);
    expect(e.alive).toBe(false);
  });

  test("is culled when off-screen past bottom", () => {
    const e = new Enemy(400, 700, "dart");
    e.update(0.016, 600);
    expect(e.alive).toBe(false);
  });

  test("velocity y component equals 300", () => {
    const e = new Enemy(400, 0, "dart");
    expect(e.vel.y).toBe(300);
  });
});

// ════════════════════════════════════════════════════════════════
// DART RENDERING
// ════════════════════════════════════════════════════════════════

describe("Dart enemy variant — rendering", () => {
  test("renders without error using needle fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "dart");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("uses yellow color #cccc44 when rendering", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "dart");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// MOVEMENT COMPARISON
// ════════════════════════════════════════════════════════════════

describe("Interceptor vs Dart movement patterns", () => {
  test("interceptor has horizontal movement, dart does not", () => {
    const interceptor = new Enemy(400, 0, "interceptor");
    const dart = new Enemy(400, 0, "dart");

    interceptor.update(0.5, 600);
    dart.update(0.5, 600);

    expect(interceptor.pos.x).not.toBe(400);
    expect(dart.pos.x).toBe(400);
  });

  test("dart is faster than interceptor vertically", () => {
    const interceptor = new Enemy(400, 0, "interceptor");
    const dart = new Enemy(400, 0, "dart");

    interceptor.update(1, 10000);
    dart.update(1, 10000);

    expect(dart.pos.y).toBeGreaterThan(interceptor.pos.y);
  });
});
