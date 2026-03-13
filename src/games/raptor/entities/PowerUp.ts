import { Vec2, RaptorPowerUpType } from "../types";

const FALL_SPEED = 100;
const POWER_UP_TYPES: RaptorPowerUpType[] = ["spread-shot", "rapid-fire", "shield-restore", "bonus-life", "mega-bomb", "armor"];

const COLORS: Record<RaptorPowerUpType, string> = {
  "spread-shot": "#3498db",
  "rapid-fire": "#f39c12",
  "shield-restore": "#2ecc71",
  "bonus-life": "#e74c3c",
  "weapon-missile": "#e67e22",
  "weapon-laser": "#9b59b6",
  "weapon-plasma": "#8e44ad",
  "weapon-ion": "#00bcd4",
  "weapon-autogun": "#27ae60",
  "weapon-rocket": "#2c3e50",
  "mega-bomb": "#e74c3c",
  "armor": "#00bcd4",
};

const ICONS: Record<RaptorPowerUpType, string> = {
  "spread-shot": "W",
  "rapid-fire": "R",
  "shield-restore": "S",
  "bonus-life": "+",
  "weapon-missile": "M",
  "weapon-laser": "L",
  "weapon-plasma": "P",
  "weapon-ion": "I",
  "weapon-autogun": "A",
  "weapon-rocket": "R",
  "mega-bomb": "B",
  "armor": "A",
};

const SPRITE_KEYS: Record<RaptorPowerUpType, string> = {
  "spread-shot": "powerup_spread",
  "rapid-fire": "powerup_rapid",
  "shield-restore": "powerup_shield",
  "bonus-life": "powerup_life",
  "weapon-missile": "powerup_missile",
  "weapon-laser": "powerup_laser",
  "weapon-plasma": "powerup_plasma",
  "weapon-ion": "powerup_ion",
  "weapon-autogun": "powerup_autogun",
  "weapon-rocket": "powerup_rocket",
  "mega-bomb": "powerup_bomb",
  "armor": "powerup_armor",
};

export { SPRITE_KEYS as POWERUP_SPRITE_KEYS };

export class PowerUp {
  public pos: Vec2;
  public alive = true;
  public type: RaptorPowerUpType;
  public width = 20;
  public height = 20;

  private time = 0;
  private sprite: HTMLImageElement | null = null;

  constructor(x: number, y: number, type?: RaptorPowerUpType) {
    this.pos = { x, y };
    this.type = type ?? POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
  }

  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  get left(): number { return this.pos.x - this.width / 2; }
  get right(): number { return this.pos.x + this.width / 2; }
  get top(): number { return this.pos.y - this.height / 2; }
  get bottom(): number { return this.pos.y + this.height / 2; }

  update(dt: number, canvasHeight: number): void {
    if (!this.alive) return;
    this.pos.y += FALL_SPEED * dt;
    this.time += dt;
    if (this.pos.y > canvasHeight + 20) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    const pulse = 1 + Math.sin(this.time * 4) * 0.1;
    const s = (this.width / 2) * pulse;

    const glowAlpha = 0.2 + Math.sin(this.time * 3) * 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 215, 0, ${glowAlpha})`;
    ctx.fill();

    if (this.sprite) {
      const drawSize = s * 2;
      ctx.drawImage(this.sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[this.type];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${s}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ICONS[this.type], 0, 1);
    }

    ctx.restore();
  }
}
