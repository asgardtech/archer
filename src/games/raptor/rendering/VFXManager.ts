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

interface MuzzleFlash {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  duration: number;
  elapsed: number;
}

interface MegaBombFlash {
  alpha: number;
  duration: number;
  elapsed: number;
  width: number;
  height: number;
}

interface MegaBombRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  elapsed: number;
}

export class VFXManager {
  private shake: ShakeState | null = null;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private trails: Trail[] = [];
  private muzzleFlashes: MuzzleFlash[] = [];
  private megaBombFlash: MegaBombFlash | null = null;
  private megaBombRing: MegaBombRing | null = null;

  triggerMegaBombFlash(width: number, height: number): void {
    this.megaBombFlash = { alpha: 1, duration: 0.5, elapsed: 0, width, height };
    this.megaBombRing = {
      x: width / 2, y: height / 2,
      radius: 0, maxRadius: Math.max(width, height),
      alpha: 1, duration: 0.6, elapsed: 0,
    };
  }

  triggerScreenShake(intensity: number, duration: number): void {
    if (this.shake && this.shake.intensity > intensity) return;
    this.shake = { intensity, duration, elapsed: 0 };
  }

  triggerMuzzleFlash(x: number, y: number, radius = 8): void {
    this.muzzleFlashes.push({ x, y, radius, alpha: 1, duration: 0.06, elapsed: 0 });
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

    for (const flash of this.muzzleFlashes) {
      flash.elapsed += dt;
      flash.alpha = Math.max(0, 1 - flash.elapsed / flash.duration);
    }
    this.muzzleFlashes = this.muzzleFlashes.filter((f) => f.elapsed < f.duration);

    if (this.megaBombFlash) {
      this.megaBombFlash.elapsed += dt;
      this.megaBombFlash.alpha = Math.max(0, 1 - this.megaBombFlash.elapsed / this.megaBombFlash.duration);
      if (this.megaBombFlash.elapsed >= this.megaBombFlash.duration) {
        this.megaBombFlash = null;
      }
    }

    if (this.megaBombRing) {
      this.megaBombRing.elapsed += dt;
      const progress = this.megaBombRing.elapsed / this.megaBombRing.duration;
      this.megaBombRing.radius = this.megaBombRing.maxRadius * progress;
      this.megaBombRing.alpha = Math.max(0, 1 - progress);
      if (this.megaBombRing.elapsed >= this.megaBombRing.duration) {
        this.megaBombRing = null;
      }
    }
  }

  applyPreRender(ctx: CanvasRenderingContext2D): void {
    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      ctx.save();
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }
  }

  applyPostRender(ctx: CanvasRenderingContext2D): void {
    if (this.megaBombFlash && this.megaBombFlash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.megaBombFlash.alpha;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, this.megaBombFlash.width, this.megaBombFlash.height);
      ctx.restore();
    }

    if (this.megaBombRing && this.megaBombRing.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.megaBombRing.alpha * 0.6;
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 4 + (1 - this.megaBombRing.alpha) * 8;
      ctx.beginPath();
      ctx.arc(this.megaBombRing.x, this.megaBombRing.y, this.megaBombRing.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

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

  renderMuzzleFlashes(ctx: CanvasRenderingContext2D): void {
    if (this.muzzleFlashes.length === 0) return;
    ctx.save();
    for (const flash of this.muzzleFlashes) {
      ctx.globalAlpha = flash.alpha * 0.7;
      const gradient = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.radius);
      gradient.addColorStop(0, "rgba(255, 255, 200, 1)");
      gradient.addColorStop(0.4, "rgba(255, 200, 50, 0.6)");
      gradient.addColorStop(1, "rgba(255, 150, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, flash.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  addMissileTrail(x: number, y: number, angle = 0): void {
    if (this.trails.length > 300) return;
    const perpX = Math.cos(angle);
    const perpY = Math.sin(angle);
    const spread = (Math.random() - 0.5) * 4;
    this.trails.push({
      x: x + perpX * spread,
      y: y + perpY * spread,
      alpha: 0.5,
      size: 1.5 + Math.random() * 1.5,
      color: `rgba(${180 + Math.random() * 40}, ${180 + Math.random() * 40}, ${180 + Math.random() * 40}, 0.6)`,
    });
  }

  addRocketTrail(x: number, y: number, angle = 0): void {
    if (this.trails.length > 300) return;
    const perpX = Math.cos(angle);
    const perpY = Math.sin(angle);
    const spread = (Math.random() - 0.5) * 6;
    this.trails.push({
      x: x + perpX * spread,
      y: y + perpY * spread,
      alpha: 0.6,
      size: 2.0 + Math.random() * 2.0,
      color: `rgba(${140 + Math.random() * 40}, ${130 + Math.random() * 30}, ${100 + Math.random() * 30}, 0.7)`,
    });
  }

  addPlasmaTrail(x: number, y: number): void {
    if (this.trails.length > 300) return;
    this.trails.push({
      x: x + (Math.random() - 0.5) * 3,
      y: y + (Math.random() - 0.5) * 2,
      alpha: 0.6,
      size: 1.5 + Math.random() * 1.5,
      color: `rgba(${140 + Math.random() * 30}, ${60 + Math.random() * 40}, ${200 + Math.random() * 55}, 0.7)`,
    });
  }

  addLaserSpark(x: number, y: number): void {
    if (this.trails.length > 300) return;
    this.trails.push({
      x: x + (Math.random() - 0.5) * 8,
      y,
      alpha: 0.8,
      size: 1 + Math.random() * 2,
      color: `rgba(100, 200, 255, 0.8)`,
    });
  }

  triggerExplosionFlash(x: number, y: number, radius = 20): void {
    this.muzzleFlashes.push({ x, y, radius, alpha: 1, duration: 0.12, elapsed: 0 });
  }

  triggerTierUpFlash(x: number, y: number): void {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = 8 + Math.random() * 6;
      this.trails.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 1.0,
        size: 2 + Math.random() * 2,
        color: `rgba(255, ${200 + Math.floor(Math.random() * 55)}, ${100 + Math.floor(Math.random() * 100)}, 0.9)`,
      });
    }
    this.muzzleFlashes.push({ x, y, radius: 16, alpha: 1, duration: 0.2, elapsed: 0 });
  }

  reset(): void {
    this.shake = null;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.trails = [];
    this.muzzleFlashes = [];
    this.megaBombFlash = null;
    this.megaBombRing = null;
  }
}
