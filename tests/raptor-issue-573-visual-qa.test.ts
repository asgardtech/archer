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

// ── Utility Functions ────────────────────────────────────────────────

function readPNG(filePath: string): PNG {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function spritePath(variant: string): string {
  return path.join(ASSET_DIR, `enemy_${variant}.png`);
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

function readSourceFile(relPath: string): string {
  return fs.readFileSync(path.join(SRC_DIR, relPath), "utf-8");
}

const spriteCache = new Map<string, PNG>();
function getSprite(variant: string): PNG {
  if (!spriteCache.has(variant)) {
    spriteCache.set(variant, readPNG(spritePath(variant)));
  }
  return spriteCache.get(variant)!;
}

// ════════════════════════════════════════════════════════════════
// 1. SPRITE FILE VALIDITY — all 14 sprites
// ════════════════════════════════════════════════════════════════

describe("Sprite file validity", () => {
  describe.each(ALL_VARIANTS)("enemy_%s sprite", (variant) => {
    const filePath = spritePath(variant);

    test("file exists", () => {
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test("has valid PNG signature", () => {
      const data = fs.readFileSync(filePath);
      expect(data[0]).toBe(0x89);
      expect(data[1]).toBe(0x50);
      expect(data[2]).toBe(0x4e);
      expect(data[3]).toBe(0x47);
    });

    test("dimensions are 128x128 pixels", () => {
      const png = getSprite(variant);
      expect(png.width).toBe(128);
      expect(png.height).toBe(128);
    });

    test("file size is greater than 1000 bytes", () => {
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(1000);
    });

    test("contains RGBA pixel data", () => {
      const png = getSprite(variant);
      expect(png.data.length).toBe(png.width * png.height * 4);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 2. TRANSPARENT BACKGROUNDS — all 14 sprites
// ════════════════════════════════════════════════════════════════

describe("Sprite transparent backgrounds", () => {
  describe.each(ALL_VARIANTS)("enemy_%s sprite", (variant) => {
    test("all four corner pixels have alpha = 0", () => {
      const png = getSprite(variant);
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

    test("at least 20% of pixels are fully transparent", () => {
      const png = getSprite(variant);
      const totalPixels = png.width * png.height;
      const opaquePixels = countOpaquePixels(png);
      const transparentRatio = (totalPixels - opaquePixels) / totalPixels;
      expect(transparentRatio).toBeGreaterThan(0.2);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 3. VISUAL CONTENT — all 14 sprites
// ════════════════════════════════════════════════════════════════

describe("Sprite visual content", () => {
  describe.each(ALL_VARIANTS)("enemy_%s sprite", (variant) => {
    test("at least 10% of pixels are opaque", () => {
      const png = getSprite(variant);
      const totalPixels = png.width * png.height;
      const opaquePixels = countOpaquePixels(png);
      expect(opaquePixels / totalPixels).toBeGreaterThan(0.10);
    });

    test("average brightness of opaque pixels is between 30 and 210", () => {
      const png = getSprite(variant);
      const avg = getAverageColor(png);
      const avgBrightness = (avg.r + avg.g + avg.b) / 3;
      expect(avgBrightness).toBeGreaterThan(30);
      expect(avgBrightness).toBeLessThan(210);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 4. SPRITE CENTERING & BOUNDS
// ════════════════════════════════════════════════════════════════

describe("Sprite centering on canvas", () => {
  describe.each(ALL_VARIANTS)("enemy_%s sprite", (variant) => {
    test("horizontal center of content is within 10px of canvas center", () => {
      const png = getSprite(variant);
      const bb = getBoundingBox(png);
      const contentCenterX = (bb.minX + bb.maxX) / 2;
      const canvasCenterX = png.width / 2;
      expect(Math.abs(contentCenterX - canvasCenterX)).toBeLessThanOrEqual(10);
    });

    test("vertical center of content is within 15px of canvas center", () => {
      const png = getSprite(variant);
      const bb = getBoundingBox(png);
      const contentCenterY = (bb.minY + bb.maxY) / 2;
      const canvasCenterY = png.height / 2;
      expect(Math.abs(contentCenterY - canvasCenterY)).toBeLessThanOrEqual(15);
    });
  });
});

// ════════════════════════════════════════════════════════════════
// 5. HORIZONTAL SYMMETRY — all 14 sprites
// ════════════════════════════════════════════════════════════════

describe("Horizontal symmetry", () => {
  test.each(ALL_VARIANTS)("enemy_%s symmetry score > 0.60", (variant) => {
    const png = getSprite(variant);
    const symmetry = computeHorizontalSymmetry(png);
    expect(symmetry).toBeGreaterThan(0.60);
  });
});

// ════════════════════════════════════════════════════════════════
// 6. CROSS-SPRITE ART CONSISTENCY
// ════════════════════════════════════════════════════════════════

describe("Art consistency across all sprites", () => {
  test("no two sprites have the same opaque pixel count", () => {
    const counts = new Map<number, string>();
    for (const variant of ALL_VARIANTS) {
      const png = getSprite(variant);
      const count = countOpaquePixels(png);
      const existing = counts.get(count);
      expect(existing).toBeUndefined();
      counts.set(count, variant);
    }
  });

  test("all sprite pairs have RGB color distance > 10", () => {
    const colors = ALL_VARIANTS.map(v => ({
      variant: v,
      color: getAverageColor(getSprite(v)),
    }));

    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const a = colors[i];
        const b = colors[j];
        const dist = Math.abs(a.color.r - b.color.r) +
                     Math.abs(a.color.g - b.color.g) +
                     Math.abs(a.color.b - b.color.b);
        expect(dist).toBeGreaterThan(10);
      }
    }
  });

  test("fast enemy types have smaller configured sizes than heavy types", () => {
    expect(ENEMY_CONFIGS.drone.width).toBeLessThanOrEqual(ENEMY_CONFIGS.destroyer.width);
    expect(ENEMY_CONFIGS.dart.width).toBeLessThanOrEqual(ENEMY_CONFIGS.juggernaut.width);
    expect(ENEMY_CONFIGS.swarmer.width).toBeLessThanOrEqual(ENEMY_CONFIGS.boss.width);
    expect(ENEMY_CONFIGS.scout.width).toBeLessThanOrEqual(ENEMY_CONFIGS.cruiser.width);
  });
});

// ════════════════════════════════════════════════════════════════
// 7. ASSET MANIFEST COMPLETENESS
// ════════════════════════════════════════════════════════════════

describe("Asset manifest completeness", () => {
  test.each(ALL_VARIANTS)("manifest has entry enemy_%s pointing to correct path", (variant) => {
    const key = `enemy_${variant}`;
    expect(ASSET_MANIFEST[key]).toBeDefined();
    expect(ASSET_MANIFEST[key]).toBe(`assets/raptor/enemy_${variant}.png`);
  });
});

// ════════════════════════════════════════════════════════════════
// 8. SPRITE ASSIGNMENT COVERAGE
// ════════════════════════════════════════════════════════════════

describe("assignEnemySprite maps all 14 variants", () => {
  const raptorGameSrc = fs.readFileSync(
    path.resolve(__dirname, "../src/games/raptor/RaptorGame.ts"), "utf-8"
  );

  test.each(ALL_VARIANTS)("spriteMap includes '%s'", (variant) => {
    const pattern = new RegExp(`${variant}\\s*:\\s*"enemy_${variant}"`);
    expect(raptorGameSrc).toMatch(pattern);
  });
});

// ════════════════════════════════════════════════════════════════
// 9. SPECIAL RENDERING EFFECTS — static source analysis
// ════════════════════════════════════════════════════════════════

describe("Special rendering effects in renderSpriteVariant", () => {
  const enemySrc = readSourceFile("entities/Enemy.ts");

  test("boss has red glow with rgba(255, 50, 50, 0.15)", () => {
    expect(enemySrc).toContain('rgba(255, 50, 50, 0.15)');
  });

  test("boss glow radius is proportional to enemy width (this.width * 0.7)", () => {
    expect(enemySrc).toMatch(/this\.width\s*\*\s*0\.7/);
  });

  test("juggernaut has purple glow with rgba(102, 68, 136, 0.15)", () => {
    expect(enemySrc).toContain('rgba(102, 68, 136, 0.15)');
  });

  test("juggernaut glow radius is proportional to enemy width (this.width * 0.65)", () => {
    expect(enemySrc).toMatch(/this\.width\s*\*\s*0\.65/);
  });

  test("scout has banking rotation via Math.sin(this.time * 2) * 0.1", () => {
    expect(enemySrc).toMatch(/Math\.sin\(this\.time\s*\*\s*2\)\s*\*\s*0\.1/);
  });

  test("stealth cloaking sets globalAlpha to 0.1 when cloakVisible is false", () => {
    expect(enemySrc).toContain('ctx.globalAlpha = 0.1');
    expect(enemySrc).toMatch(/variant\s*===\s*"stealth"\s*&&\s*!this\.cloakVisible/);
  });

  test("flash effect uses offscreen canvas with source-atop compositing", () => {
    expect(enemySrc).toContain('"source-atop"');
    expect(enemySrc).toContain('getFlashCanvas');
  });

  test("flash effect fills with white #ffffff", () => {
    expect(enemySrc).toContain('"#ffffff"');
  });

  test("flash effect uses reduced alpha of 0.6", () => {
    expect(enemySrc).toMatch(/globalAlpha\s*=\s*0\.6/);
  });
});

// ════════════════════════════════════════════════════════════════
// 10. HP BAR ELIGIBILITY
// ════════════════════════════════════════════════════════════════

describe("HP bar eligibility", () => {
  const enemySrc = readSourceFile("entities/Enemy.ts");

  test.each(HP_BAR_VARIANTS)(
    "renderHPBar is called for '%s' in renderSpriteVariant",
    (variant) => {
      const spriteVariantMatch = enemySrc.match(
        /renderSpriteVariant[\s\S]*?(?=\n\s*private\s+renderHPBar)/
      );
      expect(spriteVariantMatch).not.toBeNull();
      const spriteVariantBody = spriteVariantMatch![0];
      expect(spriteVariantBody).toContain(`"${variant}"`);
      expect(spriteVariantBody).toContain("renderHPBar");
    }
  );

  test.each(NON_HP_BAR_VARIANTS)(
    "HP bar condition in renderSpriteVariant does NOT include '%s'",
    (variant) => {
      const hpBarCondition = enemySrc.match(
        /if\s*\(this\.variant\s*===\s*"boss"\s*\|\|\s*this\.variant\s*===\s*"cruiser"\s*\|\|\s*this\.variant\s*===\s*"destroyer"\s*\|\|\s*this\.variant\s*===\s*"juggernaut"\)/
      );
      expect(hpBarCondition).not.toBeNull();
      expect(hpBarCondition![0]).not.toContain(`"${variant}"`);
    }
  );
});

// ════════════════════════════════════════════════════════════════
// 11. STEALTH VISIBILITY AT LOW ALPHA
// ════════════════════════════════════════════════════════════════

describe("Stealth sprite visibility at 10% alpha", () => {
  test("average brightness > 40 so sprite is visible when cloaked", () => {
    const png = getSprite("stealth");
    const avg = getAverageColor(png);
    const avgBrightness = (avg.r + avg.g + avg.b) / 3;
    expect(avgBrightness).toBeGreaterThan(40);
  });
});

// ════════════════════════════════════════════════════════════════
// 12. RENDER SIZE COMPATIBILITY — downscale feature survival
// ════════════════════════════════════════════════════════════════

describe("Sprite features survive downscale", () => {
  const sizeTable: [EnemyVariant, number, number][] = [
    ["scout", 24, 24],
    ["fighter", 30, 30],
    ["bomber", 40, 36],
    ["boss", 64, 56],
    ["interceptor", 22, 22],
    ["dart", 18, 20],
    ["drone", 16, 16],
    ["swarmer", 18, 18],
    ["gunship", 34, 32],
    ["cruiser", 48, 44],
    ["destroyer", 52, 48],
    ["juggernaut", 56, 52],
    ["stealth", 28, 26],
    ["minelayer", 32, 28],
  ];

  test.each(sizeTable)(
    "enemy_%s (render %dx%d) has >=8px horizontal feature run at source",
    (variant, expectedWidth, expectedHeight) => {
      expect(ENEMY_CONFIGS[variant].width).toBe(expectedWidth);
      expect(ENEMY_CONFIGS[variant].height).toBe(expectedHeight);

      const png = getSprite(variant);
      const midY = Math.floor(png.height / 2);
      const maxRun = getMaxHorizontalRun(png, midY);
      expect(maxRun).toBeGreaterThanOrEqual(8);
    }
  );
});

// ════════════════════════════════════════════════════════════════
// 13. VERTICAL CONTENT BOUNDS (HP bar overlap prevention)
// ════════════════════════════════════════════════════════════════

describe("Sprite vertical content does not exceed 90% of canvas", () => {
  test.each(ALL_VARIANTS)("enemy_%s vertical span <= 90%% of canvas height", (variant) => {
    const png = getSprite(variant);
    const bb = getBoundingBox(png);
    const verticalSpan = bb.maxY - bb.minY + 1;
    const maxAllowed = Math.floor(png.height * 0.9);
    expect(verticalSpan).toBeLessThanOrEqual(maxAllowed);
  });
});

// ════════════════════════════════════════════════════════════════
// 14. PERFORMANCE — total sprite file size
// ════════════════════════════════════════════════════════════════

describe("Performance", () => {
  test("total enemy sprite file size is under 2 MB", () => {
    let totalSize = 0;
    for (const variant of ALL_VARIANTS) {
      const stats = fs.statSync(spritePath(variant));
      totalSize += stats.size;
    }
    expect(totalSize).toBeLessThan(2 * 1024 * 1024);
  });
});

// ════════════════════════════════════════════════════════════════
// 15. NO PRODUCTION CODE MODIFIED
// ════════════════════════════════════════════════════════════════

describe("No production code modified", () => {
  const filesToCheck = [
    "src/games/raptor/entities/Enemy.ts",
    "src/games/raptor/RaptorGame.ts",
    "src/games/raptor/rendering/assets.ts",
    "src/games/raptor/types.ts",
  ];

  test.each(filesToCheck)("%s has no diff vs main", (file) => {
    const { execSync } = require("child_process");
    const diff = execSync(`git diff main..HEAD -- ${file}`, {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });
});

// ════════════════════════════════════════════════════════════════
// 16. FALLBACK RENDERING NOT TRIGGERED
// ════════════════════════════════════════════════════════════════

describe("No enemy type falls back to procedural rendering", () => {
  test("asset manifest maps all 14 variants to existing files on disk", () => {
    for (const variant of ALL_VARIANTS) {
      const key = `enemy_${variant}`;
      const assetPath = ASSET_MANIFEST[key];
      expect(assetPath).toBeDefined();
      const filePath = path.resolve(__dirname, "../public", assetPath);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test("Enemy.render uses renderSpriteVariant when sprite is set", () => {
    const enemySrc = readSourceFile("entities/Enemy.ts");
    expect(enemySrc).toMatch(/if\s*\(this\.sprite\)\s*\{[\s\S]*?renderSpriteVariant/);
  });
});
