/**
 * Tests for Enemy laser beam origin tracking, angled beam, and rotation rendering
 */

import { EnemyLaserBeam, EnemyLaserBeamConfig } from "../src/games/raptor/entities/EnemyLaserBeam";

const DEFAULT_CONFIG: EnemyLaserBeamConfig = {
  warmupDuration: 1.0,
  activeDuration: 2.0,
  cooldownDuration: 0.5,
  beamWidth: 12,
  trackingSpeed: 40,
  damage: 10,
};

function createBeam(config?: Partial<EnemyLaserBeamConfig>): EnemyLaserBeam {
  return new EnemyLaserBeam({ ...DEFAULT_CONFIG, ...config });
}

describe("EnemyLaserBeam originX tracking", () => {
  test("originX is set on activate", () => {
    const beam = createBeam();
    beam.activate(200, 50, 300);
    expect(beam.originX).toBe(200);
  });

  test("originX tracks enemyX during warmup phase", () => {
    const beam = createBeam();
    beam.activate(200, 50, 300);

    beam.update(0.1, 210, 55, 300);
    expect(beam.originX).toBe(210);

    beam.update(0.1, 220, 55, 300);
    expect(beam.originX).toBe(220);
  });

  test("originX tracks enemyX during active phase", () => {
    const beam = createBeam({ warmupDuration: 0.1 });
    beam.activate(200, 50, 300);

    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("active");

    beam.update(0.1, 250, 50, 300);
    expect(beam.originX).toBe(250);
  });

  test("originX and beamX can differ during active phase when enemy moves", () => {
    const beam = createBeam({ warmupDuration: 0.1, trackingSpeed: 40 });
    beam.activate(200, 50, 400);

    beam.update(0.15, 200, 50, 400);
    expect(beam.phase).toBe("active");

    beam.update(0.5, 300, 50, 400);
    expect(beam.originX).toBe(300);
    expect(beam.beamX).not.toBe(beam.originX);
  });

  test("beamX equals originX during warmup (both track enemyX)", () => {
    const beam = createBeam();
    beam.activate(200, 50, 300);

    beam.update(0.1, 210, 55, 300);
    expect(beam.beamX).toBe(210);
    expect(beam.originX).toBe(210);
  });

  test("originX is reset to 0 on reset()", () => {
    const beam = createBeam();
    beam.activate(200, 50, 300);
    expect(beam.originX).toBe(200);

    beam.reset();
    expect(beam.originX).toBe(0);
  });
});

describe("EnemyLaserBeam collision interpolation", () => {
  test("interpolated beam X at player Y accounts for angled beam", () => {
    const beam = createBeam({ warmupDuration: 0.1, trackingSpeed: 40 });
    beam.activate(200, 0, 400);

    beam.update(0.15, 200, 0, 400);
    expect(beam.phase).toBe("active");

    beam.update(1.0, 100, 0, 400);

    const canvasHeight = 600;
    const playerCenterY = 300;

    const originX = beam.originX;
    const beamX = beam.beamX;
    const t = (playerCenterY - beam.originY) / (canvasHeight - beam.originY);
    const beamXAtPlayerY = originX + (beamX - originX) * t;

    expect(beamXAtPlayerY).not.toBe(beamX);
    expect(t).toBeCloseTo(0.5);
    expect(beamXAtPlayerY).toBeCloseTo((originX + beamX) / 2);
  });

  test("interpolation returns originX at the top of the beam", () => {
    const beam = createBeam({ warmupDuration: 0.1 });
    beam.activate(100, 50, 400);
    beam.update(0.15, 100, 50, 400);
    beam.update(0.5, 150, 50, 400);

    const canvasHeight = 600;
    const t = (50 - beam.originY) / (canvasHeight - beam.originY);
    const beamXAtTop = beam.originX + (beam.beamX - beam.originX) * t;

    expect(t).toBeCloseTo(0);
    expect(beamXAtTop).toBeCloseTo(beam.originX);
  });

  test("interpolation returns beamX at the bottom of the beam", () => {
    const beam = createBeam({ warmupDuration: 0.1 });
    beam.activate(100, 50, 400);
    beam.update(0.15, 100, 50, 400);
    beam.update(0.5, 150, 50, 400);

    const canvasHeight = 600;
    const t = (canvasHeight - beam.originY) / (canvasHeight - beam.originY);
    const beamXAtBottom = beam.originX + (beam.beamX - beam.originX) * t;

    expect(t).toBeCloseTo(1);
    expect(beamXAtBottom).toBeCloseTo(beam.beamX);
  });
});

describe("EnemyLaserBeam vertical beam when aligned", () => {
  test("beam is vertical when enemy is aligned with target (originX === beamX)", () => {
    const beam = createBeam({ warmupDuration: 0.1, trackingSpeed: 1000 });
    beam.activate(200, 50, 200);

    beam.update(0.15, 200, 50, 200);
    expect(beam.phase).toBe("active");

    beam.update(0.1, 200, 50, 200);
    expect(beam.originX).toBe(200);
    expect(beam.beamX).toBe(200);
  });
});

describe("EnemyLaserBeam reset on enemy destruction", () => {
  test("beam resets cleanly mid-fire", () => {
    const beam = createBeam({ warmupDuration: 0.1 });
    beam.activate(200, 50, 300);
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("active");

    beam.reset();
    expect(beam.phase).toBe("idle");
    expect(beam.originX).toBe(0);
    expect(beam.originY).toBe(0);
    expect(beam.beamX).toBe(0);
  });
});

// --- Rendering geometry tests for issue #676 ---

interface RecordedPath {
  points: { x: number; y: number }[];
  closed: boolean;
  filled: boolean;
}

function createMockContext(): CanvasRenderingContext2D & { _paths: RecordedPath[] } {
  const paths: RecordedPath[] = [];
  let current: { x: number; y: number }[] = [];

  return {
    _paths: paths,
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(() => { current = []; }),
    moveTo: jest.fn((x: number, y: number) => { current.push({ x, y }); }),
    lineTo: jest.fn((x: number, y: number) => { current.push({ x, y }); }),
    closePath: jest.fn(() => { paths.push({ points: [...current], closed: true, filled: false }); }),
    fill: jest.fn(() => { if (paths.length > 0) paths[paths.length - 1].filled = true; }),
    stroke: jest.fn(),
    arc: jest.fn(),
    set fillStyle(_v: string) {},
    set strokeStyle(_v: string) {},
    set lineWidth(_v: number) {},
  } as unknown as CanvasRenderingContext2D & { _paths: RecordedPath[] };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function edgeLengths(points: { x: number; y: number }[]): number[] {
  return [
    distance(points[0], points[1]),
    distance(points[1], points[2]),
    distance(points[2], points[3]),
    distance(points[3], points[0]),
  ];
}

describe("EnemyLaserBeam fillTrapezoid rendering geometry", () => {
  test("vertical beam renders as a rectangle with correct width", () => {
    const beam = createBeam({ warmupDuration: 0.1, beamWidth: 12 });
    beam.activate(200, 50, 200);
    beam.update(0.15, 200, 50, 200);
    expect(beam.phase).toBe("active");

    const ctx = createMockContext();
    beam.render(ctx, 600);

    expect(ctx._paths.length).toBe(3);

    const corePath = ctx._paths[2];
    const pts = corePath.points;
    expect(pts).toHaveLength(4);

    const topEdge = distance(pts[0], pts[1]);
    const bottomEdge = distance(pts[2], pts[3]);
    expect(topEdge).toBeCloseTo(bottomEdge);

    const midTopX = (pts[0].x + pts[1].x) / 2;
    expect(midTopX).toBeCloseTo(200);
  });

  test("angled beam has edges perpendicular to beam direction", () => {
    const beam = createBeam({ warmupDuration: 0.1, beamWidth: 12, trackingSpeed: 10000 });
    beam.activate(200, 50, 400);
    beam.update(0.15, 200, 50, 400);
    expect(beam.phase).toBe("active");

    beam.update(0.1, 200, 50, 400);

    const ctx = createMockContext();
    beam.render(ctx, 600);

    expect(ctx._paths.length).toBe(3);

    const beamPath = ctx._paths[1];
    const pts = beamPath.points;
    expect(pts).toHaveLength(4);

    const beamDirX = beam.beamX - beam.originX;
    const beamDirY = 600 - beam.originY;
    const len = Math.sqrt(beamDirX * beamDirX + beamDirY * beamDirY);

    const topEdgeDx = pts[1].x - pts[0].x;
    const topEdgeDy = pts[1].y - pts[0].y;

    const dot = topEdgeDx * beamDirX / len + topEdgeDy * beamDirY / len;
    expect(dot).toBeCloseTo(0, 5);
  });

  test("angled beam has uniform width (rotated rectangle, not skewed parallelogram)", () => {
    const beam = createBeam({ warmupDuration: 0.1, beamWidth: 12, trackingSpeed: 10000 });
    beam.activate(200, 50, 400);
    beam.update(0.15, 200, 50, 400);
    beam.update(0.1, 200, 50, 400);

    const ctx = createMockContext();
    beam.render(ctx, 600);

    const beamPath = ctx._paths[1];
    const pts = beamPath.points;

    const edges = edgeLengths(pts);
    const topEdge = edges[0];
    const bottomEdge = edges[2];
    const leftEdge = edges[3];
    const rightEdge = edges[1];

    expect(topEdge).toBeCloseTo(bottomEdge, 5);
    expect(leftEdge).toBeCloseTo(rightEdge, 5);
  });

  test("beam corners are offset by halfWidth perpendicular to center line", () => {
    const beam = createBeam({ warmupDuration: 0.1, beamWidth: 12, trackingSpeed: 10000 });
    beam.activate(200, 50, 400);
    beam.update(0.15, 200, 50, 400);
    beam.update(0.5, 200, 50, 400);

    const ctx = createMockContext();
    beam.render(ctx, 600);

    const beamPath = ctx._paths[1];
    const pts = beamPath.points;
    const halfWidth = 12 / 2;

    const topMidX = (pts[0].x + pts[1].x) / 2;
    const topMidY = (pts[0].y + pts[1].y) / 2;
    expect(topMidX).toBeCloseTo(beam.originX);
    expect(topMidY).toBeCloseTo(beam.originY);

    const topEdgeLen = distance(pts[0], pts[1]);
    expect(topEdgeLen).toBeCloseTo(halfWidth * 2, 3);
  });

  test("all three glow layers rotate consistently", () => {
    const beam = createBeam({ warmupDuration: 0.1, beamWidth: 12, trackingSpeed: 10000 });
    beam.activate(200, 50, 400);
    beam.update(0.15, 200, 50, 400);
    beam.update(0.1, 200, 50, 400);

    const ctx = createMockContext();
    beam.render(ctx, 600);

    expect(ctx._paths.length).toBe(3);

    const beamDirX = beam.beamX - beam.originX;
    const beamDirY = 600 - beam.originY;
    const len = Math.sqrt(beamDirX * beamDirX + beamDirY * beamDirY);

    for (const path of ctx._paths) {
      const pts = path.points;
      const topEdgeDx = pts[1].x - pts[0].x;
      const topEdgeDy = pts[1].y - pts[0].y;

      const dot = topEdgeDx * beamDirX / len + topEdgeDy * beamDirY / len;
      expect(dot).toBeCloseTo(0, 5);
    }
  });

  test("degenerate zero-length beam does not produce NaN", () => {
    const beam = createBeam({ warmupDuration: 0.1, beamWidth: 12 });
    beam.activate(200, 600, 200);
    beam.update(0.15, 200, 600, 200);
    expect(beam.phase).toBe("active");

    const ctx = createMockContext();
    beam.render(ctx, 600);

    for (const path of ctx._paths) {
      for (const pt of path.points) {
        expect(Number.isNaN(pt.x)).toBe(false);
        expect(Number.isNaN(pt.y)).toBe(false);
      }
    }
  });

  test("warning line during warmup is unaffected by fillTrapezoid changes", () => {
    const beam = createBeam({ warmupDuration: 1.0 });
    beam.activate(200, 50, 300);
    beam.update(0.1, 200, 50, 300);
    expect(beam.phase).toBe("warmup");

    const ctx = createMockContext();
    beam.render(ctx, 600);

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx._paths.length).toBe(0);
  });
});
