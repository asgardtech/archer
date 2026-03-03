import { Balloon } from "../entities/Balloon";

const INITIAL_INTERVAL = 2.0;
const MIN_INTERVAL = 0.8;
const RAMP_RATE = 0.005; // seconds reduction per second of gameplay

export class Spawner {
  private timer = 0;
  private interval = INITIAL_INTERVAL;
  private elapsed = 0;

  reset(): void {
    this.timer = 0;
    this.interval = INITIAL_INTERVAL;
    this.elapsed = 0;
  }

  update(dt: number, canvasW: number, canvasH: number): Balloon | null {
    this.elapsed += dt;
    this.interval = Math.max(MIN_INTERVAL, INITIAL_INTERVAL - this.elapsed * RAMP_RATE);
    this.timer += dt;

    if (this.timer >= this.interval) {
      this.timer -= this.interval;
      const margin = 50;
      const x = margin + Math.random() * (canvasW - margin * 2);
      const speed = 60 + Math.random() * 40;
      return new Balloon(x, canvasH + 40, speed);
    }
    return null;
  }
}
