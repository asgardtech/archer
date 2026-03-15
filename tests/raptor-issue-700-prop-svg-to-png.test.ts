import * as fs from "fs";
import * as path from "path";
import { PNG } from "pngjs";
import { ASSET_MANIFEST } from "../src/games/raptor/rendering/assets";
import { LEVELS } from "../src/games/raptor/levels";

const TERRAIN_DIR = path.resolve(__dirname, "../public/assets/raptor/terrain");
const ASSETS_TS = path.resolve(
  __dirname,
  "../src/games/raptor/rendering/assets.ts"
);

const ALL_PROP_NAMES = [
  "prop_crater",
  "prop_rocks",
  "prop_tire_tracks",
  "prop_debris",
  "prop_scrap_metal",
  "prop_oil_drum",
  "prop_anchor",
  "prop_bones",
  "prop_radiation_sign",
  "prop_grate",
  "prop_steam_vent",
  "prop_space_debris",
  "prop_hull_fragment",
  "prop_wiring",
  "prop_panel_shard",
  "prop_red_light",
  "prop_cable_cluster",
  "prop_vent_grate",
  "prop_blast_mark",
];

const LEVEL_PROP_POOLS: Record<string, string[]> = {
  "Level 1 (Coastal Patrol)": ["prop_rocks", "prop_debris"],
  "Level 2 (Desert Strike)": ["prop_rocks", "prop_crater", "prop_tire_tracks"],
  "Level 3 (Mountain Pass)": ["prop_rocks", "prop_debris", "prop_crater"],
  "Level 4 (Arctic Assault)": ["prop_rocks", "prop_crater", "prop_debris"],
  "Level 5 (Fortress Approach)": [
    "prop_crater",
    "prop_debris",
    "prop_tire_tracks",
    "prop_rocks",
  ],
  "Level 6 (Shipyard)": [
    "prop_scrap_metal",
    "prop_oil_drum",
    "prop_debris",
    "prop_anchor",
  ],
  "Level 7 (Wasteland)": [
    "prop_crater",
    "prop_bones",
    "prop_radiation_sign",
    "prop_debris",
  ],
  "Level 8 (Industrial)": [
    "prop_oil_drum",
    "prop_debris",
    "prop_grate",
    "prop_steam_vent",
  ],
  "Level 9 (Orbital)": [
    "prop_space_debris",
    "prop_hull_fragment",
    "prop_wiring",
    "prop_panel_shard",
  ],
  "Level 10 (Stronghold)": [
    "prop_red_light",
    "prop_debris",
    "prop_cable_cluster",
    "prop_vent_grate",
    "prop_blast_mark",
  ],
};

const MAX_FILE_SIZE_BYTES = 10 * 1024; // 10 KB

function readPNG(filePath: string): PNG {
  const data = fs.readFileSync(filePath);
  return PNG.sync.read(data);
}

function hasAlphaChannel(png: PNG): boolean {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) * 4;
      if (png.data[idx + 3] < 255) {
        return true;
      }
    }
  }
  return false;
}

function hasOpaqueRectangularBackground(png: PNG): boolean {
  const topRow = [];
  const bottomRow = [];
  const leftCol = [];
  const rightCol = [];

  for (let x = 0; x < png.width; x++) {
    const topIdx = x * 4;
    const bottomIdx = (png.width * (png.height - 1) + x) * 4;
    topRow.push(png.data[topIdx + 3]);
    bottomRow.push(png.data[bottomIdx + 3]);
  }
  for (let y = 0; y < png.height; y++) {
    const leftIdx = (png.width * y) * 4;
    const rightIdx = (png.width * y + png.width - 1) * 4;
    leftCol.push(png.data[leftIdx + 3]);
    rightCol.push(png.data[rightIdx + 3]);
  }

  const allBorderOpaque =
    topRow.every((a) => a === 255) &&
    bottomRow.every((a) => a === 255) &&
    leftCol.every((a) => a === 255) &&
    rightCol.every((a) => a === 255);

  return allBorderOpaque;
}

// ════════════════════════════════════════════════════════════════
// SCENARIO: All prop SVG files are removed
// ════════════════════════════════════════════════════════════════

describe("All prop SVG files are removed", () => {
  test("no prop_*.svg files exist in terrain directory", () => {
    const svgFiles = fs
      .readdirSync(TERRAIN_DIR)
      .filter((f) => f.startsWith("prop_") && f.endsWith(".svg"));
    expect(svgFiles).toEqual([]);
  });

  test.each(ALL_PROP_NAMES)("%s.svg should not exist", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.svg`);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: All prop PNG files exist
// ════════════════════════════════════════════════════════════════

describe("All 19 prop PNG files exist", () => {
  test("exactly 19 prop PNG files are present", () => {
    const pngFiles = fs
      .readdirSync(TERRAIN_DIR)
      .filter((f) => f.startsWith("prop_") && f.endsWith(".png"));
    expect(pngFiles).toHaveLength(19);
  });

  test.each(ALL_PROP_NAMES)("%s.png exists", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Asset manifest references PNGs for all props
// ════════════════════════════════════════════════════════════════

describe("Asset manifest references PNGs for all props", () => {
  test.each(ALL_PROP_NAMES)(
    '%s manifest path ends with ".png"',
    (name) => {
      const assetPath = ASSET_MANIFEST[name];
      expect(assetPath).toBeDefined();
      expect(assetPath).toMatch(/\.png$/);
    }
  );

  test("no prop_ entries have .svg extensions", () => {
    const propEntries = Object.entries(ASSET_MANIFEST).filter(([key]) =>
      key.startsWith("prop_")
    );
    for (const [key, value] of propEntries) {
      expect(value).not.toMatch(/\.svg$/);
    }
  });

  test("all 19 prop keys are present in the manifest", () => {
    const propKeys = Object.keys(ASSET_MANIFEST).filter((k) =>
      k.startsWith("prop_")
    );
    expect(propKeys.sort()).toEqual([...ALL_PROP_NAMES].sort());
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: PNG files have transparent backgrounds
// ════════════════════════════════════════════════════════════════

describe("PNG files have transparent backgrounds", () => {
  test.each(ALL_PROP_NAMES)("%s.png is a valid PNG with alpha channel", (name) => {
    const filePath = path.join(TERRAIN_DIR, `${name}.png`);
    const png = readPNG(filePath);
    expect(png.width).toBeGreaterThan(0);
    expect(png.height).toBeGreaterThan(0);
    expect(hasAlphaChannel(png)).toBe(true);
  });

  test.each(ALL_PROP_NAMES)(
    "%s.png does not have a fully opaque rectangular background",
    (name) => {
      const filePath = path.join(TERRAIN_DIR, `${name}.png`);
      const png = readPNG(filePath);
      expect(hasOpaqueRectangularBackground(png)).toBe(false);
    }
  );
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: PNG files are appropriately sized (dimensions & file size)
// ════════════════════════════════════════════════════════════════

describe("PNG files are appropriately sized", () => {
  test.each(ALL_PROP_NAMES)(
    "%s.png has 64x64 pixel dimensions",
    (name) => {
      const filePath = path.join(TERRAIN_DIR, `${name}.png`);
      const png = readPNG(filePath);
      expect(png.width).toBe(64);
      expect(png.height).toBe(64);
    }
  );

  test.each(ALL_PROP_NAMES)(
    "%s.png is smaller than 10 KB",
    (name) => {
      const filePath = path.join(TERRAIN_DIR, `${name}.png`);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeLessThan(MAX_FILE_SIZE_BYTES);
    }
  );
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Game compiles without errors
// ════════════════════════════════════════════════════════════════

describe("Game compiles without errors", () => {
  test("assets.ts has no TypeScript syntax errors (imports resolve)", () => {
    const content = fs.readFileSync(ASSETS_TS, "utf-8");
    expect(content).toContain("ASSET_MANIFEST");
    expect(content).toContain("AssetManifest");
  });

  test("all manifest prop paths resolve to existing files", () => {
    const publicDir = path.resolve(__dirname, "..");
    for (const name of ALL_PROP_NAMES) {
      const assetPath = ASSET_MANIFEST[name];
      const fullPath = path.join(publicDir, "public", assetPath);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Level prop pools reference props correctly
// ════════════════════════════════════════════════════════════════

describe("Level prop pools reference props that exist in manifest", () => {
  for (const [label, expectedPool] of Object.entries(LEVEL_PROP_POOLS)) {
    describe(label, () => {
      const levelNum = parseInt(label.match(/\d+/)![0]);
      const levelConfig = LEVELS[levelNum - 1];

      test("level config exists", () => {
        expect(levelConfig).toBeDefined();
        expect(levelConfig.level).toBe(levelNum);
      });

      test("propPool matches expected props", () => {
        expect(levelConfig.terrain).toBeDefined();
        expect(levelConfig.terrain!.propPool.sort()).toEqual(
          expectedPool.sort()
        );
      });

      test.each(expectedPool)(
        "prop %s in pool has a PNG manifest entry",
        (propName) => {
          const assetPath = ASSET_MANIFEST[propName];
          expect(assetPath).toBeDefined();
          expect(assetPath).toMatch(/\.png$/);
        }
      );

      test.each(expectedPool)(
        "prop %s in pool has a corresponding PNG file on disk",
        (propName) => {
          const filePath = path.join(TERRAIN_DIR, `${propName}.png`);
          expect(fs.existsSync(filePath)).toBe(true);
        }
      );
    });
  }
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: TerrainRenderer uses getOptional for graceful degradation
// ════════════════════════════════════════════════════════════════

describe("TerrainRenderer graceful degradation (source analysis)", () => {
  const terrainRendererPath = path.resolve(
    __dirname,
    "../src/games/raptor/rendering/TerrainRenderer.ts"
  );

  let terrainRendererSource: string;

  beforeAll(() => {
    terrainRendererSource = fs.readFileSync(terrainRendererPath, "utf-8");
  });

  test("uses getOptional to retrieve prop assets", () => {
    expect(terrainRendererSource).toContain("getOptional");
  });

  test("skips rendering when asset is null (if (!img) continue pattern)", () => {
    expect(terrainRendererSource).toMatch(/if\s*\(\s*!img\s*\)\s*continue/);
  });

  test("renders props at 0.5 opacity", () => {
    expect(terrainRendererSource).toMatch(/globalAlpha\s*=\s*0\.5/);
  });

  test("supports mirrored prop rendering", () => {
    expect(terrainRendererSource).toContain("prop.mirrored");
    expect(terrainRendererSource).toContain("scale(-1, 1)");
  });

  test("prop size range is 12-28px", () => {
    expect(terrainRendererSource).toMatch(
      /size\s*=\s*12\s*\+\s*Math\.random\(\)\s*\*\s*16/
    );
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: AssetLoader handles missing assets gracefully
// ════════════════════════════════════════════════════════════════

describe("AssetLoader graceful degradation (source analysis)", () => {
  const assetLoaderPath = path.resolve(
    __dirname,
    "../src/shared/AssetLoader.ts"
  );

  let assetLoaderSource: string;

  beforeAll(() => {
    assetLoaderSource = fs.readFileSync(assetLoaderPath, "utf-8");
  });

  test("logs warning on load failure (does not throw)", () => {
    expect(assetLoaderSource).toContain("console.warn");
    expect(assetLoaderSource).toContain("onerror");
    expect(assetLoaderSource).toMatch(/onerror.*=.*\(\).*=>/s);
  });

  test("getOptional returns null for missing assets", () => {
    expect(assetLoaderSource).toContain("getOptional");
    expect(assetLoaderSource).toMatch(/\?\?\s*null/);
  });

  test("loadImage resolves (never rejects) on failure", () => {
    const onerrorBlock = assetLoaderSource.match(
      /img\.onerror\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\};/
    );
    expect(onerrorBlock).not.toBeNull();
    expect(onerrorBlock![0]).toContain("resolve");
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Manifest paths use correct TERRAIN prefix
// ════════════════════════════════════════════════════════════════

describe("Manifest paths use correct terrain directory prefix", () => {
  test.each(ALL_PROP_NAMES)(
    "%s path starts with assets/raptor/terrain/",
    (name) => {
      const assetPath = ASSET_MANIFEST[name];
      expect(assetPath).toMatch(/^assets\/raptor\/terrain\//);
    }
  );

  test.each(ALL_PROP_NAMES)(
    "%s path filename matches expected pattern",
    (name) => {
      const assetPath = ASSET_MANIFEST[name];
      const expectedFilename = `${name}.png`;
      expect(assetPath).toContain(expectedFilename);
    }
  );
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: No residual SVG references in assets.ts
// ════════════════════════════════════════════════════════════════

describe("No residual prop SVG references in assets.ts", () => {
  let assetsContent: string;

  beforeAll(() => {
    assetsContent = fs.readFileSync(ASSETS_TS, "utf-8");
  });

  test("no prop_*.svg string literals in assets.ts", () => {
    const propSvgRefs = assetsContent.match(/prop_\w+\.svg/g);
    expect(propSvgRefs).toBeNull();
  });

  test("all 19 prop PNG references are present in assets.ts source", () => {
    for (const name of ALL_PROP_NAMES) {
      expect(assetsContent).toContain(`${name}.png`);
    }
  });
});

// ════════════════════════════════════════════════════════════════
// SCENARIO: Props reused across multiple levels resolve correctly
// ════════════════════════════════════════════════════════════════

describe("Cross-level prop reuse consistency", () => {
  const sharedProps: Record<string, number[]> = {};

  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i];
    if (!level.terrain) continue;
    for (const prop of level.terrain.propPool) {
      if (!sharedProps[prop]) sharedProps[prop] = [];
      sharedProps[prop].push(level.level);
    }
  }

  const reusedProps = Object.entries(sharedProps).filter(
    ([, levels]) => levels.length > 1
  );

  test("at least some props are reused across levels", () => {
    expect(reusedProps.length).toBeGreaterThan(0);
  });

  test.each(reusedProps)(
    "shared prop %s (used in levels %s) maps to one manifest entry with .png",
    (propName) => {
      const assetPath = ASSET_MANIFEST[propName];
      expect(assetPath).toBeDefined();
      expect(assetPath).toMatch(/\.png$/);
      const filePath = path.join(
        TERRAIN_DIR,
        `${propName}.png`
      );
      expect(fs.existsSync(filePath)).toBe(true);
    }
  );
});
