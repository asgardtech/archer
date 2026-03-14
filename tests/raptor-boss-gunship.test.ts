import { Enemy, isBossVariant } from "../src/games/raptor/entities/Enemy";
import { ENEMY_CONFIGS, RaptorLevelConfig } from "../src/games/raptor/types";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import { EnemySpawner } from "../src/games/raptor/systems/EnemySpawner";
import { LEVELS } from "../src/games/raptor/levels";

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

function makeBossLevel(bossType?: string, hitPoints = 80): RaptorLevelConfig {
  return {
    level: 99,
    name: "Test Level",
    waves: [
      { enemyVariant: "scout", count: 1, spawnDelay: 0.1, waveDelay: 0, formation: "random", speed: 100 },
    ],
    bossEnabled: true,
    bossConfig: {
      bossType: bossType as any,
      hitPoints,
      speed: 45,
      fireRate: 1.2,
      scoreValue: 600,
      appearsAfterWave: 1,
      weaponType: "spread",
    },
    autoFireRate: 8,
    powerUpDropChance: 0,
    skyGradient: ["#000000", "#111111"],
    starDensity: 0,
    enemyFireRateMultiplier: 1,
  };
}

// ════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("boss_gunship variant — configuration", () => {
  test("ENEMY_CONFIGS contains a boss_gunship entry", () => {
    expect(ENEMY_CONFIGS.boss_gunship).toBeDefined();
  });

  test("boss_gunship config has width 72", () => {
    expect(ENEMY_CONFIGS.boss_gunship.width).toBe(72);
  });

  test("boss_gunship config has height 60", () => {
    expect(ENEMY_CONFIGS.boss_gunship.height).toBe(60);
  });

  test("boss_gunship config has hitPoints 50", () => {
    expect(ENEMY_CONFIGS.boss_gunship.hitPoints).toBe(50);
  });

  test("boss_gunship config has speed 50", () => {
    expect(ENEMY_CONFIGS.boss_gunship.speed).toBe(50);
  });

  test("boss_gunship config has scoreValue 500", () => {
    expect(ENEMY_CONFIGS.boss_gunship.scoreValue).toBe(500);
  });

  test("boss_gunship config has fireRate 1.5", () => {
    expect(ENEMY_CONFIGS.boss_gunship.fireRate).toBe(1.5);
  });

  test("boss_gunship config has weaponType spread", () => {
    expect(ENEMY_CONFIGS.boss_gunship.weaponType).toBe("spread");
  });
});

// ════════════════════════════════════════════════════════════════
// isBossVariant
// ════════════════════════════════════════════════════════════════

describe("isBossVariant recognizes boss_gunship", () => {
  test("returns true for boss_gunship", () => {
    expect(isBossVariant("boss_gunship")).toBe(true);
  });

  test("returns true for standard boss", () => {
    expect(isBossVariant("boss")).toBe(true);
  });

  test("returns false for fighter", () => {
    expect(isBossVariant("fighter")).toBe(false);
  });

  test("returns false for gunship (non-boss variant)", () => {
    expect(isBossVariant("gunship")).toBe(false);
  });

  test("returns false for other non-boss variants", () => {
    const variants = ["scout", "bomber", "interceptor", "dart", "drone", "swarmer", "cruiser", "destroyer", "juggernaut", "stealth", "minelayer"] as const;
    for (const v of variants) {
      expect(isBossVariant(v)).toBe(false);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// CONSTRUCTION
// ════════════════════════════════════════════════════════════════

describe("boss_gunship variant — construction", () => {
  test("constructor sets correct values from config", () => {
    const e = new Enemy(400, -40, "boss_gunship");
    expect(e.hitPoints).toBeGreaterThanOrEqual(25);
    expect(e.maxHitPoints).toBeGreaterThanOrEqual(25);
    expect(e.width).toBe(72);
    expect(e.height).toBe(60);
    expect(e.weaponType).toBe("spread");
    expect(e.alive).toBe(true);
  });

  test("boss HP floor of 25 is enforced", () => {
    const e = new Enemy(400, -40, "boss_gunship", undefined, { hitPoints: 10 });
    expect(e.hitPoints).toBeGreaterThanOrEqual(25);
  });

  test("overrideConfig hitPoints are applied when above floor", () => {
    const e = new Enemy(400, -40, "boss_gunship", undefined, { hitPoints: 120 });
    expect(e.hitPoints).toBe(120);
    expect(e.maxHitPoints).toBe(120);
  });
});

// ════════════════════════════════════════════════════════════════
// MOVEMENT: ENTRY PHASE
// ════════════════════════════════════════════════════════════════

describe("boss_gunship variant — movement entry phase", () => {
  test("descends from above until parking at ~18% screen height", () => {
    const e = new Enemy(400, -40, "boss_gunship");
    const canvasHeight = 600;
    const parkY = canvasHeight * 0.18;

    for (let i = 0; i < 200; i++) {
      e.update(0.016, canvasHeight, 400, 800);
    }

    expect(e.pos.y).toBeCloseTo(parkY, 0);
  });

  test("Y position increases from starting position during entry", () => {
    const e = new Enemy(400, -40, "boss_gunship");
    e.update(0.5, 600, 400, 800);
    expect(e.pos.y).toBeGreaterThan(-40);
  });

  test("does not exceed ~20% of canvas height", () => {
    const e = new Enemy(400, -40, "boss_gunship");
    const canvasHeight = 600;

    for (let i = 0; i < 1000; i++) {
      e.update(0.016, canvasHeight, 400, 800);
    }

    expect(e.pos.y).toBeLessThanOrEqual(canvasHeight * 0.20);
  });
});

// ════════════════════════════════════════════════════════════════
// MOVEMENT: STRAFE PHASE
// ════════════════════════════════════════════════════════════════

describe("boss_gunship variant — movement strafe phase", () => {
  test("strafes laterally after parking (X changes significantly)", () => {
    const e = new Enemy(400, -40, "boss_gunship");
    let maxDisplacement = 0;

    for (let i = 0; i < 1000; i++) {
      e.update(0.016, 600, 400, 800);
      maxDisplacement = Math.max(maxDisplacement, Math.abs(e.pos.x - 400));
    }

    expect(maxDisplacement).toBeGreaterThan(50);
  });

  test("covers wide lateral range during extended updates", () => {
    const e = new Enemy(400, -40, "boss_gunship");
    let minX = Infinity;
    let maxX = -Infinity;

    for (let i = 0; i < 3000; i++) {
      e.update(0.016, 600, 400, 800);
      if (e.pos.y >= 600 * 0.17) {
        minX = Math.min(minX, e.pos.x);
        maxX = Math.max(maxX, e.pos.x);
      }
    }

    expect(minX).toBeLessThan(150);
    expect(maxX).toBeGreaterThan(650);
  });

  test("strafe range is at least 2x standard boss oscillation range", () => {
    const std = new Enemy(400, -40, "boss");
    const gun = new Enemy(400, -40, "boss_gunship");

    let stdMinX = Infinity, stdMaxX = -Infinity;
    let gunMinX = Infinity, gunMaxX = -Infinity;

    for (let i = 0; i < 3000; i++) {
      std.update(0.016, 600, 400, 800);
      gun.update(0.016, 600, 400, 800);

      stdMinX = Math.min(stdMinX, std.pos.x);
      stdMaxX = Math.max(stdMaxX, std.pos.x);
      gunMinX = Math.min(gunMinX, gun.pos.x);
      gunMaxX = Math.max(gunMaxX, gun.pos.x);
    }

    const stdRange = stdMaxX - stdMinX;
    const gunRange = gunMaxX - gunMinX;
    expect(gunRange).toBeGreaterThanOrEqual(stdRange * 2);
  });
});

// ════════════════════════════════════════════════════════════════
// MOVEMENT: STAYS IN BOUNDS
// ════════════════════════════════════════════════════════════════

describe("boss_gunship variant — stays within canvas bounds", () => {
  test("X never goes below 0 or above canvasWidth", () => {
    const e = new Enemy(400, -40, "boss_gunship");
    const canvasWidth = 800;

    for (let i = 0; i < 5000; i++) {
      e.update(0.016, 600, 400, canvasWidth);
      expect(e.pos.x).toBeGreaterThanOrEqual(0);
      expect(e.pos.x).toBeLessThanOrEqual(canvasWidth);
    }
  });

  test("is not culled off-screen (boss exemption)", () => {
    const e = new Enemy(400, 100, "boss_gunship");
    for (let i = 0; i < 5000; i++) {
      e.update(0.016, 600, 400, 800);
    }
    expect(e.alive).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// FIRING
// ════════════════════════════════════════════════════════════════

describe("boss_gunship variant — firing", () => {
  test("can fire when cooldown expires", () => {
    const e = new Enemy(400, 100, "boss_gunship");
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
    expect(e.weaponType).toBe("spread");
  });
});

// ════════════════════════════════════════════════════════════════
// RENDERING
// ════════════════════════════════════════════════════════════════

describe("boss_gunship variant — rendering", () => {
  test("renders without error using geometric fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "boss_gunship");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (polygon drawn)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "boss_gunship");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  test("HP bar renders (fillRect called at least 2 times)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "boss_gunship");
    e.render(ctx);
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test("sprite rendering includes HP bar", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "boss_gunship");
    const mockSprite = { width: 72, height: 60 } as HTMLImageElement;
    e.setSprite(mockSprite);
    e.render(ctx);
    expect(ctx.drawImage).toHaveBeenCalled();
    expect((ctx.fillRect as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test("hit flash renders white fill", () => {
    const ctx = createMockCtx();
    const fillStyles: string[] = [];
    Object.defineProperty(ctx, "fillStyle", {
      set(val: string) { fillStyles.push(val); },
      get() { return fillStyles[fillStyles.length - 1] || ""; },
    });
    const e = new Enemy(400, 100, "boss_gunship");
    e.hit(1);
    e.render(ctx);
    expect(fillStyles).toContain("#ffffff");
  });
});

// ════════════════════════════════════════════════════════════════
// SPAWNER WIRING
// ════════════════════════════════════════════════════════════════

describe("EnemySpawner — boss_gunship wiring", () => {
  test("spawns boss_gunship when bossType is gunship_commander", () => {
    const config = makeBossLevel("gunship_commander", 80);
    const spawner = new EnemySpawner();
    spawner.configure(config);

    for (let t = 0; t < 50; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.shouldSpawnBoss()).toBe(true);
    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss_gunship");
    expect(boss!.hitPoints).toBeGreaterThanOrEqual(80);
  });

  test("spawns standard boss when bossType is not set", () => {
    const config = makeBossLevel(undefined, 60);
    const spawner = new EnemySpawner();
    spawner.configure(config);

    for (let t = 0; t < 50; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss");
  });

  test("spawns standard boss for unknown bossType (carrier)", () => {
    const config = makeBossLevel("carrier", 60);
    const spawner = new EnemySpawner();
    spawner.configure(config);

    for (let t = 0; t < 50; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss");
  });

  test("spawns standard boss for bossType 'standard'", () => {
    const config = makeBossLevel("standard", 60);
    const spawner = new EnemySpawner();
    spawner.configure(config);

    for (let t = 0; t < 50; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss");
  });
});

// ════════════════════════════════════════════════════════════════
// ASSET MANIFEST
// ════════════════════════════════════════════════════════════════

describe("Asset manifest includes boss_gunship sprite key", () => {
  test("ASSET_MANIFEST contains enemy_boss_gunship", () => {
    expect(ASSET_MANIFEST.enemy_boss_gunship).toBe("assets/raptor/enemy_boss_gunship.png");
  });
});

// ════════════════════════════════════════════════════════════════
// REGRESSION — existing behavior unchanged
// ════════════════════════════════════════════════════════════════

describe("Regression — existing behavior unchanged", () => {
  test("existing level 1 boss still spawns as 'boss' variant", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss");
    expect(boss!.hitPoints).toBeGreaterThanOrEqual(25);
  });

  test("standard boss still uses sine wave oscillation (not wide strafe)", () => {
    const e = new Enemy(400, -40, "boss");
    let minX = Infinity, maxX = -Infinity;

    for (let i = 0; i < 3000; i++) {
      e.update(0.016, 600, 400, 800);
      minX = Math.min(minX, e.pos.x);
      maxX = Math.max(maxX, e.pos.x);
    }

    const range = maxX - minX;
    expect(range).toBeLessThan(200);
  });
});

// ════════════════════════════════════════════════════════════════
// DEFAULT canvasWidth fallback
// ════════════════════════════════════════════════════════════════

describe("boss_gunship — canvasWidth fallback", () => {
  test("works without canvasWidth parameter (falls back to 800)", () => {
    const e = new Enemy(400, -40, "boss_gunship");

    for (let i = 0; i < 3000; i++) {
      e.update(0.016, 600, 400);
    }

    expect(e.alive).toBe(true);
    expect(e.pos.x).toBeGreaterThanOrEqual(0);
    expect(e.pos.x).toBeLessThanOrEqual(800);
  });
});
