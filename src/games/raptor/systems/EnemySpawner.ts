import { RaptorLevelConfig, WaveConfig, EnemyVariant } from "../types";
import { Enemy } from "../entities/Enemy";

interface WaveState {
  config: WaveConfig;
  spawned: number;
  spawnTimer: number;
  started: boolean;
  complete: boolean;
}

export class EnemySpawner {
  private waves: WaveState[] = [];
  private levelTimer = 0;
  private bossSpawned = false;
  private bossDefeated = false;
  private bossEnabled = false;
  private bossConfig: RaptorLevelConfig["bossConfig"];

  configure(config: RaptorLevelConfig): void {
    this.levelTimer = 0;
    this.bossSpawned = false;
    this.bossDefeated = false;
    this.bossEnabled = config.bossEnabled;
    this.bossConfig = config.bossConfig;

    this.waves = config.waves.map((w) => ({
      config: w,
      spawned: 0,
      spawnTimer: 0,
      started: false,
      complete: false,
    }));
  }

  update(dt: number, canvasWidth: number): Enemy[] {
    this.levelTimer += dt;
    const spawned: Enemy[] = [];

    for (const wave of this.waves) {
      if (wave.complete) continue;

      if (!wave.started && this.levelTimer >= wave.config.waveDelay) {
        wave.started = true;
        wave.spawnTimer = 0;
      }

      if (!wave.started) continue;

      wave.spawnTimer += dt;
      if (wave.spawned < wave.config.count && wave.spawnTimer >= wave.config.spawnDelay) {
        wave.spawnTimer -= wave.config.spawnDelay;
        const x = this.getSpawnX(wave.config.formation, wave.spawned, wave.config.count, canvasWidth);
        const enemy = new Enemy(x, -30, wave.config.enemyVariant, wave.config.speed);
        spawned.push(enemy);
        wave.spawned++;
      }

      if (wave.spawned >= wave.config.count) {
        wave.complete = true;
      }
    }

    return spawned;
  }

  shouldSpawnBoss(): boolean {
    if (!this.bossEnabled || this.bossSpawned || !this.bossConfig) return false;

    const requiredWaves = this.bossConfig.appearsAfterWave;
    let completedCount = 0;
    for (const wave of this.waves) {
      if (wave.complete) completedCount++;
    }
    return completedCount >= requiredWaves;
  }

  spawnBoss(canvasWidth: number): Enemy | null {
    if (!this.bossConfig) return null;
    this.bossSpawned = true;
    return new Enemy(
      canvasWidth / 2,
      -40,
      "boss" as EnemyVariant,
      this.bossConfig.speed,
      {
        hitPoints: Math.max(10, this.bossConfig.hitPoints),
        scoreValue: this.bossConfig.scoreValue,
        fireRate: this.bossConfig.fireRate,
      }
    );
  }

  markBossDefeated(): void {
    this.bossDefeated = true;
  }

  get allWavesComplete(): boolean {
    return this.waves.length === 0 || this.waves.every((w) => w.complete);
  }

  get isLevelComplete(): boolean {
    if (!this.allWavesComplete) return false;
    if (this.bossEnabled) return this.bossDefeated;
    return true;
  }

  private getSpawnX(formation: string, index: number, count: number, canvasWidth: number): number {
    const margin = 50;
    const usableWidth = canvasWidth - margin * 2;

    switch (formation) {
      case "line":
        return margin + (usableWidth / (count + 1)) * (index + 1);
      case "v": {
        const center = canvasWidth / 2;
        const spread = usableWidth * 0.4;
        const half = Math.floor(count / 2);
        const offset = index <= half
          ? (index - half) * (spread / half || 1)
          : (index - half) * (spread / half || 1);
        return center + offset;
      }
      case "sweep":
        return margin + (usableWidth / (count + 1)) * (index + 1);
      case "random":
      default:
        return margin + Math.random() * usableWidth;
    }
  }
}
