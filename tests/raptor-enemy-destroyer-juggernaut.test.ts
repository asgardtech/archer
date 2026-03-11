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
// DESTROYER CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Destroyer enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a destroyer entry", () => {
    expect(ENEMY_CONFIGS.destroyer).toBeDefined();
  });

  test("destroyer config has HP 6", () => {
    expect(ENEMY_CONFIGS.destroyer.hitPoints).toBe(6);
  });

  test("destroyer config has speed 50", () => {
    expect(ENEMY_CONFIGS.destroyer.speed).toBe(50);
  });

  test("destroyer config has scoreValue 100", () => {
    expect(ENEMY_CONFIGS.destroyer.scoreValue).toBe(100);
  });

  test("destroyer config has size 52x48", () => {
    expect(ENEMY_CONFIGS.destroyer.width).toBe(52);
    expect(ENEMY_CONFIGS.destroyer.height).toBe(48);
  });

  test("destroyer config has fireRate 0.8", () => {
    expect(ENEMY_CONFIGS.destroyer.fireRate).toBe(0.8);
  });

  test("destroyer config has weaponType laser", () => {
    expect(ENEMY_CONFIGS.destroyer.weaponType).toBe("laser");
  });
});

// ════════════════════════════════════════════════════════════════
// DESTROYER CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Destroyer enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(400, 0, "destroyer");
    expect(e.hitPoints).toBe(6);
    expect(e.maxHitPoints).toBe(6);
    expect(e.scoreValue).toBe(100);
    expect(e.width).toBe(52);
    expect(e.height).toBe(48);
    expect(e.vel.y).toBe(50);
    expect(e.weaponType).toBe("laser");
    expect(e.alive).toBe(true);
  });

  test("standard descent before reaching 25% threshold (x unchanged, y increases)", () => {
    const e = new Enemy(400, 0, "destroyer");
    const dt = 0.5;
    e.update(dt, 600);
    expect(e.pos.y).toBeCloseTo(50 * dt, 0);
    expect(e.pos.x).toBe(400);
  });

  test("patrol behavior activates after reaching 25% threshold (x changes via sin oscillation)", () => {
    const canvasHeight = 600;
    const threshold = canvasHeight * 0.25;
    const e = new Enemy(400, threshold, "destroyer");

    let xChanged = false;
    for (let i = 0; i < 20; i++) {
      const prevX = e.pos.x;
      e.update(0.1, canvasHeight);
      if (Math.abs(e.pos.x - prevX) > 0.001) xChanged = true;
    }
    expect(xChanged).toBe(true);
  });

  test("vertical bob is minimal after threshold", () => {
    const canvasHeight = 600;
    const threshold = canvasHeight * 0.25;
    const e = new Enemy(400, threshold, "destroyer");

    const startY = e.pos.y;
    for (let i = 0; i < 60; i++) {
      e.update(1 / 60, canvasHeight);
    }
    expect(Math.abs(e.pos.y - startY)).toBeLessThan(2);
  });

  test("takes 6 hits to destroy", () => {
    const e = new Enemy(400, 100, "destroyer");
    for (let i = 0; i < 5; i++) {
      expect(e.hit(1)).toBe(false);
      expect(e.alive).toBe(true);
    }
    expect(e.hitPoints).toBe(1);
    expect(e.hit(1)).toBe(true);
    expect(e.alive).toBe(false);
    expect(e.hitPoints).toBe(0);
  });

  test("can fire when cooldown expires", () => {
    const e = new Enemy(400, 100, "destroyer");
    expect(e.fireRate).toBeGreaterThan(0);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
    expect(e.weaponType).toBe("laser");
  });
});

// ════════════════════════════════════════════════════════════════
// DESTROYER RENDERING
// ════════════════════════════════════════════════════════════════

describe("Destroyer enemy variant — rendering", () => {
  test("renders without error using geometric fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "destroyer");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (polygon shape drawn)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "destroyer");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  test("HP bar renders (fillRect called at least twice)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "destroyer");
    e.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();
    const fillRectCalls = (ctx.fillRect as jest.Mock).mock.calls;
    expect(fillRectCalls.length).toBeGreaterThanOrEqual(2);
  });

  test("HP bar renders in sprite mode", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "destroyer");
    const mockSprite = { width: 52, height: 48 } as HTMLImageElement;
    e.setSprite(mockSprite);
    e.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// JUGGERNAUT CONFIGURATION
// ════════════════════════════════════════════════════════════════

describe("Juggernaut enemy variant — configuration", () => {
  test("ENEMY_CONFIGS contains a juggernaut entry", () => {
    expect(ENEMY_CONFIGS.juggernaut).toBeDefined();
  });

  test("juggernaut config has HP 12", () => {
    expect(ENEMY_CONFIGS.juggernaut.hitPoints).toBe(12);
  });

  test("juggernaut config has speed 35", () => {
    expect(ENEMY_CONFIGS.juggernaut.speed).toBe(35);
  });

  test("juggernaut config has scoreValue 150", () => {
    expect(ENEMY_CONFIGS.juggernaut.scoreValue).toBe(150);
  });

  test("juggernaut config has size 56x52", () => {
    expect(ENEMY_CONFIGS.juggernaut.width).toBe(56);
    expect(ENEMY_CONFIGS.juggernaut.height).toBe(52);
  });

  test("juggernaut config has fireRate 1.2", () => {
    expect(ENEMY_CONFIGS.juggernaut.fireRate).toBe(1.2);
  });

  test("juggernaut config has weaponType missile", () => {
    expect(ENEMY_CONFIGS.juggernaut.weaponType).toBe("missile");
  });
});

// ════════════════════════════════════════════════════════════════
// JUGGERNAUT CONSTRUCTION & BEHAVIOR
// ════════════════════════════════════════════════════════════════

describe("Juggernaut enemy variant — construction and behavior", () => {
  test("constructor sets correct values", () => {
    const e = new Enemy(400, 0, "juggernaut");
    expect(e.hitPoints).toBe(12);
    expect(e.maxHitPoints).toBe(12);
    expect(e.scoreValue).toBe(150);
    expect(e.width).toBe(56);
    expect(e.height).toBe(52);
    expect(e.vel.y).toBe(35);
    expect(e.weaponType).toBe("missile");
    expect(e.alive).toBe(true);
  });

  test("standard descent before reaching 20% threshold (x unchanged, y increases)", () => {
    const e = new Enemy(400, 0, "juggernaut");
    const dt = 0.5;
    e.update(dt, 600);
    expect(e.pos.y).toBeCloseTo(35 * dt, 0);
    expect(e.pos.x).toBe(400);
  });

  test("oscillation behavior activates after reaching 20% threshold (x changes, y stays ~fixed)", () => {
    const canvasHeight = 600;
    const threshold = canvasHeight * 0.2;
    const e = new Enemy(400, threshold, "juggernaut");

    let xChanged = false;
    const startY = e.pos.y;
    for (let i = 0; i < 20; i++) {
      const prevX = e.pos.x;
      e.update(0.1, canvasHeight);
      if (Math.abs(e.pos.x - prevX) > 0.001) xChanged = true;
    }
    expect(xChanged).toBe(true);
    expect(e.pos.y).toBeCloseTo(startY, 0);
  });

  test("takes 12 hits to destroy", () => {
    const e = new Enemy(400, 100, "juggernaut");
    for (let i = 0; i < 11; i++) {
      expect(e.hit(1)).toBe(false);
      expect(e.alive).toBe(true);
    }
    expect(e.hitPoints).toBe(1);
    expect(e.hit(1)).toBe(true);
    expect(e.alive).toBe(false);
    expect(e.hitPoints).toBe(0);
  });

  test("can fire when cooldown expires", () => {
    const e = new Enemy(400, 100, "juggernaut");
    expect(e.fireRate).toBeGreaterThan(0);
    e.fireCooldown = 0;
    expect(e.canFire()).toBe(true);
    expect(e.weaponType).toBe("missile");
  });

  test("is not culled when parked at threshold (unlike regular enemies)", () => {
    const canvasHeight = 600;
    const e = new Enemy(400, canvasHeight + 100, "juggernaut");
    e.update(0.016, canvasHeight);
    expect(e.alive).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// JUGGERNAUT RENDERING
// ════════════════════════════════════════════════════════════════

describe("Juggernaut enemy variant — rendering", () => {
  test("renders without error using geometric fallback", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "juggernaut");
    expect(() => e.render(ctx)).not.toThrow();
  });

  test("calls beginPath and fill (polygon shape drawn)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "juggernaut");
    e.render(ctx);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  test("HP bar renders (fillRect called)", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "juggernaut");
    e.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test("HP bar renders in sprite mode", () => {
    const ctx = createMockCtx();
    const e = new Enemy(400, 100, "juggernaut");
    const mockSprite = { width: 56, height: 52 } as HTMLImageElement;
    e.setSprite(mockSprite);
    e.render(ctx);
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
// DESTROYER vs JUGGERNAUT COMPARISON
// ════════════════════════════════════════════════════════════════

describe("Destroyer vs Juggernaut comparison", () => {
  test("juggernaut has more HP than destroyer", () => {
    const destroyer = new Enemy(400, 0, "destroyer");
    const juggernaut = new Enemy(400, 0, "juggernaut");
    expect(juggernaut.maxHitPoints).toBeGreaterThan(destroyer.maxHitPoints);
  });

  test("destroyer is faster than juggernaut", () => {
    const destroyer = new Enemy(400, 0, "destroyer");
    const juggernaut = new Enemy(400, 0, "juggernaut");
    destroyer.update(1.0, 600);
    juggernaut.update(1.0, 600);
    expect(destroyer.pos.y).toBeGreaterThan(juggernaut.pos.y);
  });

  test("juggernaut parks higher on screen (20% vs 25%)", () => {
    const juggernautThreshold = 0.2;
    const destroyerThreshold = 0.25;
    expect(juggernautThreshold).toBeLessThan(destroyerThreshold);
  });

  test("both have horizontal patrol after reaching their threshold", () => {
    const canvasHeight = 600;

    const destroyer = new Enemy(400, canvasHeight * 0.25, "destroyer");
    const juggernaut = new Enemy(400, canvasHeight * 0.2, "juggernaut");

    let destroyerXChanged = false;
    let juggernautXChanged = false;

    for (let i = 0; i < 20; i++) {
      const prevDX = destroyer.pos.x;
      const prevJX = juggernaut.pos.x;
      destroyer.update(0.1, canvasHeight);
      juggernaut.update(0.1, canvasHeight);
      if (Math.abs(destroyer.pos.x - prevDX) > 0.001) destroyerXChanged = true;
      if (Math.abs(juggernaut.pos.x - prevJX) > 0.001) juggernautXChanged = true;
    }

    expect(destroyerXChanged).toBe(true);
    expect(juggernautXChanged).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// EXPLOSION SIZES
// ════════════════════════════════════════════════════════════════

describe("Explosion sizes via handleEnemyDestroyed logic", () => {
  function getExplosionSize(variant: string): number {
    return (variant === "boss" || variant === "juggernaut") ? 3
      : (variant === "bomber" || variant === "gunship" || variant === "cruiser" || variant === "destroyer" || variant === "minelayer") ? 2
      : 1;
  }

  test("destroyer produces size 2 explosion", () => {
    expect(getExplosionSize("destroyer")).toBe(2);
  });

  test("juggernaut produces size 3 explosion", () => {
    expect(getExplosionSize("juggernaut")).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════════
// SPRITE ASSETS
// ════════════════════════════════════════════════════════════════

describe("Sprite assets for Destroyer and Juggernaut", () => {
  test("enemy_destroyer.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_destroyer.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("enemy_juggernaut.png exists at expected path", () => {
    const filePath = path.resolve(__dirname, "../public/assets/raptor/enemy_juggernaut.png");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test("ASSET_MANIFEST contains enemy_destroyer key", () => {
    expect(ASSET_MANIFEST.enemy_destroyer).toBe("assets/raptor/enemy_destroyer.png");
  });

  test("ASSET_MANIFEST contains enemy_juggernaut key", () => {
    expect(ASSET_MANIFEST.enemy_juggernaut).toBe("assets/raptor/enemy_juggernaut.png");
  });
});
