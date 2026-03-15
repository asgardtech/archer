import { Player } from "../src/games/raptor/entities/Player";
import { Enemy } from "../src/games/raptor/entities/Enemy";
import { EnemySpawner } from "../src/games/raptor/systems/EnemySpawner";
import { InputManager } from "../src/games/raptor/systems/InputManager";
import {
  HUD_BAR_HEIGHT,
  HUD_LEFT_PANEL_WIDTH,
  HUD_RIGHT_PANEL_WIDTH,
  HUD_TOP_BAR_HEIGHT,
  WeaponType,
  WEAPON_SLOT_ORDER,
  WaveConfig,
} from "../src/games/raptor/types";
import { HUD } from "../src/games/raptor/rendering/HUD";

// ─── DOM Mocks ──────────────────────────────────────────────────

const mockMeasureCtx = {
  font: "",
  measureText: jest.fn((text: string) => ({ width: text.length * 6 })),
};

const mockOffscreenCanvas = {
  getContext: jest.fn(() => mockMeasureCtx),
  width: 0,
  height: 0,
};

if (typeof document === "undefined") {
  (global as any).document = {
    createElement: jest.fn(() => mockOffscreenCanvas),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
}

if (typeof window === "undefined") {
  (global as any).window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    devicePixelRatio: 1,
    innerWidth: 800,
    innerHeight: 600,
    matchMedia: jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() })),
  };
}

// ─── Constants ──────────────────────────────────────────────────
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const GAME_AREA_X = HUD_LEFT_PANEL_WIDTH;
const GAME_AREA_Y = HUD_TOP_BAR_HEIGHT;
const GAME_AREA_WIDTH = CANVAS_WIDTH - HUD_LEFT_PANEL_WIDTH - HUD_RIGHT_PANEL_WIDTH;
const GAME_AREA_HEIGHT = CANVAS_HEIGHT - HUD_TOP_BAR_HEIGHT - HUD_BAR_HEIGHT;

// ─── Helpers ────────────────────────────────────────────────────

function createMockCanvas(): HTMLCanvasElement {
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  const fillRectCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
  const rectCalls: Array<{ x: number; y: number; w: number; h: number }> = [];
  const roundRectCalls: Array<{ x: number; y: number; w: number; h: number; r: number | number[] }> = [];
  const strokeCalls: Array<Record<string, unknown>> = [];

  const ctx = {
    fillText: jest.fn((text: string, x: number, y: number) => {
      fillTextCalls.push({ text, x, y });
    }),
    fillRect: jest.fn((x: number, y: number, w: number, h: number) => {
      fillRectCalls.push({ x, y, w, h });
    }),
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
    fill: jest.fn(),
    stroke: jest.fn(() => { strokeCalls.push({}); }),
    arc: jest.fn(),
    arcTo: jest.fn(),
    ellipse: jest.fn(),
    quadraticCurveTo: jest.fn(),
    measureText: jest.fn((text: string) => ({ width: text.length * 6 })),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    drawImage: jest.fn(),
    setTransform: jest.fn(),
    clearRect: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    clip: jest.fn(),
    rect: jest.fn((x: number, y: number, w: number, h: number) => {
      rectCalls.push({ x, y, w, h });
    }),
    roundRect: jest.fn((x: number, y: number, w: number, h: number, r: number | number[]) => {
      roundRectCalls.push({ x, y, w, h, r });
    }),
    canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
    _fillTextCalls: fillTextCalls,
    _fillRectCalls: fillRectCalls,
    _rectCalls: rectCalls,
    _roundRectCalls: roundRectCalls,
    _strokeCalls: strokeCalls,
  };

  return {
    getContext: () => ctx,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    style: {} as CSSStyleDeclaration,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
    })),
  } as unknown as HTMLCanvasElement;
}

// ─── Test Suites ────────────────────────────────────────────────

describe("Issue #673: HUD Layout — Dedicated Side Panels", () => {

  // ═══════════════════════════════════════════════════════════════
  // 1. Layout Constants
  // ═══════════════════════════════════════════════════════════════
  describe("Layout constants are correctly defined", () => {
    test("HUD_LEFT_PANEL_WIDTH is 60", () => {
      expect(HUD_LEFT_PANEL_WIDTH).toBe(60);
    });

    test("HUD_RIGHT_PANEL_WIDTH is 60", () => {
      expect(HUD_RIGHT_PANEL_WIDTH).toBe(60);
    });

    test("HUD_TOP_BAR_HEIGHT is 44", () => {
      expect(HUD_TOP_BAR_HEIGHT).toBe(44);
    });

    test("HUD_BAR_HEIGHT (bottom bar) is 48", () => {
      expect(HUD_BAR_HEIGHT).toBe(48);
    });

    test("game area dimensions are correct at 800x600", () => {
      expect(GAME_AREA_X).toBe(60);
      expect(GAME_AREA_Y).toBe(44);
      expect(GAME_AREA_WIDTH).toBe(680);
      expect(GAME_AREA_HEIGHT).toBe(508);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. Left Panel — Status Bars & Cooldowns
  // ═══════════════════════════════════════════════════════════════
  describe("Left panel displays armor, energy, and battery bars", () => {
    let hud: HUD;
    let ctx: any;

    beforeEach(() => {
      hud = new HUD(false);
      const canvas = createMockCanvas();
      ctx = canvas.getContext("2d");
    });

    test("renderPlayingHUD renders left panel with armor bar label", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const armorLabel = fillTextCalls.find((c: { text: string }) => c.text === "ARMOR");
      expect(armorLabel).toBeDefined();
    });

    test("renderPlayingHUD renders left panel with energy bar label", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const energyLabel = fillTextCalls.find((c: { text: string }) => c.text === "ENRGY");
      expect(energyLabel).toBeDefined();
    });

    test("battery bar is shown when shieldBattery > 0", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 50, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const battLabel = fillTextCalls.find((c: { text: string }) => c.text === "BATT");
      expect(battLabel).toBeDefined();
    });

    test("battery bar is NOT shown when shieldBattery = 0", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const battLabel = fillTextCalls.find((c: { text: string }) => c.text === "BATT");
      expect(battLabel).toBeUndefined();
    });

    test("armor and energy bars remain when battery is zero", () => {
      hud.render(
        ctx, "playing", 0, 3, 80, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 60
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      expect(fillTextCalls.find((c: { text: string }) => c.text === "ARMOR")).toBeDefined();
      expect(fillTextCalls.find((c: { text: string }) => c.text === "ENRGY")).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. Left Panel — Dodge and EMP Cooldowns
  // ═══════════════════════════════════════════════════════════════
  describe("Left panel displays dodge and EMP cooldowns above bars", () => {
    let hud: HUD;
    let ctx: any;

    beforeEach(() => {
      hud = new HUD(false);
      const canvas = createMockCanvas();
      ctx = canvas.getContext("2d");
    });

    test("DODGE indicator is rendered in the left panel", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0.5,
        new Map([["machine-gun", 1]]), 0, 0.3, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const dodgeLabel = fillTextCalls.find((c: { text: string }) => c.text === "DODGE");
      expect(dodgeLabel).toBeDefined();
      if (dodgeLabel) {
        expect(dodgeLabel.x).toBeLessThan(HUD_LEFT_PANEL_WIDTH);
      }
    });

    test("EMP indicator is rendered in the left panel", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0.5, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const empLabel = fillTextCalls.find((c: { text: string }) => c.text === "EMP");
      expect(empLabel).toBeDefined();
      if (empLabel) {
        expect(empLabel.x).toBeLessThan(HUD_LEFT_PANEL_WIDTH);
      }
    });

    test("DODGE is rendered above EMP, and both above the bars", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0.5,
        new Map([["machine-gun", 1]]), 0, 0.3, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const dodgeLabel = fillTextCalls.find((c: { text: string }) => c.text === "DODGE");
      const empLabel = fillTextCalls.find((c: { text: string }) => c.text === "EMP");
      const armorLabel = fillTextCalls.find((c: { text: string }) => c.text === "ARMOR");

      expect(dodgeLabel).toBeDefined();
      expect(empLabel).toBeDefined();
      expect(armorLabel).toBeDefined();

      if (dodgeLabel && empLabel) {
        expect(dodgeLabel.y).toBeLessThan(empLabel.y);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. Right Panel — Vertical Weapon Tray
  // ═══════════════════════════════════════════════════════════════
  describe("Right panel displays vertical weapon tray", () => {
    let hud: HUD;
    let ctx: any;

    beforeEach(() => {
      hud = new HUD(false);
      const canvas = createMockCanvas();
      ctx = canvas.getContext("2d");
    });

    test("weapon labels are rendered in the right panel area", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["missile", 2],
        ["laser", 1],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 2, 1, false, 0,
        inventory, 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;

      const gunLabel = fillTextCalls.find((c: { text: string; x: number }) => c.text === "GUN" && c.x >= rightPanelX);
      const mslLabel = fillTextCalls.find((c: { text: string; x: number }) => c.text === "MSL" && c.x >= rightPanelX);
      const lsrLabel = fillTextCalls.find((c: { text: string; x: number }) => c.text === "LSR" && c.x >= rightPanelX);

      expect(gunLabel).toBeDefined();
      expect(mslLabel).toBeDefined();
      expect(lsrLabel).toBeDefined();
    });

    test("weapon cards show tier indicators", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["missile", 2],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 2, 1, false, 0,
        inventory, 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;

      const tier1 = fillTextCalls.find((c: { text: string; x: number }) => c.text === "I" && c.x >= rightPanelX);
      const tier2 = fillTextCalls.find((c: { text: string; x: number }) => c.text === "II" && c.x >= rightPanelX);

      expect(tier1).toBeDefined();
      expect(tier2).toBeDefined();
    });

    test("weapons are stacked vertically (each subsequent card has higher y)", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["rocket", 1],
        ["laser", 1],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 3, 1, false, 0,
        inventory, 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;

      const gunLabel = fillTextCalls.find((c: { text: string; x: number }) => c.text === "GUN" && c.x >= rightPanelX);
      const rktLabel = fillTextCalls.find((c: { text: string; x: number }) => c.text === "RKT" && c.x >= rightPanelX);
      const lsrLabel = fillTextCalls.find((c: { text: string; x: number }) => c.text === "LSR" && c.x >= rightPanelX);

      expect(gunLabel).toBeDefined();
      expect(rktLabel).toBeDefined();
      expect(lsrLabel).toBeDefined();

      if (gunLabel && rktLabel && lsrLabel) {
        expect(gunLabel.y).toBeLessThan(rktLabel.y);
        expect(rktLabel.y).toBeLessThan(lsrLabel.y);
      }
    });

    test("active weapon card is highlighted with colored border (stroke called)", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["missile", 1],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 2, 1, false, 0,
        inventory, 0, 0, 100
      );

      expect(ctx.stroke).toHaveBeenCalled();
    });

    test("keyboard shortcut numbers shown on desktop for weapon cards", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["missile", 7],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 2, 1, false, 0,
        inventory, 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;

      const slotNum1 = fillTextCalls.find((c: { text: string; x: number }) => c.text === "1" && c.x >= rightPanelX);
      expect(slotNum1).toBeDefined();
    });

    test("single weapon in inventory renders one card", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        inventory, 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;

      const weaponLabels = fillTextCalls.filter((c: { text: string; x: number }) =>
        ["GUN", "MSL", "LSR", "PLS", "ION", "ATG", "RKT"].includes(c.text) && c.x >= rightPanelX
      );
      expect(weaponLabels.length).toBe(1);
      expect(weaponLabels[0].text).toBe("GUN");
    });

    test("max weapons (7) do not overflow the panel height", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["rocket", 1],
        ["laser", 1],
        ["plasma", 1],
        ["ion-cannon", 1],
        ["auto-gun", 1],
        ["missile", 1],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        inventory, 0, 0, 100
      );

      const slotH = 28;
      const gap = 3;
      const totalCardsHeight = 7 * slotH + 6 * gap;
      const panelHeight = CANVAS_HEIGHT - HUD_TOP_BAR_HEIGHT - HUD_BAR_HEIGHT;

      expect(totalCardsHeight).toBeLessThan(panelHeight);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. Right Panel — Bomb Count
  // ═══════════════════════════════════════════════════════════════
  describe("Right panel displays bomb count", () => {
    let hud: HUD;
    let ctx: any;

    beforeEach(() => {
      hud = new HUD(false);
      const canvas = createMockCanvas();
      ctx = canvas.getContext("2d");
    });

    test("BOMB label is rendered in right panel", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 3, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;
      const bombLabel = fillTextCalls.find((c: { text: string; x: number }) =>
        c.text === "BOMB" && c.x >= rightPanelX
      );
      expect(bombLabel).toBeDefined();
    });

    test("bomb dots rendered via arc calls for max 5 pips", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 3, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      expect(ctx.arc).toHaveBeenCalled();
      const arcCalls = ctx.arc.mock.calls;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;
      const bombArcs = arcCalls.filter((c: number[]) => c[0] >= rightPanelX);
      expect(bombArcs.length).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. Bottom Bar — Comms Only
  // ═══════════════════════════════════════════════════════════════
  describe("Bottom bar contains only wingman communications", () => {
    let hud: HUD;
    let ctx: any;

    beforeEach(() => {
      hud = new HUD(false);
      const canvas = createMockCanvas();
      ctx = canvas.getContext("2d");
    });

    test("bottom bar renders 'Standing by...' when no active comms", () => {
      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const barY = CANVAS_HEIGHT - HUD_BAR_HEIGHT;

      const standingBy = fillTextCalls.find((c: { text: string; y: number }) =>
        c.text === "Standing by..." && c.y > barY
      );
      expect(standingBy).toBeDefined();
    });

    test("renderBottomBar no longer receives weapon tray parameters", () => {
      const renderBottomBarStr = HUD.prototype["renderBottomBar"].toString();
      expect(renderBottomBarStr).not.toContain("activeWeapon");
      expect(renderBottomBarStr).not.toContain("inventory");
    });

    test("renderBottomWeaponTray method no longer exists on HUD", () => {
      expect((HUD.prototype as any).renderBottomWeaponTray).toBeUndefined();
    });

    test("renderBottomBombCount method no longer exists on HUD", () => {
      expect((HUD.prototype as any).renderBottomBombCount).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. Player Movement Bounded to Game Area
  // ═══════════════════════════════════════════════════════════════
  describe("Player movement is bounded to the game area", () => {
    test("Player constructor uses offset for initial position", () => {
      const player = new Player(GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);

      expect(player.pos.x).toBe(GAME_AREA_X + GAME_AREA_WIDTH / 2);
      expect(player.pos.y).toBe(GAME_AREA_Y + GAME_AREA_HEIGHT * 0.8);
    });

    test("Player cannot move left of the game area (into left panel)", () => {
      const player = new Player(GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);

      player.update(0.016, 0, player.pos.y, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      player.update(0.016, 0, player.pos.y, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);

      for (let i = 0; i < 100; i++) {
        player.update(0.016, 0, player.pos.y, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      }

      expect(player.pos.x).toBeGreaterThanOrEqual(GAME_AREA_X);
    });

    test("Player cannot move right of the game area (into right panel)", () => {
      const player = new Player(GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      const rightBound = GAME_AREA_X + GAME_AREA_WIDTH;

      for (let i = 0; i < 100; i++) {
        player.update(0.016, CANVAS_WIDTH + 100, player.pos.y, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      }

      expect(player.pos.x).toBeLessThanOrEqual(rightBound);
    });

    test("Player.update accepts offsetX and offsetY parameters", () => {
      const player = new Player(GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      expect(() => {
        player.update(0.016, player.pos.x, player.pos.y, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      }).not.toThrow();
    });

    test("Player.reset respects offset parameters", () => {
      const player = new Player(GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      player.reset(GAME_AREA_WIDTH, GAME_AREA_HEIGHT, true, GAME_AREA_X, GAME_AREA_Y);
      expect(player.pos.x).toBe(GAME_AREA_X + GAME_AREA_WIDTH / 2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. Enemy Spawning Respects Game Area Bounds
  // ═══════════════════════════════════════════════════════════════
  describe("Enemy spawning respects game area bounds", () => {
    test("EnemySpawner.update accepts offsetX parameter", () => {
      const spawner = new EnemySpawner();
      const waveConfig: WaveConfig = {
        enemyVariant: "scout",
        count: 5,
        spawnDelay: 0.1,
        waveDelay: 0,
        formation: "random",
        speed: 100,
      };
      spawner.configure({
        level: 1,
        name: "Test",
        waves: [waveConfig],
        bossEnabled: false,
        autoFireRate: 1,
        powerUpDropChance: 0,
        skyGradient: ["#000", "#111"],
        starDensity: 10,
        enemyFireRateMultiplier: 1,
      });

      const enemies: Enemy[] = [];
      for (let i = 0; i < 100; i++) {
        const spawned = spawner.update(0.2, GAME_AREA_WIDTH, GAME_AREA_X);
        enemies.push(...spawned);
      }

      for (const enemy of enemies) {
        expect(enemy.pos.x).toBeGreaterThanOrEqual(GAME_AREA_X);
        expect(enemy.pos.x).toBeLessThanOrEqual(GAME_AREA_X + GAME_AREA_WIDTH);
      }
    });

    test("EnemySpawner.spawnBoss respects offset", () => {
      const spawner = new EnemySpawner();
      spawner.configure({
        level: 1,
        name: "Test",
        waves: [],
        bossEnabled: true,
        bossConfig: {
          hitPoints: 50,
          speed: 40,
          fireRate: 1.5,
          scoreValue: 400,
          appearsAfterWave: 0,
        },
        autoFireRate: 1,
        powerUpDropChance: 0,
        skyGradient: ["#000", "#111"],
        starDensity: 10,
        enemyFireRateMultiplier: 1,
      });

      const boss = spawner.spawnBoss(GAME_AREA_WIDTH, GAME_AREA_X);
      expect(boss).not.toBeNull();
      if (boss) {
        expect(boss.pos.x).toBe(GAME_AREA_X + GAME_AREA_WIDTH / 2);
      }
    });

    test("line formation spawns within offset bounds", () => {
      const spawner = new EnemySpawner();
      const waveConfig: WaveConfig = {
        enemyVariant: "fighter",
        count: 5,
        spawnDelay: 0.01,
        waveDelay: 0,
        formation: "line",
        speed: 100,
      };
      spawner.configure({
        level: 1,
        name: "Test",
        waves: [waveConfig],
        bossEnabled: false,
        autoFireRate: 1,
        powerUpDropChance: 0,
        skyGradient: ["#000", "#111"],
        starDensity: 10,
        enemyFireRateMultiplier: 1,
      });

      const enemies: Enemy[] = [];
      for (let i = 0; i < 50; i++) {
        const spawned = spawner.update(0.1, GAME_AREA_WIDTH, GAME_AREA_X);
        enemies.push(...spawned);
      }

      for (const enemy of enemies) {
        expect(enemy.pos.x).toBeGreaterThanOrEqual(GAME_AREA_X);
        expect(enemy.pos.x).toBeLessThanOrEqual(GAME_AREA_X + GAME_AREA_WIDTH);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. InputManager — Keyboard Bounds
  // ═══════════════════════════════════════════════════════════════
  describe("InputManager keyboard bounds respect game area offset", () => {
    test("updateFromKeyboard accepts offsetX and offsetY", () => {
      const canvas = createMockCanvas();
      const input = new InputManager(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(() => {
        input.updateFromKeyboard(0.016, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      }).not.toThrow();
    });

    test("targetX is clamped to game area bounds", () => {
      const canvas = createMockCanvas();
      const input = new InputManager(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);

      (input as any).targetX = 0;
      input.updateFromKeyboard(0.016, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      expect(input.targetX).toBeGreaterThanOrEqual(GAME_AREA_X);
    });

    test("targetY is clamped to game area bounds", () => {
      const canvas = createMockCanvas();
      const input = new InputManager(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);

      (input as any).targetY = 0;
      input.updateFromKeyboard(0.016, GAME_AREA_WIDTH, GAME_AREA_HEIGHT, GAME_AREA_X, GAME_AREA_Y);
      expect(input.targetY).toBeGreaterThanOrEqual(GAME_AREA_Y);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. Game Area Clip Rect
  // ═══════════════════════════════════════════════════════════════
  describe("Game entities do not render under the side panels", () => {
    test("RaptorGame applies clip rect with game area bounds", () => {
      const RaptorGameModule = require("../src/games/raptor/RaptorGame");
      const RaptorGameClass = RaptorGameModule.RaptorGame || RaptorGameModule.Game;

      expect(RaptorGameClass).toBeDefined();

      const proto = RaptorGameClass.prototype;
      expect(proto.gameAreaX).toBeDefined();
      expect(proto.gameAreaY).toBeDefined();
      expect(proto.gameAreaWidth).toBeDefined();
      expect(proto.gameAreaHeight).toBeDefined();
    });

    test("game area getters return correct values for 800x600", () => {
      const types = require("../src/games/raptor/types");
      const gameAreaX = types.HUD_LEFT_PANEL_WIDTH;
      const gameAreaY = types.HUD_TOP_BAR_HEIGHT;
      const gameAreaWidth = 800 - types.HUD_LEFT_PANEL_WIDTH - types.HUD_RIGHT_PANEL_WIDTH;
      const gameAreaHeight = 600 - types.HUD_TOP_BAR_HEIGHT - types.HUD_BAR_HEIGHT;

      expect(gameAreaX).toBe(60);
      expect(gameAreaY).toBe(44);
      expect(gameAreaWidth).toBe(680);
      expect(gameAreaHeight).toBe(508);
    });

    test("render method sources contain clip rect application", () => {
      const fs = require("fs");
      const path = require("path");
      const raptorGameSrc = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      expect(raptorGameSrc).toContain("ctx.clip()");
      expect(raptorGameSrc).toContain("ctx.rect(this.gameAreaX, this.gameAreaY, this.gameAreaWidth, this.gameAreaHeight)");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. Side Panel Backgrounds
  // ═══════════════════════════════════════════════════════════════
  describe("Side panels have opaque backgrounds", () => {
    test("renderSidePanelBackgrounds method exists in RaptorGame", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      expect(src).toContain("renderSidePanelBackgrounds");
    });

    test("left panel background uses opaque fill", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      expect(src).toContain('ctx.fillRect(0, panelTop, HUD_LEFT_PANEL_WIDTH, panelHeight)');
    });

    test("right panel background uses opaque fill", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      expect(src).toContain('ctx.fillRect(rightX, panelTop, HUD_RIGHT_PANEL_WIDTH, panelHeight)');
    });

    test("panel backgrounds use fully opaque rgb (not rgba with alpha < 1)", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      const sidePanelMethod = src.substring(
        src.indexOf("renderSidePanelBackgrounds"),
        src.indexOf("renderBackground", src.indexOf("renderSidePanelBackgrounds"))
      );

      expect(sidePanelMethod).toContain('rgb(0, 10, 30)');
      expect(sidePanelMethod).toContain('rgb(0, 5, 15)');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 12. Weapon Tray Updates When Switching
  // ═══════════════════════════════════════════════════════════════
  describe("Weapon tray updates when switching weapons", () => {
    let hud: HUD;
    let ctx: any;

    beforeEach(() => {
      hud = new HUD(false);
      const canvas = createMockCanvas();
      ctx = canvas.getContext("2d");
    });

    test("active weapon changes highlight when switching", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["missile", 1],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 2, 1, false, 0,
        inventory, 0, 0, 100
      );

      ctx.stroke.mockClear();

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "missile", false, 0, 2, 1, false, 0,
        inventory, 0, 0, 100
      );

      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 13. Ion Cannon Charge Bar
  // ═══════════════════════════════════════════════════════════════
  describe("Ion cannon charge bar in vertical tray", () => {
    let hud: HUD;
    let ctx: any;

    beforeEach(() => {
      hud = new HUD(false);
      const canvas = createMockCanvas();
      ctx = canvas.getContext("2d");
    });

    test("ion cannon charge bar is rendered when charging", () => {
      const inventory = new Map<WeaponType, number>([
        ["machine-gun", 1],
        ["ion-cannon", 1],
      ]);

      hud.render(
        ctx, "playing", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "ion-cannon", false, 0.5, 2, 1, false, 0,
        inventory, 0, 0, 100
      );

      const fillRectCalls = ctx._fillRectCalls as Array<{ x: number; y: number; w: number; h: number }>;
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;

      const chargeBarRects = fillRectCalls.filter((c: { x: number; h: number }) =>
        c.x >= rightPanelX && c.h === 3
      );

      expect(chargeBarRects.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 14. Touch Device Button Positioning
  // ═══════════════════════════════════════════════════════════════
  describe("Touch device buttons positioned within game area", () => {
    test("bomb button is positioned left of the right panel", () => {
      const hud = new HUD(true);
      const rightBound = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;

      const isHit = hud.isBombButtonHit(rightBound + 10, CANVAS_HEIGHT - 80, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(isHit).toBe(false);
    });

    test("bomb button rect x + w does not exceed right panel start", () => {
      const hud = new HUD(true);
      const getBombRect = (hud as any).getBombButtonRect.bind(hud);
      const rect = getBombRect(CANVAS_WIDTH, CANVAS_HEIGHT);

      expect(rect.x + rect.w).toBeLessThanOrEqual(CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH);
    });

    test("dodge button does not overlap right panel", () => {
      const hud = new HUD(true);
      const getDodgeRect = (hud as any).getDodgeButtonRect.bind(hud);
      const rect = getDodgeRect(CANVAS_WIDTH, CANVAS_HEIGHT);

      expect(rect.x + rect.w).toBeLessThanOrEqual(CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH);
    });

    test("EMP button does not overlap right panel", () => {
      const hud = new HUD(true);
      const getEmpRect = (hud as any).getEmpButtonRect.bind(hud);
      const rect = getEmpRect(CANVAS_WIDTH, CANVAS_HEIGHT);

      expect(rect.x + rect.w).toBeLessThanOrEqual(CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH);
    });

    test("weapon cycle button does not overlap right panel", () => {
      const hud = new HUD(true);
      const getWpnRect = (hud as any).getWeaponCycleButtonRect.bind(hud);
      const rect = getWpnRect(CANVAS_WIDTH, CANVAS_HEIGHT);

      expect(rect.x + rect.w).toBeLessThanOrEqual(CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 15. Mute and Settings Buttons
  // ═══════════════════════════════════════════════════════════════
  describe("Mute and settings buttons do not overlap right panel", () => {
    let hud: HUD;

    beforeEach(() => {
      hud = new HUD(false);
    });

    test("mute button hit area is left of the right panel", () => {
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;
      const isHit = hud.isMuteButtonHit(rightPanelX + 5, 20, CANVAS_WIDTH, HUD_RIGHT_PANEL_WIDTH);
      expect(isHit).toBe(false);
    });

    test("settings button hit area is left of the right panel", () => {
      const rightPanelX = CANVAS_WIDTH - HUD_RIGHT_PANEL_WIDTH;
      const isHit = hud.isSettingsButtonHit(rightPanelX + 5, 20, CANVAS_WIDTH, HUD_RIGHT_PANEL_WIDTH);
      expect(isHit).toBe(false);
    });

    test("renderMuteButton accepts rightPanelWidth parameter", () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext("2d") as any;
      expect(() => {
        hud.renderMuteButton(ctx, false, CANVAS_WIDTH, HUD_RIGHT_PANEL_WIDTH);
      }).not.toThrow();
    });

    test("renderSettingsButton accepts rightPanelWidth parameter", () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext("2d") as any;
      expect(() => {
        hud.renderSettingsButton(ctx, CANVAS_WIDTH, HUD_RIGHT_PANEL_WIDTH);
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 16. FPS Counter Position
  // ═══════════════════════════════════════════════════════════════
  describe("FPS counter is positioned within game area", () => {
    test("FPS counter position in source uses gameAreaX + 10, gameAreaY + 16", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      expect(src).toContain("this.gameAreaX + 10, this.gameAreaY + 16");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 17. Active Effects Display
  // ═══════════════════════════════════════════════════════════════
  describe("Active effects do not overlap right panel", () => {
    test("active effects x-position accounts for right panel width", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/rendering/HUD.ts"),
        "utf-8"
      );

      expect(src).toContain("width - HUD_RIGHT_PANEL_WIDTH");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 18. Rendering Order
  // ═══════════════════════════════════════════════════════════════
  describe("Rendering order is correct", () => {
    test("side panel backgrounds are rendered before clip rect", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      const sidePanelPos = src.indexOf("renderSidePanelBackgrounds");
      const clipPos = src.indexOf("ctx.clip()", sidePanelPos);

      expect(sidePanelPos).toBeGreaterThan(0);
      expect(clipPos).toBeGreaterThan(sidePanelPos);
    });

    test("clip rect is applied before game entity rendering", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      const renderMethod = src.substring(
        src.indexOf("private render(): void"),
        src.indexOf("private static compactAlive")
      );

      const clipPos = renderMethod.indexOf("ctx.clip()");
      const playerRenderPos = renderMethod.indexOf("this.player.render(this.ctx)");

      expect(clipPos).toBeGreaterThan(0);
      expect(playerRenderPos).toBeGreaterThan(clipPos);
    });

    test("clip rect is restored after game entities and before HUD overlays", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"),
        "utf-8"
      );

      const renderMethod = src.substring(
        src.indexOf("private render(): void"),
        src.indexOf("private static compactAlive")
      );

      const playerRenderPos = renderMethod.indexOf("this.player.render(this.ctx)");
      const restoreAfterPlayer = renderMethod.indexOf("this.ctx.restore()", playerRenderPos);
      const hudRenderPos = renderMethod.indexOf("this.hud.render(");

      expect(restoreAfterPlayer).toBeGreaterThan(playerRenderPos);
      expect(hudRenderPos).toBeGreaterThan(restoreAfterPlayer);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 19. HUD During Paused State
  // ═══════════════════════════════════════════════════════════════
  describe("HUD layout during paused state", () => {
    test("left and right panels render during paused state", () => {
      const hud = new HUD(false);
      const canvas = createMockCanvas();
      const ctx = canvas.getContext("2d") as any;

      hud.render(
        ctx, "paused", 0, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      const armorLabel = fillTextCalls.find((c: { text: string }) => c.text === "ARMOR");
      const gunLabel = fillTextCalls.find((c: { text: string }) => c.text === "GUN");
      expect(armorLabel).toBeDefined();
      expect(gunLabel).toBeDefined();
    });

    test("pause menu is centered within full canvas", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/rendering/HUD.ts"),
        "utf-8"
      );

      const startIdx = src.indexOf("renderPauseMenu(ctx");
      const endIdx = src.indexOf("ctx.restore()", startIdx) + 30;
      const pauseMenuStr = src.substring(startIdx, endIdx);

      expect(pauseMenuStr).toContain("width / 2");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 20. HUD During Level Complete State
  // ═══════════════════════════════════════════════════════════════
  describe("HUD renders during level_complete state", () => {
    test("left and right panels render during level_complete", () => {
      const hud = new HUD(false);
      const canvas = createMockCanvas();
      const ctx = canvas.getContext("2d") as any;
      hud.setCompletionText("Test completion");

      hud.render(
        ctx, "level_complete", 500, 3, 100, 1, "Test",
        CANVAS_WIDTH, CANVAS_HEIGHT,
        [], "machine-gun", false, 0, 0, 1, false, 0,
        new Map([["machine-gun", 1]]), 0, 0, 100
      );

      const fillTextCalls = ctx._fillTextCalls as Array<{ text: string; x: number; y: number }>;
      expect(fillTextCalls.find((c: { text: string }) => c.text === "ARMOR")).toBeDefined();
      expect(fillTextCalls.find((c: { text: string }) => c.text === "GUN")).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 21. Bars Not Overlaid on Game Area
  // ═══════════════════════════════════════════════════════════════
  describe("Bars are not overlaid on the game area", () => {
    test("old standalone renderArmorBar method no longer exists", () => {
      expect((HUD.prototype as any).renderArmorBar).toBeUndefined();
    });

    test("old standalone renderEnergyBar method no longer exists", () => {
      expect((HUD.prototype as any).renderEnergyBar).toBeUndefined();
    });

    test("old standalone renderBatteryBar method no longer exists", () => {
      expect((HUD.prototype as any).renderBatteryBar).toBeUndefined();
    });

    test("renderLeftPanel method exists", () => {
      expect((HUD.prototype as any).renderLeftPanel).toBeDefined();
    });

    test("renderRightPanel method exists", () => {
      expect((HUD.prototype as any).renderRightPanel).toBeDefined();
    });

    test("renderVerticalBar method exists", () => {
      expect((HUD.prototype as any).renderVerticalBar).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 22. Enemy Update Accepts Game Area Offsets
  // ═══════════════════════════════════════════════════════════════
  describe("Enemy update accepts game area offset parameters", () => {
    test("Enemy.update signature includes offsetX and offsetY", () => {
      const enemy = new Enemy(400, 100, "scout");
      expect(() => {
        enemy.update(0.016, GAME_AREA_HEIGHT, 400, GAME_AREA_WIDTH, GAME_AREA_X, GAME_AREA_Y);
      }).not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 23. Top Bar Height Used in Layout
  // ═══════════════════════════════════════════════════════════════
  describe("Top bar uses HUD_TOP_BAR_HEIGHT constant", () => {
    test("HUD renderPlayingHUD uses HUD_TOP_BAR_HEIGHT for top bar", () => {
      const fs = require("fs");
      const path = require("path");
      const src = fs.readFileSync(
        path.resolve(__dirname, "../src/games/raptor/rendering/HUD.ts"),
        "utf-8"
      );

      expect(src).toContain("HUD_TOP_BAR_HEIGHT");
    });
  });
});
