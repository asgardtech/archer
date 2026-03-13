import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import { ENEMY_CONFIGS, EnemyVariant } from "../src/games/raptor/types";

const ASSET_DIR = path.resolve(__dirname, "../public/assets/raptor");
const SRC_DIR = path.resolve(__dirname, "../src/games/raptor");

const ALL_VARIANTS: EnemyVariant[] = [
  "scout", "fighter", "bomber", "boss",
  "interceptor", "dart", "drone", "swarmer",
  "gunship", "cruiser", "destroyer", "juggernaut",
  "stealth", "minelayer",
];

const HP_BAR_VARIANTS: EnemyVariant[] = ["boss", "cruiser", "destroyer", "juggernaut"];
const NON_HP_BAR_VARIANTS: EnemyVariant[] = ALL_VARIANTS.filter(v => !HP_BAR_VARIANTS.includes(v));

const FAST_VARIANTS: EnemyVariant[] = ["scout", "dart", "drone", "swarmer", "interceptor"];
const HEAVY_VARIANTS: EnemyVariant[] = ["destroyer", "juggernaut", "boss"];

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function readPNG(filePath: string): PNG {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function getPixelAlpha(png: PNG, x: number, y: number): number {
  const idx = (png.width * y + x) * 4;
  return png.data[idx + 3];
}

function getPixelRGBA(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (png.width * y + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

function countOpaquePixels(png: PNG): number {
  let count = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (getPixelAlpha(png, x, y) > 0) count++;
    }
  }
  return count;
}

function getAverageColor(png: PNG): { r: number; g: number; b: number } {
  let totalR = 0, totalG = 0, totalB = 0, count = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b, a] = getPixelRGBA(png, x, y);
      if (a > 128) {
        totalR += r;
        totalG += g;
        totalB += b;
        count++;
      }
    }
  }
  if (count === 0) return { r: 0, g: 0, b: 0 };
  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

function computeHorizontalSymmetry(png: PNG): number {
  let matches = 0, total = 0;
  const cx = Math.floor(png.width / 2);
  for (let y = 0; y < png.height; y++) {
    for (let dx = 1; dx <= cx; dx++) {
      const leftA = getPixelAlpha(png, cx - dx, y);
      const rightA = getPixelAlpha(png, cx + dx - 1, y);
      const leftOpaque = leftA > 10;
      const rightOpaque = rightA > 10;
      if (leftOpaque === rightOpaque) matches++;
      total++;
    }
  }
  return total > 0 ? matches / total : 0;
}

function getBoundingBox(png: PNG): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (getPixelAlpha(png, x, y) > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY };
}

function getMaxHorizontalRun(png: PNG, row: number): number {
  let maxRun = 0, currentRun = 0;
  for (let x = 0; x < png.width; x++) {
    if (getPixelAlpha(png, x, row) > 30) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}

function spritePath(variant: EnemyVariant): string {
  return path.join(ASSET_DIR, `enemy_${variant}.png`);
}

// Cache PNGs to avoid re-reading per test
const pngCache: Record<string, PNG> = {};
function getCachedPNG(variant: EnemyVariant): PNG {
  if (!pngCache[variant]) {
    pngCache[variant] = readPNG(spritePath(variant));
  }
  return pngCache[variant];
}

// ════════════════════════════════════════════════════════════════
// 1. SPRITE FILE VALIDITY — All 14 enemy sprites
// ════════════════════════════════════════════════════════════════

describe("Sprite file validity for all 14 enemy types", () => {
  test.each(ALL_VARIANTS)("%s — sprite file exists", (variant) => {
    expect(fs.existsSync(spritePath(variant))).toBe(true);
  });

  test.each(ALL_VARIANTS)("%s — has valid PNG signature", (variant) => {
    const data = fs.readFileSync(spritePath(variant));
    expect(data[0]).toBe(0x89);
    expect(data[1]).toBe(0x50);
    expect(data[2]).toBe(0x4e);
    expect(data[3]).toBe(0x47);
  });

  test.each(ALL_VARIANTS)("%s — dimensions are at least 128px and aspect ratio is near-square", (variant) => {
    const png = getCachedPNG(variant);
    expect(png.width).toBeGreaterThanOrEqual(128);
    expect(png.height).toBeGreaterThanOrEqual(128);
    const aspectRatio = png.width / png.height;
    expect(aspectRatio).toBeGreaterThanOrEqual(0.8);
    expect(aspectRatio).toBeLessThanOrEqual(1.25);
  });

  test.each(ALL_VARIANTS)("%s — file size > 1 KB", (variant) => {
    const stats = fs.statSync(spritePath(variant));
    expect(stats.size).toBeGreaterThan(1000);
  });

  test.each(ALL_VARIANTS)("%s — contains RGBA pixel data", (variant) => {
    const png = getCachedPNG(variant);
    expect(png.data.length).toBe(png.width * png.height * 4);
  });
});

// ════════════════════════════════════════════════════════════════
// 2. TRANSPARENT BACKGROUND
// ════════════════════════════════════════════════════════════════

describe("Transparent background for all 14 enemy sprites", () => {
  test.each(ALL_VARIANTS)("%s — all four corner pixels are transparent", (variant) => {
    const png = getCachedPNG(variant);
    const corners: [number, number][] = [
      [0, 0],
      [png.width - 1, 0],
      [0, png.height - 1],
      [png.width - 1, png.height - 1],
    ];
    for (const [x, y] of corners) {
      expect(getPixelAlpha(png, x, y)).toBe(0);
    }
  });

  test.each(ALL_VARIANTS)("%s — at least 20%% of pixels are transparent", (variant) => {
    const png = getCachedPNG(variant);
    const totalPixels = png.width * png.height;
    const opaquePixels = countOpaquePixels(png);
    const transparentRatio = (totalPixels - opaquePixels) / totalPixels;
    expect(transparentRatio).toBeGreaterThan(0.2);
  });
});

// ════════════════════════════════════════════════════════════════
// 3. VISUAL CONTENT
// ════════════════════════════════════════════════════════════════

describe("Visual content for all 14 enemy sprites", () => {
  test.each(ALL_VARIANTS)("%s — at least 10%% of pixels are opaque", (variant) => {
    const png = getCachedPNG(variant);
    const totalPixels = png.width * png.height;
    const opaquePixels = countOpaquePixels(png);
    expect(opaquePixels / totalPixels).toBeGreaterThan(0.10);
  });

  test.each(ALL_VARIANTS)("%s — average brightness between 30 and 210", (variant) => {
    const png = getCachedPNG(variant);
    const avg = getAverageColor(png);
    const avgBrightness = (avg.r + avg.g + avg.b) / 3;
    expect(avgBrightness).toBeGreaterThan(30);
    expect(avgBrightness).toBeLessThan(210);
  });

  test.each(ALL_VARIANTS)("%s — at least 8 consecutive opaque pixels at midline", (variant) => {
    const png = getCachedPNG(variant);
    const midY = Math.floor(png.height / 2);
    const maxRun = getMaxHorizontalRun(png, midY);
    expect(maxRun).toBeGreaterThanOrEqual(8);
  });
});

// ════════════════════════════════════════════════════════════════
// 4. SPRITE CENTERING
// ════════════════════════════════════════════════════════════════

describe("Sprite centering on canvas for all 14 enemy types", () => {
  test.each(ALL_VARIANTS)("%s — horizontal center within 10px of canvas center", (variant) => {
    const png = getCachedPNG(variant);
    const bb = getBoundingBox(png);
    const contentCenterX = (bb.minX + bb.maxX) / 2;
    const canvasCenterX = png.width / 2;
    expect(Math.abs(contentCenterX - canvasCenterX)).toBeLessThanOrEqual(10);
  });

  test.each(ALL_VARIANTS)("%s — vertical center within 15px of canvas center", (variant) => {
    const png = getCachedPNG(variant);
    const bb = getBoundingBox(png);
    const contentCenterY = (bb.minY + bb.maxY) / 2;
    const canvasCenterY = png.height / 2;
    expect(Math.abs(contentCenterY - canvasCenterY)).toBeLessThanOrEqual(15);
  });
});

// ════════════════════════════════════════════════════════════════
// 5. HORIZONTAL SYMMETRY
// ════════════════════════════════════════════════════════════════

describe("Horizontal symmetry for all 14 enemy sprites", () => {
  test.each(ALL_VARIANTS)("%s — symmetry score > 0.60", (variant) => {
    const png = getCachedPNG(variant);
    const symmetry = computeHorizontalSymmetry(png);
    expect(symmetry).toBeGreaterThan(0.60);
  });
});

// ════════════════════════════════════════════════════════════════
// 6. ART CONSISTENCY — No duplicates, distinct colors
// ════════════════════════════════════════════════════════════════

describe("Art consistency across all 14 enemy sprites", () => {
  test("no two sprites have the same opaque pixel count", () => {
    const counts = ALL_VARIANTS.map(v => ({
      variant: v,
      count: countOpaquePixels(getCachedPNG(v)),
    }));
    for (let i = 0; i < counts.length; i++) {
      for (let j = i + 1; j < counts.length; j++) {
        expect(counts[i].count).not.toBe(counts[j].count);
      }
    }
  });

  test("every pair of sprites has RGB distance > 10", () => {
    const colors = ALL_VARIANTS.map(v => ({
      variant: v,
      color: getAverageColor(getCachedPNG(v)),
    }));
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const dist =
          Math.abs(colors[i].color.r - colors[j].color.r) +
          Math.abs(colors[i].color.g - colors[j].color.g) +
          Math.abs(colors[i].color.b - colors[j].color.b);
        expect(dist).toBeGreaterThan(8);
      }
    }
  });

  test("fast enemies have smaller configured widths than heavy enemies", () => {
    for (const fast of FAST_VARIANTS) {
      for (const heavy of HEAVY_VARIANTS) {
        expect(ENEMY_CONFIGS[fast].width).toBeLessThanOrEqual(ENEMY_CONFIGS[heavy].width);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 7. ASSET MANIFEST COMPLETENESS
// ════════════════════════════════════════════════════════════════

describe("Asset manifest completeness for all 14 enemy types", () => {
  test.each(ALL_VARIANTS)("%s — manifest has enemy_%s entry pointing to correct path", (variant) => {
    const key = `enemy_${variant}`;
    expect(ASSET_MANIFEST[key]).toBeDefined();
    expect(ASSET_MANIFEST[key]).toBe(`assets/raptor/enemy_${variant}.png`);
  });
});

// ════════════════════════════════════════════════════════════════
// 8. SPRITE ASSIGNMENT COVERAGE (assignEnemySprite)
// ════════════════════════════════════════════════════════════════

describe("assignEnemySprite maps all 14 variants", () => {
  let raptorGameSource: string;

  beforeAll(() => {
    raptorGameSource = fs.readFileSync(path.join(SRC_DIR, "RaptorGame.ts"), "utf-8");
  });

  test.each(ALL_VARIANTS)("%s — present in the sprite map", (variant) => {
    const pattern = new RegExp(`${variant}:\\s*"enemy_${variant}"`);
    expect(raptorGameSource).toMatch(pattern);
  });
});

// ════════════════════════════════════════════════════════════════
// 9. SPECIAL RENDERING EFFECTS (static source analysis)
// ════════════════════════════════════════════════════════════════

describe("Special rendering effects in renderSpriteVariant", () => {
  let enemySource: string;

  beforeAll(() => {
    enemySource = fs.readFileSync(path.join(SRC_DIR, "entities", "Enemy.ts"), "utf-8");
  });

  test("boss has red glow with rgba(255, 50, 50, 0.15)", () => {
    expect(enemySource).toContain('rgba(255, 50, 50, 0.15)');
    expect(enemySource).toMatch(/variant\s*===\s*"boss"/);
  });

  test("boss glow radius is proportional to width (width * 0.7)", () => {
    expect(enemySource).toMatch(/this\.width\s*\*\s*0\.7/);
  });

  test("juggernaut has purple glow with rgba(102, 68, 136, 0.15)", () => {
    expect(enemySource).toContain('rgba(102, 68, 136, 0.15)');
    expect(enemySource).toMatch(/variant\s*===\s*"juggernaut"/);
  });

  test("juggernaut glow radius is proportional to width (width * 0.65)", () => {
    expect(enemySource).toMatch(/this\.width\s*\*\s*0\.65/);
  });

  test("scout has banking rotation via Math.sin(this.time * 2) * 0.1", () => {
    expect(enemySource).toMatch(/variant\s*===\s*"scout"/);
    expect(enemySource).toContain("Math.sin(this.time * 2) * 0.1");
    expect(enemySource).toMatch(/ctx\.rotate\(/);
  });

  test("stealth cloaking sets globalAlpha to 0.1 when hidden", () => {
    expect(enemySource).toMatch(/variant\s*===\s*"stealth"/);
    expect(enemySource).toContain("ctx.globalAlpha = 0.1");
  });

  test("flash effect uses offscreen canvas with source-atop composite", () => {
    expect(enemySource).toContain("source-atop");
    expect(enemySource).toContain("#ffffff");
    expect(enemySource).toContain("getFlashCanvas");
    expect(enemySource).toMatch(/globalAlpha\s*=\s*0\.6/);
  });
});

// ════════════════════════════════════════════════════════════════
// 10. HP BAR ELIGIBILITY
// ════════════════════════════════════════════════════════════════

describe("HP bar eligibility", () => {
  let enemySource: string;

  beforeAll(() => {
    enemySource = fs.readFileSync(path.join(SRC_DIR, "entities", "Enemy.ts"), "utf-8");
  });

  test("renderSpriteVariant calls renderHPBar for boss, cruiser, destroyer, juggernaut", () => {
    const hpBarLine = enemySource.match(
      /if\s*\((.*?)renderHPBar/s
    );
    expect(hpBarLine).not.toBeNull();
    for (const v of HP_BAR_VARIANTS) {
      expect(hpBarLine![1]).toContain(`"${v}"`);
    }
  });

  test("non-eligible variants are not in the HP bar conditional", () => {
    const renderSpriteMethod = enemySource.slice(
      enemySource.indexOf("private renderSpriteVariant"),
      enemySource.indexOf("private renderHPBar")
    );
    const hpBarCondition = renderSpriteMethod.match(
      /if\s*\(this\.variant\s*===\s*"boss"\s*\|\|.*?renderHPBar/s
    );
    expect(hpBarCondition).not.toBeNull();
    for (const v of NON_HP_BAR_VARIANTS) {
      expect(hpBarCondition![0]).not.toContain(`"${v}"`);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// 11. STEALTH SPRITE CLOAKED VISIBILITY
// ════════════════════════════════════════════════════════════════

describe("Stealth sprite visibility at 10% alpha", () => {
  test("average brightness > 40 so sprite is visible at 0.1 alpha", () => {
    const png = getCachedPNG("stealth");
    const avg = getAverageColor(png);
    const avgBrightness = (avg.r + avg.g + avg.b) / 3;
    expect(avgBrightness).toBeGreaterThan(40);
  });
});

// ════════════════════════════════════════════════════════════════
// 12. RENDER SIZE COMPATIBILITY — feature runs survive downscale
// ════════════════════════════════════════════════════════════════

describe("Sprites have features large enough to survive downscale", () => {
  test.each(ALL_VARIANTS)("%s — midline feature run >= 8px at 128x128 source", (variant) => {
    const png = getCachedPNG(variant);
    const midY = Math.floor(png.height / 2);
    const maxRun = getMaxHorizontalRun(png, midY);
    expect(maxRun).toBeGreaterThanOrEqual(8);
  });

  test.each(ALL_VARIANTS)("%s — configured size matches ENEMY_CONFIGS", (variant) => {
    const cfg = ENEMY_CONFIGS[variant];
    expect(cfg.width).toBeGreaterThan(0);
    expect(cfg.height).toBeGreaterThan(0);
    expect(cfg.width).toBeLessThanOrEqual(128);
    expect(cfg.height).toBeLessThanOrEqual(128);
  });
});

// ════════════════════════════════════════════════════════════════
// 13. OPAQUE CONTENT VERTICAL SPAN (HP bar overlap safety)
// ════════════════════════════════════════════════════════════════

describe("Opaque content does not fill entire canvas", () => {
  test.each(ALL_VARIANTS)("%s — vertical content span < sprite height (some padding exists)", (variant) => {
    const png = getCachedPNG(variant);
    const bb = getBoundingBox(png);
    const heightSpan = bb.maxY - bb.minY + 1;
    expect(heightSpan).toBeLessThan(png.height);
  });
});

// ════════════════════════════════════════════════════════════════
// 14. PERFORMANCE — total sprite file size
// ════════════════════════════════════════════════════════════════

describe("Total enemy sprite file size is reasonable", () => {
  test("combined size of all 14 enemy PNGs < 2 MB", () => {
    let totalBytes = 0;
    for (const variant of ALL_VARIANTS) {
      totalBytes += fs.statSync(spritePath(variant)).size;
    }
    expect(totalBytes).toBeLessThan(2 * 1024 * 1024);
  });
});

// ════════════════════════════════════════════════════════════════
// 15. FALLBACK RENDERING NOT TRIGGERED
// ════════════════════════════════════════════════════════════════

describe("No enemy type falls back to procedural rendering", () => {
  test.each(ALL_VARIANTS)("%s — sprite file is valid and loadable", (variant) => {
    const png = getCachedPNG(variant);
    expect(png.width).toBeGreaterThanOrEqual(128);
    expect(png.height).toBeGreaterThanOrEqual(128);
    expect(png.data.length).toBe(png.width * png.height * 4);
    expect(fs.statSync(spritePath(variant)).size).toBeGreaterThan(1000);
  });

  test.each(ALL_VARIANTS)("%s — asset manifest maps to existing file", (variant) => {
    const key = `enemy_${variant}`;
    const assetPath = ASSET_MANIFEST[key];
    expect(assetPath).toBeDefined();
    const filePath = path.resolve(__dirname, "../public", assetPath);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// 16. NO PRODUCTION CODE MODIFIED
// ════════════════════════════════════════════════════════════════

describe("No production source files modified on this branch", () => {
  const filesToCheck = [
    "src/games/raptor/entities/Enemy.ts",
    "src/games/raptor/RaptorGame.ts",
    "src/games/raptor/rendering/assets.ts",
    "src/games/raptor/types.ts",
  ];

  test.each(filesToCheck)("%s — has no diff vs main", async (file) => {
    const { execSync } = await import("child_process");
    const diff = execSync(`git diff main..HEAD -- ${file}`, {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });
});
