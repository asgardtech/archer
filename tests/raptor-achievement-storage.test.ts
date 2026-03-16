import { AchievementStorage, ACHIEVEMENT_SAVE_VERSION } from "../src/games/raptor/systems/achievements/AchievementStorage";
import { PlayerStatsTracker } from "../src/games/raptor/systems/achievements/PlayerStatsTracker";
import type { PlayerStats } from "../src/games/raptor/systems/achievements/PlayerStatsTracker";
import { AchievementManager } from "../src/games/raptor/systems/achievements/AchievementManager";
import type { UnlockedAchievement } from "../src/games/raptor/types";
import { StorageBackend, setStorageBackend } from "../src/shared/storage";

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

// ─── Test Helpers ───────────────────────────────────────────────

let mockBackend: MockStorageBackend;

beforeEach(() => {
  mockBackend = new MockStorageBackend();
  setStorageBackend(mockBackend);
});

function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sampleAchievements(): UnlockedAchievement[] {
  return [
    { id: "first_blood", unlockedAt: 1700000000000 },
    { id: "boss_slayer", unlockedAt: 1700000001000 },
  ];
}

function sampleStats(): PlayerStats {
  return {
    totalKills: 150,
    killsByVariant: { scout: 80, fighter: 50, bomber: 20 },
    bossesDefeated: 3,
    ramKills: 5,
    totalScore: 25000,
    levelsCompleted: 7,
    highestLevelCompleted: 6,
    totalDeaths: 4,
    totalDodgesUsed: 30,
    totalEmpsUsed: 10,
    totalPowerUpsCollected: 45,
    powerUpsByType: { "repair-kit": 15, "spread-shot": 10, "weapon-missile": 20 },
    weaponsOwned: ["machine-gun", "missile", "laser"],
    highestWeaponTier: 2,
    projectilesReflected: 12,
    totalPlayTimeSeconds: 3600,
    fastestLevelCompletionSeconds: { 0: 85.3, 1: 110.7 },
    damageTakenThisLevel: 45,
    lowestArmorSurvived: 22,
  };
}

// ════════════════════════════════════════════════════════════════
// ROUND-TRIP TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Save and load round-trip preserves all data", () => {
  test("save then load returns matching achievements and stats", async () => {
    const achievements = sampleAchievements();
    const stats = sampleStats();

    await AchievementStorage.save(achievements, stats);
    const loaded = await AchievementStorage.load();

    expect(loaded.unlockedAchievements).toEqual(achievements);
    expect(loaded.playerStats.totalKills).toBe(150);
    expect(loaded.playerStats.killsByVariant).toEqual({ scout: 80, fighter: 50, bomber: 20 });
    expect(loaded.playerStats.bossesDefeated).toBe(3);
    expect(loaded.playerStats.weaponsOwned).toEqual(["machine-gun", "missile", "laser"]);
    expect(loaded.playerStats.fastestLevelCompletionSeconds).toEqual({ 0: 85.3, 1: 110.7 });
    expect(loaded.playerStats.totalPlayTimeSeconds).toBe(3600);
  });

  test("per-level transient fields are zeroed in saved data", async () => {
    const stats = sampleStats();
    expect(stats.damageTakenThisLevel).toBe(45);
    expect(stats.lowestArmorSurvived).toBe(22);

    await AchievementStorage.save([], stats);
    const loaded = await AchievementStorage.load();

    expect(loaded.playerStats.damageTakenThisLevel).toBe(0);
    expect(loaded.playerStats.lowestArmorSurvived).toBe(100);
  });
});

// ════════════════════════════════════════════════════════════════
// EMPTY STORAGE TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Missing storage key returns defaults", () => {
  test("load from empty storage returns empty achievements and default stats", async () => {
    const loaded = await AchievementStorage.load();

    expect(loaded.unlockedAchievements).toEqual([]);
    expect(loaded.playerStats.totalKills).toBe(0);
    expect(loaded.playerStats.bossesDefeated).toBe(0);
    expect(loaded.playerStats.weaponsOwned).toEqual(["machine-gun"]);
    expect(loaded.playerStats.damageTakenThisLevel).toBe(0);
    expect(loaded.playerStats.lowestArmorSurvived).toBe(100);
  });
});

// ════════════════════════════════════════════════════════════════
// CHECKSUM TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Valid checksum allows data to load", () => {
  test("saved data contains a valid checksum field", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);

    expect(raw.checksum).toBeDefined();
    expect(raw.checksum).toMatch(/^[0-9a-f]{8}$/);

    const storedChecksum = raw.checksum;
    delete raw.checksum;
    const expected = fnv1aHash(JSON.stringify(raw));
    expect(storedChecksum).toBe(expected);
  });

  test("all saved achievements and stats are restored with valid checksum", async () => {
    const achievements = sampleAchievements();
    await AchievementStorage.save(achievements, sampleStats());
    const loaded = await AchievementStorage.load();

    expect(loaded.unlockedAchievements).toHaveLength(2);
    expect(loaded.playerStats.totalKills).toBe(150);
  });
});

describe("Scenario: Tampered data is rejected due to checksum mismatch", () => {
  test("modified JSON without updated checksum returns defaults", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());

    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);
    raw.unlockedAchievements.push({ id: "hacked", unlockedAt: 0 });
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toEqual([]);
    expect(loaded.playerStats.totalKills).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// CORRUPTION HANDLING TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Corrupted JSON is handled gracefully", () => {
  test("invalid JSON string returns defaults", async () => {
    mockBackend.data["raptor_achievements"] = "not-json{{{";
    const loaded = await AchievementStorage.load();

    expect(loaded.unlockedAchievements).toEqual([]);
    expect(loaded.playerStats.totalKills).toBe(0);
  });

  test("game does not crash on corrupted data", async () => {
    mockBackend.data["raptor_achievements"] = "not-json{{{";
    await expect(AchievementStorage.load()).resolves.toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════
// VERSION HANDLING TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Data includes a version field for future migrations", () => {
  test("saved data contains version field set to ACHIEVEMENT_SAVE_VERSION", async () => {
    await AchievementStorage.save([], sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);
    expect(raw.version).toBe(ACHIEVEMENT_SAVE_VERSION);
    expect(ACHIEVEMENT_SAVE_VERSION).toBe(1);
  });
});

describe("Scenario: Future version data is rejected gracefully", () => {
  test("version 999 returns defaults", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);
    raw.version = 999;
    delete raw.checksum;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toEqual([]);
    expect(loaded.playerStats.totalKills).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// PARTIAL / INVALID STATS VALIDATION
// ════════════════════════════════════════════════════════════════

describe("Scenario: Partially invalid stats fields fall back to defaults", () => {
  test("negative totalKills is reset to 0", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);

    raw.playerStats.totalKills = -5;
    delete raw.checksum;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.playerStats.totalKills).toBe(0);
    expect(loaded.playerStats.bossesDefeated).toBe(3);
  });

  test("NaN stat value falls back to default", async () => {
    await AchievementStorage.save([], sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);

    raw.playerStats.totalScore = "not-a-number";
    delete raw.checksum;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.playerStats.totalScore).toBe(0);
  });

  test("highestWeaponTier > 5 falls back to default", async () => {
    await AchievementStorage.save([], sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);

    raw.playerStats.highestWeaponTier = 6;
    delete raw.checksum;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.playerStats.highestWeaponTier).toBe(0);
  });

  test("missing playerStats object returns defaults", async () => {
    const raw = {
      version: 1,
      unlockedAchievements: [{ id: "first_blood", unlockedAt: 1700000000000 }],
    } as Record<string, unknown>;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toHaveLength(1);
    expect(loaded.playerStats.totalKills).toBe(0);
    expect(loaded.playerStats.weaponsOwned).toEqual(["machine-gun"]);
  });
});

// ════════════════════════════════════════════════════════════════
// INVALID ACHIEVEMENT ENTRIES
// ════════════════════════════════════════════════════════════════

describe("Scenario: Invalid achievement entries are filtered out", () => {
  test("entries with missing id are excluded", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);

    raw.unlockedAchievements.push({ unlockedAt: 123 });
    raw.unlockedAchievements.push({ id: "", unlockedAt: 456 });
    delete raw.checksum;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toHaveLength(2);
    expect(loaded.unlockedAchievements[0].id).toBe("first_blood");
    expect(loaded.unlockedAchievements[1].id).toBe("boss_slayer");
  });

  test("entries with missing unlockedAt are excluded", async () => {
    await AchievementStorage.save([], sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);

    raw.unlockedAchievements = [
      { id: "valid", unlockedAt: 1700000000000 },
      { id: "no_timestamp" },
    ];
    delete raw.checksum;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toHaveLength(1);
    expect(loaded.unlockedAchievements[0].id).toBe("valid");
  });

  test("null entries are excluded", async () => {
    await AchievementStorage.save([], sampleStats());
    const raw = JSON.parse(mockBackend.data["raptor_achievements"]);

    raw.unlockedAchievements = [null, { id: "valid", unlockedAt: 123 }, undefined];
    delete raw.checksum;
    const payload = JSON.stringify(raw);
    raw.checksum = fnv1aHash(payload);
    mockBackend.data["raptor_achievements"] = JSON.stringify(raw);

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════════
// PLAYERSTATS TRACKER SERIALIZE / DESERIALIZE
// ════════════════════════════════════════════════════════════════

describe("Scenario: PlayerStatsTracker.serialize() zeroes per-level fields", () => {
  test("serialize resets damageTakenThisLevel and lowestArmorSurvived", () => {
    const tracker = new PlayerStatsTracker();
    tracker.recordDamageTaken(50, 30);
    const stats = tracker.getStats();
    expect(stats.damageTakenThisLevel).toBe(50);
    expect(stats.lowestArmorSurvived).toBe(30);

    const serialized = tracker.serialize();
    expect(serialized.damageTakenThisLevel).toBe(0);
    expect(serialized.lowestArmorSurvived).toBe(100);
  });

  test("serialize preserves lifetime fields", () => {
    const tracker = new PlayerStatsTracker();
    for (let i = 0; i < 10; i++) tracker.recordKill("scout", 10, false);
    tracker.recordKill("boss", 400, true);
    tracker.recordLevelComplete(0, 90, 0);

    const serialized = tracker.serialize();
    expect(serialized.totalKills).toBe(11);
    expect(serialized.bossesDefeated).toBe(1);
    expect(serialized.levelsCompleted).toBe(1);
  });
});

describe("Scenario: PlayerStatsTracker.deserialize() restores lifetime fields", () => {
  test("deserialize merges saved stats into tracker", () => {
    const tracker = new PlayerStatsTracker();
    tracker.deserialize({
      totalKills: 200,
      bossesDefeated: 5,
      totalScore: 50000,
      weaponsOwned: ["machine-gun", "laser", "plasma"],
      highestWeaponTier: 3,
    });

    const stats = tracker.getStats();
    expect(stats.totalKills).toBe(200);
    expect(stats.bossesDefeated).toBe(5);
    expect(stats.totalScore).toBe(50000);
    expect(stats.weaponsOwned).toEqual(["machine-gun", "laser", "plasma"]);
    expect(stats.highestWeaponTier).toBe(3);
  });

  test("deserialize does not restore per-level fields", () => {
    const tracker = new PlayerStatsTracker();
    tracker.deserialize({
      totalKills: 100,
      damageTakenThisLevel: 999,
      lowestArmorSurvived: 5,
    } as PlayerStats);

    const stats = tracker.getStats();
    expect(stats.totalKills).toBe(100);
    expect(stats.damageTakenThisLevel).toBe(0);
    expect(stats.lowestArmorSurvived).toBe(100);
  });

  test("deserialize rejects invalid field values", () => {
    const tracker = new PlayerStatsTracker();
    tracker.deserialize({
      totalKills: -5,
      bossesDefeated: 1.5,
      totalScore: "not-a-number",
      highestWeaponTier: 6,
    } as unknown as PlayerStats);

    const stats = tracker.getStats();
    expect(stats.totalKills).toBe(0);
    expect(stats.bossesDefeated).toBe(0);
    expect(stats.totalScore).toBe(0);
    expect(stats.highestWeaponTier).toBe(0);
  });

  test("deserialize handles empty weaponsOwned array", () => {
    const tracker = new PlayerStatsTracker();
    tracker.deserialize({ weaponsOwned: [] } as unknown as PlayerStats);

    const stats = tracker.getStats();
    expect(stats.weaponsOwned).toEqual(["machine-gun"]);
  });

  test("deserialize validates killsByVariant entries", () => {
    const tracker = new PlayerStatsTracker();
    tracker.deserialize({
      killsByVariant: { scout: 10, fighter: -3, bomber: "invalid" },
    } as unknown as PlayerStats);

    const stats = tracker.getStats();
    expect(stats.killsByVariant).toEqual({ scout: 10 });
  });

  test("deserialize validates fastestLevelCompletionSeconds", () => {
    const tracker = new PlayerStatsTracker();
    tracker.deserialize({
      fastestLevelCompletionSeconds: { 0: 85.5, 1: -10, 2: 0 },
    } as unknown as PlayerStats);

    const stats = tracker.getStats();
    expect(stats.fastestLevelCompletionSeconds).toEqual({ 0: 85.5 });
  });
});

// ════════════════════════════════════════════════════════════════
// CLEAR TESTS
// ════════════════════════════════════════════════════════════════

describe("Scenario: Clear removes all persisted achievement data", () => {
  test("clear then load returns defaults", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());
    await AchievementStorage.clear();

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toEqual([]);
    expect(loaded.playerStats.totalKills).toBe(0);
  });

  test("storage key is removed after clear", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());
    expect(mockBackend.data["raptor_achievements"]).toBeDefined();

    await AchievementStorage.clear();
    expect(mockBackend.data["raptor_achievements"]).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════
// INTEGRATION: ONUNLOCK TRIGGERS SAVE
// ════════════════════════════════════════════════════════════════

describe("Scenario: Saving triggers when a new achievement is unlocked", () => {
  test("onUnlock callback can trigger AchievementStorage.save", async () => {
    const tracker = new PlayerStatsTracker();
    const manager = new AchievementManager(tracker);

    manager.onUnlock = () => {
      AchievementStorage.save(
        manager.getUnlocked(),
        tracker.serialize(),
      ).catch(console.error);
    };

    tracker.recordKill("scout", 10, false);
    manager.checkAchievements();

    await new Promise(r => setTimeout(r, 10));

    const raw = mockBackend.data["raptor_achievements"];
    expect(raw).toBeDefined();

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements.some(a => a.id === "first_blood")).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// GLOBAL STORAGE (NOT PER-SLOT)
// ════════════════════════════════════════════════════════════════

describe("Scenario: Achievement data is independent of save slots", () => {
  test("achievements use global key not tied to save slots", async () => {
    await AchievementStorage.save(sampleAchievements(), sampleStats());
    expect(mockBackend.data["raptor_achievements"]).toBeDefined();

    mockBackend.data["raptor_save_0"] = "{}";
    delete mockBackend.data["raptor_save_0"];

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════
// STORAGE FAILURE HANDLING
// ════════════════════════════════════════════════════════════════

describe("Scenario: Storage write failure does not crash", () => {
  test("save does not throw when backend fails", async () => {
    const failingBackend: StorageBackend = {
      async get(): Promise<string | null> { return null; },
      async set(): Promise<void> { throw new Error("storage full"); },
      async remove(): Promise<void> {},
    };
    setStorageBackend(failingBackend);

    await expect(
      AchievementStorage.save(sampleAchievements(), sampleStats())
    ).resolves.toBeUndefined();
  });

  test("load returns defaults when backend fails", async () => {
    const failingBackend: StorageBackend = {
      async get(): Promise<string | null> { throw new Error("read error"); },
      async set(): Promise<void> {},
      async remove(): Promise<void> {},
    };
    setStorageBackend(failingBackend);

    const loaded = await AchievementStorage.load();
    expect(loaded.unlockedAchievements).toEqual([]);
    expect(loaded.playerStats.totalKills).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// COMPLEX ROUND-TRIP FIDELITY
// ════════════════════════════════════════════════════════════════

describe("Scenario: Complex stats round-trip", () => {
  test("5 achievements and complex stats survive save/load", async () => {
    const achievements: UnlockedAchievement[] = [
      { id: "first_blood", unlockedAt: 1000 },
      { id: "boss_slayer", unlockedAt: 2000 },
      { id: "century_kills", unlockedAt: 3000 },
      { id: "high_scorer", unlockedAt: 4000 },
      { id: "dodge_master", unlockedAt: 5000 },
    ];

    const stats = sampleStats();
    await AchievementStorage.save(achievements, stats);
    const loaded = await AchievementStorage.load();

    expect(loaded.unlockedAchievements).toHaveLength(5);
    expect(loaded.unlockedAchievements).toEqual(achievements);
    expect(loaded.playerStats.totalKills).toBe(stats.totalKills);
    expect(loaded.playerStats.killsByVariant).toEqual(stats.killsByVariant);
    expect(loaded.playerStats.bossesDefeated).toBe(stats.bossesDefeated);
    expect(loaded.playerStats.ramKills).toBe(stats.ramKills);
    expect(loaded.playerStats.totalScore).toBe(stats.totalScore);
    expect(loaded.playerStats.levelsCompleted).toBe(stats.levelsCompleted);
    expect(loaded.playerStats.highestLevelCompleted).toBe(stats.highestLevelCompleted);
    expect(loaded.playerStats.totalDeaths).toBe(stats.totalDeaths);
    expect(loaded.playerStats.totalDodgesUsed).toBe(stats.totalDodgesUsed);
    expect(loaded.playerStats.totalEmpsUsed).toBe(stats.totalEmpsUsed);
    expect(loaded.playerStats.totalPowerUpsCollected).toBe(stats.totalPowerUpsCollected);
    expect(loaded.playerStats.powerUpsByType).toEqual(stats.powerUpsByType);
    expect(loaded.playerStats.weaponsOwned).toEqual(stats.weaponsOwned);
    expect(loaded.playerStats.highestWeaponTier).toBe(stats.highestWeaponTier);
    expect(loaded.playerStats.projectilesReflected).toBe(stats.projectilesReflected);
    expect(loaded.playerStats.totalPlayTimeSeconds).toBe(stats.totalPlayTimeSeconds);
    expect(loaded.playerStats.fastestLevelCompletionSeconds).toEqual(stats.fastestLevelCompletionSeconds);
  });
});

// ════════════════════════════════════════════════════════════════
// ACHIEVEMENT_SAVE_VERSION EXPORT
// ════════════════════════════════════════════════════════════════

describe("Scenario: ACHIEVEMENT_SAVE_VERSION is exported correctly", () => {
  test("ACHIEVEMENT_SAVE_VERSION is a number equal to 1", () => {
    expect(typeof ACHIEVEMENT_SAVE_VERSION).toBe("number");
    expect(ACHIEVEMENT_SAVE_VERSION).toBe(1);
  });
});
