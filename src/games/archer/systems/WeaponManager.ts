import { UpgradeType, WeaponType, WEAPON_SLOTS } from "../types";

const BONUS_ARROWS_ON_DUPLICATE = 5;
const BONUS_ARROWS_INSTANT = 10;

export class WeaponManager {
  currentWeapon: WeaponType = "default";
  private _unlockedWeapons: Set<WeaponType> = new Set(["default"]);

  get unlockedWeapons(): ReadonlySet<WeaponType> {
    return this._unlockedWeapons;
  }

  unlock(type: WeaponType): void {
    this._unlockedWeapons.add(type);
  }

  switchTo(type: WeaponType): boolean {
    if (!this._unlockedWeapons.has(type)) return false;
    if (this.currentWeapon === type) return false;
    this.currentWeapon = type;
    return true;
  }

  isUnlocked(type: WeaponType): boolean {
    return this._unlockedWeapons.has(type);
  }

  getOrderedInventory(): readonly WeaponType[] {
    return WEAPON_SLOTS;
  }

  /**
   * Handle collecting an upgrade balloon.
   * Returns: { isNewWeapon, bonusArrows }
   *  - isNewWeapon: true if the weapon was just unlocked for the first time
   *  - bonusArrows: number of bonus arrows granted (for duplicate weapons or bonus-arrows)
   */
  collectUpgrade(
    type: UpgradeType,
    onInstant?: (amount: number) => void
  ): { isNewWeapon: boolean; bonusArrows: number } {
    if (type === "bonus-arrows") {
      const amount = BONUS_ARROWS_INSTANT;
      onInstant?.(amount);
      return { isNewWeapon: false, bonusArrows: amount };
    }

    const weaponType = type as WeaponType;
    if (!this._unlockedWeapons.has(weaponType)) {
      this.unlock(weaponType);
      this.currentWeapon = weaponType;
      return { isNewWeapon: true, bonusArrows: 0 };
    }

    const amount = BONUS_ARROWS_ON_DUPLICATE;
    onInstant?.(amount);
    return { isNewWeapon: false, bonusArrows: amount };
  }

  resetAll(): void {
    this._unlockedWeapons = new Set(["default"]);
    this.currentWeapon = "default";
  }

  resetForNewLevel(): void {
    // Unlocks and selection persist across levels — nothing to do
  }
}
