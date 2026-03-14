import { RaptorSaveData, WeaponType, SAVE_FORMAT_VERSION, SaveMigration } from "../types";
import { LEVELS } from "../levels";
import { tryGetStorage, trySetStorage, tryRemoveStorage } from "../../../shared/storage";

const VALID_WEAPONS: WeaponType[] = ["machine-gun", "missile", "laser", "plasma", "ion-cannon", "auto-gun", "rocket"];

const MIGRATIONS: readonly SaveMigration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate(data) {
      data.version = 2;
      return data;
    },
  },
];

export class SaveSystem {
  private static readonly STORAGE_KEY = "raptor_save";

  static save(data: RaptorSaveData): void {
    trySetStorage(this.STORAGE_KEY, JSON.stringify(data));
  }

  static load(): RaptorSaveData | null {
    const raw = tryGetStorage(this.STORAGE_KEY, "");
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const migrated = this.runMigrations(parsed);
      if (!migrated) return null;
      if (!this.validate(migrated)) return null;
      return migrated as RaptorSaveData;
    } catch {
      return null;
    }
  }

  static clear(): void {
    tryRemoveStorage(this.STORAGE_KEY);
  }

  static hasSave(): boolean {
    const raw = tryGetStorage(this.STORAGE_KEY, "");
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw);
      const migrated = this.runMigrations(parsed);
      if (!migrated) return false;
      return this.validate(migrated);
    } catch {
      return false;
    }
  }

  private static runMigrations(data: Record<string, unknown>): Record<string, unknown> | null {
    if (typeof data !== "object" || data === null) return null;

    let version = data.version;
    if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
      return null;
    }
    if (version > SAVE_FORMAT_VERSION) {
      return null;
    }
    for (const migration of MIGRATIONS) {
      if (version === SAVE_FORMAT_VERSION) break;
      if (migration.fromVersion === version) {
        data = migration.migrate(data);
        version = data.version;
      }
    }
    if (version !== SAVE_FORMAT_VERSION) {
      return null;
    }
    return data;
  }

  private static validate(data: unknown): data is RaptorSaveData {
    if (typeof data !== "object" || data === null) return false;

    const d = data as Record<string, unknown>;

    if (d.version !== SAVE_FORMAT_VERSION) return false;

    if (
      typeof d.levelReached !== "number" ||
      !Number.isInteger(d.levelReached) ||
      d.levelReached < 0 ||
      d.levelReached >= LEVELS.length
    ) {
      return false;
    }

    if (typeof d.totalScore !== "number" || d.totalScore < 0) return false;

    if (
      typeof d.lives !== "number" ||
      !Number.isInteger(d.lives) ||
      d.lives <= 0
    ) {
      return false;
    }

    if (typeof d.weapon !== "string" || !VALID_WEAPONS.includes(d.weapon as WeaponType)) {
      return false;
    }

    if (typeof d.savedAt !== "string" || d.savedAt.length === 0) return false;

    if (d.bombs !== undefined) {
      if (typeof d.bombs !== "number" || !Number.isInteger(d.bombs) || d.bombs < 0 || d.bombs > 5) {
        return false;
      }
    }

    if (d.weaponTier !== undefined) {
      if (typeof d.weaponTier !== "number" || !Number.isInteger(d.weaponTier) || d.weaponTier < 1 || d.weaponTier > 3) {
        return false;
      }
    }

    if (d.shieldBattery !== undefined) {
      if (typeof d.shieldBattery !== "number" || d.shieldBattery < 0 || d.shieldBattery > 100) {
        d.shieldBattery = 0;
      }
    }

    if (d.armor !== undefined) {
      if (typeof d.armor !== "number" || d.armor < 0 || d.armor > 100) {
        d.armor = 100;
      }
    }

    if (d.energy !== undefined) {
      if (typeof d.energy !== "number" || d.energy < 0 || d.energy > 100) {
        d.energy = 100;
      }
    }

    if (d.weaponInventory !== undefined) {
      if (typeof d.weaponInventory !== "object" || d.weaponInventory === null || Array.isArray(d.weaponInventory)) {
        return false;
      }
      const inv = d.weaponInventory as Record<string, unknown>;
      const cleaned: Record<string, number> = {};
      for (const [key, val] of Object.entries(inv)) {
        if (!VALID_WEAPONS.includes(key as WeaponType)) continue;
        if (typeof val !== "number" || !Number.isInteger(val) || val < 1 || val > 3) continue;
        cleaned[key] = val;
      }
      d.weaponInventory = cleaned;
    }

    return true;
  }
}
