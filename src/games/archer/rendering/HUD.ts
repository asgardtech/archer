import { GameState, UpgradeState } from "../types";

const UPGRADE_DISPLAY: Record<string, { icon: string; color: string; label: string }> = {
  "multi-shot": { icon: "⫸", color: "#3498db", label: "Multi-Shot" },
  "piercing": { icon: "➤", color: "#e67e22", label: "Piercing" },
  "rapid-fire": { icon: "⚡", color: "#f1c40f", label: "Rapid Fire" },
};

interface AmmoGainText {
  amount: number;
  age: number;
  offsetY: number;
}

interface PenaltyText {
  amount: number;
  age: number;
  offsetY: number;
}

const AMMO_GAIN_DURATION = 1.5;
const AMMO_GAIN_DRIFT = 30;
const PENALTY_DURATION = 1.5;
const PENALTY_DRIFT = 30;

export class HUD {
  private ammoGainTexts: AmmoGainText[] = [];
  private penaltyTexts: PenaltyText[] = [];

  constructor(private isTouchDevice = false) {}

  showAmmoGain(amount: number): void {
    this.ammoGainTexts.push({
      amount,
      age: 0,
      offsetY: this.ammoGainTexts.length * 22,
    });
  }

  showPenalty(amount: number): void {
    this.penaltyTexts.push({
      amount,
      age: 0,
      offsetY: this.penaltyTexts.length * 22,
    });
  }

  reset(): void {
    this.ammoGainTexts = [];
    this.penaltyTexts = [];
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    score: number,
    arrowsRemaining: number,
    canvasW: number,
    canvasH: number,
    activeUpgrades: ReadonlyArray<UpgradeState> = [],
    dt = 0,
    level = 1,
    levelName = "",
    totalScore = 0
  ): void {
    for (const t of this.ammoGainTexts) {
      t.age += dt;
    }
    this.ammoGainTexts = this.ammoGainTexts.filter((t) => t.age < AMMO_GAIN_DURATION);

    for (const t of this.penaltyTexts) {
      t.age += dt;
    }
    this.penaltyTexts = this.penaltyTexts.filter((t) => t.age < PENALTY_DURATION);

    switch (state) {
      case "menu":
        this.renderMenu(ctx, canvasW, canvasH);
        break;
      case "playing":
        this.renderPlaying(ctx, score, arrowsRemaining, canvasW, activeUpgrades, level, levelName);
        break;
      case "level_complete":
        this.renderLevelComplete(ctx, score, level, levelName, canvasW, canvasH);
        break;
      case "gameover":
        this.renderGameOver(ctx, totalScore, canvasW, canvasH, level, levelName);
        break;
      case "victory":
        this.renderVictory(ctx, totalScore, canvasW, canvasH);
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
    ctx.fillText(this.isTouchDevice ? "Tap to Start" : "Click to Start", w / 2, h / 2 + 30);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "16px sans-serif";
    ctx.fillText(
      this.isTouchDevice ? "Tap to aim & shoot" : "Aim with mouse \u2022 Click to shoot",
      w / 2, h / 2 + 70
    );

    ctx.restore();
  }

  private renderPlaying(
    ctx: CanvasRenderingContext2D,
    score: number,
    arrowsRemaining: number,
    w: number,
    activeUpgrades: ReadonlyArray<UpgradeState>,
    level: number,
    levelName: string
  ): void {
    ctx.save();
    ctx.font = "bold 20px sans-serif";

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.fillText(`Score: ${score}`, 16, 30);

    ctx.textAlign = "right";
    ctx.fillStyle = arrowsRemaining > 10 ? "#fff" : "#e74c3c";
    ctx.fillText(`Arrows: ${arrowsRemaining}`, w - 16, 30);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`Level ${level} \u2014 ${levelName}`, w / 2, 24);

    ctx.textAlign = "left";
    let yOffset = 55;
    for (const upgrade of activeUpgrades) {
      const info = UPGRADE_DISPLAY[upgrade.type];
      if (!info) continue;

      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = info.color;
      ctx.fillText(`${info.icon} ${info.label} ${upgrade.remainingTime.toFixed(1)}s`, 16, yOffset);

      const barX = 16;
      const barW = 120;
      const barH = 4;
      const barY = yOffset + 5;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(barX, barY, barW, barH);

      const maxDuration = upgrade.type === "multi-shot" ? 8 : upgrade.type === "piercing" ? 6 : 5;
      const fillRatio = Math.max(0, upgrade.remainingTime / maxDuration);
      ctx.fillStyle = info.color;
      ctx.fillRect(barX, barY, barW * fillRatio, barH);

      yOffset += 26;
    }

    ctx.textAlign = "right";
    for (const t of this.ammoGainTexts) {
      const progress = t.age / AMMO_GAIN_DURATION;
      const alpha = 1 - progress;
      const drift = progress * AMMO_GAIN_DRIFT;
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = `rgba(46, 204, 113, ${alpha})`;
      ctx.fillText(`+${t.amount}`, w - 16, 50 + t.offsetY - drift);
    }

    ctx.textAlign = "left";
    for (const t of this.penaltyTexts) {
      const progress = t.age / PENALTY_DURATION;
      const alpha = 1 - progress;
      const drift = progress * PENALTY_DRIFT;
      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
      ctx.fillText(`\u2212${t.amount}`, 16, 50 + t.offsetY + drift);
    }

    ctx.restore();
  }

  private renderLevelComplete(
    ctx: CanvasRenderingContext2D,
    levelScore: number,
    level: number,
    levelName: string,
    w: number,
    h: number
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText(`Level ${level} Complete!`, w / 2, h / 2 - 60);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "24px sans-serif";
    ctx.fillText(levelName, w / 2, h / 2 - 15);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`Score: ${levelScore}`, w / 2, h / 2 + 30);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "20px sans-serif";
    ctx.fillText(
      this.isTouchDevice ? "Tap to Continue" : "Click to Continue",
      w / 2, h / 2 + 80
    );

    ctx.restore();
  }

  private renderGameOver(
    ctx: CanvasRenderingContext2D,
    totalScore: number,
    w: number,
    h: number,
    level: number,
    levelName: string
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 44px sans-serif";
    ctx.fillText("Game Over", w / 2, h / 2 - 60);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "22px sans-serif";
    ctx.fillText(`Reached: Level ${level} \u2014 ${levelName}`, w / 2, h / 2 - 15);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`Total Score: ${totalScore}`, w / 2, h / 2 + 30);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "20px sans-serif";
    ctx.fillText(this.isTouchDevice ? "Tap to Return to Menu" : "Click to Return to Menu", w / 2, h / 2 + 80);

    ctx.restore();
  }

  private renderVictory(
    ctx: CanvasRenderingContext2D,
    totalScore: number,
    w: number,
    h: number
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 52px sans-serif";
    ctx.fillText("Victory!", w / 2, h / 2 - 60);

    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.fillText("You conquered all 5 levels!", w / 2, h / 2 - 10);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`Total Score: ${totalScore}`, w / 2, h / 2 + 35);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "20px sans-serif";
    ctx.fillText(
      this.isTouchDevice ? "Tap to Return to Menu" : "Click to Return to Menu",
      w / 2, h / 2 + 85
    );

    ctx.restore();
  }
}
