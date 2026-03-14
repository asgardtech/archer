import { RaptorGameState, RaptorPowerUpType, WeaponType, WEAPON_SLOT_ORDER, HUD_BAR_HEIGHT, SpeakerType } from "../types";
import { ActiveEffect, EFFECT_DURATIONS } from "../systems/PowerUpManager";
import { AssetLoader } from "./AssetLoader";
import { ShipRenderer } from "./ShipRenderer";

const MUTE_BTN_SIZE = 36;
const MUTE_BTN_MARGIN = 12;
const SETTINGS_BTN_SIZE = 36;
const RETRO_FONT = "'Press Start 2P', monospace";

const SLIDER_TRACK_W = 220;
const SLIDER_TRACK_H = 10;
const SLIDER_HANDLE_W = 16;
const SLIDER_HANDLE_H = 22;

const SHIELD_BAR_X = 8;
const SHIELD_BAR_W = 10;
const SHIELD_BAR_H = 200;
const SHIELD_BAR_TOP = 54;

const EFFECT_COLORS: Partial<Record<RaptorPowerUpType, string>> = {
  "spread-shot": "#3498db",
  "rapid-fire": "#f39c12",
  "weapon-missile": "#e67e22",
  "weapon-laser": "#9b59b6",
  "weapon-plasma": "#8e44ad",
  "weapon-ion": "#00bcd4",
  "deflector": "#e91e63",
};

const EFFECT_LABELS: Partial<Record<RaptorPowerUpType, string>> = {
  "spread-shot": "SPR",
  "rapid-fire": "RPD",
  "weapon-missile": "MSL",
  "weapon-laser": "LSR",
  "weapon-plasma": "PLS",
  "weapon-ion": "ION",
  "deflector": "DEF",
};

const WEAPON_LABELS: Record<WeaponType, string> = {
  "machine-gun": "GUN",
  "missile": "MSL",
  "laser": "LSR",
  "plasma": "PLS",
  "ion-cannon": "ION",
  "auto-gun": "ATG",
  "rocket": "RKT",
};

const WEAPON_COLORS: Record<WeaponType, string> = {
  "machine-gun": "#ffdd00",
  "missile": "#e67e22",
  "laser": "#9b59b6",
  "plasma": "#8e44ad",
  "ion-cannon": "#00bcd4",
  "auto-gun": "#27ae60",
  "rocket": "#2c3e50",
};

const SPEAKER_HUD_LABELS: Record<SpeakerType, string> = {
  pilot: "RAPTOR-1",
  wingman: "WINGMAN",
  hq: "HQ",
  sensor: "SENSOR",
};

const SPEAKER_HUD_COLORS: Record<SpeakerType, string> = {
  pilot: "#5082dc",
  wingman: "#50b464",
  hq: "#dcb43c",
  sensor: "#dcb43c",
};

interface SliderLayout {
  trackX: number;
  trackY: number;
  trackW: number;
  trackH: number;
  handleW: number;
  handleH: number;
}

export class HUD {
  private static readonly TIER_SUFFIXES = ["", " II", " III"];

  private isTouchDevice: boolean;
  private assets: AssetLoader | null = null;
  private tierFlashTimer = 0;
  private completionLines: string[] = [];
  private _victoryStoryActive = false;
  private measureCtx: CanvasRenderingContext2D;
  private shipRenderer = new ShipRenderer();

  private wingmanText = "";
  private wingmanTimer = 0;
  private wingmanSpeaker: SpeakerType = "pilot";

  constructor(isTouchDevice: boolean) {
    this.isTouchDevice = isTouchDevice;
    const offscreen = document.createElement("canvas");
    this.measureCtx = offscreen.getContext("2d")!;
  }

  get victoryStoryActive(): boolean {
    return this._victoryStoryActive;
  }

  setCompletionText(text: string | null): void {
    if (!text) {
      this.completionLines = [];
      return;
    }
    this.completionLines = this.wrapText(text, 340);
  }

  setVictoryStoryActive(active: boolean): void {
    this._victoryStoryActive = active;
  }

  private wrapText(text: string, maxWidth: number): string[] {
    this.measureCtx.font = `8px ${RETRO_FONT}`;
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine === "") {
        currentLine = word;
        continue;
      }
      const testLine = currentLine + " " + word;
      const measured = this.measureCtx.measureText(testLine).width;
      if (measured > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine !== "") {
      lines.push(currentLine);
    }
    return lines;
  }

  setAssets(assets: AssetLoader): void {
    this.assets = assets;
  }

  setWingmanMessage(speaker: SpeakerType, text: string, duration: number): void {
    this.wingmanSpeaker = speaker;
    let cleanText = text;
    if (cleanText.startsWith("Wingman:")) cleanText = cleanText.substring(8).trim();
    else if (cleanText.startsWith("HQ:")) cleanText = cleanText.substring(3).trim();
    else if (cleanText.startsWith("Sensor:")) cleanText = cleanText.substring(7).trim();
    this.wingmanText = cleanText;
    this.wingmanTimer = duration;
  }

  updateWingmanTimer(dt: number): void {
    if (this.wingmanTimer > 0) {
      this.wingmanTimer = Math.max(0, this.wingmanTimer - dt);
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

    ctx.font = `16px ${RETRO_FONT}`;
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

  renderSettingsButton(ctx: CanvasRenderingContext2D, canvasW: number): void {
    const x = canvasW - MUTE_BTN_SIZE - MUTE_BTN_MARGIN - SETTINGS_BTN_SIZE - 6;
    const y = MUTE_BTN_MARGIN;
    const size = SETTINGS_BTN_SIZE;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();

    ctx.font = `16px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText("\u2699", x + size / 2, y + size / 2);
    ctx.restore();
  }

  isSettingsButtonHit(clickX: number, clickY: number, canvasW: number): boolean {
    const x = canvasW - MUTE_BTN_SIZE - MUTE_BTN_MARGIN - SETTINGS_BTN_SIZE - 6;
    const y = MUTE_BTN_MARGIN;
    return (
      clickX >= x &&
      clickX <= x + SETTINGS_BTN_SIZE &&
      clickY >= y &&
      clickY <= y + SETTINGS_BTN_SIZE
    );
  }

  private getSettingsPanelRect(width: number, height: number) {
    const panelW = 340;
    const panelH = 240;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;
    return { px, py, panelW, panelH };
  }

  private getMusicSliderLayout(width: number, height: number): SliderLayout {
    const { px, py } = this.getSettingsPanelRect(width, height);
    return {
      trackX: px + 60,
      trackY: py + 100,
      trackW: SLIDER_TRACK_W,
      trackH: SLIDER_TRACK_H,
      handleW: SLIDER_HANDLE_W,
      handleH: SLIDER_HANDLE_H,
    };
  }

  private getSfxSliderLayout(width: number, height: number): SliderLayout {
    const { px, py } = this.getSettingsPanelRect(width, height);
    return {
      trackX: px + 60,
      trackY: py + 160,
      trackW: SLIDER_TRACK_W,
      trackH: SLIDER_TRACK_H,
      handleW: SLIDER_HANDLE_W,
      handleH: SLIDER_HANDLE_H,
    };
  }

  private getCloseButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getSettingsPanelRect(width, height);
    const btnW = 28;
    const btnH = 28;
    return { x: px + panelW - btnW - 10, y: py + 10, w: btnW, h: btnH };
  }

  private getClearSaveButtonRect(width: number, height: number) {
    const { px, py, panelW, panelH } = this.getSettingsPanelRect(width, height);
    const btnW = 140;
    const btnH = 28;
    const btnX = px + (panelW - btnW) / 2;
    const btnY = py + panelH - btnH - 16;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  isClearSaveButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getClearSaveButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  renderSettingsPanel(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    musicVolume: number,
    sfxVolume: number,
    hasSave?: boolean
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);

    const { px, py, panelW, panelH } = this.getSettingsPanelRect(width, height);

    const panelGrad = ctx.createLinearGradient(px, py, px, py + panelH);
    panelGrad.addColorStop(0, "rgba(15, 25, 50, 0.92)");
    panelGrad.addColorStop(1, "rgba(5, 10, 25, 0.96)");
    ctx.fillStyle = panelGrad;
    this.roundedRect(ctx, px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(100, 140, 220, 0.3)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `16px ${RETRO_FONT}`;
    ctx.fillText("Settings", width / 2, py + 40);

    const closeBtn = this.getCloseButtonRect(width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    this.roundedRect(ctx, closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, 4);
    ctx.fill();
    ctx.font = `12px ${RETRO_FONT}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2715", closeBtn.x + closeBtn.w / 2, closeBtn.y + closeBtn.h / 2);

    const musicSlider = this.getMusicSliderLayout(width, height);
    this.renderSlider(ctx, musicSlider, musicVolume, "MUSIC");

    const sfxSlider = this.getSfxSliderLayout(width, height);
    this.renderSlider(ctx, sfxSlider, sfxVolume, "SFX");

    if (hasSave) {
      const csBtn = this.getClearSaveButtonRect(width, height);
      ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
      this.roundedRect(ctx, csBtn.x, csBtn.y, csBtn.w, csBtn.h, 5);
      ctx.fill();
      ctx.font = `8px ${RETRO_FONT}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Clear Save", csBtn.x + csBtn.w / 2, csBtn.y + csBtn.h / 2);
    }

    ctx.restore();
  }

  private renderSlider(
    ctx: CanvasRenderingContext2D,
    layout: SliderLayout,
    value: number,
    label: string
  ): void {
    const { trackX, trackY, trackW, trackH, handleW, handleH } = layout;

    ctx.font = `8px ${RETRO_FONT}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#B0C4DE";
    ctx.fillText(label, trackX - 12, trackY + trackH / 2);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    this.roundedRect(ctx, trackX, trackY, trackW, trackH, 5);
    ctx.fill();

    const fillW = trackW * Math.max(0, Math.min(1, value));
    if (fillW > 0) {
      const fillGrad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
      fillGrad.addColorStop(0, "#3498db");
      fillGrad.addColorStop(1, "#2ecc71");
      ctx.fillStyle = fillGrad;
      this.roundedRect(ctx, trackX, trackY, fillW, trackH, 5);
      ctx.fill();
    }

    const handleX = trackX + fillW - handleW / 2;
    const handleY = trackY + trackH / 2 - handleH / 2;
    ctx.fillStyle = "#ffffff";
    this.roundedRect(ctx, handleX, handleY, handleW, handleH, 4);
    ctx.fill();

    ctx.shadowColor = "transparent";

    const pct = Math.round(value * 100);
    ctx.font = `7px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#8899AA";
    ctx.fillText(`${pct}%`, trackX + trackW + 10, trackY + trackH / 2);
  }

  getSliderValueFromPosition(
    mouseX: number,
    slider: "music" | "sfx",
    width: number,
    height: number
  ): number {
    const layout = slider === "music"
      ? this.getMusicSliderLayout(width, height)
      : this.getSfxSliderLayout(width, height);
    const raw = (mouseX - layout.trackX) / layout.trackW;
    return Math.max(0, Math.min(1, raw));
  }

  isSliderHit(
    clickX: number,
    clickY: number,
    slider: "music" | "sfx",
    width: number,
    height: number
  ): boolean {
    const layout = slider === "music"
      ? this.getMusicSliderLayout(width, height)
      : this.getSfxSliderLayout(width, height);
    const pad = 10;
    return (
      clickX >= layout.trackX - pad &&
      clickX <= layout.trackX + layout.trackW + pad &&
      clickY >= layout.trackY - layout.handleH / 2 - pad &&
      clickY <= layout.trackY + layout.trackH + layout.handleH / 2 + pad
    );
  }

  isCloseButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getCloseButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  isSettingsPanelHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const { px, py, panelW, panelH } = this.getSettingsPanelRect(width, height);
    return clickX >= px && clickX <= px + panelW && clickY >= py && clickY <= py + panelH;
  }

  triggerTierFlash(): void {
    this.tierFlashTimer = 0.5;
  }

  render(
    ctx: CanvasRenderingContext2D,
    state: RaptorGameState,
    score: number,
    lives: number,
    armor: number,
    level: number,
    levelName: string,
    width: number,
    height: number,
    activeEffects?: ReadonlyArray<ActiveEffect>,
    currentWeapon?: WeaponType,
    hasSave?: boolean,
    chargeLevel?: number,
    bombs?: number,
    weaponTier?: number,
    isEnergyRegenerating?: boolean,
    dodgeCooldownFraction?: number,
    inventory?: ReadonlyMap<WeaponType, number>,
    shieldBattery?: number,
    empCooldownFraction?: number,
    energy?: number
  ): void {
    switch (state) {
      case "loading":
        break;
      case "menu":
        this.renderMenu(ctx, width, height, hasSave);
        break;
      case "story_intro":
      case "briefing":
        break;
      case "playing":
        this.renderPlayingHUD(ctx, score, lives, armor, level, levelName, width, height, activeEffects, currentWeapon, chargeLevel, bombs, weaponTier, isEnergyRegenerating, dodgeCooldownFraction, inventory, shieldBattery, empCooldownFraction, energy);
        this.renderBottomBar(ctx, width, height, currentWeapon ?? "machine-gun", inventory, bombs ?? 0, weaponTier ?? 1, chargeLevel ?? 0);
        break;
      case "level_complete":
        this.renderPlayingHUD(ctx, score, lives, armor, level, levelName, width, height, activeEffects, currentWeapon, chargeLevel, bombs, weaponTier, isEnergyRegenerating, dodgeCooldownFraction, inventory, shieldBattery, empCooldownFraction, energy);
        this.renderBottomBar(ctx, width, height, currentWeapon ?? "machine-gun", inventory, bombs ?? 0, weaponTier ?? 1, chargeLevel ?? 0);
        this.renderOverlay(ctx, width, height, "Level Complete!",
          this.completionLines,
          `Score: ${score}`,
          this.actionText("for next level"));
        break;
      case "gameover":
        this.renderOverlay(ctx, width, height, "Game Over",
          [],
          `Final Score: ${score}`, this.actionText("to return"));
        break;
      case "victory":
        if (!this._victoryStoryActive) {
          this.renderOverlay(ctx, width, height, "Victory!",
            [],
            `Final Score: ${score}`, this.actionText("to return"));
        }
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
    ctx.font = `24px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RAPTOR SKIES", width / 2, height / 2 - 60);

    ctx.font = `10px ${RETRO_FONT}`;
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

    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillStyle = "#667799";
    ctx.fillText(`${Math.floor(progress * 100)}%`, width / 2, barY + barH + 18);

    ctx.restore();
  }

  private actionText(suffix: string): string {
    return this.isTouchDevice ? `Tap ${suffix}` : `Click ${suffix}`;
  }

  private getMenuPanelRect(width: number, height: number) {
    const panelW = 420;
    const panelH = 220;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2 - 10;
    return { px, py, panelW, panelH };
  }

  private getContinueButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getMenuPanelRect(width, height);
    const btnW = 180;
    const btnH = 32;
    const btnX = px + (panelW / 2 - btnW) / 2;
    const btnY = py + 125;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private getNewGameButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getMenuPanelRect(width, height);
    const btnW = 180;
    const btnH = 32;
    const btnX = px + panelW / 2 + (panelW / 2 - btnW) / 2;
    const btnY = py + 125;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  isContinueButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getContinueButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  isNewGameButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getNewGameButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  private renderMenu(ctx: CanvasRenderingContext2D, width: number, height: number, hasSave?: boolean): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const { px, py, panelW, panelH } = this.getMenuPanelRect(width, height);

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
    ctx.font = `22px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Raptor Skies", width / 2, py + 50);

    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillStyle = "#B0C4DE";
    ctx.fillText("A Vertical Scrolling Shoot-em-up", width / 2, py + 90);

    if (hasSave) {
      const contBtn = this.getContinueButtonRect(width, height);
      ctx.fillStyle = "#2ecc71";
      this.roundedRect(ctx, contBtn.x, contBtn.y, contBtn.w, contBtn.h, 6);
      ctx.fill();
      ctx.font = `10px ${RETRO_FONT}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Continue", contBtn.x + contBtn.w / 2, contBtn.y + contBtn.h / 2);

      const newBtn = this.getNewGameButtonRect(width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      this.roundedRect(ctx, newBtn.x, newBtn.y, newBtn.w, newBtn.h, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      this.roundedRect(ctx, newBtn.x, newBtn.y, newBtn.w, newBtn.h, 6);
      ctx.stroke();
      ctx.font = `10px ${RETRO_FONT}`;
      ctx.fillStyle = "#B0C4DE";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("New Game", newBtn.x + newBtn.w / 2, newBtn.y + newBtn.h / 2);
    } else {
      ctx.font = `10px ${RETRO_FONT}`;
      ctx.fillStyle = "#FFD700";
      ctx.fillText(
        this.isTouchDevice ? "Tap to Start" : "Click to Start",
        width / 2,
        py + 140
      );
    }

    ctx.font = `7px ${RETRO_FONT}`;
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
    armor: number,
    level: number,
    levelName: string,
    width: number,
    height: number,
    activeEffects?: ReadonlyArray<ActiveEffect>,
    currentWeapon?: WeaponType,
    chargeLevel?: number,
    bombs?: number,
    weaponTier?: number,
    isEnergyRegenerating?: boolean,
    dodgeCooldownFraction?: number,
    inventory?: ReadonlyMap<WeaponType, number>,
    shieldBattery?: number,
    empCooldownFraction?: number,
    energy?: number
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

    ctx.font = `9px ${RETRO_FONT}`;
    ctx.textBaseline = "middle";

    ctx.textAlign = "left";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Score: ${score}`, 10, 14);

    this.renderLivesIcons(ctx, lives, 10, 28);

    ctx.font = `9px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Level ${level} \u2013 ${levelName}`, width / 2, 14);

    if (activeEffects && activeEffects.length > 0) {
      this.renderActiveEffects(ctx, activeEffects, width);
    }

    ctx.restore();

    this.renderArmorBar(ctx, armor, height);
    this.renderEnergyBar(ctx, energy ?? 100, height, isEnergyRegenerating);
    this.renderBatteryBar(ctx, shieldBattery ?? 0, height);
    this.renderDodgeCooldown(ctx, dodgeCooldownFraction ?? 0, 10, 52);
    this.renderEmpCooldown(ctx, empCooldownFraction ?? 0, 10, 64);
    this.renderTouchBombButton(ctx, bombs ?? 0, width, height);
    this.renderTouchDodgeButton(ctx, dodgeCooldownFraction ?? 0, width, height);
    this.renderTouchEmpButton(ctx, empCooldownFraction ?? 0, width, height);

    this.renderTouchWeaponCycleButton(ctx, width, height, inventory);
  }

  private renderArmorBar(ctx: CanvasRenderingContext2D, armor: number, canvasHeight: number): void {
    ctx.save();

    const barH = Math.min(SHIELD_BAR_H, canvasHeight - SHIELD_BAR_TOP - 10);
    if (barH <= 0) {
      ctx.restore();
      return;
    }

    const barX = SHIELD_BAR_X;
    const barY = SHIELD_BAR_TOP;

    ctx.fillStyle = "rgba(0, 10, 30, 0.6)";
    this.roundedRect(ctx, barX - 3, barY - 3, SHIELD_BAR_W + 6, barH + 6, 6);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.roundedRect(ctx, barX, barY, SHIELD_BAR_W, barH, 4);
    ctx.fill();

    const armorFrac = Math.min(1, Math.max(0, armor / 100));
    if (armorFrac > 0) {
      const fillH = barH * armorFrac;
      const fillY = barY + barH - fillH;

      const armorGrad = ctx.createLinearGradient(0, fillY + fillH, 0, fillY);
      if (armorFrac > 0.5) {
        armorGrad.addColorStop(0, "#2e7d32");
        armorGrad.addColorStop(1, "#4caf50");
      } else if (armorFrac > 0.25) {
        armorGrad.addColorStop(0, "#d4ac0d");
        armorGrad.addColorStop(1, "#f1c40f");
      } else {
        armorGrad.addColorStop(0, "#c0392b");
        armorGrad.addColorStop(1, "#e74c3c");
      }
      ctx.fillStyle = armorGrad;
      this.roundedRect(ctx, barX, fillY, SHIELD_BAR_W, fillH, 4);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.5;
    this.roundedRect(ctx, barX, barY, SHIELD_BAR_W, barH, 4);
    ctx.stroke();

    ctx.save();
    ctx.font = `6px ${RETRO_FONT}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(barX + SHIELD_BAR_W + 10, barY + barH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ARMOR", 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private renderEnergyBar(ctx: CanvasRenderingContext2D, energy: number, canvasHeight: number, isRegenerating?: boolean): void {
    ctx.save();

    const barX = SHIELD_BAR_X + SHIELD_BAR_W + 16;
    const barY = SHIELD_BAR_TOP;
    const barH = Math.min(SHIELD_BAR_H, canvasHeight - SHIELD_BAR_TOP - 10);
    if (barH <= 0) { ctx.restore(); return; }

    ctx.fillStyle = "rgba(0, 10, 30, 0.6)";
    this.roundedRect(ctx, barX - 3, barY - 3, SHIELD_BAR_W + 6, barH + 6, 6);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.roundedRect(ctx, barX, barY, SHIELD_BAR_W, barH, 4);
    ctx.fill();

    const energyFrac = Math.min(1, Math.max(0, energy / 100));
    if (energyFrac > 0) {
      const fillH = barH * energyFrac;
      const fillY = barY + barH - fillH;
      const grad = ctx.createLinearGradient(0, fillY + fillH, 0, fillY);
      grad.addColorStop(0, "#2980b9");
      grad.addColorStop(1, "#3498db");
      ctx.fillStyle = grad;
      this.roundedRect(ctx, barX, fillY, SHIELD_BAR_W, fillH, 4);
      ctx.fill();
    }

    if (isRegenerating && energyFrac < 1) {
      const regenAlpha = Math.sin(Date.now() / 200) * 0.15 + 0.15;
      const emptyH = barH * (1 - energyFrac);
      ctx.fillStyle = `rgba(52, 152, 219, ${regenAlpha})`;
      this.roundedRect(ctx, barX, barY, SHIELD_BAR_W, emptyH, 4);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.5;
    this.roundedRect(ctx, barX, barY, SHIELD_BAR_W, barH, 4);
    ctx.stroke();

    ctx.save();
    ctx.font = `6px ${RETRO_FONT}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(barX + SHIELD_BAR_W + 10, barY + barH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ENERGY", 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private renderBatteryBar(ctx: CanvasRenderingContext2D, battery: number, canvasHeight: number): void {
    if (battery <= 0) return;

    ctx.save();

    const barX = SHIELD_BAR_X + (SHIELD_BAR_W + 16) * 2;
    const barY = SHIELD_BAR_TOP;
    const barH = Math.min(SHIELD_BAR_H, canvasHeight - SHIELD_BAR_TOP - 10);
    if (barH <= 0) { ctx.restore(); return; }

    ctx.fillStyle = "rgba(0, 10, 30, 0.6)";
    this.roundedRect(ctx, barX - 3, barY - 3, SHIELD_BAR_W + 6, barH + 6, 6);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.roundedRect(ctx, barX, barY, SHIELD_BAR_W, barH, 4);
    ctx.fill();

    const battFrac = Math.min(1, Math.max(0, battery / 100));
    if (battFrac > 0) {
      const fillH = barH * battFrac;
      const fillY = barY + barH - fillH;
      const grad = ctx.createLinearGradient(0, fillY + fillH, 0, fillY);
      grad.addColorStop(0, "#e65100");
      grad.addColorStop(1, "#ff9800");
      ctx.fillStyle = grad;
      this.roundedRect(ctx, barX, fillY, SHIELD_BAR_W, fillH, 4);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.5;
    this.roundedRect(ctx, barX, barY, SHIELD_BAR_W, barH, 4);
    ctx.stroke();

    ctx.save();
    ctx.font = `6px ${RETRO_FONT}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(barX + SHIELD_BAR_W + 10, barY + barH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("BATT", 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private renderEmpCooldown(
    ctx: CanvasRenderingContext2D,
    cooldownFraction: number,
    startX: number,
    y: number
  ): void {
    ctx.save();
    ctx.font = `7px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const ready = cooldownFraction <= 0;
    ctx.fillStyle = ready ? "#64b5f6" : "#95a5a6";
    ctx.fillText("EMP", startX, y);

    const labelW = ctx.measureText("EMP").width;
    const barX = startX + labelW + 6;
    const barW = 40;
    const barH = 5;
    const barY = y - barH / 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(barX, barY, barW, barH);

    const fillFrac = 1 - cooldownFraction;
    if (fillFrac > 0) {
      ctx.fillStyle = ready ? "#64b5f6" : "#42a5f5";
      ctx.fillRect(barX, barY, barW * fillFrac, barH);
    }

    if (ready) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = `5px ${RETRO_FONT}`;
      ctx.fillText("[V]", barX + barW + 4, y);
    }

    ctx.restore();
  }

  private getEmpButtonRect(width: number, height: number) {
    const dodgeBtn = this.getDodgeButtonRect(width, height);
    const size = 44;
    return { x: dodgeBtn.x - size - 8, y: dodgeBtn.y, w: size, h: size };
  }

  isEmpButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    if (!this.isTouchDevice) return false;
    const btn = this.getEmpButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w
        && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  private renderTouchEmpButton(
    ctx: CanvasRenderingContext2D,
    cooldownFraction: number,
    width: number,
    height: number
  ): void {
    if (!this.isTouchDevice) return;
    const btn = this.getEmpButtonRect(width, height);
    const ready = cooldownFraction <= 0;

    ctx.save();
    ctx.globalAlpha = ready ? 0.7 : 0.3;
    ctx.fillStyle = ready ? "#64b5f6" : "#555555";
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.font = `9px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("EMP", btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  private brightenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const br = Math.min(255, Math.round(r * factor));
    const bg = Math.min(255, Math.round(g * factor));
    const bb = Math.min(255, Math.round(b * factor));
    return `rgb(${br}, ${bg}, ${bb})`;
  }

  private renderWeaponIndicator(ctx: CanvasRenderingContext2D, weapon: WeaponType, width: number, chargeLevel?: number, weaponTier: number = 1): void {
    const label = WEAPON_LABELS[weapon];
    const suffix = HUD.TIER_SUFFIXES[Math.min(weaponTier, 3) - 1];
    const color = WEAPON_COLORS[weapon];
    const x = width / 2;
    const y = 42;

    const brightness = 1.0 + (weaponTier - 1) * 0.2;

    ctx.font = `6px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = this.brightenColor(color, brightness);
    ctx.fillText(`[${label}${suffix}]`, x, y);

    if (this.tierFlashTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.tierFlashTimer / 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`[${label}${suffix}]`, x, y);
      ctx.restore();
      this.tierFlashTimer = Math.max(0, this.tierFlashTimer - 1 / 60);
    }

    if (weapon === "ion-cannon" && chargeLevel !== undefined && chargeLevel > 0) {
      const barW = 40;
      const barH = 4;
      const barX = x - barW / 2;
      const barY = y + 10;

      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(barX, barY, barW, barH);

      const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, "#00bcd4");
      grad.addColorStop(1, "#00e5ff");
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, barW * chargeLevel, barH);
    }
  }

  private renderLivesIcons(ctx: CanvasRenderingContext2D, lives: number, startX: number, y: number): void {
    const iconW = 14;
    const iconH = 16;
    const gap = 3;

    for (let i = 0; i < lives; i++) {
      const ix = startX + i * (iconW + gap);
      this.shipRenderer.renderMiniSilhouette(ctx, ix, y - iconH / 2, iconW, iconH);
    }
  }

  private getBombButtonRect(width: number, height: number) {
    const size = 44;
    const margin = 14;
    return { x: width - size - margin, y: height - HUD_BAR_HEIGHT - size - margin, w: size, h: size };
  }

  isBombButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    if (!this.isTouchDevice) return false;
    const btn = this.getBombButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  private renderTouchBombButton(ctx: CanvasRenderingContext2D, bombs: number, width: number, height: number): void {
    if (!this.isTouchDevice) return;
    const btn = this.getBombButtonRect(width, height);

    ctx.save();
    ctx.globalAlpha = bombs > 0 ? 0.7 : 0.3;
    ctx.fillStyle = bombs > 0 ? "#e74c3c" : "#555555";
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.font = `10px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("BOMB", btn.x + btn.w / 2, btn.y + btn.h / 2 - 6);

    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillText(`${bombs}`, btn.x + btn.w / 2, btn.y + btn.h / 2 + 8);
    ctx.restore();
  }

  private renderDodgeCooldown(
    ctx: CanvasRenderingContext2D,
    cooldownFraction: number,
    startX: number,
    y: number
  ): void {
    ctx.save();
    ctx.font = `7px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const ready = cooldownFraction <= 0;
    ctx.fillStyle = ready ? "#2ecc71" : "#95a5a6";
    ctx.fillText("DODGE", startX, y);

    const labelW = ctx.measureText("DODGE").width;
    const barX = startX + labelW + 6;
    const barW = 40;
    const barH = 5;
    const barY = y - barH / 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(barX, barY, barW, barH);

    const fillFrac = 1 - cooldownFraction;
    if (fillFrac > 0) {
      ctx.fillStyle = ready ? "#2ecc71" : "#3498db";
      ctx.fillRect(barX, barY, barW * fillFrac, barH);
    }

    if (ready) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = `5px ${RETRO_FONT}`;
      ctx.fillText("[SHIFT]", barX + barW + 4, y);
    }

    ctx.restore();
  }

  private getDodgeButtonRect(width: number, height: number) {
    const size = 44;
    const bombBtn = this.getBombButtonRect(width, height);
    return { x: bombBtn.x - size - 8, y: bombBtn.y, w: size, h: size };
  }

  isDodgeButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    if (!this.isTouchDevice) return false;
    const btn = this.getDodgeButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w
        && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  private renderTouchDodgeButton(
    ctx: CanvasRenderingContext2D,
    cooldownFraction: number,
    width: number,
    height: number
  ): void {
    if (!this.isTouchDevice) return;
    const btn = this.getDodgeButtonRect(width, height);
    const ready = cooldownFraction <= 0;

    ctx.save();
    ctx.globalAlpha = ready ? 0.7 : 0.3;
    ctx.fillStyle = ready ? "#3498db" : "#555555";
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.font = `9px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("DASH", btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  private renderWeaponTray(
    ctx: CanvasRenderingContext2D,
    inventory: ReadonlyMap<WeaponType, number>,
    activeWeapon: WeaponType,
    canvasWidth: number
  ): void {
    const TIER_PIPS = ["I", "II", "III"];
    const slotW = 38;
    const slotH = 28;
    const gap = 3;
    const ownedWeapons = WEAPON_SLOT_ORDER.filter((w) => inventory.has(w));
    const totalW = ownedWeapons.length * slotW + (ownedWeapons.length - 1) * gap;
    const startX = (canvasWidth - totalW) / 2;
    const trayY = 50;

    ctx.save();

    for (let i = 0; i < ownedWeapons.length; i++) {
      const weapon = ownedWeapons[i];
      const tier = inventory.get(weapon) ?? 1;
      const isActive = weapon === activeWeapon;
      const x = startX + i * (slotW + gap);

      ctx.fillStyle = isActive
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.3)";
      this.roundedRect(ctx, x, trayY, slotW, slotH, 4);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = WEAPON_COLORS[weapon];
        ctx.lineWidth = 1.5;
        this.roundedRect(ctx, x, trayY, slotW, slotH, 4);
        ctx.stroke();
      }

      ctx.globalAlpha = isActive ? 1.0 : 0.5;

      ctx.font = `6px ${RETRO_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = WEAPON_COLORS[weapon];
      ctx.fillText(WEAPON_LABELS[weapon], x + slotW / 2, trayY + 10);

      ctx.font = `5px ${RETRO_FONT}`;
      ctx.fillStyle = isActive ? "#ffffff" : "#aaaaaa";
      ctx.fillText(TIER_PIPS[tier - 1], x + slotW / 2, trayY + 20);

      if (!this.isTouchDevice) {
        const slotIndex = WEAPON_SLOT_ORDER.indexOf(weapon) + 1;
        ctx.font = `5px ${RETRO_FONT}`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillText(`${slotIndex}`, x + slotW / 2, trayY + slotH + 6);
      }

      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  private getWeaponCycleButtonRect(width: number, height: number) {
    const empBtn = this.getEmpButtonRect(width, height);
    const size = 44;
    return { x: empBtn.x - size - 8, y: empBtn.y, w: size, h: size };
  }

  isWeaponCycleButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    if (!this.isTouchDevice) return false;
    const btn = this.getWeaponCycleButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w
        && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  private renderTouchWeaponCycleButton(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    inventory?: ReadonlyMap<WeaponType, number>
  ): void {
    if (!this.isTouchDevice) return;
    if (!inventory || inventory.size <= 1) return;
    const btn = this.getWeaponCycleButtonRect(width, height);

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#8e44ad";
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.font = `8px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("WPN", btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  private renderBombCount(ctx: CanvasRenderingContext2D, bombs: number, startX: number, y: number): void {
    ctx.save();
    ctx.font = `7px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e74c3c";
    const label = "BOMB";
    ctx.fillText(label, startX, y);
    const labelW = ctx.measureText(label).width;
    for (let i = 0; i < bombs; i++) {
      ctx.fillText("\u25CF", startX + labelW + 4 + i * 10, y);
    }
    ctx.restore();
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
      const maxDur = EFFECT_DURATIONS[eff.type] ?? 8;
      const frac = Math.max(0, eff.remainingTime / maxDur);
      const color = EFFECT_COLORS[eff.type] ?? "#888";
      const label = EFFECT_LABELS[eff.type] ?? "?";

      const spriteKeyMap: Partial<Record<RaptorPowerUpType, string>> = {
        "spread-shot": "powerup_spread",
        "rapid-fire": "powerup_rapid",
        "deflector": "powerup_deflector",
      };
      const sprite = this.assets?.getOptional(spriteKeyMap[eff.type] ?? "");

      if (sprite) {
        ctx.drawImage(sprite, startX - 18, y, 14, 14);
      }

      ctx.font = `7px ${RETRO_FONT}`;
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
    storyLines: string[],
    ...lines: string[]
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);

    const panelW = 380;
    const storyBlockH = storyLines.length * 18;
    const panelH = 160 + storyBlockH + lines.length * 30;
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
    ctx.font = `20px ${RETRO_FONT}`;
    ctx.fillText(title, width / 2, py + 55);

    if (storyLines.length > 0) {
      ctx.font = `8px ${RETRO_FONT}`;
      ctx.fillStyle = "#A0B0C8";
      ctx.textAlign = "left";
      const textX = px + 20;
      for (let i = 0; i < storyLines.length; i++) {
        ctx.fillText(storyLines[i], textX, py + 90 + i * 18);
      }
      ctx.textAlign = "center";
    }

    ctx.font = `9px ${RETRO_FONT}`;
    ctx.fillStyle = "#D0D8E8";
    const linesStartY = py + 100 + storyBlockH;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, linesStartY + i * 30);
    }

    ctx.restore();
  }

  private renderBottomBar(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentWeapon: WeaponType,
    inventory: ReadonlyMap<WeaponType, number> | undefined,
    bombs: number,
    weaponTier: number,
    chargeLevel: number
  ): void {
    const barY = height - HUD_BAR_HEIGHT;

    ctx.save();

    const bgGrad = ctx.createLinearGradient(0, barY, 0, height);
    bgGrad.addColorStop(0, "rgba(0, 10, 30, 1.0)");
    bgGrad.addColorStop(1, "rgba(0, 5, 15, 1.0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, barY, width, HUD_BAR_HEIGHT);

    ctx.strokeStyle = "rgba(100, 160, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barY);
    ctx.lineTo(width, barY);
    ctx.stroke();

    this.renderWingmanSection(ctx, barY);
    this.renderBottomWeaponTray(ctx, width, barY, currentWeapon, inventory, weaponTier, chargeLevel);
    this.renderBottomBombCount(ctx, width, barY, bombs);

    ctx.restore();
  }

  private renderWingmanSection(
    ctx: CanvasRenderingContext2D,
    barY: number
  ): void {
    const msgX = 8;
    const centerY = barY + HUD_BAR_HEIGHT / 2;

    if (this.wingmanTimer <= 0 || !this.wingmanText) {
      ctx.save();
      ctx.font = `6px ${RETRO_FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillText("Standing by...", msgX, centerY);
      ctx.restore();
      return;
    }

    ctx.save();
    const fadeAlpha = Math.min(1, this.wingmanTimer / 0.5);
    ctx.globalAlpha = fadeAlpha;

    const speakerColor = SPEAKER_HUD_COLORS[this.wingmanSpeaker] ?? "#5082dc";
    const label = SPEAKER_HUD_LABELS[this.wingmanSpeaker] ?? "RAPTOR-1";

    ctx.font = `6px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillStyle = speakerColor;
    ctx.fillText(label + ":", msgX, centerY - 7);

    ctx.fillStyle = "#D0D8E8";
    let displayText = this.wingmanText;
    if (displayText.length > 35) {
      displayText = displayText.substring(0, 32) + "...";
    }
    ctx.fillText(displayText, msgX, centerY + 7);

    ctx.restore();
  }

  private renderBottomWeaponTray(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    barY: number,
    activeWeapon: WeaponType,
    inventory: ReadonlyMap<WeaponType, number> | undefined,
    weaponTier: number,
    chargeLevel: number
  ): void {
    const TIER_PIPS = ["I", "II", "III"];
    const slotW = 38;
    const slotH = 28;
    const gap = 3;
    const trayY = barY + (HUD_BAR_HEIGHT - slotH) / 2;

    let ownedWeapons: WeaponType[];
    if (inventory && inventory.size > 0) {
      ownedWeapons = WEAPON_SLOT_ORDER.filter((w) => inventory.has(w));
    } else {
      ownedWeapons = [activeWeapon];
    }

    const totalW = ownedWeapons.length * slotW + (ownedWeapons.length - 1) * gap;
    const startX = (canvasWidth - totalW) / 2;

    ctx.save();

    for (let i = 0; i < ownedWeapons.length; i++) {
      const weapon = ownedWeapons[i];
      const tier = inventory?.get(weapon) ?? 1;
      const isActive = weapon === activeWeapon;
      const x = startX + i * (slotW + gap);

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = isActive
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.3)";
      this.roundedRect(ctx, x, trayY, slotW, slotH, 4);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = WEAPON_COLORS[weapon];
        ctx.lineWidth = 1.5;
        this.roundedRect(ctx, x, trayY, slotW, slotH, 4);
        ctx.stroke();
      }

      ctx.globalAlpha = isActive ? 1.0 : 0.5;

      ctx.font = `6px ${RETRO_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = WEAPON_COLORS[weapon];
      ctx.fillText(WEAPON_LABELS[weapon], x + slotW / 2, trayY + 10);

      ctx.font = `5px ${RETRO_FONT}`;
      ctx.fillStyle = isActive ? "#ffffff" : "#aaaaaa";
      ctx.fillText(TIER_PIPS[tier - 1], x + slotW / 2, trayY + 20);

      ctx.globalAlpha = 1.0;

      if (isActive && this.tierFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = this.tierFlashTimer / 0.5;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        this.roundedRect(ctx, x, trayY, slotW, slotH, 4);
        ctx.fill();
        ctx.restore();
        this.tierFlashTimer = Math.max(0, this.tierFlashTimer - 1 / 60);
      }

      if (isActive && weapon === "ion-cannon" && chargeLevel > 0) {
        const cBarW = slotW - 6;
        const cBarH = 3;
        const cBarX = x + 3;
        const cBarY = trayY + slotH - 5;

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(cBarX, cBarY, cBarW, cBarH);

        const grad = ctx.createLinearGradient(cBarX, 0, cBarX + cBarW, 0);
        grad.addColorStop(0, "#00bcd4");
        grad.addColorStop(1, "#00e5ff");
        ctx.fillStyle = grad;
        ctx.fillRect(cBarX, cBarY, cBarW * chargeLevel, cBarH);
      }
    }

    if (!this.isTouchDevice && ownedWeapons.length > 1) {
      for (let i = 0; i < ownedWeapons.length; i++) {
        const weapon = ownedWeapons[i];
        const x = startX + i * (slotW + gap);
        const slotIndex = WEAPON_SLOT_ORDER.indexOf(weapon) + 1;
        ctx.font = `5px ${RETRO_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillText(`${slotIndex}`, x + slotW / 2, trayY + slotH + 6);
      }
    }

    ctx.restore();
  }

  private renderBottomBombCount(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    barY: number,
    bombs: number
  ): void {
    ctx.save();

    const centerY = barY + HUD_BAR_HEIGHT / 2;
    const maxBombs = 5;
    const dotSpacing = 10;

    ctx.font = `7px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = bombs > 0 ? "#e74c3c" : "#666666";
    const labelX = canvasWidth - 78;
    ctx.fillText("BOMB", labelX, centerY - 8);

    for (let i = 0; i < maxBombs; i++) {
      const dotX = labelX + i * dotSpacing + 5;
      ctx.beginPath();
      ctx.arc(dotX, centerY + 6, 3, 0, Math.PI * 2);
      ctx.fillStyle = i < bombs ? "#e74c3c" : "rgba(255, 255, 255, 0.15)";
      ctx.fill();
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
