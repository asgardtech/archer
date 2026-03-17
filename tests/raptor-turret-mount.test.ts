import { TurretMount, TurretMountConfig } from "../src/games/raptor/entities/TurretMount";

const DEFAULT_CONFIG: TurretMountConfig = {
  offsetX: 0,
  offsetY: -20,
  barrelLength: 8,
  baseRadius: 4,
  color: "rgba(0, 150, 255, 0.8)",
  barrelColor: "rgba(100, 200, 255, 0.9)",
};

function createTurret(overrides?: Partial<TurretMountConfig>): TurretMount {
  return new TurretMount({ ...DEFAULT_CONFIG, ...overrides });
}

describe("TurretMount position calculations", () => {
  test("getWorldPos applies offset to entity position", () => {
    const turret = createTurret({ offsetX: 10, offsetY: -15 });
    const pos = turret.getWorldPos(100, 200);
    expect(pos.x).toBe(110);
    expect(pos.y).toBe(185);
  });

  test("getWorldPos with zero offset returns entity position", () => {
    const turret = createTurret({ offsetX: 0, offsetY: 0 });
    const pos = turret.getWorldPos(50, 75);
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(75);
  });

  test("getBarrelTip extends from world position along angle", () => {
    const turret = createTurret({ offsetX: 0, offsetY: 0, barrelLength: 10 });
    turret.angle = 0; // pointing right
    const tip = turret.getBarrelTip(100, 100);
    expect(tip.x).toBeCloseTo(110);
    expect(tip.y).toBeCloseTo(100);
  });

  test("getBarrelTip with default angle (-π/2) points upward", () => {
    const turret = createTurret({ offsetX: 0, offsetY: 0, barrelLength: 10 });
    const tip = turret.getBarrelTip(100, 100);
    expect(tip.x).toBeCloseTo(100);
    expect(tip.y).toBeCloseTo(90);
  });

  test("getBarrelTip accounts for offset and angle", () => {
    const turret = createTurret({ offsetX: 5, offsetY: -10, barrelLength: 10 });
    turret.angle = Math.PI / 2; // pointing down
    const tip = turret.getBarrelTip(100, 200);
    expect(tip.x).toBeCloseTo(105);
    expect(tip.y).toBeCloseTo(200);
  });

  test("default angle is -π/2 (pointing up)", () => {
    const turret = createTurret();
    expect(turret.angle).toBe(-Math.PI / 2);
  });

  test("angle can be changed", () => {
    const turret = createTurret();
    turret.angle = Math.PI / 4;
    expect(turret.angle).toBe(Math.PI / 4);
  });
});

describe("TurretMount rendering", () => {
  function createMockCtx() {
    return {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;
  }

  test("render draws without errors", () => {
    const turret = createTurret();
    const ctx = createMockCtx();
    expect(() => turret.render(ctx, 100, 200)).not.toThrow();
  });

  test("render with glow intensity > 0 draws glow circle", () => {
    const turret = createTurret();
    const ctx = createMockCtx();
    turret.render(ctx, 100, 200, 0.5);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  test("render with glow intensity 0 draws base but no glow", () => {
    const turret = createTurret();
    const ctx = createMockCtx();
    turret.render(ctx, 100, 200, 0);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
  });

  test("render draws barrel line", () => {
    const turret = createTurret();
    const ctx = createMockCtx();
    turret.render(ctx, 100, 200);
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  test("render calls save and restore for state isolation", () => {
    const turret = createTurret();
    const ctx = createMockCtx();
    turret.render(ctx, 100, 200);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });
});

describe("TurretMount integration with beam origins", () => {
  test("player turret barrel tip provides beam origin", () => {
    const turret = createTurret({ offsetX: 0, offsetY: -22.4, barrelLength: 8 });
    turret.angle = -Math.PI / 2;
    const tip = turret.getBarrelTip(200, 400);
    expect(tip.x).toBeCloseTo(200);
    expect(tip.y).toBeCloseTo(400 - 22.4 - 8);
  });

  test("enemy turret at origin with downward angle provides beam origin", () => {
    const turret = createTurret({ offsetX: 0, offsetY: 0, barrelLength: 8 });
    turret.angle = Math.PI / 2; // pointing down
    const tip = turret.getBarrelTip(300, 100);
    expect(tip.x).toBeCloseTo(300);
    expect(tip.y).toBeCloseTo(108);
  });
});
