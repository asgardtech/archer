import { PowerUpType } from "../types";

export interface ActivePowerUp {
  type: PowerUpType;
  remainingTime: number;
}

export class PowerUpManager {
  public stickyActive = false;
  public stickyUsed = false;
  private widePaddleTimer = 0;

  activate(type: PowerUpType): { spawnMultiBall: boolean; extraLife: boolean } {
    const result = { spawnMultiBall: false, extraLife: false };

    switch (type) {
      case "wide-paddle":
        this.widePaddleTimer = 10;
        break;
      case "multi-ball":
        result.spawnMultiBall = true;
        break;
      case "sticky":
        this.stickyActive = true;
        this.stickyUsed = false;
        break;
      case "extra-life":
        result.extraLife = true;
        break;
      case "shield":
        break;
    }

    return result;
  }

  update(dt: number): void {
    if (this.widePaddleTimer > 0) {
      this.widePaddleTimer -= dt;
      if (this.widePaddleTimer <= 0) {
        this.widePaddleTimer = 0;
      }
    }
  }

  isWidePaddleActive(): boolean {
    return this.widePaddleTimer > 0;
  }

  consumeSticky(): void {
    if (this.stickyActive) {
      this.stickyUsed = true;
      this.stickyActive = false;
    }
  }

  reset(): void {
    this.stickyActive = false;
    this.stickyUsed = false;
    this.widePaddleTimer = 0;
  }
}
