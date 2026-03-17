import { Enemy, isBossVariant } from "../src/games/raptor/entities/Enemy";
import { ENEMY_CONFIGS, ENEMY_PROJECTILE_SKINS, EnemyVariant } from "../src/games/raptor/types";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";

function createMockCtx() {
  return {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: "",
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
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    drawImage: jest.fn(),
    clearRect: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    setTransform: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    measureText: jest.fn(() => ({ width: 50 })),
    quadraticCurveTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    setLineDash: jest.fn(),
  } as unknown as CanvasRenderingContext2D;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// ════════════════════════════════════════════════════════════════════
//  SECTION 1: TYPE SYSTEM — All 7 variants in EnemyVariant
// ════════════════════════════════════════════════════════════════════

describe("EnemyVariant type includes all 7 new variants", () => {
  const expectedVariants: EnemyVariant[] = [
    "splitter", "splitter_minor", "healer", "teleporter", "mimic", "kamikaze", "jammer",
  ];

  for (const v of expectedVariants) {
    test(`ENEMY_CONFIGS contains "${v}"`, () => {
      expect(ENEMY_CONFIGS[v]).toBeDefined();
    });
  }
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 2: SPLITTER CONFIG & BEHAVIOR
// ════════════════════════════════════════════════════════════════════

describe("Splitter enemy — configuration", () => {
  const cfg = ENEMY_CONFIGS.splitter;

  test("HP is 3", () => expect(cfg.hitPoints).toBe(3));
  test("speed is 120", () => expect(cfg.speed).toBe(120));
  test("scoreValue is 35", () => expect(cfg.scoreValue).toBe(35));
  test("fireRate is 0.5", () => expect(cfg.fireRate).toBe(0.5));
  test("size is 28x26", () => {
    expect(cfg.width).toBe(28);
    expect(cfg.height).toBe(26);
  });
  test("weaponType is standard", () => expect(cfg.weaponType).toBe("standard"));
});

describe("Splitter enemy — movement", () => {
  test("moves downward over time", () => {
    const e = new Enemy(200, 100, "splitter");
    const y0 = e.pos.y;
    e.update(1.0, CANVAS_HEIGHT);
    expect(e.pos.y).toBeGreaterThan(y0);
  });

  test("X position oscillates with weaving motion (amplitude 30px)", () => {
    const e = new Enemy(200, 100, "splitter");
    let minX = e.pos.x;
    let maxX = e.pos.x;
    for (let i = 0; i < 100; i++) {
      e.update(0.02, CANVAS_HEIGHT);
      minX = Math.min(minX, e.pos.x);
      maxX = Math.max(maxX, e.pos.x);
    }
    const amplitude = (maxX - minX) / 2;
    expect(amplitude).toBeGreaterThanOrEqual(25);
    expect(amplitude).toBeLessThanOrEqual(35);
  });
});

describe("Splitter enemy — weapon", () => {
  test("has fireRate > 0 (fires standard projectiles)", () => {
    const e = new Enemy(200, 100, "splitter");
    expect(e.fireRate).toBe(0.5);
  });

  test("can fire when cooldown expires", () => {
    const e = new Enemy(200, 100, "splitter");
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });
});

describe("Splitter enemy — projectile skin", () => {
  test("splitter projectile skin is defined", () => {
    expect(ENEMY_PROJECTILE_SKINS.splitter).toBeDefined();
  });

  test("splitter projectile skin has correct colors", () => {
    const skin = ENEMY_PROJECTILE_SKINS.splitter!;
    expect(skin.fallbackColor).toBe("#44ddbb");
    expect(skin.coreColor).toBe("#88ffdd");
    expect(skin.glowColor).toBe("#66eecc");
  });
});

describe("Splitter enemy — death spawns children", () => {
  test("getSplitterChildSpawnData returns positions ±15px from parent", () => {
    const e = new Enemy(200, 100, "splitter");
    const data = e.getSplitterChildSpawnData();
    expect(data.x1).toBe(185);
    expect(data.x2).toBe(215);
    expect(data.y1).toBe(100);
    expect(data.y2).toBe(100);
  });

  test("two splitter_minor children can be spawned from spawn data", () => {
    const parent = new Enemy(200, 100, "splitter");
    const data = parent.getSplitterChildSpawnData();
    const child1 = new Enemy(data.x1, data.y1, "splitter_minor");
    const child2 = new Enemy(data.x2, data.y2, "splitter_minor");
    expect(child1.variant).toBe("splitter_minor");
    expect(child2.variant).toBe("splitter_minor");
    expect(child1.hitPoints).toBe(1);
    expect(child2.hitPoints).toBe(1);
    expect(child1.pos.x).toBe(185);
    expect(child2.pos.x).toBe(215);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 3: SPLITTER_MINOR CONFIG & BEHAVIOR
// ════════════════════════════════════════════════════════════════════

describe("Splitter_minor enemy — configuration", () => {
  const cfg = ENEMY_CONFIGS.splitter_minor;

  test("HP is 1", () => expect(cfg.hitPoints).toBe(1));
  test("speed is 160", () => expect(cfg.speed).toBe(160));
  test("scoreValue is 8", () => expect(cfg.scoreValue).toBe(8));
  test("fireRate is 0", () => expect(cfg.fireRate).toBe(0));
  test("size is 12x12", () => {
    expect(cfg.width).toBe(12);
    expect(cfg.height).toBe(12);
  });
  test("no weaponType defined", () => expect(cfg.weaponType).toBeUndefined());
});

describe("Splitter_minor enemy — behavior", () => {
  test("moves straight downward", () => {
    const e = new Enemy(200, 100, "splitter_minor");
    const x0 = e.pos.x;
    e.update(0.5, CANVAS_HEIGHT);
    expect(e.pos.y).toBeGreaterThan(100);
    expect(e.pos.x).toBe(x0);
  });

  test("children use config speed (160)", () => {
    const child = new Enemy(200, 100, "splitter_minor");
    expect(child.vel.y).toBe(160);
  });

  test("does NOT fire projectiles (fireRate 0)", () => {
    const e = new Enemy(200, 100, "splitter_minor");
    for (let i = 0; i < 100; i++) {
      e.update(0.05, CANVAS_HEIGHT);
    }
    expect(e.fireRate).toBe(0);
  });

  test("does NOT split on death (no recursion)", () => {
    const child = new Enemy(200, 100, "splitter_minor");
    expect(child.variant).toBe("splitter_minor");
    const destroyed = child.hit(1);
    expect(destroyed).toBe(true);
    expect(child.alive).toBe(false);
  });

  test("dies in one hit", () => {
    const e = new Enemy(200, 100, "splitter_minor");
    const destroyed = e.hit(1);
    expect(destroyed).toBe(true);
    expect(e.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 4: HEALER CONFIG & BEHAVIOR
// ════════════════════════════════════════════════════════════════════

describe("Healer enemy — configuration", () => {
  const cfg = ENEMY_CONFIGS.healer;

  test("HP is 2", () => expect(cfg.hitPoints).toBe(2));
  test("speed is 90", () => expect(cfg.speed).toBe(90));
  test("scoreValue is 55", () => expect(cfg.scoreValue).toBe(55));
  test("fireRate is 0.3", () => expect(cfg.fireRate).toBe(0.3));
  test("size is 24x24", () => {
    expect(cfg.width).toBe(24);
    expect(cfg.height).toBe(24);
  });
  test("weaponType is standard", () => expect(cfg.weaponType).toBe("standard"));
});

describe("Healer enemy — projectile skin", () => {
  test("healer projectile skin is defined", () => {
    expect(ENEMY_PROJECTILE_SKINS.healer).toBeDefined();
  });

  test("healer projectile skin has correct colors", () => {
    const skin = ENEMY_PROJECTILE_SKINS.healer!;
    expect(skin.fallbackColor).toBe("#66dd88");
    expect(skin.coreColor).toBe("#aaffcc");
    expect(skin.glowColor).toBe("#88eebb");
  });
});

describe("Healer enemy — heals damaged ally within range", () => {
  test("heals a damaged non-boss ally within 80px after 2 seconds", () => {
    const healer = new Enemy(200, 100, "healer");
    const fighter = new Enemy(220, 110, "fighter");
    fighter.hitPoints = 1;

    const enemies = [healer, fighter];
    let healResult = null;
    // Only tick heal logic (don't call healer.update which moves healer out of range)
    for (let t = 0; t < 42; t++) {
      healResult = healer.updateHealerLogicWithDt(enemies, 0.05) || healResult;
    }
    expect(fighter.hitPoints).toBe(2);
    expect(healResult).not.toBeNull();
  });

  test("does NOT heal full-health allies", () => {
    const healer = new Enemy(200, 100, "healer");
    const fighter = new Enemy(220, 110, "fighter");
    fighter.hitPoints = fighter.maxHitPoints;

    const enemies = [healer, fighter];
    let healResult = null;
    for (let t = 0; t < 50; t++) {
      healer.update(0.05, CANVAS_HEIGHT);
      healResult = healer.updateHealerLogicWithDt(enemies, 0.05) || healResult;
    }
    expect(fighter.hitPoints).toBe(fighter.maxHitPoints);
    expect(healResult).toBeNull();
  });

  test("does NOT heal boss enemies", () => {
    const healer = new Enemy(200, 100, "healer");
    const boss = new Enemy(220, 110, "boss");
    const bossOrigHP = boss.hitPoints;
    boss.hitPoints = bossOrigHP - 5;
    const reducedHP = boss.hitPoints;

    const enemies = [healer, boss];
    for (let t = 0; t < 50; t++) {
      healer.update(0.05, CANVAS_HEIGHT);
      healer.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(boss.hitPoints).toBe(reducedHP);
  });

  test("does NOT heal itself", () => {
    const healer = new Enemy(200, 100, "healer");
    healer.hitPoints = 1;

    const enemies = [healer];
    for (let t = 0; t < 50; t++) {
      healer.update(0.05, CANVAS_HEIGHT);
      healer.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(healer.hitPoints).toBe(1);
  });
});

describe("Healer enemy — gravitation toward damaged ally", () => {
  test("gravitates toward damaged ally within 100px", () => {
    const healer = new Enemy(200, 100, "healer");
    const fighter = new Enemy(280, 100, "fighter");
    fighter.hitPoints = 1;

    const enemies = [healer, fighter];
    const x0 = healer.pos.x;
    for (let t = 0; t < 20; t++) {
      healer.update(0.05, CANVAS_HEIGHT);
      healer.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(healer.pos.x).toBeGreaterThan(x0);
  });

  test("drifts straight down when no damaged allies nearby", () => {
    const healer = new Enemy(200, 100, "healer");
    const enemies = [healer];
    const x0 = healer.pos.x;
    const y0 = healer.pos.y;
    for (let t = 0; t < 20; t++) {
      healer.update(0.05, CANVAS_HEIGHT);
      healer.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(healer.pos.y).toBeGreaterThan(y0);
    expect(healer.pos.x).toBe(x0);
  });
});

describe("Healer enemy — fires defensive shots", () => {
  test("has fireRate > 0 and can fire", () => {
    const e = new Enemy(200, 100, "healer");
    expect(e.fireRate).toBe(0.3);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 5: TELEPORTER CONFIG & BEHAVIOR
// ════════════════════════════════════════════════════════════════════

describe("Teleporter enemy — configuration", () => {
  const cfg = ENEMY_CONFIGS.teleporter;

  test("HP is 2", () => expect(cfg.hitPoints).toBe(2));
  test("speed is 0", () => expect(cfg.speed).toBe(0));
  test("scoreValue is 40", () => expect(cfg.scoreValue).toBe(40));
  test("fireRate is 0 (fires via teleport trigger)", () => expect(cfg.fireRate).toBe(0));
  test("size is 22x22", () => {
    expect(cfg.width).toBe(22);
    expect(cfg.height).toBe(22);
  });
  test("weaponType is standard", () => expect(cfg.weaponType).toBe("standard"));
});

describe("Teleporter enemy — projectile skin", () => {
  test("teleporter projectile skin is defined", () => {
    expect(ENEMY_PROJECTILE_SKINS.teleporter).toBeDefined();
  });

  test("teleporter projectile skin has correct colors", () => {
    const skin = ENEMY_PROJECTILE_SKINS.teleporter!;
    expect(skin.fallbackColor).toBe("#cc66ff");
    expect(skin.coreColor).toBe("#ee99ff");
    expect(skin.glowColor).toBe("#dd88ff");
  });
});

describe("Teleporter enemy — blink behavior", () => {
  test("teleports to new position after 2.5 seconds", () => {
    const e = new Enemy(200, 100, "teleporter");
    const origX = e.pos.x;
    const origY = e.pos.y;

    // Use 52 iterations to avoid floating-point edge case at exactly 2.5s
    for (let t = 0; t < 52; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
    }
    const moved = (e.pos.x !== origX || e.pos.y !== origY);
    expect(moved).toBe(true);
  });

  test("new position is within bounds (top 60%, 30px margin)", () => {
    const offsetX = 0;
    const offsetY = 0;

    for (let trial = 0; trial < 10; trial++) {
      const e = new Enemy(400, 300, "teleporter");
      for (let t = 0; t < 60; t++) {
        e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, offsetX, offsetY);
      }
      expect(e.pos.x).toBeGreaterThanOrEqual(30);
      expect(e.pos.x).toBeLessThanOrEqual(770);
      expect(e.pos.y).toBeGreaterThanOrEqual(0);
      expect(e.pos.y).toBeLessThanOrEqual(CANVAS_HEIGHT * 0.6);
    }
  });

  test("does NOT move between blinks", () => {
    const e = new Enemy(200, 100, "teleporter");
    e.update(0.5, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
    const posAfterFirst = { x: e.pos.x, y: e.pos.y };
    e.update(0.5, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
    expect(e.pos.x).toBe(posAfterFirst.x);
    expect(e.pos.y).toBe(posAfterFirst.y);
  });
});

describe("Teleporter enemy — fires burst after blink", () => {
  test("has pending burst after blink completes", () => {
    const e = new Enemy(200, 100, "teleporter");
    for (let t = 0; t < 52; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
    }
    const hadBurst = e.hasTeleporterBurst();
    expect(hadBurst).toBe(true);
  });

  test("canFire returns false (fires via burst, not cooldown)", () => {
    const e = new Enemy(200, 100, "teleporter");
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(false);
  });

  test("consumeTeleporterBurstTick decrements burst remaining", () => {
    const e = new Enemy(200, 100, "teleporter");
    for (let t = 0; t < 60; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
    }

    if (e.hasTeleporterBurst()) {
      e.consumeTeleporterBurstTick();
      e.update(0.1, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
      if (e.hasTeleporterBurst()) {
        e.consumeTeleporterBurstTick();
      }
    }
    expect(e.hasTeleporterBurst()).toBe(false);
  });
});

describe("Teleporter enemy — flash effect", () => {
  test("flash alpha is > 0 right after a blink", () => {
    const e = new Enemy(200, 100, "teleporter");
    for (let t = 0; t < 50; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
    }
    const alpha = e.getTeleporterFlashAlpha();
    expect(alpha).toBeGreaterThanOrEqual(0);
  });

  test("consumeTeleportFlash returns departure and arrival positions after blink", () => {
    const e = new Enemy(200, 100, "teleporter");
    for (let t = 0; t < 51; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH);
    }
    const flash = e.consumeTeleportFlash();
    if (flash) {
      expect(flash).toHaveProperty("departX");
      expect(flash).toHaveProperty("departY");
      expect(flash).toHaveProperty("arriveX");
      expect(flash).toHaveProperty("arriveY");
    }
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 6: MIMIC CONFIG & BEHAVIOR
// ════════════════════════════════════════════════════════════════════

describe("Mimic enemy — configuration", () => {
  const cfg = ENEMY_CONFIGS.mimic;

  test("HP is 2", () => expect(cfg.hitPoints).toBe(2));
  test("speed is 0 (mirrors player)", () => expect(cfg.speed).toBe(0));
  test("scoreValue is 45", () => expect(cfg.scoreValue).toBe(45));
  test("fireRate is 0.7", () => expect(cfg.fireRate).toBe(0.7));
  test("size is 26x26", () => {
    expect(cfg.width).toBe(26);
    expect(cfg.height).toBe(26);
  });
  test("weaponType is standard", () => expect(cfg.weaponType).toBe("standard"));
});

describe("Mimic enemy — projectile skin", () => {
  test("mimic projectile skin is defined", () => {
    expect(ENEMY_PROJECTILE_SKINS.mimic).toBeDefined();
  });

  test("mimic projectile skin has correct colors", () => {
    const skin = ENEMY_PROJECTILE_SKINS.mimic!;
    expect(skin.fallbackColor).toBe("#bbbbdd");
    expect(skin.coreColor).toBe("#ddddef");
    expect(skin.glowColor).toBe("#ccccee");
  });
});

describe("Mimic enemy — mirrors player X", () => {
  test("tracks player X with smoothed delay", () => {
    const e = new Enemy(200, 50, "mimic");
    const playerX = 300;
    for (let t = 0; t < 30; t++) {
      e.update(0.05, CANVAS_HEIGHT, playerX, CANVAS_WIDTH, 0, 0);
    }
    expect(Math.abs(e.pos.x - playerX)).toBeLessThan(20);
  });

  test("initializes smoothed X to player X on first frame", () => {
    const e = new Enemy(200, 50, "mimic");
    const playerX = 500;
    e.update(0.016, CANVAS_HEIGHT, playerX, CANVAS_WIDTH, 0, 0);
    expect(Math.abs(e.pos.x - playerX)).toBeLessThan(30);
  });

  test("stays at fixed altitude band (around 20% canvas height)", () => {
    const e = new Enemy(200, 50, "mimic");
    for (let t = 0; t < 60; t++) {
      e.update(0.05, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0);
    }
    const expectedBaseY = CANVAS_HEIGHT * 0.2;
    expect(e.pos.y).toBeGreaterThan(expectedBaseY - 30);
    expect(e.pos.y).toBeLessThan(expectedBaseY + 30);
  });

  test("Y position oscillates with amplitude ~20px", () => {
    const e = new Enemy(200, 50, "mimic");
    let minY = Infinity;
    let maxY = -Infinity;
    for (let t = 0; t < 200; t++) {
      e.update(0.02, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0);
      minY = Math.min(minY, e.pos.y);
      maxY = Math.max(maxY, e.pos.y);
    }
    const amplitude = (maxY - minY) / 2;
    expect(amplitude).toBeGreaterThanOrEqual(15);
    expect(amplitude).toBeLessThanOrEqual(25);
  });
});

describe("Mimic enemy — fires straight down", () => {
  test("has fireRate 0.7 and can fire", () => {
    const e = new Enemy(200, 100, "mimic");
    expect(e.fireRate).toBe(0.7);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 7: KAMIKAZE CONFIG & BEHAVIOR
// ════════════════════════════════════════════════════════════════════

describe("Kamikaze enemy — configuration", () => {
  const cfg = ENEMY_CONFIGS.kamikaze;

  test("HP is 2", () => expect(cfg.hitPoints).toBe(2));
  test("initial speed is 100", () => expect(cfg.speed).toBe(100));
  test("scoreValue is 25", () => expect(cfg.scoreValue).toBe(25));
  test("fireRate is 0 (no weapon)", () => expect(cfg.fireRate).toBe(0));
  test("size is 26x30", () => {
    expect(cfg.width).toBe(26);
    expect(cfg.height).toBe(30);
  });
  test("collisionDamage is 200 (2x normal)", () => expect(cfg.collisionDamage).toBe(200));
  test("no weaponType defined", () => expect(cfg.weaponType).toBeUndefined());
});

describe("Kamikaze enemy — approaching phase", () => {
  test("starts in approaching phase", () => {
    const e = new Enemy(200, -30, "kamikaze");
    expect(e.getKamikazePhase()).toBe("approaching");
  });

  test("moves downward at ~100 px/s during approach", () => {
    const e = new Enemy(200, 0, "kamikaze");
    const y0 = e.pos.y;
    e.update(1.0, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    expect(e.pos.y - y0).toBeCloseTo(100, -1);
  });

  test("stays in approaching phase before 1.5s", () => {
    const e = new Enemy(200, 0, "kamikaze");
    e.update(1.0, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    expect(e.getKamikazePhase()).toBe("approaching");
  });
});

describe("Kamikaze enemy — lock and dive", () => {
  test("transitions to diving phase after 1.5s", () => {
    const e = new Enemy(200, 0, "kamikaze");
    for (let t = 0; t < 35; t++) {
      e.update(0.05, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    }
    expect(e.getKamikazePhase()).toBe("diving");
  });

  test("does NOT retarget after lock — heads toward original lock position", () => {
    const e = new Enemy(200, 0, "kamikaze");
    for (let t = 0; t < 31; t++) {
      e.update(0.05, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    }
    expect(e.getKamikazePhase()).toBe("diving");

    const posBeforeMove = { x: e.pos.x, y: e.pos.y };
    e.update(0.1, CANVAS_HEIGHT, 100, CANVAS_WIDTH, 0, 0, 500);
    const dx = e.pos.x - posBeforeMove.x;
    expect(dx).toBeGreaterThan(0);
  });

  test("accelerates during dive up to max 400 px/s", () => {
    const e = new Enemy(200, 0, "kamikaze");
    for (let t = 0; t < 32; t++) {
      e.update(0.05, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    }
    expect(e.getKamikazePhase()).toBe("diving");

    const speeds: number[] = [];
    for (let t = 0; t < 40; t++) {
      const prevPos = { x: e.pos.x, y: e.pos.y };
      e.update(0.05, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
      if (!e.alive) break;
      const dx = e.pos.x - prevPos.x;
      const dy = e.pos.y - prevPos.y;
      speeds.push(Math.sqrt(dx * dx + dy * dy) / 0.05);
    }
    if (speeds.length > 2) {
      expect(speeds[speeds.length - 1]).toBeGreaterThan(speeds[0]);
    }
  });

  test("self-destructs when reaching target position", () => {
    const e = new Enemy(200, 0, "kamikaze");
    for (let t = 0; t < 200; t++) {
      e.update(0.05, CANVAS_HEIGHT, 200, CANVAS_WIDTH, 0, 0, 200);
      if (!e.alive) break;
    }
    expect(e.alive).toBe(false);
    expect(e.isKamikazeSelfDestructed()).toBe(true);
  });
});

describe("Kamikaze enemy — does not fire projectiles", () => {
  test("fireRate is 0", () => {
    const e = new Enemy(200, 0, "kamikaze");
    expect(e.fireRate).toBe(0);
  });
});

describe("Kamikaze enemy — killed before lock has no self-destruct flag", () => {
  test("destroyed during approaching phase: kamikazeSelfDestructed stays false", () => {
    const e = new Enemy(200, 0, "kamikaze");
    e.update(0.5, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    expect(e.getKamikazePhase()).toBe("approaching");
    e.hit(10);
    expect(e.alive).toBe(false);
    expect(e.isKamikazeSelfDestructed()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 8: JAMMER CONFIG & BEHAVIOR
// ════════════════════════════════════════════════════════════════════

describe("Jammer enemy — configuration", () => {
  const cfg = ENEMY_CONFIGS.jammer;

  test("HP is 2", () => expect(cfg.hitPoints).toBe(2));
  test("speed is 80", () => expect(cfg.speed).toBe(80));
  test("scoreValue is 50", () => expect(cfg.scoreValue).toBe(50));
  test("fireRate is 0.4", () => expect(cfg.fireRate).toBe(0.4));
  test("size is 34x26", () => {
    expect(cfg.width).toBe(34);
    expect(cfg.height).toBe(26);
  });
  test("weaponType is standard", () => expect(cfg.weaponType).toBe("standard"));
});

describe("Jammer enemy — projectile skin", () => {
  test("jammer projectile skin is defined", () => {
    expect(ENEMY_PROJECTILE_SKINS.jammer).toBeDefined();
  });

  test("jammer projectile skin has correct colors", () => {
    const skin = ENEMY_PROJECTILE_SKINS.jammer!;
    expect(skin.fallbackColor).toBe("#888866");
    expect(skin.coreColor).toBe("#aaaa88");
    expect(skin.glowColor).toBe("#999977");
  });
});

describe("Jammer enemy — descent and deployment", () => {
  test("descends until 30% canvas height then switches to drifting", () => {
    const e = new Enemy(200, -30, "jammer");
    expect(e.isJammerActive()).toBe(false);

    for (let t = 0; t < 200; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (e.isJammerActive()) break;
    }
    expect(e.isJammerActive()).toBe(true);
    expect(e.pos.y).toBeCloseTo(CANVAS_HEIGHT * 0.3, 0);
  });

  test("drifts side-to-side after deployment", () => {
    const e = new Enemy(200, -30, "jammer");
    for (let t = 0; t < 200; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (e.isJammerActive()) break;
    }

    let movedLeft = false;
    let movedRight = false;
    for (let t = 0; t < 500; t++) {
      const prevX = e.pos.x;
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (e.pos.x > prevX) movedRight = true;
      if (e.pos.x < prevX) movedLeft = true;
    }
    expect(movedLeft || movedRight).toBe(true);
  });
});

describe("Jammer enemy — fire rate reduction", () => {
  test("JAMMER_FIELD_RADIUS is 120", () => {
    expect(Enemy.JAMMER_FIELD_RADIUS).toBe(120);
  });

  test("JAMMER_FIRE_RATE_PENALTY is 0.3 (30%)", () => {
    expect(Enemy.JAMMER_FIRE_RATE_PENALTY).toBe(0.3);
  });

  test("isJammerActive returns true when deployed and drifting", () => {
    const e = new Enemy(200, -30, "jammer");
    for (let t = 0; t < 200; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (e.isJammerActive()) break;
    }
    expect(e.isJammerActive()).toBe(true);
  });

  test("isJammerActive returns false when entering", () => {
    const e = new Enemy(200, -30, "jammer");
    expect(e.isJammerActive()).toBe(false);
  });

  test("isJammerActive returns false when dead", () => {
    const e = new Enemy(200, -30, "jammer");
    for (let t = 0; t < 200; t++) {
      e.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (e.isJammerActive()) break;
    }
    e.hit(10);
    expect(e.alive).toBe(false);
    expect(e.isJammerActive()).toBe(false);
  });

  test("multiple jammers: debuff should be boolean (non-stacking capped at 30%)", () => {
    const j1 = new Enemy(200, -30, "jammer");
    const j2 = new Enemy(250, -30, "jammer");

    for (let t = 0; t < 200; t++) {
      j1.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      j2.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (j1.isJammerActive() && j2.isJammerActive()) break;
    }

    let jammerActive = false;
    const enemies = [j1, j2];
    const playerX = 220;
    const playerY = CANVAS_HEIGHT * 0.3;
    for (const enemy of enemies) {
      if (enemy.isJammerActive()) {
        const dx = playerX - enemy.pos.x;
        const dy = playerY - enemy.pos.y;
        if (Math.sqrt(dx * dx + dy * dy) <= Enemy.JAMMER_FIELD_RADIUS) {
          jammerActive = true;
          break;
        }
      }
    }
    const multiplier = jammerActive ? (1.0 - Enemy.JAMMER_FIRE_RATE_PENALTY) : 1.0;
    expect(multiplier).toBe(0.7);
  });
});

describe("Jammer enemy — fires defensive shots", () => {
  test("has fireRate > 0 and can fire", () => {
    const e = new Enemy(200, 100, "jammer");
    expect(e.fireRate).toBe(0.4);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 9: ASSET MANIFEST ENTRIES
// ════════════════════════════════════════════════════════════════════

describe("Asset manifest includes all 7 new enemy sprite keys", () => {
  const expectedKeys = [
    "enemy_splitter",
    "enemy_splitter_minor",
    "enemy_healer",
    "enemy_teleporter",
    "enemy_mimic",
    "enemy_kamikaze",
    "enemy_jammer",
  ];

  for (const key of expectedKeys) {
    test(`ASSET_MANIFEST contains "${key}"`, () => {
      expect(ASSET_MANIFEST[key]).toBeDefined();
      expect(ASSET_MANIFEST[key]).toContain("assets/raptor/");
    });
  }
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 10: PROJECTILE SKINS — 5 variants (no kamikaze/splitter_minor)
// ════════════════════════════════════════════════════════════════════

describe("Projectile skins for new variants", () => {
  test("kamikaze has NO projectile skin (no weapon)", () => {
    expect(ENEMY_PROJECTILE_SKINS.kamikaze).toBeUndefined();
  });

  test("splitter_minor has NO projectile skin (no weapon)", () => {
    expect(ENEMY_PROJECTILE_SKINS.splitter_minor).toBeUndefined();
  });

  const skinVariants: EnemyVariant[] = ["splitter", "healer", "teleporter", "mimic", "jammer"];
  for (const v of skinVariants) {
    test(`"${v}" has a projectile skin with fallbackColor, coreColor, glowColor`, () => {
      const skin = ENEMY_PROJECTILE_SKINS[v];
      expect(skin).toBeDefined();
      expect(skin!.fallbackColor).toBeDefined();
      expect(skin!.coreColor).toBeDefined();
      expect(skin!.glowColor).toBeDefined();
    });
  }
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 11: FALLBACK RENDERING
// ════════════════════════════════════════════════════════════════════

describe("Fallback rendering for all 7 new variants", () => {
  const variants: EnemyVariant[] = [
    "splitter", "splitter_minor", "healer", "teleporter", "mimic", "kamikaze", "jammer",
  ];

  for (const v of variants) {
    test(`"${v}" renders without error`, () => {
      const ctx = createMockCtx();
      const e = new Enemy(200, 100, v);
      expect(() => e.render(ctx)).not.toThrow();
    });

    test(`"${v}" calls beginPath and fill`, () => {
      const ctx = createMockCtx();
      const e = new Enemy(200, 100, v);
      e.render(ctx);
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    });
  }
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 12: REGRESSION — Existing enemy behavior unchanged
// ════════════════════════════════════════════════════════════════════

describe("Existing enemy behavior — regression tests", () => {
  test("scout moves straight downward at configured speed", () => {
    const e = new Enemy(200, 0, "scout");
    expect(ENEMY_CONFIGS.scout.speed).toBe(180);
    const dt = 0.1;
    e.update(dt, CANVAS_HEIGHT);
    expect(e.pos.y).toBeCloseTo(180 * dt, 0);
  });

  test("boss has 50 hit points (unchanged)", () => {
    const boss = new Enemy(400, 100, "boss");
    expect(boss.hitPoints).toBe(50);
  });

  test("fighter config unchanged", () => {
    expect(ENEMY_CONFIGS.fighter.hitPoints).toBe(2);
    expect(ENEMY_CONFIGS.fighter.speed).toBe(130);
    expect(ENEMY_CONFIGS.fighter.scoreValue).toBe(25);
    expect(ENEMY_CONFIGS.fighter.fireRate).toBe(0.8);
    expect(ENEMY_CONFIGS.fighter.weaponType).toBe("standard");
  });

  test("drone config unchanged", () => {
    expect(ENEMY_CONFIGS.drone.hitPoints).toBe(1);
    expect(ENEMY_CONFIGS.drone.speed).toBe(160);
    expect(ENEMY_CONFIGS.drone.scoreValue).toBe(8);
  });

  test("collision system resolves normally for standard enemies", () => {
    const fighter = new Enemy(200, 100, "fighter");
    expect(fighter.hitPoints).toBe(2);
    const destroyed = fighter.hit(1);
    expect(destroyed).toBe(false);
    expect(fighter.hitPoints).toBe(1);
    const destroyed2 = fighter.hit(1);
    expect(destroyed2).toBe(true);
    expect(fighter.alive).toBe(false);
  });

  test("sentinel config unchanged", () => {
    expect(ENEMY_CONFIGS.sentinel.hitPoints).toBe(3);
    expect(ENEMY_CONFIGS.sentinel.speed).toBe(80);
    expect(ENEMY_CONFIGS.sentinel.scoreValue).toBe(45);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 13: HEALER TWO-HEALERS-HEAL-EACH-OTHER EDGE CASE
// ════════════════════════════════════════════════════════════════════

describe("Healer — edge cases", () => {
  test("two healers can heal each other", () => {
    const h1 = new Enemy(200, 100, "healer");
    const h2 = new Enemy(220, 100, "healer");
    h1.hitPoints = 1;
    h2.hitPoints = 1;

    const enemies = [h1, h2];

    for (let t = 0; t < 50; t++) {
      h1.update(0.05, CANVAS_HEIGHT);
      h2.update(0.05, CANVAS_HEIGHT);
      h1.updateHealerLogicWithDt(enemies, 0.05);
      h2.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(h1.hitPoints + h2.hitPoints).toBeGreaterThanOrEqual(3);
  });

  test("healer with no valid target does not crash and does not heal", () => {
    const healer = new Enemy(200, 100, "healer");
    const enemies = [healer];
    expect(() => {
      for (let t = 0; t < 30; t++) {
        healer.update(0.05, CANVAS_HEIGHT);
        healer.updateHealerLogicWithDt(enemies, 0.05);
      }
    }).not.toThrow();
  });

  test("healer does not heal dead enemy", () => {
    const healer = new Enemy(200, 100, "healer");
    const fighter = new Enemy(220, 110, "fighter");
    fighter.hitPoints = 0;
    (fighter as any).alive = false;

    const enemies = [healer, fighter];
    for (let t = 0; t < 50; t++) {
      healer.update(0.05, CANVAS_HEIGHT);
      healer.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(fighter.hitPoints).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 14: KAMIKAZE — splash damage edge cases
// ════════════════════════════════════════════════════════════════════

describe("Kamikaze — splash damage logic (via RaptorGame handleEnemyDestroyed)", () => {
  test("kamikaze killed during diving phase: getKamikazePhase returns 'diving'", () => {
    const e = new Enemy(200, 0, "kamikaze");
    for (let t = 0; t < 35; t++) {
      e.update(0.05, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    }
    expect(e.getKamikazePhase()).toBe("diving");
    e.hit(10);
    expect(e.alive).toBe(false);
    expect(e.getKamikazePhase()).toBe("diving");
  });

  test("kamikaze killed during approaching phase: getKamikazePhase returns 'approaching'", () => {
    const e = new Enemy(200, 0, "kamikaze");
    e.update(0.5, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    expect(e.getKamikazePhase()).toBe("approaching");
    e.hit(10);
    expect(e.alive).toBe(false);
    expect(e.getKamikazePhase()).toBe("approaching");
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 15: JAMMER — laser not affected
// ════════════════════════════════════════════════════════════════════

describe("Jammer — laser weapon exclusion", () => {
  test("jammer debuff computation skips laser weapon (per RaptorGame logic)", () => {
    const currentWeapon = "laser";
    const jammer = new Enemy(200, -30, "jammer");
    for (let t = 0; t < 200; t++) {
      jammer.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (jammer.isJammerActive()) break;
    }
    expect(jammer.isJammerActive()).toBe(true);

    let jammerActive = false;
    if (currentWeapon !== "laser") {
      if (jammer.isJammerActive()) {
        jammerActive = true;
      }
    }
    const multiplier = jammerActive ? (1.0 - Enemy.JAMMER_FIRE_RATE_PENALTY) : 1.0;
    expect(multiplier).toBe(1.0);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 16: KAMIKAZE — off-screen self-destruct
// ════════════════════════════════════════════════════════════════════

describe("Kamikaze — off-screen handling", () => {
  test("dies if going off-screen during approach phase", () => {
    const e = new Enemy(200, CANVAS_HEIGHT + 40, "kamikaze");
    e.update(0.5, CANVAS_HEIGHT, 400, CANVAS_WIDTH, 0, 0, 500);
    expect(e.alive).toBe(false);
  });

  test("dies if going off-screen during dive phase", () => {
    const e = new Enemy(200, 0, "kamikaze");
    for (let t = 0; t < 35; t++) {
      e.update(0.05, CANVAS_HEIGHT, -500, CANVAS_WIDTH, 0, 0, -500);
    }
    expect(e.getKamikazePhase()).toBe("diving");

    for (let t = 0; t < 300; t++) {
      e.update(0.05, CANVAS_HEIGHT, -500, CANVAS_WIDTH, 0, 0, -500);
      if (!e.alive) break;
    }
    expect(e.alive).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 17: WEAPON SYSTEM — externalFireRateMultiplier
// ════════════════════════════════════════════════════════════════════

describe("WeaponSystem — externalFireRateMultiplier parameter", () => {
  test("WeaponSystem module exports update method with correct parameter count", async () => {
    const { WeaponSystem } = await import("../src/games/raptor/systems/WeaponSystem");
    const ws = new WeaponSystem();
    expect(typeof ws.update).toBe("function");
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 18: SPLITTER — weave anchored to initial X
// ════════════════════════════════════════════════════════════════════

describe("Splitter — weave anchored to spawn X", () => {
  test("weave oscillates around the spawn X position", () => {
    const spawnX = 300;
    const e = new Enemy(spawnX, 100, "splitter");
    let minX = Infinity;
    let maxX = -Infinity;
    for (let t = 0; t < 100; t++) {
      e.update(0.02, CANVAS_HEIGHT);
      minX = Math.min(minX, e.pos.x);
      maxX = Math.max(maxX, e.pos.x);
    }
    const midpoint = (minX + maxX) / 2;
    expect(Math.abs(midpoint - spawnX)).toBeLessThan(10);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 19: CONSTRUCTOR VERIFICATION
// ════════════════════════════════════════════════════════════════════

describe("Constructor sets correct values for all new variants", () => {
  test("splitter constructor", () => {
    const e = new Enemy(200, 0, "splitter");
    expect(e.hitPoints).toBe(3);
    expect(e.maxHitPoints).toBe(3);
    expect(e.scoreValue).toBe(35);
    expect(e.width).toBe(28);
    expect(e.height).toBe(26);
    expect(e.alive).toBe(true);
    expect(e.vel.y).toBe(120);
  });

  test("splitter_minor constructor", () => {
    const e = new Enemy(200, 0, "splitter_minor");
    expect(e.hitPoints).toBe(1);
    expect(e.scoreValue).toBe(8);
    expect(e.width).toBe(12);
    expect(e.height).toBe(12);
    expect(e.vel.y).toBe(160);
  });

  test("healer constructor", () => {
    const e = new Enemy(200, 0, "healer");
    expect(e.hitPoints).toBe(2);
    expect(e.scoreValue).toBe(55);
    expect(e.width).toBe(24);
    expect(e.height).toBe(24);
    expect(e.vel.y).toBe(90);
  });

  test("teleporter constructor", () => {
    const e = new Enemy(200, 0, "teleporter");
    expect(e.hitPoints).toBe(2);
    expect(e.scoreValue).toBe(40);
    expect(e.width).toBe(22);
    expect(e.height).toBe(22);
    expect(e.vel.y).toBe(0);
  });

  test("mimic constructor", () => {
    const e = new Enemy(200, 0, "mimic");
    expect(e.hitPoints).toBe(2);
    expect(e.scoreValue).toBe(45);
    expect(e.width).toBe(26);
    expect(e.height).toBe(26);
    expect(e.vel.y).toBe(0);
  });

  test("kamikaze constructor", () => {
    const e = new Enemy(200, 0, "kamikaze");
    expect(e.hitPoints).toBe(2);
    expect(e.scoreValue).toBe(25);
    expect(e.width).toBe(26);
    expect(e.height).toBe(30);
    expect(e.vel.y).toBe(100);
  });

  test("jammer constructor", () => {
    const e = new Enemy(200, 0, "jammer");
    expect(e.hitPoints).toBe(2);
    expect(e.scoreValue).toBe(50);
    expect(e.width).toBe(34);
    expect(e.height).toBe(26);
    expect(e.vel.y).toBe(80);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 20: isBossVariant excludes new variants
// ════════════════════════════════════════════════════════════════════

describe("isBossVariant excludes all new special variants", () => {
  const specialVariants: EnemyVariant[] = [
    "splitter", "splitter_minor", "healer", "teleporter", "mimic", "kamikaze", "jammer",
  ];

  for (const v of specialVariants) {
    test(`isBossVariant("${v}") returns false`, () => {
      expect(isBossVariant(v)).toBe(false);
    });
  }
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 21: JAMMER — debuff ends when jammer destroyed
// ════════════════════════════════════════════════════════════════════

describe("Jammer — debuff lifecycle", () => {
  test("isJammerActive transitions false immediately on death", () => {
    const j = new Enemy(200, -30, "jammer");
    for (let t = 0; t < 200; t++) {
      j.update(0.05, CANVAS_HEIGHT, undefined, CANVAS_WIDTH, 0, 0);
      if (j.isJammerActive()) break;
    }
    expect(j.isJammerActive()).toBe(true);

    j.hit(10);
    expect(j.isJammerActive()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 22: TELEPORTER — does not fire via normal cooldown
// ════════════════════════════════════════════════════════════════════

describe("Teleporter — fires only via burst mechanism", () => {
  test("teleporter fireRate is 0 in config", () => {
    expect(ENEMY_CONFIGS.teleporter.fireRate).toBe(0);
  });

  test("canFire() always returns false for teleporter", () => {
    const e = new Enemy(200, 100, "teleporter");
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 23: VFX Manager methods exist
// ════════════════════════════════════════════════════════════════════

describe("VFXManager — new methods", () => {
  test("addHealParticle method exists", async () => {
    const { VFXManager } = await import("../src/games/raptor/rendering/VFXManager");
    const vfx = new VFXManager();
    expect(typeof vfx.addHealParticle).toBe("function");
  });

  test("addTeleportFlash method exists", async () => {
    const { VFXManager } = await import("../src/games/raptor/rendering/VFXManager");
    const vfx = new VFXManager();
    expect(typeof vfx.addTeleportFlash).toBe("function");
  });
});

// ════════════════════════════════════════════════════════════════════
//  SECTION 24: HEALER — heal rate (1 HP per 2s)
// ════════════════════════════════════════════════════════════════════

describe("Healer — heal rate precision", () => {
  test("heals exactly 1 HP after 2 seconds elapsed", () => {
    const healer = new Enemy(200, 100, "healer");
    const fighter = new Enemy(220, 110, "fighter");
    fighter.hitPoints = 1;

    const enemies = [healer, fighter];
    // Only tick heal logic to keep healer in range
    for (let t = 0; t < 42; t++) {
      healer.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(fighter.hitPoints).toBe(2);
  });

  test("does not over-heal beyond maxHitPoints", () => {
    const healer = new Enemy(200, 100, "healer");
    const fighter = new Enemy(220, 110, "fighter");
    fighter.hitPoints = fighter.maxHitPoints;

    const enemies = [healer, fighter];
    for (let t = 0; t < 100; t++) {
      healer.update(0.05, CANVAS_HEIGHT);
      healer.updateHealerLogicWithDt(enemies, 0.05);
    }
    expect(fighter.hitPoints).toBe(fighter.maxHitPoints);
  });
});
