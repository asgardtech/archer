import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import { LEVELS } from "../src/games/raptor/levels";

const TERRAIN_DIR = path.resolve(__dirname, "../public/assets/raptor/terrain");

const GROUND_TEXTURE_NAMES = [
  "ground_grass",
  "ground_sand",
  "ground_snow",
  "ground_concrete",
  "ground_rust",
  "ground_ash",
  "ground_metal",
  "ground_hull_plate",
  "ground_dark_metal",
];

const LEVEL_GROUND_MAP: Record<number, string> = {
  1: "ground_grass",
  2: "ground_sand",
  3: "ground_grass",
  4: "ground_snow",
  5: "ground_concrete",
  6: "ground_rust",
  7: "ground_ash",
  8: "ground_metal",
  9: "ground_hull_plate",
  10: "ground_dark_metal",
};

function readPNG(filePath: string): PNG {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function getPixelRGBA(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (png.width * y + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

// ════════════════════════════════════════════════════════════════
// SCENARIO: All 9 PNG ground textures exist
// ════════════════════════════════════════════════════════════════

describe("All 9 PNG ground textures exist in the terrain asset directory", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s.png exists", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Old SVG ground textures are removed
// ════════════════════════════════════════════════════════════════

describe("Old SVG ground textures are removed", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s.svg should not exist", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.svg`);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Asset manifest references PNG extensions
// ════════════════════════════════════════════════════════════════

describe("Asset manifest references PNG extensions for all ground textures", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s manifest path ends with .png", (name) => {
    const assetPath = ASSET_MANIFEST[name];
    expect(assetPath).toBeDefined();
    expect(assetPath).toMatch(/\.png$/);
  });

  test("no ground texture paths end with .svg", () => {
    for (const name of GROUND_TEXTURE_NAMES) {
      const assetPath = ASSET_MANIFEST[name];
      expect(assetPath).not.toMatch(/\.svg$/);
    }
  });

  test.each(GROUND_TEXTURE_NAMES)("%s manifest path resolves to correct location", (name) => {
    const assetPath = ASSET_MANIFEST[name];
    expect(assetPath).toBe(`assets/raptor/terrain/${name}.png`);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Generated PNGs are valid PNG files
// ════════════════════════════════════════════════════════════════

describe("Generated PNGs are valid PNG image files", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s.png has valid PNG signature", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const data = fs.readFileSync(filePath);
    expect(data[0]).toBe(0x89);
    expect(data[1]).toBe(0x50); // P
    expect(data[2]).toBe(0x4e); // N
    expect(data[3]).toBe(0x47); // G
  });

  test.each(GROUND_TEXTURE_NAMES)("%s.png is decodable as PNG", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    expect(png.data.length).toBe(png.width * png.height * 4);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: PNGs are square and appropriately sized
// ════════════════════════════════════════════════════════════════

describe("Generated PNGs are square and appropriately sized", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s.png has equal width and height", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    expect(png.width).toBe(png.height);
  });

  test.each(GROUND_TEXTURE_NAMES)("%s.png is 128 or 256 pixels", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    expect([128, 256]).toContain(png.width);
  });

  test.each(GROUND_TEXTURE_NAMES)("%s.png file size is less than 100 KB", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeLessThan(100 * 1024);
  });

  test.each(GROUND_TEXTURE_NAMES)("%s.png file size is greater than 1 KB (real content)", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(1024);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: PNGs are fully opaque (no alpha transparency)
// ════════════════════════════════════════════════════════════════

describe("Generated PNGs are fully opaque (no alpha channel transparency)", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s.png has no transparent pixels", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    let transparentCount = 0;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const [, , , a] = getPixelRGBA(png, x, y);
        if (a < 255) transparentCount++;
      }
    }
    expect(transparentCount).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: PNGs contain real texture data (not solid color)
// ════════════════════════════════════════════════════════════════

describe("PNGs contain real texture data, not flat solid colors", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s.png has color variance (not a single flat color)", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    const uniqueColors = new Set<string>();
    const sampleStep = Math.max(1, Math.floor(png.width / 32));
    for (let y = 0; y < png.height; y += sampleStep) {
      for (let x = 0; x < png.width; x += sampleStep) {
        const [r, g, b] = getPixelRGBA(png, x, y);
        uniqueColors.add(`${r},${g},${b}`);
      }
    }
    expect(uniqueColors.size).toBeGreaterThan(10);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Ground texture level mapping is correct
// ════════════════════════════════════════════════════════════════

describe("Ground texture renders correctly in each level", () => {
  test.each(Object.entries(LEVEL_GROUND_MAP))(
    "level %s uses ground texture %s",
    (levelStr, expectedTexture) => {
      const levelNum = parseInt(levelStr, 10);
      const levelConfig = LEVELS[levelNum - 1];
      expect(levelConfig).toBeDefined();
      expect(levelConfig.level).toBe(levelNum);
      expect(levelConfig.terrain).toBeDefined();
      expect(levelConfig.terrain!.groundTexture).toBe(expectedTexture);
    }
  );

  test("all 10 levels have ground textures that exist in the asset manifest", () => {
    for (const levelConfig of LEVELS) {
      expect(levelConfig.terrain).toBeDefined();
      const texture = levelConfig.terrain!.groundTexture;
      expect(texture).toBeDefined();
      expect(ASSET_MANIFEST[texture!]).toBeDefined();
      expect(ASSET_MANIFEST[texture!]).toMatch(/\.png$/);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Asset files referenced in manifest exist on disk
// ════════════════════════════════════════════════════════════════

describe("All ground texture asset files referenced in manifest exist on disk", () => {
  test.each(GROUND_TEXTURE_NAMES)("%s asset file exists at manifest path", (name) => {
    const assetPath = ASSET_MANIFEST[name];
    const fullPath = path.resolve(__dirname, "../public", assetPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: No rendering code changes were made
// ════════════════════════════════════════════════════════════════

describe("No rendering or logic code was modified", () => {
  test("TerrainRenderer.ts was not modified", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD -- src/games/raptor/rendering/TerrainRenderer.ts", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });

  test("AssetLoader.ts was not modified", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD -- src/shared/AssetLoader.ts", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });

  test("levels.ts was not modified", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD -- src/games/raptor/levels.ts", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });

  test("types.ts was not modified", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD -- src/games/raptor/types.ts", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    expect(diff.trim()).toBe("");
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Only expected files were modified in the PR
// ════════════════════════════════════════════════════════════════

describe("Only expected files were changed in the PR", () => {
  test("assets.ts is the only source code file modified", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD --name-only -- '*.ts' '*.tsx' '*.js' '*.jsx'", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    const changedSourceFiles = diff.trim().split("\n").filter(Boolean);
    expect(changedSourceFiles).toEqual(["src/games/raptor/rendering/assets.ts"]);
  });

  test("exactly 9 SVG files were deleted", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD --diff-filter=D --name-only", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    const deletedFiles = diff.trim().split("\n").filter(Boolean);
    const deletedSvgs = deletedFiles.filter((f: string) => f.match(/ground_.*\.svg$/));
    expect(deletedSvgs.length).toBe(9);
  });

  test("exactly 9 PNG files were added", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD --diff-filter=A --name-only", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    const addedFiles = diff.trim().split("\n").filter(Boolean);
    const addedPngs = addedFiles.filter((f: string) => f.match(/ground_.*\.png$/));
    expect(addedPngs.length).toBe(9);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Game builds successfully after asset replacement
// ════════════════════════════════════════════════════════════════

describe("Game builds and typechecks successfully", () => {
  test("TypeScript compilation succeeds (no type errors)", () => {
    const { execSync } = require("child_process");
    expect(() => {
      execSync("npx tsc --noEmit", {
        cwd: path.resolve(__dirname, ".."),
        encoding: "utf-8",
        stdio: "pipe",
      });
    }).not.toThrow();
  }, 60000);
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Total asset payload is reasonable
// ════════════════════════════════════════════════════════════════

describe("Total ground texture asset payload is reasonable", () => {
  test("combined PNG file size is under 500 KB", () => {
    let totalSize = 0;
    for (const name of GROUND_TEXTURE_NAMES) {
      const filePath = path.join(TERRAIN_DIR, `${name}.png`);
      totalSize += fs.statSync(filePath).size;
    }
    expect(totalSize).toBeLessThan(500 * 1024);
  });
});
