import type { UnlockedAchievement } from "../../types";
import type { PlayerStats } from "./PlayerStatsTracker";
import { getStorageBackend } from "../../../../shared/storage";

export const ACHIEVEMENT_SAVE_VERSION = 1;

interface AchievementSaveData {
  version: number;
  unlockedAchievements: UnlockedAchievement[];
  playerStats: PlayerStats;
  checksum: string;
}

const MIGRATIONS: readonly {
  fromVersion: number;
  toVersion: number;
  migrate(data: Record<string, unknown>): Record<string, unknown>;
}[] = [];

function defaultStats(): PlayerStats {
  return {
    totalKills: 0,
    killsByVariant: {},
    bossesDefeated: 0,
    ramKills: 0,
    totalScore: 0,
    levelsCompleted: 0,
    highestLevelCompleted: 0,
    totalDeaths: 0,
    totalDodgesUsed: 0,
    totalEmpsUsed: 0,
    totalPowerUpsCollected: 0,
    powerUpsByType: {},
    weaponsOwned: ["machine-gun"],
    highestWeaponTier: 0,
    projectilesReflected: 0,
    totalPlayTimeSeconds: 0,
    fastestLevelCompletionSeconds: {},
    damageTakenThisLevel: 0,
    lowestArmorSurvived: 100,
  };
}

export class AchievementStorage {
  private static readonly ACHIEVEMENTS_KEY = "raptor_achievements";

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
    return AchievementStorage.fnv1aHash(JSON.stringify(copy));
  }

  static async load(): Promise<{
    unlockedAchievements: UnlockedAchievement[];
    playerStats: PlayerStats;
  }> {
    const defaults = {
      unlockedAchievements: [] as UnlockedAchievement[],
      playerStats: defaultStats(),
    };

    try {
      const backend = getStorageBackend();
      const raw = await backend.get(AchievementStorage.ACHIEVEMENTS_KEY);
      if (raw === null) return defaults;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn("[AchievementStorage] Corrupted JSON, resetting to defaults");
        return defaults;
      }

      if (typeof parsed !== "object" || parsed === null) return defaults;

      // Checksum validation
      if (parsed.checksum !== undefined) {
        const stored = parsed.checksum;
        const computed = AchievementStorage.computeChecksum(parsed);
        if (computed !== stored) {
          console.warn("[AchievementStorage] Achievement data integrity check failed, resetting to defaults");
          return defaults;
        }
      }

      // Version validation
      const version = parsed.version;
      if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
        return defaults;
      }
      if (version > ACHIEVEMENT_SAVE_VERSION) {
        console.warn("[AchievementStorage] Future version detected, resetting to defaults");
        return defaults;
      }

      // Run migrations
      let data = parsed;
      let currentVersion = version;
      for (const migration of MIGRATIONS) {
        if (currentVersion === ACHIEVEMENT_SAVE_VERSION) break;
        if (migration.fromVersion === currentVersion) {
          data = migration.migrate(data);
          currentVersion = data.version as number;
        }
      }
      if (currentVersion !== ACHIEVEMENT_SAVE_VERSION) return defaults;

      // Validate unlocked achievements
      const rawAchievements = data.unlockedAchievements;
      const validAchievements: UnlockedAchievement[] = [];
      if (Array.isArray(rawAchievements)) {
        for (const entry of rawAchievements) {
          if (
            entry &&
            typeof entry === "object" &&
            typeof (entry as Record<string, unknown>).id === "string" &&
            (entry as Record<string, unknown>).id !== "" &&
            typeof (entry as Record<string, unknown>).unlockedAt === "number" &&
            Number.isFinite((entry as Record<string, unknown>).unlockedAt as number)
          ) {
            validAchievements.push({
              id: (entry as Record<string, unknown>).id as string,
              unlockedAt: (entry as Record<string, unknown>).unlockedAt as number,
            });
          }
        }
      }

      // Validate player stats
      const rawStats = data.playerStats;
      const stats = defaultStats();
      if (rawStats && typeof rawStats === "object" && !Array.isArray(rawStats)) {
        const s = rawStats as Record<string, unknown>;

        if (typeof s.totalKills === "number" && s.totalKills >= 0 && Number.isInteger(s.totalKills)) stats.totalKills = s.totalKills;
        if (typeof s.bossesDefeated === "number" && s.bossesDefeated >= 0 && Number.isInteger(s.bossesDefeated)) stats.bossesDefeated = s.bossesDefeated;
        if (typeof s.ramKills === "number" && s.ramKills >= 0 && Number.isInteger(s.ramKills)) stats.ramKills = s.ramKills;
        if (typeof s.totalScore === "number" && s.totalScore >= 0) stats.totalScore = s.totalScore;
        if (typeof s.levelsCompleted === "number" && s.levelsCompleted >= 0 && Number.isInteger(s.levelsCompleted)) stats.levelsCompleted = s.levelsCompleted;
        if (typeof s.highestLevelCompleted === "number" && s.highestLevelCompleted >= 0 && Number.isInteger(s.highestLevelCompleted)) stats.highestLevelCompleted = s.highestLevelCompleted;
        if (typeof s.totalDeaths === "number" && s.totalDeaths >= 0 && Number.isInteger(s.totalDeaths)) stats.totalDeaths = s.totalDeaths;
        if (typeof s.totalDodgesUsed === "number" && s.totalDodgesUsed >= 0 && Number.isInteger(s.totalDodgesUsed)) stats.totalDodgesUsed = s.totalDodgesUsed;
        if (typeof s.totalEmpsUsed === "number" && s.totalEmpsUsed >= 0 && Number.isInteger(s.totalEmpsUsed)) stats.totalEmpsUsed = s.totalEmpsUsed;
        if (typeof s.totalPowerUpsCollected === "number" && s.totalPowerUpsCollected >= 0 && Number.isInteger(s.totalPowerUpsCollected)) stats.totalPowerUpsCollected = s.totalPowerUpsCollected;
        if (typeof s.highestWeaponTier === "number" && s.highestWeaponTier >= 0 && s.highestWeaponTier <= 3 && Number.isInteger(s.highestWeaponTier)) stats.highestWeaponTier = s.highestWeaponTier;
        if (typeof s.projectilesReflected === "number" && s.projectilesReflected >= 0 && Number.isInteger(s.projectilesReflected)) stats.projectilesReflected = s.projectilesReflected;
        if (typeof s.totalPlayTimeSeconds === "number" && s.totalPlayTimeSeconds >= 0) stats.totalPlayTimeSeconds = s.totalPlayTimeSeconds;

        if (s.killsByVariant && typeof s.killsByVariant === "object" && !Array.isArray(s.killsByVariant)) {
          const merged: Record<string, number> = {};
          for (const [k, v] of Object.entries(s.killsByVariant as Record<string, unknown>)) {
            if (typeof v === "number" && v >= 0 && Number.isInteger(v)) merged[k] = v;
          }
          stats.killsByVariant = merged;
        }

        if (s.powerUpsByType && typeof s.powerUpsByType === "object" && !Array.isArray(s.powerUpsByType)) {
          const merged: Record<string, number> = {};
          for (const [k, v] of Object.entries(s.powerUpsByType as Record<string, unknown>)) {
            if (typeof v === "number" && v >= 0 && Number.isInteger(v)) merged[k] = v;
          }
          stats.powerUpsByType = merged;
        }

        if (Array.isArray(s.weaponsOwned)) {
          const valid = (s.weaponsOwned as unknown[]).filter(
            (w): w is string => typeof w === "string" && w.length > 0,
          );
          stats.weaponsOwned = valid.length > 0 ? valid : ["machine-gun"];
        }

        if (s.fastestLevelCompletionSeconds && typeof s.fastestLevelCompletionSeconds === "object" && !Array.isArray(s.fastestLevelCompletionSeconds)) {
          const merged: Record<number, number> = {};
          for (const [k, v] of Object.entries(s.fastestLevelCompletionSeconds as Record<string, unknown>)) {
            const key = Number(k);
            if (!isNaN(key) && typeof v === "number" && v > 0) merged[key] = v;
          }
          stats.fastestLevelCompletionSeconds = merged;
        }
      }

      // Per-level fields always reset
      stats.damageTakenThisLevel = 0;
      stats.lowestArmorSurvived = 100;

      return {
        unlockedAchievements: validAchievements,
        playerStats: stats,
      };
    } catch {
      return {
        unlockedAchievements: [],
        playerStats: defaultStats(),
      };
    }
  }

  static async save(
    unlockedAchievements: UnlockedAchievement[],
    playerStats: PlayerStats,
  ): Promise<void> {
    try {
      const payload: Omit<AchievementSaveData, "checksum"> & { checksum?: string } = {
        version: ACHIEVEMENT_SAVE_VERSION,
        unlockedAchievements,
        playerStats: {
          ...playerStats,
          damageTakenThisLevel: 0,
          lowestArmorSurvived: 100,
        },
      };

      const withoutChecksum = JSON.stringify(payload);
      const checksum = AchievementStorage.fnv1aHash(withoutChecksum);
      (payload as AchievementSaveData).checksum = checksum;

      const backend = getStorageBackend();
      await backend.set(AchievementStorage.ACHIEVEMENTS_KEY, JSON.stringify(payload));
    } catch {
      // silently ignore — consistent with SettingsStorage/SaveSystem
    }
  }

  static async clear(): Promise<void> {
    try {
      const backend = getStorageBackend();
      await backend.remove(AchievementStorage.ACHIEVEMENTS_KEY);
    } catch {
      // silently ignore
    }
  }
}
