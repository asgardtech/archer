import { RaptorGameState, RaptorPowerUpType, WeaponType, WEAPON_SLOT_ORDER, HUD_BAR_HEIGHT, HUD_LEFT_PANEL_WIDTH, HUD_RIGHT_PANEL_WIDTH, HUD_TOP_BAR_HEIGHT, SpeakerType, ActStory, RaptorSaveData, MAX_SAVE_SLOTS } from "../types";
import { LEVELS } from "../levels";
import { ActiveEffect, EFFECT_DURATIONS } from "../systems/PowerUpManager";
import { AssetLoader } from "./AssetLoader";
import { ShipRenderer } from "./ShipRenderer";
import { formatRelativeDate } from "./formatDate";

const MUTE_BTN_SIZE = 36;
const MUTE_BTN_MARGIN = 12;
const SETTINGS_BTN_SIZE = 36;
const RETRO_FONT = "'Press Start 2P', monospace";
const TOUCH_HIT_PAD = 8;

const SLIDER_TRACK_W = 220;
const SLIDER_TRACK_H = 10;
const SLIDER_HANDLE_W = 16;
const SLIDER_HANDLE_H = 22;

// Old overlay bar constants removed; bars now render inside the left panel

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
  pilot: "ARCHER",
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
  private static readonly TIER_SUFFIXES = ["", " II", " III", " IV", " V"];

  private isTouchDevice: boolean;
  private assets: AssetLoader | null = null;
  private tierFlashTimer = 0;
  private completionLines: string[] = [];
  private _victoryStoryActive = false;
  private actEnd: ActStory | null = null;
  private measureCtx: CanvasRenderingContext2D;
  private deleteConfirmSlot: number | null = null;
  private shipRenderer = new ShipRenderer();

  private wingmanText = "";
  private wingmanTimer = 0;
  private wingmanSpeaker: SpeakerType = "pilot";
  private wingmanFlashTimer = 0;

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

  setActEnd(act: ActStory | null): void {
    this.actEnd = act;
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
    this.wingmanFlashTimer = 0.3;
  }

  updateWingmanTimer(dt: number): void {
    if (this.wingmanTimer > 0) {
      this.wingmanTimer = Math.max(0, this.wingmanTimer - dt);
    }
    if (this.wingmanFlashTimer > 0) {
      this.wingmanFlashTimer = Math.max(0, this.wingmanFlashTimer - dt);
    }
  }

  renderMuteButton(ctx: CanvasRenderingContext2D, muted: boolean, canvasW: number, rightPanelWidth = 0): void {
    const x = canvasW - rightPanelWidth - MUTE_BTN_SIZE - MUTE_BTN_MARGIN;
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

  isMuteButtonHit(clickX: number, clickY: number, canvasW: number, rightPanelWidth = 0): boolean {
    const x = canvasW - rightPanelWidth - MUTE_BTN_SIZE - MUTE_BTN_MARGIN;
    const y = MUTE_BTN_MARGIN;
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return (
      clickX >= x - p &&
      clickX <= x + MUTE_BTN_SIZE + p &&
      clickY >= y - p &&
      clickY <= y + MUTE_BTN_SIZE + p
    );
  }

  renderSettingsButton(ctx: CanvasRenderingContext2D, canvasW: number, rightPanelWidth = 0): void {
    const x = canvasW - rightPanelWidth - MUTE_BTN_SIZE - MUTE_BTN_MARGIN - SETTINGS_BTN_SIZE - 6;
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

  isSettingsButtonHit(clickX: number, clickY: number, canvasW: number, rightPanelWidth = 0): boolean {
    const x = canvasW - rightPanelWidth - MUTE_BTN_SIZE - MUTE_BTN_MARGIN - SETTINGS_BTN_SIZE - 6;
    const y = MUTE_BTN_MARGIN;
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return (
      clickX >= x - p &&
      clickX <= x + SETTINGS_BTN_SIZE + p &&
      clickY >= y - p &&
      clickY <= y + SETTINGS_BTN_SIZE + p
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
      case "slot_select":
        break;
      case "story_intro":
      case "briefing":
        break;
      case "playing":
      case "paused":
        this.renderPlayingHUD(ctx, score, lives, armor, level, levelName, width, height, activeEffects, currentWeapon, chargeLevel, bombs, weaponTier, isEnergyRegenerating, dodgeCooldownFraction, inventory, shieldBattery, empCooldownFraction, energy);
        this.renderBottomBar(ctx, width, height);
        break;
      case "level_complete":
        this.renderPlayingHUD(ctx, score, lives, armor, level, levelName, width, height, activeEffects, currentWeapon, chargeLevel, bombs, weaponTier, isEnergyRegenerating, dodgeCooldownFraction, inventory, shieldBattery, empCooldownFraction, energy);
        this.renderBottomBar(ctx, width, height);
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
          if (this.actEnd) {
            this.renderOverlay(ctx, width, height,
              `END OF ACT ${this.actEnd.act}`,
              [`"${this.actEnd.name}"`, "", "TO BE CONTINUED..."],
              `Score: ${score}`, this.actionText("to return"));
          } else {
            this.renderOverlay(ctx, width, height, "Victory!",
              [],
              `Final Score: ${score}`, this.actionText("to return"));
          }
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
    ctx.fillText("ARCHER", width / 2, height / 2 - 60);

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
    const panelH = 270;
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

  private getPlayButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getMenuPanelRect(width, height);
    const btnW = 200;
    const btnH = 36;
    const btnX = px + (panelW - btnW) / 2;
    const btnY = py + 120;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  isPlayButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getPlayButtonRect(width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= btn.x - p && clickX <= btn.x + btn.w + p && clickY >= btn.y - p && clickY <= btn.y + btn.h + p;
  }

  isContinueButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getContinueButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  isNewGameButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getNewGameButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  private getMenuAchievementsButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getMenuPanelRect(width, height);
    const btnW = 200;
    const btnH = 28;
    const btnX = px + (panelW - btnW) / 2;
    const btnY = py + 160;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  isMenuAchievementsButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getMenuAchievementsButtonRect(width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= btn.x - p && clickX <= btn.x + btn.w + p && clickY >= btn.y - p && clickY <= btn.y + btn.h + p;
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
    ctx.fillText("Archer", width / 2, py + 50);

    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillStyle = "#B0C4DE";
    ctx.fillText("A Vertical Scrolling Shoot-em-up", width / 2, py + 90);

    const playBtn = this.getPlayButtonRect(width, height);
    ctx.fillStyle = "#2ecc71";
    this.roundedRect(ctx, playBtn.x, playBtn.y, playBtn.w, playBtn.h, 6);
    ctx.fill();
    ctx.font = `12px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PLAY", playBtn.x + playBtn.w / 2, playBtn.y + playBtn.h / 2);

    const achBtn = this.getMenuAchievementsButtonRect(width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    this.roundedRect(ctx, achBtn.x, achBtn.y, achBtn.w, achBtn.h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, achBtn.x, achBtn.y, achBtn.w, achBtn.h, 6);
    ctx.stroke();
    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillStyle = "#B0C4DE";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ACHIEVEMENTS", achBtn.x + achBtn.w / 2, achBtn.y + achBtn.h / 2);

    ctx.font = `7px ${RETRO_FONT}`;
    ctx.fillStyle = "#8899AA";
    ctx.textAlign = "center";
    ctx.fillText(
      this.isTouchDevice
        ? "Touch to move \u2022 Auto-fire \u2022 Destroy enemies"
        : "Mouse/WASD to move \u2022 Auto-fire \u2022 Destroy enemies",
      width / 2,
      py + 220
    );

    ctx.font = `6px ${RETRO_FONT}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`v${__APP_VERSION__}`, width - 8, height - 4);

    ctx.restore();
  }

  // --- Slot selection screen ---

  private getSlotCardRect(slotIndex: number, width: number, height: number) {
    const cardW = 600;
    const cardH = 80;
    const gap = 12;
    const totalH = MAX_SAVE_SLOTS * cardH + (MAX_SAVE_SLOTS - 1) * gap;
    const startY = (height - totalH) / 2 - 10;
    const x = (width - cardW) / 2;
    const y = startY + slotIndex * (cardH + gap);
    return { x, y, w: cardW, h: cardH };
  }

  private getSlotDeleteButtonRect(slotIndex: number, width: number, height: number) {
    const card = this.getSlotCardRect(slotIndex, width, height);
    const size = 28;
    return { x: card.x + card.w - size - 8, y: card.y + 8, w: size, h: size };
  }

  private getBackButtonRect(width: number, height: number) {
    const lastCard = this.getSlotCardRect(MAX_SAVE_SLOTS - 1, width, height);
    const btnW = 120;
    const btnH = 32;
    return { x: (width - btnW) / 2, y: lastCard.y + lastCard.h + 20, w: btnW, h: btnH };
  }

  private getDeleteConfirmRect(width: number, height: number) {
    const w = 340;
    const h = 100;
    return { x: (width - w) / 2, y: (height - h) / 2, w, h };
  }

  private formatSaveDate(isoString: string): string {
    return formatRelativeDate(isoString);
  }

  setDeleteConfirm(slot: number | null): void {
    this.deleteConfirmSlot = slot;
  }

  get deleteConfirmActive(): number | null {
    return this.deleteConfirmSlot;
  }

  renderSlotSelect(
    ctx: CanvasRenderingContext2D,
    slots: (RaptorSaveData | null)[],
    width: number,
    height: number,
    mouseX: number,
    mouseY: number
  ): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const firstCard = this.getSlotCardRect(0, width, height);
    ctx.font = `16px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SELECT SAVE SLOT", width / 2, firstCard.y - 50);

    ctx.font = `7px ${RETRO_FONT}`;
    ctx.fillStyle = "#B0C4DE";
    ctx.fillText("Choose a slot to continue or start a new game", width / 2, firstCard.y - 28);

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const card = this.getSlotCardRect(i, width, height);
      const slot = slots[i] ?? null;
      const hovered = mouseX >= card.x && mouseX <= card.x + card.w
                   && mouseY >= card.y && mouseY <= card.y + card.h;

      const panelGrad = ctx.createLinearGradient(card.x, card.y, card.x, card.y + card.h);
      if (hovered) {
        panelGrad.addColorStop(0, "rgba(20, 35, 65, 0.94)");
        panelGrad.addColorStop(1, "rgba(10, 18, 35, 0.97)");
      } else {
        panelGrad.addColorStop(0, "rgba(15, 25, 50, 0.92)");
        panelGrad.addColorStop(1, "rgba(5, 10, 25, 0.96)");
      }
      ctx.fillStyle = panelGrad;
      this.roundedRect(ctx, card.x, card.y, card.w, card.h, 8);
      ctx.fill();

      ctx.strokeStyle = hovered
        ? "rgba(100, 180, 255, 0.6)"
        : "rgba(100, 140, 220, 0.3)";
      ctx.lineWidth = hovered ? 1.5 : 1;
      this.roundedRect(ctx, card.x, card.y, card.w, card.h, 8);
      ctx.stroke();

      if (slot) {
        this.renderPopulatedSlotCard(ctx, i, slot, card, width, height);
      } else {
        this.renderEmptySlotCard(ctx, i, card);
      }
    }

    const backBtn = this.getBackButtonRect(width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    this.roundedRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 6);
    ctx.stroke();
    ctx.font = `9px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BACK", backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2);

    if (this.deleteConfirmSlot !== null) {
      this.renderDeleteConfirmDialog(ctx, this.deleteConfirmSlot, width, height);
    }

    ctx.restore();
  }

  private renderPopulatedSlotCard(
    ctx: CanvasRenderingContext2D,
    index: number,
    slot: RaptorSaveData,
    card: { x: number; y: number; w: number; h: number },
    width: number,
    height: number
  ): void {
    const leftX = card.x + 16;

    ctx.font = `8px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`SLOT ${index + 1}`, leftX, card.y + 20);

    const isAuto = slot.isAutoSave === true;
    const badgeText = isAuto ? "AUTO-SAVE" : "CHECKPOINT";
    const badgeColor = isAuto ? "rgba(230, 126, 34, 0.8)" : "rgba(46, 204, 113, 0.8)";

    const slotLabelWidth = this.measureCtx.font === `8px ${RETRO_FONT}`
      ? this.measureCtx.measureText(`SLOT ${index + 1}`).width
      : 60;
    const badgeX = leftX + slotLabelWidth + 12;
    ctx.font = `5px ${RETRO_FONT}`;
    const badgeTextWidth = this.measureCtx.measureText(badgeText).width + 8;
    ctx.fillStyle = badgeColor;
    this.roundedRect(ctx, badgeX, card.y + 14, badgeTextWidth, 12, 3);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(badgeText, badgeX + 4, card.y + 20);

    const levelName = LEVELS[slot.levelReached]?.name ?? "Unknown";
    ctx.font = `7px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "left";
    ctx.fillText(`LEVEL ${slot.levelReached + 1}: ${levelName.toUpperCase()}`, leftX, card.y + 38);

    if (isAuto && slot.waveIndex !== undefined) {
      const totalWaves = LEVELS[slot.levelReached]?.waves.length ?? 0;
      ctx.font = `6px ${RETRO_FONT}`;
      ctx.fillStyle = "#B0C4DE";
      ctx.fillText(`Wave ${slot.waveIndex}/${totalWaves}`, leftX, card.y + 54);
    }

    const midX = card.x + 280;
    ctx.font = `7px ${RETRO_FONT}`;
    ctx.fillStyle = "#B0C4DE";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${slot.totalScore.toLocaleString()}`, midX, card.y + 20);

    const weaponLabel = WEAPON_LABELS[slot.weapon] ?? slot.weapon;
    ctx.fillStyle = WEAPON_COLORS[slot.weapon] ?? "#888";
    ctx.fillText(`Weapon: ${weaponLabel}`, midX, card.y + 38);

    ctx.fillStyle = "#667799";
    ctx.fillText(this.formatSaveDate(slot.savedAt), midX, card.y + 56);

    const delBtn = this.getSlotDeleteButtonRect(index, width, height);
    ctx.fillStyle = "rgba(231, 76, 60, 0.6)";
    this.roundedRect(ctx, delBtn.x, delBtn.y, delBtn.w, delBtn.h, 4);
    ctx.fill();
    ctx.font = `12px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u00D7", delBtn.x + delBtn.w / 2, delBtn.y + delBtn.h / 2);
  }

  private renderEmptySlotCard(
    ctx: CanvasRenderingContext2D,
    index: number,
    card: { x: number; y: number; w: number; h: number }
  ): void {
    ctx.font = `8px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#667799";
    ctx.fillText(`SLOT ${index + 1} \u2014 EMPTY`, card.x + 16, card.y + card.h / 2 - 8);

    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillStyle = "#2ecc71";
    ctx.fillText("NEW GAME", card.x + 16, card.y + card.h / 2 + 12);
  }

  private renderDeleteConfirmDialog(
    ctx: CanvasRenderingContext2D,
    slotIndex: number,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, width, height);

    const rect = this.getDeleteConfirmRect(width, height);

    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, "rgba(30, 15, 15, 0.96)");
    grad.addColorStop(1, "rgba(15, 5, 5, 0.98)");
    ctx.fillStyle = grad;
    this.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.fill();

    ctx.strokeStyle = "rgba(231, 76, 60, 0.5)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
    ctx.stroke();

    ctx.font = `9px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`Delete save in Slot ${slotIndex + 1}?`, rect.x + rect.w / 2, rect.y + 30);

    const btnW = 80;
    const btnH = 28;
    const gap = 20;
    const yesX = rect.x + rect.w / 2 - btnW - gap / 2;
    const noX = rect.x + rect.w / 2 + gap / 2;
    const btnY = rect.y + rect.h - btnH - 16;

    ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
    this.roundedRect(ctx, yesX, btnY, btnW, btnH, 5);
    ctx.fill();
    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("YES", yesX + btnW / 2, btnY + btnH / 2);

    ctx.fillStyle = "rgba(127, 140, 141, 0.8)";
    this.roundedRect(ctx, noX, btnY, btnW, btnH, 5);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("NO", noX + btnW / 2, btnY + btnH / 2);
  }

  isSlotCardHit(clickX: number, clickY: number, slotIndex: number, width: number, height: number): boolean {
    const card = this.getSlotCardRect(slotIndex, width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= card.x - p && clickX <= card.x + card.w + p
        && clickY >= card.y - p && clickY <= card.y + card.h + p;
  }

  isSlotDeleteHit(clickX: number, clickY: number, slotIndex: number, width: number, height: number): boolean {
    const btn = this.getSlotDeleteButtonRect(slotIndex, width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w
        && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  isBackButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getBackButtonRect(width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= btn.x - p && clickX <= btn.x + btn.w + p
        && clickY >= btn.y - p && clickY <= btn.y + btn.h + p;
  }

  isDeleteConfirmYesHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const rect = this.getDeleteConfirmRect(width, height);
    const btnW = 80;
    const btnH = 28;
    const gap = 20;
    const yesX = rect.x + rect.w / 2 - btnW - gap / 2;
    const btnY = rect.y + rect.h - btnH - 16;
    return clickX >= yesX && clickX <= yesX + btnW
        && clickY >= btnY && clickY <= btnY + btnH;
  }

  isDeleteConfirmNoHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const rect = this.getDeleteConfirmRect(width, height);
    const btnW = 80;
    const btnH = 28;
    const gap = 20;
    const noX = rect.x + rect.w / 2 + gap / 2;
    const btnY = rect.y + rect.h - btnH - 16;
    return clickX >= noX && clickX <= noX + btnW
        && clickY >= btnY && clickY <= btnY + btnH;
  }

  // --- Pause menu (legacy block — overridden by methods below) ---

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

    // Top bar background
    const panelGrad = ctx.createLinearGradient(0, 0, 0, HUD_TOP_BAR_HEIGHT);
    panelGrad.addColorStop(0, "rgba(0, 10, 30, 0.85)");
    panelGrad.addColorStop(1, "rgba(0, 5, 15, 0.95)");
    ctx.fillStyle = panelGrad;
    ctx.fillRect(0, 0, width, HUD_TOP_BAR_HEIGHT);

    ctx.strokeStyle = "rgba(100, 160, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_TOP_BAR_HEIGHT);
    ctx.lineTo(width, HUD_TOP_BAR_HEIGHT);
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
      this.renderActiveEffects(ctx, activeEffects, width - HUD_RIGHT_PANEL_WIDTH);
    }

    ctx.restore();

    // Left panel contents
    this.renderLeftPanel(ctx, armor, energy ?? 100, shieldBattery ?? 0, isEnergyRegenerating, dodgeCooldownFraction ?? 0, empCooldownFraction ?? 0, height);

    // Right panel contents
    this.renderRightPanel(ctx, width, height, currentWeapon ?? "machine-gun", inventory, bombs ?? 0, weaponTier ?? 1, chargeLevel ?? 0);

    // Touch buttons (positioned within game area)
    this.renderTouchBombButton(ctx, bombs ?? 0, width, height);
    this.renderTouchDodgeButton(ctx, dodgeCooldownFraction ?? 0, width, height);
    this.renderTouchEmpButton(ctx, empCooldownFraction ?? 0, width, height);
    this.renderTouchWeaponCycleButton(ctx, width, height, inventory);
  }

  private renderLeftPanel(
    ctx: CanvasRenderingContext2D,
    armor: number,
    energy: number,
    shieldBattery: number,
    isEnergyRegenerating: boolean | undefined,
    dodgeCooldownFraction: number,
    empCooldownFraction: number,
    canvasHeight: number
  ): void {
    const panelX = 0;
    const panelTop = HUD_TOP_BAR_HEIGHT;
    const panelBottom = canvasHeight - HUD_BAR_HEIGHT;
    const panelH = panelBottom - panelTop;

    const contentX = panelX + 4;
    let cursorY = panelTop + 8;

    // Dodge cooldown
    this.renderDodgeCooldown(ctx, dodgeCooldownFraction, contentX, cursorY + 5);
    cursorY += 18;

    // EMP cooldown
    this.renderEmpCooldown(ctx, empCooldownFraction, contentX, cursorY + 5);
    cursorY += 22;

    // Vertical bars
    const barW = 10;
    const barGap = 4;
    const barsAvailH = panelH - (cursorY - panelTop) - 10;
    const barH = Math.min(160, barsAvailH);

    // Armor bar
    this.renderVerticalBar(ctx, contentX + 4, cursorY, barW, barH, armor / 200, "armor");

    // Energy bar
    this.renderVerticalBar(ctx, contentX + 4 + barW + barGap + 12, cursorY, barW, barH, energy / 200, "energy", isEnergyRegenerating);

    // Battery bar (only if > 0)
    if (shieldBattery > 0) {
      this.renderVerticalBar(ctx, contentX + 4 + (barW + barGap + 12) * 2, cursorY, barW, barH, shieldBattery / 200, "battery");
    }
  }

  private renderVerticalBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    fraction: number,
    type: "armor" | "energy" | "battery",
    isRegenerating?: boolean
  ): void {
    ctx.save();
    fraction = Math.min(1, Math.max(0, fraction));

    ctx.fillStyle = "rgba(0, 10, 30, 0.6)";
    this.roundedRect(ctx, x - 3, y - 3, w + 6, h + 6, 4);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    this.roundedRect(ctx, x, y, w, h, 3);
    ctx.fill();

    if (fraction > 0) {
      const fillH = h * fraction;
      const fillY = y + h - fillH;
      const grad = ctx.createLinearGradient(0, fillY + fillH, 0, fillY);

      if (type === "armor") {
        if (fraction > 0.5) {
          grad.addColorStop(0, "#2e7d32");
          grad.addColorStop(1, "#4caf50");
        } else if (fraction > 0.25) {
          grad.addColorStop(0, "#d4ac0d");
          grad.addColorStop(1, "#f1c40f");
        } else {
          grad.addColorStop(0, "#c0392b");
          grad.addColorStop(1, "#e74c3c");
        }
      } else if (type === "energy") {
        grad.addColorStop(0, "#2980b9");
        grad.addColorStop(1, "#3498db");
      } else {
        grad.addColorStop(0, "#e65100");
        grad.addColorStop(1, "#ff9800");
      }

      ctx.fillStyle = grad;
      this.roundedRect(ctx, x, fillY, w, fillH, 3);
      ctx.fill();
    }

    if (type === "energy" && isRegenerating && fraction < 1) {
      const regenAlpha = Math.sin(Date.now() / 200) * 0.15 + 0.15;
      const emptyH = h * (1 - fraction);
      ctx.fillStyle = `rgba(52, 152, 219, ${regenAlpha})`;
      this.roundedRect(ctx, x, y, w, emptyH, 3);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 0.5;
    this.roundedRect(ctx, x, y, w, h, 3);
    ctx.stroke();

    const labels: Record<string, string> = { armor: "ARMOR", energy: "ENRGY", battery: "BATT" };
    ctx.save();
    ctx.font = `5px ${RETRO_FONT}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(x + w + 8, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(labels[type], 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private renderRightPanel(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    activeWeapon: WeaponType,
    inventory: ReadonlyMap<WeaponType, number> | undefined,
    bombs: number,
    weaponTier: number,
    chargeLevel: number
  ): void {
    const TIER_PIPS = ["I", "II", "III", "IV", "V"];
    const panelX = canvasWidth - HUD_RIGHT_PANEL_WIDTH;
    const panelTop = HUD_TOP_BAR_HEIGHT;

    const slotW = HUD_RIGHT_PANEL_WIDTH - 8;
    const slotH = 28;
    const gap = 3;

    let ownedWeapons: WeaponType[];
    if (inventory && inventory.size > 0) {
      ownedWeapons = WEAPON_SLOT_ORDER.filter((w) => inventory.has(w));
    } else {
      ownedWeapons = [activeWeapon];
    }

    let cursorY = panelTop + 6;

    ctx.save();

    for (let i = 0; i < ownedWeapons.length; i++) {
      const weapon = ownedWeapons[i];
      const tier = inventory?.get(weapon) ?? 1;
      const isActive = weapon === activeWeapon;
      const x = panelX + 4;
      const y = cursorY;

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = isActive
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.3)";
      this.roundedRect(ctx, x, y, slotW, slotH, 4);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = WEAPON_COLORS[weapon];
        ctx.lineWidth = 1.5;
        this.roundedRect(ctx, x, y, slotW, slotH, 4);
        ctx.stroke();
      }

      ctx.globalAlpha = isActive ? 1.0 : 0.5;

      ctx.font = `6px ${RETRO_FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = WEAPON_COLORS[weapon];
      ctx.fillText(WEAPON_LABELS[weapon], x + 4, y + slotH / 2);

      ctx.font = `5px ${RETRO_FONT}`;
      ctx.textAlign = "right";
      ctx.fillStyle = isActive ? "#ffffff" : "#aaaaaa";
      ctx.fillText(TIER_PIPS[tier - 1], x + slotW - 4, y + slotH / 2);

      if (!this.isTouchDevice) {
        const slotIndex = WEAPON_SLOT_ORDER.indexOf(weapon) + 1;
        ctx.font = `5px ${RETRO_FONT}`;
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillText(`${slotIndex}`, x + slotW - 4, y + 6);
      }

      ctx.globalAlpha = 1.0;

      if (isActive && this.tierFlashTimer > 0) {
        ctx.save();
        ctx.globalAlpha = this.tierFlashTimer / 0.5;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        this.roundedRect(ctx, x, y, slotW, slotH, 4);
        ctx.fill();
        ctx.restore();
        this.tierFlashTimer = Math.max(0, this.tierFlashTimer - 1 / 60);
      }

      if (isActive && weapon === "ion-cannon" && chargeLevel > 0) {
        const cBarW = slotW - 6;
        const cBarH = 3;
        const cBarX = x + 3;
        const cBarY = y + slotH - 5;

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(cBarX, cBarY, cBarW, cBarH);

        const grad = ctx.createLinearGradient(cBarX, 0, cBarX + cBarW, 0);
        grad.addColorStop(0, "#00bcd4");
        grad.addColorStop(1, "#00e5ff");
        ctx.fillStyle = grad;
        ctx.fillRect(cBarX, cBarY, cBarW * chargeLevel, cBarH);
      }

      cursorY += slotH + gap;
    }

    // Bomb count below weapons
    cursorY += 6;
    this.renderRightPanelBombCount(ctx, panelX, cursorY, bombs);

    ctx.restore();
  }

  private renderRightPanelBombCount(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    y: number,
    bombs: number
  ): void {
    const maxBombs = 5;
    const x = panelX + 4;

    ctx.font = `6px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = bombs > 0 ? "#e74c3c" : "#666666";
    ctx.fillText("BOMB", x + 2, y);

    const dotStartX = x + 4;
    const dotY = y + 12;
    const dotSpacing = 9;
    for (let i = 0; i < maxBombs; i++) {
      ctx.beginPath();
      ctx.arc(dotStartX + i * dotSpacing, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = i < bombs ? "#e74c3c" : "rgba(255, 255, 255, 0.15)";
      ctx.fill();
    }
  }

  // Old standalone bar methods removed; rendering is now handled by renderLeftPanel/renderVerticalBar

  private renderEmpCooldown(
    ctx: CanvasRenderingContext2D,
    cooldownFraction: number,
    startX: number,
    y: number
  ): void {
    ctx.save();
    ctx.font = `5px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const ready = cooldownFraction <= 0;
    ctx.fillStyle = ready ? "#64b5f6" : "#95a5a6";
    ctx.fillText("EMP", startX, y);

    const barX = startX;
    const barW = HUD_LEFT_PANEL_WIDTH - 12;
    const barH = 4;
    const barY = y + 8;

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(barX, barY, barW, barH);

    const fillFrac = 1 - cooldownFraction;
    if (fillFrac > 0) {
      ctx.fillStyle = ready ? "#64b5f6" : "#42a5f5";
      ctx.fillRect(barX, barY, barW * fillFrac, barH);
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
    return { x: width - HUD_RIGHT_PANEL_WIDTH - size - margin, y: height - HUD_BAR_HEIGHT - size - margin, w: size, h: size };
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
    ctx.font = `5px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const ready = cooldownFraction <= 0;
    ctx.fillStyle = ready ? "#2ecc71" : "#95a5a6";
    ctx.fillText("DODGE", startX, y);

    const barX = startX;
    const barW = HUD_LEFT_PANEL_WIDTH - 12;
    const barH = 4;
    const barY = y + 8;

    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(barX, barY, barW, barH);

    const fillFrac = 1 - cooldownFraction;
    if (fillFrac > 0) {
      ctx.fillStyle = ready ? "#2ecc71" : "#3498db";
      ctx.fillRect(barX, barY, barW * fillFrac, barH);
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
    height: number
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

    this.renderWingmanSection(ctx, barY, width);

    ctx.restore();
  }

  private wrapWingmanText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine === "") {
        currentLine = word;
        continue;
      }
      const testLine = currentLine + " " + word;
      if (ctx.measureText(testLine).width > maxWidth) {
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

  private renderWingmanSection(
    ctx: CanvasRenderingContext2D,
    barY: number,
    canvasWidth?: number
  ): void {
    const msgX = 8;
    const centerY = barY + HUD_BAR_HEIGHT / 2;
    const availWidth = (canvasWidth ?? 800) - 16;

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
    const label = SPEAKER_HUD_LABELS[this.wingmanSpeaker] ?? "ARCHER";

    ctx.font = `6px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    if (this.wingmanFlashTimer > 0) {
      const flashIntensity = this.wingmanFlashTimer / 0.3;
      const highlightAlpha = 0.15 * flashIntensity;
      ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
      const labelWidth = ctx.measureText(label + ": " + this.wingmanText).width;
      ctx.fillRect(msgX - 4, barY + 2, Math.min(labelWidth + 12, availWidth), HUD_BAR_HEIGHT - 4);
    }

    ctx.fillStyle = speakerColor;
    ctx.fillText(label + ":", msgX, barY + 12);

    const maxTextWidth = Math.max(80, availWidth - msgX);
    const wrapped = this.wrapWingmanText(ctx, this.wingmanText, maxTextWidth);

    ctx.fillStyle = "#D0D8E8";
    if (wrapped.length <= 1) {
      ctx.fillText(wrapped[0] ?? "", msgX, barY + 28);
    } else {
      let line1 = wrapped[0];
      let line2 = wrapped.slice(1).join(" ");
      if (ctx.measureText(line2).width > maxTextWidth) {
        const truncated = this.wrapWingmanText(ctx, line2, maxTextWidth);
        line2 = truncated[0];
        if (truncated.length > 1) {
          line2 = line2.replace(/\s+\S*$/, "") + "...";
        }
      }
      ctx.fillText(line1, msgX, barY + 22);
      ctx.fillText(line2, msgX, barY + 36);
    }

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
    const TIER_PIPS = ["I", "II", "III", "IV", "V"];
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

  // --- Pause menu ---

  private getPauseMenuRect(width: number, height: number) {
    const panelW = 340;
    const panelH = 330;
    const px = (width - panelW) / 2;
    const py = (height - panelH) / 2;
    return { px, py, panelW, panelH };
  }

  private getResumeButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getPauseMenuRect(width, height);
    const btnW = 200;
    const btnH = 36;
    const btnX = px + (panelW - btnW) / 2;
    const btnY = py + 80;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private getPauseMuteButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getPauseMenuRect(width, height);
    const btnSize = 40;
    const gap = 20;
    const totalW = btnSize * 2 + gap;
    const startX = px + (panelW - totalW) / 2;
    const btnY = py + 140;
    return { x: startX, y: btnY, w: btnSize, h: btnSize };
  }

  private getPauseSettingsButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getPauseMenuRect(width, height);
    const btnSize = 40;
    const gap = 20;
    const totalW = btnSize * 2 + gap;
    const startX = px + (panelW - totalW) / 2;
    const btnY = py + 140;
    return { x: startX + btnSize + gap, y: btnY, w: btnSize, h: btnSize };
  }

  private getPauseAchievementsButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getPauseMenuRect(width, height);
    const btnW = 200;
    const btnH = 32;
    const btnX = px + (panelW - btnW) / 2;
    const btnY = py + 195;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  isPauseAchievementsButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getPauseAchievementsButtonRect(width, height);
    return clickX >= btn.x && clickX <= btn.x + btn.w && clickY >= btn.y && clickY <= btn.y + btn.h;
  }

  private getQuitButtonRect(width: number, height: number) {
    const { px, py, panelW } = this.getPauseMenuRect(width, height);
    const btnW = 200;
    const btnH = 36;
    const btnX = px + (panelW - btnW) / 2;
    const btnY = py + 260;
    return { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  isResumeButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getResumeButtonRect(width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= btn.x - p && clickX <= btn.x + btn.w + p && clickY >= btn.y - p && clickY <= btn.y + btn.h + p;
  }

  isQuitButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getQuitButtonRect(width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= btn.x - p && clickX <= btn.x + btn.w + p && clickY >= btn.y - p && clickY <= btn.y + btn.h + p;
  }

  isPauseMuteButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getPauseMuteButtonRect(width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= btn.x - p && clickX <= btn.x + btn.w + p && clickY >= btn.y - p && clickY <= btn.y + btn.h + p;
  }

  isPauseSettingsButtonHit(clickX: number, clickY: number, width: number, height: number): boolean {
    const btn = this.getPauseSettingsButtonRect(width, height);
    const p = this.isTouchDevice ? TOUCH_HIT_PAD : 0;
    return clickX >= btn.x - p && clickX <= btn.x + btn.w + p && clickY >= btn.y - p && clickY <= btn.y + btn.h + p;
  }

  renderPauseMenu(ctx: CanvasRenderingContext2D, width: number, height: number, muted: boolean): void {
    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);

    const { px, py, panelW, panelH } = this.getPauseMenuRect(width, height);

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
    ctx.font = `20px ${RETRO_FONT}`;
    ctx.fillText("PAUSED", width / 2, py + 45);

    const resumeBtn = this.getResumeButtonRect(width, height);
    ctx.fillStyle = "#2ecc71";
    this.roundedRect(ctx, resumeBtn.x, resumeBtn.y, resumeBtn.w, resumeBtn.h, 6);
    ctx.fill();
    ctx.font = `12px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("RESUME", resumeBtn.x + resumeBtn.w / 2, resumeBtn.y + resumeBtn.h / 2);

    const muteBtn = this.getPauseMuteButtonRect(width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    this.roundedRect(ctx, muteBtn.x, muteBtn.y, muteBtn.w, muteBtn.h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, muteBtn.x, muteBtn.y, muteBtn.w, muteBtn.h, 6);
    ctx.stroke();
    ctx.font = `16px ${RETRO_FONT}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(muted ? "\u{1F507}" : "\u{1F50A}", muteBtn.x + muteBtn.w / 2, muteBtn.y + muteBtn.h / 2);

    const settingsBtn = this.getPauseSettingsButtonRect(width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    this.roundedRect(ctx, settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, settingsBtn.x, settingsBtn.y, settingsBtn.w, settingsBtn.h, 6);
    ctx.stroke();
    ctx.font = `16px ${RETRO_FONT}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2699", settingsBtn.x + settingsBtn.w / 2, settingsBtn.y + settingsBtn.h / 2);

    const achBtn = this.getPauseAchievementsButtonRect(width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    this.roundedRect(ctx, achBtn.x, achBtn.y, achBtn.w, achBtn.h, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    this.roundedRect(ctx, achBtn.x, achBtn.y, achBtn.w, achBtn.h, 6);
    ctx.stroke();
    ctx.font = `8px ${RETRO_FONT}`;
    ctx.fillStyle = "#B0C4DE";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ACHIEVEMENTS", achBtn.x + achBtn.w / 2, achBtn.y + achBtn.h / 2);

    const quitBtn = this.getQuitButtonRect(width, height);
    ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
    this.roundedRect(ctx, quitBtn.x, quitBtn.y, quitBtn.w, quitBtn.h, 6);
    ctx.fill();
    ctx.font = `10px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("QUIT TO MENU", quitBtn.x + quitBtn.w / 2, quitBtn.y + quitBtn.h / 2);

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
