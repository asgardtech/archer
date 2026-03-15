import { SettingsStorage, DEFAULT_USER_SETTINGS, setStorageBackend, StorageBackend } from "../src/shared/storage";
import { UserSettings } from "../src/games/raptor/types";

// ─── Mock StorageBackend ────────────────────────────────────────

class MockStorageBackend implements StorageBackend {
  data: Record<string, string> = {};

  async get(key: string): Promise<string | null> {
    return this.data[key] ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data[key] = value;
  }

  async remove(key: string): Promise<void> {
    delete this.data[key];
  }
}

class FailingStorageBackend implements StorageBackend {
  async get(): Promise<string | null> { throw new Error("storage unavailable"); }
  async set(): Promise<void> { throw new Error("storage unavailable"); }
  async remove(): Promise<void> { throw new Error("storage unavailable"); }
}

// ─── Setup ──────────────────────────────────────────────────────

let mockBackend: MockStorageBackend;

beforeEach(() => {
  mockBackend = new MockStorageBackend();
  setStorageBackend(mockBackend);
  SettingsStorage.resetMigrationFlag();
});

// ════════════════════════════════════════════════════════════════
// DEFAULT SETTINGS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Default settings are applied on first launch", () => {
  test("load returns defaults when no raptor_settings key exists", async () => {
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  test("default musicVolume is 0.5", () => {
    expect(DEFAULT_USER_SETTINGS.musicVolume).toBe(0.5);
  });

  test("default sfxVolume is 0.25", () => {
    expect(DEFAULT_USER_SETTINGS.sfxVolume).toBe(0.25);
  });

  test("default muted is false", () => {
    expect(DEFAULT_USER_SETTINGS.muted).toBe(false);
  });

  test("default showFps is false", () => {
    expect(DEFAULT_USER_SETTINGS.showFps).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// ROUND-TRIP SAVE / LOAD
// ════════════════════════════════════════════════════════════════

describe("Scenario: Settings round-trip correctly", () => {
  test("save then load returns matching data", async () => {
    const settings: UserSettings = {
      musicVolume: 0.8,
      sfxVolume: 0.1,
      muted: true,
      showFps: true,
    };
    await SettingsStorage.save(settings);
    const loaded = await SettingsStorage.load();
    expect(loaded).toEqual(settings);
  });

  test("save stores under raptor_settings key", async () => {
    await SettingsStorage.save(DEFAULT_USER_SETTINGS);
    expect(mockBackend.data["raptor_settings"]).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// PERSISTING INDIVIDUAL SETTINGS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Music volume change persists", () => {
  test("musicVolume 0.8 round-trips", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, musicVolume: 0.8 });
    const loaded = await SettingsStorage.load();
    expect(loaded.musicVolume).toBe(0.8);
  });
});

describe("Scenario: SFX volume change persists", () => {
  test("sfxVolume 0.1 round-trips", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, sfxVolume: 0.1 });
    const loaded = await SettingsStorage.load();
    expect(loaded.sfxVolume).toBe(0.1);
  });
});

describe("Scenario: Mute state persists", () => {
  test("muted true round-trips", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, muted: true });
    const loaded = await SettingsStorage.load();
    expect(loaded.muted).toBe(true);
  });
});

describe("Scenario: FPS display preference persists", () => {
  test("showFps true round-trips", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, showFps: true });
    const loaded = await SettingsStorage.load();
    expect(loaded.showFps).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// ERROR HANDLING & VALIDATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Malformed JSON falls back to defaults", () => {
  test("invalid JSON returns defaults", async () => {
    mockBackend.data["raptor_settings"] = "{{not-json}}";
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });
});

describe("Scenario: Out-of-range values are corrected", () => {
  test("musicVolume > 1 replaced with default", async () => {
    mockBackend.data["raptor_settings"] = JSON.stringify({
      musicVolume: 1.5,
      sfxVolume: -0.3,
      muted: "yes",
      showFps: 42,
    });
    const settings = await SettingsStorage.load();
    expect(settings.musicVolume).toBe(0.5);
    expect(settings.sfxVolume).toBe(0.25);
    expect(settings.muted).toBe(false);
    expect(settings.showFps).toBe(false);
  });

  test("NaN musicVolume replaced with default", async () => {
    mockBackend.data["raptor_settings"] = JSON.stringify({
      musicVolume: NaN,
      sfxVolume: 0.5,
      muted: false,
      showFps: false,
    });
    const settings = await SettingsStorage.load();
    expect(settings.musicVolume).toBe(0.5);
  });

  test("negative sfxVolume replaced with default", async () => {
    mockBackend.data["raptor_settings"] = JSON.stringify({
      musicVolume: 0.5,
      sfxVolume: -0.1,
      muted: false,
      showFps: false,
    });
    const settings = await SettingsStorage.load();
    expect(settings.sfxVolume).toBe(0.25);
  });
});

describe("Scenario: Partially valid settings preserve valid fields", () => {
  test("valid musicVolume preserved, invalid sfxVolume replaced", async () => {
    mockBackend.data["raptor_settings"] = JSON.stringify({
      musicVolume: 0.9,
      sfxVolume: "bad",
      muted: true,
      showFps: false,
    });
    const settings = await SettingsStorage.load();
    expect(settings.musicVolume).toBe(0.9);
    expect(settings.sfxVolume).toBe(0.25);
    expect(settings.muted).toBe(true);
    expect(settings.showFps).toBe(false);
  });
});

describe("Scenario: Non-object parsed JSON returns defaults", () => {
  test("null JSON returns defaults", async () => {
    mockBackend.data["raptor_settings"] = "null";
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  test("array JSON returns defaults", async () => {
    mockBackend.data["raptor_settings"] = "[1,2,3]";
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  test("string JSON returns defaults", async () => {
    mockBackend.data["raptor_settings"] = '"hello"';
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  test("number JSON returns defaults", async () => {
    mockBackend.data["raptor_settings"] = "42";
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });
});

describe("Scenario: Missing fields fall back to defaults", () => {
  test("empty object returns all defaults", async () => {
    mockBackend.data["raptor_settings"] = "{}";
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  test("partial object fills missing with defaults", async () => {
    mockBackend.data["raptor_settings"] = JSON.stringify({ musicVolume: 0.7 });
    const settings = await SettingsStorage.load();
    expect(settings.musicVolume).toBe(0.7);
    expect(settings.sfxVolume).toBe(0.25);
    expect(settings.muted).toBe(false);
    expect(settings.showFps).toBe(false);
  });
});

describe("Scenario: Storage unavailability does not crash", () => {
  test("load returns defaults when storage fails", async () => {
    setStorageBackend(new FailingStorageBackend());
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });

  test("save does not throw when storage fails", async () => {
    setStorageBackend(new FailingStorageBackend());
    await expect(
      SettingsStorage.save({ musicVolume: 0.6, sfxVolume: 0.3, muted: false, showFps: true })
    ).resolves.not.toThrow();
  });
});

describe("Scenario: Boundary volume values", () => {
  test("musicVolume 0 is valid", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, musicVolume: 0 });
    const loaded = await SettingsStorage.load();
    expect(loaded.musicVolume).toBe(0);
  });

  test("musicVolume 1 is valid", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, musicVolume: 1 });
    const loaded = await SettingsStorage.load();
    expect(loaded.musicVolume).toBe(1);
  });

  test("sfxVolume 0 is valid", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, sfxVolume: 0 });
    const loaded = await SettingsStorage.load();
    expect(loaded.sfxVolume).toBe(0);
  });

  test("sfxVolume 1 is valid", async () => {
    await SettingsStorage.save({ ...DEFAULT_USER_SETTINGS, sfxVolume: 1 });
    const loaded = await SettingsStorage.load();
    expect(loaded.sfxVolume).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════════
// LEGACY MIGRATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Legacy audio keys are migrated to the new settings key", () => {
  test("legacy keys are migrated and removed", async () => {
    mockBackend.data["audio_music_volume"] = "0.6";
    mockBackend.data["audio_sfx_volume"] = "0.4";
    mockBackend.data["audio_muted"] = "true";

    const settings = await SettingsStorage.load();

    expect(settings.musicVolume).toBe(0.6);
    expect(settings.sfxVolume).toBe(0.4);
    expect(settings.muted).toBe(true);

    expect(mockBackend.data["audio_music_volume"]).toBeUndefined();
    expect(mockBackend.data["audio_sfx_volume"]).toBeUndefined();
    expect(mockBackend.data["audio_muted"]).toBeUndefined();

    expect(mockBackend.data["raptor_settings"]).toBeDefined();
  });

  test("partial legacy keys are migrated with defaults for missing", async () => {
    mockBackend.data["audio_music_volume"] = "0.7";

    const settings = await SettingsStorage.load();

    expect(settings.musicVolume).toBe(0.7);
    expect(settings.sfxVolume).toBe(0.25);
    expect(settings.muted).toBe(false);
    expect(settings.showFps).toBe(false);

    expect(mockBackend.data["audio_music_volume"]).toBeUndefined();
    expect(mockBackend.data["raptor_settings"]).toBeDefined();
  });

  test("invalid legacy values fall back to defaults", async () => {
    mockBackend.data["audio_music_volume"] = "not-a-number";
    mockBackend.data["audio_sfx_volume"] = "2.0";
    mockBackend.data["audio_muted"] = "false";

    const settings = await SettingsStorage.load();

    expect(settings.musicVolume).toBe(0.5);
    expect(settings.sfxVolume).toBe(0.25);
    expect(settings.muted).toBe(false);
  });
});

describe("Scenario: Legacy keys alongside new key", () => {
  test("new key takes precedence, legacy keys are not read", async () => {
    mockBackend.data["raptor_settings"] = JSON.stringify({
      musicVolume: 0.9,
      sfxVolume: 0.1,
      muted: true,
      showFps: true,
    });
    mockBackend.data["audio_music_volume"] = "0.3";
    mockBackend.data["audio_sfx_volume"] = "0.3";
    mockBackend.data["audio_muted"] = "false";

    const settings = await SettingsStorage.load();

    expect(settings.musicVolume).toBe(0.9);
    expect(settings.sfxVolume).toBe(0.1);
    expect(settings.muted).toBe(true);
    expect(settings.showFps).toBe(true);
  });
});

describe("Scenario: Legacy migration runs only once per session", () => {
  test("second load does not re-run migration", async () => {
    mockBackend.data["audio_music_volume"] = "0.6";
    mockBackend.data["audio_sfx_volume"] = "0.4";
    mockBackend.data["audio_muted"] = "true";

    await SettingsStorage.load();

    const getSpy = jest.spyOn(mockBackend, "get");

    await SettingsStorage.load();

    const legacyReads = getSpy.mock.calls.filter(
      (c) => c[0] === "audio_music_volume" || c[0] === "audio_sfx_volume" || c[0] === "audio_muted"
    );
    expect(legacyReads.length).toBe(0);

    getSpy.mockRestore();
  });
});

describe("Scenario: No legacy keys and no new key returns defaults", () => {
  test("completely empty storage returns defaults", async () => {
    const settings = await SettingsStorage.load();
    expect(settings).toEqual(DEFAULT_USER_SETTINGS);
  });
});

// ════════════════════════════════════════════════════════════════
// INDEPENDENCE FROM GAME SAVES
// ════════════════════════════════════════════════════════════════

describe("Scenario: Settings are independent from game saves", () => {
  test("deleting a game save does not affect settings", async () => {
    await SettingsStorage.save({
      musicVolume: 0.7,
      sfxVolume: 0.3,
      muted: false,
      showFps: true,
    });

    mockBackend.data["raptor_save_0"] = JSON.stringify({ some: "save data" });
    delete mockBackend.data["raptor_save_0"];

    const settings = await SettingsStorage.load();
    expect(settings.musicVolume).toBe(0.7);
    expect(settings.sfxVolume).toBe(0.3);
    expect(settings.showFps).toBe(true);
  });

  test("settings key is separate from save keys", async () => {
    await SettingsStorage.save(DEFAULT_USER_SETTINGS);
    expect(mockBackend.data["raptor_settings"]).toBeDefined();
    expect(mockBackend.data["raptor_save_0"]).toBeUndefined();
    expect(mockBackend.data["raptor_save_1"]).toBeUndefined();
    expect(mockBackend.data["raptor_save_2"]).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════
// AUDIOMANAGER NO LONGER SELF-PERSISTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: AudioManager no longer writes to storage", () => {
  test("AudioManager constructor initializes hardcoded defaults", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    expect(audio.musicVolume).toBe(0.5);
    expect(audio.sfxVolume).toBe(0.25);
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBe(0.5);
  });

  test("setting musicVolume does not write to storage", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    audio.musicVolume = 0.8;
    expect(mockBackend.data["audio_music_volume"]).toBeUndefined();
  });

  test("setting sfxVolume does not write to storage", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    audio.sfxVolume = 0.3;
    expect(mockBackend.data["audio_sfx_volume"]).toBeUndefined();
  });

  test("setting muted does not write to storage", () => {
    const { AudioManager } = require("../src/shared/AudioManager");
    const audio = new AudioManager();
    audio.muted = true;
    expect(mockBackend.data["audio_muted"]).toBeUndefined();
  });
});
