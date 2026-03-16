import type { AchievementDefinition } from "../types";
import { HUD_TOP_BAR_HEIGHT, HUD_RIGHT_PANEL_WIDTH } from "../types";
import { ICON_GLYPHS, FALLBACK_GLYPH } from "./iconGlyphs";

type NotificationPhase = "idle" | "sliding_in" | "holding" | "sliding_out";

const SLIDE_IN_DURATION = 0.5;
const HOLD_DURATION = 3.0;
const SLIDE_OUT_DURATION = 0.5;
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 60;
const MARGIN_RIGHT = 10;
const MARGIN_TOP = 10;
const SLIDE_DISTANCE = PANEL_WIDTH + MARGIN_RIGHT + HUD_RIGHT_PANEL_WIDTH;
const CORNER_RADIUS = 8;
const RETRO_FONT = "'Press Start 2P', monospace";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "...";
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  let truncated = text;
  while (
    truncated.length > 0 &&
    ctx.measureText(truncated).width + ellipsisWidth > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + ellipsis;
}

export class AchievementNotification {
  private queue: AchievementDefinition[] = [];
  private current: AchievementDefinition | null = null;
  private phase: NotificationPhase = "idle";
  private timer = 0;

  show(achievement: AchievementDefinition): void {
    this.queue.push(achievement);
  }

  update(dt: number): void {
    if (this.phase === "idle") {
      if (this.queue.length > 0) {
        this.current = this.queue.shift()!;
        this.phase = "sliding_in";
        this.timer = 0;
      }
      return;
    }

    this.timer += dt;

    if (this.phase === "sliding_in" && this.timer >= SLIDE_IN_DURATION) {
      this.phase = "holding";
      this.timer = 0;
    } else if (this.phase === "holding" && this.timer >= HOLD_DURATION) {
      this.phase = "sliding_out";
      this.timer = 0;
    } else if (this.phase === "sliding_out" && this.timer >= SLIDE_OUT_DURATION) {
      this.current = null;
      this.phase = "idle";
      this.timer = 0;
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    _canvasHeight: number,
  ): void {
    if (this.phase === "idle" || !this.current) return;

    const restX = canvasWidth - HUD_RIGHT_PANEL_WIDTH - PANEL_WIDTH - MARGIN_RIGHT;
    const topY = HUD_TOP_BAR_HEIGHT + MARGIN_TOP;

    let slideOffset = 0;
    let alpha = 1;

    if (this.phase === "sliding_in") {
      const progress = Math.min(this.timer / SLIDE_IN_DURATION, 1);
      const eased = easeOutCubic(progress);
      slideOffset = SLIDE_DISTANCE * (1 - eased);
      alpha = eased;
    } else if (this.phase === "sliding_out") {
      const progress = Math.min(this.timer / SLIDE_OUT_DURATION, 1);
      const eased = easeInCubic(progress);
      slideOffset = SLIDE_DISTANCE * eased;
      alpha = 1 - eased;
    }

    const drawX = restX + slideOffset;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.beginPath();
    ctx.roundRect(drawX, topY, PANEL_WIDTH, PANEL_HEIGHT, CORNER_RADIUS);
    ctx.fill();

    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(drawX, topY, PANEL_WIDTH, PANEL_HEIGHT, CORNER_RADIUS);
    ctx.stroke();

    const iconSize = 40;
    ctx.font = `${iconSize * 0.7}px serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    const glyph = ICON_GLYPHS[this.current.icon] ?? FALLBACK_GLYPH;
    ctx.fillText(
      glyph,
      drawX + 10 + iconSize / 2,
      topY + PANEL_HEIGHT / 2,
    );

    const textX = drawX + 56;
    const textMaxWidth = PANEL_WIDTH - 56 - 10;

    ctx.font = `9px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(truncateText(ctx, this.current.name, textMaxWidth), textX, topY + 22);

    ctx.font = `6px ${RETRO_FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(
      truncateText(ctx, this.current.description, textMaxWidth),
      textX,
      topY + 40,
    );

    ctx.restore();
  }
}
