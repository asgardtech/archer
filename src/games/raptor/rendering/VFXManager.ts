const MAX_SHAKE_OFFSET = 8;
const TRAIL_CAPACITY = 300;

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

interface AchievementFlash {
  alpha: number;
  duration: number;
  elapsed: number;
  width: number;
  height: number;
}

interface EmpPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  elapsed: number;
}

const MISSILE_TRAIL_COLORS: string[] = [];
const ROCKET_TRAIL_COLORS: string[] = [];
const PLASMA_TRAIL_COLORS: string[] = [];
const TIER_UP_COLORS: string[] = [];
for (let i = 0; i < 8; i++) {
  const v = 180 + i * 5;
  MISSILE_TRAIL_COLORS.push(`rgba(${v}, ${v}, ${v}, 0.6)`);
  ROCKET_TRAIL_COLORS.push(`rgba(${140 + i * 5}, ${130 + i * 4}, ${100 + i * 4}, 0.7)`);
  PLASMA_TRAIL_COLORS.push(`rgba(${140 + i * 4}, ${60 + i * 5}, ${200 + i * 7}, 0.7)`);
  TIER_UP_COLORS.push(`rgba(255, ${200 + i * 7}, ${100 + i * 12}, 0.9)`);
}

let trailColorIdx = 0;

export class VFXManager {
  private shake: ShakeState | null = null;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;
  private trailPool: Trail[];
  private trailHead = 0;
  private muzzleFlashes: MuzzleFlash[] = [];
  private megaBombFlash: MegaBombFlash | null = null;
  private megaBombRing: MegaBombRing | null = null;
  private empPulse: EmpPulse | null = null;
  private achievementFlash: AchievementFlash | null = null;

  constructor() {
    this.trailPool = new Array(TRAIL_CAPACITY);
    for (let i = 0; i < TRAIL_CAPACITY; i++) {
      this.trailPool[i] = { x: 0, y: 0, alpha: 0, size: 0, color: "" };
    }
  }

  get trails(): Trail[] {
    return this.trailPool;
  }

  private writeTrail(x: number, y: number, alpha: number, size: number, color: string): void {
    const trail = this.trailPool[this.trailHead];
    trail.x = x;
    trail.y = y;
    trail.alpha = alpha;
    trail.size = size;
    trail.color = color;
    this.trailHead = (this.trailHead + 1) % TRAIL_CAPACITY;
  }

  triggerMegaBombFlash(width: number, height: number): void {
    this.megaBombFlash = { alpha: 1, duration: 0.5, elapsed: 0, width, height };
    this.megaBombRing = {
      x: width / 2, y: height / 2,
      radius: 0, maxRadius: Math.max(width, height),
      alpha: 1, duration: 0.6, elapsed: 0,
    };
  }

  triggerEmpPulse(x: number, y: number, maxRadius: number): void {
    this.empPulse = {
      x, y,
      radius: 0,
      maxRadius,
      alpha: 1,
      duration: 0.3,
      elapsed: 0,
    };
  }

  triggerAchievementFlash(width: number, height: number): void {
    this.achievementFlash = { alpha: 1, duration: 0.3, elapsed: 0, width, height };
  }

  triggerScreenShake(intensity: number, duration: number): void {
    if (this.shake && this.shake.intensity > intensity) return;
    this.shake = { intensity, duration, elapsed: 0 };
  }

  triggerMuzzleFlash(x: number, y: number, radius = 8): void {
    this.muzzleFlashes.push({ x, y, radius, alpha: 1, duration: 0.06, elapsed: 0 });
  }

  addTrail(x: number, y: number, color: string, size = 2): void {
    this.writeTrail(x, y, 0.6, size, color);
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

    for (let i = 0; i < TRAIL_CAPACITY; i++) {
      const t = this.trailPool[i];
      if (t.alpha > 0) {
        t.alpha -= dt * 3;
        t.size *= 1 - dt * 2;
        if (t.alpha < 0.01) t.alpha = 0;
      }
    }

    let writeIdx = 0;
    for (let i = 0; i < this.muzzleFlashes.length; i++) {
      const flash = this.muzzleFlashes[i];
      flash.elapsed += dt;
      flash.alpha = Math.max(0, 1 - flash.elapsed / flash.duration);
      if (flash.elapsed < flash.duration) {
        if (writeIdx !== i) this.muzzleFlashes[writeIdx] = flash;
        writeIdx++;
      }
    }
    this.muzzleFlashes.length = writeIdx;

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

    if (this.empPulse) {
      this.empPulse.elapsed += dt;
      const progress = this.empPulse.elapsed / this.empPulse.duration;
      this.empPulse.radius = this.empPulse.maxRadius * progress;
      this.empPulse.alpha = Math.max(0, 1 - progress);
      if (this.empPulse.elapsed >= this.empPulse.duration) {
        this.empPulse = null;
      }
    }

    if (this.achievementFlash) {
      this.achievementFlash.elapsed += dt;
      this.achievementFlash.alpha = Math.max(
        0, 1 - this.achievementFlash.elapsed / this.achievementFlash.duration
      );
      if (this.achievementFlash.elapsed >= this.achievementFlash.duration) {
        this.achievementFlash = null;
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

    if (this.empPulse && this.empPulse.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.empPulse.alpha * 0.5;
      ctx.strokeStyle = "#90caf9";
      ctx.lineWidth = 3 + (1 - this.empPulse.alpha) * 6;
      ctx.beginPath();
      ctx.arc(this.empPulse.x, this.empPulse.y, this.empPulse.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = this.empPulse.alpha * 0.15;
      ctx.fillStyle = "#bbdefb";
      ctx.beginPath();
      ctx.arc(this.empPulse.x, this.empPulse.y, this.empPulse.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.achievementFlash && this.achievementFlash.alpha > 0) {
      ctx.save();
      const a = this.achievementFlash;
      const gradient = ctx.createRadialGradient(
        a.width / 2, a.height / 2, Math.min(a.width, a.height) * 0.3,
        a.width / 2, a.height / 2, Math.max(a.width, a.height) * 0.7
      );
      gradient.addColorStop(0, "rgba(255, 215, 0, 0)");
      gradient.addColorStop(1, `rgba(255, 215, 0, ${a.alpha * 0.35})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, a.width, a.height);
      ctx.restore();
    }

    if (this.shakeOffsetX !== 0 || this.shakeOffsetY !== 0) {
      ctx.restore();
    }
  }

  renderTrails(ctx: CanvasRenderingContext2D): void {
    let hasActive = false;
    for (let i = 0; i < TRAIL_CAPACITY; i++) {
      if (this.trailPool[i].alpha > 0.01) {
        hasActive = true;
        break;
      }
    }
    if (!hasActive) return;

    ctx.save();
    for (let i = 0; i < TRAIL_CAPACITY; i++) {
      const t = this.trailPool[i];
      if (t.alpha <= 0.01) continue;
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

  addEngineTrail(x: number, y: number, spacing: number): void {
    const color = "rgba(120, 110, 100, 0.3)";
    for (const side of [-1, 1]) {
      const ex = x + side * spacing / 2;
      this.writeTrail(
        ex + (Math.random() - 0.5) * 3,
        y + Math.random() * 2,
        0.3,
        1.5 + Math.random() * 1.5,
        color
      );
    }
  }

  addMissileTrail(x: number, y: number, angle = 0): void {
    const perpX = Math.cos(angle);
    const perpY = Math.sin(angle);
    const spread = (Math.random() - 0.5) * 4;
    const color = MISSILE_TRAIL_COLORS[(trailColorIdx++) & 7];
    this.writeTrail(x + perpX * spread, y + perpY * spread, 0.5, 1.5 + Math.random() * 1.5, color);
  }

  addRocketTrail(x: number, y: number, angle = 0): void {
    const perpX = Math.cos(angle);
    const perpY = Math.sin(angle);
    const spread = (Math.random() - 0.5) * 6;
    const color = ROCKET_TRAIL_COLORS[(trailColorIdx++) & 7];
    this.writeTrail(x + perpX * spread, y + perpY * spread, 0.6, 2.0 + Math.random() * 2.0, color);
  }

  addPlasmaTrail(x: number, y: number): void {
    const color = PLASMA_TRAIL_COLORS[(trailColorIdx++) & 7];
    this.writeTrail(
      x + (Math.random() - 0.5) * 3,
      y + (Math.random() - 0.5) * 2,
      0.6,
      1.5 + Math.random() * 1.5,
      color
    );
  }

  addLaserSpark(x: number, y: number): void {
    this.writeTrail(
      x + (Math.random() - 0.5) * 8,
      y,
      0.8,
      1 + Math.random() * 2,
      "rgba(100, 200, 255, 0.8)"
    );
  }

  triggerExplosionFlash(x: number, y: number, radius = 20): void {
    this.muzzleFlashes.push({ x, y, radius, alpha: 1, duration: 0.12, elapsed: 0 });
  }

  addHealParticle(from: { x: number; y: number }, to: { x: number; y: number }): void {
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const px = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 6;
      const py = from.y + (to.y - from.y) * t + (Math.random() - 0.5) * 6;
      this.writeTrail(px, py, 0.7, 1.5 + Math.random(), "rgba(100, 255, 130, 0.8)");
    }
  }

  addTeleportFlash(x: number, y: number): void {
    this.muzzleFlashes.push({ x, y, radius: 18, alpha: 1, duration: 0.1, elapsed: 0 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = 8 + Math.random() * 6;
      this.writeTrail(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        0.8, 2, "rgba(170, 68, 255, 0.8)"
      );
    }
  }

  triggerTierUpFlash(x: number, y: number): void {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const dist = 8 + Math.random() * 6;
      const color = TIER_UP_COLORS[i & 7];
      this.writeTrail(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        1.0,
        2 + Math.random() * 2,
        color
      );
    }
    this.muzzleFlashes.push({ x, y, radius: 16, alpha: 1, duration: 0.2, elapsed: 0 });
  }

  reset(): void {
    this.shake = null;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    for (let i = 0; i < TRAIL_CAPACITY; i++) {
      this.trailPool[i].alpha = 0;
    }
    this.trailHead = 0;
    this.muzzleFlashes = [];
    this.megaBombFlash = null;
    this.megaBombRing = null;
    this.empPulse = null;
    this.achievementFlash = null;
  }
}
