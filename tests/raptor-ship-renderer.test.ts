import { ShipRenderer, ShipRenderState } from "../src/games/raptor/rendering/ShipRenderer";
import { Player } from "../src/games/raptor/entities/Player";

function createMockCtx() {
  const fillStyles: string[] = [];
  const strokeStyles: string[] = [];
  const ctx: Record<string, any> = {
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
    fill: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    arcTo: jest.fn(),
    ellipse: jest.fn(),
    quadraticCurveTo: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    transform: jest.fn(),
    roundRect: jest.fn(),
    createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
    measureText: jest.fn(() => ({ width: 50 })),
  };

  const fillStyleProxy = new Proxy(ctx, {
    set(target, prop, value) {
      if (prop === "fillStyle" && typeof value === "string") {
        fillStyles.push(value);
      }
      if (prop === "strokeStyle" && typeof value === "string") {
        strokeStyles.push(value);
      }
      target[prop as string] = value;
      return true;
    },
  });

  return { ctx: fillStyleProxy as unknown as CanvasRenderingContext2D, fillStyles, strokeStyles };
}

function defaultState(): ShipRenderState {
  return {
    thrustLevel: 0.8,
    bankAngle: 0,
    runningLightPhase: 0,
    panelLightFlicker: 0.3,
    heatShimmer: 0.5,
    damageLevel: 0,
  };
}

// ─── ShipRenderer Tests ────────────────────────────────────────

describe("ShipRenderer", () => {
  let renderer: ShipRenderer;

  beforeEach(() => {
    renderer = new ShipRenderer();
  });

  test("render() calls beginPath/fill/stroke for hull and panels", () => {
    const { ctx } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, defaultState());

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect((ctx.beginPath as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(10);
  });

  test("render() uses the correct hull primary color #4a5a56", () => {
    const { ctx, fillStyles } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, defaultState());

    expect(fillStyles).toContain("#4a5a56");
  });

  test("render() uses the correct cockpit glass color #b8e0d0", () => {
    const { ctx, fillStyles } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, defaultState());

    expect(fillStyles).toContain("#b8e0d0");
  });

  test("render() uses the correct hull secondary color #3d4d48", () => {
    const { ctx, fillStyles } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, defaultState());

    expect(fillStyles).toContain("#3d4d48");
  });

  test("render() draws hull number stencil RA-227", () => {
    const { ctx } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, defaultState());

    expect(ctx.fillText).toHaveBeenCalledWith("RA-227", expect.any(Number), expect.any(Number));
  });

  test("render() saves and restores context", () => {
    const { ctx } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, defaultState());

    expect((ctx.save as jest.Mock).mock.calls.length).toEqual(
      (ctx.restore as jest.Mock).mock.calls.length
    );
  });

  test("render() does not throw with any valid state", () => {
    const { ctx } = createMockCtx();

    expect(() => {
      renderer.render(ctx, 100, 100, 56, 64, {
        thrustLevel: 0,
        bankAngle: 0.1,
        runningLightPhase: 0.5,
        panelLightFlicker: 0.8,
        heatShimmer: 1,
        damageLevel: 1,
      });
    }).not.toThrow();
  });

  test("render() applies bank angle transform when bankAngle != 0", () => {
    const { ctx } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, { ...defaultState(), bankAngle: 0.1 });

    expect(ctx.translate).toHaveBeenCalled();
    expect(ctx.transform).toHaveBeenCalled();
  });

  test("render() does not apply transform when bankAngle is 0", () => {
    const { ctx } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, { ...defaultState(), bankAngle: 0 });

    expect(ctx.transform).not.toHaveBeenCalled();
  });

  test("render() draws damage overlay when damageLevel > 0.5", () => {
    const { ctx } = createMockCtx();
    const state = { ...defaultState(), damageLevel: 0.8 };
    renderer.render(ctx, 100, 100, 56, 64, state);

    const fillCalls = (ctx.fill as jest.Mock).mock.calls.length;
    const { ctx: ctx2 } = createMockCtx();
    renderer.render(ctx2, 100, 100, 56, 64, { ...defaultState(), damageLevel: 0 });
    const fillCallsNoDmg = (ctx2.fill as jest.Mock).mock.calls.length;

    expect(fillCalls).toBeGreaterThan(fillCallsNoDmg);
  });

  test("render() does not draw damage overlay when damageLevel <= 0.5", () => {
    const { ctx } = createMockCtx();
    const state = { ...defaultState(), damageLevel: 0.3 };
    renderer.render(ctx, 100, 100, 56, 64, state);

    const fillCalls = (ctx.fill as jest.Mock).mock.calls.length;
    const { ctx: ctx2 } = createMockCtx();
    renderer.render(ctx2, 100, 100, 56, 64, { ...defaultState(), damageLevel: 0 });
    const fillCallsNoDmg = (ctx2.fill as jest.Mock).mock.calls.length;

    expect(fillCalls).toEqual(fillCallsNoDmg);
  });

  test("panel warning light is ON ~60% of the time (flicker < 0.6)", () => {
    const { ctx: ctxOn } = createMockCtx();
    const stateOn = { ...defaultState(), panelLightFlicker: 0.3 };
    renderer.render(ctxOn, 100, 100, 56, 64, stateOn);
    const fillsOn = (ctxOn.fill as jest.Mock).mock.calls.length;

    const { ctx: ctxOff } = createMockCtx();
    const stateOff = { ...defaultState(), panelLightFlicker: 0.8 };
    renderer.render(ctxOff, 100, 100, 56, 64, stateOff);
    const fillsOff = (ctxOff.fill as jest.Mock).mock.calls.length;

    expect(fillsOn).toBeGreaterThan(fillsOff);
  });

  test("renderMiniSilhouette uses lineWidth 2", () => {
    const { ctx } = createMockCtx();
    renderer.renderMiniSilhouette(ctx, 10, 10, 14, 16);

    expect(ctx.lineWidth).toBe(2);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  test("renderMiniSilhouette draws only stroke, no fill", () => {
    const { ctx } = createMockCtx();
    renderer.renderMiniSilhouette(ctx, 10, 10, 14, 16);

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  test("skips rivet dots and weld seams when DPR < 1", () => {
    const { ctx: ctxLow } = createMockCtx();
    renderer.render(ctxLow, 100, 100, 56, 64, defaultState(), 0.75);
    const arcsLow = (ctxLow.arc as jest.Mock).mock.calls.length;

    const { ctx: ctxHigh } = createMockCtx();
    renderer.render(ctxHigh, 100, 100, 56, 64, defaultState(), 1);
    const arcsHigh = (ctxHigh.arc as jest.Mock).mock.calls.length;

    expect(arcsLow).toBeLessThan(arcsHigh);
  });

  test("renders heat shimmer via fillRect when heatShimmer > 0", () => {
    const { ctx } = createMockCtx();
    renderer.render(ctx, 100, 100, 56, 64, { ...defaultState(), heatShimmer: 0.5 });

    expect(ctx.fillRect).toHaveBeenCalled();
  });

  test("does not render heat shimmer when heatShimmer is 0", () => {
    const { ctx: ctxShimmer } = createMockCtx();
    renderer.render(ctxShimmer, 100, 100, 56, 64, { ...defaultState(), heatShimmer: 0.5 });
    const rectCallsShimmer = (ctxShimmer.fillRect as jest.Mock).mock.calls.length;

    const { ctx: ctxNone } = createMockCtx();
    renderer.render(ctxNone, 100, 100, 56, 64, { ...defaultState(), heatShimmer: 0 });
    const rectCallsNone = (ctxNone.fillRect as jest.Mock).mock.calls.length;

    expect(rectCallsShimmer).toBeGreaterThan(rectCallsNone);
  });
});

// ─── Player Hitbox Tests ───────────────────────────────────────

describe("Player hitbox insets", () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(800, 600);
  });

  test("visual dimensions are 56x64", () => {
    expect(player.width).toBe(56);
    expect(player.height).toBe(64);
  });

  test("left edge is inset 4px from visual left", () => {
    const visualLeft = player.pos.x - player.width / 2;
    expect(player.left).toBe(visualLeft + 4);
  });

  test("right edge is inset 4px from visual right", () => {
    const visualRight = player.pos.x + player.width / 2;
    expect(player.right).toBe(visualRight - 4);
  });

  test("top edge is inset 5px from visual top", () => {
    const visualTop = player.pos.y - player.height / 2;
    expect(player.top).toBe(visualTop + 5);
  });

  test("bottom edge is inset 5px from visual bottom", () => {
    const visualBottom = player.pos.y + player.height / 2;
    expect(player.bottom).toBe(visualBottom - 5);
  });

  test("hitbox width is 48 (56 - 2*4)", () => {
    expect(player.right - player.left).toBe(48);
  });

  test("hitbox height is 54 (64 - 2*5)", () => {
    expect(player.bottom - player.top).toBe(54);
  });
});

// ─── Player bankAngle Tests ────────────────────────────────────

describe("Player bankAngle computation", () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(800, 600);
  });

  test("moving left produces negative bank angle", () => {
    const leftTarget = player.pos.x - 100;
    for (let i = 0; i < 10; i++) {
      player.update(0.016, leftTarget, player.pos.y, 800, 600);
    }
    expect((player as any).bankAngle).toBeLessThan(0);
  });

  test("moving right produces positive bank angle", () => {
    const rightTarget = player.pos.x + 100;
    for (let i = 0; i < 10; i++) {
      player.update(0.016, rightTarget, player.pos.y, 800, 600);
    }
    expect((player as any).bankAngle).toBeGreaterThan(0);
  });

  test("stationary player returns bank angle toward 0", () => {
    const rightTarget = player.pos.x + 100;
    for (let i = 0; i < 10; i++) {
      player.update(0.016, rightTarget, player.pos.y, 800, 600);
    }
    expect((player as any).bankAngle).not.toBe(0);

    for (let i = 0; i < 60; i++) {
      player.update(0.016, player.pos.x, player.pos.y, 800, 600);
    }
    expect(Math.abs((player as any).bankAngle)).toBeLessThan(0.01);
  });

  test("bank angle is clamped to [-0.15, 0.15]", () => {
    const farRight = 2000;
    for (let i = 0; i < 100; i++) {
      player.update(0.016, farRight, player.pos.y, 800, 600);
    }
    expect((player as any).bankAngle).toBeLessThanOrEqual(0.15);
    expect((player as any).bankAngle).toBeGreaterThanOrEqual(-0.15);
  });

  test("bank angle resets on player reset", () => {
    const rightTarget = player.pos.x + 100;
    for (let i = 0; i < 10; i++) {
      player.update(0.016, rightTarget, player.pos.y, 800, 600);
    }
    expect((player as any).bankAngle).not.toBe(0);

    player.reset(800, 600);
    expect((player as any).bankAngle).toBe(0);
  });
});

// ─── Player runningLightPhase Tests ────────────────────────────

describe("Player runningLightPhase cycling", () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(800, 600);
  });

  test("runningLightPhase starts at 0", () => {
    expect((player as any).runningLightPhase).toBe(0);
  });

  test("runningLightPhase advances over time at 1.5 Hz", () => {
    player.update(1, player.pos.x, player.pos.y, 800, 600);
    expect((player as any).runningLightPhase).toBeCloseTo(1.5, 1);
  });

  test("runningLightPhase advances proportionally to dt", () => {
    player.update(0.5, player.pos.x, player.pos.y, 800, 600);
    expect((player as any).runningLightPhase).toBeCloseTo(0.75, 1);
  });

  test("runningLightPhase resets on player reset", () => {
    player.update(1, player.pos.x, player.pos.y, 800, 600);
    expect((player as any).runningLightPhase).not.toBe(0);

    player.reset(800, 600);
    expect((player as any).runningLightPhase).toBe(0);
  });
});

// ─── Player render integration ─────────────────────────────────

describe("Player.render() integration", () => {
  test("render does not throw without sprite set", () => {
    const player = new Player(800, 600);
    const { ctx } = createMockCtx();

    expect(() => player.render(ctx)).not.toThrow();
  });

  test("render does not throw with various states", () => {
    const player = new Player(800, 600);
    const { ctx } = createMockCtx();

    player.shield = 20;
    expect(() => player.render(ctx)).not.toThrow();

    player.shield = 100;
    player.godMode = true;
    expect(() => player.render(ctx)).not.toThrow();
  });

  test("render does not draw when player is dead", () => {
    const player = new Player(800, 600);
    const { ctx } = createMockCtx();
    player.alive = false;

    player.render(ctx);
    expect(ctx.save).not.toHaveBeenCalled();
  });
});
