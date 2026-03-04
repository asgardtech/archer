import { AudioManager } from "../src/shared/AudioManager";
import { SoundSystem } from "../src/games/archer/systems/SoundSystem";
import { SoundEvent } from "../src/games/archer/types";

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
    createBuffer: jest.fn((_channels: number, length: number, _sampleRate: number) => ({
      getChannelData: () => new Float32Array(length),
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
  };
})();

Object.defineProperty(global, "localStorage", { value: localStorageMock });

const mockAudioCtx = createMockAudioContext();
(global as any).AudioContext = jest.fn(() => mockAudioCtx);
(global as any).window = {
  AudioContext: (global as any).AudioContext,
};

describe("AudioManager", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    mockAudioCtx.createOscillator.mockClear();
    mockAudioCtx.createGain.mockClear();
    mockAudioCtx.createBufferSource.mockClear();
    mockAudioCtx.createBiquadFilter.mockClear();
    mockAudioCtx.createBuffer.mockClear();
  });

  test("constructor reads muted state from localStorage", () => {
    localStorageMock.setItem("audio_muted", "true");
    localStorageMock.setItem("audio_volume", "0.7");
    const am = new AudioManager();
    expect(am.muted).toBe(true);
    expect(am.volume).toBe(0.7);
  });

  test("constructor defaults to unmuted and volume 0.5", () => {
    const am = new AudioManager();
    expect(am.muted).toBe(false);
    expect(am.volume).toBe(0.5);
  });

  test("toggleMute flips muted state and persists", () => {
    const am = new AudioManager();
    expect(am.muted).toBe(false);
    am.toggleMute();
    expect(am.muted).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("audio_muted", "true");
    am.toggleMute();
    expect(am.muted).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("audio_muted", "false");
  });

  test("volume setter clamps to 0-1 range and persists", () => {
    const am = new AudioManager();
    am.volume = 1.5;
    expect(am.volume).toBe(1);
    am.volume = -0.3;
    expect(am.volume).toBe(0);
    am.volume = 0.8;
    expect(am.volume).toBe(0.8);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("audio_volume", "0.8");
  });

  test("ensureContext creates AudioContext lazily", () => {
    const am = new AudioManager();
    const ctx = am.ensureContext();
    expect(ctx).toBeTruthy();
    const ctx2 = am.ensureContext();
    expect(ctx2).toBe(ctx);
  });

  test("playTone creates oscillator and gain nodes", () => {
    const am = new AudioManager();
    am.ensureContext();
    am.playTone(440, 0.1, "sine");
    expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
    expect(mockAudioCtx.createGain).toHaveBeenCalled();
  });

  test("playNoise creates buffer source and filter", () => {
    const am = new AudioManager();
    am.ensureContext();
    am.playNoise(0.1, 2000);
    expect(mockAudioCtx.createBufferSource).toHaveBeenCalled();
    expect(mockAudioCtx.createBuffer).toHaveBeenCalled();
    expect(mockAudioCtx.createBiquadFilter).toHaveBeenCalled();
  });

  test("playSequence creates one oscillator per note", () => {
    const am = new AudioManager();
    am.ensureContext();
    am.playSequence(
      [
        { frequency: 440, duration: 0.5 },
        { frequency: 880, duration: 0.5 },
      ],
      120
    );
    expect(mockAudioCtx.createOscillator).toHaveBeenCalledTimes(2);
  });

  test("playTone is a no-op when disabled", () => {
    const origAudioContext = (global as any).AudioContext;
    (global as any).AudioContext = undefined;
    (global as any).window.AudioContext = undefined;
    const am = new AudioManager();
    am.ensureContext();
    am.playTone(440, 0.1);
    expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();
    (global as any).AudioContext = origAudioContext;
    (global as any).window.AudioContext = origAudioContext;
  });

  test("destroy closes the audio context", () => {
    const am = new AudioManager();
    am.ensureContext();
    am.destroy();
    expect(mockAudioCtx.close).toHaveBeenCalled();
  });
});

describe("SoundSystem", () => {
  let audio: AudioManager;
  let sound: SoundSystem;

  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    audio = new AudioManager();
    audio.ensureContext();
    sound = new SoundSystem(audio);
  });

  afterEach(() => {
    sound.destroy();
  });

  test("play calls corresponding sound method for each event", () => {
    const playToneSpy = jest.spyOn(audio, "playTone");
    const playToneSweptSpy = jest.spyOn(audio, "playToneSwept");
    const playNoiseSpy = jest.spyOn(audio, "playNoise");
    const playSequenceSpy = jest.spyOn(audio, "playSequence");

    sound.play("arrow_shoot");
    expect(playToneSweptSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("balloon_pop");
    expect(playNoiseSpy).toHaveBeenCalled();
    expect(playToneSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("upgrade_pop");
    expect(playSequenceSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("boss_hit");
    expect(playToneSpy).toHaveBeenCalled();
    expect(playNoiseSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("boss_kill");
    expect(playToneSweptSpy).toHaveBeenCalled();
    expect(playNoiseSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("obstacle_hit");
    expect(playToneSpy).toHaveBeenCalled();
    expect(playNoiseSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("upgrade_activate");
    expect(playSequenceSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("menu_start");
    expect(playToneSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("level_complete");
    expect(playSequenceSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("game_over");
    expect(playSequenceSpy).toHaveBeenCalled();

    jest.clearAllMocks();
    sound.play("victory");
    expect(playSequenceSpy).toHaveBeenCalled();
  });

  test("play debounces rapid calls for the same event", () => {
    const spy = jest.spyOn(audio, "playToneSwept");
    sound.play("arrow_shoot");
    sound.play("arrow_shoot");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test("startMusic and stopMusic control music loop", () => {
    jest.useFakeTimers();
    const playToneSpy = jest.spyOn(audio, "playTone");

    sound.startMusic("playing", 0);
    expect(playToneSpy).toHaveBeenCalled();

    jest.advanceTimersByTime(5000);
    const callCountPlaying = playToneSpy.mock.calls.length;
    expect(callCountPlaying).toBeGreaterThan(1);

    sound.stopMusic();
    jest.advanceTimersByTime(5000);
    expect(playToneSpy.mock.calls.length).toBe(callCountPlaying);

    jest.useRealTimers();
  });

  test("startMusic with menu state plays ambient drone", () => {
    jest.useFakeTimers();
    const playToneSpy = jest.spyOn(audio, "playTone");
    const playNoiseSpy = jest.spyOn(audio, "playNoise");

    sound.startMusic("menu");
    expect(playToneSpy).toHaveBeenCalledWith(110, 2.5, "sine", expect.any(Object));
    expect(playNoiseSpy).toHaveBeenCalledWith(2.5, 400);

    sound.stopMusic();
    jest.useRealTimers();
  });

  test("low ammo warning starts and stops", () => {
    jest.useFakeTimers();
    const playToneSpy = jest.spyOn(audio, "playTone");

    sound.play("low_ammo");
    expect(playToneSpy).toHaveBeenCalled();

    const countAfterFirst = playToneSpy.mock.calls.length;
    jest.advanceTimersByTime(1500);
    expect(playToneSpy.mock.calls.length).toBeGreaterThan(countAfterFirst);

    sound.stopLowAmmoWarning();
    const countAfterStop = playToneSpy.mock.calls.length;
    jest.advanceTimersByTime(2000);
    expect(playToneSpy.mock.calls.length).toBe(countAfterStop);

    jest.useRealTimers();
  });

  test("destroy stops music and low ammo warning", () => {
    jest.useFakeTimers();
    sound.startMusic("playing", 0);
    sound.play("low_ammo");
    sound.destroy();
    const spy = jest.spyOn(audio, "playTone");
    jest.advanceTimersByTime(5000);
    expect(spy).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  test("all SoundEvent types are handled without throwing", () => {
    const events: SoundEvent[] = [
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
    for (const event of events) {
      expect(() => sound.play(event)).not.toThrow();
    }
    sound.stopLowAmmoWarning();
  });
});

describe("HUD mute button", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { HUD } = require("../src/games/archer/rendering/HUD");

  test("isMuteButtonHit returns true for clicks inside button area", () => {
    const hud = new HUD(false);
    const canvasW = 800;
    const btnX = canvasW - 36 - 12;
    const btnY = 12;
    expect(hud.isMuteButtonHit(btnX + 18, btnY + 18, canvasW)).toBe(true);
  });

  test("isMuteButtonHit returns false for clicks outside button area", () => {
    const hud = new HUD(false);
    expect(hud.isMuteButtonHit(10, 10, 800)).toBe(false);
    expect(hud.isMuteButtonHit(400, 300, 800)).toBe(false);
  });
});
