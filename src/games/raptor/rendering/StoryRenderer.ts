import { SpeakerType, HUD_BAR_HEIGHT } from "../types";
import { PilotPortrait } from "./PilotPortrait";
import { WingmanPortrait } from "./WingmanPortrait";
import { HQPortrait } from "./HQPortrait";

type StoryPosition = "top" | "center" | "bottom";

type StoryRendererState =
  | "idle"
  | "fade_in"
  | "typing"
  | "waiting"
  | "fade_out";

const RETRO_FONT = "'Press Start 2P', monospace";
const FONT_SIZE = 9;
const LINE_HEIGHT = 18;
const PANEL_PADDING_X = 20;
const PANEL_PADDING_Y = 16;
const PANEL_MAX_WIDTH = 460;
const PANEL_MARGIN = 20;
const PANEL_RADIUS = 12;
const FADE_DURATION = 0.3;
const DEFAULT_CHARS_PER_SECOND = 30;
const DEFAULT_QUICK_DURATION = 3;
const PROMPT_BLINK_RATE = 0.5;
const TEXT_COLOR = "#D0D8E8";
const PANEL_BG_TOP = "rgba(15, 25, 50, 0.92)";
const PANEL_BG_BOTTOM = "rgba(5, 10, 25, 0.96)";
const PANEL_BORDER_COLOR = "rgba(100, 140, 220, 0.3)";
const TOP_POSITION_Y = 52;
const BOTTOM_POSITION_MARGIN = 16;
const QUICK_PADDING_Y = 10;

const PORTRAIT_SIZE_FULL = 100;
const PORTRAIT_SIZE_QUICK = 48;
const PORTRAIT_MARGIN = 14;
const SMALL_CANVAS_THRESHOLD = 500;

const SPEAKER_LABELS: Record<SpeakerType, string> = {
  pilot: "RAPTOR-1",
  wingman: "WINGMAN",
  hq: "ADM. RENNICK",
  sensor: "SENSOR OPS",
};

export function detectSpeaker(text: string): SpeakerType {
  if (text.startsWith("Wingman:")) return "wingman";
  if (text.startsWith("HQ:")) return "hq";
  if (text.startsWith("Sensor:")) return "sensor";
  return "pilot";
}

function renderPortraitForSpeaker(
  ctx: CanvasRenderingContext2D,
  speaker: SpeakerType,
  x: number,
  y: number,
  size: number,
  elapsed: number
): void {
  switch (speaker) {
    case "wingman":
      WingmanPortrait.render(ctx, x, y, size, elapsed);
      break;
    case "hq":
      HQPortrait.render(ctx, x, y, size, elapsed);
      break;
    case "sensor":
      HQPortrait.renderSensor(ctx, x, y, size, elapsed);
      break;
    case "pilot":
    default:
      PilotPortrait.render(ctx, x, y, size, elapsed);
      break;
  }
}

export class StoryRenderer {
  private state: StoryRendererState = "idle";
  private messages: string[] = [];
  private currentIndex = 0;
  private wrappedLines: string[] = [];
  private revealedChars = 0;
  private totalChars = 0;
  private charsPerSecond = DEFAULT_CHARS_PER_SECOND;
  private fadeProgress = 0;
  private fadeDuration = FADE_DURATION;
  private position: StoryPosition = "center";
  private isQuickMessage = false;
  private quickTimer = 0;
  private completed = false;
  private blinkTimer = 0;
  private elapsed = 0;
  private speaker: SpeakerType = "pilot";

  private measureCtx: CanvasRenderingContext2D;

  constructor() {
    const canvas = document.createElement("canvas");
    this.measureCtx = canvas.getContext("2d")!;
  }

  show(messages: string[], position: StoryPosition = "center", speaker?: SpeakerType): void {
    if (messages.length === 0) return;

    this.messages = [...messages];
    this.currentIndex = 0;
    this.position = position;
    this.isQuickMessage = false;
    this.completed = false;
    this.speaker = speaker ?? "pilot";
    this.elapsed = 0;
    this.beginMessage(this.messages[0]);
  }

  showQuick(
    message: string,
    duration: number = DEFAULT_QUICK_DURATION,
    position: StoryPosition = "top",
    speaker?: SpeakerType
  ): void {
    if (this.state !== "idle" && !this.isQuickMessage) return;

    this.messages = [message];
    this.currentIndex = 0;
    this.position = position;
    this.isQuickMessage = true;
    this.quickTimer = duration;
    this.completed = false;
    this.speaker = speaker ?? detectSpeaker(message);
    this.elapsed = 0;
    this.beginMessage(message);
  }

  advance(): boolean {
    if (this.state === "typing") {
      this.revealedChars = this.totalChars;
      this.state = "waiting";
      return true;
    }

    if (this.state === "waiting") {
      this.state = "fade_out";
      this.fadeProgress = 1;
      return true;
    }

    return false;
  }

  update(dt: number): void {
    if (this.state !== "idle") {
      this.elapsed += dt;
    }

    switch (this.state) {
      case "fade_in":
        this.fadeProgress += dt / this.fadeDuration;
        if (this.fadeProgress >= 1) {
          this.fadeProgress = 1;
          this.state = "typing";
        }
        break;

      case "typing":
        this.revealedChars += this.charsPerSecond * dt;
        if (this.revealedChars >= this.totalChars) {
          this.revealedChars = this.totalChars;
          this.state = "waiting";
        }
        break;

      case "waiting":
        this.blinkTimer += dt;
        if (this.isQuickMessage) {
          this.quickTimer -= dt;
          if (this.quickTimer <= 0) {
            this.state = "fade_out";
            this.fadeProgress = 1;
          }
        }
        break;

      case "fade_out":
        this.fadeProgress -= dt / this.fadeDuration;
        if (this.fadeProgress <= 0) {
          this.fadeProgress = 0;
          this.advanceToNextOrFinish();
        }
        break;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    if (this.state === "idle") return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.fadeProgress));

    const isSmall = width < SMALL_CANVAS_THRESHOLD;
    const portraitVisible = !isSmall;
    const portraitSize = this.isQuickMessage ? PORTRAIT_SIZE_QUICK : PORTRAIT_SIZE_FULL;
    const portraitAreaW = portraitVisible ? portraitSize + PORTRAIT_MARGIN * 2 : 0;

    const paddingY = this.isQuickMessage ? QUICK_PADDING_Y : PANEL_PADDING_Y;
    const textPanelW = Math.min(width - PANEL_MARGIN * 2, PANEL_MAX_WIDTH);
    const totalPanelW = textPanelW + portraitAreaW;
    const textContentH = paddingY * 2 + this.wrappedLines.length * LINE_HEIGHT;

    let minPortraitH = 0;
    if (portraitVisible) {
      const portraitContentH = portraitSize * 1.2 + (this.isQuickMessage ? 0 : 22);
      minPortraitH = portraitContentH + paddingY * 2;
    }
    const panelH = Math.max(textContentH, minPortraitH);

    const panelX = (width - totalPanelW) / 2;
    const panelY = this.computePanelY(height, panelH);

    this.renderPanel(ctx, panelX, panelY, totalPanelW, panelH);

    if (portraitVisible) {
      const portraitX = panelX + PORTRAIT_MARGIN;
      const portraitY = panelY + paddingY;
      renderPortraitForSpeaker(ctx, this.speaker, portraitX, portraitY, portraitSize, this.elapsed);

      if (!this.isQuickMessage) {
        const label = SPEAKER_LABELS[this.speaker] || "RAPTOR-1";
        ctx.font = `bold ${7}px ${RETRO_FONT}`;
        ctx.fillStyle = this.getSpeakerLabelColor();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(label, portraitX + portraitSize / 2, portraitY + portraitSize * 1.2 + 10);
      }
    }

    const textX = panelX + portraitAreaW;
    this.renderText(ctx, textX, panelY, paddingY);

    if (this.state === "waiting" && !this.isQuickMessage) {
      this.renderPromptIndicator(ctx, panelX, panelY, totalPanelW, panelH);
    }

    ctx.restore();
  }

  get isActive(): boolean {
    return this.state !== "idle";
  }

  get isComplete(): boolean {
    return this.completed;
  }

  private getSpeakerLabelColor(): string {
    switch (this.speaker) {
      case "wingman":
        return "rgba(80, 180, 100, 0.8)";
      case "hq":
      case "sensor":
        return "rgba(220, 180, 60, 0.8)";
      case "pilot":
      default:
        return "rgba(80, 130, 220, 0.8)";
    }
  }

  private beginMessage(message: string): void {
    this.wrappedLines = this.wrapText(message);
    this.totalChars = this.wrappedLines.reduce(
      (sum, line) => sum + line.length,
      0
    );
    this.revealedChars = 0;
    this.fadeProgress = 0;
    this.blinkTimer = 0;
    this.state = "fade_in";
  }

  private advanceToNextOrFinish(): void {
    this.currentIndex++;
    if (this.currentIndex < this.messages.length) {
      this.beginMessage(this.messages[this.currentIndex]);
    } else {
      this.state = "idle";
      this.completed = true;
    }
  }

  private wrapText(text: string): string[] {
    this.measureCtx.font = `${FONT_SIZE}px ${RETRO_FONT}`;
    const maxWidth = PANEL_MAX_WIDTH - PANEL_PADDING_X * 2;
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

  private computePanelY(canvasHeight: number, panelH: number): number {
    switch (this.position) {
      case "top":
        return TOP_POSITION_Y;
      case "bottom":
        return canvasHeight - HUD_BAR_HEIGHT - panelH - BOTTOM_POSITION_MARGIN;
      case "center":
      default:
        return (canvasHeight - panelH) / 2;
    }
  }

  private renderPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, PANEL_BG_TOP);
    grad.addColorStop(1, PANEL_BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, PANEL_RADIUS);
    ctx.fill();

    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, PANEL_RADIUS);
    ctx.stroke();
  }

  private renderText(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    paddingY: number
  ): void {
    ctx.font = `${FONT_SIZE}px ${RETRO_FONT}`;
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let budget = Math.floor(this.revealedChars);
    const textX = panelX + PANEL_PADDING_X;
    let textY = panelY + paddingY;

    for (const line of this.wrappedLines) {
      if (budget <= 0) break;

      const visiblePart = line.substring(0, budget);
      ctx.fillText(visiblePart, textX, textY);
      budget -= line.length;
      textY += LINE_HEIGHT;
    }
  }

  private renderPromptIndicator(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelW: number,
    panelH: number
  ): void {
    const cycle = this.blinkTimer % (PROMPT_BLINK_RATE * 2);
    if (cycle >= PROMPT_BLINK_RATE) return;

    ctx.font = `${FONT_SIZE}px ${RETRO_FONT}`;
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      "\u25BC",
      panelX + panelW - PANEL_PADDING_X,
      panelY + panelH - (this.isQuickMessage ? QUICK_PADDING_Y : PANEL_PADDING_Y) + 2
    );
  }
}
