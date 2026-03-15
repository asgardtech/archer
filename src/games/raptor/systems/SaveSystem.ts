import { RaptorSaveData, WeaponType, SAVE_FORMAT_VERSION, SaveMigration, MAX_SAVE_SLOTS } from "../types";
import { LEVELS } from "../levels";
import { getStorageBackend } from "../../../shared/storage";

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
  private static readonly LEGACY_STORAGE_KEY = "raptor_save";
  private static migrationDone = false;

  private static storageKey(slot: number): string {
    return `raptor_save_${slot}`;
  }

  private static backupKey(slot: number): string {
    return `${this.storageKey(slot)}_backup`;
  }

  private static isValidSlot(slot: number): boolean {
    return Number.isInteger(slot) && slot >= 0 && slot < MAX_SAVE_SLOTS;
  }

  private static fnv1aHash(input: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  private static computeChecksum(data: Record<string, unknown>): string {
    const copy = { ...data };
    delete copy.checksum;
    return this.fnv1aHash(JSON.stringify(copy));
  }

  private static verifyAndLoad(raw: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return null;

      const storedChecksum = parsed.checksum;
      if (storedChecksum !== undefined) {
        const copy = { ...parsed };
        delete copy.checksum;
        const computed = this.fnv1aHash(JSON.stringify(copy));
        if (computed !== storedChecksum) return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private static async runLegacyMigration(): Promise<void> {
    if (this.migrationDone) return;
    this.migrationDone = true;

    const backend = getStorageBackend();
    const legacy = await backend.get(this.LEGACY_STORAGE_KEY);
    if (!legacy) return;

    const slot0 = await backend.get(this.storageKey(0));
    if (slot0) return;

    await backend.set(this.storageKey(0), legacy);
    await backend.remove(this.LEGACY_STORAGE_KEY);
  }

  static async save(data: RaptorSaveData, slot: number): Promise<void> {
    if (!this.isValidSlot(slot)) return;
    data.slotIndex = slot;
    const backend = getStorageBackend();

    const existing = await backend.get(this.storageKey(slot));

    delete data.checksum;
    const payload = JSON.stringify(data);
    const checksum = this.fnv1aHash(payload);
    data.checksum = checksum;
    const finalPayload = JSON.stringify(data);

    if (existing) {
      try {
        await backend.set(this.backupKey(slot), existing);
      } catch {
        console.warn(`Save slot ${slot}: failed to write backup, continuing with save`);
      }
    }

    await backend.set(this.storageKey(slot), finalPayload);
  }

  static async autoSave(slot: number, data: RaptorSaveData): Promise<void> {
    data.isAutoSave = true;
    return this.save(data, slot);
  }

  static async load(slot: number): Promise<RaptorSaveData | null> {
    await this.runLegacyMigration();
    if (!this.isValidSlot(slot)) return null;

    const backend = getStorageBackend();
    const raw = await backend.get(this.storageKey(slot));
    if (!raw) return null;

    try {
      const parsed = this.verifyAndLoad(raw);
      if (!parsed) {
        console.warn(`Save slot ${slot}: checksum mismatch, attempting backup recovery`);
        return this.tryLoadBackup(slot);
      }

      const migrated = this.runMigrations(parsed);
      if (!migrated) return null;
      if (!this.validate(migrated)) return null;
      return migrated as RaptorSaveData;
    } catch {
      return null;
    }
  }

  private static async tryLoadBackup(slot: number): Promise<RaptorSaveData | null> {
    const backend = getStorageBackend();
    const backupRaw = await backend.get(this.backupKey(slot));
    if (!backupRaw) return null;

    try {
      const backupParsed = this.verifyAndLoad(backupRaw);
      if (!backupParsed) {
        console.warn(`Save slot ${slot}: backup also corrupted, save unrecoverable`);
        return null;
      }

      const migrated = this.runMigrations(backupParsed);
      if (!migrated || !this.validate(migrated)) {
        console.warn(`Save slot ${slot}: backup also corrupted, save unrecoverable`);
        return null;
      }

      console.warn(`Save slot ${slot}: recovered from backup`);
      return migrated as RaptorSaveData;
    } catch {
      console.warn(`Save slot ${slot}: backup also corrupted, save unrecoverable`);
      return null;
    }
  }

  static async clear(slot: number): Promise<void> {
    if (!this.isValidSlot(slot)) return;
    const backend = getStorageBackend();
    await backend.remove(this.storageKey(slot));
    await backend.remove(this.backupKey(slot));
  }

  static async hasSave(slot: number): Promise<boolean> {
    await this.runLegacyMigration();
    if (!this.isValidSlot(slot)) return false;

    const backend = getStorageBackend();
    const raw = await backend.get(this.storageKey(slot));
    if (!raw) return false;

    try {
      const parsed = this.verifyAndLoad(raw);
      if (!parsed) {
        const backupRaw = await backend.get(this.backupKey(slot));
        if (!backupRaw) return false;

        const backupParsed = this.verifyAndLoad(backupRaw);
        if (!backupParsed) return false;

        const backupMigrated = this.runMigrations(backupParsed);
        if (!backupMigrated) return false;
        return this.validate(backupMigrated);
      }

      const migrated = this.runMigrations(parsed);
      if (!migrated) return false;
      return this.validate(migrated);
    } catch {
      return false;
    }
  }

  static async restoreFromBackup(slot: number): Promise<RaptorSaveData | null> {
    if (!this.isValidSlot(slot)) return null;

    const backend = getStorageBackend();
    const backupRaw = await backend.get(this.backupKey(slot));
    if (!backupRaw) return null;

    try {
      const parsed = this.verifyAndLoad(backupRaw);
      if (!parsed) return null;

      const migrated = this.runMigrations(parsed);
      if (!migrated || !this.validate(migrated)) return null;

      return migrated as RaptorSaveData;
    } catch {
      return null;
    }
  }

  static async listSlots(): Promise<(RaptorSaveData | null)[]> {
    await this.runLegacyMigration();
    const result: (RaptorSaveData | null)[] = [];
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      result.push(await this.load(i));
    }
    return result;
  }

  /** @internal Exposed for testing only. */
  static resetMigrationFlag(): void {
    this.migrationDone = false;
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

    if (d.isAutoSave !== undefined) {
      if (typeof d.isAutoSave !== "boolean") {
        d.isAutoSave = undefined;
      }
    }

    if (d.waveIndex !== undefined) {
      if (typeof d.waveIndex !== "number" || !Number.isInteger(d.waveIndex) || d.waveIndex < 0) {
        d.waveIndex = undefined;
      }
    }

    if (d.playTimeSeconds !== undefined) {
      if (typeof d.playTimeSeconds !== "number" || d.playTimeSeconds < 0) {
        d.playTimeSeconds = undefined;
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
