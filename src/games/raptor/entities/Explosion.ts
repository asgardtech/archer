interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
}

const COLORS = ["#ff4400", "#ff8800", "#ffcc00", "#ffffff"];

export class Explosion {
  public alive = true;
  private particles: Particle[] = [];

  constructor(x: number, y: number, size = 1) {
    const count = Math.floor(8 + size * 6);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120 * size;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4 * size,
        alpha: 1,
        decay: 1.5 + Math.random() * 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  update(dt: number): void {
    if (!this.alive) return;

    let allDead = true;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      p.radius *= 1 - 0.5 * dt;
      if (p.alpha > 0) allDead = false;
    }

    if (allDead) this.alive = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    for (const p of this.particles) {
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
