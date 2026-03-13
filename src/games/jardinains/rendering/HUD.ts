import { JardinainsGameState } from "../types";

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
    state: JardinainsGameState,
    score: number,
    lives: number,
    level: number,
    levelName: string,
    width: number,
    height: number,
    deflectReady = true,
    deflectCooldownFraction = 0,
    isDeflecting = false,
  ): void {
    switch (state) {
      case "menu":
        this.renderMenu(ctx, width, height);
        break;
      case "playing":
        this.renderPlayingHUD(ctx, score, lives, level, levelName, width, deflectReady, deflectCooldownFraction, isDeflecting);
        break;
      case "level_complete":
        this.renderPlayingHUD(ctx, score, lives, level, levelName, width, deflectReady, deflectCooldownFraction, isDeflecting);
        this.renderOverlay(ctx, width, height, "Level Complete!", this.actionText("for next level"));
        break;
      case "gameover":
        this.renderOverlay(ctx, width, height, "Game Over", `Final Score: ${score}`, this.actionText("to return"));
        break;
      case "victory":
        this.renderOverlay(ctx, width, height, "Victory!", `Final Score: ${score}`, this.actionText("to return"));
        break;
    }
  }

  private actionText(suffix: string): string {
    return this.isTouchDevice ? `Tap ${suffix}` : `Click ${suffix}`;
  }

  private renderMenu(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Jardinains", width / 2, height / 2 - 60);

    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#E0E0E0";
    ctx.fillText("A Garden Gnome Brick Breaker", width / 2, height / 2 - 15);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(
      this.isTouchDevice ? "Tap to Start" : "Click to Start",
      width / 2,
      height / 2 + 40
    );

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("Move paddle with mouse/touch \u2022 Break bricks \u2022 Catch gnomes", width / 2, height / 2 + 80);

    ctx.fillText(
      this.isTouchDevice
        ? "Two-finger tap to deflect pots"
        : "Space / Right-click to deflect pots",
      width / 2, height / 2 + 100
    );

    ctx.restore();
  }

  private renderPlayingHUD(
    ctx: CanvasRenderingContext2D,
    score: number,
    lives: number,
    level: number,
    levelName: string,
    width: number,
    deflectReady: boolean,
    deflectCooldownFraction: number,
    isDeflecting: boolean,
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, width, 28);

    ctx.font = "bold 14px sans-serif";
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Score: ${score}`, 10, 14);

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Level ${level} \u2013 ${levelName}`, width / 2, 14);

    this.renderDeflectIndicator(ctx, width, deflectReady, deflectCooldownFraction, isDeflecting);

    ctx.textAlign = "right";
    ctx.fillStyle = "#FF6B6B";
    let livesText = "";
    for (let i = 0; i < lives; i++) livesText += "\u2665 ";
    ctx.fillText(livesText.trim(), width - 10, 14);

    ctx.restore();
  }

  private renderDeflectIndicator(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    ready: boolean,
    cooldownFraction: number,
    active: boolean,
  ): void {
    const x = canvasWidth - 160;
    const y = 14;
    const r = 8;

    ctx.save();

    if (active) {
      ctx.fillStyle = "#FFD700";
    } else if (ready) {
      ctx.fillStyle = "#66BB6A";
    } else {
      ctx.fillStyle = "#555";
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    if (!ready && !active && cooldownFraction > 0) {
      ctx.fillStyle = "#66BB6A";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + (1 - cooldownFraction) * Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2191", x, y);

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
