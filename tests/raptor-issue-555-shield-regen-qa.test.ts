import { Player } from "../src/games/raptor/entities/Player";
import { HUD } from "../src/games/raptor/rendering/HUD";
import * as fs from "fs";
import * as path from "path";

// ─── Constants matching implementation ─────────────────────────
const SHIELD_REGEN_RATE = 2.5;
const SHIELD_REGEN_DELAY = 4.0;
const MAX_SHIELD = 100;
const CANVAS_W = 800;
const CANVAS_H = 600;

// ─── Helpers ───────────────────────────────────────────────────

function createPlayer(): Player {
  return new Player(CANVAS_W, CANVAS_H);
}

function simulateTime(player: Player, seconds: number, stepSize = 1 / 60): void {
  let remaining = seconds;
  while (remaining > 0) {
    const dt = Math.min(stepSize, remaining);
    player.updateShieldRegen(dt);
    remaining -= dt;
  }
}

function createMockCtx(): CanvasRenderingContext2D {
  const fillCalls: Array<{ style: string }> = [];
  const ctx = {
    fillText: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillStyle: "",
    font: "",
    textAlign: "",
    textBaseline: "",
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
    fill: jest.fn(() => {
      fillCalls.push({ style: String(ctx.fillStyle) });
    }),
    stroke: jest.fn(),
    arc: jest.fn(),
    arcTo: jest.fn(),
    ellipse: jest.fn(),
    quadraticCurveTo: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    transform: jest.fn(),
    roundRect: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    measureText: jest.fn(() => ({ width: 50 })),
    _fillCalls: fillCalls,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

// ─── Tests ─────────────────────────────────────────────────────

describe("Issue #555: Passive Shield Regeneration", () => {

  describe("Scenario: Shield regenerates after delay period", () => {
    test("shield increases at ~2.5/sec after 4 seconds of no damage", () => {
      const player = createPlayer();
      player.shield = 60;

      // Simulate 4 seconds to pass delay
      simulateTime(player, SHIELD_REGEN_DELAY);

      const shieldAfterDelay = player.shield;
      // After exactly 4s delay, regen should have just started, shield ~60
      // The last frame of the delay period starts regen

      // Now simulate 1 more second of regen
      const shieldBefore = player.shield;
      simulateTime(player, 1.0);

      // Should have gained approximately 2.5 points
      const gained = player.shield - shieldBefore;
      expect(gained).toBeGreaterThanOrEqual(2.0);
      expect(gained).toBeLessThanOrEqual(3.0);
      expect(player.shield).toBeCloseTo(shieldAfterDelay + SHIELD_REGEN_RATE * 1.0, 0);
    });

    test("isShieldRegenerating is true when regen is active", () => {
      const player = createPlayer();
      player.shield = 60;

      expect(player.isShieldRegenerating).toBe(false);

      simulateTime(player, SHIELD_REGEN_DELAY);

      expect(player.isShieldRegenerating).toBe(true);
    });
  });

  describe("Scenario: Taking damage resets the regeneration delay timer", () => {
    test("damage resets the delay timer", () => {
      const player = createPlayer();
      player.shield = 80;

      // Simulate 3 seconds (not enough for regen)
      simulateTime(player, 3.0);
      expect(player.isShieldRegenerating).toBe(false);

      // Take damage
      player.takeDamage(10);
      expect(player.shield).toBe(70);

      // Timer should have been reset — 3 more seconds should NOT trigger regen
      simulateTime(player, 3.0);
      expect(player.isShieldRegenerating).toBe(false);

      // Shield should not have changed
      expect(player.shield).toBe(70);
    });

    test("no regen occurs for 4 seconds after taking damage", () => {
      const player = createPlayer();
      player.shield = 80;

      player.takeDamage(10);
      expect(player.shield).toBe(70);

      const shieldAfterDamage = player.shield;

      // Simulate 3.9 seconds — should not regen yet
      simulateTime(player, 3.9);
      expect(player.shield).toBe(shieldAfterDamage);

      // Simulate 0.2 more seconds (total 4.1s) — regen should kick in
      simulateTime(player, 0.2);
      expect(player.shield).toBeGreaterThan(shieldAfterDamage);
    });
  });

  describe("Scenario: Shield does not regenerate above maximum", () => {
    test("shield caps at 100", () => {
      const player = createPlayer();
      player.shield = 99;

      simulateTime(player, SHIELD_REGEN_DELAY + 2.0);

      expect(player.shield).toBe(MAX_SHIELD);
    });

    test("isShieldRegenerating is false when shield is at max", () => {
      const player = createPlayer();
      player.shield = 100;

      simulateTime(player, SHIELD_REGEN_DELAY + 1.0);

      expect(player.isShieldRegenerating).toBe(false);
      expect(player.shield).toBe(MAX_SHIELD);
    });

    test("isShieldRegenerating becomes false once shield reaches max", () => {
      const player = createPlayer();
      player.shield = 99.5;

      simulateTime(player, SHIELD_REGEN_DELAY);
      expect(player.isShieldRegenerating).toBe(true);

      // Regen until full (0.5 / 2.5 = 0.2 seconds)
      simulateTime(player, 1.0);
      expect(player.shield).toBe(MAX_SHIELD);
      expect(player.isShieldRegenerating).toBe(false);
    });
  });

  describe("Scenario: Shield does not regenerate during invincibility frames", () => {
    test("no regen while invincible", () => {
      const player = createPlayer();
      player.shield = 50;
      player.invincibilityTimer = 2.0;

      simulateTime(player, SHIELD_REGEN_DELAY + 2.0);

      // Shield should not have changed since player is invincible
      expect(player.shield).toBe(50);
    });

    test("isShieldRegenerating is false during invincibility", () => {
      const player = createPlayer();
      player.shield = 50;
      player.invincibilityTimer = 10.0;

      simulateTime(player, SHIELD_REGEN_DELAY + 1.0);

      expect(player.isShieldRegenerating).toBe(false);
    });

    test("after a life loss, shield is reset and invincibility prevents regen", () => {
      const player = createPlayer();
      player.shield = 0;
      player.lives = 3;

      // Take lethal hit (shield is 0, so it takes a life)
      player.takeDamage(10);

      // After life loss: shield = 100, invincible
      expect(player.shield).toBe(100);
      expect(player.isInvincible).toBe(true);
      expect(player.isShieldRegenerating).toBe(false);
    });
  });

  describe("Scenario: Shield does not regenerate when player is dead", () => {
    test("no regen when dead", () => {
      const player = createPlayer();
      player.shield = 0;
      player.lives = 1;

      // Kill the player
      player.takeDamage(10);
      expect(player.alive).toBe(false);

      player.shield = 50; // force set for testing
      simulateTime(player, SHIELD_REGEN_DELAY + 2.0);

      // Shield should not have changed
      expect(player.shield).toBe(50);
    });

    test("isShieldRegenerating is false when dead", () => {
      const player = createPlayer();
      player.alive = false;
      player.shield = 50;

      expect(player.isShieldRegenerating).toBe(false);
    });
  });

  describe("Scenario: Shield-restore power-up still works during regeneration", () => {
    test("shield-restore sets shield to 100, regen stops", () => {
      const player = createPlayer();
      player.shield = 40;

      // Activate regen
      simulateTime(player, SHIELD_REGEN_DELAY);
      expect(player.isShieldRegenerating).toBe(true);

      // Simulate shield-restore power-up (directly sets shield = 100)
      player.shield = 100;

      expect(player.shield).toBe(MAX_SHIELD);
      expect(player.isShieldRegenerating).toBe(false);
    });
  });

  describe("Scenario: Multiple rapid hits keep resetting the delay", () => {
    test("repeated damage prevents regeneration between hits", () => {
      const player = createPlayer();
      player.shield = 80;

      // Hit 1
      player.takeDamage(5);
      expect(player.shield).toBe(75);

      // 2 seconds pass
      simulateTime(player, 2.0);
      expect(player.shield).toBe(75); // no regen yet

      // Hit 2
      player.takeDamage(5);
      expect(player.shield).toBe(70);

      // 2 seconds pass
      simulateTime(player, 2.0);
      expect(player.shield).toBe(70); // no regen yet

      // Hit 3
      player.takeDamage(5);
      expect(player.shield).toBe(65);

      // No regen should have occurred between hits
      expect(player.isShieldRegenerating).toBe(false);
    });
  });

  describe("Scenario: Regeneration resumes after damage interruption", () => {
    test("regen stops on damage and resumes after delay", () => {
      const player = createPlayer();
      player.shield = 50;

      // Start regen
      simulateTime(player, SHIELD_REGEN_DELAY);
      expect(player.isShieldRegenerating).toBe(true);

      // Take damage — regen stops
      player.takeDamage(10);
      expect(player.shield).toBeCloseTo(40, 1);
      expect(player.isShieldRegenerating).toBe(false);

      // Wait the full delay again
      simulateTime(player, SHIELD_REGEN_DELAY);
      expect(player.isShieldRegenerating).toBe(true);

      // Shield should start increasing
      const shieldBefore = player.shield;
      simulateTime(player, 1.0);
      expect(player.shield).toBeGreaterThan(shieldBefore);
    });
  });

  describe("Scenario: Regeneration visual indicator on HUD", () => {
    beforeAll(() => {
      const mockCtx2d = {
        measureText: jest.fn(() => ({ width: 50 })),
        fillText: jest.fn(),
        fillRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
      };
      (global as any).document = {
        createElement: jest.fn(() => ({
          getContext: jest.fn(() => mockCtx2d),
          width: 100,
          height: 100,
        })),
      };
    });

    afterAll(() => {
      delete (global as any).document;
    });

    test("HUD render method accepts isShieldRegenerating parameter", () => {
      const hud = new HUD(false);
      const ctx = createMockCtx();

      expect(() => {
        hud.render(
          ctx,
          "playing",
          1000,
          3,
          75,
          1,
          "Test Level",
          CANVAS_W,
          CANVAS_H,
          [],
          undefined,
          false,
          0,
          0,
          1,
          true // isShieldRegenerating
        );
      }).not.toThrow();
    });

    test("HUD renders pulsing overlay when regenerating with shield < 100", () => {
      const hud = new HUD(false);
      const ctx = createMockCtx();

      hud.render(
        ctx,
        "playing",
        1000,
        3,
        75,
        1,
        "Test Level",
        CANVAS_W,
        CANVAS_H,
        [],
        undefined,
        false,
        0,
        0,
        1,
        true
      );

      // Check that a fill call used the cyan regen color rgba(52, 152, 219, ...)
      const fillCalls = (ctx as any)._fillCalls as Array<{ style: string }>;
      const regenFills = fillCalls.filter(
        (c) => c.style.startsWith("rgba(52, 152, 219,")
      );
      expect(regenFills.length).toBeGreaterThan(0);
    });

    test("HUD does NOT render regen overlay when not regenerating", () => {
      const hud = new HUD(false);
      const ctx = createMockCtx();

      hud.render(
        ctx,
        "playing",
        1000,
        3,
        75,
        1,
        "Test Level",
        CANVAS_W,
        CANVAS_H,
        [],
        undefined,
        false,
        0,
        0,
        1,
        false // not regenerating
      );

      const fillCalls = (ctx as any)._fillCalls as Array<{ style: string }>;
      const regenFills = fillCalls.filter(
        (c) => c.style.startsWith("rgba(52, 152, 219,")
      );
      expect(regenFills.length).toBe(0);
    });

    test("HUD does NOT render regen overlay when shield is at 100 even if flag is true", () => {
      const hud = new HUD(false);
      const ctx = createMockCtx();

      hud.render(
        ctx,
        "playing",
        1000,
        3,
        100, // full shield
        1,
        "Test Level",
        CANVAS_W,
        CANVAS_H,
        [],
        undefined,
        false,
        0,
        0,
        1,
        true // even if passed as true
      );

      const fillCalls = (ctx as any)._fillCalls as Array<{ style: string }>;
      const regenFills = fillCalls.filter(
        (c) => c.style.startsWith("rgba(52, 152, 219,")
      );
      expect(regenFills.length).toBe(0);
    });
  });

  describe("Scenario: Game compiles without errors", () => {
    test("npm run typecheck passes", () => {
      const { execSync } = require("child_process");
      const rootDir = path.resolve(__dirname, "..");
      try {
        execSync("npm run typecheck", { cwd: rootDir, stdio: "pipe", timeout: 60000 });
      } catch (err: any) {
        fail(`TypeScript compilation failed:\n${err.stdout?.toString()}\n${err.stderr?.toString()}`);
      }
    });
  });

  describe("Implementation verification", () => {
    test("Player.ts contains correct regen constants", () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/entities/Player.ts"),
        "utf-8"
      );
      expect(src).toContain("SHIELD_REGEN_RATE = 2.5");
      expect(src).toContain("SHIELD_REGEN_DELAY = 4.0");
      expect(src).toContain("MAX_SHIELD = 100");
    });

    test("Player has updateShieldRegen method", () => {
      const player = createPlayer();
      expect(typeof player.updateShieldRegen).toBe("function");
    });

    test("Player has isShieldRegenerating getter", () => {
      const player = createPlayer();
      expect(typeof player.isShieldRegenerating).toBe("boolean");
    });

    test("RaptorGame.ts calls updateShieldRegen in updatePlaying", () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );
      expect(src).toContain("player.updateShieldRegen(dt)");
    });

    test("RaptorGame.ts passes isShieldRegenerating to HUD render", () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );
      expect(src).toContain("player.isShieldRegenerating");
    });

    test("reset() clears shieldRegenTimer", () => {
      const player = createPlayer();
      player.shield = 50;

      // Build up regen timer
      simulateTime(player, SHIELD_REGEN_DELAY);
      expect(player.isShieldRegenerating).toBe(true);

      // Reset
      player.reset(CANVAS_W, CANVAS_H);
      expect(player.shield).toBe(100);
      expect(player.isShieldRegenerating).toBe(false);
    });

    test("takeDamage resets shieldRegenTimer (verified via isShieldRegenerating)", () => {
      const player = createPlayer();
      player.shield = 80;

      // Build up timer past delay
      simulateTime(player, SHIELD_REGEN_DELAY);
      expect(player.isShieldRegenerating).toBe(true);

      // Take damage
      player.takeDamage(5);
      expect(player.isShieldRegenerating).toBe(false);

      // 3.9s should not be enough
      simulateTime(player, 3.9);
      expect(player.isShieldRegenerating).toBe(false);
    });

    test("god mode does not block regen (god mode prevents damage, timer never resets)", () => {
      const player = createPlayer();
      player.shield = 50;
      player.godMode = true;

      // godMode prevents takeDamage from resetting timer
      player.takeDamage(10);
      expect(player.shield).toBe(50); // no damage taken

      // Timer should still accumulate
      simulateTime(player, SHIELD_REGEN_DELAY + 1.0);
      expect(player.shield).toBeGreaterThan(50);
    });

    test("regen rate matches spec: ~2.5 points per second", () => {
      const player = createPlayer();
      player.shield = 0;

      // Get past the delay
      simulateTime(player, SHIELD_REGEN_DELAY);

      const start = player.shield;
      simulateTime(player, 10.0);
      const end = player.shield;

      // 10 seconds at 2.5/sec = 25 points
      expect(end - start).toBeCloseTo(25.0, 0);
    });

    test("HUD.ts renderShieldBar accepts isRegenerating parameter", () => {
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/rendering/HUD.ts"),
        "utf-8"
      );
      expect(src).toContain("isRegenerating");
      expect(src).toContain("rgba(52, 152, 219,");
    });
  });

  describe("Edge cases", () => {
    test("shield does not go negative via regen (already handled by design)", () => {
      const player = createPlayer();
      player.shield = 0;

      simulateTime(player, SHIELD_REGEN_DELAY + 5.0);

      expect(player.shield).toBeGreaterThanOrEqual(0);
      expect(player.shield).toBeLessThanOrEqual(MAX_SHIELD);
    });

    test("fractional shield values work correctly during regen", () => {
      const player = createPlayer();
      player.shield = 98;

      simulateTime(player, SHIELD_REGEN_DELAY + 0.2);

      // 0.2s * 2.5 = 0.5 → shield ≈ 98.5
      expect(player.shield).toBeGreaterThan(98);
      expect(player.shield).toBeLessThan(100);
    });

    test("very small dt values accumulate correctly", () => {
      const player = createPlayer();
      player.shield = 50;

      // Use very small steps (1ms)
      simulateTime(player, SHIELD_REGEN_DELAY + 2.0, 0.001);

      // 2 seconds of regen at 2.5/sec = 5 points
      expect(player.shield).toBeCloseTo(55.0, 0);
    });

    test("shield-restore during regen does not break state", () => {
      const player = createPlayer();
      player.shield = 30;

      // Start regen
      simulateTime(player, SHIELD_REGEN_DELAY + 1.0);
      expect(player.shield).toBeGreaterThan(30);

      // Power-up sets to 100
      player.shield = 100;

      // Further regen should be no-op
      simulateTime(player, 2.0);
      expect(player.shield).toBe(100);
    });
  });
});
