/**
 * QA tests for PR #514 / Issue #508:
 * Add landmark liberation celebration effects on level complete.
 *
 * Covers all Cucumber/Gherkin acceptance criteria.
 */

import { Landmark } from "../src/games/archer/entities/Landmark";
import { SoundSystem } from "../src/games/archer/systems/SoundSystem";
import { SoundEvent } from "../src/games/archer/types";
import { AudioManager } from "../src/shared/AudioManager";
import { HUD } from "../src/games/archer/rendering/HUD";
import { LEVELS } from "../src/games/archer/levels";
import { Balloon } from "../src/games/archer/entities/Balloon";
import { Arrow } from "../src/games/archer/entities/Arrow";

// ---------------------------------------------------------------------------
// Mock infrastructure (adapted from existing test patterns)
// ---------------------------------------------------------------------------

function createMockGainNode(): any {
  return {
    gain: {
      value: 1,
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
}

function createMockOscillator(): any {
  return {
    type: "sine",
    frequency: {
      value: 440,
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null,
  };
}

function createMockBufferSource(): any {
  return {
    buffer: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    onended: null,
  };
}

function createMockFilter(): any {
  return {
    type: "lowpass",
    frequency: { value: 3000 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
}

function createMockAudioContext(): any {
  return {
    state: "running",
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    createOscillator: jest.fn(() => createMockOscillator()),
    createGain: jest.fn(() => createMockGainNode()),
    createBufferSource: jest.fn(() => createMockBufferSource()),
    createBuffer: jest.fn((_ch: number, len: number, _sr: number) => ({
      getChannelData: () => new Float32Array(len),
    })),
    createBiquadFilter: jest.fn(() => createMockFilter()),
  };
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock, configurable: true });

let mockAudioCtx: any;

function setupGlobalAudio() {
  mockAudioCtx = createMockAudioContext();
  (global as any).AudioContext = jest.fn(() => mockAudioCtx);
  (global as any).window = (global as any).window || {};
  (global as any).window.AudioContext = (global as any).AudioContext;
}

function teardownGlobalAudio() {
  delete (global as any).AudioContext;
  if ((global as any).window) {
    delete (global as any).window.AudioContext;
  }
}

function createAudioPair(): { audio: AudioManager; sound: SoundSystem } {
  const audio = new AudioManager();
  audio.ensureContext();
  const sound = new SoundSystem(audio);
  return { audio, sound };
}

function createLandmark(type: string = "windmill") {
  const config = {
    type: type as any,
    label: "Ancient Windmill",
    description: "Test",
    positionX: 0.5,
    hitPoints: 3,
  };
  return new Landmark(config, 800, 600);
}

function createMockCtx(): any {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
    textBaseline: "",
    fillText: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    arc: jest.fn(),
    ellipse: jest.fn(),
    quadraticCurveTo: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    roundRect: jest.fn(),
  };
}

function createMockCanvas(): HTMLCanvasElement {
  const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  const ctx = createMockCtx();
  ctx.fillText = jest.fn((text: string, x: number, y: number) => {
    fillTextCalls.push({ text, x, y });
  });

  const canvas = {
    getContext: jest.fn(() => ctx),
    width: 800,
    height: 600,
    style: {} as CSSStyleDeclaration,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getBoundingClientRect: jest.fn(() => ({
      left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
    })),
  } as unknown as HTMLCanvasElement;

  (canvas as any).__ctx = ctx;
  (canvas as any).__fillTextCalls = fillTextCalls;
  return canvas;
}

function setupDom(canvas: HTMLCanvasElement): void {
  (global as any).document = { getElementById: jest.fn(() => canvas) };
  (global as any).HTMLCanvasElement = class HTMLCanvasElement {};
  Object.setPrototypeOf(canvas, (global as any).HTMLCanvasElement.prototype);
  (global as any).window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerWidth: 800,
    innerHeight: 600,
    AudioContext: (global as any).AudioContext,
  };
  (global as any).navigator = { maxTouchPoints: 0 };
}

function getLandmarkInternals(landmark: any) {
  return {
    get state() { return landmark["state"]; },
    get sparkles() { return landmark["sparkles"]; },
    get liberationTimer() { return landmark["liberationTimer"]; },
    get siegeProgress() { return landmark["siegeProgress"]; },
  };
}

function getGameInternals(game: any) {
  return {
    get arrowsRemaining() { return game["arrowsRemaining"]; },
    set arrowsRemaining(v: number) { game["arrowsRemaining"] = v; },
    get state() { return game["state"]; },
    set state(v: string) { game["state"] = v; },
    get arrows() { return game["arrows"]; },
    set arrows(v: any[]) { game["arrows"] = v; },
    get balloons() { return game["balloons"]; },
    set balloons(v: any[]) { game["balloons"] = v; },
    get score() { return game["score"]; },
    set score(v: number) { game["score"] = v; },
    get totalScore() { return game["totalScore"]; },
    set totalScore(v: number) { game["totalScore"] = v; },
    get currentLevel() { return game["currentLevel"]; },
    set currentLevel(v: number) { game["currentLevel"] = v; },
    get nextAmmoMilestone() { return game["nextAmmoMilestone"]; },
    set nextAmmoMilestone(v: number) { game["nextAmmoMilestone"] = v; },
    get landmark() { return game["landmark"]; },
    get sound() { return game["sound"]; },
    get obstacles() { return game["obstacles"]; },
    set obstacles(v: any[]) { game["obstacles"] = v; },
    get spawner() { return game["spawner"]; },
    get input() { return game["input"]; },
    get currentLevelConfig() { return game["currentLevelConfig"]; },
    resetGame: () => game["resetGame"](),
    startLevel: (idx: number) => game["startLevel"](idx),
    updatePlaying: (dt: number) => game["updatePlaying"](dt),
    render: () => game["render"](),
  };
}

// ---------------------------------------------------------------------------
// Import ArcherGame lazily (needs DOM setup)
// ---------------------------------------------------------------------------

let Game: typeof import("../src/games/archer/ArcherGame").Game;

beforeAll(async () => {
  const canvas = createMockCanvas();
  setupDom(canvas);
  setupGlobalAudio();
  (global as any).performance = { now: jest.fn(() => 0) };
  (global as any).requestAnimationFrame = jest.fn();
  const mod = await import("../src/games/archer/ArcherGame");
  Game = mod.Game;
});

// ===========================================================================
// Feature: Landmark liberation celebration on level complete
// ===========================================================================

describe("Feature: Landmark liberation celebration on level complete", () => {

  // -------------------------------------------------------------------------
  // Scenario: Celebration particle burst triggers on level completion
  // -------------------------------------------------------------------------
  describe("Scenario: Celebration particle burst triggers on level completion", () => {
    test("calling celebrate() spawns 30 sparkle particles", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();

      expect(internals.sparkles).toHaveLength(30);
    });

    test("particles use gold, yellow, and white colors", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();

      const expectedColors = [
        "rgba(255, 215, 0, 1)",
        "rgba(255, 255, 255, 1)",
        "rgba(255, 245, 100, 1)",
        "rgba(255, 200, 50, 1)",
      ];

      for (const sparkle of internals.sparkles) {
        expect(expectedColors).toContain(sparkle.color);
      }
    });

    test("celebrate() transitions landmark state to 'liberated'", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      expect(internals.state).toBe("siege");
      landmark.celebrate();
      expect(internals.state).toBe("liberated");
    });

    test("celebrate() sets siegeProgress to 1", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();
      expect(internals.siegeProgress).toBe(1);
    });

    test("ArcherGame calls celebrate() on landmark when score reaches target", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      gi.resetGame();
      gi.state = "playing";
      gi.score = 19;
      gi.arrowsRemaining = 50;
      gi.nextAmmoMilestone = 200;

      const balloon = new Balloon(400, 300, 60);
      gi.balloons = [balloon];
      gi.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];
      (gi.input as any).wasClicked = false;

      const celebrateSpy = jest.spyOn(gi.landmark!, "celebrate");
      gi.updatePlaying(0.016);

      expect(gi.state).toBe("level_complete");
      expect(celebrateSpy).toHaveBeenCalled();

      randomSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Celebration animation duration and settling
  // -------------------------------------------------------------------------
  describe("Scenario: Celebration animation duration and settling", () => {
    test("liberation timer is set to 2.0 seconds", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();
      expect(internals.liberationTimer).toBe(2.0);
    });

    test("golden glow fades out over approximately 0.8 seconds (top 0.8s of 2.0s timer)", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();

      // burstAlpha = max(0, (timer - 1.2) / 0.8)
      // At timer = 2.0: burstAlpha = (2.0 - 1.2) / 0.8 = 1.0 (full glow)
      // At timer = 1.2: burstAlpha = 0.0 (glow gone)
      // Glow lasts from timer 2.0 -> 1.2, i.e. 0.8 seconds
      expect(internals.liberationTimer).toBe(2.0);

      const burstAlphaStart = Math.max(0, (internals.liberationTimer - 1.2) / 0.8);
      expect(burstAlphaStart).toBe(1.0);

      landmark.update(0.8);
      const burstAlphaEnd = Math.max(0, (internals.liberationTimer - 1.2) / 0.8);
      expect(burstAlphaEnd).toBeCloseTo(0, 1);
    });

    test("particles have gravity pulling them downward (vy increases)", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      jest.spyOn(Math, "random").mockReturnValue(0.5);
      landmark.celebrate();

      const initialVys = internals.sparkles.map((s: any) => s.vy);

      landmark.update(0.1);

      for (let i = 0; i < internals.sparkles.length; i++) {
        expect(internals.sparkles[i].vy).toBeGreaterThan(initialVys[i]);
      }

      jest.restoreAllMocks();
    });

    test("particles have lifetimes between 1.0 and 2.0 seconds", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();

      for (const sparkle of internals.sparkles) {
        expect(sparkle.maxLife).toBeGreaterThanOrEqual(1.0);
        expect(sparkle.maxLife).toBeLessThanOrEqual(2.0);
      }
    });

    test("after ~2 seconds the landmark remains in the liberated visual state", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();

      for (let i = 0; i < 25; i++) {
        landmark.update(0.1);
      }

      expect(internals.liberationTimer).toBeLessThanOrEqual(0);
      expect(internals.state).toBe("liberated");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Celebration is visible behind the level complete HUD overlay
  // -------------------------------------------------------------------------
  describe("Scenario: Celebration is visible behind the level complete HUD overlay", () => {
    test("landmark continues to update each frame during level_complete state", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      gi.resetGame();
      gi.state = "playing";
      gi.score = 19;
      gi.arrowsRemaining = 50;
      gi.nextAmmoMilestone = 200;

      gi.balloons = [new Balloon(400, 300, 60)];
      gi.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];
      (gi.input as any).wasClicked = false;
      gi.updatePlaying(0.016);

      expect(gi.state).toBe("level_complete");

      const updateSpy = jest.spyOn(gi.landmark!, "update");

      // Simulate game update in level_complete state
      (gi.input as any).wasClicked = false;
      game["update"](0.016);

      expect(updateSpy).toHaveBeenCalledWith(0.016);

      randomSpy.mockRestore();
    });

    test("landmark is rendered during level_complete state", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);

      gi.resetGame();
      gi.state = "level_complete";

      const renderSpy = jest.spyOn(gi.landmark!, "render");
      gi.render();

      expect(renderSpy).toHaveBeenCalled();
    });

    test("landmark is rendered during victory state", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);

      gi.resetGame();
      gi.state = "victory";

      const renderSpy = jest.spyOn(gi.landmark!, "render");
      gi.render();

      expect(renderSpy).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Liberation sound plays on level completion
  // -------------------------------------------------------------------------
  describe("Scenario: Liberation sound plays on level completion", () => {
    beforeEach(() => {
      localStorageMock.clear();
      jest.clearAllMocks();
      setupGlobalAudio();
    });

    afterEach(() => {
      teardownGlobalAudio();
    });

    test('"landmark_liberated" is a valid SoundEvent type', () => {
      const event: SoundEvent = "landmark_liberated";
      expect(event).toBe("landmark_liberated");
    });

    test("SoundSystem handles landmark_liberated without errors", () => {
      const { sound } = createAudioPair();
      expect(() => sound.play("landmark_liberated")).not.toThrow();
      sound.destroy();
    });

    test("landmark_liberated plays a triumphant ascending chime (4 sine notes)", () => {
      const { audio, sound } = createAudioPair();
      const playSequenceSpy = jest.spyOn(audio, "playSequence");

      sound.play("landmark_liberated");

      expect(playSequenceSpy).toHaveBeenCalledTimes(1);
      const notes = playSequenceSpy.mock.calls[0][0];
      expect(notes).toHaveLength(4);

      for (const note of notes) {
        expect(note.type).toBe("sine");
      }

      // Ascending frequencies: C5 -> E5 -> G5 -> C6
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeLessThan(notes[i + 1].frequency);
      }

      expect(notes[0].frequency).toBe(523);
      expect(notes[1].frequency).toBe(659);
      expect(notes[2].frequency).toBe(784);
      expect(notes[3].frequency).toBe(1047);

      sound.destroy();
    });

    test("landmark_liberated plays at BPM 180", () => {
      const { audio, sound } = createAudioPair();
      const playSequenceSpy = jest.spyOn(audio, "playSequence");

      sound.play("landmark_liberated");

      const bpm = playSequenceSpy.mock.calls[0][1];
      expect(bpm).toBe(180);

      sound.destroy();
    });

    test("ArcherGame plays landmark_liberated sound on level completion", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      gi.resetGame();
      gi.state = "playing";
      gi.score = 19;
      gi.arrowsRemaining = 50;
      gi.nextAmmoMilestone = 200;

      const playSpy = jest.spyOn(gi.sound, "play");

      gi.balloons = [new Balloon(400, 300, 60)];
      gi.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];
      (gi.input as any).wasClicked = false;
      gi.updatePlaying(0.016);

      expect(playSpy).toHaveBeenCalledWith("landmark_liberated");
      expect(playSpy).toHaveBeenCalledWith("level_complete");

      randomSpy.mockRestore();
    });

    test("landmark_liberated plays before level_complete sound", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      gi.resetGame();
      gi.state = "playing";
      gi.score = 19;
      gi.arrowsRemaining = 50;
      gi.nextAmmoMilestone = 200;

      const playCalls: string[] = [];
      jest.spyOn(gi.sound, "play").mockImplementation(((event: SoundEvent) => {
        playCalls.push(event);
      }) as any);

      gi.balloons = [new Balloon(400, 300, 60)];
      gi.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];
      (gi.input as any).wasClicked = false;
      gi.updatePlaying(0.016);

      const liberatedIdx = playCalls.indexOf("landmark_liberated");
      const completeIdx = playCalls.indexOf("level_complete");
      expect(liberatedIdx).toBeGreaterThanOrEqual(0);
      expect(completeIdx).toBeGreaterThanOrEqual(0);
      expect(liberatedIdx).toBeLessThan(completeIdx);

      randomSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Level complete screen shows liberated landmark name
  // -------------------------------------------------------------------------
  describe("Scenario: Level complete screen shows liberated landmark name", () => {
    test('displays "Ancient Windmill has been liberated!" for level 1', () => {
      const hud = new HUD();
      const ctx = createMockCtx();
      const fillTextCalls: Array<{ text: string }> = [];
      ctx.fillText = jest.fn((text: string) => { fillTextCalls.push({ text }); });

      hud.render(
        ctx, "level_complete", 20, 50, 800, 600, [], 0, 1, "Meadow", 20,
        new Set(), new Map(), "Ancient Windmill", ""
      );

      const liberationText = fillTextCalls.find(
        (c) => c.text.includes("Ancient Windmill has been liberated!")
      );
      expect(liberationText).toBeDefined();
    });

    test("liberation text is rendered in gold color (#f1c40f)", () => {
      const hud = new HUD();
      const ctx = createMockCtx();

      const fillStyles: string[] = [];
      const originalFillText = ctx.fillText;
      let capturedFillStyle = "";

      Object.defineProperty(ctx, "fillStyle", {
        get() { return capturedFillStyle; },
        set(val: string) { capturedFillStyle = val; },
        configurable: true,
      });

      const textCalls: Array<{ text: string; fillStyle: string }> = [];
      ctx.fillText = jest.fn((text: string) => {
        textCalls.push({ text, fillStyle: capturedFillStyle });
      });

      hud.render(
        ctx, "level_complete", 20, 50, 800, 600, [], 0, 1, "Meadow", 20,
        new Set(), new Map(), "Ancient Windmill", ""
      );

      const liberationCall = textCalls.find(
        (c) => c.text.includes("has been liberated!")
      );
      expect(liberationCall).toBeDefined();
      expect(liberationCall!.fillStyle).toBe("#f1c40f");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Level complete screen shows correct landmark for each level
  // -------------------------------------------------------------------------
  describe("Scenario: Level complete screen shows correct landmark for each level", () => {
    const levelLandmarks = [
      { level: 1, label: "Ancient Windmill" },
      { level: 2, label: "Great Treehouse" },
      { level: 3, label: "Stone Watchtower" },
      { level: 4, label: "Storm Lighthouse" },
    ];

    for (const { level, label } of levelLandmarks) {
      test(`level ${level} shows "${label} has been liberated!"`, () => {
        const hud = new HUD();
        const ctx = createMockCtx();
        const fillTextCalls: Array<{ text: string }> = [];
        ctx.fillText = jest.fn((text: string) => { fillTextCalls.push({ text }); });

        hud.render(
          ctx, "level_complete", 50, 50, 800, 600, [], 0, level,
          LEVELS[level - 1].name, 50, new Set(), new Map(), label, ""
        );

        const liberationText = fillTextCalls.find(
          (c) => c.text === `${label} has been liberated!`
        );
        expect(liberationText).toBeDefined();
      });
    }

    test("level config landmark labels match expected values", () => {
      expect(LEVELS[0].landmark.label).toBe("Ancient Windmill");
      expect(LEVELS[1].landmark.label).toBe("Great Treehouse");
      expect(LEVELS[2].landmark.label).toBe("Stone Watchtower");
      expect(LEVELS[3].landmark.label).toBe("Storm Lighthouse");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Particles fade without visual artifacts
  // -------------------------------------------------------------------------
  describe("Scenario: Particles fade without visual artifacts", () => {
    test("particles with expired life are removed from the sparkles array", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();
      expect(internals.sparkles.length).toBe(30);

      // Fast-forward past all particle lifetimes (max 2.0s)
      for (let i = 0; i < 25; i++) {
        landmark.update(0.1);
      }

      expect(internals.sparkles.length).toBe(0);
    });

    test("rendering with no active sparkles doesn't throw", () => {
      const landmark = createLandmark();
      const ctx = createMockCtx();

      landmark.celebrate();

      for (let i = 0; i < 25; i++) {
        landmark.update(0.1);
      }

      expect(() => landmark.render(ctx)).not.toThrow();
    });

    test("sparkle rendering uses alpha based on remaining life (fading)", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      jest.spyOn(Math, "random").mockReturnValue(0.5);
      landmark.celebrate();

      const sparkle = internals.sparkles[0];
      const initialLife = sparkle.maxLife;

      landmark.update(initialLife * 0.5);

      const remainingSparkle = internals.sparkles.find(
        (s: any) => s === sparkle
      );
      if (remainingSparkle) {
        const alpha = remainingSparkle.life / remainingSparkle.maxLife;
        expect(alpha).toBeLessThan(1);
        expect(alpha).toBeGreaterThan(0);
      }

      jest.restoreAllMocks();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Celebration on final level triggers before victory screen
  // -------------------------------------------------------------------------
  describe("Scenario: Celebration on final level triggers before victory screen", () => {
    test("completing final level calls celebrate() and transitions to victory", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      gi.resetGame();
      gi.currentLevel = 4;
      gi.state = "playing";
      gi.score = 99;
      gi.arrowsRemaining = 50;
      gi.nextAmmoMilestone = 200;
      gi.spawner.configure(LEVELS[4]);

      const celebrateSpy = jest.spyOn(gi.landmark!, "celebrate");

      gi.balloons = [new Balloon(400, 300, 60)];
      gi.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];
      (gi.input as any).wasClicked = false;
      gi.updatePlaying(0.016);

      expect(gi.state).toBe("victory");
      expect(celebrateSpy).toHaveBeenCalled();

      randomSpy.mockRestore();
    });

    test("final level plays landmark_liberated before victory sound", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);
      const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

      gi.resetGame();
      gi.currentLevel = 4;
      gi.state = "playing";
      gi.score = 99;
      gi.arrowsRemaining = 50;
      gi.nextAmmoMilestone = 200;
      gi.spawner.configure(LEVELS[4]);

      const playCalls: string[] = [];
      jest.spyOn(gi.sound, "play").mockImplementation(((event: SoundEvent) => {
        playCalls.push(event);
      }) as any);

      gi.balloons = [new Balloon(400, 300, 60)];
      gi.arrows = [new Arrow({ x: 400, y: 300 }, -Math.PI / 2)];
      (gi.input as any).wasClicked = false;
      gi.updatePlaying(0.016);

      const liberatedIdx = playCalls.indexOf("landmark_liberated");
      const victoryIdx = playCalls.indexOf("victory");
      expect(liberatedIdx).toBeGreaterThanOrEqual(0);
      expect(victoryIdx).toBeGreaterThanOrEqual(0);
      expect(liberatedIdx).toBeLessThan(victoryIdx);

      // level_complete should NOT be played on the final level
      expect(playCalls).not.toContain("level_complete");

      randomSpy.mockRestore();
    });

    test("landmark updates during victory state", () => {
      const canvas = createMockCanvas();
      setupDom(canvas);
      setupGlobalAudio();
      const game = new Game("test-canvas");
      const gi = getGameInternals(game);

      gi.resetGame();
      gi.currentLevel = 4;
      gi.state = "victory";

      const updateSpy = jest.spyOn(gi.landmark!, "update");
      (gi.input as any).wasClicked = false;
      game["update"](0.016);

      expect(updateSpy).toHaveBeenCalledWith(0.016);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Celebrate is idempotent
  // -------------------------------------------------------------------------
  describe("Scenario: Celebrate is idempotent", () => {
    test("calling celebrate() twice does not spawn additional particles", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();
      expect(internals.sparkles).toHaveLength(30);

      landmark.celebrate();
      expect(internals.sparkles).toHaveLength(30);
    });

    test("calling celebrate() twice does not reset the liberation timer", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();
      expect(internals.liberationTimer).toBe(2.0);

      landmark.update(0.5);
      const timerAfterUpdate = internals.liberationTimer;
      expect(timerAfterUpdate).toBeCloseTo(1.5, 1);

      landmark.celebrate();
      expect(internals.liberationTimer).toBeCloseTo(1.5, 1);
    });

    test("celebrate() has early return guard when already liberated", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      landmark.celebrate();
      expect(internals.state).toBe("liberated");

      // Second call should be a no-op
      const sparklesBefore = internals.sparkles.length;
      const timerBefore = internals.liberationTimer;

      landmark.celebrate();

      expect(internals.sparkles.length).toBe(sparklesBefore);
      expect(internals.liberationTimer).toBe(timerBefore);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Celebration with audio disabled
  // -------------------------------------------------------------------------
  describe("Scenario: Celebration with audio disabled", () => {
    test("visual celebration still plays when audio is disabled", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);
      const ctx = createMockCtx();

      landmark.celebrate();

      expect(internals.sparkles).toHaveLength(30);
      expect(internals.state).toBe("liberated");
      expect(() => landmark.render(ctx)).not.toThrow();
    });

    test("SoundSystem.play('landmark_liberated') does not throw when audio disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();
      const sound = new SoundSystem(audio);

      expect(() => sound.play("landmark_liberated")).not.toThrow();
      sound.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: TypeScript compilation succeeds
  // -------------------------------------------------------------------------
  describe("Scenario: TypeScript compilation succeeds", () => {
    test("all 14 SoundEvent types (including landmark_liberated) are handled", () => {
      setupGlobalAudio();
      const { sound } = createAudioPair();
      const allEvents: SoundEvent[] = [
        "arrow_shoot", "balloon_pop", "upgrade_pop",
        "boss_hit", "boss_kill", "obstacle_hit",
        "upgrade_activate", "ammo_gain",
        "level_complete", "game_over", "victory",
        "menu_start", "low_ammo", "landmark_liberated",
      ];
      for (const event of allEvents) {
        expect(() => sound.play(event)).not.toThrow();
      }
      sound.stopLowAmmoWarning();
      sound.destroy();
    });

    test("Landmark has celebrate() method (no liberate())", () => {
      const landmark = createLandmark();
      expect(typeof (landmark as any).celebrate).toBe("function");
      // liberate() should not exist — it was renamed to celebrate()
      expect((landmark as any).liberate).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Scenario: Empty landmark label is handled gracefully
  // -------------------------------------------------------------------------
  describe("Scenario: Empty landmark label is handled gracefully", () => {
    test("no liberation text is rendered when landmark label is empty", () => {
      const hud = new HUD();
      const ctx = createMockCtx();
      const fillTextCalls: Array<{ text: string }> = [];
      ctx.fillText = jest.fn((text: string) => { fillTextCalls.push({ text }); });

      hud.render(
        ctx, "level_complete", 20, 50, 800, 600, [], 0, 1, "Meadow", 20,
        new Set(), new Map(), "", ""
      );

      const liberationText = fillTextCalls.find(
        (c) => c.text.includes("has been liberated!")
      );
      expect(liberationText).toBeUndefined();
    });

    test("level complete layout does not break with empty label", () => {
      const hud = new HUD();
      const ctx = createMockCtx();
      const fillTextCalls: Array<{ text: string }> = [];
      ctx.fillText = jest.fn((text: string) => { fillTextCalls.push({ text }); });

      expect(() => {
        hud.render(
          ctx, "level_complete", 20, 50, 800, 600, [], 0, 1, "Meadow", 20,
          new Set(), new Map(), "", ""
        );
      }).not.toThrow();

      const levelCompleteText = fillTextCalls.find(
        (c) => c.text.includes("Level 1 Complete!")
      );
      expect(levelCompleteText).toBeDefined();

      const continueText = fillTextCalls.find(
        (c) => c.text.includes("Click to Continue") || c.text.includes("Tap to Continue")
      );
      expect(continueText).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Additional: Particle physics and glow effect correctness
  // -------------------------------------------------------------------------
  describe("Additional: Particle physics and glow rendering", () => {
    test("glow radius uses bounds.width * 1.5", () => {
      const landmark = createLandmark("windmill");
      const ctx = createMockCtx();

      landmark.celebrate();
      landmark.render(ctx);

      // windmill bounds: width=70
      // Expected: createRadialGradient with outer radius = 70 * 1.5 = 105
      expect(ctx.createRadialGradient).toHaveBeenCalled();
      const args = ctx.createRadialGradient.mock.calls[0];
      expect(args[5]).toBe(105); // bounds.width * 1.5
    });

    test("sparkle gravity acceleration is 80 px/s²", () => {
      const landmark = createLandmark();
      const internals = getLandmarkInternals(landmark);

      jest.spyOn(Math, "random").mockReturnValue(0.5);
      landmark.celebrate();

      const sparkle = internals.sparkles[0];
      const vyBefore = sparkle.vy;

      landmark.update(1.0);

      // vy should have increased by ~80 (80 * 1.0s dt)
      // But the sparkle may be filtered out if life expired
      // Use smaller dt
      jest.restoreAllMocks();

      const lm2 = createLandmark();
      const int2 = getLandmarkInternals(lm2);

      jest.spyOn(Math, "random").mockReturnValue(0.5);
      lm2.celebrate();
      const s = int2.sparkles[0];
      const vyInit = s.vy;

      lm2.update(0.1);
      // vy should increase by 80 * 0.1 = 8
      expect(s.vy).toBeCloseTo(vyInit + 8, 0);

      jest.restoreAllMocks();
    });
  });

  // -------------------------------------------------------------------------
  // Additional: renderLevelComplete signature updated
  // -------------------------------------------------------------------------
  describe("Additional: renderLevelComplete accepts landmarkLabel", () => {
    test("HUD.render passes landmarkLabel to renderLevelComplete in level_complete state", () => {
      const hud = new HUD();
      const ctx = createMockCtx();
      const fillTextCalls: Array<{ text: string }> = [];
      ctx.fillText = jest.fn((text: string) => { fillTextCalls.push({ text }); });

      hud.render(
        ctx, "level_complete", 35, 50, 800, 600, [], 0, 2, "Forest", 55,
        new Set(), new Map(), "Great Treehouse", ""
      );

      const liberationText = fillTextCalls.find(
        (c) => c.text === "Great Treehouse has been liberated!"
      );
      expect(liberationText).toBeDefined();

      const scoreText = fillTextCalls.find(
        (c) => c.text.includes("Score: 35")
      );
      expect(scoreText).toBeDefined();
    });
  });
});
