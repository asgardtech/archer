import { GameState } from "../types";

export class HUD {
  render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    score: number,
    arrowsRemaining: number,
    canvasW: number,
    canvasH: number
  ): void {
    switch (state) {
      case "menu":
        this.renderMenu(ctx, canvasW, canvasH);
        break;
      case "playing":
        this.renderPlaying(ctx, score, arrowsRemaining, canvasW);
        break;
      case "gameover":
        this.renderGameOver(ctx, score, canvasW, canvasH);
        break;
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px sans-serif";
    ctx.fillText("Balloon Archer", w / 2, h / 2 - 40);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "22px sans-serif";
    ctx.fillText("Click to Start", w / 2, h / 2 + 30);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "16px sans-serif";
    ctx.fillText("Aim with mouse \u2022 Click to shoot", w / 2, h / 2 + 70);

    ctx.restore();
  }

  private renderPlaying(
    ctx: CanvasRenderingContext2D,
    score: number,
    arrowsRemaining: number,
    w: number
  ): void {
    ctx.save();
    ctx.font = "bold 20px sans-serif";

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.fillText(`Score: ${score}`, 16, 30);

    ctx.textAlign = "right";
    ctx.fillStyle = arrowsRemaining > 10 ? "#fff" : "#e74c3c";
    ctx.fillText(`Arrows: ${arrowsRemaining}`, w - 16, 30);

    ctx.restore();
  }

  private renderGameOver(
    ctx: CanvasRenderingContext2D,
    score: number,
    w: number,
    h: number
  ): void {
    ctx.save();

    // Dim overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("Game Over", w / 2, h / 2 - 50);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`Final Score: ${score}`, w / 2, h / 2 + 10);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "20px sans-serif";
    ctx.fillText("Click to Restart", w / 2, h / 2 + 60);

    ctx.restore();
  }
}
