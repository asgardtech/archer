import { RaptorGameState } from "../types";

const MUTE_BTN_SIZE = 36;
const MUTE_BTN_MARGIN = 12;

export class HUD {
  private isTouchDevice: boolean;

  constructor(isTouchDevice: boolean) {
    this.isTouchDevice = isTouchDevice;
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
    height: number
  ): void {
    switch (state) {
      case "menu":
        this.renderMenu(ctx, width, height);
        break;
      case "playing":
        this.renderPlayingHUD(ctx, score, lives, shield, level, levelName, width);
        break;
      case "level_complete":
        this.renderPlayingHUD(ctx, score, lives, shield, level, levelName, width);
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

  private actionText(suffix: string): string {
    return this.isTouchDevice ? `Tap ${suffix}` : `Click ${suffix}`;
  }

  private renderMenu(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Raptor Skies", width / 2, height / 2 - 60);

    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#B0C4DE";
    ctx.fillText("A Vertical Scrolling Shoot-em-up", width / 2, height / 2 - 15);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(
      this.isTouchDevice ? "Tap to Start" : "Click to Start",
      width / 2,
      height / 2 + 40
    );

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText(
      this.isTouchDevice
        ? "Touch to move \u2022 Auto-fire \u2022 Destroy enemies"
        : "Mouse/WASD to move \u2022 Auto-fire \u2022 Destroy enemies",
      width / 2,
      height / 2 + 80
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
    width: number
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, width, 40);

    ctx.font = "bold 14px sans-serif";
    ctx.textBaseline = "middle";

    // Score
    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Score: ${score}`, 10, 12);

    // Lives
    ctx.fillStyle = "#FF6B6B";
    let livesText = "";
    for (let i = 0; i < lives; i++) livesText += "\u2665 ";
    ctx.fillText(livesText.trim(), 10, 28);

    // Level name
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Level ${level} \u2013 ${levelName}`, width / 2, 12);

    // Shield bar
    const barW = 120;
    const barH = 8;
    const barX = width / 2 - barW / 2;
    const barY = 24;

    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.fillRect(barX, barY, barW, barH);

    const shieldFrac = Math.max(0, shield / 100);
    const shieldColor = shieldFrac > 0.5 ? "#3498db" : shieldFrac > 0.25 ? "#f1c40f" : "#e74c3c";
    ctx.fillStyle = shieldColor;
    ctx.fillRect(barX, barY, barW * shieldFrac, barH);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText("SHIELD", width / 2, barY + barH + 8);

    ctx.restore();
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

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 40px sans-serif";
    ctx.fillText(title, width / 2, height / 2 - 30);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#E0E0E0";
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, height / 2 + 15 + i * 30);
    }

    ctx.restore();
  }
}
