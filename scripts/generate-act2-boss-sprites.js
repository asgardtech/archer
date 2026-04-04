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
  png.data[idx] = Math.round((r * srcA + png.data[idx] * dstA * (1 - srcA)) / outA);
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

// ═══════════════════════════════════════════════
// ACT 2 BOSS SPRITES
// Large, heavily detailed warships/entities
// Color schemes derived from ENEMY_PROJECTILE_SKINS
// ═══════════════════════════════════════════════

// boss_mothership — blue-grey fleet command carrier
// coreColor: #667799, fallbackColor: #334466
function generateBossMothership() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer command aura
  fillCircle(png, cx, cy, 58, 0x33, 0x44, 0x66, 18);
  fillCircle(png, cx, cy, 50, 0x44, 0x55, 0x77, 12);

  // Main hull — wide carrier body
  fillPolygon(png, [
    [cx - 22, cy - 48],
    [cx + 22, cy - 48],
    [cx + 50, cy - 26],
    [cx + 56, cy + 4],
    [cx + 44, cy + 32],
    [cx + 22, cy + 50],
    [cx - 22, cy + 50],
    [cx - 44, cy + 32],
    [cx - 56, cy + 4],
    [cx - 50, cy - 26],
  ], 0x44, 0x55, 0x77);

  // Inner hull plating
  fillPolygon(png, [
    [cx - 12, cy - 32],
    [cx + 12, cy - 32],
    [cx + 32, cy - 16],
    [cx + 36, cy + 4],
    [cx + 26, cy + 22],
    [cx + 12, cy + 34],
    [cx - 12, cy + 34],
    [cx - 26, cy + 22],
    [cx - 36, cy + 4],
    [cx - 32, cy - 16],
  ], 0x33, 0x44, 0x66);

  // Hull seam lines (armor plating divisions)
  drawLine(png, cx - 50, cy - 10, cx + 50, cy - 10, 0x22, 0x33, 0x55, 100, 2);
  drawLine(png, cx - 42, cy + 18, cx + 42, cy + 18, 0x22, 0x33, 0x55, 100, 1);
  drawLine(png, cx, cy - 44, cx, cy + 46, 0x22, 0x33, 0x55, 80, 1);

  // Fleet command tower (raised bridge section)
  fillRect(png, cx - 14, cy - 32, 28, 22, 0x55, 0x66, 0x88);
  fillRect(png, cx - 10, cy - 30, 20, 18, 0x44, 0x55, 0x77);
  // Bridge windows
  for (let i = 0; i < 3; i++) {
    fillRect(png, cx - 8 + i * 8, cy - 26, 5, 6, 0x88, 0xaa, 0xcc);
    fillRect(png, cx - 7 + i * 8, cy - 25, 3, 4, 0xaa, 0xcc, 0xee, 180);
  }

  // Drone bay doors (left and right — drone carrier theme)
  fillRect(png, cx - 60, cy - 4, 12, 18, 0x55, 0x66, 0x88);
  fillRect(png, cx + 48, cy - 4, 12, 18, 0x55, 0x66, 0x88);
  fillRect(png, cx - 58, cy - 2, 8, 14, 0x33, 0x44, 0x66);
  fillRect(png, cx + 50, cy - 2, 8, 14, 0x33, 0x44, 0x66);
  // Bay indicator glow
  fillCircle(png, cx - 54, cy + 5, 4, 0x66, 0x99, 0xcc, 200);
  fillCircle(png, cx + 54, cy + 5, 4, 0x66, 0x99, 0xcc, 200);

  // Side heavy gun batteries
  fillRect(png, cx - 58, cy - 18, 10, 8, 0x44, 0x55, 0x77);
  fillRect(png, cx + 48, cy - 18, 10, 8, 0x44, 0x55, 0x77);
  // Gun barrels
  drawLine(png, cx - 54, cy - 14, cx - 59, cy - 14, 0x66, 0x77, 0x99, 220, 2);
  drawLine(png, cx + 54, cy - 14, cx + 58, cy - 14, 0x66, 0x77, 0x99, 220, 2);

  // Command sensor array (center top)
  fillCircle(png, cx, cy - 20, 8, 0x33, 0x44, 0x66);
  fillCircle(png, cx, cy - 20, 5, 0x55, 0x77, 0x99);
  fillCircle(png, cx, cy - 20, 2, 0x88, 0xaa, 0xcc);

  // Engine exhausts at top
  fillEllipse(png, cx - 16, cy - 48, 9, 6, 0x44, 0x66, 0xaa, 200);
  fillEllipse(png, cx + 16, cy - 48, 9, 6, 0x44, 0x66, 0xaa, 200);
  fillEllipse(png, cx, cy - 50, 7, 5, 0x66, 0x88, 0xcc, 160);

  // Engine thrust ports (bottom)
  fillRect(png, cx - 24, cy + 38, 14, 12, 0xcc, 0x44, 0x22);
  fillRect(png, cx + 10, cy + 38, 14, 12, 0xcc, 0x44, 0x22);

  // Armor rivets
  for (const [rx, ry] of [
    [-38, -22], [38, -22], [-44, 0], [44, 0],
    [-34, 20], [34, 20], [-18, -38], [18, -38],
  ]) {
    fillCircle(png, cx + rx, cy + ry, 2, 0x55, 0x66, 0x88);
  }

  savePNG(png, "enemy_boss_mothership.png");
}

// boss_hydra — teal-grey multi-pod regenerating creature
// coreColor: #889999, fallbackColor: #556666
function generateBossHydra() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer bio-aura
  fillCircle(png, cx, cy, 56, 0x44, 0x66, 0x66, 18);

  // Central body core
  fillCircle(png, cx, cy, 28, 0x55, 0x77, 0x77);
  fillCircle(png, cx, cy, 20, 0x44, 0x66, 0x66);
  fillCircle(png, cx, cy, 12, 0x33, 0x55, 0x55);

  // Three attack pods arranged in a triangle pattern around the core
  // Pod positions (offset from center)
  const podPositions = [
    [0, -36],      // top
    [32, 20],      // bottom-right
    [-32, 20],     // bottom-left
  ];

  for (const [px, py] of podPositions) {
    // Connector neck
    drawLine(png, cx, cy, cx + px, cy + py, 0x44, 0x66, 0x66, 220, 6);
    // Pod body
    fillCircle(png, cx + px, cy + py, 14, 0x66, 0x88, 0x88);
    fillCircle(png, cx + px, cy + py, 10, 0x55, 0x77, 0x77);
    fillCircle(png, cx + px, cy + py, 6, 0x44, 0x66, 0x66);
    // Pod eye/weapon mount
    fillCircle(png, cx + px, cy + py, 3, 0x88, 0xbb, 0xbb);
    fillCircle(png, cx + px, cy + py, 1, 0xcc, 0xee, 0xee);
  }

  // Secondary stub pods (vulnerability phase markers — smaller)
  const stubPositions = [
    [18, -18], [-18, -18], [36, -10], [-36, -10], [0, 36],
  ];
  for (const [px, py] of stubPositions) {
    drawLine(png, cx, cy, cx + px * 0.7, cy + py * 0.7, 0x44, 0x66, 0x66, 160, 3);
    fillCircle(png, cx + px, cy + py, 6, 0x55, 0x77, 0x77, 200);
    fillCircle(png, cx + px, cy + py, 3, 0x77, 0x99, 0x99, 200);
  }

  // Central core glow
  fillCircle(png, cx, cy, 8, 0x55, 0x77, 0x77);
  fillCircle(png, cx, cy, 5, 0x77, 0x99, 0x99);
  fillCircle(png, cx, cy, 2, 0xaa, 0xcc, 0xcc);

  // Bio-energy filaments radiating from core
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    const ex = cx + Math.cos(angle) * 24;
    const ey = cy + Math.sin(angle) * 24;
    drawLine(png, cx, cy, ex, ey, 0x66, 0x99, 0x99, 60, 1);
  }

  savePNG(png, "enemy_boss_hydra.png");
}

// boss_shadow — very dark stealth commander
// coreColor: #55556a, fallbackColor: #2a2a3a
function generateBossShadow() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Dark cloaking field (subtle dark aura)
  fillCircle(png, cx, cy, 56, 0x18, 0x18, 0x22, 30);
  fillCircle(png, cx, cy, 46, 0x20, 0x20, 0x2e, 25);

  // Main hull — angular stealth shape (sharp edges, dark)
  fillPolygon(png, [
    [cx, cy - 50],      // nose (top)
    [cx + 36, cy - 22],
    [cx + 52, cy + 8],
    [cx + 40, cy + 36],
    [cx + 14, cy + 50],
    [cx - 14, cy + 50],
    [cx - 40, cy + 36],
    [cx - 52, cy + 8],
    [cx - 36, cy - 22],
  ], 0x2a, 0x2a, 0x3a);

  // Inner hull — slightly lighter for depth
  fillPolygon(png, [
    [cx, cy - 34],
    [cx + 22, cy - 12],
    [cx + 32, cy + 8],
    [cx + 24, cy + 26],
    [cx + 8, cy + 36],
    [cx - 8, cy + 36],
    [cx - 24, cy + 26],
    [cx - 32, cy + 8],
    [cx - 22, cy - 12],
  ], 0x33, 0x33, 0x44);

  // Stealth facet lines (angular hull geometry)
  drawLine(png, cx - 50, cy + 6, cx + 50, cy + 6, 0x44, 0x44, 0x55, 90, 1);
  drawLine(png, cx - 38, cy + 28, cx + 38, cy + 28, 0x44, 0x44, 0x55, 80, 1);
  drawLine(png, cx, cy - 46, cx - 50, cy + 8, 0x44, 0x44, 0x55, 70, 1);
  drawLine(png, cx, cy - 46, cx + 50, cy + 8, 0x44, 0x44, 0x55, 70, 1);

  // Cloak emitter nodes (glowing purple — standby state)
  const emitterPositions = [
    [0, -44], [46, 2], [34, 38], [-34, 38], [-46, 2],
  ];
  for (const [ex, ey] of emitterPositions) {
    fillCircle(png, cx + ex, cy + ey, 4, 0x44, 0x44, 0x55);
    fillCircle(png, cx + ex, cy + ey, 2, 0x66, 0x55, 0x88, 200);
  }

  // Cloaking field ring (barely visible)
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    setPixel(png, Math.round(cx + Math.cos(angle) * 48), Math.round(cy + Math.sin(angle) * 48), 0x55, 0x44, 0x77, 40);
  }

  // Dark sensor array (top — triangular hull nose)
  fillCircle(png, cx, cy - 26, 7, 0x2a, 0x2a, 0x3a);
  fillCircle(png, cx, cy - 26, 4, 0x44, 0x44, 0x55);
  fillCircle(png, cx, cy - 26, 2, 0x77, 0x66, 0x99);

  // Wing ambush weapons (side recesses)
  fillRect(png, cx - 56, cy + 2, 10, 7, 0x22, 0x22, 0x33);
  fillRect(png, cx + 46, cy + 2, 10, 7, 0x22, 0x22, 0x33);
  fillCircle(png, cx - 51, cy + 5, 3, 0x55, 0x44, 0x77, 180);
  fillCircle(png, cx + 51, cy + 5, 3, 0x55, 0x44, 0x77, 180);

  // Engine exhausts at top (dark, barely visible — stealthy)
  fillEllipse(png, cx - 14, cy - 48, 7, 5, 0x33, 0x33, 0x55, 160);
  fillEllipse(png, cx + 14, cy - 48, 7, 5, 0x33, 0x33, 0x55, 160);

  // Thrust ports at bottom
  fillRect(png, cx - 18, cy + 40, 12, 10, 0x44, 0x33, 0x22);
  fillRect(png, cx + 6, cy + 40, 12, 10, 0x44, 0x33, 0x22);

  savePNG(png, "enemy_boss_shadow.png");
}

// boss_behemoth — dark blue-grey heavily armored bruiser
// coreColor: #777788, fallbackColor: #444455
function generateBossBehemoth() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Massive outer shadow (heavy presence)
  fillCircle(png, cx, cy, 58, 0x33, 0x33, 0x44, 22);

  // Outer armor ring — thick plated hull
  const outerPoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i - Math.PI / 2;
    outerPoints.push([cx + 52 * Math.cos(angle), cy + 46 * Math.sin(angle)]);
  }
  fillPolygon(png, outerPoints, 0x44, 0x44, 0x55);

  // Mid armor ring
  const midPoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i - Math.PI / 2;
    midPoints.push([cx + 36 * Math.cos(angle), cy + 32 * Math.sin(angle)]);
  }
  fillPolygon(png, midPoints, 0x55, 0x55, 0x66);

  // Inner core hull
  const innerPoints = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i - Math.PI / 2;
    innerPoints.push([cx + 22 * Math.cos(angle), cy + 20 * Math.sin(angle)]);
  }
  fillPolygon(png, innerPoints, 0x44, 0x44, 0x55);

  // Heavy armor bolt details on outer ring faces
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 / 8) * i - Math.PI / 2;
    const bx = cx + 44 * Math.cos(angle);
    const by = cy + 38 * Math.sin(angle);
    fillCircle(png, bx, by, 3, 0x66, 0x66, 0x77);
    fillCircle(png, bx, by, 1, 0x88, 0x88, 0x99);
  }

  // Armor plate edge lines
  for (let i = 0; i < 8; i++) {
    const [x1, y1] = outerPoints[i];
    const [x2, y2] = outerPoints[(i + 1) % 8];
    drawLine(png, x1, y1, x2, y2, 0x55, 0x55, 0x66, 160, 2);
  }

  // Heavy cannon barrels (pointing down — primary weapon)
  fillRect(png, cx - 6, cy - 18, 12, 52, 0x55, 0x55, 0x66);
  fillRect(png, cx - 4, cy + 18, 8, 36, 0x44, 0x44, 0x55);
  // Barrel rings
  for (const ry of [cy + 20, cy + 32, cy + 44]) {
    fillRect(png, cx - 8, ry, 16, 3, 0x66, 0x66, 0x77);
  }

  // Shield projector nodes (left and right — shield mechanic)
  fillRect(png, cx - 56, cy - 8, 12, 10, 0x55, 0x55, 0x66);
  fillRect(png, cx + 44, cy - 8, 12, 10, 0x55, 0x55, 0x66);
  fillCircle(png, cx - 50, cy - 3, 5, 0x77, 0x88, 0xaa, 200);
  fillCircle(png, cx + 50, cy - 3, 5, 0x77, 0x88, 0xaa, 200);
  fillCircle(png, cx - 50, cy - 3, 2, 0xaa, 0xbb, 0xdd);
  fillCircle(png, cx + 50, cy - 3, 2, 0xaa, 0xbb, 0xdd);

  // Central targeting core
  fillCircle(png, cx, cy - 10, 8, 0x44, 0x44, 0x55);
  fillCircle(png, cx, cy - 10, 5, 0x66, 0x66, 0x77);
  fillCircle(png, cx, cy - 10, 2, 0x99, 0x99, 0xaa);

  // Engine exhausts (top)
  fillEllipse(png, cx - 18, cy - 46, 8, 6, 0x66, 0x66, 0x99, 200);
  fillEllipse(png, cx + 18, cy - 46, 8, 6, 0x66, 0x66, 0x99, 200);
  fillEllipse(png, cx, cy - 48, 6, 5, 0x88, 0x88, 0xbb, 160);

  // Exhaust thrust ports (bottom)
  fillRect(png, cx - 20, cy + 34, 14, 12, 0xcc, 0x44, 0x22);
  fillRect(png, cx + 6, cy + 34, 14, 12, 0xcc, 0x44, 0x22);

  savePNG(png, "enemy_boss_behemoth.png");
}

// boss_architect — cyan/teal charge-beam energy construct
// coreColor: #55bbbb, fallbackColor: #228888
function generateBossArchitect() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer energy field
  fillCircle(png, cx, cy, 58, 0x11, 0x77, 0x77, 18);
  fillCircle(png, cx, cy, 50, 0x22, 0x88, 0x88, 12);

  // Main hull — angular geometric construct
  fillPolygon(png, [
    [cx, cy - 50],
    [cx + 28, cy - 36],
    [cx + 50, cy - 10],
    [cx + 50, cy + 18],
    [cx + 28, cy + 44],
    [cx, cy + 52],
    [cx - 28, cy + 44],
    [cx - 50, cy + 18],
    [cx - 50, cy - 10],
    [cx - 28, cy - 36],
  ], 0x22, 0x66, 0x66);

  // Inner geometric panel
  fillPolygon(png, [
    [cx, cy - 32],
    [cx + 18, cy - 22],
    [cx + 32, cy - 6],
    [cx + 32, cy + 12],
    [cx + 18, cy + 28],
    [cx, cy + 34],
    [cx - 18, cy + 28],
    [cx - 32, cy + 12],
    [cx - 32, cy - 6],
    [cx - 18, cy - 22],
  ], 0x11, 0x55, 0x55);

  // Charge beam cannon (primary weapon — pointing down, long barrel)
  fillRect(png, cx - 8, cy - 28, 16, 72, 0x22, 0x77, 0x77);
  fillRect(png, cx - 5, cy + 20, 10, 36, 0x11, 0x66, 0x66);
  // Energy lens at barrel tip
  fillCircle(png, cx, cy + 48, 9, 0x22, 0xaa, 0xaa, 200);
  fillCircle(png, cx, cy + 48, 6, 0x44, 0xcc, 0xcc, 220);
  fillCircle(png, cx, cy + 48, 3, 0x88, 0xee, 0xee);
  // Barrel rings
  for (const ry of [cy + 22, cy + 34, cy + 46]) {
    fillRect(png, cx - 9, ry, 18, 3, 0x33, 0x88, 0x88);
  }

  // Fragment spawner nodes (architect theme — at corners)
  const nodePositions = [
    [-44, -6], [44, -6], [-30, 36], [30, 36],
  ];
  for (const [nx, ny] of nodePositions) {
    fillCircle(png, cx + nx, cy + ny, 7, 0x22, 0x77, 0x77);
    fillCircle(png, cx + nx, cy + ny, 4, 0x44, 0x99, 0x99);
    fillCircle(png, cx + nx, cy + ny, 2, 0x66, 0xcc, 0xcc);
  }

  // Energy grid lines across hull (architect's geometric design)
  drawLine(png, cx - 46, cy - 4, cx + 46, cy - 4, 0x33, 0x88, 0x88, 80, 1);
  drawLine(png, cx - 42, cy + 14, cx + 42, cy + 14, 0x33, 0x88, 0x88, 70, 1);
  drawLine(png, cx, cy - 46, cx, cy - 28, 0x33, 0x88, 0x88, 80, 1);

  // Central charge accumulator
  fillCircle(png, cx, cy - 14, 10, 0x11, 0x55, 0x55);
  fillCircle(png, cx, cy - 14, 7, 0x22, 0x88, 0x88);
  fillCircle(png, cx, cy - 14, 4, 0x55, 0xbb, 0xbb);
  fillCircle(png, cx, cy - 14, 2, 0x88, 0xee, 0xee);

  // Engine exhausts (top)
  fillEllipse(png, cx - 16, cy - 50, 8, 5, 0x22, 0xaa, 0xaa, 200);
  fillEllipse(png, cx + 16, cy - 50, 8, 5, 0x22, 0xaa, 0xaa, 200);
  fillEllipse(png, cx, cy - 52, 6, 4, 0x44, 0xcc, 0xcc, 160);

  // Armor rivets / data nodes
  for (const [rx, ry] of [
    [-36, -28], [36, -28], [-44, 6], [44, 6],
    [-28, 32], [28, 32],
  ]) {
    fillCircle(png, cx + rx, cy + ry, 2, 0x33, 0x88, 0x88);
    fillCircle(png, cx + rx, cy + ry, 1, 0x66, 0xbb, 0xbb);
  }

  savePNG(png, "enemy_boss_architect.png");
}

// boss_swarm_queen — green organic hive leader
// coreColor: #77aa66, fallbackColor: #447733
function generateBossSwarmQueen() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Hive bio-aura
  fillCircle(png, cx, cy, 56, 0x33, 0x55, 0x22, 20);
  fillCircle(png, cx, cy, 48, 0x44, 0x66, 0x33, 14);

  // Main carapace body — organic asymmetric shape
  fillPolygon(png, [
    [cx - 16, cy - 50],
    [cx + 16, cy - 50],
    [cx + 44, cy - 28],
    [cx + 54, cy + 4],
    [cx + 46, cy + 30],
    [cx + 24, cy + 52],
    [cx, cy + 56],
    [cx - 24, cy + 52],
    [cx - 46, cy + 30],
    [cx - 54, cy + 4],
    [cx - 44, cy - 28],
  ], 0x44, 0x66, 0x33);

  // Inner carapace shading
  fillPolygon(png, [
    [cx - 10, cy - 34],
    [cx + 10, cy - 34],
    [cx + 28, cy - 16],
    [cx + 36, cy + 4],
    [cx + 28, cy + 22],
    [cx + 14, cy + 36],
    [cx, cy + 40],
    [cx - 14, cy + 36],
    [cx - 28, cy + 22],
    [cx - 36, cy + 4],
    [cx - 28, cy - 16],
  ], 0x33, 0x55, 0x22);

  // Chitinous shell segments (organic carapace lines)
  drawLine(png, cx - 48, cy, cx + 48, cy, 0x33, 0x55, 0x22, 100, 2);
  drawLine(png, cx - 42, cy + 22, cx + 42, cy + 22, 0x33, 0x55, 0x22, 90, 2);
  drawLine(png, cx - 30, cy - 20, cx + 30, cy - 20, 0x33, 0x55, 0x22, 90, 1);
  // Radial carapace lines
  drawLine(png, cx, cy - 46, cx - 50, cy + 6, 0x33, 0x55, 0x22, 70, 1);
  drawLine(png, cx, cy - 46, cx + 50, cy + 6, 0x33, 0x55, 0x22, 70, 1);

  // Spawner pods (side ovipositors — swarm mechanic)
  // Left side
  fillPolygon(png, [
    [cx - 46, cy - 14],
    [cx - 59, cy - 6],
    [cx - 59, cy + 10],
    [cx - 50, cy + 18],
    [cx - 36, cy + 8],
  ], 0x55, 0x77, 0x44);
  fillCircle(png, cx - 53, cy + 2, 5, 0x44, 0x66, 0x33);
  fillCircle(png, cx - 53, cy + 2, 3, 0x77, 0xaa, 0x55, 200);
  // Right side
  fillPolygon(png, [
    [cx + 46, cy - 14],
    [cx + 59, cy - 6],
    [cx + 59, cy + 10],
    [cx + 50, cy + 18],
    [cx + 36, cy + 8],
  ], 0x55, 0x77, 0x44);
  fillCircle(png, cx + 53, cy + 2, 5, 0x44, 0x66, 0x33);
  fillCircle(png, cx + 53, cy + 2, 3, 0x77, 0xaa, 0x55, 200);

  // Antenna pair (top — sensing/communication)
  drawLine(png, cx - 10, cy - 48, cx - 20, cy - 56, 0x55, 0x77, 0x44, 200, 2);
  drawLine(png, cx + 10, cy - 48, cx + 20, cy - 56, 0x55, 0x77, 0x44, 200, 2);
  fillCircle(png, cx - 20, cy - 56, 3, 0x88, 0xcc, 0x55);
  fillCircle(png, cx + 20, cy - 56, 3, 0x88, 0xcc, 0x55);

  // Queen's compound eye (central sensor — 3 eye cluster)
  fillCircle(png, cx - 8, cy - 18, 6, 0x33, 0x55, 0x22);
  fillCircle(png, cx - 8, cy - 18, 4, 0x66, 0x99, 0x44);
  fillCircle(png, cx - 8, cy - 18, 2, 0xaa, 0xdd, 0x66);
  fillCircle(png, cx + 8, cy - 18, 6, 0x33, 0x55, 0x22);
  fillCircle(png, cx + 8, cy - 18, 4, 0x66, 0x99, 0x44);
  fillCircle(png, cx + 8, cy - 18, 2, 0xaa, 0xdd, 0x66);
  fillCircle(png, cx, cy - 10, 5, 0x33, 0x55, 0x22);
  fillCircle(png, cx, cy - 10, 3, 0x66, 0x99, 0x44);
  fillCircle(png, cx, cy - 10, 1, 0xaa, 0xdd, 0x66);

  // Mandible-like forelegs (weapon appendages at bottom)
  drawLine(png, cx - 20, cy + 44, cx - 34, cy + 54, 0x44, 0x66, 0x33, 220, 3);
  drawLine(png, cx + 20, cy + 44, cx + 34, cy + 54, 0x44, 0x66, 0x33, 220, 3);
  fillCircle(png, cx - 34, cy + 54, 4, 0x55, 0x77, 0x44);
  fillCircle(png, cx + 34, cy + 54, 4, 0x55, 0x77, 0x44);

  // Engine exhausts at top
  fillEllipse(png, cx - 14, cy - 50, 7, 5, 0x44, 0xaa, 0x44, 190);
  fillEllipse(png, cx + 14, cy - 50, 7, 5, 0x44, 0xaa, 0x44, 190);

  // Bio-luminescent spots on carapace
  for (const [rx, ry] of [
    [-30, -10], [30, -10], [-40, 10], [40, 10],
    [-24, 30], [24, 30], [0, -38],
  ]) {
    fillCircle(png, cx + rx, cy + ry, 2, 0x88, 0xcc, 0x55, 160);
  }

  savePNG(png, "enemy_boss_swarm_queen.png");
}

// ═══════════════════════════════════════════════
// Generate all Act 2 boss sprites
// ═══════════════════════════════════════════════

console.log("Generating Act 2 boss sprites...");
generateBossMothership();
generateBossHydra();
generateBossShadow();
generateBossBehemoth();
generateBossArchitect();
generateBossSwarmQueen();

console.log("Done! All 6 Act 2 boss sprites generated.");
