const MAX_SHAKE_OFFSET = 8;

interface ShakeState {
  intensity: number;
  duration: number;
  elapsed: number;
}

interface Trail {
  x: number;
  y: number;
  alpha: number;
  size: number;
  color: string;
}

export class VFXManager {
  private shake: ShakeState | null = null;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private trails: Trail[] = [];

  triggerScreenShake(intensity: number, duration: number): void {
    if (this.shake && this.shake.intensity > intensity) return;
    this.shake = { intensity, duration, elapsed: 0 };
  }

  addTrail(x: number, y: number, color: string, size = 2): void {
    if (this.trails.length > 200) return;
    this.trails.push({ x, y, alpha: 0.6, size, color });
  }

  update(dt: number): void {
    if (this.shake) {
      this.shake.elapsed += dt;
      if (this.shake.elapsed >= this.shake.duration) {
        this.shake = null;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      } else {
        const remaining = 1 - this.shake.elapsed / this.shake.duration;
        const mag = this.shake.intensity * remaining;
        this.shakeOffsetX = (Math.random() * 2 - 1) * Math.min(mag, MAX_SHAKE_OFFSET);
        this.shakeOffsetY = (Math.random() * 2 - 1) * Math.min(mag, MAX_SHAKE_OFFSET);
      }
    }

    for (const t of this.trails) {
      t.alpha -= dt * 3;
      t.size *= 1 - dt * 2;
    }
    this.trails = this.trails.filter((t) => t.alpha > 0.01);
  }

  applyPreRender(ctx: CanvasRenderingContext2D): void {
    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      ctx.save();
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }
  }

  applyPostRender(ctx: CanvasRenderingContext2D): void {
    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      ctx.restore();
    }
  }

  renderTrails(ctx: CanvasRenderingContext2D): void {
    if (this.trails.length === 0) return;
    ctx.save();
    for (const t of this.trails) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(0.5, t.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  reset(): void {
    this.shake = null;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.trails = [];
  }
}
