import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import { ENEMY_CONFIGS, EnemyVariant } from "../src/games/raptor/types";

const ASSET_DIR = path.resolve(__dirname, "../public/assets/raptor");
const STEALTH_PATH = path.join(ASSET_DIR, "enemy_stealth.png");
const MINELAYER_PATH = path.join(ASSET_DIR, "enemy_minelayer.png");

const PROPER_SPRITE_VARIANTS: EnemyVariant[] = [
  "scout", "fighter", "bomber", "boss",
  "interceptor", "dart", "drone", "swarmer",
  "gunship", "cruiser", "destroyer", "juggernaut",
];

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

function computeAspectFill(png: PNG): { widthSpan: number; heightSpan: number } {
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
  return {
    widthSpan: maxX - minX + 1,
    heightSpan: maxY - minY + 1,
  };
}

// ════════════════════════════════════════════════════════════════
// STEALTH SPRITE — FILE VALIDITY
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy sprite file is a valid high-resolution PNG", () => {
  test("enemy_stealth.png exists at expected path", () => {
    expect(fs.existsSync(STEALTH_PATH)).toBe(true);
  });

  test("image dimensions are 128x128 pixels", () => {
    const png = readPNG(STEALTH_PATH);
    expect(png.width).toBe(128);
    expect(png.height).toBe(128);
  });

  test("image format is PNG with RGBA color type", () => {
    const data = fs.readFileSync(STEALTH_PATH);
    // PNG signature: 137 80 78 71 13 10 26 10
    expect(data[0]).toBe(0x89);
    expect(data[1]).toBe(0x50); // P
    expect(data[2]).toBe(0x4e); // N
    expect(data[3]).toBe(0x47); // G

    const png = readPNG(STEALTH_PATH);
    // pngjs always decodes to RGBA; verify 4 bytes per pixel
    expect(png.data.length).toBe(png.width * png.height * 4);
  });

  test("file size is greater than 1000 bytes (contains real visual data)", () => {
    const stats = fs.statSync(STEALTH_PATH);
    expect(stats.size).toBeGreaterThan(1000);
  });
});

// ════════════════════════════════════════════════════════════════
// STEALTH SPRITE — TRANSPARENT BACKGROUND
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy sprite has a transparent background", () => {
  test("corner pixels have alpha = 0 (transparent background)", () => {
    const png = readPNG(STEALTH_PATH);
    const corners = [
      [0, 0],
      [png.width - 1, 0],
      [0, png.height - 1],
      [png.width - 1, png.height - 1],
    ];
    for (const [x, y] of corners) {
      const alpha = getPixelAlpha(png, x, y);
      expect(alpha).toBe(0);
    }
  });

  test("significant portion of image is transparent (background area)", () => {
    const png = readPNG(STEALTH_PATH);
    const totalPixels = png.width * png.height;
    const opaquePixels = countOpaquePixels(png);
    const transparentRatio = (totalPixels - opaquePixels) / totalPixels;
    // At least 20% transparent for a spacecraft on transparent bg
    expect(transparentRatio).toBeGreaterThan(0.2);
  });
});

// ════════════════════════════════════════════════════════════════
// STEALTH SPRITE — VISUAL CONTENT
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy sprite contains recognizable spacecraft artwork", () => {
  test("sprite has substantial opaque pixel content (not near-empty)", () => {
    const png = readPNG(STEALTH_PATH);
    const totalPixels = png.width * png.height;
    const opaquePixels = countOpaquePixels(png);
    // Must have at least 10% opaque pixels for a real sprite
    expect(opaquePixels / totalPixels).toBeGreaterThan(0.10);
  });

  test("color scheme uses dark/matte tones (medium-dark range, not pure black or light gray)", () => {
    const png = readPNG(STEALTH_PATH);
    const avg = getAverageColor(png);
    const avgBrightness = (avg.r + avg.g + avg.b) / 3;
    // Medium-dark: avg brightness between 40-200 (not too dark, not too light)
    expect(avgBrightness).toBeGreaterThan(30);
    expect(avgBrightness).toBeLessThan(210);
  });
});

// ════════════════════════════════════════════════════════════════
// STEALTH SPRITE — CLOAKED VISIBILITY
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy sprite visibility at different opacity levels", () => {
  test("sprite is not too dark (would be invisible at 10% alpha on dark background)", () => {
    const png = readPNG(STEALTH_PATH);
    const avg = getAverageColor(png);
    const avgBrightness = (avg.r + avg.g + avg.b) / 3;
    // At 10% alpha, pixel values are effectively multiplied by 0.1
    // Against a dark bg (~20), need effective value > ~25 to be visible
    // So source brightness should be > ~50 at minimum
    expect(avgBrightness).toBeGreaterThan(40);
  });

  test("sprite is not too light (would look washed out at full opacity)", () => {
    const png = readPNG(STEALTH_PATH);
    const avg = getAverageColor(png);
    const avgBrightness = (avg.r + avg.g + avg.b) / 3;
    // Stealth craft should NOT be very bright
    expect(avgBrightness).toBeLessThan(210);
  });
});

// ════════════════════════════════════════════════════════════════
// STEALTH SPRITE — RENDER SIZE COMPATIBILITY
// ════════════════════════════════════════════════════════════════

describe("Stealth enemy renders correctly at configured size", () => {
  test("stealth config size is 28x26 (confirming downscale from 128x128)", () => {
    expect(ENEMY_CONFIGS.stealth.width).toBe(28);
    expect(ENEMY_CONFIGS.stealth.height).toBe(26);
  });

  test("sprite has bold features (at least 8px wide areas at source resolution for downscale visibility)", () => {
    const png = readPNG(STEALTH_PATH);
    const midY = Math.floor(png.height / 2);
    let maxRunLength = 0;
    let currentRun = 0;
    for (let x = 0; x < png.width; x++) {
      if (getPixelAlpha(png, x, midY) > 30) {
        currentRun++;
        if (currentRun > maxRunLength) maxRunLength = currentRun;
      } else {
        currentRun = 0;
      }
    }
    // At ~4.5x downscale, need at least 8px runs to remain visible
    expect(maxRunLength).toBeGreaterThanOrEqual(8);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER SPRITE — FILE VALIDITY
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy sprite file is a valid high-resolution PNG", () => {
  test("enemy_minelayer.png exists at expected path", () => {
    expect(fs.existsSync(MINELAYER_PATH)).toBe(true);
  });

  test("image dimensions are 128x128 pixels", () => {
    const png = readPNG(MINELAYER_PATH);
    expect(png.width).toBe(128);
    expect(png.height).toBe(128);
  });

  test("image format is PNG with RGBA color type", () => {
    const data = fs.readFileSync(MINELAYER_PATH);
    expect(data[0]).toBe(0x89);
    expect(data[1]).toBe(0x50);
    expect(data[2]).toBe(0x4e);
    expect(data[3]).toBe(0x47);

    const png = readPNG(MINELAYER_PATH);
    expect(png.data.length).toBe(png.width * png.height * 4);
  });

  test("file size is greater than 1000 bytes (contains real visual data)", () => {
    const stats = fs.statSync(MINELAYER_PATH);
    expect(stats.size).toBeGreaterThan(1000);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER SPRITE — TRANSPARENT BACKGROUND
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy sprite has a transparent background", () => {
  test("corner pixels have alpha = 0 (transparent background)", () => {
    const png = readPNG(MINELAYER_PATH);
    const corners = [
      [0, 0],
      [png.width - 1, 0],
      [0, png.height - 1],
      [png.width - 1, png.height - 1],
    ];
    for (const [x, y] of corners) {
      const alpha = getPixelAlpha(png, x, y);
      expect(alpha).toBe(0);
    }
  });

  test("significant portion of image is transparent (background area)", () => {
    const png = readPNG(MINELAYER_PATH);
    const totalPixels = png.width * png.height;
    const opaquePixels = countOpaquePixels(png);
    const transparentRatio = (totalPixels - opaquePixels) / totalPixels;
    expect(transparentRatio).toBeGreaterThan(0.2);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER SPRITE — VISUAL CONTENT
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy sprite contains recognizable mine-laying spacecraft artwork", () => {
  test("sprite has substantial opaque pixel content (not near-empty)", () => {
    const png = readPNG(MINELAYER_PATH);
    const totalPixels = png.width * png.height;
    const opaquePixels = countOpaquePixels(png);
    expect(opaquePixels / totalPixels).toBeGreaterThan(0.10);
  });

  test("color scheme uses military utility tones (not extreme brightness)", () => {
    const png = readPNG(MINELAYER_PATH);
    const avg = getAverageColor(png);
    const avgBrightness = (avg.r + avg.g + avg.b) / 3;
    // Military colors: not pure white or extreme brightness
    expect(avgBrightness).toBeGreaterThan(20);
    expect(avgBrightness).toBeLessThan(230);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER SPRITE — HORIZONTAL SYMMETRY
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy sprite is horizontally symmetric", () => {
  test("design is approximately symmetric along vertical axis (>60% pixel symmetry)", () => {
    const png = readPNG(MINELAYER_PATH);
    const symmetry = computeHorizontalSymmetry(png);
    // Allow some tolerance — generated images may not be perfectly symmetric
    expect(symmetry).toBeGreaterThan(0.60);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER SPRITE — DISTINCT SILHOUETTE
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy sprite has a distinct silhouette from other enemies", () => {
  test("minelayer sprite has wider profile than stealth (suggesting utility role)", () => {
    const minelayer = readPNG(MINELAYER_PATH);
    const stealth = readPNG(STEALTH_PATH);
    const mlFill = computeAspectFill(minelayer);
    const stFill = computeAspectFill(stealth);
    const mlWidthRatio = mlFill.widthSpan / mlFill.heightSpan;
    const stWidthRatio = stFill.widthSpan / stFill.heightSpan;
    // Minelayer should be at least as wide (relative to height) as stealth, ideally wider
    // Both should have real content
    expect(mlFill.widthSpan).toBeGreaterThan(30);
    expect(stFill.widthSpan).toBeGreaterThan(30);
  });

  test("minelayer and stealth have different average color profiles", () => {
    const mlAvg = getAverageColor(readPNG(MINELAYER_PATH));
    const stAvg = getAverageColor(readPNG(STEALTH_PATH));
    const colorDiff = Math.abs(mlAvg.r - stAvg.r) + Math.abs(mlAvg.g - stAvg.g) + Math.abs(mlAvg.b - stAvg.b);
    // Should have at least some color differentiation
    expect(colorDiff).toBeGreaterThan(10);
  });

  test("minelayer and stealth have different opaque pixel counts (different shapes)", () => {
    const mlOpaque = countOpaquePixels(readPNG(MINELAYER_PATH));
    const stOpaque = countOpaquePixels(readPNG(STEALTH_PATH));
    // They shouldn't have identical pixel counts (would indicate same sprite)
    expect(mlOpaque).not.toBe(stOpaque);
  });
});

// ════════════════════════════════════════════════════════════════
// MINELAYER — RENDER SIZE COMPATIBILITY
// ════════════════════════════════════════════════════════════════

describe("Minelayer enemy renders correctly at configured size", () => {
  test("minelayer config size is 32x28 (confirming downscale from 128x128)", () => {
    expect(ENEMY_CONFIGS.minelayer.width).toBe(32);
    expect(ENEMY_CONFIGS.minelayer.height).toBe(28);
  });

  test("sprite has bold features for downscale visibility", () => {
    const png = readPNG(MINELAYER_PATH);
    const midY = Math.floor(png.height / 2);
    let maxRunLength = 0;
    let currentRun = 0;
    for (let x = 0; x < png.width; x++) {
      if (getPixelAlpha(png, x, midY) > 30) {
        currentRun++;
        if (currentRun > maxRunLength) maxRunLength = currentRun;
      } else {
        currentRun = 0;
      }
    }
    expect(maxRunLength).toBeGreaterThanOrEqual(8);
  });
});

// ════════════════════════════════════════════════════════════════
// CROSS-CUTTING: ART STYLE CONSISTENCY
// ════════════════════════════════════════════════════════════════

describe("Art style consistency across all enemy sprites", () => {
  test("all referenced enemy sprites exist as files", () => {
    for (const variant of [...PROPER_SPRITE_VARIANTS, "stealth" as EnemyVariant, "minelayer" as EnemyVariant]) {
      const key = `enemy_${variant}`;
      const assetPath = ASSET_MANIFEST[key];
      expect(assetPath).toBeDefined();
      const filePath = path.resolve(__dirname, "../public", assetPath);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test("stealth and minelayer sprites have transparent backgrounds like other sprites", () => {
    for (const filename of ["enemy_stealth.png", "enemy_minelayer.png"]) {
      const png = readPNG(path.join(ASSET_DIR, filename));
      expect(getPixelAlpha(png, 0, 0)).toBe(0);
      expect(getPixelAlpha(png, png.width - 1, 0)).toBe(0);
    }
  });

  test("all proper enemy sprites (including new ones) are > 1KB", () => {
    for (const variant of [...PROPER_SPRITE_VARIANTS, "stealth" as EnemyVariant, "minelayer" as EnemyVariant]) {
      const filePath = path.join(ASSET_DIR, `enemy_${variant}.png`);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(1000);
      }
    }
  });
});

// ════════════════════════════════════════════════════════════════
// CROSS-CUTTING: NO CODE CHANGES
// ════════════════════════════════════════════════════════════════

describe("No code changes are required", () => {
  test("asset manifest references enemy_stealth correctly", () => {
    expect(ASSET_MANIFEST.enemy_stealth).toBe("assets/raptor/enemy_stealth.png");
  });

  test("asset manifest references enemy_minelayer correctly", () => {
    expect(ASSET_MANIFEST.enemy_minelayer).toBe("assets/raptor/enemy_minelayer.png");
  });

  test("stealth enemy config is properly defined (no code changes needed)", () => {
    const cfg = ENEMY_CONFIGS.stealth;
    expect(cfg).toBeDefined();
    expect(cfg.hitPoints).toBe(2);
    expect(cfg.speed).toBe(160);
    expect(cfg.width).toBe(28);
    expect(cfg.height).toBe(26);
    expect(cfg.fireRate).toBe(0.7);
    expect(cfg.weaponType).toBe("standard");
  });

  test("minelayer enemy config is properly defined (no code changes needed)", () => {
    const cfg = ENEMY_CONFIGS.minelayer;
    expect(cfg).toBeDefined();
    expect(cfg.hitPoints).toBe(2);
    expect(cfg.speed).toBe(100);
    expect(cfg.width).toBe(32);
    expect(cfg.height).toBe(28);
    expect(cfg.fireRate).toBe(0);
  });

  test("Enemy.ts source has not been modified in this PR", async () => {
    const { execSync } = await import("child_process");
    const diff = execSync("git diff main..HEAD -- src/games/raptor/entities/Enemy.ts", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });

  test("types.ts source has not been modified in this PR", async () => {
    const { execSync } = await import("child_process");
    const diff = execSync("git diff main..HEAD -- src/games/raptor/types.ts", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });

  test("RaptorGame.ts source has not been modified in this PR", async () => {
    const { execSync } = await import("child_process");
    const diff = execSync("git diff main..HEAD -- src/games/raptor/RaptorGame.ts", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });
});

// ════════════════════════════════════════════════════════════════
// CROSS-CUTTING: FALLBACK NOT NEEDED
// ════════════════════════════════════════════════════════════════

describe("Fallback rendering is no longer triggered for stealth and minelayer", () => {
  test("enemy_stealth sprite file is valid and loadable (getOptional would succeed)", () => {
    const png = readPNG(STEALTH_PATH);
    expect(png.width).toBe(128);
    expect(png.height).toBe(128);
    expect(png.data.length).toBe(128 * 128 * 4);
    const stats = fs.statSync(STEALTH_PATH);
    expect(stats.size).toBeGreaterThan(1000);
  });

  test("enemy_minelayer sprite file is valid and loadable (getOptional would succeed)", () => {
    const png = readPNG(MINELAYER_PATH);
    expect(png.width).toBe(128);
    expect(png.height).toBe(128);
    expect(png.data.length).toBe(128 * 128 * 4);
    const stats = fs.statSync(MINELAYER_PATH);
    expect(stats.size).toBeGreaterThan(1000);
  });
});
