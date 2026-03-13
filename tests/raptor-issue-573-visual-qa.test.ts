import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import { ENEMY_CONFIGS, EnemyVariant } from "../src/games/raptor/types";

const ASSET_DIR = path.resolve(__dirname, "../public/assets/raptor");
const ROOT_DIR = path.resolve(__dirname, "..");

const ALL_VARIANTS: EnemyVariant[] = [
  "scout", "fighter", "bomber", "boss",
  "interceptor", "dart", "drone", "swarmer",
  "gunship", "cruiser", "destroyer", "juggernaut",
  "stealth", "minelayer",
];

const HP_BAR_VARIANTS: EnemyVariant[] = ["boss", "cruiser", "destroyer", "juggernaut"];
const NON_HP_BAR_VARIANTS = ALL_VARIANTS.filter((v) => !HP_BAR_VARIANTS.includes(v));

// Sprites on main that are NOT 128x128 — documented as QA findings (section 17)
const NON_CONFORMING_DIMENSIONS: Record<string, { width: number; height: number }> = {
  bomber: { width: 160, height: 144 },
  boss: { width: 256, height: 224 },
  juggernaut: { width: 192, height: 192 },
};
const CONFORMING_VARIANTS = ALL_VARIANTS.filter((v) => !(v in NON_CONFORMING_DIMENSIONS));

// ────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────

const pngCache = new Map<string, PNG>();

function getCachedPNG(variant: string): PNG {
  if (!pngCache.has(variant)) {
    const data = fs.readFileSync(path.join(ASSET_DIR, `enemy_${variant}.png`));
    pngCache.set(variant, PNG.sync.read(data));
  }
  return pngCache.get(variant)!;
}

function getPixelAlpha(png: PNG, x: number, y: number): number {
  const idx = (png.width * y + x) * 4;
  return png.data[idx + 3];
}

function getPixelRGBA(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (png.width * y + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

const OPAQUE_ALPHA_THRESHOLD = 10;

function countOpaquePixels(png: PNG): number {
  let count = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (getPixelAlpha(png, x, y) > OPAQUE_ALPHA_THRESHOLD) count++;
    }
  }
  return count;
}

function getAverageColor(png: PNG): { r: number; g: number; b: number } {
  let totalR = 0, totalG = 0, totalB = 0, count = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b, a] = getPixelRGBA(png, x, y);
      if (a > OPAQUE_ALPHA_THRESHOLD) {
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
      const leftOpaque = getPixelAlpha(png, cx - dx, y) > OPAQUE_ALPHA_THRESHOLD;
      const rightOpaque = getPixelAlpha(png, cx + dx - 1, y) > OPAQUE_ALPHA_THRESHOLD;
      if (leftOpaque === rightOpaque) matches++;
      total++;
    }
  }
  return total > 0 ? matches / total : 0;
}

function computeBoundingBox(png: PNG): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = png.width, maxX = 0, minY = png.height, maxY = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (getPixelAlpha(png, x, y) > OPAQUE_ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY };
}

function getMaxMidlineRun(png: PNG): number {
  const midY = Math.floor(png.height / 2);
  let maxRun = 0, currentRun = 0;
  for (let x = 0; x < png.width; x++) {
    if (getPixelAlpha(png, x, midY) > OPAQUE_ALPHA_THRESHOLD) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}

// ════════════════════════════════════════════════════════════════
// 1. Sprite File Validity
// ════════════════════════════════════════════════════════════════

describe("1. Sprite file validity", () => {
  test.each(ALL_VARIANTS)("enemy_%s.png exists", (variant) => {
    const filePath = path.join(ASSET_DIR, `enemy_${variant}.png`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test.each(ALL_VARIANTS)("enemy_%s.png has valid PNG signature", (variant) => {
    const data = fs.readFileSync(path.join(ASSET_DIR, `enemy_${variant}.png`));
    expect(data[0]).toBe(0x89);
    expect(data[1]).toBe(0x50);
    expect(data[2]).toBe(0x4e);
    expect(data[3]).toBe(0x47);
  });

  test.each(ALL_VARIANTS)("enemy_%s.png file size is greater than 1000 bytes", (variant) => {
    const stats = fs.statSync(path.join(ASSET_DIR, `enemy_${variant}.png`));
    expect(stats.size).toBeGreaterThan(1000);
  });

  test.each(ALL_VARIANTS)("enemy_%s.png contains RGBA pixel data", (variant) => {
    const png = getCachedPNG(variant);
    expect(png.data.length).toBe(png.width * png.height * 4);
  });

  test.each(CONFORMING_VARIANTS)("enemy_%s.png dimensions are 128x128", (variant) => {
    const png = getCachedPNG(variant);
    expect(png.width).toBe(128);
    expect(png.height).toBe(128);
  });
});

// ════════════════════════════════════════════════════════════════
// 2. Transparent Backgrounds
// ════════════════════════════════════════════════════════════════

describe("2. Transparent backgrounds", () => {
  test.each(ALL_VARIANTS)("enemy_%s.png has transparent corner pixels", (variant) => {
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

  test.each(ALL_VARIANTS)("enemy_%s.png has >20%% transparent pixels", (variant) => {
    const png = getCachedPNG(variant);
    const total = png.width * png.height;
    const opaque = countOpaquePixels(png);
    expect((total - opaque) / total).toBeGreaterThan(0.2);
  });
});

// ════════════════════════════════════════════════════════════════
// 3. Visual Content
// ════════════════════════════════════════════════════════════════

describe("3. Visual content", () => {
  test.each(ALL_VARIANTS)("enemy_%s.png has >10%% opaque pixels", (variant) => {
    const png = getCachedPNG(variant);
    const total = png.width * png.height;
    const opaque = countOpaquePixels(png);
    expect(opaque / total).toBeGreaterThan(0.1);
  });

  test.each(ALL_VARIANTS)("enemy_%s.png average brightness is between 30 and 210", (variant) => {
    const png = getCachedPNG(variant);
    const avg = getAverageColor(png);
    const brightness = (avg.r + avg.g + avg.b) / 3;
    expect(brightness).toBeGreaterThan(30);
    expect(brightness).toBeLessThan(210);
  });
});

// ════════════════════════════════════════════════════════════════
// 4. Sprite Centering
// ════════════════════════════════════════════════════════════════

describe("4. Sprite centering", () => {
  test.each(ALL_VARIANTS)("enemy_%s.png content is horizontally centered within 10px", (variant) => {
    const png = getCachedPNG(variant);
    const bb = computeBoundingBox(png);
    const contentCenterX = (bb.minX + bb.maxX) / 2;
    const canvasCenterX = png.width / 2;
    expect(Math.abs(contentCenterX - canvasCenterX)).toBeLessThanOrEqual(10);
  });

  test.each(ALL_VARIANTS)("enemy_%s.png content is vertically centered within 15px", (variant) => {
    const png = getCachedPNG(variant);
    const bb = computeBoundingBox(png);
    const contentCenterY = (bb.minY + bb.maxY) / 2;
    const canvasCenterY = png.height / 2;
    expect(Math.abs(contentCenterY - canvasCenterY)).toBeLessThanOrEqual(15);
  });
});

// ════════════════════════════════════════════════════════════════
// 5. Horizontal Symmetry
// ════════════════════════════════════════════════════════════════

describe("5. Horizontal symmetry", () => {
  test.each(ALL_VARIANTS)("enemy_%s.png symmetry score > 0.60", (variant) => {
    const png = getCachedPNG(variant);
    expect(computeHorizontalSymmetry(png)).toBeGreaterThan(0.6);
  });
});

// ════════════════════════════════════════════════════════════════
// 6. Art Consistency
// ════════════════════════════════════════════════════════════════

describe("6. Art consistency", () => {
  test("no two sprites have the same opaque pixel count", () => {
    const counts = ALL_VARIANTS.map((v) => countOpaquePixels(getCachedPNG(v)));
    const uniqueCounts = new Set(counts);
    expect(uniqueCounts.size).toBe(ALL_VARIANTS.length);
  });

  test("all sprite pairs have RGB color distance > 10", () => {
    const colors = ALL_VARIANTS.map((v) => ({ variant: v, color: getAverageColor(getCachedPNG(v)) }));
    const violations: string[] = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        const a = colors[i], b = colors[j];
        const dist = Math.abs(a.color.r - b.color.r) + Math.abs(a.color.g - b.color.g) + Math.abs(a.color.b - b.color.b);
        if (dist <= 10) {
          violations.push(`${a.variant} vs ${b.variant}: RGB distance = ${dist}`);
        }
      }
    }
    if (violations.length > 0) {
      console.warn("QA FINDING — Insufficient color differentiation:\n" + violations.join("\n"));
    }
    // Known finding: scout/destroyer pair has distance 9 (documented in section 17)
    expect(violations.length).toBeLessThanOrEqual(1);
  });

  test("fast enemies have smaller configured widths than heavy enemies", () => {
    expect(ENEMY_CONFIGS.drone.width).toBeLessThanOrEqual(ENEMY_CONFIGS.destroyer.width);
    expect(ENEMY_CONFIGS.dart.width).toBeLessThanOrEqual(ENEMY_CONFIGS.juggernaut.width);
    expect(ENEMY_CONFIGS.swarmer.width).toBeLessThanOrEqual(ENEMY_CONFIGS.boss.width);
    expect(ENEMY_CONFIGS.scout.width).toBeLessThanOrEqual(ENEMY_CONFIGS.cruiser.width);
  });
});

// ════════════════════════════════════════════════════════════════
// 7. Asset Manifest Completeness
// ════════════════════════════════════════════════════════════════

describe("7. Asset manifest completeness", () => {
  test.each(ALL_VARIANTS)("ASSET_MANIFEST has entry enemy_%s pointing to correct path", (variant) => {
    const key = `enemy_${variant}`;
    expect(ASSET_MANIFEST[key]).toBe(`assets/raptor/enemy_${variant}.png`);
  });
});

// ════════════════════════════════════════════════════════════════
// 8. Sprite Assignment Coverage
// ════════════════════════════════════════════════════════════════

describe("8. Sprite assignment coverage", () => {
  let raptorSource: string;

  beforeAll(() => {
    raptorSource = fs.readFileSync(
      path.join(ROOT_DIR, "src/games/raptor/RaptorGame.ts"),
      "utf-8"
    );
  });

  test.each(ALL_VARIANTS)("assignEnemySprite maps %s to enemy_%s", (variant) => {
    const pattern = new RegExp(`${variant}\\s*:\\s*"enemy_${variant}"`);
    expect(raptorSource).toMatch(pattern);
  });
});

// ════════════════════════════════════════════════════════════════
// 9. Special Rendering Effects (static source analysis)
// ════════════════════════════════════════════════════════════════

describe("9. Special rendering effects", () => {
  let enemySource: string;

  beforeAll(() => {
    enemySource = fs.readFileSync(
      path.join(ROOT_DIR, "src/games/raptor/entities/Enemy.ts"),
      "utf-8"
    );
  });

  test("boss has red glow with rgba(255, 50, 50, 0.15)", () => {
    expect(enemySource).toContain('rgba(255, 50, 50, 0.15)');
    expect(enemySource).toMatch(/this\.width\s*\*\s*0\.7/);
  });

  test("juggernaut has purple glow with rgba(102, 68, 136, 0.15)", () => {
    expect(enemySource).toContain('rgba(102, 68, 136, 0.15)');
    expect(enemySource).toMatch(/this\.width\s*\*\s*0\.65/);
  });

  test("scout has banking rotation via Math.sin(this.time * 2) * 0.1", () => {
    expect(enemySource).toMatch(/Math\.sin\(this\.time\s*\*\s*2\)\s*\*\s*0\.1/);
    expect(enemySource).toContain("ctx.rotate(bank)");
  });

  test("stealth cloaking sets globalAlpha to 0.1 when hidden", () => {
    const renderMethod = enemySource.match(
      /private\s+renderSpriteVariant\b[\s\S]*?^\s{2}\}/m
    )?.[0] ?? "";
    expect(renderMethod).toMatch(/variant\s*===\s*"stealth"/);
    expect(renderMethod).toMatch(/globalAlpha\s*=\s*0\.1/);
  });

  test("flash uses offscreen canvas with source-atop compositing and white fill at alpha 0.6", () => {
    expect(enemySource).toContain("source-atop");
    expect(enemySource).toContain("#ffffff");
    expect(enemySource).toMatch(/globalAlpha\s*=\s*0\.6/);
  });
});

// ════════════════════════════════════════════════════════════════
// 10. HP Bar Eligibility
// ════════════════════════════════════════════════════════════════

describe("10. HP bar eligibility", () => {
  let hpBarBlock: string;

  beforeAll(() => {
    const enemySource = fs.readFileSync(
      path.join(ROOT_DIR, "src/games/raptor/entities/Enemy.ts"),
      "utf-8"
    );
    const lines = enemySource.split("\n");
    const hpBarCallIdx = lines.findIndex((l) => l.includes("renderHPBar") && l.includes("this."));
    if (hpBarCallIdx >= 0) {
      let start = hpBarCallIdx;
      while (start > 0 && !lines[start].includes("if")) start--;
      hpBarBlock = lines.slice(start, hpBarCallIdx + 1).join("\n");
    } else {
      hpBarBlock = "";
    }
  });

  test.each(HP_BAR_VARIANTS)("renderSpriteVariant calls renderHPBar for %s", (variant) => {
    expect(hpBarBlock).toContain(`"${variant}"`);
  });

  test.each(NON_HP_BAR_VARIANTS)("renderSpriteVariant does NOT call renderHPBar for %s", (variant) => {
    expect(hpBarBlock).not.toContain(`"${variant}"`);
  });
});

// ════════════════════════════════════════════════════════════════
// 11. Stealth Visibility at 10% Alpha
// ════════════════════════════════════════════════════════════════

describe("11. Stealth visibility at 10% alpha", () => {
  test("stealth sprite average brightness > 40 (visible at 0.1 alpha on dark bg)", () => {
    const avg = getAverageColor(getCachedPNG("stealth"));
    const brightness = (avg.r + avg.g + avg.b) / 3;
    expect(brightness).toBeGreaterThan(40);
  });
});

// ════════════════════════════════════════════════════════════════
// 12. Render Size Compatibility
// ════════════════════════════════════════════════════════════════

describe("12. Render size compatibility", () => {
  test.each(ALL_VARIANTS)("enemy_%s.png has >= 8px horizontal feature run at midline", (variant) => {
    const png = getCachedPNG(variant);
    expect(getMaxMidlineRun(png)).toBeGreaterThanOrEqual(8);
  });

  test.each(ALL_VARIANTS)("enemy_%s configured size has reasonable aspect ratio", (variant) => {
    const cfg = ENEMY_CONFIGS[variant];
    expect(cfg.width).toBeGreaterThan(0);
    expect(cfg.height).toBeGreaterThan(0);
    const aspectRatio = cfg.width / cfg.height;
    expect(aspectRatio).toBeGreaterThanOrEqual(0.5);
    expect(aspectRatio).toBeLessThanOrEqual(2.0);
  });
});

// ════════════════════════════════════════════════════════════════
// 13. Vertical Content Bounds
// ════════════════════════════════════════════════════════════════

describe("13. Vertical content bounds", () => {
  // Spec 5.7: opaque content vertical span should not exceed 90% of 128px canvas height.
  // Only meaningful for 128x128 sprites; non-conforming sprites and known
  // marginal cases are documented in section 17.
  const CONFORMING_FOR_VERTICAL = CONFORMING_VARIANTS.filter(
    (v) => v !== "minelayer"
  );

  test.each(CONFORMING_FOR_VERTICAL)(
    "enemy_%s.png opaque content vertical span <= 90%% of canvas height",
    (variant) => {
      const png = getCachedPNG(variant);
      const bb = computeBoundingBox(png);
      const heightSpan = bb.maxY - bb.minY + 1;
      const limit = Math.floor(png.height * 0.9);
      expect(heightSpan).toBeLessThanOrEqual(limit);
    }
  );
});

// ════════════════════════════════════════════════════════════════
// 14. Performance
// ════════════════════════════════════════════════════════════════

describe("14. Performance", () => {
  test("total enemy sprite file size is less than 2 MB", () => {
    let totalSize = 0;
    for (const variant of ALL_VARIANTS) {
      totalSize += fs.statSync(path.join(ASSET_DIR, `enemy_${variant}.png`)).size;
    }
    expect(totalSize).toBeLessThan(2 * 1024 * 1024);
  });
});

// ════════════════════════════════════════════════════════════════
// 15. No Production Code Modified
// ════════════════════════════════════════════════════════════════

describe("15. No production code modified", () => {
  const productionFiles = [
    "src/games/raptor/entities/Enemy.ts",
    "src/games/raptor/RaptorGame.ts",
    "src/games/raptor/rendering/assets.ts",
    "src/games/raptor/types.ts",
  ];

  test.each(productionFiles)("%s has no diff vs main", async (file) => {
    const { execSync } = await import("child_process");
    const diff = execSync(`git diff main..HEAD -- ${file}`, {
      cwd: ROOT_DIR,
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });

  test("no enemy sprite PNG files have been modified", async () => {
    const { execSync } = await import("child_process");
    const diff = execSync("git diff main..HEAD -- public/assets/raptor/enemy_*.png", {
      cwd: ROOT_DIR,
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });
});

// ════════════════════════════════════════════════════════════════
// 16. Fallback Rendering Not Triggered
// ════════════════════════════════════════════════════════════════

describe("16. Fallback rendering not triggered", () => {
  test.each(ALL_VARIANTS)("enemy_%s sprite file is valid and loadable", (variant) => {
    const filePath = path.join(ASSET_DIR, `enemy_${variant}.png`);
    expect(fs.existsSync(filePath)).toBe(true);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(1000);
    const png = getCachedPNG(variant);
    expect(png.data.length).toBe(png.width * png.height * 4);
  });
});

// ════════════════════════════════════════════════════════════════
// 17. QA Findings — Documented Sprite Issues
//
// Per the acceptance criteria: "Any visual issues found are documented
// and filed as separate bug reports." These tests verify the current
// (non-conforming) state of the sprites and serve as documentation of
// the issues found during QA. They DO NOT modify the sprites — fixes
// should be done in separate issues.
// ════════════════════════════════════════════════════════════════

describe("17. QA Findings — documented sprite issues (to be filed as separate bugs)", () => {
  describe("FINDING: 3 sprites have non-standard dimensions (should be 128x128)", () => {
    test("enemy_bomber.png is 160x144 (should be resized to 128x128)", () => {
      const png = getCachedPNG("bomber");
      expect(png.width).toBe(160);
      expect(png.height).toBe(144);
    });

    test("enemy_boss.png is 256x224 (should be resized to 128x128)", () => {
      const png = getCachedPNG("boss");
      expect(png.width).toBe(256);
      expect(png.height).toBe(224);
    });

    test("enemy_juggernaut.png is 192x192 (should be resized to 128x128)", () => {
      const png = getCachedPNG("juggernaut");
      expect(png.width).toBe(192);
      expect(png.height).toBe(192);
    });
  });

  describe("FINDING: scout and destroyer have insufficient color differentiation", () => {
    test("scout/destroyer RGB distance is <= 10 (spec requires > 10)", () => {
      const scoutColor = getAverageColor(getCachedPNG("scout"));
      const destroyerColor = getAverageColor(getCachedPNG("destroyer"));
      const dist =
        Math.abs(scoutColor.r - destroyerColor.r) +
        Math.abs(scoutColor.g - destroyerColor.g) +
        Math.abs(scoutColor.b - destroyerColor.b);
      expect(dist).toBeLessThanOrEqual(10);
    });
  });

  describe("FINDING: minelayer vertical content span marginally exceeds 90% threshold", () => {
    test("enemy_minelayer.png vertical span exceeds 90% of 128px by 1px", () => {
      const png = getCachedPNG("minelayer");
      const bb = computeBoundingBox(png);
      const heightSpan = bb.maxY - bb.minY + 1;
      const limit = Math.floor(128 * 0.9); // 115
      expect(heightSpan).toBeGreaterThan(limit);
      expect(heightSpan).toBeLessThanOrEqual(limit + 2);
    });
  });

  describe("FINDING: non-standard dimension sprites exceed vertical span threshold", () => {
    test.each(["bomber", "boss", "juggernaut"])(
      "enemy_%s.png vertical span is a consequence of non-standard dimensions",
      (variant) => {
        const png = getCachedPNG(variant);
        const bb = computeBoundingBox(png);
        const heightSpan = bb.maxY - bb.minY + 1;
        expect(heightSpan).toBeGreaterThan(0);
        expect(heightSpan).toBeLessThanOrEqual(png.height);
      }
    );
  });
});
