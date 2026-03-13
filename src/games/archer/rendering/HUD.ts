import { GameState, WeaponType, WEAPON_SLOTS } from "../types";

const WEAPON_DISPLAY: Record<WeaponType, { icon: string; color: string; label: string }> = {
  "default":    { icon: "🏹", color: "#ecf0f1", label: "STD" },
  "multi-shot": { icon: "⫸",  color: "#3498db", label: "MULTI" },
  "piercing":   { icon: "➤",  color: "#e67e22", label: "PIERC" },
  "rapid-fire": { icon: "⚡", color: "#f1c40f", label: "RAPID" },
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

interface WeaponNotification {
  label: string;
  age: number;
}

const AMMO_GAIN_DURATION = 1.5;
const AMMO_GAIN_DRIFT = 30;
const PENALTY_DURATION = 1.5;
const PENALTY_DRIFT = 30;
const WEAPON_NOTIFY_DURATION = 2.0;

const MUTE_BTN_SIZE = 36;
const MUTE_BTN_MARGIN = 12;

export const TOOLBAR_HEIGHT = 64;
const SLOT_SIZE = 56;
const SLOT_GAP = 8;
const SLOT_BORDER_RADIUS = 6;

export class HUD {
  private ammoGainTexts: AmmoGainText[] = [];
  private penaltyTexts: PenaltyText[] = [];
  private upgradeIcons: Map<string, HTMLImageElement> = new Map();
  private weaponNotification: WeaponNotification | null = null;
  public loadingProgress = 0;

  constructor(private isTouchDevice = false) {}

  setUpgradeIcons(icons: Map<string, HTMLImageElement>): void {
    this.upgradeIcons = icons;
  }

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

  showWeaponNotification(label: string): void {
    this.weaponNotification = { label, age: 0 };
  }

  reset(): void {
    this.ammoGainTexts = [];
    this.penaltyTexts = [];
    this.weaponNotification = null;
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    score: number,
    arrowsRemaining: number,
    canvasW: number,
    canvasH: number,
    currentWeapon: WeaponType = "default",
    unlockedWeapons: ReadonlySet<WeaponType> = new Set(["default"]),
    dt = 0,
    level = 1,
    levelName = "",
    totalScore = 0,
    landmarkLabel = "",
    landmarkDescription = ""
  ): void {
    for (const t of this.ammoGainTexts) {
      t.age += dt;
    }
    this.ammoGainTexts = this.ammoGainTexts.filter((t) => t.age < AMMO_GAIN_DURATION);

    for (const t of this.penaltyTexts) {
      t.age += dt;
    }
    this.penaltyTexts = this.penaltyTexts.filter((t) => t.age < PENALTY_DURATION);

    if (this.weaponNotification) {
      this.weaponNotification.age += dt;
      if (this.weaponNotification.age >= WEAPON_NOTIFY_DURATION) {
        this.weaponNotification = null;
      }
    }

    switch (state) {
      case "loading":
        this.renderLoading(ctx, canvasW, canvasH);
        break;
      case "menu":
        this.renderMenu(ctx, canvasW, canvasH);
        break;
      case "story_intro":
      case "story_ending":
        break;
      case "level_intro":
        this.renderLevelIntro(ctx, level, levelName, landmarkLabel, landmarkDescription, canvasW, canvasH);
        break;
      case "playing":
        this.renderPlaying(ctx, score, arrowsRemaining, canvasW, canvasH, currentWeapon, unlockedWeapons, level, levelName);
        break;
      case "level_complete":
        this.renderLevelComplete(ctx, score, level, levelName, landmarkLabel, canvasW, canvasH);
        break;
      case "gameover":
        this.renderGameOver(ctx, totalScore, canvasW, canvasH, level, levelName);
        break;
      case "victory":
        this.renderVictory(ctx, totalScore, canvasW, canvasH);
        break;
    }
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

  getWeaponSlotAtPoint(x: number, y: number, canvasW: number, canvasH: number): number | null {
    const totalW = WEAPON_SLOTS.length * SLOT_SIZE + (WEAPON_SLOTS.length - 1) * SLOT_GAP;
    const startX = (canvasW - totalW) / 2;
    const slotY = canvasH - TOOLBAR_HEIGHT + (TOOLBAR_HEIGHT - SLOT_SIZE) / 2;

    for (let i = 0; i < WEAPON_SLOTS.length; i++) {
      const sx = startX + i * (SLOT_SIZE + SLOT_GAP);
      if (x >= sx && x <= sx + SLOT_SIZE && y >= slotY && y <= slotY + SLOT_SIZE) {
        return i + 1;
      }
    }
    return null;
  }

  private renderLoading(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("Loading...", w / 2, h / 2 - 30);

    const barW = 240;
    const barH = 12;
    const barX = (w - barW) / 2;
    const barY = h / 2 + 10;

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(barX, barY, barW, barH);

    ctx.fillStyle = "#3498db";
    ctx.fillRect(barX, barY, barW * this.loadingProgress, barH);

    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.restore();
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
    h: number,
    currentWeapon: WeaponType,
    unlockedWeapons: ReadonlySet<WeaponType>,
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

    this.renderWeaponBar(ctx, w, h, currentWeapon, unlockedWeapons);

    if (this.weaponNotification) {
      const progress = this.weaponNotification.age / WEAPON_NOTIFY_DURATION;
      const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.7 ? (1 - progress) / 0.3 : 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 22px sans-serif";
      ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
      ctx.fillText(
        `NEW WEAPON: ${this.weaponNotification.label}`,
        w / 2,
        h / 2 - 60
      );
    }

    ctx.restore();
  }

  private renderWeaponBar(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    currentWeapon: WeaponType,
    unlockedWeapons: ReadonlySet<WeaponType>
  ): void {
    const totalW = WEAPON_SLOTS.length * SLOT_SIZE + (WEAPON_SLOTS.length - 1) * SLOT_GAP;
    const startX = (canvasW - totalW) / 2;
    const barY = canvasH - TOOLBAR_HEIGHT;
    const slotY = barY + (TOOLBAR_HEIGHT - SLOT_SIZE) / 2;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, barY, canvasW, TOOLBAR_HEIGHT);

    for (let i = 0; i < WEAPON_SLOTS.length; i++) {
      const weapon = WEAPON_SLOTS[i];
      const isActive = weapon === currentWeapon;
      const isUnlocked = unlockedWeapons.has(weapon);
      const sx = startX + i * (SLOT_SIZE + SLOT_GAP);
      const display = WEAPON_DISPLAY[weapon];

      ctx.fillStyle = isActive
        ? "rgba(255, 215, 0, 0.25)"
        : isUnlocked
          ? "rgba(255, 255, 255, 0.12)"
          : "rgba(0, 0, 0, 0.3)";
      ctx.beginPath();
      ctx.roundRect(sx, slotY, SLOT_SIZE, SLOT_SIZE, SLOT_BORDER_RADIUS);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2.5;
      } else if (isUnlocked) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
      }
      ctx.beginPath();
      ctx.roundRect(sx, slotY, SLOT_SIZE, SLOT_SIZE, SLOT_BORDER_RADIUS);
      ctx.stroke();

      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = isActive ? "#FFD700" : "rgba(255,255,255,0.6)";
      ctx.fillText(`${i + 1}`, sx + 4, slotY + 3);

      const iconKey = this.getWeaponIconKey(weapon);
      const iconImg = iconKey ? this.upgradeIcons.get(iconKey) : null;
      const iconSize = 24;
      const iconX = sx + (SLOT_SIZE - iconSize) / 2;
      const iconY = slotY + 10;

      if (isUnlocked) {
        if (iconImg) {
          if (!isActive) ctx.globalAlpha = 0.8;
          ctx.drawImage(iconImg, iconX, iconY, iconSize, iconSize);
          ctx.globalAlpha = 1;
        } else {
          ctx.font = "18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = display.color;
          ctx.fillText(display.icon, sx + SLOT_SIZE / 2, slotY + 22);
        }

        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillStyle = isActive ? display.color : "rgba(255,255,255,0.6)";
        ctx.fillText(display.label, sx + SLOT_SIZE / 2, slotY + SLOT_SIZE - 3);
      } else {
        ctx.font = "18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillText("🔒", sx + SLOT_SIZE / 2, slotY + SLOT_SIZE / 2);
      }
    }

    ctx.restore();
  }

  private getWeaponIconKey(weapon: WeaponType): string | null {
    switch (weapon) {
      case "multi-shot": return "multi-shot";
      case "piercing":   return "piercing";
      case "rapid-fire": return "rapid-fire";
      default:           return null;
    }
  }

  private renderLevelComplete(
    ctx: CanvasRenderingContext2D,
    levelScore: number,
    level: number,
    levelName: string,
    landmarkLabel: string,
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
    ctx.fillText(`Level ${level} Complete!`, w / 2, h / 2 - 70);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "24px sans-serif";
    ctx.fillText(levelName, w / 2, h / 2 - 30);

    if (landmarkLabel.length > 0) {
      ctx.fillStyle = "#f1c40f";
      ctx.font = "italic 22px sans-serif";
      ctx.fillText(`${landmarkLabel} has been liberated!`, w / 2, h / 2 + 5);
    }

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`Score: ${levelScore}`, w / 2, h / 2 + 45);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "20px sans-serif";
    ctx.fillText(
      this.isTouchDevice ? "Tap to Continue" : "Click to Continue",
      w / 2, h / 2 + 105
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

  private renderLevelIntro(
    ctx: CanvasRenderingContext2D,
    level: number,
    levelName: string,
    landmarkLabel: string,
    landmarkDescription: string,
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
    ctx.fillText(`Level ${level} — ${levelName}`, w / 2, h / 2 - 70);

    ctx.fillStyle = "#f1c40f";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(landmarkLabel, w / 2, h / 2 - 15);

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "italic 20px sans-serif";
    ctx.fillText(landmarkDescription, w / 2, h / 2 + 25);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = "20px sans-serif";
    ctx.fillText(
      this.isTouchDevice ? "Tap to Begin" : "Click to Begin",
      w / 2, h / 2 + 80
    );

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
