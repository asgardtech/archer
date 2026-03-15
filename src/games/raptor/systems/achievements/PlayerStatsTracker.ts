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
