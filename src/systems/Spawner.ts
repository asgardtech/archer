import { Balloon } from "../entities/Balloon";
import { UpgradeType } from "../types";
import { LevelConfig } from "../levels";

const UPGRADE_TYPES: UpgradeType[] = ["multi-shot", "piercing", "rapid-fire", "bonus-arrows"];

const DEFAULT_CONFIG: LevelConfig = {
  level: 1,
  name: "Default",
  targetScore: 20,
  arrowsGranted: 100,
  spawnInterval: 2.0,
  minSpawnInterval: 0.8,
  rampRate: 0.005,
  balloonSpeedMin: 60,
  balloonSpeedMax: 100,
  upgradeMinInterval: 8,
  upgradeMaxInterval: 15,
  bossEnabled: true,
  bossDelay: 45,
  bossIntervalMin: 60,
  bossIntervalMax: 90,
  bossHitPoints: 5,
  skyGradient: ["#87CEEB", "#4682B4"],
};

export class Spawner {
  private timer = 0;
  private interval: number;
  private elapsed = 0;
  private upgradeTimer = 0;
  private upgradeInterval: number;
  private bossTimer = 0;
  private bossSpawned = false;
  private bossInterval: number;

  private config: LevelConfig;

  constructor() {
    this.config = DEFAULT_CONFIG;
    this.interval = this.config.spawnInterval;
    this.upgradeInterval = this.randomUpgradeInterval();
    this.bossInterval = this.randomBossInterval();
  }

  configure(config: LevelConfig): void {
    this.config = config;
    this.timer = 0;
    this.interval = config.spawnInterval;
    this.elapsed = 0;
    this.upgradeTimer = 0;
    this.upgradeInterval = this.randomUpgradeInterval();
    this.bossTimer = 0;
    this.bossSpawned = false;
    this.bossInterval = this.randomBossInterval();
  }

  reset(): void {
    this.timer = 0;
    this.interval = this.config.spawnInterval;
    this.elapsed = 0;
    this.upgradeTimer = 0;
    this.upgradeInterval = this.randomUpgradeInterval();
    this.bossTimer = 0;
    this.bossSpawned = false;
    this.bossInterval = this.randomBossInterval();
  }

  update(dt: number, canvasW: number, canvasH: number): Balloon[] {
    const spawned: Balloon[] = [];
    const cfg = this.config;

    this.elapsed += dt;
    this.interval = Math.max(
      cfg.minSpawnInterval,
      cfg.spawnInterval - this.elapsed * cfg.rampRate
    );
    this.timer += dt;

    if (this.timer >= this.interval) {
      this.timer -= this.interval;
      const margin = 50;
      const x = margin + Math.random() * (canvasW - margin * 2);
      const speed = cfg.balloonSpeedMin + Math.random() * (cfg.balloonSpeedMax - cfg.balloonSpeedMin);
      spawned.push(new Balloon(x, canvasH + 40, speed));
    }

    this.upgradeTimer += dt;
    if (this.upgradeTimer >= this.upgradeInterval) {
      this.upgradeTimer -= this.upgradeInterval;
      this.upgradeInterval = this.randomUpgradeInterval();
      const margin = 50;
      const x = margin + Math.random() * (canvasW - margin * 2);
      const speed = cfg.balloonSpeedMin + Math.random() * (cfg.balloonSpeedMax - cfg.balloonSpeedMin) * 0.6;
      const type = UPGRADE_TYPES[Math.floor(Math.random() * UPGRADE_TYPES.length)];
      spawned.push(new Balloon(x, canvasH + 40, speed, type));
    }

    if (cfg.bossEnabled) {
      this.bossTimer += dt;
      const bossThreshold = this.bossSpawned ? this.bossInterval : cfg.bossDelay;
      if (this.bossTimer >= bossThreshold) {
        this.bossTimer = 0;
        this.bossSpawned = true;
        this.bossInterval = this.randomBossInterval();
        const margin = 80;
        const x = margin + Math.random() * (canvasW - margin * 2);
        const speed = 30 + Math.random() * 10;
        spawned.push(new Balloon(x, canvasH + 60, speed, "boss", cfg.bossHitPoints));
      }
    }

    return spawned;
  }

  private randomUpgradeInterval(): number {
    return this.config.upgradeMinInterval + Math.random() * (this.config.upgradeMaxInterval - this.config.upgradeMinInterval);
  }

  private randomBossInterval(): number {
    return this.config.bossIntervalMin + Math.random() * (this.config.bossIntervalMax - this.config.bossIntervalMin);
  }
}
