/**
 * QA tests for Issue #443 / PR #458:
 * raptor: Add music tracks and audio manifest entries for levels 6–10
 *
 * Covers all acceptance criteria from the Gherkin scenarios.
 */

import * as fs from "fs";
import * as path from "path";
import { AUDIO_MANIFEST } from "../src/games/raptor/rendering/audioAssets";
import { LEVELS } from "../src/games/raptor/levels";
import { AudioManager } from "../src/shared/AudioManager";
import { SoundSystem } from "../src/games/raptor/systems/SoundSystem";
import { RaptorGameState } from "../src/games/raptor/types";

// ---------------------------------------------------------------------------
// Mock infrastructure (mirrors existing test patterns)
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
    loop: false,
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
    decodeAudioData: jest.fn().mockResolvedValue({ duration: 1, length: 44100 }),
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

const MUSIC_DIR = path.resolve(__dirname, "../public/assets/raptor/audio/music");

const EXPECTED_FILES: Record<string, string> = {
  level_6: "level_6_shipyard.mp3",
  level_7: "level_7_wasteland.mp3",
  level_8: "level_8_industrial.mp3",
  level_9: "level_9_orbital.mp3",
  level_10: "level_10_stronghold.mp3",
};

const EXPECTED_PATHS: Record<string, string> = {
  level_6: "assets/raptor/audio/music/level_6_shipyard.mp3",
  level_7: "assets/raptor/audio/music/level_7_wasteland.mp3",
  level_8: "assets/raptor/audio/music/level_8_industrial.mp3",
  level_9: "assets/raptor/audio/music/level_9_orbital.mp3",
  level_10: "assets/raptor/audio/music/level_10_stronghold.mp3",
};

// MP3 sync word: first 11 bits set = 0xFF followed by 0xE0+ (or 0xFB for MPEG1 Layer3)
function isValidMp3Header(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  // ID3 tag header
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;
  // MPEG sync word: 0xFF followed by byte with top 3 bits set (0xE0 mask)
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Scenario: Music files exist for levels 6 through 10
// ---------------------------------------------------------------------------

describe("Scenario: Music files exist for levels 6 through 10", () => {
  test.each([
    ["level_6_shipyard.mp3"],
    ["level_7_wasteland.mp3"],
    ["level_8_industrial.mp3"],
    ["level_9_orbital.mp3"],
    ["level_10_stronghold.mp3"],
  ])("%s exists in public/assets/raptor/audio/music/", (filename) => {
    const filePath = path.join(MUSIC_DIR, filename);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test.each([
    ["level_6_shipyard.mp3"],
    ["level_7_wasteland.mp3"],
    ["level_8_industrial.mp3"],
    ["level_9_orbital.mp3"],
    ["level_10_stronghold.mp3"],
  ])("%s is a non-empty file", (filename) => {
    const filePath = path.join(MUSIC_DIR, filename);
    const stat = fs.statSync(filePath);
    expect(stat.size).toBeGreaterThan(0);
  });

  test.each([
    ["level_6_shipyard.mp3"],
    ["level_7_wasteland.mp3"],
    ["level_8_industrial.mp3"],
    ["level_9_orbital.mp3"],
    ["level_10_stronghold.mp3"],
  ])("%s has a valid MP3 header", (filename) => {
    const filePath = path.join(MUSIC_DIR, filename);
    const buf = Buffer.alloc(4);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    expect(isValidMp3Header(buf)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario: Audio manifest includes level 6–10 music entries
// ---------------------------------------------------------------------------

describe("Scenario: Audio manifest includes level 6–10 music entries", () => {
  test.each(Object.entries(EXPECTED_PATHS))(
    "AUDIO_MANIFEST.music contains key '%s' mapped to '%s'",
    (key, expectedPath) => {
      expect(AUDIO_MANIFEST.music).toHaveProperty(key);
      expect(AUDIO_MANIFEST.music[key]).toBe(expectedPath);
    }
  );

  test("AUDIO_MANIFEST.music contains all 11 music entries (menu + levels 1–10)", () => {
    const keys = Object.keys(AUDIO_MANIFEST.music);
    expect(keys).toContain("menu");
    for (let i = 1; i <= 10; i++) {
      expect(keys).toContain(`level_${i}`);
    }
    expect(keys.length).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// Scenario: Music keys follow the level_N naming convention
// ---------------------------------------------------------------------------

describe("Scenario: Music keys follow the level_N naming convention", () => {
  test.each([
    [5, "level_6"],
    [6, "level_7"],
    [7, "level_8"],
    [8, "level_9"],
    [9, "level_10"],
  ])(
    "0-based level index %i derives music key '%s' via level_{index+1}",
    (index, expectedKey) => {
      const derivedKey = `level_${index + 1}`;
      expect(derivedKey).toBe(expectedKey);
      expect(AUDIO_MANIFEST.music).toHaveProperty(expectedKey);
    }
  );

  test("all 10 levels defined in LEVELS array have corresponding manifest keys", () => {
    expect(LEVELS.length).toBe(10);
    for (let i = 0; i < LEVELS.length; i++) {
      const key = `level_${i + 1}`;
      expect(AUDIO_MANIFEST.music).toHaveProperty(key);
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario: Music plays when entering a level 6–10
// ---------------------------------------------------------------------------

describe("Scenario: Music plays when entering a level 6–10", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test.each([
    [6, 5, "level_6"],
    [7, 6, "level_7"],
    [8, 7, "level_8"],
    [9, 8, "level_9"],
    [10, 9, "level_10"],
  ])(
    "level %i (index %i): startMusic('playing', %i) looks up buffer key '%s'",
    (_level, index, key) => {
      const { audio, sound } = createAudioPair();
      const hasBufferSpy = jest.spyOn(audio, "hasBuffer");
      const playBufferSpy = jest.spyOn(audio, "playBuffer");

      sound.startMusic("playing", index);

      expect(hasBufferSpy).toHaveBeenCalledWith(key);

      sound.stopMusic();
      sound.destroy();
    }
  );

  test("when buffer exists for level key, playBuffer is called with loop=true and category=music", () => {
    const { audio, sound } = createAudioPair();

    // Manually insert a buffer entry so hasBuffer returns true
    (audio as any).buffers.set("level_6", {
      buffer: { duration: 1, length: 44100 },
      activeSource: null,
    });

    const playBufferSpy = jest.spyOn(audio, "playBuffer");

    sound.startMusic("playing", 5);

    expect(playBufferSpy).toHaveBeenCalledWith("level_6", {
      loop: true,
      category: "music",
    });

    sound.stopMusic();
    sound.destroy();
  });

  test("when buffer does not exist, falls back to procedural synthesized music", () => {
    jest.useFakeTimers();
    const { audio, sound } = createAudioPair();
    const playToneSpy = jest.spyOn(audio, "playTone");

    // No buffer loaded — should fall back to procedural
    sound.startMusic("playing", 5);

    expect(playToneSpy).toHaveBeenCalled();

    sound.stopMusic();
    sound.destroy();
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Scenario: Music stops when leaving a level 6–10
// ---------------------------------------------------------------------------

describe("Scenario: Music stops when leaving a level 6–10", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test.each([
    [6, "completes the level"],
    [8, "loses all lives"],
    [10, "presses escape"],
    [10, "defeats the final boss"],
  ])(
    "level %i: stopMusic stops all music buffers when player %s",
    (level) => {
      const { audio, sound } = createAudioPair();
      const stopBufferSpy = jest.spyOn(audio, "stopBuffer");

      const levelIndex = level - 1;
      sound.startMusic("playing", levelIndex);
      sound.stopMusic();

      expect(stopBufferSpy).toHaveBeenCalledWith("menu");
      for (let i = 1; i <= 10; i++) {
        expect(stopBufferSpy).toHaveBeenCalledWith(`level_${i}`);
      }

      sound.destroy();
    }
  );
});

// ---------------------------------------------------------------------------
// Scenario: stopMusic covers all 10 levels
// ---------------------------------------------------------------------------

describe("Scenario: stopMusic covers all 10 levels", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("stopMusic calls stopBuffer for 'menu' and 'level_1' through 'level_10'", () => {
    const { audio, sound } = createAudioPair();
    const stopBufferSpy = jest.spyOn(audio, "stopBuffer");

    sound.stopMusic();

    expect(stopBufferSpy).toHaveBeenCalledWith("menu");
    for (let i = 1; i <= 10; i++) {
      expect(stopBufferSpy).toHaveBeenCalledWith(`level_${i}`);
    }
    expect(stopBufferSpy).toHaveBeenCalledTimes(11); // menu + levels 1–10

    sound.destroy();
  });

  test("stopMusic does NOT stop only levels 1–5 (verifies bug fix)", () => {
    const { audio, sound } = createAudioPair();
    const stopBufferSpy = jest.spyOn(audio, "stopBuffer");

    sound.stopMusic();

    // Verify levels 6–10 are explicitly stopped (the bug fix)
    expect(stopBufferSpy).toHaveBeenCalledWith("level_6");
    expect(stopBufferSpy).toHaveBeenCalledWith("level_7");
    expect(stopBufferSpy).toHaveBeenCalledWith("level_8");
    expect(stopBufferSpy).toHaveBeenCalledWith("level_9");
    expect(stopBufferSpy).toHaveBeenCalledWith("level_10");

    sound.destroy();
  });
});

// ---------------------------------------------------------------------------
// Scenario: Graceful fallback when music file fails to load
// ---------------------------------------------------------------------------

describe("Scenario: Graceful fallback when music file fails to load", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("AudioManager.loadAudioBuffer logs warning but does not throw on fetch failure", async () => {
    const audio = new AudioManager();
    audio.ensureContext();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await audio.loadAudioBuffer("level_7", "assets/raptor/audio/music/level_7_wasteland.mp3");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to fetch audio")
    );
    expect(audio.hasBuffer("level_7")).toBe(false);

    warnSpy.mockRestore();
    delete (global as any).fetch;
    audio.destroy();
  });

  test("when buffer fails to load, startMusic falls back to procedural music", () => {
    jest.useFakeTimers();
    const { audio, sound } = createAudioPair();
    const playToneSpy = jest.spyOn(audio, "playTone");

    // level_7 buffer not loaded → hasBuffer returns false
    expect(audio.hasBuffer("level_7")).toBe(false);

    sound.startMusic("playing", 6); // index 6 → key level_7

    // Procedural music should start (playTone called)
    expect(playToneSpy).toHaveBeenCalled();

    sound.stopMusic();
    sound.destroy();
    jest.useRealTimers();
  });

  test("no errors thrown when playing level with missing buffer", () => {
    const { audio, sound } = createAudioPair();

    expect(() => {
      sound.startMusic("playing", 6);
      sound.stopMusic();
    }).not.toThrow();

    sound.destroy();
  });
});

// ---------------------------------------------------------------------------
// Scenario: No music overlap between levels
// ---------------------------------------------------------------------------

describe("Scenario: No music overlap between levels", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("startMusic calls stopMusic before starting new music", () => {
    const { audio, sound } = createAudioPair();
    const stopBufferSpy = jest.spyOn(audio, "stopBuffer");

    // Start level 6 music
    sound.startMusic("playing", 5);

    // stopMusic is called internally at the start of startMusic
    // so stopBuffer should have been called for all level keys + menu
    expect(stopBufferSpy).toHaveBeenCalledWith("menu");
    for (let i = 1; i <= 10; i++) {
      expect(stopBufferSpy).toHaveBeenCalledWith(`level_${i}`);
    }

    sound.stopMusic();
    sound.destroy();
  });

  test("transitioning from level 6 to level 7 stops previous music first", () => {
    jest.useFakeTimers();
    const { audio, sound } = createAudioPair();
    const stopBufferSpy = jest.spyOn(audio, "stopBuffer");

    sound.startMusic("playing", 5); // level 6
    jest.advanceTimersByTime(1000);

    stopBufferSpy.mockClear();

    sound.startMusic("playing", 6); // level 7 — should stop all first

    expect(stopBufferSpy).toHaveBeenCalledWith("menu");
    for (let i = 1; i <= 10; i++) {
      expect(stopBufferSpy).toHaveBeenCalledWith(`level_${i}`);
    }

    sound.stopMusic();
    sound.destroy();
    jest.useRealTimers();
  });

  test("procedural music interval is cleared when transitioning levels", () => {
    jest.useFakeTimers();
    const { audio, sound } = createAudioPair();
    const playToneSpy = jest.spyOn(audio, "playTone");

    sound.startMusic("playing", 5); // start level 6 procedural music
    jest.advanceTimersByTime(2000);
    const countAfterLevel6 = playToneSpy.mock.calls.length;

    sound.startMusic("playing", 6); // transition to level 7
    playToneSpy.mockClear();

    // Advance time — only level 7 beats should fire, not level 6
    jest.advanceTimersByTime(3000);
    const level7Count = playToneSpy.mock.calls.length;

    // If level 6 interval was not cleared, we'd get double the beats
    // With BPM capped, we expect a reasonable number (not doubled)
    expect(level7Count).toBeGreaterThan(0);
    expect(level7Count).toBeLessThan(20); // sanity check: not doubled

    sound.stopMusic();
    sound.destroy();
    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Scenario: RaptorGame.loadAssets loads all manifest entries dynamically
// ---------------------------------------------------------------------------

describe("Scenario: RaptorGame loads all manifest entries dynamically", () => {
  test("AUDIO_MANIFEST music entries are iterable via Object.entries", () => {
    const entries = Object.entries(AUDIO_MANIFEST.music);
    expect(entries.length).toBe(11);

    const keys = entries.map(([k]) => k);
    expect(keys).toContain("menu");
    for (let i = 1; i <= 10; i++) {
      expect(keys).toContain(`level_${i}`);
    }
  });

  test("all music paths follow the expected directory pattern", () => {
    for (const [key, url] of Object.entries(AUDIO_MANIFEST.music)) {
      expect(url).toMatch(/^assets\/raptor\/audio\/music\/.+\.mp3$/);
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario: Existing levels 1–5 are not broken
// ---------------------------------------------------------------------------

describe("Scenario: Existing levels 1–5 music is preserved", () => {
  const existingEntries: Record<string, string> = {
    menu: "assets/raptor/audio/music/menu.mp3",
    level_1: "assets/raptor/audio/music/level_1_coastal.mp3",
    level_2: "assets/raptor/audio/music/level_2_desert.mp3",
    level_3: "assets/raptor/audio/music/level_3_mountain.mp3",
    level_4: "assets/raptor/audio/music/level_4_arctic.mp3",
    level_5: "assets/raptor/audio/music/level_5_fortress.mp3",
  };

  test.each(Object.entries(existingEntries))(
    "existing entry '%s' = '%s' is still present and unchanged",
    (key, expectedPath) => {
      expect(AUDIO_MANIFEST.music[key]).toBe(expectedPath);
    }
  );
});

// ---------------------------------------------------------------------------
// Scenario: LEVELS array includes all 10 levels
// ---------------------------------------------------------------------------

describe("Scenario: LEVELS array covers all 10 levels", () => {
  test("LEVELS has exactly 10 entries", () => {
    expect(LEVELS.length).toBe(10);
  });

  test.each([
    [5, 6, "Shipyard Ruins"],
    [6, 7, "Scorched Wastes"],
    [7, 8, "Industrial Core"],
    [8, 9, "Orbital Debris"],
    [9, 10, "Cylon Stronghold"],
  ])(
    "LEVELS[%i] is level %i ('%s')",
    (index, levelNum, name) => {
      expect(LEVELS[index].level).toBe(levelNum);
      expect(LEVELS[index].name).toBe(name);
    }
  );
});

// ---------------------------------------------------------------------------
// Scenario: SoundSystem.startMusic key derivation consistency
// ---------------------------------------------------------------------------

describe("Scenario: SoundSystem.startMusic key derivation", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    setupGlobalAudio();
  });

  afterEach(() => {
    teardownGlobalAudio();
  });

  test("startMusic with state 'playing' derives key as level_{level+1}", () => {
    for (let levelIndex = 0; levelIndex < 10; levelIndex++) {
      const { audio, sound } = createAudioPair();
      const hasBufferSpy = jest.spyOn(audio, "hasBuffer");

      sound.startMusic("playing", levelIndex);

      const expectedKey = `level_${levelIndex + 1}`;
      expect(hasBufferSpy).toHaveBeenCalledWith(expectedKey);

      sound.stopMusic();
      sound.destroy();
      jest.clearAllMocks();
      mockAudioCtx = createMockAudioContext();
      (global as any).AudioContext = jest.fn(() => mockAudioCtx);
      (global as any).window.AudioContext = (global as any).AudioContext;
    }
  });

  test("startMusic with state 'menu' looks up 'menu' key, not level key", () => {
    const { audio, sound } = createAudioPair();
    const hasBufferSpy = jest.spyOn(audio, "hasBuffer");

    sound.startMusic("menu");

    expect(hasBufferSpy).toHaveBeenCalledWith("menu");

    sound.stopMusic();
    sound.destroy();
  });
});
