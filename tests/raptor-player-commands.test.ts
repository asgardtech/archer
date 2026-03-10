/**
 * Tests for Issue #433 — Developer console commands for player state
 * (god mode, lives, shield, heal, kill)
 */

import { Player } from "../src/games/raptor/entities/Player";
import { CommandRegistry, CommandContext, registerPlayerCommands } from "../src/games/raptor/systems/CommandRegistry";
import { PowerUpManager } from "../src/games/raptor/systems/PowerUpManager";
import { WeaponSystem } from "../src/games/raptor/systems/WeaponSystem";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

function makePlayer(): Player {
  return new Player(CANVAS_WIDTH, CANVAS_HEIGHT);
}

function makeContext(player: Player, overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    currentLevel: 0,
    levelCount: 5,
    levels: [{ level: 1, name: "Test" }] as any,
    startLevel: () => {},
    setState: () => {},
    startMusic: () => {},
    stopMusic: () => {},
    gameState: "playing",
    player,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    powerUpManager: new PowerUpManager(),
    weaponSystem: new WeaponSystem(),
    ...overrides,
  };
}

function makeRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registerPlayerCommands(registry);
  return registry;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: God Mode
// ═══════════════════════════════════════════════════════════════════════════

describe("God Mode", () => {
  test("Toggle god mode ON", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("god", ctx);
    expect(result).toEqual(["God mode: ON"]);
    expect(player.godMode).toBe(true);
  });

  test("Toggle god mode OFF", () => {
    const player = makePlayer();
    player.godMode = true;
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("god", ctx);
    expect(result).toEqual(["God mode: OFF"]);
    expect(player.godMode).toBe(false);
  });

  test("God mode prevents all damage", () => {
    const player = makePlayer();
    player.godMode = true;

    const died = player.takeDamage(50);
    expect(died).toBe(false);
    expect(player.shield).toBe(100);
    expect(player.lives).toBe(3);
  });

  test("God mode does not interfere with normal invincibility timer", () => {
    const player = makePlayer();
    player.invincibilityTimer = 1.5;

    player.update(1.0, player.pos.x, player.pos.y, CANVAS_WIDTH, CANVAS_HEIGHT);
    expect(player.invincibilityTimer).toBeCloseTo(0.5, 1);
    expect(player.isInvincible).toBe(true);
  });

  test("God mode persists across level transitions (non-full reset)", () => {
    const player = makePlayer();
    player.godMode = true;

    player.reset(CANVAS_WIDTH, CANVAS_HEIGHT, false);
    expect(player.godMode).toBe(true);
  });

  test("God mode is cleared on full game reset", () => {
    const player = makePlayer();
    player.godMode = true;

    player.reset(CANVAS_WIDTH, CANVAS_HEIGHT, true);
    expect(player.godMode).toBe(false);
  });

  test("God mode command rejected outside playing state", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player, { gameState: "menu" });

    const result = registry.dispatch("god", ctx);
    expect(result).toEqual(["Command only available while playing"]);
    expect(player.godMode).toBe(false);
  });

  test("God mode rejected in gameover state", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player, { gameState: "gameover" });

    const result = registry.dispatch("god", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });

  test("Player property godMode defaults to false", () => {
    const player = makePlayer();
    expect(player.godMode).toBe(false);
  });

  test("God mode blocks damage but takeDamage still returns false", () => {
    const player = makePlayer();
    player.godMode = true;

    const result = player.takeDamage(200);
    expect(result).toBe(false);
    expect(player.alive).toBe(true);
    expect(player.shield).toBe(100);
    expect(player.lives).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Lives Command
// ═══════════════════════════════════════════════════════════════════════════

describe("Lives Command", () => {
  test("Set lives to a valid number", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives 10", ctx);
    expect(result).toEqual(["Lives set to 10"]);
    expect(player.lives).toBe(10);
  });

  test("Set lives to minimum valid value (1)", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives 1", ctx);
    expect(result).toEqual(["Lives set to 1"]);
    expect(player.lives).toBe(1);
  });

  test("Set lives to maximum valid value (99)", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives 99", ctx);
    expect(result).toEqual(["Lives set to 99"]);
    expect(player.lives).toBe(99);
  });

  test("Query current lives with no argument", () => {
    const player = makePlayer();
    player.lives = 5;
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives", ctx);
    expect(result).toEqual(["Lives: 5"]);
  });

  test("Set lives with value below minimum (0)", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives 0", ctx);
    expect(result).toEqual(["Lives must be between 1 and 99"]);
    expect(player.lives).toBe(3);
  });

  test("Set lives with value above maximum (100)", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives 100", ctx);
    expect(result).toEqual(["Lives must be between 1 and 99"]);
    expect(player.lives).toBe(3);
  });

  test("Set lives with non-numeric argument", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives abc", ctx);
    expect(result).toEqual(["Lives must be between 1 and 99"]);
    expect(player.lives).toBe(3);
  });

  test("Set lives with negative number", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives -5", ctx);
    expect(result).toEqual(["Lives must be between 1 and 99"]);
    expect(player.lives).toBe(3);
  });

  test("Set lives revives a dead player", () => {
    const player = makePlayer();
    player.alive = false;
    player.lives = 0;
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("lives 5", ctx);
    expect(result).toEqual(["Lives set to 5"]);
    expect(player.alive).toBe(true);
    expect(player.lives).toBe(5);
    expect(player.pos.x).toBeCloseTo(CANVAS_WIDTH / 2);
    expect(player.pos.y).toBeCloseTo(CANVAS_HEIGHT * 0.8);
    expect(player.invincibilityTimer).toBe(2.0);
  });

  test("Lives command rejected outside playing state", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player, { gameState: "gameover" });

    const result = registry.dispatch("lives 10", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Shield Command
// ═══════════════════════════════════════════════════════════════════════════

describe("Shield Command", () => {
  test("Set shield to a valid number", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield 50", ctx);
    expect(result).toEqual(["Shield set to 50"]);
    expect(player.shield).toBe(50);
  });

  test("Set shield to zero", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield 0", ctx);
    expect(result).toEqual(["Shield set to 0"]);
    expect(player.shield).toBe(0);
  });

  test("Set shield to maximum (100)", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield 100", ctx);
    expect(result).toEqual(["Shield set to 100"]);
    expect(player.shield).toBe(100);
  });

  test("Query current shield with no argument", () => {
    const player = makePlayer();
    player.shield = 75;
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield", ctx);
    expect(result).toEqual(["Shield: 75"]);
  });

  test("Set shield with value below minimum (-1)", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield -1", ctx);
    expect(result).toEqual(["Shield must be between 0 and 100"]);
    expect(player.shield).toBe(100);
  });

  test("Set shield with value above maximum (101)", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield 101", ctx);
    expect(result).toEqual(["Shield must be between 0 and 100"]);
    expect(player.shield).toBe(100);
  });

  test("Set shield with non-numeric argument", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield xyz", ctx);
    expect(result).toEqual(["Shield must be between 0 and 100"]);
    expect(player.shield).toBe(100);
  });

  test("Shield command rejected outside playing state", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player, { gameState: "menu" });

    const result = registry.dispatch("shield 50", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Heal Command
// ═══════════════════════════════════════════════════════════════════════════

describe("Heal Command", () => {
  test("Heal fully restores the player", () => {
    const player = makePlayer();
    player.shield = 30;
    player.lives = 1;
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("heal", ctx);
    expect(result).toEqual(["Player fully healed (shield: 100, +1 life)"]);
    expect(player.shield).toBe(100);
    expect(player.lives).toBe(2);
  });

  test("Heal when already at full shield", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("heal", ctx);
    expect(result).toEqual(["Player fully healed (shield: 100, +1 life)"]);
    expect(player.shield).toBe(100);
    expect(player.lives).toBe(4);
  });

  test("Heal command rejected outside playing state", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player, { gameState: "gameover" });

    const result = registry.dispatch("heal", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: Kill Command
// ═══════════════════════════════════════════════════════════════════════════

describe("Kill Command", () => {
  test("Kill the player immediately", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("kill", ctx);
    expect(result).toEqual(["Player killed"]);
    expect(player.alive).toBe(false);
    expect(player.lives).toBe(0);
  });

  test("Kill bypasses god mode", () => {
    const player = makePlayer();
    player.godMode = true;
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("kill", ctx);
    expect(result).toEqual(["Player killed"]);
    expect(player.alive).toBe(false);
    expect(player.lives).toBe(0);
  });

  test("Kill command rejected outside playing state", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player, { gameState: "menu" });

    const result = registry.dispatch("kill", ctx);
    expect(result).toEqual(["Command only available while playing"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Integration Scenarios
// ═══════════════════════════════════════════════════════════════════════════

describe("Integration Scenarios", () => {
  test("Kill then revive with lives command", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    registry.dispatch("kill", ctx);
    expect(player.alive).toBe(false);
    expect(player.lives).toBe(0);

    registry.dispatch("lives 3", ctx);
    expect(player.alive).toBe(true);
    expect(player.lives).toBe(3);
  });

  test("God mode then take damage from enemy", () => {
    const player = makePlayer();
    player.godMode = true;

    const died = player.takeDamage(50);
    expect(died).toBe(false);
    expect(player.shield).toBe(100);
    expect(player.lives).toBe(3);
  });

  test("Shield 0 then take damage reduces lives", () => {
    const player = makePlayer();
    player.shield = 0;

    const died = player.takeDamage(25);
    expect(died).toBe(false);
    expect(player.lives).toBe(2);
    expect(player.shield).toBe(100);
  });

  test("Multiple god toggles", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    registry.dispatch("god", ctx);
    expect(player.godMode).toBe(true);

    registry.dispatch("god", ctx);
    expect(player.godMode).toBe(false);

    registry.dispatch("god", ctx);
    expect(player.godMode).toBe(true);
  });

  test("Shield command does not conflict with powerup shield alias", () => {
    const player = makePlayer();
    const registry = makeRegistry();
    const ctx = makeContext(player);

    const result = registry.dispatch("shield 50", ctx);
    expect(result).toEqual(["Shield set to 50"]);
    expect(player.shield).toBe(50);
  });

  test("God mode + full reset clears god mode and resets lives", () => {
    const player = makePlayer();
    player.godMode = true;
    player.lives = 10;

    player.reset(CANVAS_WIDTH, CANVAS_HEIGHT, true);
    expect(player.godMode).toBe(false);
    expect(player.lives).toBe(3);
  });

  test("God mode + non-full reset preserves god mode but resets shield", () => {
    const player = makePlayer();
    player.godMode = true;
    player.shield = 50;
    player.lives = 10;

    player.reset(CANVAS_WIDTH, CANVAS_HEIGHT, false);
    expect(player.godMode).toBe(true);
    expect(player.shield).toBe(100);
    expect(player.lives).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: God Mode Visual Indicator
// ═══════════════════════════════════════════════════════════════════════════

describe("God Mode Visual Indicator", () => {
  function mockCtx(): CanvasRenderingContext2D {
    const calls: Array<{ method: string; args: any[] }> = [];
    return new Proxy({} as any, {
      get(_target, prop) {
        if (typeof prop === "string") {
          if (["save", "restore", "beginPath", "closePath", "fill", "stroke",
               "moveTo", "lineTo", "arc", "ellipse", "fillRect", "translate",
               "rotate", "drawImage", "clearRect"].includes(prop)) {
            return (...args: any[]) => { calls.push({ method: prop, args }); };
          }
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => new Proxy({}, { get: () => () => {} });
          }
          if (prop === "_calls") return calls;
        }
        return undefined;
      },
      set() { return true; },
    });
  }

  test("God mode visual indicator is drawn when god mode is ON", () => {
    const player = makePlayer();
    player.godMode = true;

    const ctx = mockCtx();
    player.render(ctx);

    const calls = (ctx as any)._calls as Array<{ method: string }>;
    const ellipseCalls = calls.filter(c => c.method === "ellipse");
    expect(ellipseCalls.length).toBeGreaterThan(0);
  });

  test("No god mode glow when god mode is OFF", () => {
    const player = makePlayer();
    player.godMode = false;

    const fillStyles: string[] = [];
    const calls: Array<{ method: string; args: any[] }> = [];
    const ctx = new Proxy({} as any, {
      get(_target, prop) {
        if (typeof prop === "string") {
          if (["save", "restore", "beginPath", "closePath", "fill", "stroke",
               "moveTo", "lineTo", "arc", "ellipse", "fillRect", "translate",
               "rotate", "drawImage", "clearRect"].includes(prop)) {
            return (...args: any[]) => { calls.push({ method: prop, args }); };
          }
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => new Proxy({}, { get: () => () => {} });
          }
        }
        return undefined;
      },
      set(_target, prop, value) {
        if (prop === "fillStyle" && typeof value === "string") {
          fillStyles.push(value);
        }
        return true;
      },
    });
    player.render(ctx);

    expect(fillStyles).not.toContain("#ffd700");
  });

  test("God mode glow not drawn when player is dead", () => {
    const player = makePlayer();
    player.godMode = true;
    player.alive = false;

    const ctx = mockCtx();
    player.render(ctx);

    const calls = (ctx as any)._calls as Array<{ method: string }>;
    expect(calls.length).toBe(0);
  });
});
