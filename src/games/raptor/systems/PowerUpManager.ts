import { RaptorPowerUpType } from "../types";

interface ActiveEffect {
  type: RaptorPowerUpType;
  remainingTime: number;
}

const EFFECT_DURATIONS: Partial<Record<RaptorPowerUpType, number>> = {
  "spread-shot": 8,
  "rapid-fire": 6,
};

export class PowerUpManager {
  private effects: ActiveEffect[] = [];

  activate(type: RaptorPowerUpType): void {
    const duration = EFFECT_DURATIONS[type];
    if (!duration) return;

    const existing = this.effects.find((e) => e.type === type);
    if (existing) {
      existing.remainingTime = duration;
    } else {
      this.effects.push({ type, remainingTime: duration });
    }
  }

  update(dt: number): void {
    for (const effect of this.effects) {
      effect.remainingTime -= dt;
    }
    this.effects = this.effects.filter((e) => e.remainingTime > 0);
  }

  hasUpgrade(type: RaptorPowerUpType): boolean {
    return this.effects.some((e) => e.type === type);
  }

  getActive(): ReadonlyArray<ActiveEffect> {
    return this.effects;
  }

  reset(): void {
    this.effects = [];
  }
}
