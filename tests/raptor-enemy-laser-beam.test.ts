/**
 * Tests for Issue #524: Enemy laser beam origin tracking and angled beam
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
