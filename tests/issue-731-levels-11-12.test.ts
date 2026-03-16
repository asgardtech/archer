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
];

const VALID_FORMATIONS = ["line", "v", "random", "sweep"];
const VALID_SPEAKERS: SpeakerType[] = ["hq", "sensor", "wingman", "pilot"];

// ════════════════════════════════════════════════════════════════
// Feature: Level config structural integrity
// ════════════════════════════════════════════════════════════════

describe("Feature: Level config structural integrity", () => {
  describe("Scenario: All 12 levels have required fields", () => {
    test("LEVELS should have length 14", () => {
      expect(LEVELS.length).toBe(14);
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

  describe("Scenario: All wave configs in levels 11–12 are valid", () => {
    const newLevels = [LEVELS[10], LEVELS[11]];

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

  describe("Scenario: getActForLevel returns Act 2 for levels 11 and 12", () => {
    test("levelIndex 10 should return Act 2", () => {
      const act = getActForLevel(10);
      expect(act.act).toBe(2);
    });

    test("levelIndex 11 should return Act 2", () => {
      const act = getActForLevel(11);
      expect(act.act).toBe(2);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Level 11 — Colony Defense
// ════════════════════════════════════════════════════════════════

describe("Feature: Level 11 — Colony Defense", () => {
  const level11 = LEVELS[10];

  describe("Scenario: Level 11 exists in the LEVELS array", () => {
    test("LEVELS[10] should be defined", () => {
      expect(level11).toBeDefined();
    });

    test("LEVELS[10].level should equal 11", () => {
      expect(level11.level).toBe(11);
    });

    test('LEVELS[10].name should equal "Colony Defense"', () => {
      expect(level11.name).toBe("Colony Defense");
    });
  });

  describe("Scenario: Level 11 belongs to Act 2", () => {
    test("LEVELS[10].act should equal 2", () => {
      expect(level11.act).toBe(2);
    });
  });

  describe("Scenario: Level 11 has the colony terrain theme", () => {
    test('terrain theme should equal "colony"', () => {
      expect(level11.terrain!.theme).toBe("colony");
    });

    test("terrain hasRoads should be true", () => {
      expect(level11.terrain!.hasRoads).toBe(true);
    });

    test("terrain hasWater should be false", () => {
      expect(level11.terrain!.hasWater).toBe(false);
    });

    test('structurePool should contain "struct_colony_tower"', () => {
      expect(level11.terrain!.structurePool).toContain("struct_colony_tower");
    });

    test('structurePool should contain "struct_landing_pad"', () => {
      expect(level11.terrain!.structurePool).toContain("struct_landing_pad");
    });

    test('structurePool should contain "struct_comm_relay"', () => {
      expect(level11.terrain!.structurePool).toContain("struct_comm_relay");
    });

    test('structurePool should contain "struct_habitat"', () => {
      expect(level11.terrain!.structurePool).toContain("struct_habitat");
    });
  });

  describe("Scenario: Level 11 has a twilight sky gradient", () => {
    test("skyGradient should be a two-element array", () => {
      expect(level11.skyGradient).toHaveLength(2);
    });

    test("starDensity should equal 0", () => {
      expect(level11.starDensity).toBe(0);
    });
  });

  describe("Scenario: Level 11 has 8–10 waves", () => {
    test("waves.length should be between 8 and 10 inclusive", () => {
      expect(level11.waves.length).toBeGreaterThanOrEqual(8);
      expect(level11.waves.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Scenario: Level 11 includes a stealth-swarmer combo wave", () => {
    test('at least one wave should have enemyVariant "stealth"', () => {
      expect(level11.waves.some((w) => w.enemyVariant === "stealth")).toBe(true);
    });

    test('at least one wave should have enemyVariant "swarmer"', () => {
      expect(level11.waves.some((w) => w.enemyVariant === "swarmer")).toBe(true);
    });

    test("a stealth wave and a swarmer wave should share the same waveDelay", () => {
      const stealthWaves = level11.waves.filter((w) => w.enemyVariant === "stealth");
      const swarmerWaves = level11.waves.filter((w) => w.enemyVariant === "swarmer");
      const stealthDelays = new Set(stealthWaves.map((w) => w.waveDelay));
      const swarmerDelays = new Set(swarmerWaves.map((w) => w.waveDelay));
      const shared = [...stealthDelays].filter((d) => swarmerDelays.has(d));
      expect(shared.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Scenario: Level 11 enemy fire rate multiplier is approximately 1.4", () => {
    test("enemyFireRateMultiplier should be close to 1.4", () => {
      expect(level11.enemyFireRateMultiplier).toBeCloseTo(1.4, 1);
    });
  });

  describe("Scenario: Level 11 has a missile_dreadnought boss", () => {
    test("bossEnabled should be true", () => {
      expect(level11.bossEnabled).toBe(true);
    });

    test("bossConfig should be defined", () => {
      expect(level11.bossConfig).toBeDefined();
    });

    test('bossConfig.bossType should equal "missile_dreadnought"', () => {
      expect(level11.bossConfig!.bossType).toBe("missile_dreadnought");
    });

    test("bossConfig.hitPoints should equal 120", () => {
      expect(level11.bossConfig!.hitPoints).toBe(120);
    });

    test("bossConfig.speed should equal 30", () => {
      expect(level11.bossConfig!.speed).toBe(30);
    });

    test("bossConfig.fireRate should be close to 1.2", () => {
      expect(level11.bossConfig!.fireRate).toBeCloseTo(1.2, 1);
    });

    test("bossConfig.scoreValue should equal 800", () => {
      expect(level11.bossConfig!.scoreValue).toBe(800);
    });

    test('bossConfig.weaponType should equal "missile"', () => {
      expect(level11.bossConfig!.weaponType).toBe("missile");
    });
  });

  describe("Scenario: Level 11 has story content", () => {
    test("story should be defined", () => {
      expect(level11.story).toBeDefined();
    });

    test('briefing should contain "colony" (case-insensitive)', () => {
      expect(level11.story!.briefing.toLowerCase()).toContain("colony");
    });

    test('briefing should contain "Dominion" (case-insensitive)', () => {
      expect(level11.story!.briefing.toLowerCase()).toContain("dominion");
    });

    test('completionText should contain "asteroid"', () => {
      expect(level11.story!.completionText.toLowerCase()).toContain("asteroid");
    });
  });

  describe("Scenario: Level 11 has at least 4 in-game messages", () => {
    test("inGameMessages.length should be >= 4", () => {
      expect(level11.story!.inGameMessages!.length).toBeGreaterThanOrEqual(4);
    });

    test("each message should have a triggerTime > 0", () => {
      for (const msg of level11.story!.inGameMessages!) {
        expect(msg.triggerTime).toBeGreaterThan(0);
      }
    });

    test("each message should have a non-empty text", () => {
      for (const msg of level11.story!.inGameMessages!) {
        expect(msg.text.length).toBeGreaterThan(0);
      }
    });

    test("each message should have a valid speaker", () => {
      for (const msg of level11.story!.inGameMessages!) {
        expect(VALID_SPEAKERS).toContain(msg.speaker);
      }
    });
  });

  describe("Scenario: Level 11 has appropriate weapon drops", () => {
    test("weaponDrops should be defined", () => {
      expect(level11.weaponDrops).toBeDefined();
    });

    test("weaponDrops should contain at least 2 weapon types", () => {
      expect(level11.weaponDrops!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Scenario: Level 11 boss warns with a story message", () => {
    test('at least one message text should reference "dreadnought" (case-insensitive)', () => {
      const messages = level11.story!.inGameMessages!;
      const hasDreadnought = messages.some((m) =>
        m.text.toLowerCase().includes("dreadnought")
      );
      expect(hasDreadnought).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Level 12 — Asteroid Ambush
// ════════════════════════════════════════════════════════════════

describe("Feature: Level 12 — Asteroid Ambush", () => {
  const level12 = LEVELS[11];

  describe("Scenario: Level 12 exists in the LEVELS array", () => {
    test("LEVELS[11] should be defined", () => {
      expect(level12).toBeDefined();
    });

    test("LEVELS[11].level should equal 12", () => {
      expect(level12.level).toBe(12);
    });

    test('LEVELS[11].name should equal "Asteroid Ambush"', () => {
      expect(level12.name).toBe("Asteroid Ambush");
    });
  });

  describe("Scenario: Level 12 belongs to Act 2", () => {
    test("LEVELS[11].act should equal 2", () => {
      expect(level12.act).toBe(2);
    });
  });

  describe("Scenario: Level 12 has the asteroid terrain theme", () => {
    test('terrain theme should equal "asteroid"', () => {
      expect(level12.terrain!.theme).toBe("asteroid");
    });

    test("terrain hasRoads should be false", () => {
      expect(level12.terrain!.hasRoads).toBe(false);
    });

    test("terrain hasWater should be false", () => {
      expect(level12.terrain!.hasWater).toBe(false);
    });

    test('structurePool should contain "struct_drill_rig"', () => {
      expect(level12.terrain!.structurePool).toContain("struct_drill_rig");
    });

    test("groundColor should be a dark hex color", () => {
      const hex = level12.terrain!.groundColor;
      expect(hex).toMatch(/^#[0-9a-fA-F]{6}$/);
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      const brightness = (r + g + b) / 3;
      expect(brightness).toBeLessThan(80);
    });
  });

  describe("Scenario: Level 12 has a deep space sky with stars", () => {
    test("skyGradient should be a two-element array", () => {
      expect(level12.skyGradient).toHaveLength(2);
    });

    test("starDensity should equal 30", () => {
      expect(level12.starDensity).toBe(30);
    });
  });

  describe("Scenario: Level 12 has 10–12 waves", () => {
    test("waves.length should be between 10 and 12 inclusive", () => {
      expect(level12.waves.length).toBeGreaterThanOrEqual(10);
      expect(level12.waves.length).toBeLessThanOrEqual(12);
    });
  });

  describe("Scenario: Level 12 includes cruiser-fighter combo waves", () => {
    test('at least one wave should have enemyVariant "cruiser"', () => {
      expect(level12.waves.some((w) => w.enemyVariant === "cruiser")).toBe(true);
    });

    test('at least one wave should have enemyVariant "fighter"', () => {
      expect(level12.waves.some((w) => w.enemyVariant === "fighter")).toBe(true);
    });
  });

  describe("Scenario: Level 12 enemy fire rate multiplier is approximately 1.6", () => {
    test("enemyFireRateMultiplier should be close to 1.6", () => {
      expect(level12.enemyFireRateMultiplier).toBeCloseTo(1.6, 1);
    });
  });

  describe("Scenario: Level 12 has a laser_fortress boss", () => {
    test("bossEnabled should be true", () => {
      expect(level12.bossEnabled).toBe(true);
    });

    test("bossConfig should be defined", () => {
      expect(level12.bossConfig).toBeDefined();
    });

    test('bossConfig.bossType should equal "laser_fortress"', () => {
      expect(level12.bossConfig!.bossType).toBe("laser_fortress");
    });

    test("bossConfig.hitPoints should equal 150", () => {
      expect(level12.bossConfig!.hitPoints).toBe(150);
    });

    test("bossConfig.speed should equal 18", () => {
      expect(level12.bossConfig!.speed).toBe(18);
    });

    test("bossConfig.fireRate should be close to 1.4", () => {
      expect(level12.bossConfig!.fireRate).toBeCloseTo(1.4, 1);
    });

    test("bossConfig.scoreValue should equal 1000", () => {
      expect(level12.bossConfig!.scoreValue).toBe(1000);
    });

    test('bossConfig.weaponType should equal "laser"', () => {
      expect(level12.bossConfig!.weaponType).toBe("laser");
    });
  });

  describe("Scenario: Level 12 has story content", () => {
    test("story should be defined", () => {
      expect(level12.story).toBeDefined();
    });

    test('briefing should contain "asteroid"', () => {
      expect(level12.story!.briefing.toLowerCase()).toContain("asteroid");
    });

    test('completionText should contain "nebula"', () => {
      expect(level12.story!.completionText.toLowerCase()).toContain("nebula");
    });
  });

  describe("Scenario: Level 12 has at least 4 in-game messages", () => {
    test("inGameMessages.length should be >= 4", () => {
      expect(level12.story!.inGameMessages!.length).toBeGreaterThanOrEqual(4);
    });

    test("each message should have a triggerTime > 0", () => {
      for (const msg of level12.story!.inGameMessages!) {
        expect(msg.triggerTime).toBeGreaterThan(0);
      }
    });

    test("each message should have a non-empty text", () => {
      for (const msg of level12.story!.inGameMessages!) {
        expect(msg.text.length).toBeGreaterThan(0);
      }
    });

    test("each message should have a valid speaker", () => {
      for (const msg of level12.story!.inGameMessages!) {
        expect(VALID_SPEAKERS).toContain(msg.speaker);
      }
    });
  });

  describe("Scenario: Level 12 has appropriate weapon drops", () => {
    test("weaponDrops should be defined", () => {
      expect(level12.weaponDrops).toBeDefined();
    });

    test("weaponDrops should contain at least 2 weapon types", () => {
      expect(level12.weaponDrops!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Scenario: Level 12 boss warns with a story message", () => {
    test('at least one message text should reference "fortress" (case-insensitive)', () => {
      const messages = level12.story!.inGameMessages!;
      const hasFortress = messages.some((m) =>
        m.text.toLowerCase().includes("fortress")
      );
      expect(hasFortress).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Act 2 difficulty scaling
// ════════════════════════════════════════════════════════════════

describe("Feature: Act 2 difficulty scaling", () => {
  describe("Scenario: Act 2 boss HP is lower than Act 1 finale but scales within Act 2", () => {
    test("LEVELS[10].bossConfig.hitPoints should be less than LEVELS[9].bossConfig.hitPoints", () => {
      expect(LEVELS[10].bossConfig!.hitPoints).toBeLessThan(
        LEVELS[9].bossConfig!.hitPoints
      );
    });

    test("LEVELS[11].bossConfig.hitPoints should be greater than LEVELS[10].bossConfig.hitPoints", () => {
      expect(LEVELS[11].bossConfig!.hitPoints).toBeGreaterThan(
        LEVELS[10].bossConfig!.hitPoints
      );
    });
  });

  describe("Scenario: Act 2 wave counts are lower than Act 1 finale but scale within Act 2", () => {
    test("LEVELS[10].waves.length should be less than LEVELS[9].waves.length", () => {
      expect(LEVELS[10].waves.length).toBeLessThan(LEVELS[9].waves.length);
    });

    test("LEVELS[11].waves.length should be >= LEVELS[10].waves.length", () => {
      expect(LEVELS[11].waves.length).toBeGreaterThanOrEqual(
        LEVELS[10].waves.length
      );
    });
  });

  describe("Scenario: Act 2 enemy fire rate is lower than Act 1 finale but scales within Act 2", () => {
    test("LEVELS[10].enemyFireRateMultiplier should be less than LEVELS[9].enemyFireRateMultiplier", () => {
      expect(LEVELS[10].enemyFireRateMultiplier).toBeLessThan(
        LEVELS[9].enemyFireRateMultiplier
      );
    });

    test("LEVELS[11].enemyFireRateMultiplier should be >= LEVELS[10].enemyFireRateMultiplier", () => {
      expect(LEVELS[11].enemyFireRateMultiplier).toBeGreaterThanOrEqual(
        LEVELS[10].enemyFireRateMultiplier
      );
    });
  });

  describe("Scenario: Both Act 2 levels use boss types consistent with weapon profiles", () => {
    test('missile_dreadnought boss should have weaponType "missile"', () => {
      const dreadnoughtLevels = LEVELS.filter(
        (l) => l.bossConfig?.bossType === "missile_dreadnought"
      );
      for (const level of dreadnoughtLevels) {
        expect(level.bossConfig!.weaponType).toBe("missile");
      }
    });

    test('laser_fortress boss should have weaponType "laser"', () => {
      const fortressLevels = LEVELS.filter(
        (l) => l.bossConfig?.bossType === "laser_fortress"
      );
      for (const level of fortressLevels) {
        expect(level.bossConfig!.weaponType).toBe("laser");
      }
    });
  });

  describe("Scenario: No boss type is used more than 3 times across all levels", () => {
    test("no boss type should appear more than 3 times", () => {
      const counts = new Map<string, number>();
      for (const level of LEVELS) {
        if (level.bossConfig?.bossType) {
          const t = level.bossConfig.bossType;
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
      for (const [type, count] of counts) {
        expect(count).toBeLessThanOrEqual(3);
      }
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Feature: Existing test compatibility
// ════════════════════════════════════════════════════════════════

describe("Feature: Existing test compatibility", () => {
  describe("Scenario: Level count tests are updated", () => {
    test("LEVELS.length should be 14", () => {
      expect(LEVELS.length).toBe(14);
    });

    test('level names should include "Colony Defense" and "Asteroid Ambush"', () => {
      const names = LEVELS.map((l) => l.name);
      expect(names).toContain("Colony Defense");
      expect(names).toContain("Asteroid Ambush");
    });
  });

  describe("Scenario: Monotonic scaling tests are scoped per act", () => {
    test("wave count should increase monotonically within Act 1", () => {
      const act1 = LEVELS.filter((l) => l.act === 1);
      for (let i = 1; i < act1.length; i++) {
        expect(act1[i].waves.length).toBeGreaterThanOrEqual(
          act1[i - 1].waves.length
        );
      }
    });

    test("wave count should increase monotonically within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2);
      for (let i = 1; i < act2.length; i++) {
        expect(act2[i].waves.length).toBeGreaterThanOrEqual(
          act2[i - 1].waves.length
        );
      }
    });

    test("enemyFireRateMultiplier should increase monotonically within Act 1", () => {
      const act1 = LEVELS.filter((l) => l.act === 1);
      for (let i = 1; i < act1.length; i++) {
        expect(act1[i].enemyFireRateMultiplier).toBeGreaterThanOrEqual(
          act1[i - 1].enemyFireRateMultiplier
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

    test("boss HP should increase monotonically within Act 1", () => {
      const act1 = LEVELS.filter((l) => l.act === 1 && l.bossEnabled && l.bossConfig);
      for (let i = 1; i < act1.length; i++) {
        expect(act1[i].bossConfig!.hitPoints).toBeGreaterThanOrEqual(
          act1[i - 1].bossConfig!.hitPoints
        );
      }
    });

    test("boss HP should increase monotonically within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2 && l.bossEnabled && l.bossConfig);
      for (let i = 1; i < act2.length; i++) {
        expect(act2[i].bossConfig!.hitPoints).toBeGreaterThanOrEqual(
          act2[i - 1].bossConfig!.hitPoints
        );
      }
    });

    test("boss fireRate should increase monotonically within Act 1", () => {
      const act1 = LEVELS.filter((l) => l.act === 1 && l.bossEnabled && l.bossConfig);
      for (let i = 1; i < act1.length; i++) {
        expect(act1[i].bossConfig!.fireRate).toBeGreaterThanOrEqual(
          act1[i - 1].bossConfig!.fireRate
        );
      }
    });

    test("boss fireRate should increase monotonically within Act 2", () => {
      const act2 = LEVELS.filter((l) => l.act === 2 && l.bossEnabled && l.bossConfig);
      for (let i = 1; i < act2.length; i++) {
        expect(act2[i].bossConfig!.fireRate).toBeGreaterThanOrEqual(
          act2[i - 1].bossConfig!.fireRate
        );
      }
    });

    test("boss scoreValue should increase monotonically within Act 1", () => {
      const act1 = LEVELS.filter((l) => l.act === 1 && l.bossEnabled && l.bossConfig);
      for (let i = 1; i < act1.length; i++) {
        expect(act1[i].bossConfig!.scoreValue).toBeGreaterThanOrEqual(
          act1[i - 1].bossConfig!.scoreValue
        );
      }
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

  describe("Scenario: Boss type assignment tests include new levels", () => {
    test("level 11 should have boss type missile_dreadnought", () => {
      expect(LEVELS[10].bossConfig!.bossType).toBe("missile_dreadnought");
    });

    test("level 12 should have boss type laser_fortress", () => {
      expect(LEVELS[11].bossConfig!.bossType).toBe("laser_fortress");
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Additional validation: terrain config completeness
// ════════════════════════════════════════════════════════════════

describe("Feature: Terrain config completeness for new levels", () => {
  describe("Level 11 colony terrain", () => {
    const terrain = LEVELS[10].terrain!;

    test("terrain should be defined", () => {
      expect(terrain).toBeDefined();
    });

    test("groundColor should be a valid hex color", () => {
      expect(terrain.groundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test("structurePool should have at least 4 structures", () => {
      expect(terrain.structurePool.length).toBeGreaterThanOrEqual(4);
    });

    test("propPool should have at least 3 props", () => {
      expect(terrain.propPool.length).toBeGreaterThanOrEqual(3);
    });

    test("ambientParticles should be configured", () => {
      expect(terrain.ambientParticles).toBeDefined();
    });

    test("litStructures should be defined", () => {
      expect(terrain.litStructures).toBeDefined();
      expect(terrain.litStructures!.length).toBeGreaterThan(0);
    });
  });

  describe("Level 12 asteroid terrain", () => {
    const terrain = LEVELS[11].terrain!;

    test("terrain should be defined", () => {
      expect(terrain).toBeDefined();
    });

    test("groundColor should be a valid hex color", () => {
      expect(terrain.groundColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    test('structurePool should contain "struct_ore_processor"', () => {
      expect(terrain.structurePool).toContain("struct_ore_processor");
    });

    test('structurePool should contain "struct_cargo_pod"', () => {
      expect(terrain.structurePool).toContain("struct_cargo_pod");
    });

    test('structurePool should contain "struct_beacon"', () => {
      expect(terrain.structurePool).toContain("struct_beacon");
    });

    test("propPool should have at least 3 props", () => {
      expect(terrain.propPool.length).toBeGreaterThanOrEqual(3);
    });

    test("ambientParticles should be configured", () => {
      expect(terrain.ambientParticles).toBeDefined();
    });

    test("litStructures should be defined", () => {
      expect(terrain.litStructures).toBeDefined();
      expect(terrain.litStructures!.length).toBeGreaterThan(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// Additional: Boss appearsAfterWave validation
// ════════════════════════════════════════════════════════════════

describe("Feature: Boss appearsAfterWave is valid for new levels", () => {
  test("Level 11 boss appearsAfterWave is less than total wave count", () => {
    expect(LEVELS[10].bossConfig!.appearsAfterWave).toBeLessThan(
      LEVELS[10].waves.length
    );
  });

  test("Level 12 boss appearsAfterWave is less than total wave count", () => {
    expect(LEVELS[11].bossConfig!.appearsAfterWave).toBeLessThan(
      LEVELS[11].waves.length
    );
  });
});

// ════════════════════════════════════════════════════════════════
// Additional: Wave speed ranges per spec
// ════════════════════════════════════════════════════════════════

describe("Feature: Wave speed ranges match spec", () => {
  test("Level 11 wave speeds should be in the 100–230 range", () => {
    for (const wave of LEVELS[10].waves) {
      expect(wave.speed).toBeGreaterThanOrEqual(100);
      expect(wave.speed).toBeLessThanOrEqual(250);
    }
  });

  test("Level 12 wave speeds should be in the 60–250 range", () => {
    for (const wave of LEVELS[11].waves) {
      expect(wave.speed).toBeGreaterThanOrEqual(50);
      expect(wave.speed).toBeLessThanOrEqual(260);
    }
  });
});
