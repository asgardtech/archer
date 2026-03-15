import { PlayerStatsTracker, PlayerStats } from "../src/games/raptor/systems/achievements/PlayerStatsTracker";

describe("PlayerStatsTracker", () => {
  let tracker: PlayerStatsTracker;

  beforeEach(() => {
    tracker = new PlayerStatsTracker();
  });

  // ── Initialization ─────────────────────────────────────────────

  describe("initialization", () => {
    it("starts with all numeric fields at zero", () => {
      const s = tracker.getStats();
      expect(s.totalKills).toBe(0);
      expect(s.bossesDefeated).toBe(0);
      expect(s.ramKills).toBe(0);
      expect(s.totalScore).toBe(0);
      expect(s.levelsCompleted).toBe(0);
      expect(s.highestLevelCompleted).toBe(0);
      expect(s.totalDeaths).toBe(0);
      expect(s.totalDodgesUsed).toBe(0);
      expect(s.totalEmpsUsed).toBe(0);
      expect(s.totalPowerUpsCollected).toBe(0);
      expect(s.highestWeaponTier).toBe(0);
      expect(s.projectilesReflected).toBe(0);
      expect(s.totalPlayTimeSeconds).toBe(0);
      expect(s.damageTakenThisLevel).toBe(0);
    });

    it("starts with empty records for variant/type maps", () => {
      const s = tracker.getStats();
      expect(s.killsByVariant).toEqual({});
      expect(s.powerUpsByType).toEqual({});
      expect(s.fastestLevelCompletionSeconds).toEqual({});
    });

    it("starts with machine-gun in weaponsOwned", () => {
      const s = tracker.getStats();
      expect(s.weaponsOwned).toEqual(["machine-gun"]);
    });

    it("starts with lowestArmorSurvived at 100", () => {
      expect(tracker.getStats().lowestArmorSurvived).toBe(100);
    });
  });

  // ── Kill Tracking ──────────────────────────────────────────────

  describe("kill recording", () => {
    it("records a standard enemy kill", () => {
      tracker.recordKill("fighter", 25, false);
      const s = tracker.getStats();
      expect(s.totalKills).toBe(1);
      expect(s.killsByVariant["fighter"]).toBe(1);
      expect(s.bossesDefeated).toBe(0);
    });

    it("records a boss kill", () => {
      tracker.recordKill("boss", 400, true);
      const s = tracker.getStats();
      expect(s.totalKills).toBe(1);
      expect(s.bossesDefeated).toBe(1);
    });

    it("records multiple kills of different variants", () => {
      tracker.recordKill("scout", 10, false);
      tracker.recordKill("fighter", 25, false);
      tracker.recordKill("fighter", 25, false);
      const s = tracker.getStats();
      expect(s.totalKills).toBe(3);
      expect(s.killsByVariant["scout"]).toBe(1);
      expect(s.killsByVariant["fighter"]).toBe(2);
    });
  });

  // ── Ram Kill Tracking ─────────────────────────────────────────

  describe("ram kill recording", () => {
    it("records a ram kill", () => {
      tracker.recordRamKill("bomber", 50);
      const s = tracker.getStats();
      expect(s.totalKills).toBe(1);
      expect(s.ramKills).toBe(1);
      expect(s.killsByVariant["bomber"]).toBe(1);
    });

    it("does not double-count with recordKill", () => {
      tracker.recordRamKill("scout", 10);
      tracker.recordKill("fighter", 25, false);
      expect(tracker.getStats().totalKills).toBe(2);
      expect(tracker.getStats().ramKills).toBe(1);
    });
  });

  // ── Power-Up Collection ────────────────────────────────────────

  describe("power-up collection", () => {
    it("records power-up collections", () => {
      tracker.recordPowerUpCollected("repair-kit");
      tracker.recordPowerUpCollected("spread-shot");
      tracker.recordPowerUpCollected("repair-kit");
      const s = tracker.getStats();
      expect(s.totalPowerUpsCollected).toBe(3);
      expect(s.powerUpsByType["repair-kit"]).toBe(2);
      expect(s.powerUpsByType["spread-shot"]).toBe(1);
    });
  });

  // ── Survival Stats ─────────────────────────────────────────────

  describe("death recording", () => {
    it("records a single death", () => {
      tracker.recordDeath();
      expect(tracker.getStats().totalDeaths).toBe(1);
    });

    it("records multiple deaths", () => {
      tracker.recordDeath();
      tracker.recordDeath();
      tracker.recordDeath();
      expect(tracker.getStats().totalDeaths).toBe(3);
    });
  });

  // ── Ability Usage ──────────────────────────────────────────────

  describe("ability usage", () => {
    it("records dodge usage", () => {
      tracker.recordDodge();
      expect(tracker.getStats().totalDodgesUsed).toBe(1);
    });

    it("records EMP usage", () => {
      tracker.recordEmp();
      expect(tracker.getStats().totalEmpsUsed).toBe(1);
    });

    it("records deflector reflections", () => {
      tracker.recordReflect();
      tracker.recordReflect();
      expect(tracker.getStats().projectilesReflected).toBe(2);
    });
  });

  // ── Level Completion ───────────────────────────────────────────

  describe("level completion", () => {
    it("records level completion", () => {
      tracker.recordLevelComplete(0, 95.5, 30);
      const s = tracker.getStats();
      expect(s.levelsCompleted).toBe(1);
      expect(s.highestLevelCompleted).toBe(0);
      expect(s.fastestLevelCompletionSeconds[0]).toBe(95.5);
    });

    it("preserves fastest time across repeated completions", () => {
      tracker.recordLevelComplete(2, 120, 0);
      tracker.recordLevelComplete(2, 90, 10);
      const s = tracker.getStats();
      expect(s.fastestLevelCompletionSeconds[2]).toBe(90);
      expect(s.levelsCompleted).toBe(2);
    });

    it("does not overwrite fastest time with slower completion", () => {
      tracker.recordLevelComplete(1, 60, 0);
      tracker.recordLevelComplete(1, 80, 0);
      expect(tracker.getStats().fastestLevelCompletionSeconds[1]).toBe(60);
    });

    it("tracks highest level completed as maximum", () => {
      tracker.recordLevelComplete(0, 100, 0);
      tracker.recordLevelComplete(3, 100, 0);
      tracker.recordLevelComplete(1, 100, 0);
      expect(tracker.getStats().highestLevelCompleted).toBe(3);
    });
  });

  // ── Weapon Tracking ────────────────────────────────────────────

  describe("weapon tracking", () => {
    it("records weapon acquisition", () => {
      tracker.recordWeaponUpgrade("missile", 1);
      const s = tracker.getStats();
      expect(s.weaponsOwned).toContain("missile");
      expect(s.weaponsOwned).toContain("machine-gun");
    });

    it("does not duplicate weapons in weaponsOwned", () => {
      tracker.recordWeaponUpgrade("laser", 1);
      tracker.recordWeaponUpgrade("laser", 2);
      const s = tracker.getStats();
      expect(s.weaponsOwned.filter(w => w === "laser").length).toBe(1);
    });

    it("records highest weapon tier", () => {
      tracker.recordWeaponUpgrade("laser", 1);
      tracker.recordWeaponUpgrade("laser", 3);
      expect(tracker.getStats().highestWeaponTier).toBe(3);
    });

    it("does not reduce highest tier on lower-tier acquisition", () => {
      tracker.recordWeaponUpgrade("plasma", 3);
      tracker.recordWeaponUpgrade("missile", 1);
      expect(tracker.getStats().highestWeaponTier).toBe(3);
    });
  });

  // ── Damage Tracking (Per-Level) ────────────────────────────────

  describe("damage tracking", () => {
    it("accumulates damage taken within a level", () => {
      tracker.recordDamageTaken(20, 80);
      tracker.recordDamageTaken(15, 65);
      expect(tracker.getStats().damageTakenThisLevel).toBe(35);
    });

    it("tracks lowest armor survived", () => {
      tracker.recordDamageTaken(60, 40);
      tracker.recordDamageTaken(10, 30);
      expect(tracker.getStats().lowestArmorSurvived).toBe(30);
    });

    it("lowest armor reflects minimum across all hits", () => {
      tracker.recordDamageTaken(85, 15);
      tracker.recordDamageTaken(5, 80);
      expect(tracker.getStats().lowestArmorSurvived).toBe(15);
    });
  });

  // ── Per-Level Reset ────────────────────────────────────────────

  describe("per-level reset", () => {
    it("resets level-scoped fields while preserving lifetime stats", () => {
      tracker.recordKill("scout", 10, false);
      tracker.recordDamageTaken(25, 75);
      tracker.recordDodge();

      tracker.resetLevelStats();

      const s = tracker.getStats();
      expect(s.damageTakenThisLevel).toBe(0);
      expect(s.lowestArmorSurvived).toBe(100);
      expect(s.totalKills).toBe(1);
      expect(s.totalDodgesUsed).toBe(1);
    });
  });

  // ── Full Reset ─────────────────────────────────────────────────

  describe("full reset", () => {
    it("restores all stats to initial values", () => {
      tracker.recordKill("fighter", 25, false);
      tracker.recordDodge();
      tracker.recordLevelComplete(0, 100, 0);

      tracker.resetAll();

      const s = tracker.getStats();
      expect(s.totalKills).toBe(0);
      expect(s.totalDodgesUsed).toBe(0);
      expect(s.levelsCompleted).toBe(0);
      expect(s.weaponsOwned).toEqual(["machine-gun"]);
      expect(s.killsByVariant).toEqual({});
      expect(s.fastestLevelCompletionSeconds).toEqual({});
    });
  });

  // ── Snapshot Isolation ─────────────────────────────────────────

  describe("snapshot isolation", () => {
    it("getStats returns an independent copy", () => {
      tracker.recordKill("scout", 10, false);
      const snapshot = tracker.getStats();
      snapshot.totalKills = 999;
      snapshot.killsByVariant["scout"] = 999;
      snapshot.weaponsOwned.push("hacked");

      const s = tracker.getStats();
      expect(s.totalKills).toBe(1);
      expect(s.killsByVariant["scout"]).toBe(1);
      expect(s.weaponsOwned).not.toContain("hacked");
    });
  });

  // ── Play Time ──────────────────────────────────────────────────

  describe("play time", () => {
    it("accumulates across frames", () => {
      tracker.addPlayTime(0.016);
      tracker.addPlayTime(0.016);
      tracker.addPlayTime(0.016);
      expect(tracker.getStats().totalPlayTimeSeconds).toBeCloseTo(0.048, 6);
    });
  });

  // ── Score Tracking ─────────────────────────────────────────────

  describe("score tracking", () => {
    it("updates to reflect current game score", () => {
      tracker.updateScore(500, 1500);
      expect(tracker.getStats().totalScore).toBe(1500);
    });
  });
});
