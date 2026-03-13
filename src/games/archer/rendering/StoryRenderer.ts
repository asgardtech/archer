import { GeneralPortrait } from "./GeneralPortrait";

export interface StoryFooter {
  heading: string;
  subheading?: string;
  detail?: string;
  score?: number;
}

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

const FOOTER_HEADING_SIZE = 24;
const FOOTER_SUBHEADING_SIZE = 18;
const FOOTER_DETAIL_SIZE = 16;
const FOOTER_SCORE_SIZE = 28;
const FOOTER_DIVIDER_GAP = 18;

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
  private footer: StoryFooter | undefined;
  private footerFadeProgress = 0;

  constructor(isTouchDevice = false) {
    this.isTouchDevice = isTouchDevice;
    const canvas = document.createElement("canvas");
    this.measureCtx = canvas.getContext("2d")!;
  }

  show(lines: string[], footer?: StoryFooter): void {
    if (lines.length === 0) return;
    this.lines = [...lines];
    this.wrappedLines = [];
    this.revealedChars = 0;
    this.totalChars = 0;
    this.fadeProgress = 0;
    this.blinkTimer = 0;
    this.elapsed = 0;
    this.completed = false;
    this.footer = footer;
    this.footerFadeProgress = 0;
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
        if (this.footer && this.footerFadeProgress < 1) {
          this.footerFadeProgress = Math.min(1, this.footerFadeProgress + dt / FADE_DURATION);
        }
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

  private computeFooterHeight(isSmall: boolean): number {
    if (!this.footer) return 0;
    let h = FOOTER_DIVIDER_GAP;
    h += FOOTER_HEADING_SIZE + 8;
    if (this.footer.subheading) h += (isSmall ? FOOTER_SUBHEADING_SIZE - 2 : FOOTER_SUBHEADING_SIZE) + 6;
    if (this.footer.detail) h += (isSmall ? FOOTER_DETAIL_SIZE - 2 : FOOTER_DETAIL_SIZE) + 6;
    if (this.footer.score != null) h += FOOTER_SCORE_SIZE + 6;
    return h;
  }

  render(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    if (this.state === "idle") return;

    const isSmall = canvasW < SMALL_CANVAS_THRESHOLD;
    const portraitVisible = !isSmall;
    const portraitAreaW = portraitVisible ? PORTRAIT_SIZE + PORTRAIT_MARGIN * 2 : 0;

    const panelW = Math.min(canvasW * PANEL_WIDTH_RATIO, 680);
    const footerHeight = this.computeFooterHeight(isSmall);
    const basePanelH = Math.min(canvasH * PANEL_HEIGHT_RATIO, 420);
    const panelH = Math.min(canvasH * PANEL_HEIGHT_RATIO, basePanelH + footerHeight);
    const panelX = (canvasW - panelW) / 2;
    const panelY = (canvasH - panelH) / 2;

    const textAreaX = panelX + PANEL_PADDING + portraitAreaW;
    const textAreaW = panelW - PANEL_PADDING * 2 - portraitAreaW;

    if (this.wrappedLines.length === 0 && this.lines.length > 0) {
      this.wrappedLines = this.wrapAllLines(textAreaW);
      this.totalChars = this.wrappedLines.reduce((sum, l) => sum + l.length, 0);
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.fadeProgress));

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(0, 0, canvasW, canvasH);

    const grad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    grad.addColorStop(0, PANEL_BG_TOP);
    grad.addColorStop(1, PANEL_BG_BOTTOM);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, PANEL_RADIUS);
    ctx.fill();

    ctx.strokeStyle = PANEL_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, PANEL_RADIUS);
    ctx.stroke();

    ctx.strokeStyle = "rgba(180, 150, 80, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, PANEL_RADIUS - 2);
    ctx.stroke();

    if (portraitVisible) {
      const portraitX = panelX + PORTRAIT_MARGIN;
      const portraitY = panelY + PANEL_PADDING;
      GeneralPortrait.render(ctx, portraitX, portraitY, PORTRAIT_SIZE, this.elapsed);

      ctx.font = `bold 11px ${FONT_FAMILY}`;
      ctx.fillStyle = TITLE_COLOR;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("THE GENERAL", portraitX + PORTRAIT_SIZE / 2, portraitY + PORTRAIT_SIZE * 1.2 + 12);
    }

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

    if (this.footer && this.state === "waiting" && this.footerFadeProgress > 0) {
      this.renderFooter(ctx, panelX, panelY, panelW, panelH, textAreaX, textAreaW, textY, isSmall);
    }

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

  private renderFooter(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelW: number,
    _panelH: number,
    textAreaX: number,
    textAreaW: number,
    textY: number,
    isSmall: boolean
  ): void {
    if (!this.footer) return;

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = prevAlpha * this.footerFadeProgress;

    let y = textY + FOOTER_DIVIDER_GAP;

    const dividerX1 = textAreaX;
    const dividerX2 = textAreaX + textAreaW;
    ctx.strokeStyle = "rgba(180, 150, 80, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(dividerX1, y - FOOTER_DIVIDER_GAP / 2);
    ctx.lineTo(dividerX2, y - FOOTER_DIVIDER_GAP / 2);
    ctx.stroke();

    const headingSize = isSmall ? FOOTER_HEADING_SIZE - 2 : FOOTER_HEADING_SIZE;
    ctx.font = `bold ${headingSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = TITLE_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(this.footer.heading, panelX + panelW / 2, y);
    y += headingSize + 8;

    if (this.footer.subheading) {
      const subSize = isSmall ? FOOTER_SUBHEADING_SIZE - 2 : FOOTER_SUBHEADING_SIZE;
      ctx.font = `bold ${subSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = "#f1c40f";
      ctx.fillText(this.footer.subheading, panelX + panelW / 2, y);
      y += subSize + 6;
    }

    if (this.footer.detail) {
      const detailSize = isSmall ? FOOTER_DETAIL_SIZE - 2 : FOOTER_DETAIL_SIZE;
      ctx.font = `italic ${detailSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = "rgba(232, 220, 200, 0.8)";
      ctx.fillText(this.footer.detail, panelX + panelW / 2, y);
      y += detailSize + 6;
    }

    if (this.footer.score != null) {
      ctx.font = `bold ${FOOTER_SCORE_SIZE}px ${FONT_FAMILY}`;
      ctx.fillStyle = "#f1c40f";
      ctx.fillText(`Total Score: ${this.footer.score}`, panelX + panelW / 2, y);
    }

    ctx.globalAlpha = prevAlpha;
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
