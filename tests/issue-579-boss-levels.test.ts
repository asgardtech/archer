import { LEVELS } from "../src/games/raptor/levels";
import { EnemySpawner } from "../src/games/raptor/systems/EnemySpawner";
import { Enemy } from "../src/games/raptor/entities/Enemy";
import { RaptorLevelConfig, BossType } from "../src/games/raptor/types";

// ════════════════════════════════════════════════════════════════
// Issue #579: Add a boss for the first three levels
// ════════════════════════════════════════════════════════════════

describe("Scenario: Level 1 has a boss enabled", () => {
  const level1 = LEVELS[0];

  test("bossEnabled should be true", () => {
    expect(level1.bossEnabled).toBe(true);
  });

  test("bossConfig should be defined", () => {
    expect(level1.bossConfig).toBeDefined();
  });

  test("bossConfig should have hitPoints of 25", () => {
    expect(level1.bossConfig!.hitPoints).toBe(25);
  });

  test("bossConfig should have speed of 50", () => {
    expect(level1.bossConfig!.speed).toBe(50);
  });

  test("bossConfig should have fireRate of 0.8", () => {
    expect(level1.bossConfig!.fireRate).toBeCloseTo(0.8);
  });

  test("bossConfig should have scoreValue of 200", () => {
    expect(level1.bossConfig!.scoreValue).toBe(200);
  });

  test("bossConfig should have appearsAfterWave of 3", () => {
    expect(level1.bossConfig!.appearsAfterWave).toBe(3);
  });

  test('bossConfig should have weaponType of "standard"', () => {
    expect(level1.bossConfig!.weaponType).toBe("standard");
  });
});

describe("Scenario: Level 2 has a boss enabled", () => {
  const level2 = LEVELS[1];

  test("bossEnabled should be true", () => {
    expect(level2.bossEnabled).toBe(true);
  });

  test("bossConfig should be defined", () => {
    expect(level2.bossConfig).toBeDefined();
  });

  test("bossConfig should have hitPoints of 35", () => {
    expect(level2.bossConfig!.hitPoints).toBe(35);
  });

  test("bossConfig should have speed of 60", () => {
    expect(level2.bossConfig!.speed).toBe(60);
  });

  test("bossConfig should have fireRate of 1.0", () => {
    expect(level2.bossConfig!.fireRate).toBeCloseTo(1.0);
  });

  test("bossConfig should have scoreValue of 300", () => {
    expect(level2.bossConfig!.scoreValue).toBe(300);
  });

  test("bossConfig should have appearsAfterWave of 4", () => {
    expect(level2.bossConfig!.appearsAfterWave).toBe(4);
  });

  test('bossConfig should have weaponType of "spread"', () => {
    expect(level2.bossConfig!.weaponType).toBe("spread");
  });
});

describe("Scenario: Level 3 boss is unchanged", () => {
  const level3 = LEVELS[2];

  test("bossEnabled should be true", () => {
    expect(level3.bossEnabled).toBe(true);
  });

  test("bossConfig should be defined", () => {
    expect(level3.bossConfig).toBeDefined();
  });

  test("bossConfig should have hitPoints of 70", () => {
    expect(level3.bossConfig!.hitPoints).toBe(70);
  });

  test("bossConfig should have speed of 30", () => {
    expect(level3.bossConfig!.speed).toBe(30);
  });

  test("bossConfig should have fireRate of 1.1", () => {
    expect(level3.bossConfig!.fireRate).toBeCloseTo(1.1);
  });

  test("bossConfig should have scoreValue of 400", () => {
    expect(level3.bossConfig!.scoreValue).toBe(400);
  });

  test("bossConfig should have appearsAfterWave of 5", () => {
    expect(level3.bossConfig!.appearsAfterWave).toBe(5);
  });

  test('bossConfig should have weaponType of "missile"', () => {
    expect(level3.bossConfig!.weaponType).toBe("missile");
  });
});

describe("Scenario: Level 1 boss spawns after the correct wave", () => {
  test("boss should spawn after 3 waves have completed", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.shouldSpawnBoss()).toBe(true);
  });

  test("spawned boss should have the 'boss' variant", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss");
  });

  test("spawned boss should have at least 25 hitPoints", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.hitPoints).toBeGreaterThanOrEqual(25);
  });
});

describe("Scenario: Level 2 boss spawns after the correct wave", () => {
  test("boss should spawn after 4 waves have completed", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.shouldSpawnBoss()).toBe(true);
  });

  test("spawned boss should have the 'boss_gunship' variant", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss_gunship");
  });

  test("spawned boss should have at least 35 hitPoints", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.hitPoints).toBeGreaterThanOrEqual(35);
  });
});

describe("Scenario: Level 1 does not complete until boss is defeated", () => {
  test("spawner should report the level is NOT complete when boss is alive", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.allWavesComplete).toBe(true);
    spawner.spawnBoss(800);
    expect(spawner.isLevelComplete).toBe(false);
  });
});

describe("Scenario: Level 1 completes when boss is defeated", () => {
  test("spawner should report the level IS complete after boss is defeated", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.allWavesComplete).toBe(true);
    spawner.spawnBoss(800);
    spawner.markBossDefeated();
    expect(spawner.isLevelComplete).toBe(true);
  });
});

describe("Scenario: Level 2 does not complete until boss is defeated", () => {
  test("spawner should report the level is NOT complete when boss is alive", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.allWavesComplete).toBe(true);
    spawner.spawnBoss(800);
    expect(spawner.isLevelComplete).toBe(false);
  });
});

describe("Scenario: Level 2 completes when boss is defeated", () => {
  test("spawner should report the level IS complete after boss is defeated", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    expect(spawner.allWavesComplete).toBe(true);
    spawner.spawnBoss(800);
    spawner.markBossDefeated();
    expect(spawner.isLevelComplete).toBe(true);
  });
});

describe("Scenario: Boss difficulty scales across levels 1-3", () => {
  const level1Boss = LEVELS[0].bossConfig!;
  const level2Boss = LEVELS[1].bossConfig!;
  const level3Boss = LEVELS[2].bossConfig!;

  test("hitPoints should increase from level 1 to level 3", () => {
    expect(level2Boss.hitPoints).toBeGreaterThan(level1Boss.hitPoints);
    expect(level3Boss.hitPoints).toBeGreaterThan(level2Boss.hitPoints);
  });

  test("fireRate should increase from level 1 to level 3", () => {
    expect(level2Boss.fireRate).toBeGreaterThanOrEqual(level1Boss.fireRate);
    expect(level3Boss.fireRate).toBeGreaterThanOrEqual(level2Boss.fireRate);
  });

  test("scoreValue should increase from level 1 to level 3", () => {
    expect(level2Boss.scoreValue).toBeGreaterThan(level1Boss.scoreValue);
    expect(level3Boss.scoreValue).toBeGreaterThan(level2Boss.scoreValue);
  });

  test("all boss speeds are positive", () => {
    expect(level1Boss.speed).toBeGreaterThan(0);
    expect(level2Boss.speed).toBeGreaterThan(0);
    expect(level3Boss.speed).toBeGreaterThan(0);
  });
});

describe("Scenario: Boss warning message appears in level 1", () => {
  test("there should be a message mentioning a boss or command ship", () => {
    const level1 = LEVELS[0];
    const messages = level1.story?.inGameMessages ?? [];
    const hasBossMessage = messages.some(
      (m) =>
        m.text.toLowerCase().includes("boss") ||
        m.text.toLowerCase().includes("command") ||
        m.text.toLowerCase().includes("large contact")
    );
    expect(hasBossMessage).toBe(true);
  });
});

describe("Scenario: Boss warning message appears in level 2", () => {
  test("there should be a message mentioning a boss or gunship", () => {
    const level2 = LEVELS[1];
    const messages = level2.story?.inGameMessages ?? [];
    const hasBossMessage = messages.some(
      (m) =>
        m.text.toLowerCase().includes("boss") ||
        m.text.toLowerCase().includes("gunship") ||
        m.text.toLowerCase().includes("heavy")
    );
    expect(hasBossMessage).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// Issue #625: Assign unique boss types to each level
// ════════════════════════════════════════════════════════════════

const VALID_BOSS_TYPES: BossType[] = [
  "standard",
  "gunship_commander",
  "missile_dreadnought",
  "laser_fortress",
  "carrier",
  "swarm_queen",
  "shadow_commander",
];

describe("Scenario: Every level has a boss type specified", () => {
  test.each(LEVELS.map((l, i) => [i + 1, l] as const))(
    "level %i should have a valid bossType",
    (_levelNum, level) => {
      expect(level.bossConfig).toBeDefined();
      expect(level.bossConfig!.bossType).toBeDefined();
      expect(VALID_BOSS_TYPES).toContain(level.bossConfig!.bossType);
    }
  );
});

describe("Scenario: Boss type variety across levels", () => {
  test("at least 4 different boss types should be represented", () => {
    const types = new Set(LEVELS.map((l) => l.bossConfig!.bossType));
    expect(types.size).toBeGreaterThanOrEqual(4);
  });

  test("all 7 boss types are used", () => {
    const types = new Set(LEVELS.map((l) => l.bossConfig!.bossType));
    expect(types.size).toBe(7);
  });
});

describe("Scenario: No single boss type is overused", () => {
  test("no boss type appears more than 5 times", () => {
    const counts = new Map<string, number>();
    for (const level of LEVELS) {
      const t = level.bossConfig!.bossType!;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    for (const [type, count] of counts) {
      expect(count).toBeLessThanOrEqual(5);
    }
  });
});

describe("Scenario: Correct boss type is assigned to each level", () => {
  const expectedTypes: [number, string, BossType][] = [
    [1, "Coastal Patrol", "standard"],
    [2, "Desert Strike", "gunship_commander"],
    [3, "Mountain Assault", "missile_dreadnought"],
    [4, "Arctic Thunder", "laser_fortress"],
    [5, "Final Fortress", "carrier"],
    [6, "Shipyard Ruins", "missile_dreadnought"],
    [7, "Scorched Wastes", "laser_fortress"],
    [8, "Industrial Core", "carrier"],
    [9, "Orbital Debris", "gunship_commander"],
    [10, "Vektran Stronghold", "standard"],
    [11, "Colony Defense", "missile_dreadnought"],
    [12, "Asteroid Ambush", "laser_fortress"],
  ];

  test.each(expectedTypes)(
    "level %i (%s) should have bossType %s",
    (levelNum, _name, expectedBossType) => {
      const level = LEVELS[levelNum - 1];
      expect(level.bossConfig!.bossType).toBe(expectedBossType);
    }
  );
});

describe("Scenario: Boss hit points scale upward within each act", () => {
  test("each level's boss HP >= previous level's boss HP within Act 1", () => {
    const act1 = LEVELS.filter((l) => l.act === 1);
    for (let i = 1; i < act1.length; i++) {
      expect(act1[i].bossConfig!.hitPoints).toBeGreaterThanOrEqual(
        act1[i - 1].bossConfig!.hitPoints
      );
    }
  });

  test("Act 2 boss HP generally increases from first to last", () => {
    const act2 = LEVELS.filter((l) => l.act === 2);
    const first = act2[0].bossConfig!.hitPoints;
    const last = act2[act2.length - 1].bossConfig!.hitPoints;
    expect(last).toBeGreaterThan(first);
  });
});

describe("Scenario: Boss fire rate scales upward within each act", () => {
  test("each level's boss fireRate >= previous level's boss fireRate within Act 1", () => {
    const act1 = LEVELS.filter((l) => l.act === 1);
    for (let i = 1; i < act1.length; i++) {
      expect(act1[i].bossConfig!.fireRate).toBeGreaterThanOrEqual(
        act1[i - 1].bossConfig!.fireRate
      );
    }
  });

  test("Act 2 boss fireRate generally increases from first to last", () => {
    const act2 = LEVELS.filter((l) => l.act === 2);
    const first = act2[0].bossConfig!.fireRate;
    const last = act2[act2.length - 1].bossConfig!.fireRate;
    expect(last).toBeGreaterThan(first);
  });
});

describe("Scenario: Boss score value scales upward within each act", () => {
  test("each level's boss scoreValue >= previous level's boss scoreValue within each act", () => {
    const act1 = LEVELS.filter((l) => l.act === 1);
    for (let i = 1; i < act1.length; i++) {
      expect(act1[i].bossConfig!.scoreValue).toBeGreaterThanOrEqual(
        act1[i - 1].bossConfig!.scoreValue
      );
    }
    const act2 = LEVELS.filter((l) => l.act === 2);
    for (let i = 1; i < act2.length; i++) {
      expect(act2[i].bossConfig!.scoreValue).toBeGreaterThanOrEqual(
        act2[i - 1].bossConfig!.scoreValue
      );
    }
  });
});

describe("Scenario: Type-specific weapon profiles", () => {
  test("gunship_commander bosses have spread weapons", () => {
    const gunshipLevels = LEVELS.filter((l) => l.bossConfig!.bossType === "gunship_commander");
    expect(gunshipLevels.length).toBeGreaterThan(0);
    for (const level of gunshipLevels) {
      expect(level.bossConfig!.weaponType).toBe("spread");
    }
  });

  test("missile_dreadnought bosses use missile weapons", () => {
    const dreadnoughtLevels = LEVELS.filter((l) => l.bossConfig!.bossType === "missile_dreadnought");
    expect(dreadnoughtLevels.length).toBeGreaterThan(0);
    for (const level of dreadnoughtLevels) {
      expect(level.bossConfig!.weaponType).toBe("missile");
    }
  });

  test("laser_fortress bosses use laser weapons", () => {
    const fortressLevels = LEVELS.filter((l) => l.bossConfig!.bossType === "laser_fortress");
    expect(fortressLevels.length).toBeGreaterThan(0);
    for (const level of fortressLevels) {
      expect(level.bossConfig!.weaponType).toBe("laser");
    }
  });
});

describe("Scenario: Story messages reference correct boss types", () => {
  test("level 1 story references 'command'", () => {
    const messages = LEVELS[0].story?.inGameMessages ?? [];
    expect(messages.some((m) => m.text.toLowerCase().includes("command"))).toBe(true);
  });

  test("level 2 story references 'gunship'", () => {
    const messages = LEVELS[1].story?.inGameMessages ?? [];
    expect(messages.some((m) => m.text.toLowerCase().includes("gunship"))).toBe(true);
  });

  test("level 3 story references 'dreadnought'", () => {
    const messages = LEVELS[2].story?.inGameMessages ?? [];
    expect(messages.some((m) => m.text.toLowerCase().includes("dreadnought"))).toBe(true);
  });

  test("level 4 story references 'fortress'", () => {
    const messages = LEVELS[3].story?.inGameMessages ?? [];
    expect(messages.some((m) => m.text.toLowerCase().includes("fortress"))).toBe(true);
  });

  test("level 5 story references 'carrier'", () => {
    const messages = LEVELS[4].story?.inGameMessages ?? [];
    expect(messages.some((m) => m.text.toLowerCase().includes("carrier"))).toBe(true);
  });
});
