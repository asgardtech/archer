import { RaptorPowerUpType, WeaponType, WEAPON_SLOT_ORDER, MAX_WEAPON_TIER } from "../types";

export interface ActiveEffect {
  type: RaptorPowerUpType;
  remainingTime: number;
}

export const EFFECT_DURATIONS: Partial<Record<RaptorPowerUpType, number>> = {
  "spread-shot": 8,
  "rapid-fire": 6,
  "deflector": 8,
};

export type WeaponSetResult = "switched" | "upgraded" | "maxed";

export class PowerUpManager {
  private effects: ActiveEffect[] = [];
  private _inventory: Map<WeaponType, number> = new Map([["machine-gun", 1]]);
  private _currentWeapon: WeaponType = "machine-gun";

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
    const existingTier = this._inventory.get(type);

    if (existingTier === undefined) {
      this._inventory.set(type, 1);
      this._currentWeapon = type;
      return "switched";
    }

    if (type === this._currentWeapon) {
      if (existingTier >= MAX_WEAPON_TIER) return "maxed";
      this._inventory.set(type, existingTier + 1);
      return "upgraded";
    }

    // Owned but not active: upgrade tier and switch to it
    if (existingTier < MAX_WEAPON_TIER) {
      this._inventory.set(type, existingTier + 1);
      this._currentWeapon = type;
      return "upgraded";
    }

    this._currentWeapon = type;
    return "switched";
  }

  switchWeapon(type: WeaponType): boolean {
    if (!this._inventory.has(type)) return false;
    if (this._currentWeapon === type) return false;
    this._currentWeapon = type;
    return true;
  }

  cycleWeapon(direction: 1 | -1): WeaponType {
    const owned = WEAPON_SLOT_ORDER.filter((w) => this._inventory.has(w));
    if (owned.length <= 1) return this._currentWeapon;

    const currentIdx = owned.indexOf(this._currentWeapon);
    const nextIdx = (currentIdx + direction + owned.length) % owned.length;
    this._currentWeapon = owned[nextIdx];
    return this._currentWeapon;
  }

  get inventory(): ReadonlyMap<WeaponType, number> {
    return this._inventory;
  }

  get currentWeapon(): WeaponType {
    return this._currentWeapon;
  }

  get weaponTier(): number {
    return this._inventory.get(this._currentWeapon) ?? 1;
  }

  setTier(tier: number): void {
    const clamped = Math.max(1, Math.min(MAX_WEAPON_TIER, Math.floor(tier)));
    this._inventory.set(this._currentWeapon, clamped);
  }

  setInventory(inventory: Map<WeaponType, number>): void {
    this._inventory = new Map(inventory);
    if (!this._inventory.has("machine-gun")) {
      this._inventory.set("machine-gun", 1);
    }
  }

  setActiveWeapon(type: WeaponType): void {
    if (this._inventory.has(type)) {
      this._currentWeapon = type;
    }
  }

  addToInventory(type: WeaponType, tier: number = 1): void {
    const clamped = Math.max(1, Math.min(MAX_WEAPON_TIER, Math.floor(tier)));
    this._inventory.set(type, clamped);
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
    this._inventory = new Map([["machine-gun", 1]]);
    this._currentWeapon = "machine-gun";
  }
}
