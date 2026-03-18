import { PNG } from "pngjs";
import * as fs from "fs";
import * as path from "path";

const TERRAIN_DIR = path.resolve(__dirname, "../public/assets/raptor/terrain");

function setPixel(png: PNG, x: number, y: number, r: number, g: number, b: number, a: number) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) * 4;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function getPixel(png: PNG, x: number, y: number): [number, number, number, number] {
  const idx = (png.width * y + x) * 4;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  int(lo: number, hi: number): number {
    return Math.floor(this.next() * (hi - lo + 1)) + lo;
  }
}

function fillRect(png: PNG, x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(png, x + dx, y + dy, r, g, b, a);
    }
  }
}

function drawEllipse(png: PNG, cx: number, cy: number, rx: number, ry: number, r: number, g: number, b: number, a: number) {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.0) {
        setPixel(png, cx + dx, cy + dy, r, g, b, a);
      }
    }
  }
}

function drawLine(png: PNG, x0: number, y0: number, x1: number, y1: number, r: number, g: number, b: number, a: number) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0, cy = y0;
  while (true) {
    setPixel(png, cx, cy, r, g, b, a);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
}

function addNoise(png: PNG, rng: SeededRandom, intensity: number) {
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const [r, g, b, a] = getPixel(png, x, y);
      if (a === 0) continue;
      const n = rng.int(-intensity, intensity);
      setPixel(png, x, y, clamp(r + n, 0, 255), clamp(g + n, 0, 255), clamp(b + n, 0, 255), a);
    }
  }
}

function savePNG(png: PNG, filename: string) {
  const outPath = path.join(TERRAIN_DIR, filename);
  const buf = PNG.sync.write(png);
  fs.writeFileSync(outPath, buf);
  console.log(`  Created ${filename} (${buf.length} bytes)`);
}

// ════════════════════════════════════════════════════════════════
// HORIZON: Colony (800x200)
// ════════════════════════════════════════════════════════════════
function generateHorizonColony() {
  const png = new PNG({ width: 800, height: 200 });
  const rng = new SeededRandom(1101);
  const skyTop = hexToRGB("#1a1a3e");
  const skyBot = hexToRGB("#4a3060");

  for (let y = 0; y < 200; y++) {
    const t = y / 199;
    const edgeAlpha = y < 15 ? Math.round((y / 14) * 255) :
                      y > 185 ? Math.round(((199 - y) / 14) * 255) : 255;
    const r = lerp(skyTop[0], skyBot[0], t);
    const g = lerp(skyTop[1], skyBot[1], t);
    const b = lerp(skyTop[2], skyBot[2], t);
    for (let x = 0; x < 800; x++) {
      setPixel(png, x, y, r, g, b, edgeAlpha);
    }
  }

  // Stars in upper portion
  for (let i = 0; i < 40; i++) {
    const sx = rng.int(0, 799);
    const sy = rng.int(0, 80);
    const bright = rng.int(180, 240);
    setPixel(png, sx, sy, bright, bright, clamp(bright + 15, 0, 255), 200);
  }

  // Ground line
  const groundY = 155;
  for (let x = 0; x < 800; x++) {
    for (let y = groundY; y < 200; y++) {
      const t = (y - groundY) / (199 - groundY);
      const edgeAlpha = y > 185 ? Math.round(((199 - y) / 14) * 255) : 255;
      setPixel(png, x, y, lerp(0x5a, 0x40, t), lerp(0x5a, 0x38, t), lerp(0x6e, 0x50, t), edgeAlpha);
    }
  }

  // Hab-domes silhouettes
  const domes = [
    { cx: 100, cy: 140, rx: 40, ry: 25 },
    { cx: 350, cy: 135, rx: 55, ry: 30 },
    { cx: 580, cy: 140, rx: 35, ry: 22 },
    { cx: 720, cy: 138, rx: 45, ry: 26 },
  ];
  for (const d of domes) {
    for (let dy = -d.ry; dy <= 0; dy++) {
      for (let dx = -d.rx; dx <= d.rx; dx++) {
        if ((dx * dx) / (d.rx * d.rx) + (dy * dy) / (d.ry * d.ry) <= 1.0) {
          const shade = lerp(0x30, 0x50, (dy + d.ry) / d.ry);
          setPixel(png, d.cx + dx, d.cy + dy, shade, shade + 5, shade + 15, 255);
        }
      }
    }
    // Window lights
    for (let i = 0; i < 4; i++) {
      const wx = d.cx + rng.int(-d.rx + 8, d.rx - 8);
      const wy = d.cy + rng.int(-d.ry + 4, -2);
      setPixel(png, wx, wy, 0xff, 0xb8, 0x50, 255);
      setPixel(png, wx + 1, wy, 0xff, 0xb8, 0x50, 255);
    }
  }

  // Comm towers
  const towers = [200, 450, 660];
  for (const tx of towers) {
    const towerH = rng.int(55, 75);
    const topY = groundY - towerH;
    for (let y = topY; y <= groundY; y++) {
      setPixel(png, tx, y, 0x60, 0x68, 0x78, 255);
      setPixel(png, tx + 1, y, 0x55, 0x5d, 0x6d, 255);
    }
    setPixel(png, tx, topY - 1, 0xff, 0x30, 0x30, 255);
    setPixel(png, tx + 1, topY - 1, 0xff, 0x30, 0x30, 200);
    for (let dx = -4; dx <= 5; dx++) {
      setPixel(png, tx + dx, topY + 10, 0x50, 0x58, 0x68, 255);
    }
    drawEllipse(png, tx, groundY - 3, 6, 3, 0xff, 0x90, 0x30, 80);
  }

  // Landing platforms
  const pads = [{ x: 50, y: groundY - 2, w: 40 }, { x: 620, y: groundY - 2, w: 50 }];
  for (const p of pads) {
    fillRect(png, p.x, p.y, p.w, 3, 0x70, 0x78, 0x88, 255);
    for (let i = 0; i < p.w; i += 6) {
      setPixel(png, p.x + i, p.y, 0xff, 0xd0, 0x30, 255);
      setPixel(png, p.x + i + 1, p.y, 0xff, 0xd0, 0x30, 255);
    }
  }

  savePNG(png, "horizon_colony.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Colony Tower (128x128)
// ════════════════════════════════════════════════════════════════
function generateStructColonyTower() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1102);

  // Main tower body
  fillRect(png, 54, 20, 20, 90, 0x6a, 0x70, 0x80, 255);
  fillRect(png, 56, 22, 16, 86, 0x7a, 0x82, 0x92, 255);

  // Base platform
  fillRect(png, 44, 105, 40, 8, 0x50, 0x58, 0x68, 255);
  fillRect(png, 46, 107, 36, 4, 0x5a, 0x62, 0x72, 255);

  // Observation deck
  fillRect(png, 48, 25, 32, 6, 0x60, 0x68, 0x78, 255);
  fillRect(png, 50, 22, 28, 4, 0x6a, 0x72, 0x82, 255);

  // Antenna mast
  fillRect(png, 63, 4, 2, 18, 0x80, 0x88, 0x98, 255);

  // Warning light at top (bright red for litStructures flicker)
  drawEllipse(png, 64, 5, 3, 3, 0xff, 0x30, 0x20, 255);
  setPixel(png, 64, 4, 0xff, 0x60, 0x40, 255);
  setPixel(png, 64, 6, 0xff, 0x60, 0x40, 255);

  // Window details
  for (let wy = 35; wy < 100; wy += 12) {
    fillRect(png, 58, wy, 4, 3, 0xff, 0xb8, 0x50, 200);
    fillRect(png, 66, wy, 4, 3, 0xff, 0xb8, 0x50, 200);
  }

  // Structural lines
  for (let y = 30; y < 105; y += 15) {
    fillRect(png, 54, y, 20, 1, 0x55, 0x5d, 0x6d, 255);
  }

  // Struts
  drawLine(png, 48, 25, 54, 40, 0x58, 0x60, 0x70, 255);
  drawLine(png, 80, 25, 74, 40, 0x58, 0x60, 0x70, 255);

  addNoise(png, rng, 5);
  savePNG(png, "struct_colony_tower.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Landing Pad (128x128)
// ════════════════════════════════════════════════════════════════
function generateStructLandingPad() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1103);

  // Main pad surface (slightly rounded rectangle)
  for (let y = 24; y < 104; y++) {
    for (let x = 24; x < 104; x++) {
      const dx = Math.abs(x - 64);
      const dy = Math.abs(y - 64);
      if (dx + dy < 95) {
        setPixel(png, x, y, 0x68, 0x6e, 0x78, 255);
      }
    }
  }

  // Inner pad surface
  for (let y = 30; y < 98; y++) {
    for (let x = 30; x < 98; x++) {
      setPixel(png, x, y, 0x72, 0x78, 0x82, 255);
    }
  }

  // Panel lines
  fillRect(png, 30, 63, 68, 1, 0x5a, 0x60, 0x6a, 255);
  fillRect(png, 63, 30, 1, 68, 0x5a, 0x60, 0x6a, 255);

  // Diagonal guide markings (yellow stripes in corners)
  for (let i = 0; i < 12; i++) {
    // Top-left corner marking
    drawLine(png, 32 + i * 2, 32, 32, 32 + i * 2, 0xff, 0xd0, 0x30, 220);
    // Top-right
    drawLine(png, 96 - i * 2, 32, 96, 32 + i * 2, 0xff, 0xd0, 0x30, 220);
    // Bottom-left
    drawLine(png, 32, 96 - i * 2, 32 + i * 2, 96, 0xff, 0xd0, 0x30, 220);
    // Bottom-right
    drawLine(png, 96, 96 - i * 2, 96 - i * 2, 96, 0xff, 0xd0, 0x30, 220);
  }

  // Center circle (landing target)
  drawEllipse(png, 64, 64, 12, 12, 0x50, 0x56, 0x60, 255);
  drawEllipse(png, 64, 64, 10, 10, 0x68, 0x6e, 0x78, 255);
  // Cross in center
  fillRect(png, 60, 64, 8, 1, 0xff, 0xff, 0xff, 180);
  fillRect(png, 64, 60, 1, 8, 0xff, 0xff, 0xff, 180);

  // Edge lights
  const lights = [[32, 30], [96, 30], [32, 98], [96, 98], [64, 28], [64, 100], [28, 64], [100, 64]];
  for (const [lx, ly] of lights) {
    setPixel(png, lx, ly, 0xff, 0xff, 0xff, 240);
    setPixel(png, lx + 1, ly, 0xff, 0xee, 0xcc, 200);
  }

  addNoise(png, rng, 4);
  savePNG(png, "struct_landing_pad.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Comm Relay (128x128) — litStructure
// ════════════════════════════════════════════════════════════════
function generateStructCommRelay() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1104);

  // Support base
  fillRect(png, 52, 95, 24, 15, 0x50, 0x58, 0x68, 255);
  fillRect(png, 54, 97, 20, 11, 0x5a, 0x62, 0x72, 255);

  // Central mast
  fillRect(png, 62, 30, 4, 65, 0x6a, 0x70, 0x80, 255);

  // Parabolic dish (top-down: ellipse)
  drawEllipse(png, 64, 38, 28, 20, 0x78, 0x80, 0x90, 255);
  drawEllipse(png, 64, 38, 24, 17, 0x85, 0x8d, 0x9d, 255);
  drawEllipse(png, 64, 36, 20, 14, 0x8a, 0x92, 0xa2, 255);

  // Dish interior shading
  drawEllipse(png, 64, 37, 14, 10, 0x70, 0x78, 0x88, 255);

  // Feed horn at center of dish
  fillRect(png, 63, 36, 3, 3, 0x55, 0x5d, 0x6d, 255);

  // Support struts from dish to mast
  drawLine(png, 40, 35, 62, 50, 0x60, 0x68, 0x78, 255);
  drawLine(png, 88, 35, 66, 50, 0x60, 0x68, 0x78, 255);

  // Indicator lights (bright for litStructure flicker)
  setPixel(png, 64, 18, 0x40, 0xff, 0x40, 255);
  setPixel(png, 65, 18, 0x40, 0xff, 0x40, 255);
  setPixel(png, 64, 17, 0x60, 0xff, 0x60, 200);

  // Small antenna elements
  fillRect(png, 61, 20, 1, 10, 0x70, 0x78, 0x88, 255);
  fillRect(png, 67, 20, 1, 10, 0x70, 0x78, 0x88, 255);

  // Cable details
  drawLine(png, 55, 95, 62, 75, 0x45, 0x4d, 0x5d, 200);
  drawLine(png, 73, 95, 66, 75, 0x45, 0x4d, 0x5d, 200);

  addNoise(png, rng, 5);
  savePNG(png, "struct_comm_relay.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Habitat (128x128)
// ════════════════════════════════════════════════════════════════
function generateStructHabitat() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1105);

  // Dome shape (top-down: rounded rectangle body with dome top)
  // Base rectangle
  fillRect(png, 28, 50, 72, 55, 0x60, 0x68, 0x78, 255);
  fillRect(png, 30, 52, 68, 51, 0x6a, 0x72, 0x82, 255);

  // Dome top (semi-ellipse)
  drawEllipse(png, 64, 50, 35, 22, 0x70, 0x78, 0x88, 255);
  drawEllipse(png, 64, 48, 30, 18, 0x7a, 0x82, 0x92, 255);

  // Hull panel lines
  for (let x = 35; x < 95; x += 10) {
    fillRect(png, x, 52, 1, 50, 0x58, 0x60, 0x70, 255);
  }
  fillRect(png, 30, 65, 68, 1, 0x58, 0x60, 0x70, 255);
  fillRect(png, 30, 80, 68, 1, 0x58, 0x60, 0x70, 255);

  // Windows with interior light
  const windows = [[40, 55], [55, 55], [70, 55], [85, 55], [40, 70], [55, 70], [70, 70], [85, 70]];
  for (const [wx, wy] of windows) {
    fillRect(png, wx, wy, 5, 4, 0xff, 0xc0, 0x60, 180);
    fillRect(png, wx + 1, wy + 1, 3, 2, 0xff, 0xd8, 0x80, 220);
  }

  // Airlock door
  fillRect(png, 58, 87, 12, 16, 0x50, 0x58, 0x68, 255);
  fillRect(png, 59, 88, 10, 14, 0x55, 0x5d, 0x6d, 255);
  fillRect(png, 63, 89, 2, 12, 0x48, 0x50, 0x60, 255);
  // Airlock indicator
  setPixel(png, 60, 89, 0x40, 0xff, 0x40, 255);

  // Dome highlight
  drawEllipse(png, 60, 42, 10, 6, 0x85, 0x8d, 0x9d, 120);

  addNoise(png, rng, 4);
  savePNG(png, "struct_habitat.png");
}

// ════════════════════════════════════════════════════════════════
// PROP: Crate (64x64)
// ════════════════════════════════════════════════════════════════
function generatePropCrate() {
  const png = new PNG({ width: 64, height: 64 });
  const rng = new SeededRandom(1106);

  // Main crate body
  fillRect(png, 14, 14, 36, 36, 0x6a, 0x68, 0x60, 255);
  fillRect(png, 16, 16, 32, 32, 0x78, 0x76, 0x6e, 255);

  // Top highlight
  fillRect(png, 16, 16, 32, 2, 0x88, 0x86, 0x7e, 255);
  // Bottom shadow
  fillRect(png, 16, 46, 32, 2, 0x58, 0x56, 0x4e, 255);

  // Cross bands
  fillRect(png, 14, 30, 36, 2, 0x58, 0x58, 0x50, 255);
  fillRect(png, 30, 14, 2, 36, 0x58, 0x58, 0x50, 255);

  // Handle detail
  fillRect(png, 26, 22, 12, 2, 0x50, 0x50, 0x48, 255);
  fillRect(png, 26, 22, 2, 4, 0x50, 0x50, 0x48, 255);
  fillRect(png, 36, 22, 2, 4, 0x50, 0x50, 0x48, 255);

  // Corner rivets
  for (const [rx, ry] of [[16, 16], [46, 16], [16, 46], [46, 46]]) {
    setPixel(png, rx, ry, 0x90, 0x8e, 0x86, 255);
  }

  // Stencil label area
  fillRect(png, 20, 34, 10, 6, 0x60, 0x60, 0x58, 200);

  addNoise(png, rng, 6);
  savePNG(png, "prop_crate.png");
}

// ════════════════════════════════════════════════════════════════
// PROP: Antenna (64x64)
// ════════════════════════════════════════════════════════════════
function generatePropAntenna() {
  const png = new PNG({ width: 64, height: 64 });
  const rng = new SeededRandom(1107);

  // Base plate
  drawEllipse(png, 32, 52, 8, 4, 0x50, 0x58, 0x68, 255);

  // Mast
  fillRect(png, 31, 14, 2, 38, 0x70, 0x78, 0x88, 255);

  // Small dish at top
  drawEllipse(png, 32, 16, 8, 5, 0x7a, 0x82, 0x92, 255);
  drawEllipse(png, 32, 15, 6, 4, 0x85, 0x8d, 0x9d, 255);

  // Feed element
  setPixel(png, 32, 14, 0x60, 0x68, 0x78, 255);

  // Small cross-bar
  fillRect(png, 26, 30, 12, 1, 0x65, 0x6d, 0x7d, 255);

  // Tip light
  setPixel(png, 32, 12, 0xff, 0x40, 0x40, 255);

  addNoise(png, rng, 4);
  savePNG(png, "prop_antenna.png");
}

// ════════════════════════════════════════════════════════════════
// PROP: Light Post (64x64)
// ════════════════════════════════════════════════════════════════
function generatePropLightPost() {
  const png = new PNG({ width: 64, height: 64 });
  const rng = new SeededRandom(1108);

  // Base
  fillRect(png, 28, 52, 8, 6, 0x50, 0x58, 0x68, 255);

  // Pole
  fillRect(png, 31, 16, 2, 36, 0x68, 0x70, 0x80, 255);

  // Light fixture head
  fillRect(png, 27, 14, 10, 4, 0x60, 0x68, 0x78, 255);

  // Warm glow
  drawEllipse(png, 32, 20, 8, 6, 0xff, 0xb8, 0x50, 60);
  drawEllipse(png, 32, 18, 5, 3, 0xff, 0xc8, 0x60, 100);

  // Light element (bright center)
  fillRect(png, 29, 17, 6, 2, 0xff, 0xe0, 0x90, 230);

  addNoise(png, rng, 3);
  savePNG(png, "prop_light_post.png");
}

// ════════════════════════════════════════════════════════════════
// HORIZON: Asteroid (800x200)
// ════════════════════════════════════════════════════════════════
function generateHorizonAsteroid() {
  const png = new PNG({ width: 800, height: 200 });
  const rng = new SeededRandom(1201);
  const skyTop = hexToRGB("#050508");
  const skyBot = hexToRGB("#0f0f1a");

  for (let y = 0; y < 200; y++) {
    const t = y / 199;
    const edgeAlpha = y < 15 ? Math.round((y / 14) * 255) :
                      y > 185 ? Math.round(((199 - y) / 14) * 255) : 255;
    const r = lerp(skyTop[0], skyBot[0], t);
    const g = lerp(skyTop[1], skyBot[1], t);
    const b = lerp(skyTop[2], skyBot[2], t);
    for (let x = 0; x < 800; x++) {
      setPixel(png, x, y, r, g, b, edgeAlpha);
    }
  }

  // Dense star field
  for (let i = 0; i < 200; i++) {
    const sx = rng.int(0, 799);
    const sy = rng.int(0, 140);
    const bright = rng.int(180, 255);
    setPixel(png, sx, sy, bright, bright, clamp(bright + 15, 0, 255), 220);
    if (i < 40) {
      setPixel(png, sx + 1, sy, bright - 40, bright - 40, bright, 180);
    }
  }

  // Distant asteroid silhouettes
  const asteroids = [
    { cx: 80, cy: 140, rx: 50, ry: 30 },
    { cx: 220, cy: 155, rx: 35, ry: 20 },
    { cx: 380, cy: 148, rx: 65, ry: 35 },
    { cx: 510, cy: 160, rx: 28, ry: 18 },
    { cx: 620, cy: 145, rx: 45, ry: 28 },
    { cx: 750, cy: 155, rx: 40, ry: 22 },
  ];
  for (const a of asteroids) {
    for (let dy = -a.ry; dy <= a.ry; dy++) {
      for (let dx = -a.rx; dx <= a.rx; dx++) {
        const dist = (dx * dx) / (a.rx * a.rx) + (dy * dy) / (a.ry * a.ry);
        if (dist <= 1.0) {
          const shade = lerp(0x10, 0x1e, (dy + a.ry) / (2 * a.ry));
          const py = a.cy + dy;
          if (py >= 0 && py < 200) {
            const edgeAlpha = py > 185 ? Math.round(((199 - py) / 14) * 255) : 255;
            setPixel(png, a.cx + dx, py, shade, shade, shade + 3, edgeAlpha);
          }
        }
      }
    }
    // Highlight rim
    for (let dx = -a.rx + 5; dx < a.rx - 5; dx++) {
      const rimY = a.cy - a.ry + Math.abs(dx) * a.ry / (a.rx * 2);
      if (rimY >= 0 && rimY < 200) {
        setPixel(png, a.cx + dx, Math.round(rimY), 0x2a, 0x2a, 0x32, 200);
      }
    }
  }

  // Small foreground rocks
  for (let i = 0; i < 6; i++) {
    const rx = rng.int(10, 790);
    const ry = rng.int(165, 185);
    const size = rng.int(3, 7);
    drawEllipse(png, rx, ry, size, Math.round(size * 0.6), 0x18, 0x18, 0x1e, 220);
  }

  savePNG(png, "horizon_asteroid.png");
}

// ════════════════════════════════════════════════════════════════
// GROUND: Rock (256x256) — tileable
// ════════════════════════════════════════════════════════════════
function generateGroundRock() {
  const png = new PNG({ width: 256, height: 256 });
  const rng = new SeededRandom(1202);
  const base = hexToRGB("#1a1a1e");

  // Fill base color
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      setPixel(png, x, y, base[0], base[1], base[2], 255);
    }
  }

  // Low-frequency variation (large blobs) — wrapping for tileable
  for (let i = 0; i < 12; i++) {
    const bx = rng.int(0, 255);
    const by = rng.int(0, 255);
    const br = rng.int(25, 55);
    const shade = rng.int(-6, 6);
    for (let dy = -br; dy <= br; dy++) {
      for (let dx = -br; dx <= br; dx++) {
        if (dx * dx + dy * dy <= br * br) {
          const px = ((bx + dx) % 256 + 256) % 256;
          const py = ((by + dy) % 256 + 256) % 256;
          const [cr, cg, cb, ca] = getPixel(png, px, py);
          setPixel(png, px, py, clamp(cr + shade, 0, 255), clamp(cg + shade, 0, 255), clamp(cb + shade, 0, 255), ca);
        }
      }
    }
  }

  // Cracks/veins — wrapping
  for (let i = 0; i < 10; i++) {
    let cx = rng.int(0, 255);
    let cy = rng.int(0, 255);
    const len = rng.int(20, 50);
    for (let j = 0; j < len; j++) {
      const px = (cx % 256 + 256) % 256;
      const py = (cy % 256 + 256) % 256;
      const [cr, cg, cb] = getPixel(png, px, py);
      setPixel(png, px, py, clamp(cr - 4, 0, 255), clamp(cg - 4, 0, 255), clamp(cb - 3, 0, 255), 255);
      cx += rng.int(-1, 1);
      cy += rng.int(0, 1);
    }
  }

  // Moderate noise (quantized to reduce unique colors)
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const [cr, cg, cb] = getPixel(png, x, y);
      const n = rng.int(-2, 2) * 2;
      setPixel(png, x, y, clamp(cr + n, 0, 255), clamp(cg + n, 0, 255), clamp(cb + n, 0, 255), 255);
    }
  }

  // Mineral specks
  for (let i = 0; i < 20; i++) {
    const sx = rng.int(0, 255);
    const sy = rng.int(0, 255);
    const [cr, cg, cb] = getPixel(png, sx, sy);
    setPixel(png, sx, sy, clamp(cr + 16, 0, 255), clamp(cg + 14, 0, 255), clamp(cb + 18, 0, 255), 255);
  }

  savePNG(png, "ground_rock.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Drill Rig (128x128)
// ════════════════════════════════════════════════════════════════
function generateStructDrillRig() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1203);

  // Base platform
  fillRect(png, 30, 90, 68, 20, 0x3a, 0x3a, 0x42, 255);
  fillRect(png, 32, 92, 64, 16, 0x42, 0x42, 0x4a, 255);

  // Scaffolding legs
  fillRect(png, 35, 70, 4, 20, 0x50, 0x50, 0x58, 255);
  fillRect(png, 89, 70, 4, 20, 0x50, 0x50, 0x58, 255);
  fillRect(png, 60, 70, 4, 20, 0x50, 0x50, 0x58, 255);

  // Derrick tower (A-frame)
  drawLine(png, 40, 70, 62, 15, 0x55, 0x55, 0x5d, 255);
  drawLine(png, 41, 70, 63, 15, 0x55, 0x55, 0x5d, 255);
  drawLine(png, 88, 70, 66, 15, 0x55, 0x55, 0x5d, 255);
  drawLine(png, 87, 70, 65, 15, 0x55, 0x55, 0x5d, 255);

  // Cross braces
  for (let i = 0; i < 4; i++) {
    const y = 25 + i * 12;
    const spread = 3 + i * 5;
    fillRect(png, 64 - spread, y, spread * 2, 1, 0x48, 0x48, 0x50, 255);
  }

  // Drill column (center)
  fillRect(png, 62, 15, 4, 80, 0x58, 0x58, 0x60, 255);
  fillRect(png, 63, 15, 2, 80, 0x62, 0x62, 0x6a, 255);

  // Drill bit at bottom
  fillRect(png, 61, 95, 6, 10, 0x45, 0x45, 0x4d, 255);
  setPixel(png, 63, 107, 0x70, 0x70, 0x78, 255);
  setPixel(png, 64, 107, 0x70, 0x70, 0x78, 255);

  // Warning light
  setPixel(png, 64, 14, 0xff, 0xa0, 0x20, 255);
  setPixel(png, 63, 14, 0xff, 0xa0, 0x20, 255);
  setPixel(png, 64, 13, 0xff, 0xc0, 0x40, 200);

  // Equipment box on base
  fillRect(png, 38, 92, 12, 8, 0x48, 0x48, 0x50, 255);
  fillRect(png, 76, 92, 12, 8, 0x48, 0x48, 0x50, 255);

  // Pipes
  drawLine(png, 38, 93, 30, 88, 0x40, 0x40, 0x48, 255);
  drawLine(png, 90, 93, 98, 88, 0x40, 0x40, 0x48, 255);

  addNoise(png, rng, 5);
  savePNG(png, "struct_drill_rig.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Ore Processor (128x128) — litStructure
// ════════════════════════════════════════════════════════════════
function generateStructOreProcessor() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1204);

  // Main building body
  fillRect(png, 24, 35, 80, 65, 0x3a, 0x3a, 0x42, 255);
  fillRect(png, 26, 37, 76, 61, 0x42, 0x42, 0x4a, 255);

  // Roof
  fillRect(png, 22, 32, 84, 5, 0x38, 0x38, 0x40, 255);

  // Conveyor feed on left
  fillRect(png, 10, 55, 14, 6, 0x48, 0x48, 0x50, 255);
  fillRect(png, 12, 56, 12, 4, 0x50, 0x50, 0x58, 255);
  drawLine(png, 10, 55, 24, 50, 0x45, 0x45, 0x4d, 255);
  drawLine(png, 10, 60, 24, 65, 0x45, 0x45, 0x4d, 255);

  // Hopper on top
  fillRect(png, 45, 22, 30, 12, 0x3e, 0x3e, 0x46, 255);
  fillRect(png, 48, 20, 24, 4, 0x44, 0x44, 0x4c, 255);

  // Processing windows (lit — operational lights)
  for (let wy = 42; wy < 90; wy += 14) {
    for (let wx = 32; wx < 96; wx += 16) {
      fillRect(png, wx, wy, 4, 3, 0xa0, 0xb4, 0xdc, 180);
    }
  }

  // Output chute on right
  fillRect(png, 104, 60, 14, 8, 0x45, 0x45, 0x4d, 255);
  fillRect(png, 116, 62, 4, 4, 0x50, 0x50, 0x58, 255);

  // Panel lines
  fillRect(png, 64, 37, 1, 61, 0x35, 0x35, 0x3d, 255);
  fillRect(png, 26, 60, 76, 1, 0x35, 0x35, 0x3d, 255);
  fillRect(png, 26, 78, 76, 1, 0x35, 0x35, 0x3d, 255);

  // Smokestack
  fillRect(png, 86, 15, 6, 20, 0x48, 0x48, 0x50, 255);
  fillRect(png, 87, 16, 4, 18, 0x50, 0x50, 0x58, 255);

  // Indicator light on roof
  setPixel(png, 50, 31, 0x60, 0x80, 0xc0, 255);
  setPixel(png, 51, 31, 0x60, 0x80, 0xc0, 255);

  addNoise(png, rng, 4);
  savePNG(png, "struct_ore_processor.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Cargo Pod (128x128)
// ════════════════════════════════════════════════════════════════
function generateStructCargoPod() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1205);

  // Cylindrical pod body (top-down: elongated rounded shape)
  drawEllipse(png, 64, 64, 35, 25, 0x42, 0x44, 0x3e, 255);
  drawEllipse(png, 64, 64, 32, 22, 0x4a, 0x4c, 0x46, 255);

  // Top highlight
  drawEllipse(png, 64, 58, 28, 16, 0x52, 0x54, 0x4e, 200);

  // Hull panel lines (lengthwise)
  fillRect(png, 30, 64, 68, 1, 0x3a, 0x3c, 0x36, 255);
  for (let x = 38; x < 92; x += 12) {
    fillRect(png, x, 42, 1, 44, 0x3a, 0x3c, 0x36, 255);
  }

  // End caps
  drawEllipse(png, 32, 64, 4, 22, 0x3e, 0x40, 0x3a, 255);
  drawEllipse(png, 96, 64, 4, 22, 0x3e, 0x40, 0x3a, 255);

  // Attachment points
  for (const [ax, ay] of [[34, 48], [34, 80], [94, 48], [94, 80]]) {
    fillRect(png, ax - 2, ay - 2, 4, 4, 0x55, 0x57, 0x51, 255);
    setPixel(png, ax, ay, 0x65, 0x67, 0x61, 255);
  }

  // Access panel
  fillRect(png, 55, 52, 18, 10, 0x3c, 0x3e, 0x38, 255);
  fillRect(png, 56, 53, 16, 8, 0x44, 0x46, 0x40, 255);
  // Handle
  fillRect(png, 62, 55, 6, 2, 0x58, 0x5a, 0x54, 255);

  addNoise(png, rng, 5);
  savePNG(png, "struct_cargo_pod.png");
}

// ════════════════════════════════════════════════════════════════
// STRUCT: Beacon (128x128) — litStructure
// ════════════════════════════════════════════════════════════════
function generateStructBeacon() {
  const png = new PNG({ width: 128, height: 128 });
  const rng = new SeededRandom(1206);

  // Base tripod
  drawLine(png, 44, 110, 62, 60, 0x50, 0x50, 0x58, 255);
  drawLine(png, 45, 110, 63, 60, 0x50, 0x50, 0x58, 255);
  drawLine(png, 84, 110, 66, 60, 0x50, 0x50, 0x58, 255);
  drawLine(png, 83, 110, 65, 60, 0x50, 0x50, 0x58, 255);
  drawLine(png, 64, 115, 64, 60, 0x50, 0x50, 0x58, 255);
  drawLine(png, 63, 115, 63, 60, 0x50, 0x50, 0x58, 255);

  // Base plate
  fillRect(png, 40, 110, 48, 5, 0x45, 0x45, 0x4d, 255);

  // Mast
  fillRect(png, 62, 15, 4, 50, 0x58, 0x58, 0x60, 255);
  fillRect(png, 63, 15, 2, 50, 0x62, 0x62, 0x6a, 255);

  // Signal light assembly (large and bright for litStructure)
  drawEllipse(png, 64, 18, 8, 6, 0x3a, 0x3a, 0x42, 255);
  drawEllipse(png, 64, 18, 6, 4, 0xa0, 0xb4, 0xdc, 255);
  drawEllipse(png, 64, 17, 4, 3, 0xc0, 0xd4, 0xff, 255);
  // Bright center pixel
  setPixel(png, 64, 17, 0xff, 0xff, 0xff, 255);
  setPixel(png, 63, 17, 0xe0, 0xf0, 0xff, 255);
  setPixel(png, 65, 17, 0xe0, 0xf0, 0xff, 255);

  // Antenna arrays (small horizontal bars)
  for (let i = 0; i < 3; i++) {
    const ay = 24 + i * 8;
    fillRect(png, 54, ay, 20, 1, 0x50, 0x50, 0x58, 255);
    setPixel(png, 54, ay, 0x60, 0x60, 0x68, 255);
    setPixel(png, 73, ay, 0x60, 0x60, 0x68, 255);
  }

  // Cross brace
  fillRect(png, 48, 75, 32, 2, 0x48, 0x48, 0x50, 255);

  addNoise(png, rng, 5);
  savePNG(png, "struct_beacon.png");
}

// ════════════════════════════════════════════════════════════════
// PROP: Asteroid Chunk (64x64)
// ════════════════════════════════════════════════════════════════
function generatePropAsteroidChunk() {
  const png = new PNG({ width: 64, height: 64 });
  const rng = new SeededRandom(1207);

  // Irregular rocky shape - build from overlapping ellipses
  const shapes = [
    { cx: 32, cy: 32, rx: 14, ry: 12 },
    { cx: 28, cy: 28, rx: 10, ry: 8 },
    { cx: 36, cy: 34, rx: 12, ry: 10 },
    { cx: 30, cy: 36, rx: 8, ry: 9 },
  ];

  for (const s of shapes) {
    for (let dy = -s.ry; dy <= s.ry; dy++) {
      for (let dx = -s.rx; dx <= s.rx; dx++) {
        const dist = (dx * dx) / (s.rx * s.rx) + (dy * dy) / (s.ry * s.ry);
        if (dist <= 1.0) {
          const shade = lerp(0x18, 0x28, (dy + s.ry) / (2 * s.ry)) + rng.int(-4, 4);
          setPixel(png, s.cx + dx, s.cy + dy,
            clamp(shade, 10, 50),
            clamp(shade - 2, 10, 48),
            clamp(shade + 2, 12, 52), 255);
        }
      }
    }
  }

  // Edge highlights
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const [r, g, b, a] = getPixel(png, x, y);
      if (a > 0) {
        const above = y > 0 ? getPixel(png, x, y - 1)[3] : 0;
        if (above === 0) {
          setPixel(png, x, y, clamp(r + 12, 0, 255), clamp(g + 10, 0, 255), clamp(b + 14, 0, 255), a);
        }
      }
    }
  }

  // Mineral specks
  for (let i = 0; i < 5; i++) {
    const sx = rng.int(22, 42);
    const sy = rng.int(22, 42);
    const [, , , a] = getPixel(png, sx, sy);
    if (a > 0) {
      setPixel(png, sx, sy, 0x40, 0x3e, 0x48, 255);
    }
  }

  savePNG(png, "prop_asteroid_chunk.png");
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
function main() {
  console.log("Generating Level 11 (Colony) terrain assets...");
  generateHorizonColony();
  generateStructColonyTower();
  generateStructLandingPad();
  generateStructCommRelay();
  generateStructHabitat();
  generatePropCrate();
  generatePropAntenna();
  generatePropLightPost();

  console.log("\nGenerating Level 12 (Asteroid) terrain assets...");
  generateHorizonAsteroid();
  generateGroundRock();
  generateStructDrillRig();
  generateStructOreProcessor();
  generateStructCargoPod();
  generateStructBeacon();
  generatePropAsteroidChunk();

  console.log("\nAll 15 terrain assets generated successfully.");
}

main();
