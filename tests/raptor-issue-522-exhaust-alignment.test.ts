import { Missile } from "../src/games/raptor/entities/Missile";
import { Rocket } from "../src/games/raptor/entities/Rocket";
import { TrackingBullet } from "../src/games/raptor/entities/TrackingBullet";
import { EnemyBullet } from "../src/games/raptor/entities/EnemyBullet";
import { EnemyMissile } from "../src/games/raptor/entities/EnemyMissile";
import { VFXManager } from "../src/games/raptor/rendering/VFXManager";

// ─── Missile exhaust position tests ─────────────────────────────

describe("Missile.getExhaustPosition", () => {
  const cx = 100;
  const cy = 200;

  it("returns position directly behind missile when heading is 0 (straight up)", () => {
    const missile = new Missile(cx, cy, 0);
    const exhaust = missile.getExhaustPosition();
    const tailOffset = missile.height / 2 + 2;

    expect(exhaust.x).toBeCloseTo(cx, 5);
    expect(exhaust.y).toBeCloseTo(cy + tailOffset, 5);
  });

  it("returns position to the left when heading is π/2 (pointing right)", () => {
    const missile = new Missile(cx, cy, Math.PI / 2);
    const exhaust = missile.getExhaustPosition();
    const tailOffset = missile.height / 2 + 2;

    expect(exhaust.x).toBeCloseTo(cx - tailOffset, 5);
    expect(exhaust.y).toBeCloseTo(cy, 5);
  });

  it("returns position to the right when heading is -π/2 (pointing left)", () => {
    const missile = new Missile(cx, cy, -Math.PI / 2);
    const exhaust = missile.getExhaustPosition();
    const tailOffset = missile.height / 2 + 2;

    expect(exhaust.x).toBeCloseTo(cx + tailOffset, 5);
    expect(exhaust.y).toBeCloseTo(cy, 5);
  });

  it("returns position above missile when heading is π (pointing down)", () => {
    const missile = new Missile(cx, cy, Math.PI);
    const exhaust = missile.getExhaustPosition();
    const tailOffset = missile.height / 2 + 2;

    expect(exhaust.x).toBeCloseTo(cx, 4);
    expect(exhaust.y).toBeCloseTo(cy - tailOffset, 4);
  });

  it("exposes heading getter matching internal angle", () => {
    const angle = 1.23;
    const missile = new Missile(cx, cy, angle);
    expect(missile.heading).toBeCloseTo(angle, 10);
  });
});

// ─── Rocket exhaust position tests ──────────────────────────────

describe("Rocket.getExhaustPosition", () => {
  const cx = 150;
  const cy = 250;

  it("returns position directly behind rocket when heading is 0", () => {
    const rocket = new Rocket(cx, cy, 0);
    const exhaust = rocket.getExhaustPosition();
    const tailOffset = rocket.height / 2 + 2;

    expect(exhaust.x).toBeCloseTo(cx, 5);
    expect(exhaust.y).toBeCloseTo(cy + tailOffset, 5);
  });

  it("returns rotated position when heading is π/2", () => {
    const rocket = new Rocket(cx, cy, Math.PI / 2);
    const exhaust = rocket.getExhaustPosition();
    const tailOffset = rocket.height / 2 + 2;

    expect(exhaust.x).toBeCloseTo(cx - tailOffset, 5);
    expect(exhaust.y).toBeCloseTo(cy, 5);
  });

  it("exposes heading getter", () => {
    const rocket = new Rocket(cx, cy, 0.5);
    expect(rocket.heading).toBeCloseTo(0.5, 10);
  });
});

// ─── TrackingBullet exhaust position tests ──────────────────────

describe("TrackingBullet.getExhaustPosition", () => {
  const cx = 100;
  const cy = 300;

  it("returns position directly behind bullet when heading is 0", () => {
    const bullet = new TrackingBullet(cx, cy, 0);
    const exhaust = bullet.getExhaustPosition();
    const tailOffset = bullet.height / 2 + 1;

    expect(exhaust.x).toBeCloseTo(cx, 5);
    expect(exhaust.y).toBeCloseTo(cy + tailOffset, 5);
  });

  it("returns rotated position for non-zero heading", () => {
    const bullet = new TrackingBullet(cx, cy, -Math.PI / 2);
    const exhaust = bullet.getExhaustPosition();
    const tailOffset = bullet.height / 2 + 1;

    expect(exhaust.x).toBeCloseTo(cx + tailOffset, 5);
    expect(exhaust.y).toBeCloseTo(cy, 5);
  });

  it("uses smaller tail offset than Missile", () => {
    const missile = new Missile(cx, cy, 0);
    const bullet = new TrackingBullet(cx, cy, 0);
    const missileOffset = missile.height / 2 + 2;
    const bulletOffset = bullet.height / 2 + 1;

    expect(bulletOffset).toBeLessThan(missileOffset);
  });
});

// ─── EnemyBullet heading getter tests ───────────────────────────

describe("EnemyBullet.heading", () => {
  it("exposes the computed angle from constructor", () => {
    const eb = new EnemyBullet(100, 100, 200, 100);
    expect(typeof eb.heading).toBe("number");
  });

  it("EnemyMissile inherits heading getter", () => {
    const em = new EnemyMissile(100, 100, 200, 200);
    expect(typeof em.heading).toBe("number");
  });
});

// ─── VFXManager angle-aware trail tests ─────────────────────────

describe("VFXManager angle-aware trails", () => {
  let vfx: VFXManager;

  beforeEach(() => {
    vfx = new VFXManager();
  });

  it("addMissileTrail with angle=0 scatters along X axis (perpendicular to up)", () => {
    const samples: number[] = [];
    for (let i = 0; i < 100; i++) {
      vfx.addMissileTrail(100, 200, 0);
    }
    const trails = (vfx as any).trails as Array<{ x: number; y: number }>;
    const xSpread = trails.some((t) => Math.abs(t.x - 100) > 0.01);
    expect(xSpread).toBe(true);
  });

  it("addMissileTrail with angle=π/2 scatters along Y axis (perpendicular to right)", () => {
    for (let i = 0; i < 100; i++) {
      vfx.addMissileTrail(100, 200, Math.PI / 2);
    }
    const trails = (vfx as any).trails as Array<{ x: number; y: number }>;
    const ySpread = trails.some((t) => Math.abs(t.y - 200) > 0.5);
    expect(ySpread).toBe(true);
  });

  it("addRocketTrail accepts angle parameter without error", () => {
    expect(() => {
      vfx.addRocketTrail(100, 200, Math.PI / 4);
    }).not.toThrow();
  });

  it("addRocketTrail with angle=π/2 scatters perpendicular to heading", () => {
    for (let i = 0; i < 100; i++) {
      vfx.addRocketTrail(100, 200, Math.PI / 2);
    }
    const trails = (vfx as any).trails as Array<{ x: number; y: number }>;
    const ySpread = trails.some((t) => Math.abs(t.y - 200) > 0.5);
    expect(ySpread).toBe(true);
  });

  it("trail count respects the 300 cap", () => {
    for (let i = 0; i < 350; i++) {
      vfx.addMissileTrail(100, 200, 0);
    }
    const trails = (vfx as any).trails as Array<{ x: number; y: number }>;
    expect(trails.length).toBeLessThanOrEqual(301);
  });
});
