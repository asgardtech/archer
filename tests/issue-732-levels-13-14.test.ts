import { LEVELS } from "../src/games/raptor/levels";
import {
  RaptorLevelConfig,
  EnemyVariant,
  BossType,
  WaveConfig,
  SpeakerType,
} from "../src/games/raptor/types";
import { getActForLevel } from "../src/games/raptor/story";

const VALID_ENEMY_VARIANTS: EnemyVariant[] = [
  "scout", "fighter", "bomber", "boss",
  "interceptor", "dart", "drone", "swarmer",
  "gunship", "cruiser", "destroyer", "juggernaut",
  "stealth", "minelayer",
  "phantom", "wraith", "locust", "splitter",
];

const VALID_FORMATIONS = ["line", "v", "random", "sweep"];
const VALID_SPEAKERS: SpeakerType[] = ["hq", "sensor", "wingman", "pilot"];

// ════════════════════════════════════════════════════════════════
// Feature: Level config structural integrity
// ════════════════════════════════════════════════════════════════

describe("Feature: Level config structural integrity", () => {
  describe("Scenario: All 20 levels have required fields", () => {
    test("LEVELS should have length 20", () => {
      expect(LEVELS.length).toBe(20);
    });

    test.each(LEVELS.map((l, i) => [i, l] as const))(
      "level at index %i should have all required fields",
      (_idx, level) => {
        expect(level.level).toBeDefined();
        expect(level.name).toBeDefined();
        expect(level.waves).toBeDefined();
        expect(Array.isArray(level.waves)).toBe(true);
        expect(level.bossEnabled).toBeDefined();
        expect(level.autoFireRate).toBeDefined();
        expect(level.powerUpDropChance).toBeDefined();
        expect(level.skyGradient).toBeDefined();
        expect(level.starDensity).toBeDefined();
        expect(level.enemyFireRateMultiplier).toBeDefined();
      }
    );
  });

  describe("Scenario: All wave configs in levels 13–14 are valid", () => {
    const newLevels = [LEVELS[12], LEVELS[13]];

    newLevels.forEach((level) => {
      describe(`Level ${level.level} — ${level.name}`, () => {
        test.each(level.waves.map((w, i) => [i, w] as const))(
          "wave %i should have a valid enemyVariant",
          (_idx, wave) => {
            expect(VALID_ENEMY_VARIANTS).toContain(wave.enemyVariant);
          }
        );

        test.each(level.waves.map((w, i) => [i, w] as const))(
          "wave %i should have count > 0",
          (_idx, wave) => {
            expect(wave.count).toBeGreaterThan(0);
          }
        );

        test.each(level.waves.map((w, i) => [i, w] as const))(
          "wave %i should have speed > 0",
          (_idx, wave) => {
            expect(wave.speed).toBeGreaterThan(0);
          }
        );

        test.each(level.waves.map((w, i) => [i, w] as const))(
          "wave %i with count > 1 should have spawnDelay > 0",
          (_idx, wave) => {
            if (wave.count > 1) {
              expect(wave.spawnDelay).toBeGreaterThan(0);
            }
          }
        );

        test.each(level.waves.map((w, i) => [i, w] as const))(
          "wave %i should have a valid formation",
          (_idx, wave) => {
            expect(VALID_FORMATIONS).toContain(wave.formation);
          }
        );
      });
    });
  });

  describe("Scenario: getActForLevel returns Act 2 for levels 13 and 14", () => {
    test("levelIndex 12 should return Act 2", () => {
      const act = getActForLevel(12);
      expect(act.act).toBe(2);
    });

    test("levelIndex 13 should return Act 2", () => {
      const act = getActForLevel(13);
      expect(act.act).toBe(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Level 13 — Nebula Passage
// ════════════════════════════════════════════════════════════════

describe("Feature: Level 13 — Nebula Passage", () => {
  const level13 = LEVELS[12];

  describe("Scenario: Level 13 exists in the LEVELS array", () => {
    test("LEVELS[12] should be defined", () => {
      expect(level13).toBeDefined();
    });

    test("LEVELS[12].level should equal 13", () => {
      expect(level13.level).toBe(13);
    });

    test('LEVELS[12].name should equal "Nebula Passage"', () => {
      expect(level13.name).toBe("Nebula Passage");
    });
  });

  describe("Scenario: Level 13 belongs to Act 2", () => {
    test("LEVELS[12].act should equal 2", () => {
      expect(level13.act).toBe(2);
    });
  });

  describe("Scenario: Level 13 has the nebula terrain theme", () => {
    test('terrain theme should equal "nebula"', () => {
      expect(level13.terrain!.theme).toBe("nebula");
    });

    test("terrain hasRoads should be false", () => {
      expect(level13.terrain!.hasRoads).toBe(false);
    });

    test("terrain hasWater should be false", () => {
      expect(level13.terrain!.hasWater).toBe(false);
    });

    test('structurePool should contain "struct_gas_pocket"', () => {
      expect(level13.terrain!.structurePool).toContain("struct_gas_pocket");
    });

    test('structurePool should contain "struct_sensor_buoy"', () => {
      expect(level13.terrain!.structurePool).toContain("struct_sensor_buoy");
    });

    test('structurePool should contain "struct_debris_cluster"', () => {
      expect(level13.terrain!.structurePool).toContain("struct_debris_cluster");
    });

    test("structurePool should have at least 3 entries", () => {
      expect(level13.terrain!.structurePool.length).toBeGreaterThanOrEqual(3);
    });

    test("propPool should have at least 3 entries", () => {
      expect(level13.terrain!.propPool.length).toBeGreaterThanOrEqual(3);
    });

    test("groundColor should be a valid hex color", () => {
      expect(level13.terrain!.groundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test("ambientParticles should be defined", () => {
      expect(level13.terrain!.ambientParticles).toBeDefined();
    });

    test("hazeColor should be defined", () => {
      expect(level13.terrain!.hazeColor).toBeDefined();
    });

    test("hazeOpacity should be greater than 0.15", () => {
      expect(level13.terrain!.hazeOpacity).toBeGreaterThan(0.15);
    });

    test("secondaryParticles should be defined", () => {
      expect(level13.terrain!.secondaryParticles).toBeDefined();
    });

    test("litStructures should be defined", () => {
      expect(level13.terrain!.litStructures).toBeDefined();
      expect(level13.terrain!.litStructures!.length).toBeGreaterThan(0);
    });
  });

  describe("Scenario: Level 13 sky conveys nebula atmosphere", () => {
    test('skyGradient should be ["#0a0520", "#1a0a30"]', () => {
      expect(level13.skyGradient).toEqual(["#0a0520", "#1a0a30"]);
    });

    test("starDensity should equal 15", () => {
      expect(level13.starDensity).toBe(15);
    });
  });

  describe("Scenario: Level 13 has 14–18 waves", () => {
    test("waves.length should be between 14 and 18 inclusive", () => {
      expect(level13.waves.length).toBeGreaterThanOrEqual(14);
      expect(level13.waves.length).toBeLessThanOrEqual(18);
    });
  });

  describe("Scenario: Level 13 uses stealth enemies thematically", () => {
    test('at least 2 waves should have enemyVariant "stealth"', () => {
      const stealthCount = level13.waves.filter((w) => w.enemyVariant === "stealth").length;
      expect(stealthCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Scenario: Level 13 has a destroyer checkpoint wave", () => {
    test('at least 1 wave should have enemyVariant "destroyer"', () => {
      expect(level13.waves.some((w) => w.enemyVariant === "destroyer")).toBe(true);
    });
  });

  describe("Scenario: Level 13 enemy fire rate multiplier is approximately 1.8", () => {
    test("enemyFireRateMultiplier should be close to 1.8", () => {
      expect(level13.enemyFireRateMultiplier).toBeCloseTo(1.8, 1);
    });

    test("enemyFireRateMultiplier should be greater than L12", () => {
      expect(level13.enemyFireRateMultiplier).toBeGreaterThan(LEVELS[11].enemyFireRateMultiplier);
    });

    test("enemyFireRateMultiplier should be less than Act 1 finale (L10)", () => {
      expect(level13.enemyFireRateMultiplier).toBeLessThan(LEVELS[9].enemyFireRateMultiplier);
    });
  });

  describe("Scenario: Level 13 has a gunship_commander boss", () => {
    test("bossEnabled should be true", () => {
      expect(level13.bossEnabled).toBe(true);
    });

    test("bossConfig should be defined", () => {
      expect(level13.bossConfig).toBeDefined();
    });

    test('bossConfig.bossType should equal "gunship_commander"', () => {
      expect(level13.bossConfig!.bossType).toBe("gunship_commander");
    });

    test("bossConfig.hitPoints should equal 180", () => {
      expect(level13.bossConfig!.hitPoints).toBe(180);
    });

    test("bossConfig.speed should equal 50", () => {
      expect(level13.bossConfig!.speed).toBe(50);
    });

    test("bossConfig.fireRate should be close to 1.6", () => {
      expect(level13.bossConfig!.fireRate).toBeCloseTo(1.6, 1);
    });

    test("bossConfig.scoreValue should equal 1200", () => {
      expect(level13.bossConfig!.scoreValue).toBe(1200);
    });

    test('bossConfig.weaponType should equal "spread"', () => {
      expect(level13.bossConfig!.weaponType).toBe("spread");
    });

    test("bossConfig.appearsAfterWave should be less than waves.length", () => {
      expect(level13.bossConfig!.appearsAfterWave).toBeLessThan(level13.waves.length);
    });
  });

  describe("Scenario: Level 13 boss HP is within Act 2 progression", () => {
    test("boss HP should be greater than L12 boss HP", () => {
      expect(level13.bossConfig!.hitPoints).toBeGreaterThan(LEVELS[11].bossConfig!.hitPoints);
    });

    test("boss HP should be less than Act 1 finale (L10) boss HP", () => {
      expect(level13.bossConfig!.hitPoints).toBeLessThan(LEVELS[9].bossConfig!.hitPoints);
    });
  });

  describe("Scenario: Level 13 has story content", () => {
    test("story should be defined", () => {
      expect(level13.story).toBeDefined();
    });

    test('briefing should contain "nebula" (case-insensitive)', () => {
      expect(level13.story!.briefing.toLowerCase()).toContain("nebula");
    });

    test('completionText should contain "jungle" (case-insensitive)', () => {
      expect(level13.story!.completionText.toLowerCase()).toContain("jungle");
    });
  });

  describe("Scenario: Level 13 has at least 4 in-game messages", () => {
    test("inGameMessages.length should be >= 4", () => {
      expect(level13.story!.inGameMessages!.length).toBeGreaterThanOrEqual(4);
    });

    test("each message should have a triggerTime > 0", () => {
      for (const msg of level13.story!.inGameMessages!) {
        expect(msg.triggerTime).toBeGreaterThan(0);
      }
    });

    test("each message should have a non-empty text", () => {
      for (const msg of level13.story!.inGameMessages!) {
        expect(msg.text.length).toBeGreaterThan(0);
      }
    });

    test("each message should have a valid speaker", () => {
      for (const msg of level13.story!.inGameMessages!) {
        expect(VALID_SPEAKERS).toContain(msg.speaker);
      }
    });
  });

  describe("Scenario: Level 13 has appropriate weapon drops", () => {
    test("weaponDrops should be defined", () => {
      expect(level13.weaponDrops).toBeDefined();
    });

    test("weaponDrops should contain at least 2 weapon types", () => {
      expect(level13.weaponDrops!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Scenario: Level 13 boss warns with a story message", () => {
    test('at least one message text should reference "gunship" (case-insensitive)', () => {
      const messages = level13.story!.inGameMessages!;
      const hasGunship = messages.some((m) =>
        m.text.toLowerCase().includes("gunship")
      );
      expect(hasGunship).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Level 14 — Alien Jungle
// ════════════════════════════════════════════════════════════════

describe("Feature: Level 14 — Alien Jungle", () => {
  const level14 = LEVELS[13];

  describe("Scenario: Level 14 exists in the LEVELS array", () => {
    test("LEVELS[13] should be defined", () => {
      expect(level14).toBeDefined();
    });

    test("LEVELS[13].level should equal 14", () => {
      expect(level14.level).toBe(14);
    });

    test('LEVELS[13].name should equal "Alien Jungle"', () => {
      expect(level14.name).toBe("Alien Jungle");
    });
  });

  describe("Scenario: Level 14 belongs to Act 2", () => {
    test("LEVELS[13].act should equal 2", () => {
      expect(level14.act).toBe(2);
    });
  });

  describe("Scenario: Level 14 has the jungle terrain theme", () => {
    test('terrain theme should equal "jungle"', () => {
      expect(level14.terrain!.theme).toBe("jungle");
    });

    test("terrain hasRoads should be false", () => {
      expect(level14.terrain!.hasRoads).toBe(false);
    });

    test("terrain hasWater should be true", () => {
      expect(level14.terrain!.hasWater).toBe(true);
    });

    test('structurePool should contain "struct_giant_fern"', () => {
      expect(level14.terrain!.structurePool).toContain("struct_giant_fern");
    });

    test('structurePool should contain "struct_hive_mound"', () => {
      expect(level14.terrain!.structurePool).toContain("struct_hive_mound");
    });

    test('structurePool should contain "struct_spore_tower"', () => {
      expect(level14.terrain!.structurePool).toContain("struct_spore_tower");
    });

    test('structurePool should contain "struct_vine_arch"', () => {
      expect(level14.terrain!.structurePool).toContain("struct_vine_arch");
    });

    test("structurePool should have at least 4 entries", () => {
      expect(level14.terrain!.structurePool.length).toBeGreaterThanOrEqual(4);
    });

    test("propPool should have at least 4 entries", () => {
      expect(level14.terrain!.propPool.length).toBeGreaterThanOrEqual(4);
    });

    test("groundColor should be a valid hex color with green tones", () => {
      const hex = level14.terrain!.groundColor;
      expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      const g = parseInt(hex.substring(3, 5), 16);
      const r = parseInt(hex.substring(1, 3), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      expect(g).toBeGreaterThan(r);
      expect(g).toBeGreaterThan(b);
    });

    test("ambientParticles should be defined", () => {
      expect(level14.terrain!.ambientParticles).toBeDefined();
    });

    test("secondaryParticles should be defined", () => {
      expect(level14.terrain!.secondaryParticles).toBeDefined();
    });

    test("litStructures should be defined", () => {
      expect(level14.terrain!.litStructures).toBeDefined();
      expect(level14.terrain!.litStructures!.length).toBeGreaterThan(0);
    });
  });

  describe("Scenario: Level 14 sky has alien green tones", () => {
    test('skyGradient should be ["#2a4a1a", "#4a6a2a"]', () => {
      expect(level14.skyGradient).toEqual(["#2a4a1a", "#4a6a2a"]);
    });

    test("starDensity should equal 0", () => {
      expect(level14.starDensity).toBe(0);
    });
  });

  describe("Scenario: Level 14 has 14–18 waves", () => {
    test("waves.length should be between 14 and 18 inclusive", () => {
      expect(level14.waves.length).toBeGreaterThanOrEqual(14);
      expect(level14.waves.length).toBeLessThanOrEqual(18);
    });
  });

  describe("Scenario: Level 14 emphasizes bombers and gunships", () => {
    test('combined bomber and gunship wave count should be at least 4', () => {
      const count = level14.waves.filter(
        (w) => w.enemyVariant === "bomber" || w.enemyVariant === "gunship"
      ).length;
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Scenario: Level 14 has swarmer ambush waves", () => {
    test('at least 2 waves should have enemyVariant "swarmer"', () => {
      const swarmerCount = level14.waves.filter((w) => w.enemyVariant === "swarmer").length;
      expect(swarmerCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Scenario: Level 14 enemy fire rate multiplier is approximately 1.9", () => {
    test("enemyFireRateMultiplier should be close to 1.9", () => {
      expect(level14.enemyFireRateMultiplier).toBeCloseTo(1.9, 1);
    });

    test("enemyFireRateMultiplier should be greater than L13", () => {
      expect(level14.enemyFireRateMultiplier).toBeGreaterThan(LEVELS[12].enemyFireRateMultiplier);
    });

    test("enemyFireRateMultiplier should be less than Act 1 finale (L10)", () => {
      expect(level14.enemyFireRateMultiplier).toBeLessThan(LEVELS[9].enemyFireRateMultiplier);
    });
  });

  describe("Scenario: Level 14 has a swarm_queen boss", () => {
    test("bossEnabled should be true", () => {
      expect(level14.bossEnabled).toBe(true);
    });

    test("bossConfig should be defined", () => {
      expect(level14.bossConfig).toBeDefined();
    });

    test('bossConfig.bossType should equal "swarm_queen"', () => {
      expect(level14.bossConfig!.bossType).toBe("swarm_queen");
    });

    test("bossConfig.hitPoints should equal 200", () => {
      expect(level14.bossConfig!.hitPoints).toBe(200);
    });

    test("bossConfig.speed should equal 30", () => {
      expect(level14.bossConfig!.speed).toBe(30);
    });

    test("bossConfig.fireRate should be close to 1.8", () => {
      expect(level14.bossConfig!.fireRate).toBeCloseTo(1.8, 1);
    });

    test("bossConfig.scoreValue should equal 1400", () => {
      expect(level14.bossConfig!.scoreValue).toBe(1400);
    });

    test('bossConfig.weaponType should equal "spread"', () => {
      expect(level14.bossConfig!.weaponType).toBe("spread");
    });

    test("bossConfig.appearsAfterWave should be less than waves.length", () => {
      expect(level14.bossConfig!.appearsAfterWave).toBeLessThan(level14.waves.length);
    });
  });

  describe("Scenario: Level 14 boss uses a different type than Level 13", () => {
    test("L14 boss type should differ from L13 boss type", () => {
      expect(LEVELS[13].bossConfig!.bossType).not.toBe(LEVELS[12].bossConfig!.bossType);
    });
  });

  describe("Scenario: Level 14 boss HP continues Act 2 progression", () => {
    test("boss HP should be greater than L13 boss HP", () => {
      expect(level14.bossConfig!.hitPoints).toBeGreaterThan(LEVELS[12].bossConfig!.hitPoints);
    });

    test("boss HP should be less than Act 1 finale (L10) boss HP", () => {
      expect(level14.bossConfig!.hitPoints).toBeLessThan(LEVELS[9].bossConfig!.hitPoints);
    });
  });

  describe("Scenario: Level 14 has new biological enemy types", () => {
    test('at least one wave should have enemyVariant "locust"', () => {
      expect(level14.waves.some((w) => w.enemyVariant === "locust")).toBe(true);
    });

    test('at least one wave should have enemyVariant "splitter"', () => {
      expect(level14.waves.some((w) => w.enemyVariant === "splitter")).toBe(true);
    });
  });

  describe("Scenario: Level 14 has story content", () => {
    test("story should be defined", () => {
      expect(level14.story).toBeDefined();
    });

    test('briefing should contain "jungle" (case-insensitive)', () => {
      expect(level14.story!.briefing.toLowerCase()).toContain("jungle");
    });

    test('completionText should contain "volcanic" (case-insensitive)', () => {
      expect(level14.story!.completionText.toLowerCase()).toContain("volcanic");
    });
  });

  describe("Scenario: Level 14 has at least 4 in-game messages", () => {
    test("inGameMessages.length should be >= 4", () => {
      expect(level14.story!.inGameMessages!.length).toBeGreaterThanOrEqual(4);
    });

    test("each message should have a triggerTime > 0", () => {
      for (const msg of level14.story!.inGameMessages!) {
        expect(msg.triggerTime).toBeGreaterThan(0);
      }
    });

    test("each message should have a non-empty text", () => {
      for (const msg of level14.story!.inGameMessages!) {
        expect(msg.text.length).toBeGreaterThan(0);
      }
    });

    test("each message should have a valid speaker", () => {
      for (const msg of level14.story!.inGameMessages!) {
        expect(VALID_SPEAKERS).toContain(msg.speaker);
      }
    });
  });

  describe("Scenario: Level 14 in-game messages reference alien terrain", () => {
    test("at least one message should reference alien, bio, organic, or hive themes", () => {
      const messages = level14.story!.inGameMessages!;
      const hasAlienRef = messages.some((m) => {
        const lower = m.text.toLowerCase();
        return lower.includes("alien") || lower.includes("bio") ||
               lower.includes("organic") || lower.includes("hive");
      });
      expect(hasAlienRef).toBe(true);
    });
  });

  describe("Scenario: Level 14 has appropriate weapon drops", () => {
    test("weaponDrops should be defined", () => {
      expect(level14.weaponDrops).toBeDefined();
    });

    test("weaponDrops should contain at least 2 weapon types", () => {
      expect(level14.weaponDrops!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Scenario: Level 14 boss warns with a story message", () => {
    test('at least one message text should reference "carrier" (case-insensitive)', () => {
      const messages = level14.story!.inGameMessages!;
      const hasCarrier = messages.some((m) =>
        m.text.toLowerCase().includes("carrier")
      );
      expect(hasCarrier).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Act 2 difficulty scaling (levels 13–14)
// ════════════════════════════════════════════════════════════════

describe("Feature: Act 2 difficulty scaling (levels 13–14)", () => {
  describe("Scenario: Act 2 boss HP scales within Act 2 and below Act 1 finale", () => {
    test("L13 boss HP > L12 boss HP", () => {
      expect(LEVELS[12].bossConfig!.hitPoints).toBeGreaterThan(
        LEVELS[11].bossConfig!.hitPoints
      );
    });

    test("L14 boss HP > L13 boss HP", () => {
      expect(LEVELS[13].bossConfig!.hitPoints).toBeGreaterThan(
        LEVELS[12].bossConfig!.hitPoints
      );
    });

    test("L13 boss HP < L10 boss HP (Act 1 finale)", () => {
      expect(LEVELS[12].bossConfig!.hitPoints).toBeLessThan(
        LEVELS[9].bossConfig!.hitPoints
      );
    });

    test("L14 boss HP < L10 boss HP (Act 1 finale)", () => {
      expect(LEVELS[13].bossConfig!.hitPoints).toBeLessThan(
        LEVELS[9].bossConfig!.hitPoints
      );
    });
  });

  describe("Scenario: Act 2 wave counts scale within Act 2", () => {
    test("L13 waves >= L12 waves", () => {
      expect(LEVELS[12].waves.length).toBeGreaterThanOrEqual(
        LEVELS[11].waves.length
      );
    });

    test("L14 waves >= L13 waves", () => {
      expect(LEVELS[13].waves.length).toBeGreaterThanOrEqual(
        LEVELS[12].waves.length
      );
    });
  });

  describe("Scenario: Act 2 enemy fire rate scales within Act 2 and below Act 1 finale", () => {
    test("L13 fire rate > L12 fire rate", () => {
      expect(LEVELS[12].enemyFireRateMultiplier).toBeGreaterThan(
        LEVELS[11].enemyFireRateMultiplier
      );
    });

    test("L14 fire rate > L13 fire rate", () => {
      expect(LEVELS[13].enemyFireRateMultiplier).toBeGreaterThan(
        LEVELS[12].enemyFireRateMultiplier
      );
    });

    test("L13 fire rate < L10 fire rate (Act 1 finale)", () => {
      expect(LEVELS[12].enemyFireRateMultiplier).toBeLessThan(
        LEVELS[9].enemyFireRateMultiplier
      );
    });

    test("L14 fire rate < L10 fire rate (Act 1 finale)", () => {
      expect(LEVELS[13].enemyFireRateMultiplier).toBeLessThan(
        LEVELS[9].enemyFireRateMultiplier
      );
    });
  });

  describe("Scenario: Boss types are consistent with weapon profiles", () => {
    test('gunship_commander boss should have weaponType "spread"', () => {
      const gunshipLevels = LEVELS.filter(
        (l) => l.bossConfig?.bossType === "gunship_commander"
      );
      for (const level of gunshipLevels) {
        expect(level.bossConfig!.weaponType).toBe("spread");
      }
    });

    test('carrier boss should have weaponType "standard"', () => {
      const carrierLevels = LEVELS.filter(
        (l) => l.bossConfig?.bossType === "carrier"
      );
      for (const level of carrierLevels) {
        expect(level.bossConfig!.weaponType).toBe("standard");
      }
    });

    test('swarm_queen boss should have weaponType "spread"', () => {
      const swarmQueenLevels = LEVELS.filter(
        (l) => l.bossConfig?.bossType === "swarm_queen"
      );
      for (const level of swarmQueenLevels) {
        expect(level.bossConfig!.weaponType).toBe("spread");
      }
    });
  });

  describe("Scenario: No boss type is used more than 5 times across all levels", () => {
    test("no boss type should appear more than 5 times", () => {
      const counts = new Map<string, number>();
      for (const level of LEVELS) {
        if (level.bossConfig?.bossType) {
          const t = level.bossConfig.bossType;
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
      for (const [type, count] of counts) {
        expect(count).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("Scenario: Monotonic scaling within Act 2", () => {
    test("wave count should increase monotonically within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2);
      for (let i = 1; i < act2.length; i++) {
        expect(act2[i].waves.length).toBeGreaterThanOrEqual(
          act2[i - 1].waves.length
        );
      }
    });

    test("enemyFireRateMultiplier should increase monotonically within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2);
      for (let i = 1; i < act2.length; i++) {
        expect(act2[i].enemyFireRateMultiplier).toBeGreaterThanOrEqual(
          act2[i - 1].enemyFireRateMultiplier
        );
      }
    });

    test("boss HP should generally increase within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2 && l.bossEnabled && l.bossConfig);
      const lastBoss = act2[act2.length - 1];
      const firstBoss = act2[0];
      expect(lastBoss.bossConfig!.hitPoints).toBeGreaterThan(firstBoss.bossConfig!.hitPoints);
    });

    test("boss fireRate should generally increase within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2 && l.bossEnabled && l.bossConfig);
      const lastBoss = act2[act2.length - 1];
      const firstBoss = act2[0];
      expect(lastBoss.bossConfig!.fireRate).toBeGreaterThan(firstBoss.bossConfig!.fireRate);
    });

    test("boss scoreValue should increase monotonically within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2 && l.bossEnabled && l.bossConfig);
      for (let i = 1; i < act2.length; i++) {
        expect(act2[i].bossConfig!.scoreValue).toBeGreaterThanOrEqual(
          act2[i - 1].bossConfig!.scoreValue
        );
      }
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Cross-level validation
// ════════════════════════════════════════════════════════════════

describe("Feature: Cross-level validation for levels 13–14", () => {
  describe("Scenario: LEVELS array has 20 entries", () => {
    test("LEVELS should have length 20", () => {
      expect(LEVELS.length).toBe(20);
    });
  });

  describe("Scenario: Level numbers are sequential", () => {
    test("LEVELS[i].level should equal i + 1 for all i from 0 to 19", () => {
      for (let i = 0; i < 20; i++) {
        expect(LEVELS[i].level).toBe(i + 1);
      }
    });
  });

  describe("Scenario: Story threads connect logically", () => {
    test('L12 completionText should reference "nebula"', () => {
      expect(LEVELS[11].story!.completionText.toLowerCase()).toContain("nebula");
    });

    test('L13 completionText should reference "jungle"', () => {
      expect(LEVELS[12].story!.completionText.toLowerCase()).toContain("jungle");
    });

    test('L14 completionText should reference "volcanic" or "volcano"', () => {
      const text = LEVELS[13].story!.completionText.toLowerCase();
      expect(text.includes("volcanic") || text.includes("volcano")).toBe(true);
    });
  });

  describe("Scenario: Boss appearsAfterWave is valid for new levels", () => {
    test("Level 13 boss appearsAfterWave is less than total wave count", () => {
      expect(LEVELS[12].bossConfig!.appearsAfterWave).toBeLessThan(
        LEVELS[12].waves.length
      );
    });

    test("Level 14 boss appearsAfterWave is less than total wave count", () => {
      expect(LEVELS[13].bossConfig!.appearsAfterWave).toBeLessThan(
        LEVELS[13].waves.length
      );
    });
  });

  describe("Scenario: Both levels include level names", () => {
    test('level names should include "Nebula Passage" and "Alien Jungle"', () => {
      const names = LEVELS.map((l) => l.name);
      expect(names).toContain("Nebula Passage");
      expect(names).toContain("Alien Jungle");
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Wave speed ranges match spec
// ════════════════════════════════════════════════════════════════

describe("Feature: Wave speed ranges match spec (levels 13–14)", () => {
  test("Level 13 wave speeds should be in the 50–250 range", () => {
    for (const wave of LEVELS[12].waves) {
      expect(wave.speed).toBeGreaterThanOrEqual(50);
      expect(wave.speed).toBeLessThanOrEqual(250);
    }
  });

  test("Level 14 wave speeds should be in the 100–250 range", () => {
    for (const wave of LEVELS[13].waves) {
      expect(wave.speed).toBeGreaterThanOrEqual(100);
      expect(wave.speed).toBeLessThanOrEqual(250);
    }
  });
});
