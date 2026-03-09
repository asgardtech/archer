import { UpgradeType, UpgradeState } from "../types";

const DURATIONS: Record<UpgradeType, number> = {
  "multi-shot": 8,
  "piercing": 6,
  "rapid-fire": 5,
  "bonus-arrows": 0,
};

export const PERMANENT_THRESHOLD = 3;
export const PERMANENT_COOLDOWN = 10;
const BONUS_ARROWS_THRESHOLD_AMOUNT = 25;

export class UpgradeManager {
  private active: UpgradeState[] = [];
  private collectionCounts: Map<UpgradeType, number> = new Map();
  private permanentUpgrades: Set<UpgradeType> = new Set();
  private cooldowns: Map<UpgradeType, number> = new Map();

  activate(type: UpgradeType, onInstant?: (amount: number) => void): void {
    const prevCount = this.collectionCounts.get(type) ?? 0;
    const newCount = prevCount + 1;
    this.collectionCounts.set(type, newCount);

    if (type === "bonus-arrows") {
      const amount = newCount === PERMANENT_THRESHOLD ? BONUS_ARROWS_THRESHOLD_AMOUNT : 10;
      onInstant?.(amount);
      return;
    }

    if (newCount >= PERMANENT_THRESHOLD) {
      this.permanentUpgrades.add(type);
    }

    this.cooldowns.delete(type);

    const existing = this.active.find((u) => u.type === type);
    if (existing) {
      existing.remainingTime = DURATIONS[type];
    } else {
      this.active.push({ type, remainingTime: DURATIONS[type] });
    }
  }

  hasUpgrade(type: UpgradeType): boolean {
    return this.active.some((u) => u.type === type);
  }

  update(dt: number): void {
    for (const u of this.active) {
      u.remainingTime -= dt;
    }

    const newCooldowns = new Set<UpgradeType>();
    const expired = this.active.filter(
      (u) => u.remainingTime <= 0 && this.permanentUpgrades.has(u.type)
    );
    for (const u of expired) {
      if (!this.cooldowns.has(u.type)) {
        this.cooldowns.set(u.type, PERMANENT_COOLDOWN);
        newCooldowns.add(u.type);
      }
    }

    this.active = this.active.filter((u) => u.remainingTime > 0);

    for (const [type, remaining] of this.cooldowns) {
      if (newCooldowns.has(type)) continue;
      const newRemaining = remaining - dt;
      if (newRemaining <= 0) {
        this.cooldowns.delete(type);
        this.active.push({ type, remainingTime: DURATIONS[type] });
      } else {
        this.cooldowns.set(type, newRemaining);
      }
    }
  }

  resetForNewLevel(): void {
    this.active = [];
    this.cooldowns.clear();

    for (const type of this.permanentUpgrades) {
      this.active.push({ type, remainingTime: DURATIONS[type] });
    }
  }

  resetAll(): void {
    this.active = [];
    this.collectionCounts.clear();
    this.permanentUpgrades.clear();
    this.cooldowns.clear();
  }

  reset(): void {
    this.resetAll();
  }

  isPermanent(type: UpgradeType): boolean {
    return this.permanentUpgrades.has(type);
  }

  getCollectionCount(type: UpgradeType): number {
    return this.collectionCounts.get(type) ?? 0;
  }

  getCollectionCounts(): ReadonlyMap<UpgradeType, number> {
    return this.collectionCounts;
  }

  getPermanentUpgrades(): ReadonlySet<UpgradeType> {
    return this.permanentUpgrades;
  }

  getCooldown(type: UpgradeType): number {
    return this.cooldowns.get(type) ?? 0;
  }

  getActive(): ReadonlyArray<UpgradeState> {
    return this.active;
  }
}
