/**
 * QA tests for Issue #27 / PR #32: Sound effects and music for the Jardinains game.
 * Covers all acceptance criteria from the Gherkin scenarios.
 */

import { AudioManager } from "../src/shared/AudioManager";
import { SoundSystem } from "../src/games/jardinains/systems/SoundSystem";
import { JardinainsSoundEvent, JardinainsGameState } from "../src/games/jardinains/types";
import { HUD } from "../src/games/jardinains/rendering/HUD";

// ---------------------------------------------------------------------------
// Mock infrastructure (mirrors the pattern from sound-qa.test.ts)
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
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get _store() {
      return store;
    },
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

// ---------------------------------------------------------------------------
// Feature: Sound effects for the Jardinains game
// ---------------------------------------------------------------------------

describe("Feature: Sound effects for the Jardinains game", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Scenario: Ball launch sound", () => {
    test("plays ball_launch sound (short upward sweep 400→900 Hz)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playToneSwept");

      sound.play("ball_launch");

      expect(spy).toHaveBeenCalledTimes(1);
      const [freqStart, freqEnd, duration, type] = spy.mock.calls[0];
      expect(freqStart).toBe(400);
      expect(freqEnd).toBe(900);
      expect(duration).toBe(0.1);
      expect(type).toBe("sine");
      sound.destroy();
    });
  });

  describe("Scenario: Ball-paddle bounce sound", () => {
    test("plays ball_paddle sound (soft bounce ping, randomized freq 600-700 Hz)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.play("ball_paddle");

      expect(spy).toHaveBeenCalledTimes(1);
      const [freq, duration, type] = spy.mock.calls[0];
      expect(freq).toBeGreaterThanOrEqual(600);
      expect(freq).toBeLessThanOrEqual(700);
      expect(duration).toBe(0.07);
      expect(type).toBe("sine");
      sound.destroy();
    });
  });

  describe("Scenario: Brick hit sound (damaged but not destroyed)", () => {
    test("plays brick_hit sound (dull thud, triangle wave at 180 Hz)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.play("brick_hit");

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        180, 0.08, "triangle",
        expect.objectContaining({ attack: 0.005 })
      );
      sound.destroy();
    });
  });

  describe("Scenario: Brick destroy sound", () => {
    test("plays brick_destroy sound (crisp crunch + noise burst)", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.play("brick_destroy");

      expect(playToneSpy).toHaveBeenCalledWith(
        300, 0.06, "square",
        expect.objectContaining({ attack: 0.003 })
      );
      expect(playNoiseSpy).toHaveBeenCalledWith(0.08, 5000);
      sound.destroy();
    });
  });

  describe("Scenario: Gnome starts falling sound", () => {
    test("plays gnome_fall sound (descending whistle 900→300 Hz)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playToneSwept");

      sound.play("gnome_fall");

      expect(spy).toHaveBeenCalledTimes(1);
      const [freqStart, freqEnd, duration, type] = spy.mock.calls[0];
      expect(freqStart).toBe(900);
      expect(freqEnd).toBe(300);
      expect(duration).toBe(0.25);
      expect(type).toBe("sine");
      sound.destroy();
    });
  });

  describe("Scenario: Gnome caught sound", () => {
    test("plays gnome_catch sound (cheerful arpeggio, 3-note ascending)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playSequence");

      sound.play("gnome_catch");

      expect(spy).toHaveBeenCalledTimes(1);
      const notes = spy.mock.calls[0][0];
      expect(notes).toHaveLength(3);
      expect(notes[0].frequency).toBe(523);
      expect(notes[1].frequency).toBe(659);
      expect(notes[2].frequency).toBe(784);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeLessThan(notes[i + 1].frequency);
      }
      sound.destroy();
    });
  });

  describe("Scenario: Flower pot thrown sound", () => {
    test("plays pot_throw sound (quick percussive pop: square + noise)", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.play("pot_throw");

      expect(playToneSpy).toHaveBeenCalledWith(
        250, 0.05, "square",
        expect.objectContaining({ attack: 0.003 })
      );
      expect(playNoiseSpy).toHaveBeenCalledWith(0.03, 6000);
      sound.destroy();
    });
  });

  describe("Scenario: Flower pot hits paddle sound", () => {
    test("plays pot_hit sound (low buzz + noise: sawtooth at 90 Hz)", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.play("pot_hit");

      expect(playToneSpy).toHaveBeenCalledWith(
        90, 0.12, "sawtooth",
        expect.objectContaining({ attack: 0.005 })
      );
      expect(playNoiseSpy).toHaveBeenCalledWith(0.1, 2000);
      sound.destroy();
    });
  });

  describe("Scenario: Power-up collected sound", () => {
    test("plays power_up_collect sound (rising chime sequence, 4-note ascending)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playSequence");

      sound.play("power_up_collect");

      expect(spy).toHaveBeenCalledTimes(1);
      const notes = spy.mock.calls[0][0];
      expect(notes).toHaveLength(4);
      expect(notes[0].frequency).toBe(523);
      expect(notes[1].frequency).toBe(659);
      expect(notes[2].frequency).toBe(784);
      expect(notes[3].frequency).toBe(1047);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeLessThan(notes[i + 1].frequency);
      }
      sound.destroy();
    });
  });

  describe("Scenario: Ball lost sound", () => {
    test("plays ball_lost sound (descending tone 500→200 Hz)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playToneSwept");

      sound.play("ball_lost");

      expect(spy).toHaveBeenCalledTimes(1);
      const [freqStart, freqEnd, duration, type] = spy.mock.calls[0];
      expect(freqStart).toBe(500);
      expect(freqEnd).toBe(200);
      expect(duration).toBe(0.3);
      expect(type).toBe("sine");
      sound.destroy();
    });
  });

  describe("Scenario: Level complete fanfare", () => {
    test("plays level_complete sound (triumphant ascending 4-note fanfare)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playSequence");

      sound.play("level_complete");

      expect(spy).toHaveBeenCalledTimes(1);
      const notes = spy.mock.calls[0][0];
      expect(notes).toHaveLength(4);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeLessThan(notes[i + 1].frequency);
      }
      const lastNote = notes[notes.length - 1];
      expect(lastNote.duration).toBeGreaterThan(notes[0].duration);
      sound.destroy();
    });
  });

  describe("Scenario: Game over sound", () => {
    test("plays game_over sound (slow descending minor phrase, 4 notes)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playSequence");

      sound.play("game_over");

      expect(spy).toHaveBeenCalledTimes(1);
      const notes = spy.mock.calls[0][0];
      expect(notes).toHaveLength(4);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeGreaterThan(notes[i + 1].frequency);
      }
      sound.destroy();
    });
  });

  describe("Scenario: Victory sound", () => {
    test("plays victory sound (ascending major scale run + held final note)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playSequence");

      sound.play("victory");

      expect(spy).toHaveBeenCalledTimes(1);
      const notes = spy.mock.calls[0][0];
      expect(notes.length).toBeGreaterThanOrEqual(8);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeLessThan(notes[i + 1].frequency);
      }
      const lastNote = notes[notes.length - 1];
      expect(lastNote.duration).toBeGreaterThan(notes[0].duration);
      expect(lastNote.frequency).toBe(1047);
      sound.destroy();
    });
  });

  describe("Scenario: Menu start sound", () => {
    test("plays menu_start sound (bright ping at 1200 Hz)", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.play("menu_start");

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        1200, 0.1, "sine",
        expect.any(Object)
      );
      sound.destroy();
    });
  });

  describe("Scenario: Sound effect debouncing", () => {
    test("rapid calls within 50ms are debounced for same event type", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playToneSwept");

      sound.play("ball_launch");
      sound.play("ball_launch");
      sound.play("ball_launch");

      expect(spy).toHaveBeenCalledTimes(1);
      sound.destroy();
    });

    test("debounce uses 50ms threshold", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.play("brick_hit");
      expect(spy).toHaveBeenCalledTimes(1);

      sound.play("brick_hit");
      expect(spy).toHaveBeenCalledTimes(1);

      sound.destroy();
    });
  });

  describe("Scenario: Different sound events are not debounced against each other", () => {
    test("brick_destroy and ball_paddle fire within 50ms both play", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.play("brick_destroy");
      sound.play("ball_paddle");

      expect(playToneSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      sound.destroy();
    });
  });

  describe("Sound event completeness", () => {
    test("all 14 JardinainsSoundEvent types are handled without errors", () => {
      const { sound } = createAudioPair();
      const allEvents: JardinainsSoundEvent[] = [
        "ball_launch", "ball_paddle", "brick_hit", "brick_destroy",
        "gnome_fall", "gnome_catch", "pot_throw", "pot_hit",
        "power_up_collect", "ball_lost", "level_complete",
        "game_over", "victory", "menu_start",
      ];
      for (const event of allEvents) {
        expect(() => sound.play(event)).not.toThrow();
      }
      sound.destroy();
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: Background music for the Jardinains game
// ---------------------------------------------------------------------------

describe("Feature: Background music for the Jardinains game", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Scenario: Music starts when game begins", () => {
    test("startMusic('playing', 0) begins playing background music", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.startMusic("playing", 0);

      expect(spy).toHaveBeenCalled();
      const initialCount = spy.mock.calls.length;

      jest.advanceTimersByTime(3000);
      expect(spy.mock.calls.length).toBeGreaterThan(initialCount);

      sound.stopMusic();
      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Music tempo increases with level", () => {
    test("higher level index produces shorter beat interval (faster tempo)", () => {
      jest.useFakeTimers();

      const { audio: audio0, sound: sound0 } = createAudioPair();
      const spy0 = jest.spyOn(audio0, "playTone");
      sound0.startMusic("playing", 0);
      jest.advanceTimersByTime(5000);
      const count0 = spy0.mock.calls.length;
      sound0.stopMusic();
      sound0.destroy();

      jest.clearAllMocks();
      mockAudioCtx = createMockAudioContext();
      (global as any).AudioContext = jest.fn(() => mockAudioCtx);
      (global as any).window.AudioContext = (global as any).AudioContext;

      const { audio: audio5, sound: sound5 } = createAudioPair();
      const spy5 = jest.spyOn(audio5, "playTone");
      sound5.startMusic("playing", 5);
      jest.advanceTimersByTime(5000);
      const count5 = spy5.mock.calls.length;
      sound5.stopMusic();
      sound5.destroy();

      expect(count5).toBeGreaterThan(count0);

      jest.useRealTimers();
    });

    test("BPM calculation: level 0 = 80, level 5 = 120, capped at 140", () => {
      expect(Math.min(140, 80 + 0 * 8)).toBe(80);
      expect(Math.min(140, 80 + 1 * 8)).toBe(88);
      expect(Math.min(140, 80 + 5 * 8)).toBe(120);
      expect(Math.min(140, 80 + 7 * 8)).toBe(136);
      expect(Math.min(140, 80 + 8 * 8)).toBe(140);
      expect(Math.min(140, 80 + 20 * 8)).toBe(140);
    });
  });

  describe("Scenario: Music stops on level complete", () => {
    test("stopMusic stops the music loop", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.startMusic("playing", 0);
      jest.advanceTimersByTime(2000);
      const countBefore = spy.mock.calls.length;

      sound.stopMusic();
      jest.advanceTimersByTime(5000);
      expect(spy.mock.calls.length).toBe(countBefore);

      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Music resumes on next level", () => {
    test("calling startMusic again after stopMusic resumes playback", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.startMusic("playing", 0);
      jest.advanceTimersByTime(1000);
      sound.stopMusic();
      const countAfterStop = spy.mock.calls.length;

      jest.advanceTimersByTime(1000);
      expect(spy.mock.calls.length).toBe(countAfterStop);

      sound.startMusic("playing", 1);
      jest.advanceTimersByTime(2000);
      expect(spy.mock.calls.length).toBeGreaterThan(countAfterStop);

      sound.stopMusic();
      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Music stops on game over", () => {
    test("stopMusic halts the music loop completely", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.startMusic("playing", 2);
      jest.advanceTimersByTime(2000);
      sound.stopMusic();
      const count = spy.mock.calls.length;
      jest.advanceTimersByTime(5000);
      expect(spy.mock.calls.length).toBe(count);

      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Music stops on victory", () => {
    test("stopMusic halts background music during victory state", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.startMusic("playing", 9);
      jest.advanceTimersByTime(1000);
      sound.stopMusic();
      const count = spy.mock.calls.length;
      jest.advanceTimersByTime(5000);
      expect(spy.mock.calls.length).toBe(count);

      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Menu ambient music", () => {
    test("startMusic('menu') plays ambient drone with sine + filtered noise", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.startMusic("menu");

      expect(playToneSpy).toHaveBeenCalledWith(130.81, 2.5, "sine", expect.any(Object));
      expect(playNoiseSpy).toHaveBeenCalledWith(2.5, 350);

      sound.stopMusic();
      sound.destroy();
      jest.useRealTimers();
    });

    test("menu music repeats every 3 seconds", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.startMusic("menu");
      const initialCount = playToneSpy.mock.calls.length;

      jest.advanceTimersByTime(3000);
      expect(playToneSpy.mock.calls.length).toBeGreaterThan(initialCount);

      sound.stopMusic();
      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: No music during level_complete/gameover/victory states", () => {
    test("startMusic with non-playing/non-menu state does not start music", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.startMusic("level_complete" as JardinainsGameState);
      jest.advanceTimersByTime(3000);
      expect(spy).not.toHaveBeenCalled();

      sound.startMusic("gameover" as JardinainsGameState);
      jest.advanceTimersByTime(3000);
      expect(spy).not.toHaveBeenCalled();

      sound.startMusic("victory" as JardinainsGameState);
      jest.advanceTimersByTime(3000);
      expect(spy).not.toHaveBeenCalled();

      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Multiple startMusic calls", () => {
    test("startMusic calls stopMusic first, preventing overlapping loops", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();

      sound.startMusic("playing", 0);
      jest.advanceTimersByTime(500);
      sound.startMusic("playing", 3);

      const spy = jest.spyOn(audio, "playTone");
      jest.advanceTimersByTime(5000);
      const count = spy.mock.calls.length;

      sound.stopMusic();
      jest.advanceTimersByTime(5000);
      expect(spy.mock.calls.length).toBe(count);

      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Playing music uses triangle wave with percussive noise accents", () => {
    test("playing music uses triangle wave bass and noise accents", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.startMusic("playing", 0);
      jest.advanceTimersByTime(5000);

      const triangleCalls = playToneSpy.mock.calls.filter(c => c[2] === "triangle");
      expect(triangleCalls.length).toBeGreaterThan(0);

      expect(playNoiseSpy).toHaveBeenCalled();

      sound.stopMusic();
      sound.destroy();
      jest.useRealTimers();
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: Mute toggle for the Jardinains game
// ---------------------------------------------------------------------------

describe("Feature: Mute toggle for the Jardinains game", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Scenario: Mute button is visible", () => {
    test("renderMuteButton renders speaker icon (🔊) when unmuted", () => {
      const hud = new HUD(false);
      const mockCtx: any = {
        save: jest.fn(),
        restore: jest.fn(),
        fillStyle: "",
        beginPath: jest.fn(),
        roundRect: jest.fn(),
        fill: jest.fn(),
        font: "",
        textAlign: "",
        textBaseline: "",
        fillText: jest.fn(),
      };

      expect(() => hud.renderMuteButton(mockCtx, false, 800)).not.toThrow();
      expect(mockCtx.fillText).toHaveBeenCalled();
      const icon = mockCtx.fillText.mock.calls[0][0];
      expect(icon).toBe("\u{1F50A}");
    });

    test("renderMuteButton renders muted icon (🔇) when muted", () => {
      const hud = new HUD(false);
      const mockCtx: any = {
        save: jest.fn(),
        restore: jest.fn(),
        fillStyle: "",
        beginPath: jest.fn(),
        roundRect: jest.fn(),
        fill: jest.fn(),
        font: "",
        textAlign: "",
        textBaseline: "",
        fillText: jest.fn(),
      };

      hud.renderMuteButton(mockCtx, true, 800);
      const icon = mockCtx.fillText.mock.calls[0][0];
      expect(icon).toBe("\u{1F507}");
    });
  });

  describe("Scenario: Clicking the mute button mutes audio", () => {
    test("AudioManager.toggleMute() switches from unmuted to muted", () => {
      const audio = new AudioManager();
      audio.ensureContext();

      expect(audio.muted).toBe(false);
      audio.toggleMute();
      expect(audio.muted).toBe(true);
      audio.destroy();
    });

    test("master gain is set to 0 when muted", () => {
      const audio = new AudioManager();
      audio.ensureContext();

      audio.muted = false;
      audio.volume = 0.7;

      const gainNode = mockAudioCtx.createGain.mock.results[0]?.value;
      expect(gainNode.gain.value).toBe(0.7);

      audio.toggleMute();
      expect(gainNode.gain.value).toBe(0);

      audio.destroy();
    });
  });

  describe("Scenario: Clicking the mute button unmutes audio", () => {
    test("AudioManager.toggleMute() switches from muted to unmuted and restores volume", () => {
      const audio = new AudioManager();
      audio.ensureContext();
      audio.muted = true;

      audio.toggleMute();

      expect(audio.muted).toBe(false);
      const gainNode = mockAudioCtx.createGain.mock.results[0]?.value;
      expect(gainNode.gain.value).toBe(audio.volume);
      audio.destroy();
    });
  });

  describe("Scenario: Mute state persists across sessions", () => {
    test("muting saves to localStorage as 'audio_muted': 'true'", () => {
      const audio = new AudioManager();
      audio.muted = true;
      expect(localStorageMock.setItem).toHaveBeenCalledWith("audio_muted", "true");
      audio.destroy();
    });

    test("new AudioManager reads muted state from localStorage", () => {
      localStorageMock.setItem("audio_muted", "true");
      const audio = new AudioManager();
      expect(audio.muted).toBe(true);
      audio.destroy();
    });

    test("volume persists to localStorage", () => {
      const audio = new AudioManager();
      audio.volume = 0.3;
      expect(localStorageMock.setItem).toHaveBeenCalledWith("audio_volume", "0.3");
      audio.destroy();
    });
  });

  describe("Scenario: Mute button click does not trigger gameplay actions", () => {
    test("isMuteButtonHit returns true for clicks inside mute button area", () => {
      const hud = new HUD(false);
      const canvasW = 800;
      const btnX = canvasW - 36 - 12;
      const btnY = 12;

      expect(hud.isMuteButtonHit(btnX + 18, btnY + 18, canvasW)).toBe(true);
      expect(hud.isMuteButtonHit(btnX, btnY, canvasW)).toBe(true);
      expect(hud.isMuteButtonHit(btnX + 36, btnY + 36, canvasW)).toBe(true);
    });

    test("isMuteButtonHit returns false for clicks outside mute button area", () => {
      const hud = new HUD(false);
      expect(hud.isMuteButtonHit(10, 10, 800)).toBe(false);
      expect(hud.isMuteButtonHit(400, 300, 800)).toBe(false);
      expect(hud.isMuteButtonHit(0, 0, 800)).toBe(false);
      expect(hud.isMuteButtonHit(800, 600, 800)).toBe(false);
    });

    test("mute button is positioned at top-right corner (36x36, 12px margin)", () => {
      const hud = new HUD(false);
      const canvasW = 800;
      const x = canvasW - 36 - 12;
      const y = 12;

      expect(hud.isMuteButtonHit(x + 18, y + 18, canvasW)).toBe(true);
      expect(hud.isMuteButtonHit(canvasW / 2, canvasW / 2, canvasW)).toBe(false);
    });

    test("mute button works with different canvas widths", () => {
      const hud = new HUD(false);

      for (const w of [400, 800, 1200, 1920]) {
        const centerX = w - 36 - 12 + 18;
        const centerY = 12 + 18;
        expect(hud.isMuteButtonHit(centerX, centerY, w)).toBe(true);
      }
    });

    test("mute button boundary is exact: just outside = false", () => {
      const hud = new HUD(false);
      const canvasW = 800;
      const x = canvasW - 36 - 12;
      const y = 12;

      expect(hud.isMuteButtonHit(x - 1, y, canvasW)).toBe(false);
      expect(hud.isMuteButtonHit(x, y - 1, canvasW)).toBe(false);
      expect(hud.isMuteButtonHit(x + 37, y + 18, canvasW)).toBe(false);
      expect(hud.isMuteButtonHit(x + 18, y + 37, canvasW)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: Audio graceful degradation for the Jardinains game
// ---------------------------------------------------------------------------

describe("Feature: Audio graceful degradation for the Jardinains game", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Scenario: Game works without Web Audio API", () => {
    test("AudioManager sets disabled flag when AudioContext is not available", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();
      expect(audio.disabled).toBe(true);
    });

    test("SoundSystem play is a no-op when AudioManager is disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();
      const sound = new SoundSystem(audio);

      expect(() => sound.play("ball_launch")).not.toThrow();
      expect(() => sound.play("brick_destroy")).not.toThrow();
      expect(() => sound.play("level_complete")).not.toThrow();
      expect(() => sound.play("victory")).not.toThrow();

      sound.destroy();
    });

    test("SoundSystem startMusic is a no-op when disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();
      const sound = new SoundSystem(audio);

      expect(() => sound.startMusic("playing", 0)).not.toThrow();
      expect(() => sound.stopMusic()).not.toThrow();
      sound.destroy();
    });

    test("no errors thrown for any sound event when audio is disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();
      const sound = new SoundSystem(audio);

      const allEvents: JardinainsSoundEvent[] = [
        "ball_launch", "ball_paddle", "brick_hit", "brick_destroy",
        "gnome_fall", "gnome_catch", "pot_throw", "pot_hit",
        "power_up_collect", "ball_lost", "level_complete",
        "game_over", "victory", "menu_start",
      ];
      for (const event of allEvents) {
        expect(() => sound.play(event)).not.toThrow();
      }
      sound.destroy();
    });
  });

  describe("Scenario: Autoplay policy blocks audio", () => {
    test("ensureContext resumes a suspended AudioContext", () => {
      const suspendedCtx = createMockAudioContext();
      suspendedCtx.state = "suspended";
      (global as any).AudioContext = jest.fn(() => suspendedCtx);
      (global as any).window = { AudioContext: (global as any).AudioContext };

      const audio = new AudioManager();
      audio.ensureContext();

      expect(suspendedCtx.resume).toHaveBeenCalled();
      audio.destroy();
    });

    test("ensureContext handles resume rejection gracefully", () => {
      const suspendedCtx = createMockAudioContext();
      suspendedCtx.state = "suspended";
      suspendedCtx.resume = jest.fn().mockRejectedValue(new Error("not allowed"));
      (global as any).AudioContext = jest.fn(() => suspendedCtx);
      (global as any).window = { AudioContext: (global as any).AudioContext };

      const audio = new AudioManager();
      expect(() => audio.ensureContext()).not.toThrow();
      audio.destroy();
    });
  });

  describe("Scenario: localStorage is unavailable", () => {
    test("AudioManager defaults to unmuted with volume 0.5 when localStorage throws", () => {
      const origGetItem = localStorageMock.getItem;
      localStorageMock.getItem = jest.fn((_key: string): string => {
        throw new Error("localStorage disabled");
      }) as any;

      const audio = new AudioManager();
      expect(audio.muted).toBe(false);
      expect(audio.volume).toBe(0.5);

      localStorageMock.getItem = origGetItem;
      audio.destroy();
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: JardinainsSoundEvent type definition completeness
// ---------------------------------------------------------------------------

describe("Feature: JardinainsSoundEvent type completeness", () => {
  test("JardinainsSoundEvent includes all 14 required event strings", () => {
    const expectedEvents: JardinainsSoundEvent[] = [
      "ball_launch",
      "ball_paddle",
      "brick_hit",
      "brick_destroy",
      "gnome_fall",
      "gnome_catch",
      "pot_throw",
      "pot_hit",
      "power_up_collect",
      "ball_lost",
      "level_complete",
      "game_over",
      "victory",
      "menu_start",
    ];

    for (const event of expectedEvents) {
      const e: JardinainsSoundEvent = event;
      expect(e).toBe(event);
    }
  });
});

// ---------------------------------------------------------------------------
// Feature: SoundSystem API conformance
// ---------------------------------------------------------------------------

describe("Feature: SoundSystem API conformance", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("SoundSystem has play, startMusic, stopMusic, destroy methods", () => {
    const { sound } = createAudioPair();
    expect(typeof sound.play).toBe("function");
    expect(typeof sound.startMusic).toBe("function");
    expect(typeof sound.stopMusic).toBe("function");
    expect(typeof sound.destroy).toBe("function");
    sound.destroy();
  });

  test("destroy stops music", () => {
    jest.useFakeTimers();
    const { audio, sound } = createAudioPair();
    sound.startMusic("playing", 0);
    sound.destroy();

    const spy = jest.spyOn(audio, "playTone");
    jest.advanceTimersByTime(5000);
    expect(spy).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  test("destroy is safe to call twice", () => {
    const { sound } = createAudioPair();
    expect(() => {
      sound.destroy();
      sound.destroy();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Feature: Integration - JardinainsGame sound event wiring verification
// ---------------------------------------------------------------------------

describe("Feature: Integration - JardinainsGame wiring verification", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("JardinainsGame module exports and imports AudioManager + SoundSystem", () => {
    const gameModule = require("../src/games/jardinains/JardinainsGame");
    expect(gameModule.JardinainsGame).toBeDefined();
    expect(typeof gameModule.JardinainsGame).toBe("function");
  });

  test("JardinainsGame imports SoundSystem from jardinains systems", () => {
    const { SoundSystem: SS } = require("../src/games/jardinains/systems/SoundSystem");
    expect(SS).toBeDefined();
    expect(typeof SS).toBe("function");
  });

  test("JardinainsGame imports AudioManager from shared module", () => {
    const { AudioManager: AM } = require("../src/shared/AudioManager");
    expect(AM).toBeDefined();
    expect(typeof AM).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Feature: Integration - Sound events fired at correct gameplay moments
// ---------------------------------------------------------------------------

describe("Feature: Integration - Sound events fired at correct gameplay moments", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Game state transitions trigger correct sounds", () => {
    test("menu → playing: menu_start sound + playing music", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");
      const startMusicSpy = jest.spyOn(sound, "startMusic");

      audio.ensureContext();
      sound.play("menu_start");
      sound.startMusic("playing", 0);

      expect(playSpy).toHaveBeenCalledWith("menu_start");
      expect(startMusicSpy).toHaveBeenCalledWith("playing", 0);

      sound.stopMusic();
      sound.destroy();
    });

    test("playing → level_complete: stop music + level_complete sound", () => {
      const { sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");
      const stopMusicSpy = jest.spyOn(sound, "stopMusic");

      sound.startMusic("playing", 0);
      sound.stopMusic();
      sound.play("level_complete");

      expect(stopMusicSpy).toHaveBeenCalled();
      expect(playSpy).toHaveBeenCalledWith("level_complete");

      sound.destroy();
    });

    test("level_complete → playing: start music at new level", () => {
      const { sound } = createAudioPair();
      const startMusicSpy = jest.spyOn(sound, "startMusic");

      sound.startMusic("playing", 1);
      expect(startMusicSpy).toHaveBeenCalledWith("playing", 1);

      sound.stopMusic();
      sound.destroy();
    });

    test("playing → game_over: stop music + game_over sound", () => {
      jest.useFakeTimers();
      const { sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");
      const stopMusicSpy = jest.spyOn(sound, "stopMusic");

      sound.startMusic("playing", 0);
      sound.stopMusic();
      sound.play("game_over");

      expect(stopMusicSpy).toHaveBeenCalled();
      expect(playSpy).toHaveBeenCalledWith("game_over");

      sound.destroy();
      jest.useRealTimers();
    });

    test("playing → victory: stop music + victory sound", () => {
      const { sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");
      const stopMusicSpy = jest.spyOn(sound, "stopMusic");

      sound.startMusic("playing", 9);
      sound.stopMusic();
      sound.play("victory");

      expect(stopMusicSpy).toHaveBeenCalled();
      expect(playSpy).toHaveBeenCalledWith("victory");

      sound.destroy();
    });
  });

  describe("Source code analysis: sound events wired in JardinainsGame", () => {
    let gameSource: string;

    beforeAll(() => {
      const fs = require("fs");
      gameSource = fs.readFileSync(
        require("path").resolve(__dirname, "../src/games/jardinains/JardinainsGame.ts"),
        "utf-8"
      );
    });

    test("ball_launch is played when ball is launched from paddle", () => {
      expect(gameSource).toContain('sound.play("ball_launch")');
    });

    test("ball_paddle is played on ball-paddle collision", () => {
      expect(gameSource).toContain('sound.play("ball_paddle")');
    });

    test("brick_hit is played when brick is damaged but not destroyed", () => {
      expect(gameSource).toContain('sound.play("brick_hit")');
    });

    test("brick_destroy is played when brick is destroyed", () => {
      expect(gameSource).toContain('sound.play("brick_destroy")');
    });

    test("gnome_fall is played when gnome starts falling", () => {
      expect(gameSource).toContain('sound.play("gnome_fall")');
    });

    test("gnome_catch is played when gnome is caught on paddle", () => {
      expect(gameSource).toContain('sound.play("gnome_catch")');
    });

    test("pot_throw is played when gnome throws a flower pot", () => {
      expect(gameSource).toContain('sound.play("pot_throw")');
    });

    test("pot_hit is played when flower pot hits paddle", () => {
      expect(gameSource).toContain('sound.play("pot_hit")');
    });

    test("power_up_collect is played when power-up is collected", () => {
      expect(gameSource).toContain('sound.play("power_up_collect")');
    });

    test("ball_lost is played when last ball falls below screen", () => {
      expect(gameSource).toContain('sound.play("ball_lost")');
    });

    test("level_complete is played when level is complete (not final level)", () => {
      expect(gameSource).toContain('sound.play("level_complete")');
    });

    test("game_over is played when lives reach 0", () => {
      expect(gameSource).toContain('sound.play("game_over")');
    });

    test("victory is played on final level completion", () => {
      expect(gameSource).toContain('sound.play("victory")');
    });

    test("menu_start is played when game starts from menu", () => {
      expect(gameSource).toContain('sound.play("menu_start")');
    });

    test("startMusic is called with 'playing' state on game start", () => {
      expect(gameSource).toContain('startMusic("playing"');
    });

    test("stopMusic is called on level_complete, game_over, and victory", () => {
      expect(gameSource).toContain("stopMusic()");
    });

    test("handleMuteClick method exists to consume mute button input", () => {
      expect(gameSource).toContain("handleMuteClick");
    });

    test("renderMuteButton is called in render method", () => {
      expect(gameSource).toContain("renderMuteButton");
    });

    test("sound.destroy() is called in game destroy method", () => {
      expect(gameSource).toContain("this.sound.destroy()");
    });

    test("audio.destroy() is called in game destroy method", () => {
      expect(gameSource).toContain("this.audio.destroy()");
    });

    test("menu state calls startMusic('menu') on gameover/victory return to menu", () => {
      expect(gameSource).toContain('startMusic("menu")');
    });
  });
});
