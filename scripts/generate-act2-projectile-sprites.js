/**
 * Generate Act 2 enemy projectile sprite variants for weapon diversity.
 *
 * Produces colored bullet/missile/chain/scatter/shockwave sprites that are
 * used by Dominion-faction enemies in levels 11–20 to visually distinguish
 * their projectile types from Act 1 (Vektran) projectiles.
 *
 * Run with: node scripts/generate-act2-projectile-sprites.js
 */

const { PNG } = require("pngjs");
const fs = require("fs");
const path = require("path");

const ASSET_DIR = path.resolve(__dirname, "../public/assets/raptor");

// ─── Low-level PNG helpers ────────────────────────────────────────────────────

function createPNG(w, h) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < png.data.length; i++) png.data[i] = 0;
  return png;
}

function setPixel(png, x, y, r, g, b, a) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (y * png.width + x) * 4;
  const srcA = a / 255;
  const dstA = png.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  png.data[idx]     = Math.round((r * srcA + png.data[idx]     * dstA * (1 - srcA)) / outA);
  png.data[idx + 1] = Math.round((g * srcA + png.data[idx + 1] * dstA * (1 - srcA)) / outA);
  png.data[idx + 2] = Math.round((b * srcA + png.data[idx + 2] * dstA * (1 - srcA)) / outA);
  png.data[idx + 3] = Math.round(outA * 255);
}

function fillEllipse(png, cx, cy, rx, ry, r, g, b, a = 255) {
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        setPixel(png, Math.round(cx + dx), Math.round(cy + dy), r, g, b, a);
      }
    }
  }
}

function fillCircle(png, cx, cy, radius, r, g, b, a = 255) {
  fillEllipse(png, cx, cy, radius, radius, r, g, b, a);
}

function drawLine(png, x0, y0, x1, y1, r, g, b, a = 255, thickness = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    if (thickness <= 1) {
      setPixel(png, Math.round(px), Math.round(py), r, g, b, a);
    } else {
      fillCircle(png, px, py, thickness / 2, r, g, b, a);
    }
  }
}

function savePNG(png, name) {
  const filePath = path.join(ASSET_DIR, name);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`  Created ${name} (${buffer.length} bytes)`);
}

// ─── Bullet helpers ───────────────────────────────────────────────────────────

/**
 * Draw an elongated oval bullet (32×32) with a bright core and soft glow.
 * The bullet travels downward so it's taller than wide.
 * @param {number[]} core   [r,g,b] bright inner pixel
 * @param {number[]} mid    [r,g,b] main body
 * @param {number[]} outer  [r,g,b] glow
 */
function makeBullet(core, mid, outer) {
  const SIZE = 32;
  const png  = createPNG(SIZE, SIZE);
  const cx = SIZE / 2, cy = SIZE / 2;

  // Outer glow (wide, semi-transparent ellipse)
  fillEllipse(png, cx, cy, 8, 14, ...outer, 50);
  fillEllipse(png, cx, cy, 6, 11, ...outer, 90);

  // Main body
  fillEllipse(png, cx, cy, 4, 9, ...mid, 220);

  // Bright core streak
  fillEllipse(png, cx, cy, 2, 6, ...core, 255);
  fillEllipse(png, cx, cy, 1, 3, 255, 255, 255, 200);

  return png;
}

/**
 * Draw a smaller spread-shot bullet (32×32) — wider, shorter oval.
 */
function makeSpreadBullet(core, mid, outer) {
  const SIZE = 32;
  const png  = createPNG(SIZE, SIZE);
  const cx = SIZE / 2, cy = SIZE / 2;

  fillEllipse(png, cx, cy, 9, 6, ...outer, 50);
  fillEllipse(png, cx, cy, 7, 4, ...outer, 90);
  fillEllipse(png, cx, cy, 5, 3, ...mid, 220);
  fillEllipse(png, cx, cy, 3, 1.5, ...core, 255);
  fillEllipse(png, cx, cy, 1.5, 1, 255, 255, 255, 200);

  return png;
}

/**
 * Draw a missile (64×64) with body, fins, and thruster glow.
 */
function makeMissile(core, body, fin, thruster) {
  const SIZE = 64;
  const png  = createPNG(SIZE, SIZE);
  const cx = SIZE / 2, cy = SIZE / 2;

  // Thruster bloom at bottom
  fillEllipse(png, cx, cy + 22, 7, 5, ...thruster, 60);
  fillEllipse(png, cx, cy + 20, 5, 4, ...thruster, 120);
  fillCircle(png,  cx, cy + 18, 3.5, 255, 240, 180, 200);

  // Body — tall slim rectangle with ellipse caps
  fillEllipse(png, cx, cy, 5, 18, ...body, 240);
  fillEllipse(png, cx, cy, 3, 14, ...core, 255);

  // Nose tip
  fillEllipse(png, cx, cy - 18, 3, 5, ...core, 240);
  fillEllipse(png, cx, cy - 22, 1.5, 3, 255, 255, 255, 200);

  // Fins (two diagonal strokes)
  drawLine(png, cx - 3, cy + 8, cx - 10, cy + 18, ...fin, 200, 2);
  drawLine(png, cx + 3, cy + 8, cx + 10, cy + 18, ...fin, 200, 2);

  // Hull sheen
  fillEllipse(png, cx - 1, cy - 4, 1.5, 8, 255, 255, 255, 60);

  return png;
}

// ─── Individual sprite generators ────────────────────────────────────────────

// — Standard colored bullets (32×32) —

function generateBulletEnemyGreen() {
  const png = makeBullet(
    [180, 255, 160],  // core: bright lime
    [80,  200, 60],   // mid: vivid green
    [40,  160, 30],   // outer glow
  );
  savePNG(png, "bullet_enemy_green.png");
}

function generateBulletEnemyPurple() {
  const png = makeBullet(
    [220, 160, 255],  // core: bright lavender
    [150, 60,  230],  // mid: vivid purple
    [100, 30,  180],  // outer glow
  );
  savePNG(png, "bullet_enemy_purple.png");
}

function generateBulletEnemyOrange() {
  const png = makeBullet(
    [255, 230, 140],  // core: bright yellow-orange
    [255, 140, 30],   // mid: vivid orange
    [200, 90,  10],   // outer glow
  );
  savePNG(png, "bullet_enemy_orange.png");
}

function generateBulletEnemyBlue() {
  const png = makeBullet(
    [180, 220, 255],  // core: bright sky
    [50,  140, 240],  // mid: vivid blue
    [20,  80,  200],  // outer glow
  );
  savePNG(png, "bullet_enemy_blue.png");
}

// — Spread shot colored variants (32×32) —

function generateBulletSpreadOrange() {
  const png = makeSpreadBullet(
    [255, 230, 140],
    [255, 140, 30],
    [200, 90,  10],
  );
  savePNG(png, "bullet_spread_orange.png");
}

function generateBulletSpreadBlue() {
  const png = makeSpreadBullet(
    [180, 220, 255],
    [50,  140, 240],
    [20,  80,  200],
  );
  savePNG(png, "bullet_spread_blue.png");
}

// — Colored missiles (64×64) —

function generateMissileEnemyBlue() {
  const png = makeMissile(
    [180, 220, 255],  // core
    [50,  140, 240],  // body
    [20,  60,  180],  // fins
    [80,  180, 255],  // thruster
  );
  savePNG(png, "missile_enemy_blue.png");
}

function generateMissileEnemyMagenta() {
  const png = makeMissile(
    [255, 190, 255],  // core
    [220, 60,  200],  // body
    [160, 20,  160],  // fins
    [255, 100, 220],  // thruster
  );
  savePNG(png, "missile_enemy_magenta.png");
}

// — Weapon-type specific sprites —

/**
 * Chain bolt (32×32): jagged electric bolt shape, cyan-blue.
 */
function generateBulletEnemyChain() {
  const SIZE = 32;
  const png  = createPNG(SIZE, SIZE);
  const cx = SIZE / 2, cy = SIZE / 2;

  // Soft outer glow
  fillEllipse(png, cx, cy, 8, 13, 60, 180, 255, 40);
  fillEllipse(png, cx, cy, 6, 10, 80, 200, 255, 70);

  // Zigzag bolt body — draw a jagged vertical line
  const segments = [
    [cx,     cy - 12],
    [cx + 4, cy - 6],
    [cx - 3, cy],
    [cx + 4, cy + 6],
    [cx,     cy + 12],
  ];
  for (let i = 0; i < segments.length - 1; i++) {
    const [x0, y0] = segments[i];
    const [x1, y1] = segments[i + 1];
    drawLine(png, x0, y0, x1, y1, 140, 220, 255, 255, 2);
  }

  // Bright secondary pass (thinner, lighter)
  for (let i = 0; i < segments.length - 1; i++) {
    const [x0, y0] = segments[i];
    const [x1, y1] = segments[i + 1];
    drawLine(png, x0, y0, x1, y1, 220, 240, 255, 200, 1);
  }

  // Node dots at each kink for a "chained" look
  for (const [x, y] of segments) {
    fillCircle(png, x, y, 2, 180, 230, 255, 240);
    fillCircle(png, x, y, 1, 255, 255, 255, 200);
  }

  savePNG(png, "bullet_enemy_chain.png");
}

/**
 * Scatter pellet (32×32): small, round, hot-orange.
 */
function generateBulletEnemyScatter() {
  const SIZE = 32;
  const png  = createPNG(SIZE, SIZE);
  const cx = SIZE / 2, cy = SIZE / 2;

  // Wide glow
  fillCircle(png, cx, cy, 9,   255, 140, 40,  40);
  fillCircle(png, cx, cy, 6.5, 255, 160, 60,  90);
  // Main pellet
  fillCircle(png, cx, cy, 4.5, 255, 120, 20, 220);
  // Core
  fillCircle(png, cx, cy, 2.5, 255, 200, 100, 255);
  fillCircle(png, cx, cy, 1,   255, 255, 200, 220);

  savePNG(png, "bullet_enemy_scatter.png");
}

/**
 * Shockwave sprite (64×64): expanding ring for EnemyShockwave rendering.
 * The ring is drawn at ~75% radius so the sprite can be scaled by the engine.
 */
function generateShockwaveEnemy() {
  const SIZE = 64;
  const png  = createPNG(SIZE, SIZE);
  const cx = SIZE / 2, cy = SIZE / 2;
  const ringR = 24;
  const ringW = 5;

  // Outer diffuse glow ring
  for (let angle = 0; angle < Math.PI * 2; angle += 0.008) {
    for (let dr = -ringW - 3; dr <= ringW + 3; dr++) {
      const r = ringR + dr;
      if (r < 0) continue;
      const falloff = 1 - Math.abs(dr) / (ringW + 3);
      const a = Math.round(60 * falloff * falloff);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      setPixel(png, Math.round(x), Math.round(y), 255, 180, 60, a);
    }
  }

  // Main ring band
  for (let angle = 0; angle < Math.PI * 2; angle += 0.006) {
    for (let dr = -ringW; dr <= ringW; dr++) {
      const r = ringR + dr;
      if (r < 0) continue;
      const falloff = 1 - Math.abs(dr) / (ringW + 1);
      const a = Math.round(180 * falloff * falloff);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      setPixel(png, Math.round(x), Math.round(y), 255, 200, 80, a);
    }
  }

  // Bright inner edge
  for (let angle = 0; angle < Math.PI * 2; angle += 0.005) {
    const x = cx + Math.cos(angle) * (ringR - ringW + 1);
    const y = cy + Math.sin(angle) * (ringR - ringW + 1);
    setPixel(png, Math.round(x), Math.round(y), 255, 240, 180, 220);
  }

  // Small radial sparks emanating outward
  const sparkAngles = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5];
  for (const angle of sparkAngles) {
    const innerX = cx + Math.cos(angle) * (ringR + ringW);
    const innerY = cy + Math.sin(angle) * (ringR + ringW);
    const outerX = cx + Math.cos(angle) * (ringR + ringW + 6);
    const outerY = cy + Math.sin(angle) * (ringR + ringW + 6);
    drawLine(png, innerX, innerY, outerX, outerY, 255, 230, 120, 180, 1);
  }

  savePNG(png, "shockwave_enemy.png");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

console.log("Generating Act 2 enemy projectile sprites...");

generateBulletEnemyGreen();
generateBulletEnemyPurple();
generateBulletEnemyOrange();
generateBulletEnemyBlue();

generateBulletSpreadOrange();
generateBulletSpreadBlue();

generateMissileEnemyBlue();
generateMissileEnemyMagenta();

generateBulletEnemyChain();
generateBulletEnemyScatter();
generateShockwaveEnemy();

console.log("Done.");
