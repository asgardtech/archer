import { UpgradeType, UpgradeState } from "../types";

const DURATIONS: Record<UpgradeType, number> = {
  "multi-shot": 8,
  "piercing": 6,
  "rapid-fire": 5,
  "bonus-arrows": 0,
};

export class UpgradeManager {
  private active: UpgradeState[] = [];

  activate(type: UpgradeType, onInstant?: () => void): void {
    if (type === "bonus-arrows") {
      onInstant?.();
      return;
    }

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
    this.active = this.active.filter((u) => u.remainingTime > 0);
  }

  reset(): void {
    this.active = [];
  }

  getActive(): ReadonlyArray<UpgradeState> {
    return this.active;
  }
}
