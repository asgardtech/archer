export interface PerformanceSettings {
  targetFps: 30 | 60 | "uncapped";
  particleDensity: "low" | "medium" | "high";
  scanlinesEnabled: boolean;
}

export class PerformanceManager {
  private hidden = false;
  private visibilityCallbacks: ((hidden: boolean) => void)[] = [];
  private boundHandler: (() => void) | null = null;
  private lastFrameTime = 0;
  private frameInterval = 0;
  private _settings: PerformanceSettings = {
    targetFps: "uncapped",
    particleDensity: "high",
    scanlinesEnabled: true,
  };
  private frameBudgetExceeded = 0;
  private static readonly FRAME_BUDGET_MS = 20;
  private static readonly ADAPT_THRESHOLD = 30;

  constructor() {
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      this.boundHandler = this.handleVisibilityChange.bind(this);
      document.addEventListener("visibilitychange", this.boundHandler);
    }
  }

  private handleVisibilityChange(): void {
    this.hidden = document.hidden;
    for (const cb of this.visibilityCallbacks) {
      cb(this.hidden);
    }
  }

  onVisibilityChange(callback: (hidden: boolean) => void): void {
    this.visibilityCallbacks.push(callback);
  }

  shouldRenderFrame(timestamp: number): boolean {
    if (this.frameInterval <= 0) return true;
    if (timestamp - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = timestamp;
      return true;
    }
    return false;
  }

  trackFrameTime(frameTimeMs: number): void {
    if (frameTimeMs > PerformanceManager.FRAME_BUDGET_MS) {
      this.frameBudgetExceeded++;
      if (this.frameBudgetExceeded >= PerformanceManager.ADAPT_THRESHOLD) {
        this.reduceQuality();
        this.frameBudgetExceeded = 0;
      }
    } else {
      this.frameBudgetExceeded = Math.max(0, this.frameBudgetExceeded - 1);
    }
  }

  private reduceQuality(): void {
    if (this._settings.particleDensity === "high") {
      this._settings.particleDensity = "medium";
    } else if (this._settings.particleDensity === "medium") {
      this._settings.particleDensity = "low";
      this._settings.scanlinesEnabled = false;
    }
  }

  getSettings(): PerformanceSettings {
    return this._settings;
  }

  get trailCap(): number {
    switch (this._settings.particleDensity) {
      case "low": return 100;
      case "medium": return 200;
      case "high": return 300;
    }
  }

  setTargetFps(fps: 30 | 60 | "uncapped"): void {
    this._settings.targetFps = fps;
    this.frameInterval = fps === "uncapped" ? 0 : 1000 / fps;
  }

  get isHidden(): boolean {
    return this.hidden;
  }

  destroy(): void {
    if (this.boundHandler && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
      document.removeEventListener("visibilitychange", this.boundHandler);
      this.boundHandler = null;
    }
    this.visibilityCallbacks = [];
  }
}
