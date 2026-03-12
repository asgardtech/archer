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

  private measureCtx: CanvasRenderingContext2D;

  constructor() {
    const canvas = document.createElement("canvas");
    this.measureCtx = canvas.getContext("2d")!;
  }

  show(messages: string[], position: StoryPosition = "center"): void {
    if (messages.length === 0) return;

    this.messages = [...messages];
    this.currentIndex = 0;
    this.position = position;
    this.isQuickMessage = false;
    this.completed = false;
    this.beginMessage(this.messages[0]);
  }

  showQuick(
    message: string,
    duration: number = DEFAULT_QUICK_DURATION,
    position: StoryPosition = "top"
  ): void {
    if (this.state !== "idle" && !this.isQuickMessage) return;

    this.messages = [message];
    this.currentIndex = 0;
    this.position = position;
    this.isQuickMessage = true;
    this.quickTimer = duration;
    this.completed = false;
    this.beginMessage(message);
  }

  advance(): boolean {
    if (this.state === "typing") {
      this.revealedChars = this.totalChars;
      this.state = "waiting";
      if (this.isQuickMessage) {
        // quick messages don't wait — timer handles dismissal
      }
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
          if (this.isQuickMessage) {
            this.state = "waiting";
          } else {
            this.state = "waiting";
          }
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

    const paddingY = this.isQuickMessage ? QUICK_PADDING_Y : PANEL_PADDING_Y;
    const panelW = Math.min(width - PANEL_MARGIN * 2, PANEL_MAX_WIDTH);
    const panelH = paddingY * 2 + this.wrappedLines.length * LINE_HEIGHT;
    const panelX = (width - panelW) / 2;
    const panelY = this.computePanelY(height, panelH);

    this.renderPanel(ctx, panelX, panelY, panelW, panelH);
    this.renderText(ctx, panelX, panelY, paddingY);

    if (
      this.state === "waiting" &&
      !this.isQuickMessage
    ) {
      this.renderPromptIndicator(ctx, panelX, panelY, panelW, panelH);
    }

    ctx.restore();
  }

  get isActive(): boolean {
    return this.state !== "idle";
  }

  get isComplete(): boolean {
    return this.completed;
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
        return canvasHeight - panelH - BOTTOM_POSITION_MARGIN;
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
