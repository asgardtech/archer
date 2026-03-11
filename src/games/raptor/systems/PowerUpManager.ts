import { RaptorPowerUpType, WeaponType } from "../types";

export interface ActiveEffect {
  type: RaptorPowerUpType;
  remainingTime: number;
}

export const EFFECT_DURATIONS: Partial<Record<RaptorPowerUpType, number>> = {
  "spread-shot": 8,
  "rapid-fire": 6,
};

export type WeaponSetResult = "switched" | "upgraded" | "maxed";

export class PowerUpManager {
  private effects: ActiveEffect[] = [];
  private _currentWeapon: WeaponType = "machine-gun";
  private _weaponTier: number = 1;

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

  setWeapon(type: WeaponType): WeaponSetResult {
    if (this._currentWeapon === type) {
      if (this._weaponTier >= 3) return "maxed";
      this._weaponTier++;
      return "upgraded";
    }
    this._currentWeapon = type;
    this._weaponTier = 1;
    return "switched";
  }

  get currentWeapon(): WeaponType {
    return this._currentWeapon;
  }

  get weaponTier(): number {
    return this._weaponTier;
  }

  setTier(tier: number): void {
    this._weaponTier = Math.max(1, Math.min(3, Math.floor(tier)));
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

  clearEffects(): void {
    this.effects = [];
  }

  reset(): void {
    this.effects = [];
    this._currentWeapon = "machine-gun";
    this._weaponTier = 1;
  }
}
