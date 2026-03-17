import type { AchievementDefinition, AchievementCondition, UnlockedAchievement } from "../../types";
import type { PlayerStats } from "./PlayerStatsTracker";
import type { PlayerStatsTracker } from "./PlayerStatsTracker";
import { ACHIEVEMENT_DEFINITIONS } from "./AchievementDefinitions";

export type AchievementEventType =
  | "ram_kill"
  | "no_damage_level"
  | "armor_below_10pct"
  | "level_complete"
  | "weapon_tier_max"
  | "bombs_at_max"
  | "level_under_2min";

const STAT_RESOLVERS: Record<string, (stats: PlayerStats) => number> = {
  total_kills: (s) => s.totalKills,
  bosses_killed: (s) => s.bossesDefeated,
  levels_completed: (s) => s.levelsCompleted,
  total_score: (s) => s.totalScore,
  power_ups_collected: (s) => s.totalPowerUpsCollected,
  unique_weapons_owned: (s) => s.weaponsOwned.length,
  total_emps: (s) => s.totalEmpsUsed,
  total_reflects: (s) => s.projectilesReflected,
  deaths_survived: (s) => s.totalDeaths,
  total_dodges: (s) => s.totalDodgesUsed,
};

function resolveStat(key: string, stats: PlayerStats): number {
  const resolver = STAT_RESOLVERS[key];
  if (resolver) return resolver(stats);
  console.warn(`[AchievementManager] Unknown stat key: "${key}"`);
  return 0;
}

export class AchievementManager {
  private unlockedAchievements: Map<string, UnlockedAchievement> = new Map();
  private statsTracker: PlayerStatsTracker;
  private _onUnlock: ((achievement: AchievementDefinition) => void) | null = null;
  private compositeEventState: Map<string, Set<string>> = new Map();

  constructor(statsTracker: PlayerStatsTracker) {
    this.statsTracker = statsTracker;
  }

  set onUnlock(callback: ((achievement: AchievementDefinition) => void) | null) {
    this._onUnlock = callback;
  }

  get onUnlock(): ((achievement: AchievementDefinition) => void) | null {
    return this._onUnlock;
  }

  checkAchievements(): AchievementDefinition[] {
    const stats = this.statsTracker.getStats();
    const newlyUnlocked: AchievementDefinition[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (this.unlockedAchievements.has(def.id)) continue;

      if (def.condition.type === "single_event") continue;

      if (this.evaluateCondition(def.id, def.condition, stats)) {
        this.unlock(def);
        newlyUnlocked.push(def);
      }
    }

    return newlyUnlocked;
  }

  fireEvent(eventType: string): AchievementDefinition[] {
    const newlyUnlocked: AchievementDefinition[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (this.unlockedAchievements.has(def.id)) continue;

      if (def.condition.type === "single_event" && def.condition.eventType === eventType) {
        this.unlock(def);
        newlyUnlocked.push(def);
        continue;
      }

      if (def.condition.type === "composite" && def.condition.conditions) {
        let hasMatchingSingleEvent = false;
        for (const sub of def.condition.conditions) {
          if (sub.type === "single_event" && sub.eventType === eventType) {
            hasMatchingSingleEvent = true;
            break;
          }
        }
        if (hasMatchingSingleEvent) {
          let eventSet = this.compositeEventState.get(def.id);
          if (!eventSet) {
            eventSet = new Set();
            this.compositeEventState.set(def.id, eventSet);
          }
          eventSet.add(eventType);

          const stats = this.statsTracker.getStats();
          if (this.evaluateCondition(def.id, def.condition, stats)) {
            this.unlock(def);
            newlyUnlocked.push(def);
          }
        }
      }
    }

    return newlyUnlocked;
  }

  isUnlocked(id: string): boolean {
    return this.unlockedAchievements.has(id);
  }

  getProgress(id: string): { current: number; target: number; percentage: number } {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
    if (!def) return { current: 0, target: 0, percentage: 0 };

    const condition = def.condition;

    if (condition.type === "stat_threshold") {
      const target = condition.threshold!;
      if (this.isUnlocked(id)) {
        return { current: target, target, percentage: 100 };
      }
      const stats = this.statsTracker.getStats();
      const current = resolveStat(condition.stat!, stats);
      const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 100;
      return { current, target, percentage };
    }

    if (condition.type === "single_event") {
      const unlocked = this.isUnlocked(id);
      return {
        current: unlocked ? 1 : 0,
        target: 1,
        percentage: unlocked ? 100 : 0,
      };
    }

    if (condition.type === "composite" && condition.conditions) {
      const stats = this.statsTracker.getStats();
      const total = condition.conditions.length;
      if (total === 0) return { current: 0, target: 0, percentage: 100 };

      let satisfied = 0;
      const eventSet = this.compositeEventState.get(id);
      for (const sub of condition.conditions) {
        if (this.evaluateSubCondition(id, sub, stats)) {
          satisfied++;
        }
      }
      if (this.isUnlocked(id)) satisfied = total;
      const percentage = Math.min(100, (satisfied / total) * 100);
      return { current: satisfied, target: total, percentage };
    }

    return { current: 0, target: 0, percentage: 0 };
  }

  getAllAchievements(): {
    definition: AchievementDefinition;
    unlocked: boolean;
    progress: number;
  }[] {
    return ACHIEVEMENT_DEFINITIONS.map((def) => ({
      definition: def,
      unlocked: this.isUnlocked(def.id),
      progress: this.getProgress(def.id).percentage,
    }));
  }

  getUnlocked(): UnlockedAchievement[] {
    return Array.from(this.unlockedAchievements.values());
  }

  loadUnlocked(achievements: UnlockedAchievement[]): void {
    for (const a of achievements) {
      if (!this.unlockedAchievements.has(a.id)) {
        this.unlockedAchievements.set(a.id, a);
      }
    }
  }

  reset(): void {
    this.unlockedAchievements.clear();
    this.compositeEventState.clear();
  }

  forceUnlock(id: string): boolean {
    if (this.unlockedAchievements.has(id)) return false;
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
    if (!def) return false;
    this.unlock(def);
    return true;
  }

  forceLock(id: string): boolean {
    if (!this.unlockedAchievements.has(id)) return false;
    this.unlockedAchievements.delete(id);
    this.compositeEventState.delete(id);
    return true;
  }

  private unlock(def: AchievementDefinition): void {
    const unlocked: UnlockedAchievement = {
      id: def.id,
      unlockedAt: Date.now(),
    };
    this.unlockedAchievements.set(def.id, unlocked);
    this.compositeEventState.delete(def.id);

    if (this._onUnlock) {
      try {
        this._onUnlock(def);
      } catch (err) {
        console.error("[AchievementManager] onUnlock callback error:", err);
      }
    }
  }

  private evaluateCondition(
    achievementId: string,
    condition: AchievementCondition,
    stats: PlayerStats,
  ): boolean {
    switch (condition.type) {
      case "stat_threshold":
        return resolveStat(condition.stat!, stats) >= (condition.threshold ?? 0);

      case "single_event":
        return this.isUnlocked(achievementId);

      case "composite": {
        const subs = condition.conditions ?? [];
        return subs.every((sub) =>
          this.evaluateSubCondition(achievementId, sub, stats),
        );
      }

      default:
        return false;
    }
  }

  private evaluateSubCondition(
    achievementId: string,
    condition: AchievementCondition,
    stats: PlayerStats,
  ): boolean {
    if (condition.type === "stat_threshold") {
      return resolveStat(condition.stat!, stats) >= (condition.threshold ?? 0);
    }

    if (condition.type === "single_event") {
      const eventSet = this.compositeEventState.get(achievementId);
      return eventSet?.has(condition.eventType!) ?? false;
    }

    if (condition.type === "composite" && condition.conditions) {
      return condition.conditions.every((sub) =>
        this.evaluateSubCondition(achievementId, sub, stats),
      );
    }

    return false;
  }
}
