import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import { LEVELS } from "../src/games/raptor/levels";

const TERRAIN_DIR = path.resolve(__dirname, "../public/assets/raptor/terrain");

const STRUCTURE_NAMES = [
  "struct_beach_hut",
  "struct_lighthouse",
  "struct_palm_tree",
  "struct_oil_rig",
  "struct_bunker",
  "struct_cactus",
  "struct_pine_tree",
  "struct_watchtower",
  "struct_radar_dish",
  "struct_barracks",
  "struct_aa_gun",
  "struct_hangar",
  "struct_command_center",
  "struct_wall_segment",
];

const LEVEL_STRUCTURE_MAP: Record<number, string[]> = {
  1: ["struct_beach_hut", "struct_lighthouse", "struct_palm_tree"],
  2: ["struct_oil_rig", "struct_cactus", "struct_bunker"],
  3: ["struct_pine_tree", "struct_watchtower", "struct_radar_dish", "struct_bunker"],
  4: ["struct_barracks", "struct_radar_dish", "struct_bunker", "struct_watchtower"],
  5: ["struct_wall_segment", "struct_aa_gun", "struct_hangar", "struct_command_center", "struct_bunker"],
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
// SCENARIO: All 14 PNG structure replacements exist on disk
// ════════════════════════════════════════════════════════════════

describe("All 14 PNG structure replacements exist in the terrain asset directory", () => {
  test.each(STRUCTURE_NAMES)("%s.png exists", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Old SVG structure files are removed
// ════════════════════════════════════════════════════════════════

describe("Old SVG structure files are removed", () => {
  test.each(STRUCTURE_NAMES)("%s.svg should not exist", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.svg`);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Asset manifest references PNG extensions
// ════════════════════════════════════════════════════════════════

describe("Asset manifest references PNG extensions for all structures", () => {
  test.each(STRUCTURE_NAMES)("%s manifest path ends with .png", (name) => {
    const assetPath = ASSET_MANIFEST[name];
    expect(assetPath).toBeDefined();
    expect(assetPath).toMatch(/\.png$/);
  });

  test("no structure asset paths end with .svg", () => {
    for (const name of STRUCTURE_NAMES) {
      const assetPath = ASSET_MANIFEST[name];
      expect(assetPath).not.toMatch(/\.svg$/);
    }
  });

  test.each(STRUCTURE_NAMES)("%s manifest path resolves to correct location", (name) => {
    const assetPath = ASSET_MANIFEST[name];
    expect(assetPath).toBe(`assets/raptor/terrain/${name}.png`);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Generated PNGs have valid PNG signatures and are decodable
// ════════════════════════════════════════════════════════════════

describe("Generated PNGs are valid PNG image files", () => {
  test.each(STRUCTURE_NAMES)("%s.png has valid PNG signature", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const data = fs.readFileSync(filePath);
    expect(data[0]).toBe(0x89);
    expect(data[1]).toBe(0x50);
    expect(data[2]).toBe(0x4e);
    expect(data[3]).toBe(0x47);
  });

  test.each(STRUCTURE_NAMES)("%s.png is decodable as PNG", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    expect(png.data.length).toBe(png.width * png.height * 4);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: PNGs are square and appropriately sized
// ════════════════════════════════════════════════════════════════

describe("Generated PNGs are square and appropriately sized", () => {
  test.each(STRUCTURE_NAMES)("%s.png has equal width and height", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    expect(png.width).toBe(png.height);
  });

  test.each(STRUCTURE_NAMES)("%s.png is 64 or 128 pixels", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    expect([64, 128]).toContain(png.width);
  });

  test.each(STRUCTURE_NAMES)("%s.png file size is less than 50 KB", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeLessThan(50 * 1024);
  });

  test.each(STRUCTURE_NAMES)("%s.png file size is greater than 500 bytes (real content)", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(500);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Structure PNGs use alpha transparency
// ════════════════════════════════════════════════════════════════

describe("Structure PNGs use alpha transparency", () => {
  test.each(STRUCTURE_NAMES)("%s.png has at least 10%% transparent pixels", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    let transparentCount = 0;
    const totalPixels = png.width * png.height;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const [, , , a] = getPixelRGBA(png, x, y);
        if (a < 255) transparentCount++;
      }
    }
    expect(transparentCount / totalPixels).toBeGreaterThan(0.1);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Structure PNGs contain real image data
// ════════════════════════════════════════════════════════════════

describe("PNGs contain real structure artwork, not flat fills", () => {
  test.each(STRUCTURE_NAMES)("%s.png has more than 10 unique colors", (name) => {
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
// SCENARIO: Level structure pools reference valid PNG assets
// ════════════════════════════════════════════════════════════════

describe("Level 1–5 structure pools reference valid PNG assets", () => {
  test.each(Object.entries(LEVEL_STRUCTURE_MAP))(
    "level %s structurePool keys exist in manifest with .png paths",
    (levelStr, expectedStructures) => {
      const levelNum = parseInt(levelStr, 10);
      const levelConfig = LEVELS[levelNum - 1];
      expect(levelConfig).toBeDefined();
      expect(levelConfig.terrain).toBeDefined();
      expect(levelConfig.terrain!.structurePool).toBeDefined();

      for (const key of levelConfig.terrain!.structurePool!) {
        const assetPath = ASSET_MANIFEST[key];
        expect(assetPath).toBeDefined();
        expect(assetPath).toMatch(/\.png$/);
      }
    }
  );
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Shared structures work across multiple levels
// ════════════════════════════════════════════════════════════════

describe("Shared structures resolve to existing PNG files", () => {
  test("struct_bunker (levels 2,3,4,5) resolves to a .png path and file exists", () => {
    const assetPath = ASSET_MANIFEST["struct_bunker"];
    expect(assetPath).toMatch(/\.png$/);
    const fullPath = path.resolve(__dirname, "../public", assetPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  test("struct_aa_gun (levels 5,10) resolves to a .png path and file exists", () => {
    const assetPath = ASSET_MANIFEST["struct_aa_gun"];
    expect(assetPath).toMatch(/\.png$/);
    const fullPath = path.resolve(__dirname, "../public", assetPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  test("struct_radar_dish (levels 3,4) resolves to a .png path and file exists", () => {
    const assetPath = ASSET_MANIFEST["struct_radar_dish"];
    expect(assetPath).toMatch(/\.png$/);
    const fullPath = path.resolve(__dirname, "../public", assetPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  test("struct_watchtower (levels 3,4) resolves to a .png path and file exists", () => {
    const assetPath = ASSET_MANIFEST["struct_watchtower"];
    expect(assetPath).toMatch(/\.png$/);
    const fullPath = path.resolve(__dirname, "../public", assetPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: No rendering or game logic code is modified
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
// SCENARIO: Only expected files are changed
// ════════════════════════════════════════════════════════════════

describe("Only expected files were changed", () => {
  test("assets.ts is the only modified source code file", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD --name-only -- '*.ts' '*.tsx' '*.js' '*.jsx'", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    const changedSourceFiles = diff.trim().split("\n").filter(Boolean);
    const nonTestFiles = changedSourceFiles.filter((f: string) => !f.startsWith("tests/"));
    expect(nonTestFiles).toEqual(["src/games/raptor/rendering/assets.ts"]);
  });

  test("exactly 14 SVG files were deleted", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD --diff-filter=D --name-only", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    const deletedFiles = diff.trim().split("\n").filter(Boolean);
    const deletedSvgs = deletedFiles.filter((f: string) => f.match(/struct_.*\.svg$/));
    expect(deletedSvgs.length).toBe(14);
  });

  test("exactly 14 structure PNG files were added", () => {
    const { execSync } = require("child_process");
    const diff = execSync("git diff main..HEAD --diff-filter=A --name-only", {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf-8",
    });
    const addedFiles = diff.trim().split("\n").filter(Boolean);
    const addedPngs = addedFiles.filter((f: string) => f.match(/struct_.*\.png$/));
    expect(addedPngs.length).toBe(14);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Game compiles without errors
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
// SCENARIO: Total structure asset payload is reasonable
// ════════════════════════════════════════════════════════════════

describe("Total structure asset payload is reasonable", () => {
  test("combined PNG file size is under 500 KB", () => {
    let totalSize = 0;
    for (const name of STRUCTURE_NAMES) {
      const filePath = path.join(TERRAIN_DIR, `${name}.png`);
      totalSize += fs.statSync(filePath).size;
    }
    expect(totalSize).toBeLessThan(500 * 1024);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Asset files referenced in manifest exist on disk
// ════════════════════════════════════════════════════════════════

describe("All structure asset files referenced in manifest exist on disk", () => {
  test.each(STRUCTURE_NAMES)("%s asset file exists at manifest path", (name) => {
    const assetPath = ASSET_MANIFEST[name];
    const fullPath = path.resolve(__dirname, "../public", assetPath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });
});
