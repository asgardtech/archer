import type { AchievementCategory, AchievementDefinition, UnlockedAchievement } from "../types";
import { formatRelativeDate } from "./formatDate";
import { ICON_GLYPHS, FALLBACK_GLYPH } from "./iconGlyphs";

interface AchievementEntry {
  definition: AchievementDefinition;
  unlocked: boolean;
  progress: number;
  unlockedAt: number | null;
}

type GalleryClickResult =
  | { action: "close" }
  | { action: "category"; category: AchievementCategory | "all" }
  | { action: "none" };

const RETRO_FONT = "'Press Start 2P', monospace";

const PANEL_W = 680;
const PANEL_H = 480;
const PANEL_RADIUS = 12;
const HEADER_H = 50;
const TAB_BAR_H = 30;
const CARD_W = 310;
const CARD_H = 80;
const CARD_GAP = 10;
const CARD_RADIUS = 6;
const CARD_COLS = 2;
const CLOSE_BTN_SIZE = 28;
const SCROLL_STEP = 40;
const CONTENT_PADDING = 10;

const CATEGORIES: (AchievementCategory | "all")[] = [
  "all", "combat", "survival", "progression", "collection", "mastery",
];

const CATEGORY_LABELS: Record<string, string> = {
  all: "ALL",
  combat: "COMBAT",
  survival: "SURVIVAL",
  progression: "PROGRESS",
  collection: "COLLECT",
  mastery: "MASTERY",
};

export class AchievementGallery {
  private visible = false;
  private scrollOffset = 0;
  private smoothScrollOffset = 0;
  private selectedCategory: AchievementCategory | "all" = "all";
  private achievements: AchievementEntry[] = [];

  get isVisible(): boolean {
    return this.visible;
  }

  show(
    achievements: { definition: AchievementDefinition; unlocked: boolean; progress: number }[],
    unlockDates: UnlockedAchievement[],
  ): void {
    const dateMap = new Map<string, number>();
    for (const u of unlockDates) {
      dateMap.set(u.id, u.unlockedAt);
    }

    this.achievements = achievements.map((a) => ({
      definition: a.definition,
      unlocked: a.unlocked,
      progress: a.progress,
      unlockedAt: dateMap.get(a.definition.id) ?? null,
    }));

    this.visible = true;
    this.scrollOffset = 0;
    this.smoothScrollOffset = 0;
    this.selectedCategory = "all";
  }

  hide(): void {
    this.visible = false;
  }

  handleClick(x: number, y: number, width: number, height: number): GalleryClickResult {
    const { px, py } = this.getPanelRect(width, height);

    // Close button
    const closeX = px + PANEL_W - CLOSE_BTN_SIZE - 10;
    const closeY = py + 10;
    if (x >= closeX && x <= closeX + CLOSE_BTN_SIZE && y >= closeY && y <= closeY + CLOSE_BTN_SIZE) {
      return { action: "close" };
    }

    // Category tabs
    const tabY = py + HEADER_H;
    if (y >= tabY && y <= tabY + TAB_BAR_H) {
      const tabW = (PANEL_W - 2 * CONTENT_PADDING) / CATEGORIES.length;
      const tabStartX = px + CONTENT_PADDING;
      for (let i = 0; i < CATEGORIES.length; i++) {
        const tx = tabStartX + i * tabW;
        if (x >= tx && x <= tx + tabW) {
          this.selectedCategory = CATEGORIES[i];
          this.scrollOffset = 0;
          this.smoothScrollOffset = 0;
          return { action: "category", category: CATEGORIES[i] };
        }
      }
    }

    return { action: "none" };
  }

  handleScroll(delta: number): void {
    const filtered = this.getFilteredAchievements();
    const maxScroll = this.getMaxScroll(filtered.length);
    const step = delta > 0 ? SCROLL_STEP : -SCROLL_STEP;
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset + step));
  }

  update(dt: number): void {
    this.smoothScrollOffset += (this.scrollOffset - this.smoothScrollOffset) * Math.min(1, dt * 12);
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;

    ctx.save();

    // Background overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, width, height);

    const { px, py } = this.getPanelRect(width, height);

    // Panel background
    const panelGrad = ctx.createLinearGradient(px, py, px, py + PANEL_H);
    panelGrad.addColorStop(0, "rgba(15, 25, 50, 0.92)");
    panelGrad.addColorStop(1, "rgba(5, 10, 25, 0.96)");
    ctx.fillStyle = panelGrad;
    ctx.beginPath();
    ctx.roundRect(px, py, PANEL_W, PANEL_H, PANEL_RADIUS);
    ctx.fill();

    ctx.strokeStyle = "rgba(100, 140, 220, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px, py, PANEL_W, PANEL_H, PANEL_RADIUS);
    ctx.stroke();

    // Header
    this.renderHeader(ctx, px, py, width);

    // Close button
    this.renderCloseButton(ctx, px, py);

    // Category tabs
    this.renderCategoryTabs(ctx, px, py);

    // Achievement cards (clipped)
    const filtered = this.getFilteredAchievements();
    this.renderCards(ctx, px, py, filtered);

    // Scrollbar
    this.renderScrollbar(ctx, px, py, filtered.length);

    ctx.restore();
  }

  private getPanelRect(width: number, height: number) {
    const px = (width - PANEL_W) / 2;
    const py = (height - PANEL_H) / 2;
    return { px, py };
  }

  private getFilteredAchievements(): AchievementEntry[] {
    if (this.selectedCategory === "all") return this.achievements;
    return this.achievements.filter((a) => a.definition.category === this.selectedCategory);
  }

  private getContentAreaHeight(): number {
    return PANEL_H - HEADER_H - TAB_BAR_H - CONTENT_PADDING * 2;
  }

  private getTotalContentHeight(count: number): number {
    const rows = Math.ceil(count / CARD_COLS);
    return rows * CARD_H + Math.max(0, rows - 1) * CARD_GAP;
  }

  private getMaxScroll(count: number): number {
    const contentH = this.getTotalContentHeight(count);
    const visibleH = this.getContentAreaHeight();
    return Math.max(0, contentH - visibleH);
  }

  private renderHeader(ctx: CanvasRenderingContext2D, px: number, py: number, _width: number): void {
    const unlocked = this.achievements.filter((a) => a.unlocked).length;
    const total = this.achievements.length;

    ctx.font = `16px ${RETRO_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("ACHIEVEMENTS", px + PANEL_W / 2, py + HEADER_H / 2);

    ctx.font = `10px ${RETRO_FONT}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`${unlocked}/${total}`, px + PANEL_W - CONTENT_PADDING, py + HEADER_H / 2);
  }

  private renderCloseButton(ctx: CanvasRenderingContext2D, px: number, py: number): void {
    const x = px + PANEL_W - CLOSE_BTN_SIZE - 10;
    const y = py + 10;

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.roundRect(x, y, CLOSE_BTN_SIZE, CLOSE_BTN_SIZE, 4);
    ctx.fill();

    ctx.font = `12px ${RETRO_FONT}`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2715", x + CLOSE_BTN_SIZE / 2, y + CLOSE_BTN_SIZE / 2);
  }

  private renderCategoryTabs(ctx: CanvasRenderingContext2D, px: number, py: number): void {
    const tabY = py + HEADER_H;
    const tabAreaW = PANEL_W - 2 * CONTENT_PADDING;
    const tabW = tabAreaW / CATEGORIES.length;
    const tabStartX = px + CONTENT_PADDING;

    for (let i = 0; i < CATEGORIES.length; i++) {
      const cat = CATEGORIES[i];
      const tx = tabStartX + i * tabW;
      const isActive = cat === this.selectedCategory;

      if (isActive) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.roundRect(tx + 2, tabY + 3, tabW - 4, TAB_BAR_H - 6, 4);
        ctx.fill();
      }

      ctx.font = `6px ${RETRO_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isActive ? "#FFFFFF" : "#8899AA";
      ctx.fillText(CATEGORY_LABELS[cat], tx + tabW / 2, tabY + TAB_BAR_H / 2);
    }
  }

  private renderCards(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    filtered: AchievementEntry[],
  ): void {
    const contentX = px + CONTENT_PADDING;
    const contentY = py + HEADER_H + TAB_BAR_H + CONTENT_PADDING;
    const contentH = this.getContentAreaHeight();

    if (filtered.length === 0) {
      ctx.font = `8px ${RETRO_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#667799";
      ctx.fillText("No achievements in this category", px + PANEL_W / 2, contentY + contentH / 2);
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX, contentY, PANEL_W - 2 * CONTENT_PADDING, contentH);
    ctx.clip();

    const gridWidth = CARD_COLS * CARD_W + (CARD_COLS - 1) * CARD_GAP;
    const gridOffsetX = contentX + ((PANEL_W - 2 * CONTENT_PADDING) - gridWidth) / 2;

    for (let i = 0; i < filtered.length; i++) {
      const col = i % CARD_COLS;
      const row = Math.floor(i / CARD_COLS);
      const cardX = gridOffsetX + col * (CARD_W + CARD_GAP);
      const cardY = contentY + row * (CARD_H + CARD_GAP) - this.smoothScrollOffset;

      if (cardY + CARD_H < contentY || cardY > contentY + contentH) continue;

      this.renderCard(ctx, filtered[i], cardX, cardY);
    }

    ctx.restore();
  }

  private renderCard(
    ctx: CanvasRenderingContext2D,
    entry: AchievementEntry,
    x: number,
    y: number,
  ): void {
    const { definition, unlocked, progress, unlockedAt } = entry;
    const isHiddenLocked = !unlocked && definition.hidden;

    // Card background
    ctx.fillStyle = unlocked ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, CARD_RADIUS);
    ctx.fill();

    // Card border
    ctx.strokeStyle = unlocked ? "#FFD700" : "rgba(150, 150, 150, 0.3)";
    ctx.lineWidth = unlocked ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, CARD_RADIUS);
    ctx.stroke();

    // Icon
    const iconX = x + 8;
    const iconY = y + CARD_H / 2;
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (unlocked) {
      const glyph = ICON_GLYPHS[definition.icon] ?? FALLBACK_GLYPH;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(glyph, iconX + 18, iconY);
    } else {
      ctx.fillStyle = "#95a5a6";
      ctx.fillText("\u{1F512}", iconX + 18, iconY);
    }

    // Text area
    const textX = x + 48;
    const textMaxW = CARD_W - 58;

    // Name
    ctx.font = `8px ${RETRO_FONT}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = unlocked ? "#FFD700" : "#95a5a6";
    const nameText = isHiddenLocked ? "???" : definition.name;
    ctx.fillText(this.truncate(ctx, nameText, textMaxW - 60), textX, y + 20);

    // Description
    ctx.font = `6px ${RETRO_FONT}`;
    ctx.fillStyle = unlocked ? "#D0D8E8" : "#666666";
    const descText = isHiddenLocked ? "Hidden achievement" : definition.description;
    ctx.fillText(this.truncate(ctx, descText, textMaxW), textX, y + 38);

    // Unlock date (for unlocked) or progress bar (for locked non-hidden)
    if (unlocked && unlockedAt) {
      ctx.font = `6px ${RETRO_FONT}`;
      ctx.fillStyle = "#667799";
      ctx.textAlign = "right";
      ctx.fillText(formatRelativeDate(unlockedAt), x + CARD_W - 8, y + 20);
      ctx.textAlign = "left";
    } else if (!unlocked && !isHiddenLocked && definition.condition.type === "stat_threshold") {
      const barX = textX;
      const barY = y + 54;
      const barW = textMaxW - 40;
      const barH = 4;
      const fillFrac = Math.min(1, progress / 100);

      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(barX, barY, barW, barH);

      if (fillFrac > 0) {
        ctx.fillStyle = "#3498db";
        ctx.fillRect(barX, barY, barW * fillFrac, barH);
      }

      ctx.font = `5px ${RETRO_FONT}`;
      ctx.fillStyle = "#667799";
      ctx.textAlign = "right";
      ctx.fillText(`${Math.floor(progress)}%`, x + CARD_W - 8, barY + barH / 2);
      ctx.textAlign = "left";
    }
  }

  private renderScrollbar(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    count: number,
  ): void {
    const maxScroll = this.getMaxScroll(count);
    if (maxScroll <= 0) return;

    const contentY = py + HEADER_H + TAB_BAR_H + CONTENT_PADDING;
    const contentH = this.getContentAreaHeight();
    const scrollbarX = px + PANEL_W - CONTENT_PADDING - 4;
    const scrollbarH = contentH;
    const totalH = this.getTotalContentHeight(count);
    const thumbH = Math.max(20, (contentH / totalH) * scrollbarH);
    const thumbY = contentY + (this.smoothScrollOffset / maxScroll) * (scrollbarH - thumbH);

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(scrollbarX, contentY, 4, scrollbarH);

    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.roundRect(scrollbarX, thumbY, 4, thumbH, 2);
    ctx.fill();
  }

  private truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) return text;
    const ellipsis = "...";
    const ellipsisW = ctx.measureText(ellipsis).width;
    let t = text;
    while (t.length > 0 && ctx.measureText(t).width + ellipsisW > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + ellipsis;
  }

}
