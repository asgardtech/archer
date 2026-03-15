export interface PlayerStats {
  // Combat
  totalKills: number;
  killsByVariant: Record<string, number>;
  bossesDefeated: number;
  ramKills: number;
  totalScore: number;

  // Progression
  levelsCompleted: number;
  highestLevelCompleted: number;
  totalDeaths: number;

  // Abilities
  totalDodgesUsed: number;
  totalEmpsUsed: number;

  // Collection
  totalPowerUpsCollected: number;
  powerUpsByType: Record<string, number>;
  weaponsOwned: string[];
  highestWeaponTier: number;

  // Mastery
  projectilesReflected: number;
  totalPlayTimeSeconds: number;
  fastestLevelCompletionSeconds: Record<number, number>;

  // Per-level (reset each level)
  damageTakenThisLevel: number;
  lowestArmorSurvived: number;
}

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

export class PlayerStatsTracker {
  private stats: PlayerStats = defaultStats();

  recordKill(variant: string, _scoreValue: number, isBoss: boolean): void {
    this.stats.totalKills++;
    this.stats.killsByVariant[variant] = (this.stats.killsByVariant[variant] ?? 0) + 1;
    if (isBoss) {
      this.stats.bossesDefeated++;
    }
  }

  recordRamKill(variant: string, _scoreValue: number, isBoss = false): void {
    this.stats.totalKills++;
    this.stats.ramKills++;
    this.stats.killsByVariant[variant] = (this.stats.killsByVariant[variant] ?? 0) + 1;
    if (isBoss) {
      this.stats.bossesDefeated++;
    }
  }

  recordPowerUpCollected(type: string): void {
    this.stats.totalPowerUpsCollected++;
    this.stats.powerUpsByType[type] = (this.stats.powerUpsByType[type] ?? 0) + 1;
  }

  recordDeath(): void {
    this.stats.totalDeaths++;
  }

  recordDodge(): void {
    this.stats.totalDodgesUsed++;
  }

  recordEmp(): void {
    this.stats.totalEmpsUsed++;
  }

  recordReflect(): void {
    this.stats.projectilesReflected++;
  }

  recordLevelComplete(levelIndex: number, elapsedSeconds: number, _damageTaken: number): void {
    this.stats.levelsCompleted++;
    this.stats.highestLevelCompleted = Math.max(this.stats.highestLevelCompleted, levelIndex);

    const prev = this.stats.fastestLevelCompletionSeconds[levelIndex];
    if (prev === undefined || elapsedSeconds < prev) {
      this.stats.fastestLevelCompletionSeconds[levelIndex] = elapsedSeconds;
    }
  }

  recordWeaponUpgrade(weaponType: string, newTier: number): void {
    if (!this.stats.weaponsOwned.includes(weaponType)) {
      this.stats.weaponsOwned.push(weaponType);
    }
    this.stats.highestWeaponTier = Math.max(this.stats.highestWeaponTier, newTier);
  }

  recordDamageTaken(amount: number, currentArmor: number): void {
    this.stats.damageTakenThisLevel += amount;
    this.stats.lowestArmorSurvived = Math.min(this.stats.lowestArmorSurvived, currentArmor);
  }

  addPlayTime(dt: number): void {
    this.stats.totalPlayTimeSeconds += dt;
  }

  updateScore(_currentScore: number, totalScore: number): void {
    this.stats.totalScore = totalScore;
  }

  resetLevelStats(): void {
    this.stats.damageTakenThisLevel = 0;
    this.stats.lowestArmorSurvived = 100;
  }

  resetAll(): void {
    this.stats = defaultStats();
  }

  serialize(): PlayerStats {
    const stats = this.getStats();
    stats.damageTakenThisLevel = 0;
    stats.lowestArmorSurvived = 100;
    return stats;
  }

  deserialize(saved: Partial<PlayerStats>): void {
    if (!saved || typeof saved !== "object") return;

    const s = this.stats;

    if (typeof saved.totalKills === "number" && saved.totalKills >= 0 && Number.isInteger(saved.totalKills)) {
      s.totalKills = saved.totalKills;
    }
    if (typeof saved.bossesDefeated === "number" && saved.bossesDefeated >= 0 && Number.isInteger(saved.bossesDefeated)) {
      s.bossesDefeated = saved.bossesDefeated;
    }
    if (typeof saved.ramKills === "number" && saved.ramKills >= 0 && Number.isInteger(saved.ramKills)) {
      s.ramKills = saved.ramKills;
    }
    if (typeof saved.totalScore === "number" && saved.totalScore >= 0) {
      s.totalScore = saved.totalScore;
    }
    if (typeof saved.levelsCompleted === "number" && saved.levelsCompleted >= 0 && Number.isInteger(saved.levelsCompleted)) {
      s.levelsCompleted = saved.levelsCompleted;
    }
    if (typeof saved.highestLevelCompleted === "number" && saved.highestLevelCompleted >= 0 && Number.isInteger(saved.highestLevelCompleted)) {
      s.highestLevelCompleted = saved.highestLevelCompleted;
    }
    if (typeof saved.totalDeaths === "number" && saved.totalDeaths >= 0 && Number.isInteger(saved.totalDeaths)) {
      s.totalDeaths = saved.totalDeaths;
    }
    if (typeof saved.totalDodgesUsed === "number" && saved.totalDodgesUsed >= 0 && Number.isInteger(saved.totalDodgesUsed)) {
      s.totalDodgesUsed = saved.totalDodgesUsed;
    }
    if (typeof saved.totalEmpsUsed === "number" && saved.totalEmpsUsed >= 0 && Number.isInteger(saved.totalEmpsUsed)) {
      s.totalEmpsUsed = saved.totalEmpsUsed;
    }
    if (typeof saved.totalPowerUpsCollected === "number" && saved.totalPowerUpsCollected >= 0 && Number.isInteger(saved.totalPowerUpsCollected)) {
      s.totalPowerUpsCollected = saved.totalPowerUpsCollected;
    }
    if (typeof saved.highestWeaponTier === "number" && saved.highestWeaponTier >= 0 && saved.highestWeaponTier <= 3 && Number.isInteger(saved.highestWeaponTier)) {
      s.highestWeaponTier = saved.highestWeaponTier;
    }
    if (typeof saved.projectilesReflected === "number" && saved.projectilesReflected >= 0 && Number.isInteger(saved.projectilesReflected)) {
      s.projectilesReflected = saved.projectilesReflected;
    }
    if (typeof saved.totalPlayTimeSeconds === "number" && saved.totalPlayTimeSeconds >= 0) {
      s.totalPlayTimeSeconds = saved.totalPlayTimeSeconds;
    }

    if (saved.killsByVariant && typeof saved.killsByVariant === "object" && !Array.isArray(saved.killsByVariant)) {
      const merged: Record<string, number> = {};
      for (const [k, v] of Object.entries(saved.killsByVariant)) {
        if (typeof v === "number" && v >= 0 && Number.isInteger(v)) {
          merged[k] = v;
        }
      }
      s.killsByVariant = merged;
    }

    if (saved.powerUpsByType && typeof saved.powerUpsByType === "object" && !Array.isArray(saved.powerUpsByType)) {
      const merged: Record<string, number> = {};
      for (const [k, v] of Object.entries(saved.powerUpsByType)) {
        if (typeof v === "number" && v >= 0 && Number.isInteger(v)) {
          merged[k] = v;
        }
      }
      s.powerUpsByType = merged;
    }

    if (Array.isArray(saved.weaponsOwned)) {
      const valid = saved.weaponsOwned.filter((w): w is string => typeof w === "string" && w.length > 0);
      s.weaponsOwned = valid.length > 0 ? valid : ["machine-gun"];
    }

    if (saved.fastestLevelCompletionSeconds && typeof saved.fastestLevelCompletionSeconds === "object" && !Array.isArray(saved.fastestLevelCompletionSeconds)) {
      const merged: Record<number, number> = {};
      for (const [k, v] of Object.entries(saved.fastestLevelCompletionSeconds)) {
        const key = Number(k);
        if (!isNaN(key) && typeof v === "number" && v > 0) {
          merged[key] = v;
        }
      }
      s.fastestLevelCompletionSeconds = merged;
    }
  }

  getStats(): PlayerStats {
    return {
      ...this.stats,
      killsByVariant: { ...this.stats.killsByVariant },
      powerUpsByType: { ...this.stats.powerUpsByType },
      weaponsOwned: [...this.stats.weaponsOwned],
      fastestLevelCompletionSeconds: { ...this.stats.fastestLevelCompletionSeconds },
    };
  }
}
