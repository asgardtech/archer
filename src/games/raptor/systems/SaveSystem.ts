import { RaptorSaveData, WeaponType } from "../types";
import { LEVELS } from "../levels";
import { tryGetStorage, trySetStorage, tryRemoveStorage } from "../../../shared/storage";

const VALID_WEAPONS: WeaponType[] = ["machine-gun", "missile", "laser", "plasma", "ion-cannon"];

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
      if (!this.validate(parsed)) return null;
      return parsed as RaptorSaveData;
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
      return this.validate(parsed);
    } catch {
      return false;
    }
  }

  private static validate(data: unknown): data is RaptorSaveData {
    if (typeof data !== "object" || data === null) return false;

    const d = data as Record<string, unknown>;

    if (d.version !== 1) return false;

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

    return true;
  }
}
