import { AchievementManager } from "../src/games/raptor/systems/achievements/AchievementManager";
import { PlayerStatsTracker } from "../src/games/raptor/systems/achievements/PlayerStatsTracker";
import { ACHIEVEMENT_DEFINITIONS } from "../src/games/raptor/systems/achievements/AchievementDefinitions";
import type { AchievementDefinition } from "../src/games/raptor/types";

describe("AchievementManager", () => {
  let tracker: PlayerStatsTracker;
  let manager: AchievementManager;
  let unlockLog: AchievementDefinition[];

  beforeEach(() => {
    tracker = new PlayerStatsTracker();
    manager = new AchievementManager(tracker);
    unlockLog = [];
    manager.onUnlock = (a) => unlockLog.push(a);
  });

  // ── stat_threshold evaluation ──────────────────────────────────

  describe("stat_threshold evaluation", () => {
    it("unlocks first_blood when total_kills >= 1", () => {
      tracker.recordKill("scout", 10, false);
      const unlocked = manager.checkAchievements();
      expect(unlocked.some((a) => a.id === "first_blood")).toBe(true);
      expect(manager.isUnlocked("first_blood")).toBe(true);
      expect(unlockLog.some((a) => a.id === "first_blood")).toBe(true);
    });

    it("does not unlock century_kills below threshold", () => {
      for (let i = 0; i < 50; i++) tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      expect(manager.isUnlocked("century_kills")).toBe(false);
    });

    it("unlocks century_kills when threshold is exceeded", () => {
      for (let i = 0; i < 105; i++) tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      expect(manager.isUnlocked("century_kills")).toBe(true);
    });

    it("unlocks high_scorer at exact threshold", () => {
      tracker.updateScore(100000, 100000);
      manager.checkAchievements();
      expect(manager.isUnlocked("high_scorer")).toBe(true);
    });

    it("unlocks boss_slayer when a boss is killed", () => {
      tracker.recordKill("boss", 400, true);
      manager.checkAchievements();
      expect(manager.isUnlocked("boss_slayer")).toBe(true);
    });

    it("unlocks nine_lives after 9 deaths", () => {
      for (let i = 0; i < 9; i++) tracker.recordDeath();
      manager.checkAchievements();
      expect(manager.isUnlocked("nine_lives")).toBe(true);
    });

    it("unlocks dodge_master after 50 dodges", () => {
      for (let i = 0; i < 50; i++) tracker.recordDodge();
      manager.checkAchievements();
      expect(manager.isUnlocked("dodge_master")).toBe(true);
    });

    it("unlocks halfway_there after 5 levels completed", () => {
      for (let i = 0; i < 5; i++) tracker.recordLevelComplete(i, 100, 0);
      manager.checkAchievements();
      expect(manager.isUnlocked("halfway_there")).toBe(true);
    });

    it("unlocks power_hungry after 50 power-ups collected", () => {
      for (let i = 0; i < 50; i++) tracker.recordPowerUpCollected("repair-kit");
      manager.checkAchievements();
      expect(manager.isUnlocked("power_hungry")).toBe(true);
    });

    it("unlocks fully_loaded when 7 unique weapons owned", () => {
      const weapons = ["missile", "laser", "plasma", "ion-cannon", "auto-gun", "rocket"];
      for (const w of weapons) tracker.recordWeaponUpgrade(w, 1);
      manager.checkAchievements();
      expect(manager.isUnlocked("fully_loaded")).toBe(true);
    });

    it("unlocks emp_expert after 25 EMPs", () => {
      for (let i = 0; i < 25; i++) tracker.recordEmp();
      manager.checkAchievements();
      expect(manager.isUnlocked("emp_expert")).toBe(true);
    });

    it("unlocks deflector_pro after 10 reflects", () => {
      for (let i = 0; i < 10; i++) tracker.recordReflect();
      manager.checkAchievements();
      expect(manager.isUnlocked("deflector_pro")).toBe(true);
    });
  });

  // ── single_event evaluation ────────────────────────────────────

  describe("single_event evaluation", () => {
    it("unlocks ramming_speed on ram_kill event", () => {
      const unlocked = manager.fireEvent("ram_kill");
      expect(unlocked.some((a) => a.id === "ramming_speed")).toBe(true);
      expect(manager.isUnlocked("ramming_speed")).toBe(true);
      expect(unlockLog.some((a) => a.id === "ramming_speed")).toBe(true);
    });

    it("unlocks untouchable on no_damage_level event", () => {
      manager.fireEvent("no_damage_level");
      expect(manager.isUnlocked("untouchable")).toBe(true);
    });

    it("does not unlock untouchable without the event", () => {
      manager.checkAchievements();
      expect(manager.isUnlocked("untouchable")).toBe(false);
    });

    it("unlocks close_call on armor_below_10pct event", () => {
      manager.fireEvent("armor_below_10pct");
      expect(manager.isUnlocked("close_call")).toBe(true);
    });

    it("unlocks speedrunner on level_under_2min event", () => {
      manager.fireEvent("level_under_2min");
      expect(manager.isUnlocked("speedrunner")).toBe(true);
    });

    it("does not unlock speedrunner without the event", () => {
      manager.checkAchievements();
      expect(manager.isUnlocked("speedrunner")).toBe(false);
    });

    it("unlocks max_tier on weapon_tier_3 event", () => {
      manager.fireEvent("weapon_tier_3");
      expect(manager.isUnlocked("max_tier")).toBe(true);
    });

    it("unlocks bomb_hoarder on bombs_at_max event", () => {
      manager.fireEvent("bombs_at_max");
      expect(manager.isUnlocked("bomb_hoarder")).toBe(true);
    });

    it("unlocks first_sortie on level_complete event", () => {
      manager.fireEvent("level_complete");
      expect(manager.isUnlocked("first_sortie")).toBe(true);
    });

    it("checkAchievements does not unlock single_event achievements by stat alone", () => {
      for (let i = 0; i < 100; i++) tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      expect(manager.isUnlocked("ramming_speed")).toBe(false);
    });
  });

  // ── Idempotency / no duplicates ────────────────────────────────

  describe("idempotency", () => {
    it("achievement unlocks exactly once despite repeated checkAchievements", () => {
      for (let i = 0; i < 5; i++) tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      manager.checkAchievements();
      manager.checkAchievements();
      expect(manager.isUnlocked("first_blood")).toBe(true);
      const firstBloodCallbacks = unlockLog.filter((a) => a.id === "first_blood");
      expect(firstBloodCallbacks.length).toBe(1);
    });

    it("firing the same event twice does not re-trigger unlock", () => {
      manager.fireEvent("ram_kill");
      manager.fireEvent("ram_kill");
      expect(manager.isUnlocked("ramming_speed")).toBe(true);
      const rammingCallbacks = unlockLog.filter((a) => a.id === "ramming_speed");
      expect(rammingCallbacks.length).toBe(1);
    });
  });

  // ── Progress tracking ─────────────────────────────────────────

  describe("progress tracking", () => {
    it("returns accurate partial progress for stat_threshold", () => {
      for (let i = 0; i < 42; i++) tracker.recordKill("scout", 10, false);
      const progress = manager.getProgress("century_kills");
      expect(progress.current).toBe(42);
      expect(progress.target).toBe(100);
      expect(progress.percentage).toBe(42);
    });

    it("clamps percentage at 100 when stat exceeds threshold", () => {
      for (let i = 0; i < 10; i++) tracker.recordKill("scout", 10, false);
      const progress = manager.getProgress("first_blood");
      expect(progress.current).toBe(10);
      expect(progress.target).toBe(1);
      expect(progress.percentage).toBe(100);
    });

    it("returns 0/1 for locked single_event achievement", () => {
      const progress = manager.getProgress("ramming_speed");
      expect(progress.current).toBe(0);
      expect(progress.target).toBe(1);
      expect(progress.percentage).toBe(0);
    });

    it("returns 1/1 for unlocked single_event achievement", () => {
      manager.fireEvent("ram_kill");
      const progress = manager.getProgress("ramming_speed");
      expect(progress.current).toBe(1);
      expect(progress.target).toBe(1);
      expect(progress.percentage).toBe(100);
    });

    it("returns zeros for unknown achievement id", () => {
      const progress = manager.getProgress("nonexistent_achievement");
      expect(progress.current).toBe(0);
      expect(progress.target).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });

  // ── getAllAchievements ──────────────────────────────────────────

  describe("getAllAchievements", () => {
    it("returns the full list of 21 achievements", () => {
      const all = manager.getAllAchievements();
      expect(all.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
      expect(all.length).toBe(21);
    });

    it("reflects unlock status correctly", () => {
      tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      const all = manager.getAllAchievements();
      const firstBlood = all.find((a) => a.definition.id === "first_blood");
      const century = all.find((a) => a.definition.id === "century_kills");
      expect(firstBlood?.unlocked).toBe(true);
      expect(century?.unlocked).toBe(false);
      expect(century?.progress).toBe(1);
    });

    it("shows progress for stat_threshold achievements", () => {
      for (let i = 0; i < 50; i++) tracker.recordKill("scout", 10, false);
      for (let i = 0; i < 20; i++) tracker.recordPowerUpCollected("repair-kit");
      const all = manager.getAllAchievements();
      const century = all.find((a) => a.definition.id === "century_kills");
      const power = all.find((a) => a.definition.id === "power_hungry");
      expect(century?.progress).toBe(50);
      expect(power?.progress).toBe(40);
    });
  });

  // ── Composite conditions ───────────────────────────────────────

  describe("composite conditions", () => {
    it("does not unlock when only some sub-conditions are met", () => {
      const originalDefs = [...ACHIEVEMENT_DEFINITIONS];
      const compositeDef: AchievementDefinition = {
        id: "test_composite",
        name: "Test Composite",
        description: "Test",
        icon: "test",
        category: "combat",
        condition: {
          type: "composite",
          conditions: [
            { type: "stat_threshold", stat: "total_kills", threshold: 10 },
            { type: "stat_threshold", stat: "total_score", threshold: 500 },
          ],
        },
      };

      (ACHIEVEMENT_DEFINITIONS as any).push(compositeDef);
      try {
        for (let i = 0; i < 10; i++) tracker.recordKill("scout", 10, false);
        tracker.updateScore(200, 200);
        manager.checkAchievements();
        expect(manager.isUnlocked("test_composite")).toBe(false);
      } finally {
        (ACHIEVEMENT_DEFINITIONS as any).length = originalDefs.length;
      }
    });

    it("unlocks when all sub-conditions are met", () => {
      const originalLength = ACHIEVEMENT_DEFINITIONS.length;
      const compositeDef: AchievementDefinition = {
        id: "test_composite_2",
        name: "Test Composite 2",
        description: "Test",
        icon: "test",
        category: "combat",
        condition: {
          type: "composite",
          conditions: [
            { type: "stat_threshold", stat: "total_kills", threshold: 10 },
            { type: "stat_threshold", stat: "total_score", threshold: 500 },
          ],
        },
      };

      (ACHIEVEMENT_DEFINITIONS as any).push(compositeDef);
      try {
        for (let i = 0; i < 10; i++) tracker.recordKill("scout", 10, false);
        tracker.updateScore(500, 500);
        manager.checkAchievements();
        expect(manager.isUnlocked("test_composite_2")).toBe(true);
      } finally {
        (ACHIEVEMENT_DEFINITIONS as any).length = originalLength;
      }
    });

    it("tracks single_event sub-conditions in composite achievements", () => {
      const originalLength = ACHIEVEMENT_DEFINITIONS.length;
      const compositeDef: AchievementDefinition = {
        id: "test_composite_event",
        name: "Test Composite Event",
        description: "Test",
        icon: "test",
        category: "combat",
        condition: {
          type: "composite",
          conditions: [
            { type: "single_event", eventType: "ram_kill" },
            { type: "stat_threshold", stat: "total_kills", threshold: 5 },
          ],
        },
      };

      (ACHIEVEMENT_DEFINITIONS as any).push(compositeDef);
      try {
        manager.fireEvent("ram_kill");
        for (let i = 0; i < 3; i++) tracker.recordKill("scout", 10, false);
        manager.checkAchievements();
        expect(manager.isUnlocked("test_composite_event")).toBe(false);

        for (let i = 0; i < 2; i++) tracker.recordKill("scout", 10, false);
        manager.checkAchievements();
        expect(manager.isUnlocked("test_composite_event")).toBe(true);
      } finally {
        (ACHIEVEMENT_DEFINITIONS as any).length = originalLength;
      }
    });

    it("empty composite conditions array unlocks immediately", () => {
      const originalLength = ACHIEVEMENT_DEFINITIONS.length;
      const compositeDef: AchievementDefinition = {
        id: "test_empty_composite",
        name: "Test Empty",
        description: "Test",
        icon: "test",
        category: "combat",
        condition: { type: "composite", conditions: [] },
      };

      (ACHIEVEMENT_DEFINITIONS as any).push(compositeDef);
      try {
        manager.checkAchievements();
        expect(manager.isUnlocked("test_empty_composite")).toBe(true);
      } finally {
        (ACHIEVEMENT_DEFINITIONS as any).length = originalLength;
      }
    });
  });

  // ── Callback error isolation ───────────────────────────────────

  describe("callback error isolation", () => {
    it("onUnlock callback error does not prevent other unlocks", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      manager.onUnlock = () => {
        throw new Error("callback error");
      };

      tracker.recordKill("scout", 10, false);
      tracker.recordLevelComplete(0, 100, 0);
      manager.fireEvent("level_complete");
      manager.checkAchievements();

      expect(manager.isUnlocked("first_blood")).toBe(true);
      expect(manager.isUnlocked("first_sortie")).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ── Save/load support ─────────────────────────────────────────

  describe("save/load support", () => {
    it("loadUnlocked restores previously unlocked achievements", () => {
      manager.loadUnlocked([
        { id: "first_blood", unlockedAt: 1710000000000 },
        { id: "boss_slayer", unlockedAt: 1710000100000 },
      ]);
      expect(manager.isUnlocked("first_blood")).toBe(true);
      expect(manager.isUnlocked("boss_slayer")).toBe(true);
      expect(unlockLog.length).toBe(0);
    });

    it("loadUnlocked merges with runtime unlocks", () => {
      tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      expect(manager.isUnlocked("first_blood")).toBe(true);

      manager.loadUnlocked([{ id: "boss_slayer", unlockedAt: 1710000000000 }]);
      expect(manager.isUnlocked("first_blood")).toBe(true);
      expect(manager.isUnlocked("boss_slayer")).toBe(true);
    });

    it("loadUnlocked does not overwrite existing runtime unlocks", () => {
      tracker.recordKill("scout", 10, false);
      manager.checkAchievements();

      const beforeTimestamp = manager.getUnlocked().find((a) => a.id === "first_blood")?.unlockedAt;
      manager.loadUnlocked([{ id: "first_blood", unlockedAt: 1710000000000 }]);
      const afterTimestamp = manager.getUnlocked().find((a) => a.id === "first_blood")?.unlockedAt;

      expect(afterTimestamp).toBe(beforeTimestamp);
    });

    it("getUnlocked returns all unlocked achievements", () => {
      tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      manager.fireEvent("ram_kill");

      const unlocked = manager.getUnlocked();
      expect(unlocked.some((a) => a.id === "first_blood")).toBe(true);
      expect(unlocked.some((a) => a.id === "ramming_speed")).toBe(true);
    });
  });

  // ── Reset ──────────────────────────────────────────────────────

  describe("reset", () => {
    it("clears all unlocked achievements", () => {
      tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      expect(manager.isUnlocked("first_blood")).toBe(true);

      manager.reset();
      expect(manager.isUnlocked("first_blood")).toBe(false);
      expect(manager.getUnlocked().length).toBe(0);
    });
  });

  // ── Stat resolution edge cases ────────────────────────────────

  describe("stat resolution edge cases", () => {
    it("derived stat unique_weapons_owned resolves from array length", () => {
      const weapons = ["missile", "laser", "plasma", "ion-cannon", "auto-gun", "rocket"];
      for (const w of weapons) tracker.recordWeaponUpgrade(w, 1);
      manager.checkAchievements();
      expect(manager.isUnlocked("fully_loaded")).toBe(true);
    });

    it("unknown stat key resolves to 0 without crashing", () => {
      const originalLength = ACHIEVEMENT_DEFINITIONS.length;
      const badDef: AchievementDefinition = {
        id: "test_unknown_stat",
        name: "Bad Stat",
        description: "Test",
        icon: "test",
        category: "combat",
        condition: { type: "stat_threshold", stat: "nonexistent_stat", threshold: 1 },
      };

      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      (ACHIEVEMENT_DEFINITIONS as any).push(badDef);
      try {
        expect(() => manager.checkAchievements()).not.toThrow();
        expect(manager.isUnlocked("test_unknown_stat")).toBe(false);
      } finally {
        (ACHIEVEMENT_DEFINITIONS as any).length = originalLength;
        warnSpy.mockRestore();
      }
    });
  });

  // ── isUnlocked edge cases ─────────────────────────────────────

  describe("isUnlocked edge cases", () => {
    it("returns false for unknown achievement id", () => {
      expect(manager.isUnlocked("does_not_exist")).toBe(false);
    });
  });

  // ── Multiple simultaneous unlocks ──────────────────────────────

  describe("multiple simultaneous unlocks", () => {
    it("unlocks multiple achievements in a single checkAchievements call", () => {
      tracker.recordKill("boss", 400, true);
      tracker.updateScore(100000, 100000);
      const unlocked = manager.checkAchievements();
      expect(unlocked.some((a) => a.id === "first_blood")).toBe(true);
      expect(unlocked.some((a) => a.id === "boss_slayer")).toBe(true);
      expect(unlocked.some((a) => a.id === "high_scorer")).toBe(true);
    });
  });

  // ── onUnlock setter ────────────────────────────────────────────

  describe("onUnlock setter", () => {
    it("can be set to null to disable callback", () => {
      manager.onUnlock = null;
      tracker.recordKill("scout", 10, false);
      expect(() => manager.checkAchievements()).not.toThrow();
      expect(manager.isUnlocked("first_blood")).toBe(true);
    });

    it("callback receives the correct achievement definition", () => {
      tracker.recordKill("scout", 10, false);
      manager.checkAchievements();
      const firstBloodCb = unlockLog.find((a) => a.id === "first_blood");
      expect(firstBloodCb).toBeDefined();
      expect(firstBloodCb?.name).toBe("First Blood");
      expect(firstBloodCb?.category).toBe("combat");
    });
  });
});
