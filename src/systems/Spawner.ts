import { Balloon } from "../entities/Balloon";
import { UpgradeType } from "../types";

const INITIAL_INTERVAL = 2.0;
const MIN_INTERVAL = 0.8;
const RAMP_RATE = 0.005;

const UPGRADE_TYPES: UpgradeType[] = ["multi-shot", "piercing", "rapid-fire", "bonus-arrows"];
const UPGRADE_MIN_INTERVAL = 8;
const UPGRADE_MAX_INTERVAL = 15;

export class Spawner {
  private timer = 0;
  private interval = INITIAL_INTERVAL;
  private elapsed = 0;
  private upgradeTimer = 0;
  private upgradeInterval = this.randomUpgradeInterval();
  private bossTimer = 0;
  private bossSpawned = false;
  private readonly firstBossDelay = 45;
  private bossInterval = this.randomBossInterval();

  reset(): void {
    this.timer = 0;
    this.interval = INITIAL_INTERVAL;
    this.elapsed = 0;
    this.upgradeTimer = 0;
    this.upgradeInterval = this.randomUpgradeInterval();
    this.bossTimer = 0;
    this.bossSpawned = false;
    this.bossInterval = this.randomBossInterval();
  }

  update(dt: number, canvasW: number, canvasH: number): Balloon[] {
    const spawned: Balloon[] = [];
    this.elapsed += dt;
    this.interval = Math.max(MIN_INTERVAL, INITIAL_INTERVAL - this.elapsed * RAMP_RATE);
    this.timer += dt;

    if (this.timer >= this.interval) {
      this.timer -= this.interval;
      const margin = 50;
      const x = margin + Math.random() * (canvasW - margin * 2);
      const speed = 60 + Math.random() * 40;
      spawned.push(new Balloon(x, canvasH + 40, speed));
    }

    this.upgradeTimer += dt;
    if (this.upgradeTimer >= this.upgradeInterval) {
      this.upgradeTimer -= this.upgradeInterval;
      this.upgradeInterval = this.randomUpgradeInterval();
      const margin = 50;
      const x = margin + Math.random() * (canvasW - margin * 2);
      const speed = 50 + Math.random() * 30;
      const type = UPGRADE_TYPES[Math.floor(Math.random() * UPGRADE_TYPES.length)];
      spawned.push(new Balloon(x, canvasH + 40, speed, type));
    }

    // Boss balloon spawning
    this.bossTimer += dt;
    const bossThreshold = this.bossSpawned ? this.bossInterval : this.firstBossDelay;
    if (this.bossTimer >= bossThreshold) {
      this.bossTimer = 0;
      this.bossSpawned = true;
      this.bossInterval = this.randomBossInterval();
      const margin = 80;
      const x = margin + Math.random() * (canvasW - margin * 2);
      const speed = 30 + Math.random() * 10;
      spawned.push(new Balloon(x, canvasH + 60, speed, "boss"));
    }

    return spawned;
  }

  private randomUpgradeInterval(): number {
    return UPGRADE_MIN_INTERVAL + Math.random() * (UPGRADE_MAX_INTERVAL - UPGRADE_MIN_INTERVAL);
  }

  private randomBossInterval(): number {
    return 60 + Math.random() * 30;
  }
}
