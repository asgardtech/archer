import { RaptorGameState, RaptorPowerUpType } from "../types";
import { AssetLoader } from "./AssetLoader";

const MUTE_BTN_SIZE = 36;
const MUTE_BTN_MARGIN = 12;

interface ActiveEffect {
  type: RaptorPowerUpType;
  remainingTime: number;
}

const EFFECT_MAX_DURATIONS: Partial<Record<RaptorPowerUpType, number>> = {
  "spread-shot": 8,
  "rapid-fire": 6,
};

const EFFECT_COLORS: Partial<Record<RaptorPowerUpType, string>> = {
  "spread-shot": "#3498db",
  "rapid-fire": "#f39c12",
};

const EFFECT_LABELS: Partial<Record<RaptorPowerUpType, string>> = {
  "spread-shot": "SPR",
  "rapid-fire": "RPD",
};

export class HUD {
  private isTouchDevice: boolean;
  private assets: AssetLoader | null = null;

  constructor(isTouchDevice: boolean) {
    this.isTouchDevice = isTouchDevice;
  }

  setAssets(assets: AssetLoader): void {
    this.assets = assets;
  }

  renderMuteButton(ctx: CanvasRenderingContext2D, muted: boolean, canvasW: number): void {
    const x = canvasW - MUTE_BTN_SIZE - MUTE_BTN_MARGIN;
    const y = MUTE_BTN_MARGIN;
    const size = MUTE_BTN_SIZE;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();

    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(muted ? "\u{1F507}" : "\u{1F50A}", x + size / 2, y + size / 2);
    ctx.restore();
  }

  isMuteButtonHit(clickX: number, clickY: number, canvasW: number): boolean {
    const x = canvasW - MUTE_BTN_SIZE - MUTE_BTN_MARGIN;
    const y = MUTE_BTN_MARGIN;
    return (
      clickX >= x &&
      clickX <= x + MUTE_BTN_SIZE &&
      clickY >= y &&
      clickY <= y + MUTE_BTN_SIZE
    );
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: RaptorGameState,
    score: number,
    lives: number,
    shield: number,
    level: number,
    levelName: string,
    width: number,
    height: number,
    activeEffects?: ReadonlyArray<ActiveEffect>
  ): void {
    switch (state) {
      case "loading":
        break;
      case "menu":
        this.renderMenu(ctx, width, height);
        break;
      case "playing":
        this.renderPlayingHUD(ctx, score, lives, shield, level, levelName, width, activeEffects);
        break;
      case "level_complete":
        this.renderPlayingHUD(ctx, score, lives, shield, level, levelName, width, activeEffects);
        this.renderOverlay(ctx, width, height, "Level Complete!",
          this.actionText("for next level"));
        break;
      case "gameover":
        this.renderOverlay(ctx, width, height, "Game Over",
          `Final Score: ${score}`, this.actionText("to return"));
        break;
      case "victory":
        this.renderOverlay(ctx, width, height, "Victory!",
          `Final Score: ${score}`, this.actionText("to return"));
        break;
    }
  }

  renderLoadingScreen(
    ctx: CanvasRenderingContext2D,
    progress: number,
    width: number,
    height: number
  ): void {
    ctx.save();

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#050510");
    grad.addColorStop(1, "#0a1628");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RAPTOR SKIES", width / 2, height / 2 - 60);

    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#8899BB";
    ctx.fillText("Loading assets...", width / 2, height / 2 - 20);

    const barW = 300;
    const barH = 12;
    const barX = (width - barW) / 2;
    const barY = height / 2 + 10;

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.roundedRect(ctx, barX, barY, barW, barH, 6);
    ctx.fill();

    if (progress > 0) {
      const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      fillGrad.addColorStop(0, "#3498db");
      fillGrad.addColorStop(1, "#2ecc71");
      ctx.fillStyle = fillGrad;
      this.roundedRect(ctx, barX, barY, barW * Math.min(1, progress), barH, 6);
      ctx.fill();
    }

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#667799";
    ctx.fillText(`${Math.floor(progress * 100)}%`, width / 2, barY + barH + 18);

    ctx.restore();
  }

  private actionText(suffix: string): string {
    return this.isTouchDevice ? `Tap ${suffix}` : `Click ${suffix}`;
  }

  private renderMenu(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const panelW = 420;
    const panelH = 220;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2 - 10;

    const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
    panelGrad.addColorStop(0, "rgba(20, 30, 60, 0.85)");
    panelGrad.addColorStop(1, "rgba(10, 15, 30, 0.9)");
    ctx.fillStyle = panelGrad;
    this.roundedRect(ctx, px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(100, 140, 220, 0.3)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Raptor Skies", width / 2, py + 50);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#B0C4DE";
    ctx.fillText("A Vertical Scrolling Shoot-em-up", width / 2, py + 90);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(
      this.isTouchDevice ? "Tap to Start" : "Click to Start",
      width / 2,
      py + 140
    );

    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#8899AA";
    ctx.fillText(
      this.isTouchDevice
        ? "Touch to move \u2022 Auto-fire \u2022 Destroy enemies"
        : "Mouse/WASD to move \u2022 Auto-fire \u2022 Destroy enemies",
      width / 2,
      py + 180
    );

    ctx.restore();
  }

  private renderPlayingHUD(
    ctx: CanvasRenderingContext2D,
    score: number,
    lives: number,
    shield: number,
    level: number,
    levelName: string,
    width: number,
    activeEffects?: ReadonlyArray<ActiveEffect>
  ): void {
    ctx.save();

    const panelGrad = ctx.createLinearGradient(0, 0, 0, 44);
    panelGrad.addColorStop(0, "rgba(0, 10, 30, 0.7)");
    panelGrad.addColorStop(1, "rgba(0, 5, 15, 0.5)");
    ctx.fillStyle = panelGrad;
    ctx.fillRect(0, 0, width, 44);

    ctx.strokeStyle = "rgba(100, 160, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.lineTo(width, 44);
    ctx.stroke();

    ctx.font = "bold 14px sans-serif";
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Score: ${score}`, 10, 14);

    this.renderLivesIcons(ctx, lives, 10, 28);

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Level ${level} \u2013 ${levelName}`, width / 2, 14);

    const barW = 120;
    const barH = 8;
    const barX = width / 2 - barW / 2;
    const barY = 26;

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.roundedRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const shieldFrac = Math.max(0, shield / 100);
    if (shieldFrac > 0) {
      const shieldGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      if (shieldFrac > 0.5) {
        shieldGrad.addColorStop(0, "#2980b9");
        shieldGrad.addColorStop(1, "#3498db");
      } else if (shieldFrac > 0.25) {
        shieldGrad.addColorStop(0, "#d4ac0d");
        shieldGrad.addColorStop(1, "#f1c40f");
      } else {
        shieldGrad.addColorStop(0, "#c0392b");
        shieldGrad.addColorStop(1, "#e74c3c");
      }
      ctx.fillStyle = shieldGrad;
      this.roundedRect(ctx, barX, barY, barW * shieldFrac, barH, 4);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.5;
    this.roundedRect(ctx, barX, barY, barW, barH, 4);
    ctx.stroke();

    ctx.font = "9px sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.textAlign = "center";
    ctx.fillText("SHIELD", width / 2, barY + barH + 8);

    if (activeEffects && activeEffects.length > 0) {
      this.renderActiveEffects(ctx, activeEffects, width);
    }

    ctx.restore();
  }

  private renderLivesIcons(ctx: CanvasRenderingContext2D, lives: number, startX: number, y: number): void {
    const playerSprite = this.assets?.getOptional("player");
    const iconSize = 12;
    const gap = 3;

    for (let i = 0; i < lives; i++) {
      const ix = startX + i * (iconSize + gap);
      if (playerSprite) {
        ctx.drawImage(playerSprite, ix, y - iconSize / 2, iconSize, iconSize);
      } else {
        ctx.fillStyle = "#FF6B6B";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("\u2665", ix, y);
      }
    }
  }

  private renderActiveEffects(
    ctx: CanvasRenderingContext2D,
    effects: ReadonlyArray<ActiveEffect>,
    width: number
  ): void {
    const startX = width - 90;
    const startY = 8;
    const itemH = 16;

    for (let i = 0; i < effects.length; i++) {
      const eff = effects[i];
      const y = startY + i * (itemH + 4);
      const maxDur = EFFECT_MAX_DURATIONS[eff.type] ?? 8;
      const frac = Math.max(0, eff.remainingTime / maxDur);
      const color = EFFECT_COLORS[eff.type] ?? "#888";
      const label = EFFECT_LABELS[eff.type] ?? "?";

      const sprite = this.assets?.getOptional(
        eff.type === "spread-shot" ? "powerup_spread" : "powerup_rapid"
      );

      if (sprite) {
        ctx.drawImage(sprite, startX - 18, y, 14, 14);
      }

      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(label, startX, y + 7);

      const barX = startX + 26;
      const barW = 50;
      const barH2 = 6;
      const barY = y + 4;

      ctx.fillStyle = "rgba(255,255,255,0.1)";
      this.roundedRect(ctx, barX, barY, barW, barH2, 3);
      ctx.fill();

      ctx.fillStyle = color;
      this.roundedRect(ctx, barX, barY, barW * frac, barH2, 3);
      ctx.fill();
    }
  }

  private renderOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    title: string,
    ...lines: string[]
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);

    const panelW = 380;
    const panelH = 160 + lines.length * 30;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;

    const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
    panelGrad.addColorStop(0, "rgba(15, 25, 50, 0.9)");
    panelGrad.addColorStop(1, "rgba(5, 10, 25, 0.95)");
    ctx.fillStyle = panelGrad;
    this.roundedRect(ctx, px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(100, 140, 220, 0.25)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(title, width / 2, py + 55);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#D0D8E8";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, py + 100 + i * 30);
    }

    ctx.restore();
  }

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
}
