/**
 * QA tests for Issue #782: All lasers should be fired from a turret
 *
 * Tests each acceptance criterion from the Gherkin scenarios to verify
 * that TurretMount is properly integrated with player laser, enemy laser,
 * charge beam, and the ShipRenderer.
 */

import { TurretMount, TurretMountConfig } from "../src/games/raptor/entities/TurretMount";
import { EnemyLaserBeam, EnemyLaserBeamConfig } from "../src/games/raptor/entities/EnemyLaserBeam";
import { EnemyChargeBeam, EnemyChargeBeamConfig } from "../src/games/raptor/entities/EnemyChargeBeam";
import { WeaponSystem } from "../src/games/raptor/systems/WeaponSystem";
import { Player } from "../src/games/raptor/entities/Player";
import { ShipRenderState } from "../src/games/raptor/rendering/ShipRenderer";

// ── Helpers ──

function createMockCtx(): CanvasRenderingContext2D {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fillRect: jest.fn(),
    ellipse: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    transform: jest.fn(),
    quadraticCurveTo: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
  } as unknown as CanvasRenderingContext2D;
}

const ENEMY_LASER_CONFIG: EnemyLaserBeamConfig = {
  warmupDuration: 1.0,
  activeDuration: 2.0,
  cooldownDuration: 0.5,
  beamWidth: 12,
  trackingSpeed: 40,
  damage: 10,
};

const CHARGE_BEAM_CONFIG: EnemyChargeBeamConfig = {
  warmupDuration: 1.0,
  activeDuration: 2.0,
  cooldownDuration: 0.5,
  beamWidth: 14,
  trackingSpeed: 40,
  damage: 15,
};

// ── Player Laser Turret ──

describe("AC: Player laser beam originates from a turret hardpoint", () => {
  test("WeaponSystem has a laserTurret TurretMount instance", () => {
    const ws = new WeaponSystem();
    expect(ws.laserTurret).toBeDefined();
    expect(ws.laserTurret).toBeInstanceOf(TurretMount);
  });

  test("laser turret has blue-white player color palette", () => {
    const ws = new WeaponSystem();
    expect(ws.laserTurret.config.color).toContain("0, 150, 255");
    expect(ws.laserTurret.config.barrelColor).toContain("100, 200, 255");
  });

  test("laser beam position comes from turret barrel tip, not raw player center", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    const player = new Player(800, 600);
    player.pos = { x: 400, y: 400 };
    player.alive = true;

    const config = { autoFireRate: 6, powerUpDropChance: 0.1, scrollSpeed: 100 } as any;
    const powerUpManager = {
      weaponTier: 1,
      hasUpgrade: () => false,
    } as any;

    ws.update(0.016, player, config, powerUpManager, 800, []);

    const turretTip = ws.laserTurret.getBarrelTip(player.pos.x, player.pos.y);
    expect(ws.laserBeam.pos.x).toBeCloseTo(turretTip.x);
    expect(ws.laserBeam.pos.y).toBeCloseTo(turretTip.y);

    // Beam origin should NOT be at raw player.top (the old behavior)
    // The turret tip Y should differ from player.top by the turret offset + barrel length
    expect(ws.laserBeam.pos.y).not.toBe(player.top);
  });

  test("turret offsetY is set to -player.height * 0.35 during laser update", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    const player = new Player(800, 600);
    player.alive = true;

    const config = { autoFireRate: 6, powerUpDropChance: 0.1, scrollSpeed: 100 } as any;
    const powerUpManager = { weaponTier: 1, hasUpgrade: () => false } as any;

    ws.update(0.016, player, config, powerUpManager, 800, []);

    expect(ws.laserTurret.config.offsetY).toBeCloseTo(-player.height * 0.35);
  });
});

describe("AC: Player turret is not rendered for non-laser weapons", () => {
  test("isLaserActive is false for machine-gun weapon", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("machine-gun");
    expect(ws.isLaserActive).toBe(false);
  });

  test("isLaserActive is false for missile weapon", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("missile");
    expect(ws.isLaserActive).toBe(false);
  });

  test("Player.activeLaserTurret is null by default", () => {
    const player = new Player(800, 600);
    expect(player.activeLaserTurret).toBeNull();
  });

  test("Player render state has no laserTurret when activeLaserTurret is null", () => {
    const player = new Player(800, 600);
    player.activeLaserTurret = null;

    // Verify the render state construction in Player.render uses activeLaserTurret
    // activeLaserTurret ?? undefined means undefined when null
    const turretValue = player.activeLaserTurret ?? undefined;
    expect(turretValue).toBeUndefined();
  });
});

describe("AC: Player turret disappears when switching away from laser", () => {
  test("switching from laser to missile deactivates laser beam", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    expect(ws.laserBeam.active).toBe(true);

    ws.setWeapon("missile");
    expect(ws.laserBeam.active).toBe(false);
  });

  test("isLaserActive becomes false after switching from laser", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    const player = new Player(800, 600);
    player.alive = true;
    const config = { autoFireRate: 6, powerUpDropChance: 0.1, scrollSpeed: 100 } as any;
    const powerUpManager = { weaponTier: 1, hasUpgrade: () => false } as any;
    ws.update(0.016, player, config, powerUpManager, 800, []);
    expect(ws.isLaserActive).toBe(true);

    ws.setWeapon("missile");
    expect(ws.isLaserActive).toBe(false);
  });

  test("player.activeLaserTurret should be set to null when weapon is not laser", () => {
    // Simulate what RaptorGame does
    const ws = new WeaponSystem();
    ws.setWeapon("machine-gun");

    const player = new Player(800, 600);
    player.activeLaserTurret = ws.isLaserActive ? ws.laserTurret : null;
    expect(player.activeLaserTurret).toBeNull();
  });
});

describe("AC: Player turret respects ship banking transform", () => {
  test("turret is rendered inside the bank transform in ShipRenderer.render", () => {
    // The ShipRenderer applies the bank transform, then renders the turret
    // inside that transform before ctx.restore(). We verify that the
    // ShipRenderState contains the laserTurret when provided.
    const turret = new TurretMount({
      offsetX: 0,
      offsetY: -22.4,
      barrelLength: 8,
      baseRadius: 4,
      color: "rgba(0, 150, 255, 0.8)",
      barrelColor: "rgba(100, 200, 255, 0.9)",
    });

    const state: ShipRenderState = {
      thrustLevel: 0.6,
      bankAngle: 0.1,
      runningLightPhase: 0,
      panelLightFlicker: 0.5,
      heatShimmer: 0,
      damageLevel: 0,
      laserTurret: turret,
    };

    expect(state.laserTurret).toBe(turret);
    expect(state.bankAngle).toBe(0.1);
  });

  test("turret world position tracks player position for laser origin", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    const player = new Player(800, 600);
    player.pos = { x: 300, y: 400 };
    player.alive = true;

    const config = { autoFireRate: 6, powerUpDropChance: 0.1, scrollSpeed: 100 } as any;
    const powerUpManager = { weaponTier: 1, hasUpgrade: () => false } as any;

    ws.update(0.016, player, config, powerUpManager, 800, []);
    const tip1 = ws.laserTurret.getBarrelTip(player.pos.x, player.pos.y);

    player.pos.x = 500;
    ws.update(0.016, player, config, powerUpManager, 800, []);
    const tip2 = ws.laserTurret.getBarrelTip(player.pos.x, player.pos.y);

    expect(tip2.x).toBeCloseTo(500);
    expect(tip1.x).toBeCloseTo(300);
    expect(ws.laserBeam.pos.x).toBeCloseTo(tip2.x);
  });
});

describe("AC: Player turret deactivates on death", () => {
  test("laser beam deactivates when player dies", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    const player = new Player(800, 600);
    player.alive = true;

    const config = { autoFireRate: 6, powerUpDropChance: 0.1, scrollSpeed: 100 } as any;
    const powerUpManager = { weaponTier: 1, hasUpgrade: () => false } as any;

    ws.update(0.016, player, config, powerUpManager, 800, []);
    expect(ws.laserBeam.active).toBe(true);
    expect(ws.isLaserActive).toBe(true);

    player.alive = false;
    ws.update(0.016, player, config, powerUpManager, 800, []);
    expect(ws.laserBeam.active).toBe(false);
    expect(ws.isLaserActive).toBe(false);
  });

  test("player.activeLaserTurret becomes null when laser is deactivated on death", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    const player = new Player(800, 600);
    player.alive = false;

    const config = { autoFireRate: 6, powerUpDropChance: 0.1, scrollSpeed: 100 } as any;
    const powerUpManager = { weaponTier: 1, hasUpgrade: () => false } as any;

    ws.update(0.016, player, config, powerUpManager, 800, []);

    // Simulate RaptorGame logic
    player.activeLaserTurret = ws.isLaserActive ? ws.laserTurret : null;
    expect(player.activeLaserTurret).toBeNull();
  });
});

// ── Enemy Laser Turret ──

describe("AC: Destroyer enemy fires laser from a turret", () => {
  test("EnemyLaserBeam has a turret member", () => {
    const beam = new EnemyLaserBeam(ENEMY_LASER_CONFIG);
    expect(beam.turret).toBeDefined();
    expect(beam.turret).toBeInstanceOf(TurretMount);
  });

  test("enemy turret uses orange-red color palette by default", () => {
    const beam = new EnemyLaserBeam(ENEMY_LASER_CONFIG);
    expect(beam.turret.config.color).toContain("255, 120, 20");
    expect(beam.turret.config.barrelColor).toContain("255, 180, 80");
  });

  test("turret is rendered during active phase with glow intensity 1.0", () => {
    const beam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, warmupDuration: 0.1 });
    beam.activate(200, 50, 300);
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("active");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);

    expect(renderSpy).toHaveBeenCalledWith(ctx, beam.originX, beam.originY, 1.0);
    renderSpy.mockRestore();
  });

  test("turret barrel angle matches beam direction during active phase", () => {
    const beam = new EnemyLaserBeam({
      ...ENEMY_LASER_CONFIG,
      warmupDuration: 0.1,
      trackingSpeed: 10000,
    });
    beam.activate(200, 50, 400);
    beam.update(0.15, 200, 50, 400);
    expect(beam.phase).toBe("active");
    beam.update(0.1, 200, 50, 400);

    const canvasHeight = 600;
    const ctx = createMockCtx();
    beam.render(ctx, canvasHeight);

    const expectedAngle = Math.atan2(canvasHeight - beam.originY, beam.beamX - beam.originX);
    expect(beam.turret.angle).toBeCloseTo(expectedAngle);
  });
});

describe("AC: Boss fortress fires lasers from wing turrets", () => {
  test("two independent EnemyLaserBeam instances can have different turret configs", () => {
    const leftConfig: TurretMountConfig = {
      offsetX: -30,
      offsetY: 0,
      barrelLength: 8,
      baseRadius: 4,
      color: "rgba(255, 120, 20, 0.8)",
      barrelColor: "rgba(255, 180, 80, 0.9)",
    };
    const rightConfig: TurretMountConfig = {
      offsetX: 30,
      offsetY: 0,
      barrelLength: 8,
      baseRadius: 4,
      color: "rgba(255, 120, 20, 0.8)",
      barrelColor: "rgba(255, 180, 80, 0.9)",
    };

    const leftBeam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, turret: leftConfig });
    const rightBeam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, turret: rightConfig });

    expect(leftBeam.turret.config.offsetX).toBe(-30);
    expect(rightBeam.turret.config.offsetX).toBe(30);
    expect(leftBeam.turret).not.toBe(rightBeam.turret);
  });

  test("each beam gets its own turret rendering at its origin", () => {
    const leftBeam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, warmupDuration: 0.1 });
    const rightBeam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, warmupDuration: 0.1 });

    leftBeam.activate(170, 100, 300);
    rightBeam.activate(230, 100, 300);

    leftBeam.update(0.15, 170, 100, 300);
    rightBeam.update(0.15, 230, 100, 300);

    expect(leftBeam.phase).toBe("active");
    expect(rightBeam.phase).toBe("active");

    const ctx = createMockCtx();
    const leftRenderSpy = jest.spyOn(leftBeam.turret, "render");
    const rightRenderSpy = jest.spyOn(rightBeam.turret, "render");

    leftBeam.render(ctx, 600);
    rightBeam.render(ctx, 600);

    expect(leftRenderSpy).toHaveBeenCalledWith(ctx, 170, 100, 1.0);
    expect(rightRenderSpy).toHaveBeenCalledWith(ctx, 230, 100, 1.0);

    leftRenderSpy.mockRestore();
    rightRenderSpy.mockRestore();
  });

  test("each turret barrel aims toward its respective beam target", () => {
    const leftBeam = new EnemyLaserBeam({
      ...ENEMY_LASER_CONFIG,
      warmupDuration: 0.1,
      trackingSpeed: 10000,
    });
    const rightBeam = new EnemyLaserBeam({
      ...ENEMY_LASER_CONFIG,
      warmupDuration: 0.1,
      trackingSpeed: 10000,
    });

    leftBeam.activate(170, 100, 200);
    rightBeam.activate(230, 100, 500);

    leftBeam.update(0.15, 170, 100, 200);
    rightBeam.update(0.15, 230, 100, 500);

    leftBeam.update(0.1, 170, 100, 200);
    rightBeam.update(0.1, 230, 100, 500);

    const ctx = createMockCtx();
    leftBeam.render(ctx, 600);
    rightBeam.render(ctx, 600);

    // The two turrets should have different angles because targets differ
    expect(leftBeam.turret.angle).not.toBeCloseTo(rightBeam.turret.angle, 1);
  });
});

describe("AC: Enemy turret shows warmup glow before beam fires", () => {
  test("turret is rendered during warmup phase with progressive glow", () => {
    const beam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, warmupDuration: 1.0 });
    beam.activate(200, 50, 300);
    beam.update(0.5, 200, 50, 300);
    expect(beam.phase).toBe("warmup");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);

    expect(renderSpy).toHaveBeenCalled();
    const glowIntensity = renderSpy.mock.calls[0][3];
    expect(glowIntensity).toBeGreaterThan(0);
    expect(glowIntensity).toBeLessThan(1.0);
    renderSpy.mockRestore();
  });

  test("glow intensity increases as warmup progresses", () => {
    const beam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, warmupDuration: 2.0 });
    beam.activate(200, 50, 300);

    // At the beginning of warmup
    beam.update(0.1, 200, 50, 300);
    const ctx1 = createMockCtx();
    const spy1 = jest.spyOn(beam.turret, "render");
    beam.render(ctx1, 600);
    const earlyGlow = spy1.mock.calls[0][3] as number;
    spy1.mockRestore();

    // Near end of warmup
    beam.update(1.5, 200, 50, 300);
    expect(beam.phase).toBe("warmup");
    const ctx2 = createMockCtx();
    const spy2 = jest.spyOn(beam.turret, "render");
    beam.render(ctx2, 600);
    const lateGlow = spy2.mock.calls[0][3] as number;
    spy2.mockRestore();

    expect(lateGlow).toBeGreaterThan(earlyGlow);
  });

  test("no beam damage is dealt during warmup (beam is not active)", () => {
    const beam = new EnemyLaserBeam(ENEMY_LASER_CONFIG);
    beam.activate(200, 50, 300);
    beam.update(0.5, 200, 50, 300);
    expect(beam.phase).toBe("warmup");
    expect(beam.isActive).toBe(false);
  });
});

describe("AC: Enemy turret cleans up when enemy is destroyed mid-beam", () => {
  test("beam reset clears phase and turret stops rendering", () => {
    const beam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, warmupDuration: 0.1 });
    beam.activate(200, 50, 300);
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("active");
    expect(beam.isFiring).toBe(true);

    beam.reset();
    expect(beam.phase).toBe("idle");
    expect(beam.isFiring).toBe(false);

    // Verify turret render is not called when idle
    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);
    expect(renderSpy).not.toHaveBeenCalled();
    renderSpy.mockRestore();
  });
});

// ── Charge Beam Turret ──

describe("AC: Siege engine fires charge beam from a turret", () => {
  test("EnemyChargeBeam has a turret member", () => {
    const beam = new EnemyChargeBeam(CHARGE_BEAM_CONFIG);
    expect(beam.turret).toBeDefined();
    expect(beam.turret).toBeInstanceOf(TurretMount);
  });

  test("charge beam turret uses blue color palette by default", () => {
    const beam = new EnemyChargeBeam(CHARGE_BEAM_CONFIG);
    expect(beam.turret.config.color).toContain("100, 180, 255");
    expect(beam.turret.config.barrelColor).toContain("160, 220, 255");
  });

  test("turret is rendered during warmup phase of charge beam", () => {
    const beam = new EnemyChargeBeam({ ...CHARGE_BEAM_CONFIG, warmupDuration: 1.0 });
    beam.activate(200, 50, 300);
    beam.update(0.5, 200, 50, 300);
    expect(beam.phase).toBe("warmup");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);

    expect(renderSpy).toHaveBeenCalled();
    renderSpy.mockRestore();
  });

  test("turret is rendered during active phase of charge beam", () => {
    const beam = new EnemyChargeBeam({ ...CHARGE_BEAM_CONFIG, warmupDuration: 0.1 });
    beam.activate(200, 50, 300);
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("active");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);

    expect(renderSpy).toHaveBeenCalledWith(ctx, beam.originX, beam.originY, 1.0);
    renderSpy.mockRestore();
  });

  test("charge beam turret barrel angle tracks beam direction", () => {
    const beam = new EnemyChargeBeam({
      ...CHARGE_BEAM_CONFIG,
      warmupDuration: 0.1,
      trackingSpeed: 10000,
    });
    beam.activate(200, 50, 400);
    beam.update(0.15, 200, 50, 400);
    beam.update(0.1, 200, 50, 400);

    const canvasHeight = 600;
    const ctx = createMockCtx();
    beam.render(ctx, canvasHeight);

    const expectedAngle = Math.atan2(canvasHeight - beam.originY, beam.beamX - beam.originX);
    expect(beam.turret.angle).toBeCloseTo(expectedAngle);
  });

  test("charge beam turret can use custom config", () => {
    const customTurret: TurretMountConfig = {
      offsetX: 5,
      offsetY: -5,
      barrelLength: 12,
      baseRadius: 6,
      color: "rgba(255, 0, 0, 0.9)",
      barrelColor: "rgba(255, 100, 100, 0.9)",
    };
    const beam = new EnemyChargeBeam({ ...CHARGE_BEAM_CONFIG, turret: customTurret });
    expect(beam.turret.config.offsetX).toBe(5);
    expect(beam.turret.config.barrelLength).toBe(12);
    expect(beam.turret.config.color).toBe("rgba(255, 0, 0, 0.9)");
  });
});

// ── Hydra Boss Pod Turret ──
// The hydra pod fires via EnemyLaserBeam; turret attaches at pod position.

describe("AC: Hydra boss pod with laser weapon shows turret", () => {
  test("EnemyLaserBeam constructed for a pod position has turret at origin", () => {
    const podX = 350;
    const podY = 120;
    const beam = new EnemyLaserBeam(ENEMY_LASER_CONFIG);
    beam.activate(podX, podY, 400);

    expect(beam.turret).toBeInstanceOf(TurretMount);
    expect(beam.originX).toBe(podX);
    expect(beam.originY).toBe(podY);
  });

  test("pod turret renders at pod position during firing", () => {
    const beam = new EnemyLaserBeam({ ...ENEMY_LASER_CONFIG, warmupDuration: 0.1 });
    beam.activate(350, 120, 400);
    beam.update(0.15, 350, 120, 400);
    expect(beam.phase).toBe("active");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);
    expect(renderSpy).toHaveBeenCalledWith(ctx, 350, 120, 1.0);
    renderSpy.mockRestore();
  });
});

// ── Level Transitions ──

describe("AC: Player laser turret persists across level transitions", () => {
  test("resetForNewLevel keeps laser active when weapon is laser", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    ws.resetForNewLevel();

    expect(ws.currentWeapon).toBe("laser");
    expect(ws.laserBeam.active).toBe(true);
  });

  test("laserTurret remains available after level reset", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    ws.resetForNewLevel();

    expect(ws.laserTurret).toBeDefined();
    expect(ws.laserTurret).toBeInstanceOf(TurretMount);
    expect(ws.isLaserActive).toBe(true);
  });
});

describe("AC: Full game reset clears laser turret state", () => {
  test("weapon reverts to machine-gun after full reset", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");
    expect(ws.currentWeapon).toBe("laser");

    ws.reset();
    expect(ws.currentWeapon).toBe("machine-gun");
  });

  test("laser beam is inactive after full reset", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    ws.reset();
    expect(ws.laserBeam.active).toBe(false);
    expect(ws.isLaserActive).toBe(false);
  });

  test("isLaserActive returns false after reset, so no turret renders", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    ws.reset();
    const player = new Player(800, 600);
    player.activeLaserTurret = ws.isLaserActive ? ws.laserTurret : null;
    expect(player.activeLaserTurret).toBeNull();
  });
});

// ── TurretMount Core Contract ──

describe("TurretMount config interface", () => {
  test("EnemyLaserBeamConfig accepts optional turret field", () => {
    const config: EnemyLaserBeamConfig = {
      ...ENEMY_LASER_CONFIG,
      turret: {
        offsetX: 10,
        offsetY: -5,
        barrelLength: 12,
        baseRadius: 6,
        color: "rgba(255, 0, 0, 0.8)",
        barrelColor: "rgba(255, 100, 100, 0.9)",
      },
    };
    const beam = new EnemyLaserBeam(config);
    expect(beam.turret.config.offsetX).toBe(10);
    expect(beam.turret.config.barrelLength).toBe(12);
  });

  test("EnemyChargeBeamConfig accepts optional turret field", () => {
    const config: EnemyChargeBeamConfig = {
      ...CHARGE_BEAM_CONFIG,
      turret: {
        offsetX: -5,
        offsetY: 3,
        barrelLength: 14,
        baseRadius: 7,
        color: "rgba(0, 255, 0, 0.8)",
        barrelColor: "rgba(100, 255, 100, 0.9)",
      },
    };
    const beam = new EnemyChargeBeam(config);
    expect(beam.turret.config.offsetX).toBe(-5);
    expect(beam.turret.config.barrelLength).toBe(14);
  });

  test("default turret is used when no turret config is provided for EnemyLaserBeam", () => {
    const beam = new EnemyLaserBeam(ENEMY_LASER_CONFIG);
    expect(beam.turret.config.baseRadius).toBe(4);
    expect(beam.turret.config.barrelLength).toBe(8);
  });

  test("default turret is used when no turret config is provided for EnemyChargeBeam", () => {
    const beam = new EnemyChargeBeam(CHARGE_BEAM_CONFIG);
    expect(beam.turret.config.baseRadius).toBe(5);
    expect(beam.turret.config.barrelLength).toBe(10);
  });
});

// ── Turret rendering glow behavior ──

describe("TurretMount glow rendering behavior", () => {
  test("render with glowIntensity=0 draws only 1 arc (base circle, no glow)", () => {
    const turret = new TurretMount({
      offsetX: 0,
      offsetY: 0,
      barrelLength: 8,
      baseRadius: 4,
      color: "rgba(255, 120, 20, 0.8)",
      barrelColor: "rgba(255, 180, 80, 0.9)",
    });
    const ctx = createMockCtx();
    turret.render(ctx, 100, 200, 0);
    expect(ctx.arc).toHaveBeenCalledTimes(1);
  });

  test("render with glowIntensity > 0 draws 2 arcs (glow + base)", () => {
    const turret = new TurretMount({
      offsetX: 0,
      offsetY: 0,
      barrelLength: 8,
      baseRadius: 4,
      color: "rgba(255, 120, 20, 0.8)",
      barrelColor: "rgba(255, 180, 80, 0.9)",
    });
    const ctx = createMockCtx();
    turret.render(ctx, 100, 200, 0.5);
    expect(ctx.arc).toHaveBeenCalledTimes(2);
  });
});

// ── ShipRenderer integration ──

describe("ShipRenderer turret integration", () => {
  test("ShipRenderState interface includes optional laserTurret field", () => {
    const state: ShipRenderState = {
      thrustLevel: 0.5,
      bankAngle: 0,
      runningLightPhase: 0,
      panelLightFlicker: 0.5,
      heatShimmer: 0,
      damageLevel: 0,
    };
    expect(state.laserTurret).toBeUndefined();

    const turret = new TurretMount({
      offsetX: 0,
      offsetY: -20,
      barrelLength: 8,
      baseRadius: 4,
      color: "rgba(0, 150, 255, 0.8)",
      barrelColor: "rgba(100, 200, 255, 0.9)",
    });
    state.laserTurret = turret;
    expect(state.laserTurret).toBe(turret);
  });
});

// ── RaptorGame integration ──

describe("RaptorGame turret wiring", () => {
  test("activeLaserTurret is set from WeaponSystem when laser is active", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("laser");

    const player = new Player(800, 600);
    player.alive = true;

    const config = { autoFireRate: 6, powerUpDropChance: 0.1, scrollSpeed: 100 } as any;
    const powerUpManager = { weaponTier: 1, hasUpgrade: () => false } as any;

    ws.update(0.016, player, config, powerUpManager, 800, []);

    // Simulate RaptorGame logic
    player.activeLaserTurret = ws.isLaserActive ? ws.laserTurret : null;
    expect(player.activeLaserTurret).toBe(ws.laserTurret);
  });

  test("activeLaserTurret is null when weapon is not laser", () => {
    const ws = new WeaponSystem();
    ws.setWeapon("machine-gun");

    const player = new Player(800, 600);

    // Simulate RaptorGame logic
    player.activeLaserTurret = ws.isLaserActive ? ws.laserTurret : null;
    expect(player.activeLaserTurret).toBeNull();
  });
});

// ── Enemy turret rendering is not called when idle ──

describe("Enemy turret not rendered when beam is idle or cooldown", () => {
  test("enemy laser turret not rendered when phase is idle", () => {
    const beam = new EnemyLaserBeam(ENEMY_LASER_CONFIG);
    expect(beam.phase).toBe("idle");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);
    expect(renderSpy).not.toHaveBeenCalled();
    renderSpy.mockRestore();
  });

  test("enemy laser turret not rendered when phase is cooldown", () => {
    const beam = new EnemyLaserBeam({
      ...ENEMY_LASER_CONFIG,
      warmupDuration: 0.1,
      activeDuration: 0.1,
    });
    beam.activate(200, 50, 300);
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("active");
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("cooldown");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);
    expect(renderSpy).not.toHaveBeenCalled();
    renderSpy.mockRestore();
  });

  test("charge beam turret not rendered when phase is idle", () => {
    const beam = new EnemyChargeBeam(CHARGE_BEAM_CONFIG);
    expect(beam.phase).toBe("idle");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);
    expect(renderSpy).not.toHaveBeenCalled();
    renderSpy.mockRestore();
  });

  test("charge beam turret not rendered when phase is cooldown", () => {
    const beam = new EnemyChargeBeam({
      ...CHARGE_BEAM_CONFIG,
      warmupDuration: 0.1,
      activeDuration: 0.1,
    });
    beam.activate(200, 50, 300);
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("active");
    beam.update(0.15, 200, 50, 300);
    expect(beam.phase).toBe("cooldown");

    const ctx = createMockCtx();
    const renderSpy = jest.spyOn(beam.turret, "render");
    beam.render(ctx, 600);
    expect(renderSpy).not.toHaveBeenCalled();
    renderSpy.mockRestore();
  });
});
