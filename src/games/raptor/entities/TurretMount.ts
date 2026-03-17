export interface TurretMountConfig {
  offsetX: number;
  offsetY: number;
  barrelLength: number;
  baseRadius: number;
  color: string;
  barrelColor: string;
}

export class TurretMount {
  public angle: number = -Math.PI / 2;
  public readonly config: TurretMountConfig;

  constructor(config: TurretMountConfig) {
    this.config = config;
  }

  getWorldPos(entityX: number, entityY: number): { x: number; y: number } {
    return {
      x: entityX + this.config.offsetX,
      y: entityY + this.config.offsetY,
    };
  }

  getBarrelTip(entityX: number, entityY: number): { x: number; y: number } {
    const world = this.getWorldPos(entityX, entityY);
    return {
      x: world.x + Math.cos(this.angle) * this.config.barrelLength,
      y: world.y + Math.sin(this.angle) * this.config.barrelLength,
    };
  }

  render(ctx: CanvasRenderingContext2D, entityX: number, entityY: number, glowIntensity = 0): void {
    const world = this.getWorldPos(entityX, entityY);
    const { baseRadius, barrelLength, color, barrelColor } = this.config;

    ctx.save();

    if (glowIntensity > 0) {
      ctx.beginPath();
      ctx.arc(world.x, world.y, baseRadius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(/[\d.]+\)$/, `${0.2 * glowIntensity})`);
      ctx.fill();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(world.x, world.y, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = barrelColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(world.x, world.y);
    ctx.lineTo(
      world.x + Math.cos(this.angle) * barrelLength,
      world.y + Math.sin(this.angle) * barrelLength,
    );
    ctx.stroke();

    ctx.restore();
  }
}
