import { GeneralPortrait } from "./GeneralPortrait";

type StoryRendererState = "idle" | "fade_in" | "typing" | "waiting" | "fade_out";

const FONT_FAMILY = "sans-serif";
const FONT_SIZE = 17;
const LINE_HEIGHT = 26;
const CHARS_PER_SECOND = 25;
const FADE_DURATION = 0.5;
const PANEL_WIDTH_RATIO = 0.85;
const PANEL_HEIGHT_RATIO = 0.7;
const PANEL_RADIUS = 14;
const PANEL_PADDING = 28;
const PORTRAIT_SIZE = 100;
const PORTRAIT_MARGIN = 20;
const PROMPT_BLINK_RATE = 0.5;
const SMALL_CANVAS_THRESHOLD = 500;
const PARAGRAPH_GAP = 10;

const PANEL_BG_TOP = "rgba(40, 30, 15, 0.92)";
const PANEL_BG_BOTTOM = "rgba(25, 18, 8, 0.96)";
const PANEL_BORDER_COLOR = "rgba(180, 150, 80, 0.4)";
const TEXT_COLOR = "#e8dcc8";
const TITLE_COLOR = "#b89a4a";

export class StoryRenderer {
  private state: StoryRendererState = "idle";
  private lines: string[] = [];
  private wrappedLines: string[] = [];
  private revealedChars = 0;
  private totalChars = 0;
  private fadeProgress = 0;
  private blinkTimer = 0;
  private elapsed = 0;
  private completed = false;
  private isTouchDevice: boolean;
  private measureCtx: CanvasRenderingContext2D;

  constructor(isTouchDevice = false) {
    this.isTouchDevice = isTouchDevice;
    const canvas = document.createElement("canvas");
    this.measureCtx = canvas.getContext("2d")!;
  }

  show(lines: string[]): void {
    if (lines.length === 0) return;
    this.lines = [...lines];
    this.wrappedLines = [];
    this.revealedChars = 0;
    this.totalChars = 0;
    this.fadeProgress = 0;
    this.blinkTimer = 0;
    this.elapsed = 0;
    this.completed = false;
    this.state = "fade_in";
  }

  advance(): void {
    if (this.state === "typing") {
      this.revealedChars = this.totalChars;
      this.state = "waiting";
    } else if (this.state === "waiting") {
      this.state = "fade_out";
      this.fadeProgress = 1;
    }
  }

  update(dt: number): void {
    this.elapsed += dt;

    switch (this.state) {
      case "fade_in":
        this.fadeProgress += dt / FADE_DURATION;
        if (this.fadeProgress >= 1) {
          this.fadeProgress = 1;
          this.state = "typing";
        }
        break;

      case "typing":
        this.revealedChars += CHARS_PER_SECOND * dt;
        if (this.revealedChars >= this.totalChars) {
          this.revealedChars = this.totalChars;
          this.state = "waiting";
        }
        break;

      case "waiting":
        this.blinkTimer += dt;
        break;

      case "fade_out":
        this.fadeProgress -= dt / FADE_DURATION;
        if (this.fadeProgress <= 0) {
          this.fadeProgress = 0;
          this.state = "idle";
          this.completed = true;
        }
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    if (this.state === "idle") return;

    const panelW = Math.min(canvasW * PANEL_WIDTH_RATIO, 680);
    const panelH = Math.min(canvasH * PANEL_HEIGHT_RATIO, 420);
    const panelX = (canvasW - panelW) / 2;
    const panelY = (canvasH - panelH) / 2;

    const isSmall = canvasW < SMALL_CANVAS_THRESHOLD;
    const portraitVisible = !isSmall;
    const portraitAreaW = portraitVisible ? PORTRAIT_SIZE + PORTRAIT_MARGIN * 2 : 0;

    const textAreaX = panelX + PANEL_PADDING + portraitAreaW;
    const textAreaW = panelW - PANEL_PADDING * 2 - portraitAreaW;

    if (this.wrappedLines.length === 0 && this.lines.length > 0) {
      this.wrappedLines = this.wrapAllLines(textAreaW);
      this.totalChars = this.wrappedLines.reduce((sum, l) => sum + l.length, 0);
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.fadeProgress));

    // Dim overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Panel background
    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    grad.addColorStop(0, PANEL_BG_TOP);
    grad.addColorStop(1, PANEL_BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, PANEL_RADIUS);
    ctx.fill();

    // Panel border
    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, PANEL_RADIUS);
    ctx.stroke();

    // Inner glow border
    ctx.strokeStyle = "rgba(180, 150, 80, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, PANEL_RADIUS - 2);
    ctx.stroke();

    // Portrait
    if (portraitVisible) {
      const portraitX = panelX + PORTRAIT_MARGIN;
      const portraitY = panelY + PANEL_PADDING;
      GeneralPortrait.render(ctx, portraitX, portraitY, PORTRAIT_SIZE, this.elapsed);

      // Name plate under portrait
      ctx.font = `bold 11px ${FONT_FAMILY}`;
      ctx.fillStyle = TITLE_COLOR;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("THE GENERAL", portraitX + PORTRAIT_SIZE / 2, portraitY + PORTRAIT_SIZE * 1.2 + 12);
    }

    // Text with typewriter effect
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.fillStyle = TEXT_COLOR;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    let budget = Math.floor(this.revealedChars);
    let textY = panelY + PANEL_PADDING;

    for (const line of this.wrappedLines) {
      if (budget <= 0) break;

      if (line === "") {
        textY += PARAGRAPH_GAP;
        continue;
      }

      const visible = line.substring(0, budget);
      ctx.fillText(visible, textAreaX, textY);
      budget -= line.length;
      textY += LINE_HEIGHT;
    }

    // "Click/Tap to continue" prompt
    if (this.state === "waiting") {
      const cycle = this.blinkTimer % (PROMPT_BLINK_RATE * 2);
      if (cycle < PROMPT_BLINK_RATE) {
        ctx.font = `16px ${FONT_FAMILY}`;
        ctx.fillStyle = "rgba(180, 150, 80, 0.8)";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        const promptText = this.isTouchDevice ? "\u25BC Tap to continue" : "\u25BC Click to continue";
        ctx.fillText(promptText, panelX + panelW - PANEL_PADDING, panelY + panelH - PANEL_PADDING / 2);
      }
    }

    ctx.restore();
  }

  get isComplete(): boolean {
    return this.completed;
  }

  get isActive(): boolean {
    return this.state !== "idle";
  }

  private wrapAllLines(maxWidth: number): string[] {
    this.measureCtx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    const result: string[] = [];

    for (let i = 0; i < this.lines.length; i++) {
      const wrapped = this.wrapText(this.lines[i], maxWidth);
      result.push(...wrapped);
      if (i < this.lines.length - 1) {
        result.push("");
      }
    }

    return result;
  }

  private wrapText(text: string, maxWidth: number): string[] {
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
}
