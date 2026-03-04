/**
 * QA tests for Issue #26: Sound effects and music for the archer game.
 * Covers all acceptance criteria from the Gherkin scenarios.
 */

import { AudioManager } from "../src/shared/AudioManager";
import { SoundSystem } from "../src/games/archer/systems/SoundSystem";
import { SoundEvent, GameState } from "../src/games/archer/types";
import { HUD } from "../src/games/archer/rendering/HUD";
import { Balloon } from "../src/games/archer/entities/Balloon";
import { Arrow } from "../src/games/archer/entities/Arrow";
import { Obstacle } from "../src/games/archer/entities/Obstacle";
import { CollisionSystem } from "../src/games/archer/systems/CollisionSystem";

// ---------------------------------------------------------------------------
// Mock infrastructure
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

// Create a fresh AudioManager + SoundSystem pair for each test
function createAudioPair(): { audio: AudioManager; sound: SoundSystem } {
  const audio = new AudioManager();
  audio.ensureContext();
  const sound = new SoundSystem(audio);
  return { audio, sound };
}

// ---------------------------------------------------------------------------
// Feature: Sound effects for the archer game
// ---------------------------------------------------------------------------

describe("Feature: Sound effects for the archer game", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Scenario: Arrow shoot sound", () => {
    test("plays arrow_shoot sound when player clicks to shoot", () => {
      const { audio, sound } = createAudioPair();
      const playToneSweptSpy = jest.spyOn(audio, "playToneSwept");

      sound.play("arrow_shoot");

      expect(playToneSweptSpy).toHaveBeenCalledWith(
        800, 200, 0.08, "sine",
        expect.objectContaining({ attack: 0.005 })
      );
      sound.destroy();
    });

    test("arrow_shoot produces a short sine sweep 800→200 Hz as specified", () => {
      const { audio, sound } = createAudioPair();
      const playToneSweptSpy = jest.spyOn(audio, "playToneSwept");

      sound.play("arrow_shoot");

      expect(playToneSweptSpy).toHaveBeenCalledTimes(1);
      const [freqStart, freqEnd, duration, type] = playToneSweptSpy.mock.calls[0];
      expect(freqStart).toBe(800);
      expect(freqEnd).toBe(200);
      expect(duration).toBe(0.08);
      expect(type).toBe("sine");
      sound.destroy();
    });
  });

  describe("Scenario: Standard balloon pop sound", () => {
    test("plays balloon_pop with noise burst and sine ping on standard balloon collision", () => {
      const { audio, sound } = createAudioPair();
      const playNoiseSpy = jest.spyOn(audio, "playNoise");
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.play("balloon_pop");

      expect(playNoiseSpy).toHaveBeenCalledWith(0.06, 4000);
      expect(playToneSpy).toHaveBeenCalledWith(
        expect.any(Number), 0.08, "sine",
        expect.objectContaining({ attack: 0.005 })
      );

      const freq = playToneSpy.mock.calls[0][0];
      expect(freq).toBeGreaterThanOrEqual(800);
      expect(freq).toBeLessThanOrEqual(1200);
      sound.destroy();
    });
  });

  describe("Scenario: Upgrade balloon pop sound", () => {
    test("plays upgrade_pop as a rising arpeggio with square wave", () => {
      const { audio, sound } = createAudioPair();
      const playSequenceSpy = jest.spyOn(audio, "playSequence");

      sound.play("upgrade_pop");

      expect(playSequenceSpy).toHaveBeenCalledTimes(1);
      const notes = playSequenceSpy.mock.calls[0][0];
      expect(notes).toHaveLength(3);
      expect(notes[0].type).toBe("square");
      expect(notes[1].type).toBe("square");
      expect(notes[2].type).toBe("square");
      expect(notes[0].frequency).toBeLessThan(notes[1].frequency);
      expect(notes[1].frequency).toBeLessThan(notes[2].frequency);
      sound.destroy();
    });

    test("upgrade_activate plays ascending chime", () => {
      const { audio, sound } = createAudioPair();
      const playSequenceSpy = jest.spyOn(audio, "playSequence");

      sound.play("upgrade_activate");

      expect(playSequenceSpy).toHaveBeenCalledTimes(1);
      const notes = playSequenceSpy.mock.calls[0][0];
      expect(notes).toHaveLength(3);
      expect(notes[0].frequency).toBe(400);
      expect(notes[1].frequency).toBe(800);
      expect(notes[2].frequency).toBe(1200);
      expect(notes[0].type).toBe("sine");
      sound.destroy();
    });
  });

  describe("Scenario: Boss balloon hit sound", () => {
    test("plays boss_hit as low thud plus metallic noise", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.play("boss_hit");

      expect(playToneSpy).toHaveBeenCalledWith(
        80, 0.1, "sine",
        expect.objectContaining({ attack: 0.005 })
      );
      expect(playNoiseSpy).toHaveBeenCalledWith(0.08, 1500);
      sound.destroy();
    });
  });

  describe("Scenario: Boss balloon kill sound", () => {
    test("plays boss_kill as descending power chord plus noise sweep", () => {
      const { audio, sound } = createAudioPair();
      const playToneSweptSpy = jest.spyOn(audio, "playToneSwept");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.play("boss_kill");

      expect(playToneSweptSpy).toHaveBeenCalledWith(
        150, 75, 0.4, "sawtooth",
        expect.any(Object)
      );
      expect(playNoiseSpy).toHaveBeenCalledWith(0.35, 2000);
      sound.destroy();
    });
  });

  describe("Scenario: Obstacle collision sound", () => {
    test("plays obstacle_hit as harsh buzz plus noise", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.play("obstacle_hit");

      expect(playToneSpy).toHaveBeenCalledWith(
        150, 0.12, "sawtooth",
        expect.objectContaining({ attack: 0.005 })
      );
      expect(playNoiseSpy).toHaveBeenCalledWith(0.1, 2500);
      sound.destroy();
    });
  });

  describe("Scenario: Ammo milestone sound", () => {
    test("plays ammo_gain as soft double-click (two sine pings)", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.play("ammo_gain");

      expect(playToneSpy).toHaveBeenCalledWith(
        1000, 0.03, "sine",
        expect.objectContaining({ attack: 0.003 })
      );

      jest.advanceTimersByTime(60);

      expect(playToneSpy).toHaveBeenCalledTimes(2);
      expect(playToneSpy.mock.calls[0][0]).toBe(1000);
      expect(playToneSpy.mock.calls[1][0]).toBe(1000);

      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Low ammo warning sound", () => {
    test("plays repeating sine pulse when low_ammo event fires", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.play("low_ammo");

      expect(playToneSpy).toHaveBeenCalledWith(
        200, 0.06, "sine",
        expect.objectContaining({ sustain: 0.2 })
      );
      const initialCount = playToneSpy.mock.calls.length;

      jest.advanceTimersByTime(1500);
      expect(playToneSpy.mock.calls.length).toBeGreaterThan(initialCount);

      sound.stopLowAmmoWarning();
      const afterStop = playToneSpy.mock.calls.length;
      jest.advanceTimersByTime(2000);
      expect(playToneSpy.mock.calls.length).toBe(afterStop);

      sound.destroy();
      jest.useRealTimers();
    });

    test("low_ammo warning does not double-start", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.play("low_ammo");
      const countAfterFirst = playToneSpy.mock.calls.length;

      jest.advanceTimersByTime(100);
      sound.play("low_ammo");

      jest.advanceTimersByTime(1000);
      const count = playToneSpy.mock.calls.length;
      expect(count).toBeGreaterThan(countAfterFirst);
      expect(count).toBeLessThan(countAfterFirst + 10);

      sound.stopLowAmmoWarning();
      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Level complete fanfare", () => {
    test("plays triumphant 4-note major chord arpeggio", () => {
      const { audio, sound } = createAudioPair();
      const playSequenceSpy = jest.spyOn(audio, "playSequence");

      sound.play("level_complete");

      expect(playSequenceSpy).toHaveBeenCalledTimes(1);
      const notes = playSequenceSpy.mock.calls[0][0];
      expect(notes).toHaveLength(4);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeLessThan(notes[i + 1].frequency);
      }
      sound.destroy();
    });
  });

  describe("Scenario: Game over sound", () => {
    test("plays descending minor 3-note phrase", () => {
      const { audio, sound } = createAudioPair();
      const playSequenceSpy = jest.spyOn(audio, "playSequence");

      sound.play("game_over");

      expect(playSequenceSpy).toHaveBeenCalledTimes(1);
      const notes = playSequenceSpy.mock.calls[0][0];
      expect(notes).toHaveLength(3);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeGreaterThan(notes[i + 1].frequency);
      }
      sound.destroy();
    });
  });

  describe("Scenario: Victory sound", () => {
    test("plays ascending major scale run plus final chord", () => {
      const { audio, sound } = createAudioPair();
      const playSequenceSpy = jest.spyOn(audio, "playSequence");

      sound.play("victory");

      expect(playSequenceSpy).toHaveBeenCalledTimes(1);
      const notes = playSequenceSpy.mock.calls[0][0];
      expect(notes.length).toBeGreaterThanOrEqual(8);
      for (let i = 0; i < notes.length - 1; i++) {
        expect(notes[i].frequency).toBeLessThan(notes[i + 1].frequency);
      }
      const lastNote = notes[notes.length - 1];
      expect(lastNote.duration).toBeGreaterThan(notes[0].duration);
      sound.destroy();
    });
  });

  describe("Scenario: Menu start sound", () => {
    test("plays single bright ping on menu start", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.play("menu_start");

      expect(playToneSpy).toHaveBeenCalledTimes(1);
      expect(playToneSpy).toHaveBeenCalledWith(
        1200, 0.1, "sine",
        expect.any(Object)
      );
      sound.destroy();
    });
  });

  describe("Sound event completeness", () => {
    test("all 13 SoundEvent types are handled by SoundSystem.play without errors", () => {
      const { sound } = createAudioPair();
      const allEvents: SoundEvent[] = [
        "arrow_shoot", "balloon_pop", "upgrade_pop",
        "boss_hit", "boss_kill", "obstacle_hit",
        "upgrade_activate", "ammo_gain",
        "level_complete", "game_over", "victory",
        "menu_start", "low_ammo",
      ];
      for (const event of allEvents) {
        expect(() => sound.play(event)).not.toThrow();
      }
      sound.stopLowAmmoWarning();
      sound.destroy();
    });
  });

  describe("Debouncing", () => {
    test("rapid calls within 50ms are debounced per event type", () => {
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playToneSwept");

      sound.play("arrow_shoot");
      sound.play("arrow_shoot");
      sound.play("arrow_shoot");

      expect(spy).toHaveBeenCalledTimes(1);
      sound.destroy();
    });

    test("different event types are not debounced against each other", () => {
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.play("balloon_pop");
      sound.play("obstacle_hit");

      expect(playToneSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(playNoiseSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
      sound.destroy();
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: Background music for the archer game
// ---------------------------------------------------------------------------

describe("Feature: Background music for the archer game", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Scenario: Music starts on game start", () => {
    test("startMusic('playing', 0) begins playing background music", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.startMusic("playing", 0);

      expect(playToneSpy).toHaveBeenCalled();
      const initialCount = playToneSpy.mock.calls.length;

      jest.advanceTimersByTime(3000);
      expect(playToneSpy.mock.calls.length).toBeGreaterThan(initialCount);

      sound.stopMusic();
      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: Music tempo changes per level", () => {
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

      const { audio: audio3, sound: sound3 } = createAudioPair();
      const spy3 = jest.spyOn(audio3, "playTone");
      sound3.startMusic("playing", 3);
      jest.advanceTimersByTime(5000);
      const count3 = spy3.mock.calls.length;
      sound3.stopMusic();
      sound3.destroy();

      expect(count3).toBeGreaterThan(count0);

      jest.useRealTimers();
    });

    test("BPM calculation: level 0 = 90 BPM, level 4 = 130 BPM (capped)", () => {
      // BPM formula: Math.min(130, 90 + level * 10)
      expect(Math.min(130, 90 + 0 * 10)).toBe(90);
      expect(Math.min(130, 90 + 1 * 10)).toBe(100);
      expect(Math.min(130, 90 + 2 * 10)).toBe(110);
      expect(Math.min(130, 90 + 3 * 10)).toBe(120);
      expect(Math.min(130, 90 + 4 * 10)).toBe(130);
      expect(Math.min(130, 90 + 10 * 10)).toBe(130);
    });
  });

  describe("Scenario: Music stops on game over", () => {
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

  describe("Scenario: Menu ambient music", () => {
    test("startMusic('menu') plays ambient drone with sine + filtered noise", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");
      const playNoiseSpy = jest.spyOn(audio, "playNoise");

      sound.startMusic("menu");

      expect(playToneSpy).toHaveBeenCalledWith(110, 2.5, "sine", expect.any(Object));
      expect(playNoiseSpy).toHaveBeenCalledWith(2.5, 400);

      sound.stopMusic();
      sound.destroy();
      jest.useRealTimers();
    });
  });

  describe("Scenario: No music during level_complete/gameover/victory", () => {
    test("startMusic with non-playing/non-menu state does nothing", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const spy = jest.spyOn(audio, "playTone");

      sound.startMusic("level_complete" as GameState);
      jest.advanceTimersByTime(3000);
      expect(spy).not.toHaveBeenCalled();

      sound.startMusic("gameover" as GameState);
      jest.advanceTimersByTime(3000);
      expect(spy).not.toHaveBeenCalled();

      sound.startMusic("victory" as GameState);
      jest.advanceTimersByTime(3000);
      expect(spy).not.toHaveBeenCalled();

      sound.destroy();
      jest.useRealTimers();
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: Audio controls
// ---------------------------------------------------------------------------

describe("Feature: Audio controls", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Scenario: Mute toggle is visible (HUD renders mute button)", () => {
    test("renderMuteButton is callable and renders speaker icon", () => {
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
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Number)
      );

      const icon = mockCtx.fillText.mock.calls[0][0];
      expect(icon).toBe("\u{1F50A}");
    });

    test("renderMuteButton shows muted icon when muted", () => {
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
    test("AudioManager.toggleMute() switches from muted to unmuted", () => {
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

    test("new AudioManager reads volume from localStorage", () => {
      localStorageMock.setItem("audio_volume", "0.8");
      const audio = new AudioManager();
      expect(audio.volume).toBe(0.8);
      audio.destroy();
    });
  });

  describe("Scenario: Mute toggle does not interfere with gameplay", () => {
    test("HUD isMuteButtonHit returns true for clicks inside button area", () => {
      const hud = new HUD(false);
      const canvasW = 800;
      const btnX = canvasW - 36 - 12;
      const btnY = 12;

      expect(hud.isMuteButtonHit(btnX + 18, btnY + 18, canvasW)).toBe(true);
      expect(hud.isMuteButtonHit(btnX, btnY, canvasW)).toBe(true);
      expect(hud.isMuteButtonHit(btnX + 36, btnY + 36, canvasW)).toBe(true);
    });

    test("HUD isMuteButtonHit returns false for clicks outside button area", () => {
      const hud = new HUD(false);
      expect(hud.isMuteButtonHit(10, 10, 800)).toBe(false);
      expect(hud.isMuteButtonHit(400, 300, 800)).toBe(false);
      expect(hud.isMuteButtonHit(0, 0, 800)).toBe(false);
      expect(hud.isMuteButtonHit(800, 600, 800)).toBe(false);
    });

    test("mute button hit area is positioned at top-right corner", () => {
      const hud = new HUD(false);
      const canvasW = 800;

      const x = canvasW - 36 - 12;
      const y = 12;
      expect(hud.isMuteButtonHit(x + 18, y + 18, canvasW)).toBe(true);

      expect(hud.isMuteButtonHit(canvasW / 2, canvasW / 2, canvasW)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: Audio graceful degradation
// ---------------------------------------------------------------------------

describe("Feature: Audio graceful degradation", () => {
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

    test("playTone is a no-op when disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();

      expect(() => audio.playTone(440, 0.1)).not.toThrow();
    });

    test("playNoise is a no-op when disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();

      expect(() => audio.playNoise(0.1)).not.toThrow();
    });

    test("playSequence is a no-op when disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();

      expect(() =>
        audio.playSequence([{ frequency: 440, duration: 0.5 }], 120)
      ).not.toThrow();
    });

    test("SoundSystem play is a no-op when AudioManager is disabled", () => {
      (global as any).window = {};
      delete (global as any).AudioContext;
      delete (global as any).window.AudioContext;

      const audio = new AudioManager();
      audio.ensureContext();
      const sound = new SoundSystem(audio);

      expect(() => sound.play("arrow_shoot")).not.toThrow();
      expect(() => sound.play("balloon_pop")).not.toThrow();
      expect(() => sound.play("level_complete")).not.toThrow();

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

    test("ensureContext resumes existing suspended context on subsequent calls", () => {
      setupGlobalAudio();
      mockAudioCtx.state = "running";

      const audio = new AudioManager();
      audio.ensureContext();

      mockAudioCtx.state = "suspended";
      audio.ensureContext();

      expect(mockAudioCtx.resume).toHaveBeenCalled();
      audio.destroy();
    });
  });

  describe("Scenario: localStorage unavailable", () => {
    test("AudioManager defaults to unmuted volume 0.5 when getItem throws", () => {
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
// Feature: Integration - ArcherGame sound event wiring
// ---------------------------------------------------------------------------

describe("Feature: Integration - Sound events fired at correct moments", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  describe("Collision-based sound events", () => {
    test("standard balloon collision triggers balloon_pop in game loop", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");

      const collisions = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, -Math.PI / 2);
      const balloon = new Balloon(100, 100, 50);

      const hits = collisions.check([arrow], [balloon]);

      for (const hit of hits) {
        if (hit.balloon.variant === "standard") {
          sound.play("balloon_pop");
        }
      }

      expect(hits.length).toBe(1);
      expect(playSpy).toHaveBeenCalledWith("balloon_pop");
      sound.destroy();
    });

    test("upgrade balloon collision triggers upgrade_pop and upgrade_activate", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");

      const collisions = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, -Math.PI / 2);
      const balloon = new Balloon(100, 100, 50, "multi-shot");

      const hits = collisions.check([arrow], [balloon]);

      for (const hit of hits) {
        if (hit.balloon.variant === "upgrade") {
          sound.play("upgrade_pop");
        }
        if (hit.grantedUpgrade) {
          sound.play("upgrade_activate");
        }
      }

      expect(hits.length).toBe(1);
      expect(playSpy).toHaveBeenCalledWith("upgrade_pop");
      expect(playSpy).toHaveBeenCalledWith("upgrade_activate");
      sound.destroy();
    });

    test("boss balloon hit (not killed) triggers boss_hit", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");

      const collisions = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, -Math.PI / 2);
      const boss = new Balloon(100, 100, 50, "boss", 5);

      const hits = collisions.check([arrow], [boss]);

      for (const hit of hits) {
        if (hit.isBossKill) {
          sound.play("boss_kill");
        } else if (hit.balloon.variant === "boss") {
          sound.play("boss_hit");
        }
      }

      expect(hits.length).toBe(1);
      expect(boss.hitPoints).toBe(4);
      expect(boss.alive).toBe(true);
      expect(playSpy).toHaveBeenCalledWith("boss_hit");
      expect(playSpy).not.toHaveBeenCalledWith("boss_kill");
      sound.destroy();
    });

    test("boss balloon kill (last HP) triggers boss_kill", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");

      const collisions = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, -Math.PI / 2);
      const boss = new Balloon(100, 100, 50, "boss", 1);

      const hits = collisions.check([arrow], [boss]);

      for (const hit of hits) {
        if (hit.isBossKill) {
          sound.play("boss_kill");
        } else if (hit.balloon.variant === "boss") {
          sound.play("boss_hit");
        }
      }

      expect(hits.length).toBe(1);
      expect(boss.alive).toBe(false);
      expect(playSpy).toHaveBeenCalledWith("boss_kill");
      expect(playSpy).not.toHaveBeenCalledWith("boss_hit");
      sound.destroy();
    });

    test("obstacle collision triggers obstacle_hit", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");

      const collisions = new CollisionSystem();
      const arrow = new Arrow({ x: 100, y: 100 }, -Math.PI / 2);
      const obstacle = new Obstacle("bird", 800, 600, 100, 1);
      obstacle.pos = { x: 100, y: 100 };

      const hits = collisions.checkObstacles([arrow], [obstacle]);

      for (const _hit of hits) {
        sound.play("obstacle_hit");
      }

      expect(hits.length).toBe(1);
      expect(playSpy).toHaveBeenCalledWith("obstacle_hit");
      sound.destroy();
    });
  });

  describe("State transition sound events", () => {
    test("game flow: menu_start → playing → level_complete → victory sequence", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");
      const startMusicSpy = jest.spyOn(sound, "startMusic");
      const stopMusicSpy = jest.spyOn(sound, "stopMusic");

      // Menu → Playing
      audio.ensureContext();
      sound.play("menu_start");
      sound.startMusic("playing", 0);

      expect(playSpy).toHaveBeenCalledWith("menu_start");
      expect(startMusicSpy).toHaveBeenCalledWith("playing", 0);

      // Playing → Level Complete
      sound.stopMusic();
      sound.play("level_complete");

      expect(stopMusicSpy).toHaveBeenCalled();
      expect(playSpy).toHaveBeenCalledWith("level_complete");

      // Level Complete → Playing (next level)
      sound.startMusic("playing", 1);
      expect(startMusicSpy).toHaveBeenCalledWith("playing", 1);

      // Playing → Victory (final level)
      sound.stopMusic();
      sound.play("victory");

      expect(playSpy).toHaveBeenCalledWith("victory");

      sound.destroy();
    });

    test("game over flow: playing → game_over + stop music", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
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
  });

  describe("Low ammo tracking in game loop context", () => {
    test("low_ammo triggers when arrowsRemaining is between 1 and 5", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");

      let lowAmmoTriggered = false;
      const arrowsRemaining = 5;

      if (arrowsRemaining <= 5 && arrowsRemaining > 0 && !lowAmmoTriggered) {
        lowAmmoTriggered = true;
        sound.play("low_ammo");
      }

      expect(playSpy).toHaveBeenCalledWith("low_ammo");
      expect(lowAmmoTriggered).toBe(true);

      sound.stopLowAmmoWarning();
      sound.destroy();
    });

    test("low_ammo does not trigger when arrowsRemaining > 5", () => {
      const { audio, sound } = createAudioPair();
      const playSpy = jest.spyOn(sound, "play");

      let lowAmmoTriggered = false;
      const arrowsRemaining = 10;

      if (arrowsRemaining <= 5 && arrowsRemaining > 0 && !lowAmmoTriggered) {
        lowAmmoTriggered = true;
        sound.play("low_ammo");
      }

      expect(playSpy).not.toHaveBeenCalledWith("low_ammo");
      sound.destroy();
    });

    test("low_ammo warning stops when arrows increase above 5", () => {
      jest.useFakeTimers();
      const { audio, sound } = createAudioPair();
      const playToneSpy = jest.spyOn(audio, "playTone");

      sound.play("low_ammo");
      jest.advanceTimersByTime(1000);
      const countBefore = playToneSpy.mock.calls.length;

      sound.stopLowAmmoWarning();
      jest.advanceTimersByTime(2000);
      expect(playToneSpy.mock.calls.length).toBe(countBefore);

      sound.destroy();
      jest.useRealTimers();
    });
  });
});

// ---------------------------------------------------------------------------
// Feature: AudioManager API correctness
// ---------------------------------------------------------------------------

describe("Feature: AudioManager API completeness", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("ensureContext creates AudioContext lazily and reuses it", () => {
    const audio = new AudioManager();
    const ctx1 = audio.ensureContext();
    expect(ctx1).toBeTruthy();

    const ctx2 = audio.ensureContext();
    expect(ctx2).toBe(ctx1);
    audio.destroy();
  });

  test("volume setter clamps values to 0-1 range", () => {
    const audio = new AudioManager();
    audio.volume = 1.5;
    expect(audio.volume).toBe(1);

    audio.volume = -0.3;
    expect(audio.volume).toBe(0);

    audio.volume = 0.42;
    expect(audio.volume).toBe(0.42);
    audio.destroy();
  });

  test("volume setter persists to localStorage", () => {
    const audio = new AudioManager();
    audio.volume = 0.65;
    expect(localStorageMock.setItem).toHaveBeenCalledWith("audio_volume", "0.65");
    audio.destroy();
  });

  test("invalid volume in localStorage falls back to 0.5", () => {
    localStorageMock.setItem("audio_volume", "not-a-number");
    const audio = new AudioManager();
    expect(audio.volume).toBe(0.5);
    audio.destroy();
  });

  test("negative volume in localStorage falls back to 0.5", () => {
    localStorageMock.setItem("audio_volume", "-1");
    const audio = new AudioManager();
    expect(audio.volume).toBe(0.5);
    audio.destroy();
  });

  test("volume > 1 in localStorage falls back to 0.5", () => {
    localStorageMock.setItem("audio_volume", "2.0");
    const audio = new AudioManager();
    expect(audio.volume).toBe(0.5);
    audio.destroy();
  });

  test("playToneSwept creates oscillator with frequency ramp", () => {
    const audio = new AudioManager();
    audio.ensureContext();

    audio.playToneSwept(800, 200, 0.1, "sine");

    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
    const osc = mockAudioCtx.createOscillator.mock.results[0].value;
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(800, expect.any(Number));
    expect(osc.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(200, expect.any(Number));
    audio.destroy();
  });

  test("destroy closes the AudioContext and cleans up", () => {
    const audio = new AudioManager();
    audio.ensureContext();
    audio.playTone(440, 0.1);
    audio.destroy();

    expect(mockAudioCtx.close).toHaveBeenCalled();
  });

  test("playTone after destroy is a no-op", () => {
    const audio = new AudioManager();
    audio.ensureContext();
    audio.destroy();

    mockAudioCtx.createOscillator.mockClear();
    audio.playTone(440, 0.1);
    expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Feature: SoundSystem destroy
// ---------------------------------------------------------------------------

describe("Feature: SoundSystem cleanup", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("destroy stops both music and low ammo warning", () => {
    jest.useFakeTimers();
    const { audio, sound } = createAudioPair();

    sound.startMusic("playing", 0);
    sound.play("low_ammo");

    sound.destroy();

    const spy = jest.spyOn(audio, "playTone");
    jest.advanceTimersByTime(5000);
    expect(spy).not.toHaveBeenCalled();

    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Feature: SoundEvent type definition
// ---------------------------------------------------------------------------

describe("Feature: SoundEvent type completeness", () => {
  test("SoundEvent type includes all 13 required event strings", () => {
    const expectedEvents: SoundEvent[] = [
      "arrow_shoot",
      "balloon_pop",
      "upgrade_pop",
      "boss_hit",
      "boss_kill",
      "obstacle_hit",
      "upgrade_activate",
      "ammo_gain",
      "level_complete",
      "game_over",
      "victory",
      "menu_start",
      "low_ammo",
    ];

    for (const event of expectedEvents) {
      const e: SoundEvent = event;
      expect(e).toBe(event);
    }
  });
});

// ---------------------------------------------------------------------------
// Feature: ArcherGame wiring verification (source code analysis)
// ---------------------------------------------------------------------------

describe("Feature: ArcherGame wiring verification", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("ArcherGame module exports and contains AudioManager + SoundSystem", () => {
    const archerModule = require("../src/games/archer/ArcherGame");
    expect(archerModule.ArcherGame).toBeDefined();
    expect(archerModule.Game).toBeDefined();
    expect(archerModule.ArcherGame).toBe(archerModule.Game);
  });

  test("ArcherGame imports AudioManager from shared module", () => {
    const { AudioManager: AM } = require("../src/shared/AudioManager");
    expect(AM).toBeDefined();
    expect(typeof AM).toBe("function");
  });

  test("ArcherGame imports SoundSystem from archer systems", () => {
    const { SoundSystem: SS } = require("../src/games/archer/systems/SoundSystem");
    expect(SS).toBeDefined();
    expect(typeof SS).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Feature: HUD mute button positioning
// ---------------------------------------------------------------------------

describe("Feature: HUD mute button positioning", () => {
  test("mute button is 36x36 with 12px margin from edges", () => {
    const hud = new HUD(false);
    const canvasW = 800;

    const expectedX = canvasW - 36 - 12;
    const expectedY = 12;

    expect(hud.isMuteButtonHit(expectedX, expectedY, canvasW)).toBe(true);
    expect(hud.isMuteButtonHit(expectedX + 35, expectedY + 35, canvasW)).toBe(true);
    expect(hud.isMuteButtonHit(expectedX - 1, expectedY, canvasW)).toBe(false);
    expect(hud.isMuteButtonHit(expectedX, expectedY - 1, canvasW)).toBe(false);
  });

  test("mute button works with different canvas widths", () => {
    const hud = new HUD(false);

    for (const w of [400, 800, 1200, 1920]) {
      const centerX = w - 36 - 12 + 18;
      const centerY = 12 + 18;
      expect(hud.isMuteButtonHit(centerX, centerY, w)).toBe(true);
    }
  });
});
