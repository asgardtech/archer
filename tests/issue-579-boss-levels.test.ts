import { LEVELS } from "../src/games/raptor/levels";
import { EnemySpawner } from "../src/games/raptor/systems/EnemySpawner";
import { Enemy } from "../src/games/raptor/entities/Enemy";
import { RaptorLevelConfig } from "../src/games/raptor/types";

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

  test("bossConfig should have hitPoints of 10", () => {
    expect(level1.bossConfig!.hitPoints).toBe(10);
  });

  test("bossConfig should have speed of 50", () => {
    expect(level1.bossConfig!.speed).toBe(50);
  });

  test("bossConfig should have fireRate of 0.8", () => {
    expect(level1.bossConfig!.fireRate).toBeCloseTo(0.8);
  });

  test("bossConfig should have scoreValue of 100", () => {
    expect(level1.bossConfig!.scoreValue).toBe(100);
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

  test("bossConfig should have hitPoints of 15", () => {
    expect(level2.bossConfig!.hitPoints).toBe(15);
  });

  test("bossConfig should have speed of 45", () => {
    expect(level2.bossConfig!.speed).toBe(45);
  });

  test("bossConfig should have fireRate of 1.0", () => {
    expect(level2.bossConfig!.fireRate).toBeCloseTo(1.0);
  });

  test("bossConfig should have scoreValue of 150", () => {
    expect(level2.bossConfig!.scoreValue).toBe(150);
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

  test("bossConfig should have hitPoints of 20", () => {
    expect(level3.bossConfig!.hitPoints).toBe(20);
  });

  test("bossConfig should have speed of 40", () => {
    expect(level3.bossConfig!.speed).toBe(40);
  });

  test("bossConfig should have fireRate of 1.2", () => {
    expect(level3.bossConfig!.fireRate).toBeCloseTo(1.2);
  });

  test("bossConfig should have scoreValue of 200", () => {
    expect(level3.bossConfig!.scoreValue).toBe(200);
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

  test("spawned boss should have at least 10 hitPoints", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[0]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.hitPoints).toBeGreaterThanOrEqual(10);
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

  test("spawned boss should have the 'boss' variant", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.variant).toBe("boss");
  });

  test("spawned boss should have at least 15 hitPoints", () => {
    const spawner = new EnemySpawner();
    spawner.configure(LEVELS[1]);

    for (let t = 0; t < 100; t += 0.1) {
      spawner.update(0.1, 800);
    }

    const boss = spawner.spawnBoss(800);
    expect(boss).not.toBeNull();
    expect(boss!.hitPoints).toBeGreaterThanOrEqual(15);
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
    expect(level2Boss.fireRate).toBeGreaterThan(level1Boss.fireRate);
    expect(level3Boss.fireRate).toBeGreaterThan(level2Boss.fireRate);
  });

  test("scoreValue should increase from level 1 to level 3", () => {
    expect(level2Boss.scoreValue).toBeGreaterThan(level1Boss.scoreValue);
    expect(level3Boss.scoreValue).toBeGreaterThan(level2Boss.scoreValue);
  });

  test("speed should decrease from level 1 to level 3", () => {
    expect(level2Boss.speed).toBeLessThan(level1Boss.speed);
    expect(level3Boss.speed).toBeLessThan(level2Boss.speed);
  });
});

describe("Scenario: Boss warning message appears in level 1", () => {
  test("there should be a message mentioning a boss or command ship", () => {
    const level1 = LEVELS[0];
    const messages = level1.story?.inGameMessages ?? [];
    const hasBossMessage = messages.some(
      (m) =>
        m.text.toLowerCase().includes("boss") ||
        m.text.toLowerCase().includes("command ship") ||
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
