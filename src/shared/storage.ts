export function tryGetStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function trySetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export function tryRemoveStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class LocalStorageBackend implements StorageBackend {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch {
      // silently ignore
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {
      // silently ignore
    }
  }
}

export class ElectronStorageBackend implements StorageBackend {
  private api: ElectronSaveAPI;

  constructor(api: ElectronSaveAPI) {
    this.api = api;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.api.load(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await this.api.save(key, value);
    } catch {
      // silently ignore — error already logged in main process
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.api.remove(key);
    } catch {
      // silently ignore
    }
  }
}

let _backend: StorageBackend | null = null;

export function getStorageBackend(): StorageBackend {
  if (!_backend) {
    _backend =
      typeof window !== "undefined" && window.electronSave
        ? new ElectronStorageBackend(window.electronSave)
        : new LocalStorageBackend();
  }
  return _backend;
}

/** @internal For testing — override the singleton backend. */
export function setStorageBackend(backend: StorageBackend): void {
  _backend = backend;
}

// ─── UserSettings Persistence ──────────────────────────────────

import type { UserSettings } from "../games/raptor/types";

export const DEFAULT_USER_SETTINGS: UserSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.25,
  muted: false,
  showFps: false,
};

function isValidVolume(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v) && v >= 0 && v <= 1;
}

function validateSettings(raw: Record<string, unknown>): UserSettings {
  return {
    musicVolume: isValidVolume(raw.musicVolume) ? raw.musicVolume : DEFAULT_USER_SETTINGS.musicVolume,
    sfxVolume: isValidVolume(raw.sfxVolume) ? raw.sfxVolume : DEFAULT_USER_SETTINGS.sfxVolume,
    muted: typeof raw.muted === "boolean" ? raw.muted : DEFAULT_USER_SETTINGS.muted,
    showFps: typeof raw.showFps === "boolean" ? raw.showFps : DEFAULT_USER_SETTINGS.showFps,
  };
}

export class SettingsStorage {
  private static readonly KEY = "raptor_settings";
  private static readonly LEGACY_KEYS = [
    "audio_music_volume",
    "audio_sfx_volume",
    "audio_muted",
  ] as const;
  private static legacyMigrated = false;

  static async load(): Promise<UserSettings> {
    const backend = getStorageBackend();

    if (!SettingsStorage.legacyMigrated) {
      SettingsStorage.legacyMigrated = true;
      await SettingsStorage.migrateLegacyKeys(backend);
    }

    try {
      const raw = await backend.get(SettingsStorage.KEY);
      if (raw === null) return { ...DEFAULT_USER_SETTINGS };
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) {
        return { ...DEFAULT_USER_SETTINGS };
      }
      return validateSettings(parsed);
    } catch {
      return { ...DEFAULT_USER_SETTINGS };
    }
  }

  static async save(settings: UserSettings): Promise<void> {
    try {
      const backend = getStorageBackend();
      await backend.set(SettingsStorage.KEY, JSON.stringify(settings));
    } catch {
      // silently ignore
    }
  }

  private static async migrateLegacyKeys(backend: StorageBackend): Promise<void> {
    try {
      const existing = await backend.get(SettingsStorage.KEY);
      if (existing !== null) return;

      const legacyMusic = await backend.get("audio_music_volume");
      const legacySfx = await backend.get("audio_sfx_volume");
      const legacyMuted = await backend.get("audio_muted");

      if (legacyMusic === null && legacySfx === null && legacyMuted === null) return;

      const musicVol = legacyMusic !== null ? parseFloat(legacyMusic) : NaN;
      const sfxVol = legacySfx !== null ? parseFloat(legacySfx) : NaN;

      const settings: UserSettings = {
        musicVolume: isValidVolume(musicVol) ? musicVol : DEFAULT_USER_SETTINGS.musicVolume,
        sfxVolume: isValidVolume(sfxVol) ? sfxVol : DEFAULT_USER_SETTINGS.sfxVolume,
        muted: legacyMuted === "true",
        showFps: DEFAULT_USER_SETTINGS.showFps,
      };

      await backend.set(SettingsStorage.KEY, JSON.stringify(settings));

      for (const key of SettingsStorage.LEGACY_KEYS) {
        await backend.remove(key);
      }
    } catch {
      // migration failure is non-fatal
    }
  }

  /** @internal For testing — reset the migration flag. */
  static resetMigrationFlag(): void {
    SettingsStorage.legacyMigrated = false;
  }
}
