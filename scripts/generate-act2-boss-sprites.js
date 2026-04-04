const { PNG } = require("pngjs");
const fs = require("fs");
const path = require("path");

const SIZE = 128;
const ASSET_DIR = path.resolve(__dirname, "../public/assets/raptor");

function createPNG() {
  const png = new PNG({ width: SIZE, height: SIZE });
  for (let i = 0; i < png.data.length; i++) png.data[i] = 0;
  return png;
}

function setPixel(png, x, y, r, g, b, a) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const idx = (y * SIZE + x) * 4;
  const srcA = a / 255;
  const dstA = png.data[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  png.data[idx]     = Math.round((r * srcA + png.data[idx]     * dstA * (1 - srcA)) / outA);
  png.data[idx + 1] = Math.round((g * srcA + png.data[idx + 1] * dstA * (1 - srcA)) / outA);
  png.data[idx + 2] = Math.round((b * srcA + png.data[idx + 2] * dstA * (1 - srcA)) / outA);
  png.data[idx + 3] = Math.round(outA * 255);
}

function fillRect(png, x1, y1, w, h, r, g, b, a = 255) {
  const x0 = w < 0 ? x1 + w + 1 : x1;
  const y0 = h < 0 ? y1 + h + 1 : y1;
  const aw = Math.abs(w);
  const ah = Math.abs(h);
  for (let dy = 0; dy < ah; dy++) {
    for (let dx = 0; dx < aw; dx++) {
      setPixel(png, x0 + dx, y0 + dy, r, g, b, a);
    }
  }
}

function fillCircle(png, cx, cy, radius, r, g, b, a = 255) {
  const r2 = radius * radius;
  for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
    for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
      if (dx * dx + dy * dy <= r2) {
        setPixel(png, Math.round(cx + dx), Math.round(cy + dy), r, g, b, a);
      }
    }
  }
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

function drawArc(png, cx, cy, radius, startAngle, endAngle, r, g, b, a = 255, thickness = 1) {
  const steps = Math.ceil(radius * Math.abs(endAngle - startAngle) * 2);
  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (thickness <= 1) {
      setPixel(png, Math.round(px), Math.round(py), r, g, b, a);
    } else {
      fillCircle(png, px, py, thickness / 2, r, g, b, a);
    }
  }
}

function fillPolygon(png, points, r, g, b, a = 255) {
  let minY = SIZE, maxY = 0;
  for (const [, py] of points) {
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  minY = Math.max(0, Math.floor(minY));
  maxY = Math.min(SIZE - 1, Math.ceil(maxY));

  for (let y = minY; y <= maxY; y++) {
    const intersections = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        const xi = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
        intersections.push(xi);
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length - 1; i += 2) {
      for (let x = Math.ceil(intersections[i]); x <= Math.floor(intersections[i + 1]); x++) {
        setPixel(png, x, y, r, g, b, a);
      }
    }
  }
}

function savePNG(png, name) {
  const filePath = path.join(ASSET_DIR, name);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`  Created ${name} (${buffer.length} bytes)`);
}

// ═══════════════════════════════════════════════════════════
// Act 2 Boss: Mothership — dark steel-blue command vessel
// Colors: #334466 body, #4a5c7a detail, #2a3a55 bridge
// ═══════════════════════════════════════════════════════════
function generateBossMothership() {
  const png = createPNG();
  const cx = 64, cy = 64;
  // Proportional to in-game size 96×80 scaled into 128×128
  const hw = 50, hh = 42;

  // Outer glow
  fillCircle(png, cx, cy, hw * 1.3, 0x33, 0x44, 0x66, 30);

  // Main hull — 10-point polygon matching canvas render shape
  fillPolygon(png, [
    [cx - hw * 0.3, cy - hh],
    [cx + hw * 0.3, cy - hh],
    [cx + hw * 0.6, cy - hh * 0.6],
    [cx + hw,       cy - hh * 0.2],
    [cx + hw,       cy + hh * 0.5],
    [cx + hw * 0.5, cy + hh],
    [cx - hw * 0.5, cy + hh],
    [cx - hw,       cy + hh * 0.5],
    [cx - hw,       cy - hh * 0.2],
    [cx - hw * 0.6, cy - hh * 0.6],
  ], 0x33, 0x44, 0x66);

  // Hull edge highlight — outline via shifted lighter polygon
  drawLine(png, cx - hw * 0.3, cy - hh,        cx + hw * 0.3, cy - hh,        0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx + hw * 0.3, cy - hh,        cx + hw * 0.6, cy - hh * 0.6, 0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx + hw * 0.6, cy - hh * 0.6,  cx + hw,       cy - hh * 0.2, 0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx + hw,       cy - hh * 0.2,  cx + hw,       cy + hh * 0.5, 0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx + hw,       cy + hh * 0.5,  cx + hw * 0.5, cy + hh,        0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx + hw * 0.5, cy + hh,         cx - hw * 0.5, cy + hh,        0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx - hw * 0.5, cy + hh,         cx - hw,       cy + hh * 0.5, 0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx - hw,       cy + hh * 0.5,  cx - hw,       cy - hh * 0.2, 0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx - hw,       cy - hh * 0.2,  cx - hw * 0.6, cy - hh * 0.6, 0x4a, 0x5c, 0x7a, 200, 1);
  drawLine(png, cx - hw * 0.6, cy - hh * 0.6,  cx - hw * 0.3, cy - hh,        0x4a, 0x5c, 0x7a, 200, 1);

  // Bridge superstructure on top center
  fillRect(png,
    Math.round(cx - hw * 0.2), Math.round(cy - hh * 0.9),
    Math.round(hw * 0.4), Math.round(hh * 0.3),
    0x2a, 0x3a, 0x55);

  // Armor panel lines
  drawLine(png, cx - hw * 0.5, cy - hh * 0.3, cx + hw * 0.5, cy - hh * 0.3, 0x2a, 0x3a, 0x55, 160, 1);
  drawLine(png, cx - hw * 0.7, cy + hh * 0.1,  cx + hw * 0.7, cy + hh * 0.1,  0x2a, 0x3a, 0x55, 160, 1);
  drawLine(png, cx, cy - hh,    cx, cy + hh,    0x2a, 0x3a, 0x55, 100, 1);

  // Hangar bay ports on sides (lower)
  fillRect(png, Math.round(cx - hw * 0.85 - 2), Math.round(cy + hh * 0.1), 10, 12, 0x44, 0x55, 0x66);
  fillRect(png, Math.round(cx + hw * 0.85 - 8), Math.round(cy + hh * 0.1), 10, 12, 0x44, 0x55, 0x66);

  // Running lights — red at flanks
  fillCircle(png, Math.round(cx - hw * 0.9), Math.round(cy - hh * 0.1), 2, 0xff, 0x33, 0x33);
  fillCircle(png, Math.round(cx + hw * 0.9), Math.round(cy - hh * 0.1), 2, 0xff, 0x33, 0x33);
  fillCircle(png, Math.round(cx - hw * 0.7), Math.round(cy + hh * 0.4), 2, 0xff, 0x33, 0x33);
  fillCircle(png, Math.round(cx + hw * 0.7), Math.round(cy + hh * 0.4), 2, 0xff, 0x33, 0x33);

  // Central command dome
  fillCircle(png, cx, Math.round(cy - hh * 0.15), 7, 0x4a, 0x5c, 0x7a);
  fillCircle(png, cx, Math.round(cy - hh * 0.15), 4, 0x66, 0x77, 0x99);

  savePNG(png, "enemy_boss_mothership.png");
}

// ═══════════════════════════════════════════════════════════
// Act 2 Boss: Hydra — multi-pod teal-gray war machine
// Colors: #556666 core, #889999 detail, pods: red/blue/cyan
// ═══════════════════════════════════════════════════════════
function generateBossHydra() {
  const png = createPNG();
  const cx = 64, cy = 64;
  const hw = 46, hh = 38;

  // Outer glow
  fillCircle(png, cx, cy, hw * 1.2, 0x55, 0x66, 0x66, 30);

  // Central octagonal core
  const coreR = hw * 0.5;
  const corePoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i - Math.PI / 2;
    corePoints.push([cx + coreR * Math.cos(angle), cy + coreR * Math.sin(angle)]);
  }
  fillPolygon(png, corePoints, 0x55, 0x66, 0x66);

  // Core edge outline
  for (let i = 0; i < 8; i++) {
    const [x1, y1] = corePoints[i];
    const [x2, y2] = corePoints[(i + 1) % 8];
    drawLine(png, x1, y1, x2, y2, 0x77, 0x88, 0x88, 220, 1);
  }

  // Inner core detail ring
  fillCircle(png, cx, cy, hw * 0.28, 0x44, 0x55, 0x55);
  drawArc(png, cx, cy, hw * 0.35, 0, Math.PI * 2, 0x66, 0x77, 0x77, 180, 1);

  // 3 weapon pods arranged around core at 120° each
  // Pod 0: top (T) — cyan, at angle -90° from center, dist = hw*0.85
  // Pod 1: bottom-left (L) — red
  // Pod 2: bottom-right (R) — blue
  const podDist = hw * 0.85;
  const podAngles = [-Math.PI / 2, -Math.PI / 2 + (2 * Math.PI / 3), -Math.PI / 2 + (4 * Math.PI / 3)];
  const podColors = [
    [0x44, 0xcc, 0xcc],  // T — cyan
    [0xcc, 0x44, 0x44],  // L — red
    [0x44, 0x66, 0xcc],  // R — blue
  ];

  for (let i = 0; i < 3; i++) {
    const px = cx + podDist * Math.cos(podAngles[i]);
    const py = cy + podDist * Math.sin(podAngles[i]);
    const [pr, pg, pb] = podColors[i];

    // Connector arm from core to pod
    drawLine(png, cx, cy, px, py, 0x66, 0x77, 0x77, 180, 2);

    // Pod body
    fillCircle(png, px, py, 10, pr, pg, pb);

    // Pod ring
    drawArc(png, px, py, 11, 0, Math.PI * 2, 0xff, 0xff, 0xff, 150, 1);

    // Pod highlight
    fillCircle(png, px, py, 5, Math.min(255, pr + 60), Math.min(255, pg + 60), Math.min(255, pb + 60));
  }

  // Central core circle
  fillCircle(png, cx, cy, 5, 0x44, 0x55, 0x55);
  fillCircle(png, cx, cy, 3, 0x88, 0x99, 0x99);

  savePNG(png, "enemy_boss_hydra.png");
}

// ═══════════════════════════════════════════════════════════
// Act 2 Boss: Shadow Commander — dark stealth interceptor
// Colors: #2a2a3a body, #44445a detail, purple edge glow
// ═══════════════════════════════════════════════════════════
function generateBossShadow() {
  const png = createPNG();
  const cx = 64, cy = 64;
  const hw = 48, hh = 40;

  // Subtle dark glow
  fillCircle(png, cx, cy, hw * 1.1, 0x2a, 0x2a, 0x3a, 25);

  // Angular stealth hull — matching canvas render shape
  fillPolygon(png, [
    [cx,              cy + hh],
    [cx - hw * 0.3,   cy + hh * 0.3],
    [cx - hw,         cy - hh * 0.3],
    [cx - hw * 0.7,   cy - hh],
    [cx - hw * 0.15,  cy - hh * 0.6],
    [cx,              cy - hh * 0.8],
    [cx + hw * 0.15,  cy - hh * 0.6],
    [cx + hw * 0.7,   cy - hh],
    [cx + hw,         cy - hh * 0.3],
    [cx + hw * 0.3,   cy + hh * 0.3],
  ], 0x2a, 0x2a, 0x3a);

  // Purple edge glow — outline
  drawLine(png, cx,             cy + hh,       cx - hw * 0.3,  cy + hh * 0.3,  0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx - hw * 0.3,  cy + hh * 0.3, cx - hw,        cy - hh * 0.3,  0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx - hw,        cy - hh * 0.3, cx - hw * 0.7,  cy - hh,        0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx - hw * 0.7,  cy - hh,       cx - hw * 0.15, cy - hh * 0.6,  0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx - hw * 0.15, cy - hh * 0.6, cx,             cy - hh * 0.8,  0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx,             cy - hh * 0.8, cx + hw * 0.15, cy - hh * 0.6,  0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx + hw * 0.15, cy - hh * 0.6, cx + hw * 0.7,  cy - hh,        0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx + hw * 0.7,  cy - hh,       cx + hw,        cy - hh * 0.3,  0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx + hw,        cy - hh * 0.3, cx + hw * 0.3,  cy + hh * 0.3,  0x8c, 0x50, 0xc8, 150, 1);
  drawLine(png, cx + hw * 0.3,  cy + hh * 0.3, cx,             cy + hh,        0x8c, 0x50, 0xc8, 150, 1);

  // Cockpit panel detail
  fillPolygon(png, [
    [cx - hw * 0.12, cy - hh * 0.65],
    [cx + hw * 0.12, cy - hh * 0.65],
    [cx + hw * 0.07, cy - hh * 0.45],
    [cx - hw * 0.07, cy - hh * 0.45],
  ], 0x44, 0x44, 0x5a);

  // Wing panel lines — internal structure marks
  drawLine(png, cx - hw * 0.05, cy - hh * 0.4, cx - hw * 0.6, cy - hh * 0.9, 0x44, 0x44, 0x5a, 140, 1);
  drawLine(png, cx + hw * 0.05, cy - hh * 0.4, cx + hw * 0.6, cy - hh * 0.9, 0x44, 0x44, 0x5a, 140, 1);
  drawLine(png, cx - hw * 0.15, cy,              cx - hw * 0.85, cy - hh * 0.2, 0x44, 0x44, 0x5a, 120, 1);
  drawLine(png, cx + hw * 0.15, cy,              cx + hw * 0.85, cy - hh * 0.2, 0x44, 0x44, 0x5a, 120, 1);

  // Central core
  fillCircle(png, cx, Math.round(cy - hh * 0.1), 5, 0x44, 0x44, 0x5a);
  fillCircle(png, cx, Math.round(cy - hh * 0.1), 3, 0x88, 0x66, 0xcc);

  savePNG(png, "enemy_boss_shadow.png");
}

// ═══════════════════════════════════════════════════════════
// Act 2 Boss: Behemoth — armored heavy assault platform
// Colors: #444455 body, #555566 detail, blue shield emitters
// ═══════════════════════════════════════════════════════════
function generateBossBehemoth() {
  const png = createPNG();
  const cx = 64, cy = 64;
  const hw = 50, hh = 42;

  // Ambient glow
  fillCircle(png, cx, cy, hw * 1.2, 0x44, 0x44, 0x55, 25);

  // Main hull — thick rectangle
  fillRect(png, cx - hw, cy - hh, hw * 2, hh * 2, 0x44, 0x44, 0x55);

  // Armor plate rows
  fillRect(png, Math.round(cx - hw * 0.9), Math.round(cy - hh * 0.7), Math.round(hw * 1.8), Math.round(hh * 0.28), 0x3a, 0x3a, 0x4a);
  fillRect(png, Math.round(cx - hw * 0.8), Math.round(cy + hh * 0.2), Math.round(hw * 1.6), Math.round(hh * 0.28), 0x3a, 0x3a, 0x4a);

  // Hull outline
  drawLine(png, cx - hw, cy - hh, cx + hw, cy - hh, 0x55, 0x55, 0x66, 200, 1);
  drawLine(png, cx + hw, cy - hh, cx + hw, cy + hh, 0x55, 0x55, 0x66, 200, 1);
  drawLine(png, cx + hw, cy + hh, cx - hw, cy + hh, 0x55, 0x55, 0x66, 200, 1);
  drawLine(png, cx - hw, cy + hh, cx - hw, cy - hh, 0x55, 0x55, 0x66, 200, 1);

  // Side reinforcement struts
  drawLine(png, cx - hw, cy - hh * 0.5, cx - hw * 0.6, cy - hh * 0.5, 0x55, 0x55, 0x66, 180, 2);
  drawLine(png, cx + hw, cy - hh * 0.5, cx + hw * 0.6, cy - hh * 0.5, 0x55, 0x55, 0x66, 180, 2);
  drawLine(png, cx - hw, cy + hh * 0.1,  cx - hw * 0.6, cy + hh * 0.1,  0x55, 0x55, 0x66, 180, 2);
  drawLine(png, cx + hw, cy + hh * 0.1,  cx + hw * 0.6, cy + hh * 0.1,  0x55, 0x55, 0x66, 180, 2);

  // Front cannon mounts
  fillRect(png, Math.round(cx - hw * 0.4), Math.round(cy - hh - 4), 8, 5, 0x55, 0x55, 0x66);
  fillRect(png, Math.round(cx + hw * 0.4 - 8), Math.round(cy - hh - 4), 8, 5, 0x55, 0x55, 0x66);
  fillRect(png, Math.round(cx - hw * 0.08), Math.round(cy - hh - 6), 8, 7, 0x66, 0x66, 0x77);

  // Shield emitter nodes on bottom edge
  fillRect(png, Math.round(cx - hw * 0.7),     Math.round(cy + hh - 4), 5, 5, 0x33, 0x44, 0x55);
  fillRect(png, Math.round(cx - hw * 0.3),     Math.round(cy + hh - 4), 5, 5, 0x33, 0x44, 0x55);
  fillRect(png, Math.round(cx + hw * 0.3 - 5), Math.round(cy + hh - 4), 5, 5, 0x33, 0x44, 0x55);
  fillRect(png, Math.round(cx + hw * 0.7 - 5), Math.round(cy + hh - 4), 5, 5, 0x33, 0x44, 0x55);

  // Emitter glow highlight
  fillCircle(png, Math.round(cx - hw * 0.67), Math.round(cy + hh - 2), 3, 0x66, 0xcc, 0xff, 180);
  fillCircle(png, Math.round(cx - hw * 0.27), Math.round(cy + hh - 2), 3, 0x66, 0xcc, 0xff, 180);
  fillCircle(png, Math.round(cx + hw * 0.27), Math.round(cy + hh - 2), 3, 0x66, 0xcc, 0xff, 180);
  fillCircle(png, Math.round(cx + hw * 0.67), Math.round(cy + hh - 2), 3, 0x66, 0xcc, 0xff, 180);

  // Central core
  fillCircle(png, cx, cy, 7, 0x55, 0x55, 0x66);
  fillCircle(png, cx, cy, 4, 0x77, 0x77, 0x88);

  savePNG(png, "enemy_boss_behemoth.png");
}

// ═══════════════════════════════════════════════════════════
// Act 2 Boss: Architect — rotating teal diamond construct
// Colors: #228888 core, #55bbbb highlight, teal fragments
// ═══════════════════════════════════════════════════════════
function generateBossArchitect() {
  const png = createPNG();
  const cx = 64, cy = 64;
  const hw = 48, hh = 46;

  // Outer energy aura
  fillCircle(png, cx, cy, hw * 1.3, 0x22, 0x88, 0x88, 28);

  // Inner teal glow ring
  drawArc(png, cx, cy, hw * 0.85, 0, Math.PI * 2, 0x33, 0xaa, 0x9a, 80, 2);
  drawArc(png, cx, cy, hw * 0.75, 0, Math.PI * 2, 0x33, 0xaa, 0x9a, 50, 1);

  // Core diamond (shown at 0° rotation, fitting the static sprite)
  const coreSize = hw * 0.45;
  fillPolygon(png, [
    [cx,             cy - coreSize],
    [cx + coreSize,  cy],
    [cx,             cy + coreSize],
    [cx - coreSize,  cy],
  ], 0x22, 0x88, 0x88);

  // Diamond edge outline (white)
  drawLine(png, cx,            cy - coreSize, cx + coreSize, cy,            0xff, 0xff, 0xff, 180, 1);
  drawLine(png, cx + coreSize, cy,            cx,            cy + coreSize, 0xff, 0xff, 0xff, 180, 1);
  drawLine(png, cx,            cy + coreSize, cx - coreSize, cy,            0xff, 0xff, 0xff, 180, 1);
  drawLine(png, cx - coreSize, cy,            cx,            cy - coreSize, 0xff, 0xff, 0xff, 180, 1);

  // Diamond inner highlight
  const innerSize = hw * 0.25;
  fillPolygon(png, [
    [cx,            cy - innerSize],
    [cx + innerSize, cy],
    [cx,            cy + innerSize],
    [cx - innerSize, cy],
  ], 0x33, 0xaa, 0xaa, 160);

  // 4 orbital fragment triangles at 45° offsets from core
  const fragAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const fragDist = hw * 0.78;
  for (const angle of fragAngles) {
    const fx = cx + Math.cos(angle) * fragDist;
    const fy = cy + Math.sin(angle) * fragDist;
    // Triangle pointing inward toward core
    const facing = angle + Math.PI; // point tip toward center
    fillPolygon(png, [
      [fx + Math.cos(facing) * 8,                fy + Math.sin(facing) * 8],
      [fx + Math.cos(facing + 2.2) * 6,           fy + Math.sin(facing + 2.2) * 6],
      [fx + Math.cos(facing - 2.2) * 6,           fy + Math.sin(facing - 2.2) * 6],
    ], 0x33, 0xaa, 0xaa);
    fillCircle(png, fx, fy, 5, 0x33, 0xaa, 0xaa);
    fillCircle(png, fx, fy, 2, 0x88, 0xdd, 0xdd);
  }

  // 4 connector lines from core to fragments
  for (const angle of fragAngles) {
    const fx = cx + Math.cos(angle) * fragDist;
    const fy = cy + Math.sin(angle) * fragDist;
    drawLine(png, cx, cy, fx, fy, 0x33, 0xaa, 0x9a, 100, 1);
  }

  // Central core
  fillCircle(png, cx, cy, 5, 0x44, 0xbb, 0xbb);
  fillCircle(png, cx, cy, 3, 0x88, 0xdd, 0xdd);

  savePNG(png, "enemy_boss_architect.png");
}

// ═══════════════════════════════════════════════════════════
// Act 2 Boss: Swarm Queen — organic bio-ship commander
// Colors: #447733 wings, #558844 edge, #335522 core, bio spots
// ═══════════════════════════════════════════════════════════
function generateBossSwarmQueen() {
  const png = createPNG();
  const cx = 64, cy = 64;
  const hw = 48, hh = 40;

  // Organic ambient glow
  fillCircle(png, cx, cy, hw * 1.2, 0x44, 0x77, 0x33, 30);

  // Wing body — approximated as 2 large organic wing shapes + center
  // Left wing
  fillPolygon(png, [
    [cx,             cy - hh * 0.6],
    [cx - hw * 0.3,  cy - hh],
    [cx - hw,        cy - hh * 0.3],
    [cx - hw * 0.9,  cy + hh * 0.1],
    [cx - hw * 0.6,  cy + hh * 0.5],
    [cx - hw * 0.3,  cy + hh * 0.8],
    [cx,             cy + hh * 0.7],
  ], 0x44, 0x77, 0x33);

  // Right wing (mirror)
  fillPolygon(png, [
    [cx,             cy - hh * 0.6],
    [cx + hw * 0.3,  cy - hh],
    [cx + hw,        cy - hh * 0.3],
    [cx + hw * 0.9,  cy + hh * 0.1],
    [cx + hw * 0.6,  cy + hh * 0.5],
    [cx + hw * 0.3,  cy + hh * 0.8],
    [cx,             cy + hh * 0.7],
  ], 0x44, 0x77, 0x33);

  // Organic edge lines (darker green outline)
  drawLine(png, cx,            cy - hh * 0.6, cx - hw * 0.3, cy - hh,        0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx - hw * 0.3, cy - hh,       cx - hw,       cy - hh * 0.3,  0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx - hw,       cy - hh * 0.3, cx - hw * 0.9, cy + hh * 0.1,  0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx - hw * 0.9, cy + hh * 0.1, cx - hw * 0.6, cy + hh * 0.5,  0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx - hw * 0.6, cy + hh * 0.5, cx,            cy + hh * 0.7,  0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx,            cy - hh * 0.6, cx + hw * 0.3, cy - hh,        0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx + hw * 0.3, cy - hh,       cx + hw,       cy - hh * 0.3,  0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx + hw,       cy - hh * 0.3, cx + hw * 0.9, cy + hh * 0.1,  0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx + hw * 0.9, cy + hh * 0.1, cx + hw * 0.6, cy + hh * 0.5,  0x55, 0x88, 0x44, 180, 1);
  drawLine(png, cx + hw * 0.6, cy + hh * 0.5, cx,            cy + hh * 0.7,  0x55, 0x88, 0x44, 180, 1);

  // Wing vein details
  drawLine(png, cx - hw * 0.1, cy - hh * 0.3, cx - hw * 0.8, cy - hh * 0.15, 0x33, 0x55, 0x22, 130, 1);
  drawLine(png, cx + hw * 0.1, cy - hh * 0.3, cx + hw * 0.8, cy - hh * 0.15, 0x33, 0x55, 0x22, 130, 1);
  drawLine(png, cx - hw * 0.1, cy + hh * 0.1, cx - hw * 0.7, cy + hh * 0.35, 0x33, 0x55, 0x22, 130, 1);
  drawLine(png, cx + hw * 0.1, cy + hh * 0.1, cx + hw * 0.7, cy + hh * 0.35, 0x33, 0x55, 0x22, 130, 1);

  // Central body ellipse (inner abdomen)
  fillEllipse(png, cx, cy, Math.round(hw * 0.3), Math.round(hh * 0.4), 0x50, 0x96, 0x32);
  fillEllipse(png, cx, cy, Math.round(hw * 0.18), Math.round(hh * 0.25), 0x44, 0x77, 0x33);

  // Bioluminescent spots — 5 evenly around body
  const spotAngles = [0, Math.PI * 0.4, Math.PI * 0.8, Math.PI * 1.2, Math.PI * 1.6];
  for (const angle of spotAngles) {
    const spotDist = hw * 0.5;
    const sx = cx + Math.cos(angle) * spotDist;
    const sy = cy + Math.sin(angle) * spotDist * 0.75;
    fillCircle(png, Math.round(sx), Math.round(sy), 3, 0x96, 0xff, 0x50, 180);
    fillCircle(png, Math.round(sx), Math.round(sy), 1, 0xcc, 0xff, 0x88, 220);
  }

  // Central core
  fillCircle(png, cx, cy, 5, 0x33, 0x55, 0x22);
  fillCircle(png, cx, cy, 3, 0x66, 0xaa, 0x44);

  savePNG(png, "enemy_boss_swarm_queen.png");
}

// ═══════════════════════════════════════════════════════════
// Generate all 6 Act 2 boss sprites
// ═══════════════════════════════════════════════════════════

console.log("Generating Act 2 boss sprites...");
generateBossMothership();
generateBossHydra();
generateBossShadow();
generateBossBehemoth();
generateBossArchitect();
generateBossSwarmQueen();
console.log("Done! All 6 Act 2 boss sprites generated.");
