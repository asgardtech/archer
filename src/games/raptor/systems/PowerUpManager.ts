import { RaptorPowerUpType, WeaponType } from "../types";

export interface ActiveEffect {
  type: RaptorPowerUpType;
  remainingTime: number;
}

export const EFFECT_DURATIONS: Partial<Record<RaptorPowerUpType, number>> = {
  "spread-shot": 8,
  "rapid-fire": 6,
};

export class PowerUpManager {
  private effects: ActiveEffect[] = [];
  private _currentWeapon: WeaponType = "machine-gun";
  private _weaponChanged = false;

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

  setWeapon(type: WeaponType): boolean {
    if (this._currentWeapon === type) return false;
    this._currentWeapon = type;
    this._weaponChanged = true;
    return true;
  }

  get currentWeapon(): WeaponType {
    return this._currentWeapon;
  }

  consumeWeaponChanged(): boolean {
    const changed = this._weaponChanged;
    this._weaponChanged = false;
    return changed;
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
    this._currentWeapon = "machine-gun";
    this._weaponChanged = false;
  }
}
