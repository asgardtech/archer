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
// LIGHT ENEMIES (Act 2) — 1 HP, small ships
// ═══════════════════════════════════════════════

function generateWasp() {
  const png = createPNG();
  const cx = 64, cy = 64;
  const s = 2.2;

  // Main triangular body (points downward — facing down like enemies do)
  fillPolygon(png, [
    [cx, cy + 28 * s / 2],
    [cx - 26 * s / 2, cy - 26 * s / 2],
    [cx + 26 * s / 2, cy - 26 * s / 2],
  ], 0xaa, 0xcc, 0x22);

  // Darker inner triangle
  fillPolygon(png, [
    [cx, cy + 18 * s / 2],
    [cx - 14 * s / 2, cy - 14 * s / 2],
    [cx + 14 * s / 2, cy - 14 * s / 2],
  ], 0x88, 0xaa, 0x11);

  // Wing spars (angled lines)
  drawLine(png, cx - 10, cy - 3, cx - 30, cy - 20, 0x88, 0xaa, 0x11, 255, 3);
  drawLine(png, cx + 10, cy - 3, cx + 30, cy - 20, 0x88, 0xaa, 0x11, 255, 3);

  // Wing tip accents
  fillCircle(png, cx - 30, cy - 20, 3, 0xcc, 0xee, 0x44);
  fillCircle(png, cx + 30, cy - 20, 3, 0xcc, 0xee, 0x44);

  // Cockpit glow
  fillCircle(png, cx, cy, 5, 0xcc, 0xee, 0x44);
  fillCircle(png, cx, cy, 3, 0xdd, 0xff, 0x66);

  // Engine glow at tail
  fillEllipse(png, cx, cy + 26, 6, 3, 0xff, 0xcc, 0x22, 180);

  // Hull panel lines
  drawLine(png, cx, cy - 22, cx, cy + 20, 0x77, 0x99, 0x11, 120, 1);

  savePNG(png, "enemy_wasp.png");
}

function generatePhantom() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Diamond body
  fillPolygon(png, [
    [cx, cy - 30],
    [cx + 28, cy],
    [cx, cy + 30],
    [cx - 28, cy],
  ], 0x77, 0x44, 0xdd);

  // Inner diamond highlight
  fillPolygon(png, [
    [cx, cy - 18],
    [cx + 16, cy],
    [cx, cy + 18],
    [cx - 16, cy],
  ], 0x88, 0x55, 0xee, 180);

  // Pulsing energy ring (static representation)
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    const rx = cx + Math.cos(angle) * 24;
    const ry = cy + Math.sin(angle) * 24;
    setPixel(png, Math.round(rx), Math.round(ry), 0xaa, 0x78, 0xff, 140);
    setPixel(png, Math.round(rx + 1), Math.round(ry), 0xaa, 0x78, 0xff, 80);
    setPixel(png, Math.round(rx - 1), Math.round(ry), 0xaa, 0x78, 0xff, 80);
    setPixel(png, Math.round(rx), Math.round(ry + 1), 0xaa, 0x78, 0xff, 80);
    setPixel(png, Math.round(rx), Math.round(ry - 1), 0xaa, 0x78, 0xff, 80);
  }

  // Outer ethereal glow
  fillCircle(png, cx, cy, 34, 0x99, 0x66, 0xff, 25);

  // Cockpit core
  fillCircle(png, cx, cy, 6, 0xaa, 0x88, 0xee);
  fillCircle(png, cx, cy, 3, 0xcc, 0xaa, 0xff);

  // Phase shift marks on edges
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    fillCircle(png, cx + dx * 26, cy + dy * 26, 3, 0xbb, 0x88, 0xff, 160);
  }

  savePNG(png, "enemy_phantom.png");
}

function generateNeedle() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Narrow pointed body (kamikaze — points down) — wider for visibility
  fillPolygon(png, [
    [cx, cy + 36],
    [cx - 14, cy],
    [cx - 12, cy - 32],
    [cx + 12, cy - 32],
    [cx + 14, cy],
  ], 0xff, 0x22, 0x22);

  // Inner hull darker
  fillPolygon(png, [
    [cx, cy + 28],
    [cx - 8, cy],
    [cx - 7, cy - 26],
    [cx + 7, cy - 26],
    [cx + 8, cy],
  ], 0xcc, 0x11, 0x11);

  // Lateral stabilizer fins
  fillPolygon(png, [
    [cx - 12, cy - 8],
    [cx - 26, cy - 22],
    [cx - 22, cy - 24],
    [cx - 10, cy - 14],
  ], 0xdd, 0x33, 0x33);
  fillPolygon(png, [
    [cx + 12, cy - 8],
    [cx + 26, cy - 22],
    [cx + 22, cy - 24],
    [cx + 10, cy - 14],
  ], 0xdd, 0x33, 0x33);

  // Heat-tip glow at nose
  fillCircle(png, cx, cy + 34, 7, 0xff, 0x88, 0x44);
  fillCircle(png, cx, cy + 34, 5, 0xff, 0xcc, 0x88);
  fillCircle(png, cx, cy + 34, 3, 0xff, 0xee, 0xbb);

  // Engine exhausts at top
  fillEllipse(png, cx - 6, cy - 32, 5, 7, 0xff, 0x66, 0x00, 200);
  fillEllipse(png, cx + 6, cy - 32, 5, 7, 0xff, 0x66, 0x00, 200);
  fillEllipse(png, cx, cy - 34, 4, 6, 0xff, 0xaa, 0x44, 160);

  // Hull seam
  drawLine(png, cx, cy - 30, cx, cy + 32, 0xaa, 0x11, 0x11, 100, 1);

  // Fin tips
  fillCircle(png, cx - 24, cy - 23, 4, 0xff, 0x66, 0x33);
  fillCircle(png, cx + 24, cy - 23, 4, 0xff, 0x66, 0x33);

  // Hull panel marks
  drawLine(png, cx - 10, cy - 16, cx + 10, cy - 16, 0xaa, 0x22, 0x22, 140, 1);
  drawLine(png, cx - 8, cy + 6, cx + 8, cy + 6, 0xaa, 0x22, 0x22, 140, 1);
  drawLine(png, cx - 6, cy + 18, cx + 6, cy + 18, 0xaa, 0x22, 0x22, 140, 1);

  savePNG(png, "enemy_needle.png");
}

function generateLocust() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Round body
  fillCircle(png, cx, cy, 22, 0x88, 0x99, 0x33);

  // Inner body shading
  fillCircle(png, cx, cy, 16, 0x77, 0x88, 0x22);

  // Four leg-like appendages
  const nubLen = 16;
  drawLine(png, cx - 11, cy - 11, cx - 11 - nubLen, cy - 11 - nubLen, 0x66, 0x77, 0x22, 255, 3);
  drawLine(png, cx + 11, cy - 11, cx + 11 + nubLen, cy - 11 - nubLen, 0x66, 0x77, 0x22, 255, 3);
  drawLine(png, cx - 11, cy + 11, cx - 11 - nubLen, cy + 11 + nubLen, 0x66, 0x77, 0x22, 255, 3);
  drawLine(png, cx + 11, cy + 11, cx + 11 + nubLen, cy + 11 + nubLen, 0x66, 0x77, 0x22, 255, 3);

  // Leg tips
  fillCircle(png, cx - 11 - nubLen, cy - 11 - nubLen, 3, 0xaa, 0xbb, 0x55);
  fillCircle(png, cx + 11 + nubLen, cy - 11 - nubLen, 3, 0xaa, 0xbb, 0x55);
  fillCircle(png, cx - 11 - nubLen, cy + 11 + nubLen, 3, 0xaa, 0xbb, 0x55);
  fillCircle(png, cx + 11 + nubLen, cy + 11 + nubLen, 3, 0xaa, 0xbb, 0x55);

  // Carapace segments
  drawLine(png, cx - 14, cy, cx + 14, cy, 0x66, 0x77, 0x22, 120, 1);
  drawLine(png, cx, cy - 14, cx, cy + 14, 0x66, 0x77, 0x22, 120, 1);

  // Core eye
  fillCircle(png, cx, cy, 5, 0xaa, 0xbb, 0x55);
  fillCircle(png, cx, cy, 3, 0xcc, 0xdd, 0x77);

  savePNG(png, "enemy_locust.png");
}

function generateGlider() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Wide flat body with curved wing shape
  fillPolygon(png, [
    [cx, cy - 20],
    [cx + 10, cy - 14],
    [cx + 34, cy + 4],
    [cx + 24, cy + 20],
    [cx, cy + 12],
    [cx - 24, cy + 20],
    [cx - 34, cy + 4],
    [cx - 10, cy - 14],
  ], 0xaa, 0xbb, 0xcc);

  // Inner fuselage
  fillPolygon(png, [
    [cx, cy - 16],
    [cx + 8, cy - 10],
    [cx + 14, cy + 2],
    [cx, cy + 10],
    [cx - 14, cy + 2],
    [cx - 8, cy - 10],
  ], 0x88, 0x99, 0xaa);

  // Wing panel lines
  drawLine(png, cx + 12, cy - 8, cx + 30, cy + 8, 0x77, 0x88, 0x99, 140, 1);
  drawLine(png, cx - 12, cy - 8, cx - 30, cy + 8, 0x77, 0x88, 0x99, 140, 1);
  drawLine(png, cx + 18, cy - 2, cx + 28, cy + 14, 0x77, 0x88, 0x99, 120, 1);
  drawLine(png, cx - 18, cy - 2, cx - 28, cy + 14, 0x77, 0x88, 0x99, 120, 1);

  // Wing tip lights
  fillCircle(png, cx + 32, cy + 6, 4, 0xcc, 0xdd, 0xff);
  fillCircle(png, cx - 32, cy + 6, 4, 0xcc, 0xdd, 0xff);
  fillCircle(png, cx + 32, cy + 6, 2, 0xee, 0xf0, 0xff);
  fillCircle(png, cx - 32, cy + 6, 2, 0xee, 0xf0, 0xff);

  // Cockpit
  fillCircle(png, cx, cy - 6, 6, 0x99, 0xaa, 0xbb);
  fillCircle(png, cx, cy - 6, 4, 0xbb, 0xcc, 0xdd);

  // Tail fins
  fillPolygon(png, [
    [cx + 4, cy + 10],
    [cx + 8, cy + 22],
    [cx + 2, cy + 22],
  ], 0x88, 0x99, 0xaa);
  fillPolygon(png, [
    [cx - 4, cy + 10],
    [cx - 8, cy + 22],
    [cx - 2, cy + 22],
  ], 0x88, 0x99, 0xaa);

  // Engine glow
  fillEllipse(png, cx, cy + 14, 5, 3, 0xbb, 0xcc, 0xff, 140);

  savePNG(png, "enemy_glider.png");
}

function generateSpark() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Octagonal body
  const sides = 8;
  const r = 24;
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  fillPolygon(png, points, 0x44, 0xdd, 0xff);

  // Inner octagon
  const innerPoints = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    innerPoints.push([cx + (r - 6) * Math.cos(angle), cy + (r - 6) * Math.sin(angle)]);
  }
  fillPolygon(png, innerPoints, 0x33, 0xbb, 0xdd);

  // Electric arc lines radiating outward
  const arcAngles = [0.4, 1.6, 2.8, 4.0, 5.2];
  for (const angle of arcAngles) {
    const startX = cx + Math.cos(angle) * r * 0.6;
    const startY = cy + Math.sin(angle) * r * 0.6;
    const endX = cx + Math.cos(angle + 0.6) * r * 1.4;
    const endY = cy + Math.sin(angle + 0.6) * r * 1.4;
    const midX = (startX + endX) / 2 + Math.cos(angle + 1.2) * 6;
    const midY = (startY + endY) / 2 + Math.sin(angle + 1.2) * 6;
    drawLine(png, startX, startY, midX, midY, 0x88, 0xee, 0xff, 200, 2);
    drawLine(png, midX, midY, endX, endY, 0x88, 0xee, 0xff, 160, 2);
    fillCircle(png, endX, endY, 2, 0xaa, 0xff, 0xff, 180);
  }

  // Central energy core
  fillCircle(png, cx, cy, 8, 0xaa, 0xee, 0xff);
  fillCircle(png, cx, cy, 5, 0xcc, 0xff, 0xff);
  fillCircle(png, cx, cy, 2, 0xff, 0xff, 0xff);

  // Outer glow
  fillCircle(png, cx, cy, 30, 0x44, 0xdd, 0xff, 20);

  savePNG(png, "enemy_spark.png");
}

// ═══════════════════════════════════════════════
// MEDIUM ENEMIES (Act 2) — 2-3 HP, medium ships
// ═══════════════════════════════════════════════

function generateSentinel() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Hexagonal body
  const r = 28;
  const hexPoints = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    hexPoints.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  fillPolygon(png, hexPoints, 0x44, 0x88, 0xaa);

  // Inner hex
  const innerHex = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    innerHex.push([cx + (r - 8) * Math.cos(angle), cy + (r - 8) * Math.sin(angle)]);
  }
  fillPolygon(png, innerHex, 0x33, 0x66, 0x88);

  // Shield dome arc at top
  for (let angle = Math.PI; angle <= Math.PI * 2; angle += 0.03) {
    const ax = cx + Math.cos(angle) * 20;
    const ay = cy - 8 + Math.sin(angle) * 12;
    setPixel(png, Math.round(ax), Math.round(ay), 0x66, 0xaa, 0xcc, 200);
    setPixel(png, Math.round(ax), Math.round(ay - 1), 0x66, 0xaa, 0xcc, 140);
    setPixel(png, Math.round(ax), Math.round(ay + 1), 0x66, 0xaa, 0xcc, 140);
  }

  // Armor panel edges
  for (let i = 0; i < 6; i++) {
    const [x1, y1] = hexPoints[i];
    const [x2, y2] = hexPoints[(i + 1) % 6];
    drawLine(png, x1, y1, x2, y2, 0x55, 0x99, 0xbb, 180, 2);
  }

  // Central core
  fillCircle(png, cx, cy, 8, 0x33, 0x66, 0x88);
  fillCircle(png, cx, cy, 5, 0x44, 0x88, 0xaa);
  fillCircle(png, cx, cy, 3, 0x66, 0xcc, 0xee);

  // Aura hint ring
  fillCircle(png, cx, cy, 34, 0x66, 0xcc, 0xee, 15);

  savePNG(png, "enemy_sentinel.png");
}

function generateLancer() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Angular arrowhead body — wider for coverage
  fillPolygon(png, [
    [cx, cy + 30],
    [cx - 30, cy - 4],
    [cx - 14, cy - 28],
    [cx, cy - 16],
    [cx + 14, cy - 28],
    [cx + 30, cy - 4],
  ], 0xdd, 0x77, 0x22);

  // Inner hull darker
  fillPolygon(png, [
    [cx, cy + 20],
    [cx - 20, cy - 1],
    [cx - 8, cy - 20],
    [cx, cy - 10],
    [cx + 8, cy - 20],
    [cx + 20, cy - 1],
  ], 0xbb, 0x66, 0x11);

  // Charge exhaust (top edge)
  fillRect(png, cx - 10, cy - 32, 20, 7, 0xff, 0xa0, 0x32, 200);
  fillRect(png, cx - 6, cy - 31, 12, 5, 0xff, 0xcc, 0x66, 160);

  // Hull seam lines
  drawLine(png, cx, cy - 24, cx, cy + 24, 0x99, 0x55, 0x11, 100, 1);
  drawLine(png, cx - 22, cy - 4, cx + 22, cy - 4, 0x99, 0x55, 0x11, 100, 1);
  drawLine(png, cx - 16, cy + 10, cx + 16, cy + 10, 0x99, 0x55, 0x11, 80, 1);

  // Cockpit
  fillCircle(png, cx, cy, 7, 0x99, 0x55, 0x11);
  fillCircle(png, cx, cy, 5, 0xcc, 0x88, 0x33);
  fillCircle(png, cx, cy, 2, 0xee, 0xaa, 0x55);

  // Wing tip weapon pods
  fillCircle(png, cx - 28, cy - 2, 5, 0xcc, 0x66, 0x22);
  fillCircle(png, cx + 28, cy - 2, 5, 0xcc, 0x66, 0x22);
  fillCircle(png, cx - 28, cy - 2, 3, 0xaa, 0x44, 0x11);
  fillCircle(png, cx + 28, cy - 2, 3, 0xaa, 0x44, 0x11);

  // Armor edge highlights
  drawLine(png, cx - 28, cy - 4, cx - 12, cy - 26, 0xee, 0x88, 0x33, 140, 2);
  drawLine(png, cx + 28, cy - 4, cx + 12, cy - 26, 0xee, 0x88, 0x33, 140, 2);

  savePNG(png, "enemy_lancer.png");
}

function generateRavager() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Broad aggressive hull
  fillPolygon(png, [
    [cx, cy + 18],
    [cx - 12, cy + 24],
    [cx - 30, cy + 8],
    [cx - 30, cy - 14],
    [cx - 16, cy - 26],
    [cx + 16, cy - 26],
    [cx + 30, cy - 14],
    [cx + 30, cy + 8],
    [cx + 12, cy + 24],
  ], 0xbb, 0x33, 0x33);

  // Inner hull plating
  fillPolygon(png, [
    [cx, cy + 12],
    [cx - 8, cy + 18],
    [cx - 22, cy + 4],
    [cx - 22, cy - 10],
    [cx - 12, cy - 20],
    [cx + 12, cy - 20],
    [cx + 22, cy - 10],
    [cx + 22, cy + 4],
    [cx + 8, cy + 18],
  ], 0x99, 0x22, 0x22);

  // Weapon pods on sides
  fillRect(png, cx - 36, cy - 8, 10, 10, 0xff, 0x44, 0x44);
  fillRect(png, cx + 26, cy - 8, 10, 10, 0xff, 0x44, 0x44);

  // Weapon pod inner detail
  fillRect(png, cx - 34, cy - 6, 6, 6, 0xcc, 0x22, 0x22);
  fillRect(png, cx + 28, cy - 6, 6, 6, 0xcc, 0x22, 0x22);

  // Weapon barrel hints
  drawLine(png, cx - 36, cy - 3, cx - 40, cy - 3, 0xdd, 0x33, 0x33, 200, 2);
  drawLine(png, cx + 36, cy - 3, cx + 40, cy - 3, 0xdd, 0x33, 0x33, 200, 2);

  // Panel lines
  drawLine(png, cx - 22, cy - 4, cx + 22, cy - 4, 0x88, 0x22, 0x22, 120, 1);
  drawLine(png, cx - 18, cy + 6, cx + 18, cy + 6, 0x88, 0x22, 0x22, 120, 1);
  drawLine(png, cx, cy - 22, cx, cy + 16, 0x88, 0x22, 0x22, 120, 1);

  // Armor rivets
  for (const [rx, ry] of [[-18, -14], [18, -14], [-22, 0], [22, 0], [-14, 12], [14, 12]]) {
    fillCircle(png, cx + rx, cy + ry, 2, 0xaa, 0x33, 0x33);
  }

  // Cockpit
  fillCircle(png, cx, cy - 8, 7, 0x88, 0x22, 0x22);
  fillCircle(png, cx, cy - 8, 5, 0xdd, 0x44, 0x44);
  fillCircle(png, cx, cy - 8, 2, 0xff, 0x66, 0x66);

  // Engine exhausts
  fillEllipse(png, cx - 10, cy + 24, 5, 4, 0xff, 0x66, 0x00, 190);
  fillEllipse(png, cx + 10, cy + 24, 5, 4, 0xff, 0x66, 0x00, 190);

  savePNG(png, "enemy_ravager.png");
}

function generateWraith() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Spectral elongated body
  fillPolygon(png, [
    [cx, cy - 28],
    [cx + 26, cy],
    [cx + 8, cy + 14],
    [cx, cy + 28],
    [cx - 8, cy + 14],
    [cx - 26, cy],
  ], 0x66, 0x33, 0xaa);

  // Inner ghostly hull
  fillPolygon(png, [
    [cx, cy - 20],
    [cx + 16, cy],
    [cx + 5, cy + 10],
    [cx, cy + 20],
    [cx - 5, cy + 10],
    [cx - 16, cy],
  ], 0x55, 0x22, 0x88, 200);

  // Ethereal outline glow
  for (let angle = 0; angle < Math.PI * 2; angle += 0.06) {
    const radDist = 30 + Math.sin(angle * 3) * 4;
    const gx = cx + Math.cos(angle) * radDist;
    const gy = cy + Math.sin(angle) * radDist;
    setPixel(png, Math.round(gx), Math.round(gy), 0xaa, 0x64, 0xff, 60);
    setPixel(png, Math.round(gx + 1), Math.round(gy), 0xaa, 0x64, 0xff, 40);
    setPixel(png, Math.round(gx - 1), Math.round(gy), 0xaa, 0x64, 0xff, 40);
  }

  // Spectral wisps at tail
  drawLine(png, cx, cy + 28, cx - 6, cy + 38, 0x88, 0x44, 0xcc, 120, 2);
  drawLine(png, cx, cy + 28, cx + 6, cy + 38, 0x88, 0x44, 0xcc, 120, 2);
  drawLine(png, cx, cy + 28, cx, cy + 40, 0xaa, 0x66, 0xdd, 100, 2);

  // Core eye
  fillCircle(png, cx, cy - 2, 6, 0xaa, 0x88, 0xee);
  fillCircle(png, cx, cy - 2, 4, 0xcc, 0xaa, 0xff);
  fillCircle(png, cx, cy - 2, 2, 0xee, 0xcc, 0xff);

  // Outer aura
  fillCircle(png, cx, cy, 32, 0x88, 0x44, 0xcc, 15);

  savePNG(png, "enemy_wraith.png");
}

function generateCorsair() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Asymmetric pirate-style hull — broader shape
  fillPolygon(png, [
    [cx - 10, cy + 24],
    [cx - 28, cy + 8],
    [cx - 24, cy - 24],
    [cx + 16, cy - 24],
    [cx + 30, cy - 10],
    [cx + 30, cy + 14],
    [cx + 16, cy + 24],
  ], 0x77, 0x88, 0x99);

  // Inner plating
  fillPolygon(png, [
    [cx - 6, cy + 18],
    [cx - 20, cy + 4],
    [cx - 18, cy - 18],
    [cx + 12, cy - 18],
    [cx + 22, cy - 6],
    [cx + 22, cy + 10],
    [cx + 12, cy + 18],
  ], 0x55, 0x66, 0x77);

  // Bridge/tower (raised section)
  fillRect(png, cx + 12, cy - 16, 14, 14, 0xcc, 0x66, 0x22);
  fillRect(png, cx + 14, cy - 14, 10, 10, 0xaa, 0x55, 0x11);

  // Weapon turret on port side
  fillCircle(png, cx - 22, cy - 6, 6, 0x88, 0x99, 0xaa);
  fillCircle(png, cx - 22, cy - 6, 4, 0x66, 0x77, 0x88);
  drawLine(png, cx - 22, cy - 6, cx - 22, cy - 18, 0x88, 0x99, 0xaa, 200, 2);

  // Missile rack on starboard
  fillRect(png, cx + 24, cy + 2, 6, 10, 0x66, 0x77, 0x88);
  fillCircle(png, cx + 27, cy + 4, 2, 0xaa, 0x44, 0x22);
  fillCircle(png, cx + 27, cy + 9, 2, 0xaa, 0x44, 0x22);

  // Hull markings / panel lines
  drawLine(png, cx - 18, cy + 2, cx + 20, cy + 2, 0x44, 0x55, 0x66, 120, 1);
  drawLine(png, cx - 16, cy - 10, cx + 18, cy - 10, 0x44, 0x55, 0x66, 120, 1);
  drawLine(png, cx, cy - 20, cx, cy + 18, 0x44, 0x55, 0x66, 100, 1);

  // Cockpit
  fillCircle(png, cx, cy, 6, 0x55, 0x66, 0x77);
  fillCircle(png, cx, cy, 4, 0x88, 0xaa, 0xbb);

  // Engine exhausts
  fillEllipse(png, cx - 4, cy + 26, 7, 4, 0xff, 0x88, 0x22, 170);
  fillEllipse(png, cx + 12, cy + 26, 5, 3, 0xff, 0x88, 0x22, 150);

  // Antenna
  drawLine(png, cx - 10, cy - 24, cx - 14, cy - 32, 0x99, 0xaa, 0xbb, 180, 1);
  fillCircle(png, cx - 14, cy - 32, 2, 0xcc, 0x66, 0x22);

  savePNG(png, "enemy_corsair.png");
}

function generateVulture() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Swept-wing predator body — larger
  fillPolygon(png, [
    [cx, cy - 26],
    [cx + 10, cy - 10],
    [cx + 34, cy + 6],
    [cx + 24, cy + 24],
    [cx, cy + 14],
    [cx - 24, cy + 24],
    [cx - 34, cy + 6],
    [cx - 10, cy - 10],
  ], 0x77, 0x44, 0x22);

  // Inner fuselage
  fillPolygon(png, [
    [cx, cy - 18],
    [cx + 8, cy - 6],
    [cx + 20, cy + 4],
    [cx, cy + 10],
    [cx - 20, cy + 4],
    [cx - 8, cy - 6],
  ], 0x55, 0x33, 0x11);

  // Wing panel lines
  drawLine(png, cx + 10, cy - 6, cx + 30, cy + 10, 0x66, 0x33, 0x11, 140, 1);
  drawLine(png, cx - 10, cy - 6, cx - 30, cy + 10, 0x66, 0x33, 0x11, 140, 1);
  drawLine(png, cx + 16, cy, cx + 28, cy + 16, 0x66, 0x33, 0x11, 120, 1);
  drawLine(png, cx - 16, cy, cx - 28, cy + 16, 0x66, 0x33, 0x11, 120, 1);

  // Eyes (predator sensors)
  fillCircle(png, cx - 8, cy - 8, 5, 0xff, 0x22, 0x22);
  fillCircle(png, cx + 8, cy - 8, 5, 0xff, 0x22, 0x22);
  fillCircle(png, cx - 8, cy - 8, 3, 0xff, 0x88, 0x44);
  fillCircle(png, cx + 8, cy - 8, 3, 0xff, 0x88, 0x44);

  // Central cockpit
  fillCircle(png, cx, cy, 6, 0x55, 0x33, 0x11);
  fillCircle(png, cx, cy, 4, 0x88, 0x55, 0x33);

  // Tail rudders — larger
  fillPolygon(png, [
    [cx + 18, cy + 16],
    [cx + 26, cy + 30],
    [cx + 16, cy + 30],
  ], 0x66, 0x33, 0x11);
  fillPolygon(png, [
    [cx - 18, cy + 16],
    [cx - 26, cy + 30],
    [cx - 16, cy + 30],
  ], 0x66, 0x33, 0x11);

  // Engine glow
  fillEllipse(png, cx, cy + 16, 6, 4, 0xff, 0x66, 0x00, 170);

  // Wing tip weapons
  fillCircle(png, cx + 32, cy + 8, 3, 0xaa, 0x44, 0x11);
  fillCircle(png, cx - 32, cy + 8, 3, 0xaa, 0x44, 0x11);

  savePNG(png, "enemy_vulture.png");
}

// ═══════════════════════════════════════════════
// HEAVY ENEMIES (Act 2) — 6-15 HP, large ships
// ═══════════════════════════════════════════════

function generateTitan() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Broad angular hull — #556677
  fillPolygon(png, [
    [cx, cy + 32],
    [cx - 18, cy + 22],
    [cx - 38, cy + 4],
    [cx - 38, cy - 16],
    [cx - 22, cy - 36],
    [cx + 22, cy - 36],
    [cx + 38, cy - 16],
    [cx + 38, cy + 4],
    [cx + 18, cy + 22],
  ], 0x55, 0x66, 0x77);

  // Inner plating — darker
  fillPolygon(png, [
    [cx, cy + 24],
    [cx - 12, cy + 16],
    [cx - 28, cy + 2],
    [cx - 28, cy - 12],
    [cx - 16, cy - 28],
    [cx + 16, cy - 28],
    [cx + 28, cy - 12],
    [cx + 28, cy + 2],
    [cx + 12, cy + 16],
  ], 0x44, 0x55, 0x66);

  // Armor edge highlight
  drawLine(png, cx - 38, cy - 16, cx - 22, cy - 36, 0x77, 0x88, 0x99, 180, 2);
  drawLine(png, cx + 38, cy - 16, cx + 22, cy - 36, 0x77, 0x88, 0x99, 180, 2);
  drawLine(png, cx - 38, cy + 4, cx - 38, cy - 16, 0x77, 0x88, 0x99, 160, 2);
  drawLine(png, cx + 38, cy + 4, cx + 38, cy - 16, 0x77, 0x88, 0x99, 160, 2);

  // Weapon ports on sides — spread weapon (#ff6644)
  fillRect(png, cx - 38, cy - 6, 7, 8, 0xff, 0x66, 0x44);
  fillRect(png, cx + 31, cy - 6, 7, 8, 0xff, 0x66, 0x44);
  fillRect(png, cx - 36, cy - 4, 3, 4, 0xff, 0x99, 0x77);
  fillRect(png, cx + 33, cy - 4, 3, 4, 0xff, 0x99, 0x77);

  // Engine exhaust vents
  fillRect(png, cx - 10, cy + 16, 6, 10, 0xcc, 0x44, 0x22);
  fillRect(png, cx + 4, cy + 16, 6, 10, 0xcc, 0x44, 0x22);
  fillEllipse(png, cx - 7, cy + 28, 5, 3, 0xff, 0x88, 0x44, 180);
  fillEllipse(png, cx + 7, cy + 28, 5, 3, 0xff, 0x88, 0x44, 180);

  // Panel lines
  drawLine(png, cx - 28, cy - 4, cx + 28, cy - 4, 0x44, 0x55, 0x66, 120, 1);
  drawLine(png, cx - 24, cy + 8, cx + 24, cy + 8, 0x44, 0x55, 0x66, 100, 1);
  drawLine(png, cx, cy - 30, cx, cy + 22, 0x44, 0x55, 0x66, 100, 1);

  // Cockpit
  fillCircle(png, cx, cy - 8, 7, 0x44, 0x55, 0x66);
  fillCircle(png, cx, cy - 8, 5, 0xaa, 0xbb, 0xcc);
  fillCircle(png, cx, cy - 8, 3, 0xcc, 0xdd, 0xee);

  savePNG(png, "enemy_titan.png");
}

function generateBastion() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Octagonal fortress body — #555555
  const sides = 8;
  const r = 30;
  const octPoints = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    octPoints.push([cx + r * Math.cos(angle), cy + r * 0.8 * Math.sin(angle)]);
  }
  fillPolygon(png, octPoints, 0x55, 0x55, 0x55);

  // Inner octagon
  const innerOctPoints = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    innerOctPoints.push([cx + (r - 8) * Math.cos(angle), cy + (r - 8) * 0.8 * Math.sin(angle)]);
  }
  fillPolygon(png, innerOctPoints, 0x44, 0x44, 0x44);

  // Armor edge highlights
  for (let i = 0; i < sides; i++) {
    const [x1, y1] = octPoints[i];
    const [x2, y2] = octPoints[(i + 1) % sides];
    drawLine(png, x1, y1, x2, y2, 0x77, 0x77, 0x77, 180, 2);
  }

  // Turret barrel (pointing up = towards player)
  fillRect(png, cx - 3, cy - r * 0.8 - 12, 6, r * 0.8, 0xcc, 0x88, 0x33);
  fillRect(png, cx - 2, cy - r * 0.8 - 10, 4, r * 0.8 - 4, 0xaa, 0x66, 0x22);

  // Turret base
  fillCircle(png, cx, cy, 8, 0xaa, 0x66, 0x22);
  fillCircle(png, cx, cy, 5, 0xcc, 0x88, 0x33);
  fillCircle(png, cx, cy, 3, 0xdd, 0xaa, 0x55);

  // Armor rivets at edges
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    const rx = cx + (r - 4) * Math.cos(angle);
    const ry = cy + (r - 4) * 0.8 * Math.sin(angle);
    fillCircle(png, rx, ry, 2, 0x66, 0x66, 0x66);
  }

  savePNG(png, "enemy_bastion.png");
}

function generateSiegeEngine() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Angular armored hull — #336633
  fillPolygon(png, [
    [cx - 14, cy + 34],
    [cx - 36, cy + 8],
    [cx - 30, cy - 18],
    [cx - 14, cy - 36],
    [cx + 14, cy - 36],
    [cx + 30, cy - 18],
    [cx + 36, cy + 8],
    [cx + 14, cy + 34],
  ], 0x33, 0x66, 0x33);

  // Inner hull plating
  fillPolygon(png, [
    [cx - 10, cy + 26],
    [cx - 26, cy + 6],
    [cx - 22, cy - 14],
    [cx - 10, cy - 28],
    [cx + 10, cy - 28],
    [cx + 22, cy - 14],
    [cx + 26, cy + 6],
    [cx + 10, cy + 26],
  ], 0x22, 0x44, 0x22);

  // Armor edge highlight
  drawLine(png, cx - 36, cy + 8, cx - 30, cy - 18, 0x44, 0x88, 0x44, 160, 2);
  drawLine(png, cx + 36, cy + 8, cx + 30, cy - 18, 0x44, 0x88, 0x44, 160, 2);

  // Central charge beam cannon
  fillRect(png, cx - 5, cy - 20, 10, 44, 0x22, 0x44, 0x22);
  fillRect(png, cx - 3, cy - 16, 6, 36, 0x33, 0x55, 0x33);

  // Charge glow at barrel tip
  fillCircle(png, cx, cy + 34, 7, 0x66, 0xdd, 0x66, 200);
  fillCircle(png, cx, cy + 34, 5, 0x88, 0xee, 0x88, 160);
  fillCircle(png, cx, cy + 34, 3, 0xaa, 0xff, 0xaa);

  // Panel lines
  drawLine(png, cx - 24, cy - 4, cx + 24, cy - 4, 0x22, 0x44, 0x22, 120, 1);
  drawLine(png, cx - 20, cy + 12, cx + 20, cy + 12, 0x22, 0x44, 0x22, 100, 1);

  // Engine exhaust
  fillEllipse(png, cx - 10, cy - 36, 6, 4, 0x44, 0xcc, 0x44, 180);
  fillEllipse(png, cx + 10, cy - 36, 6, 4, 0x44, 0xcc, 0x44, 180);

  // Cockpit
  fillCircle(png, cx, cy - 10, 5, 0x44, 0x88, 0x44);
  fillCircle(png, cx, cy - 10, 3, 0x66, 0xbb, 0x66);

  savePNG(png, "enemy_siege_engine.png");
}

function generateColossus() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Massive hull with presence aura — #444455
  fillCircle(png, cx, cy, 40, 0x44, 0x44, 0x55, 25);

  // Main hull
  fillPolygon(png, [
    [cx, cy + 36],
    [cx - 18, cy + 28],
    [cx - 38, cy + 8],
    [cx - 38, cy - 16],
    [cx - 22, cy - 36],
    [cx + 22, cy - 36],
    [cx + 38, cy - 16],
    [cx + 38, cy + 8],
    [cx + 18, cy + 28],
  ], 0x44, 0x44, 0x55);

  // Inner plating
  fillPolygon(png, [
    [cx, cy + 28],
    [cx - 14, cy + 22],
    [cx - 30, cy + 6],
    [cx - 30, cy - 12],
    [cx - 18, cy - 28],
    [cx + 18, cy - 28],
    [cx + 30, cy - 12],
    [cx + 30, cy + 6],
    [cx + 14, cy + 22],
  ], 0x33, 0x33, 0x44);

  // Hull edge highlights
  drawLine(png, cx - 38, cy - 16, cx - 22, cy - 36, 0x66, 0x66, 0x77, 180, 2);
  drawLine(png, cx + 38, cy - 16, cx + 22, cy - 36, 0x66, 0x66, 0x77, 180, 2);

  // Armor seam lines
  drawLine(png, cx - 30, cy - 6, cx + 30, cy - 6, 0x55, 0x55, 0x66, 140, 1);
  drawLine(png, cx - 26, cy + 10, cx + 26, cy + 10, 0x55, 0x55, 0x66, 120, 1);

  // Energy seam (pulsing blue)
  drawLine(png, cx - 24, cy + 2, cx + 24, cy + 2, 0x66, 0x66, 0xcc, 160, 2);

  // Cockpit
  fillCircle(png, cx, cy - 6, 9, 0x33, 0x33, 0x44);
  fillCircle(png, cx, cy - 6, 6, 0x55, 0x55, 0x77);
  fillCircle(png, cx, cy - 6, 3, 0x88, 0x88, 0xcc);

  // Missile pods
  fillRect(png, cx - 40, cy - 8, 6, 12, 0x55, 0x55, 0x66);
  fillRect(png, cx + 34, cy - 8, 6, 12, 0x55, 0x55, 0x66);
  fillCircle(png, cx - 37, cy - 4, 2, 0xaa, 0x44, 0x22);
  fillCircle(png, cx - 37, cy + 2, 2, 0xaa, 0x44, 0x22);
  fillCircle(png, cx + 37, cy - 4, 2, 0xaa, 0x44, 0x22);
  fillCircle(png, cx + 37, cy + 2, 2, 0xaa, 0x44, 0x22);

  // Engine exhaust
  fillEllipse(png, cx - 12, cy + 32, 6, 4, 0xff, 0x66, 0x00, 180);
  fillEllipse(png, cx, cy + 34, 5, 3, 0xff, 0x88, 0x22, 160);
  fillEllipse(png, cx + 12, cy + 32, 6, 4, 0xff, 0x66, 0x00, 180);

  savePNG(png, "enemy_colossus.png");
}

function generateWarden() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Diamond-octagon shape — #3366aa
  fillPolygon(png, [
    [cx, cy - 30],
    [cx + 16, cy - 16],
    [cx + 30, cy],
    [cx + 16, cy + 16],
    [cx, cy + 30],
    [cx - 16, cy + 16],
    [cx - 30, cy],
    [cx - 16, cy - 16],
  ], 0x33, 0x66, 0xaa);

  // Inner hull
  fillPolygon(png, [
    [cx, cy - 22],
    [cx + 12, cy - 12],
    [cx + 22, cy],
    [cx + 12, cy + 12],
    [cx, cy + 22],
    [cx - 12, cy + 12],
    [cx - 22, cy],
    [cx - 12, cy - 12],
  ], 0x22, 0x44, 0x77);

  // Edge highlights
  drawLine(png, cx, cy - 30, cx + 16, cy - 16, 0x44, 0x88, 0xcc, 180, 2);
  drawLine(png, cx, cy - 30, cx - 16, cy - 16, 0x44, 0x88, 0xcc, 180, 2);

  // Shield emitter pods on sides
  fillRect(png, cx - 34, cy - 3, 8, 6, 0x55, 0xcc, 0xff);
  fillRect(png, cx + 26, cy - 3, 8, 6, 0x55, 0xcc, 0xff);
  fillRect(png, cx - 32, cy - 1, 4, 2, 0xaa, 0xee, 0xff);
  fillRect(png, cx + 28, cy - 1, 4, 2, 0xaa, 0xee, 0xff);

  // Cockpit
  fillCircle(png, cx, cy, 6, 0x22, 0x44, 0x77);
  fillCircle(png, cx, cy, 4, 0x44, 0x88, 0xcc);

  // Panel lines
  drawLine(png, cx - 20, cy, cx + 20, cy, 0x22, 0x44, 0x77, 100, 1);
  drawLine(png, cx, cy - 20, cx, cy + 20, 0x22, 0x44, 0x77, 100, 1);

  // Barrier field representation below ship
  fillRect(png, cx - 26, cy + 34, 52, 4, 0x55, 0xcc, 0xff, 100);
  drawLine(png, cx - 26, cy + 36, cx + 26, cy + 36, 0x55, 0xcc, 0xff, 200, 2);

  savePNG(png, "enemy_warden.png");
}

function generateLeviathan() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Broad carrier hull — #445533
  fillPolygon(png, [
    [cx - 16, cy - 36],
    [cx + 16, cy - 36],
    [cx + 28, cy - 20],
    [cx + 38, cy - 4],
    [cx + 38, cy + 18],
    [cx + 22, cy + 36],
    [cx - 22, cy + 36],
    [cx - 38, cy + 18],
    [cx - 38, cy - 4],
    [cx - 28, cy - 20],
  ], 0x44, 0x55, 0x33);

  // Inner plating
  fillPolygon(png, [
    [cx - 12, cy - 28],
    [cx + 12, cy - 28],
    [cx + 22, cy - 14],
    [cx + 30, cy - 2],
    [cx + 30, cy + 14],
    [cx + 18, cy + 28],
    [cx - 18, cy + 28],
    [cx - 30, cy + 14],
    [cx - 30, cy - 2],
    [cx - 22, cy - 14],
  ], 0x33, 0x44, 0x22);

  // Edge highlights
  drawLine(png, cx - 38, cy - 4, cx - 28, cy - 20, 0x5a, 0x6b, 0x44, 160, 2);
  drawLine(png, cx + 38, cy - 4, cx + 28, cy - 20, 0x5a, 0x6b, 0x44, 160, 2);

  // Drone deployment bays (sides) — glowing amber
  fillRect(png, cx - 40, cy + 2, 10, 14, 0xcc, 0xaa, 0x22, 200);
  fillRect(png, cx + 30, cy + 2, 10, 14, 0xcc, 0xaa, 0x22, 200);
  fillRect(png, cx - 38, cy + 4, 6, 10, 0x55, 0x66, 0x44);
  fillRect(png, cx + 32, cy + 4, 6, 10, 0x55, 0x66, 0x44);

  // Bay glow accent
  fillCircle(png, cx - 35, cy + 9, 3, 0xff, 0xcc, 0x44, 180);
  fillCircle(png, cx + 35, cy + 9, 3, 0xff, 0xcc, 0x44, 180);

  // Panel lines
  drawLine(png, cx - 24, cy - 6, cx + 24, cy - 6, 0x33, 0x44, 0x22, 120, 1);
  drawLine(png, cx - 20, cy + 10, cx + 20, cy + 10, 0x33, 0x44, 0x22, 100, 1);
  drawLine(png, cx, cy - 28, cx, cy + 24, 0x33, 0x44, 0x22, 100, 1);

  // Cockpit
  fillCircle(png, cx, cy - 10, 7, 0x66, 0x77, 0x55);
  fillCircle(png, cx, cy - 10, 4, 0x88, 0x99, 0x66);

  // Engine exhaust at rear
  fillEllipse(png, cx - 14, cy + 36, 6, 4, 0xff, 0x88, 0x22, 180);
  fillEllipse(png, cx, cy + 38, 5, 3, 0xff, 0xaa, 0x44, 160);
  fillEllipse(png, cx + 14, cy + 36, 6, 4, 0xff, 0x88, 0x22, 180);

  savePNG(png, "enemy_leviathan.png");
}

// ═══════════════════════════════════════════════
// SPECIAL ENEMIES (Act 2) — unique abilities
// ═══════════════════════════════════════════════

function generateSplitter() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Teardrop/bulb shape — #22ccaa
  fillPolygon(png, [
    [cx, cy - 28],
    [cx + 24, cy - 8],
    [cx + 18, cy + 28],
    [cx - 18, cy + 28],
    [cx - 24, cy - 8],
  ], 0x22, 0xcc, 0xaa);

  // Inner hull
  fillPolygon(png, [
    [cx, cy - 20],
    [cx + 16, cy - 4],
    [cx + 12, cy + 20],
    [cx - 12, cy + 20],
    [cx - 16, cy - 4],
  ], 0x1a, 0xaa, 0x88);

  // Split line markings (X pattern showing where it splits)
  drawLine(png, cx - 10, cy - 8, cx + 10, cy + 18, 0x88, 0xff, 0xdd, 180, 2);
  drawLine(png, cx + 10, cy - 8, cx - 10, cy + 18, 0x88, 0xff, 0xdd, 180, 2);

  // Outline glow
  for (let i = 0; i < 5; i++) {
    const pts = [
      [cx, cy - 28], [cx + 24, cy - 8], [cx + 18, cy + 28],
      [cx - 18, cy + 28], [cx - 24, cy - 8],
    ];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 5];
    drawLine(png, x1, y1, x2, y2, 0x66, 0xee, 0xcc, 160, 2);
  }

  // Core
  fillCircle(png, cx, cy, 6, 0x66, 0xee, 0xcc);
  fillCircle(png, cx, cy, 3, 0xaa, 0xff, 0xee);

  savePNG(png, "enemy_splitter.png");
}

function generateSplitterMinor() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Simple triangle — smaller, #1a9980
  fillPolygon(png, [
    [cx, cy - 20],
    [cx + 18, cy + 20],
    [cx - 18, cy + 20],
  ], 0x1a, 0x99, 0x80);

  // Inner highlight
  fillPolygon(png, [
    [cx, cy - 12],
    [cx + 10, cy + 12],
    [cx - 10, cy + 12],
  ], 0x22, 0xaa, 0x88, 200);

  // Core dot
  fillCircle(png, cx, cy + 2, 4, 0x44, 0xcc, 0xaa);
  fillCircle(png, cx, cy + 2, 2, 0x88, 0xee, 0xcc);

  savePNG(png, "enemy_splitter_minor.png");
}

function generateHealer() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Heal aura glow
  fillCircle(png, cx, cy, 32, 0x44, 0xcc, 0x66, 30);

  // Circular body — #44cc66
  fillCircle(png, cx, cy, 24, 0x44, 0xcc, 0x66);

  // Inner ring
  fillCircle(png, cx, cy, 18, 0x33, 0xaa, 0x55);

  // Outline ring
  for (let angle = 0; angle < Math.PI * 2; angle += 0.04) {
    const rx = cx + Math.cos(angle) * 24;
    const ry = cy + Math.sin(angle) * 24;
    setPixel(png, Math.round(rx), Math.round(ry), 0x66, 0xee, 0x88, 220);
    setPixel(png, Math.round(rx + 1), Math.round(ry), 0x66, 0xee, 0x88, 140);
    setPixel(png, Math.round(rx - 1), Math.round(ry), 0x66, 0xee, 0x88, 140);
  }

  // White cross (medical symbol)
  const crossW = 7;
  const crossH = 18;
  fillRect(png, cx - crossW / 2, cy - crossH / 2, crossW, crossH, 0xff, 0xff, 0xff);
  fillRect(png, cx - crossH / 2, cy - crossW / 2, crossH, crossW, 0xff, 0xff, 0xff);

  // Cross inner shadow for depth
  fillRect(png, cx - (crossW - 2) / 2, cy - (crossH - 2) / 2, crossW - 2, crossH - 2, 0xee, 0xff, 0xee);
  fillRect(png, cx - (crossH - 2) / 2, cy - (crossW - 2) / 2, crossH - 2, crossW - 2, 0xee, 0xff, 0xee);

  savePNG(png, "enemy_healer.png");
}

function generateTeleporter() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer phase ring
  for (let angle = 0; angle < Math.PI * 2; angle += 0.04) {
    const rx = cx + Math.cos(angle) * 28;
    const ry = cy + Math.sin(angle) * 28;
    setPixel(png, Math.round(rx), Math.round(ry), 0xaa, 0x44, 0xff, 120);
    setPixel(png, Math.round(rx + 1), Math.round(ry), 0xaa, 0x44, 0xff, 60);
    setPixel(png, Math.round(rx - 1), Math.round(ry), 0xaa, 0x44, 0xff, 60);
    setPixel(png, Math.round(rx), Math.round(ry + 1), 0xaa, 0x44, 0xff, 60);
    setPixel(png, Math.round(rx), Math.round(ry - 1), 0xaa, 0x44, 0xff, 60);
  }

  // Pentagon body — #aa44ff
  fillPolygon(png, [
    [cx, cy - 26],
    [cx + 24, cy - 2],
    [cx + 16, cy + 24],
    [cx - 16, cy + 24],
    [cx - 24, cy - 2],
  ], 0xaa, 0x44, 0xff);

  // Inner hull
  fillPolygon(png, [
    [cx, cy - 18],
    [cx + 16, cy - 1],
    [cx + 10, cy + 16],
    [cx - 10, cy + 16],
    [cx - 16, cy - 1],
  ], 0x88, 0x33, 0xcc, 200);

  // Phase distortion glow
  fillCircle(png, cx, cy, 30, 0xaa, 0x44, 0xff, 15);

  // Core
  fillCircle(png, cx, cy, 6, 0xdd, 0x88, 0xff);
  fillCircle(png, cx, cy, 3, 0xee, 0xaa, 0xff);

  // Vertex accents
  const pentPts = [
    [cx, cy - 26], [cx + 24, cy - 2], [cx + 16, cy + 24],
    [cx - 16, cy + 24], [cx - 24, cy - 2],
  ];
  for (const [px, py] of pentPts) {
    fillCircle(png, px, py, 3, 0xcc, 0x66, 0xff, 180);
  }

  savePNG(png, "enemy_teleporter.png");
}

function generateMimic() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Shimmer aura
  fillCircle(png, cx, cy, 28, 0xcc, 0xcc, 0xff, 20);

  // Triangle body (disguised as player-like) — #ccccdd
  fillPolygon(png, [
    [cx - 22, cy - 22],
    [cx + 22, cy - 22],
    [cx, cy + 26],
  ], 0xcc, 0xcc, 0xdd);

  // Inner triangle
  fillPolygon(png, [
    [cx - 14, cy - 14],
    [cx + 14, cy - 14],
    [cx, cy + 18],
  ], 0xaa, 0xaa, 0xbb);

  // Outline
  drawLine(png, cx - 22, cy - 22, cx + 22, cy - 22, 0xdd, 0xdd, 0xef, 200, 2);
  drawLine(png, cx + 22, cy - 22, cx, cy + 26, 0xdd, 0xdd, 0xef, 200, 2);
  drawLine(png, cx, cy + 26, cx - 22, cy - 22, 0xdd, 0xdd, 0xef, 200, 2);

  // Deceptive "cockpit"
  fillCircle(png, cx, cy - 6, 5, 0xdd, 0xdd, 0xef);
  fillCircle(png, cx, cy - 6, 3, 0xee, 0xee, 0xff);

  // Subtle shimmer marks
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 / 5) * i;
    const sx = cx + Math.cos(angle) * 20;
    const sy = cy + Math.sin(angle) * 16;
    fillCircle(png, sx, sy, 2, 0xee, 0xee, 0xff, 120);
  }

  savePNG(png, "enemy_mimic.png");
}

function generateKamikaze() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Nose heat glow
  fillCircle(png, cx, cy - 26, 10, 0xff, 0x88, 0x00, 100);

  // Angular armored body — #cc3300 (red-orange danger colors)
  fillPolygon(png, [
    [cx, cy - 28],
    [cx + 16, cy - 10],
    [cx + 26, cy + 10],
    [cx + 18, cy + 28],
    [cx - 18, cy + 28],
    [cx - 26, cy + 10],
    [cx - 16, cy - 10],
  ], 0xcc, 0x33, 0x00);

  // Inner hull
  fillPolygon(png, [
    [cx, cy - 20],
    [cx + 10, cy - 6],
    [cx + 18, cy + 8],
    [cx + 12, cy + 20],
    [cx - 12, cy + 20],
    [cx - 18, cy + 8],
    [cx - 10, cy - 6],
  ], 0xaa, 0x22, 0x00);

  // Hot nose cone (warhead)
  fillPolygon(png, [
    [cx, cy - 28],
    [cx + 8, cy - 10],
    [cx - 8, cy - 10],
  ], 0xff, 0x88, 0x00);
  fillPolygon(png, [
    [cx, cy - 24],
    [cx + 5, cy - 12],
    [cx - 5, cy - 12],
  ], 0xff, 0xcc, 0x44);

  // Danger markings — diagonal stripes
  drawLine(png, cx - 14, cy + 4, cx - 6, cy + 16, 0xff, 0xaa, 0x00, 160, 2);
  drawLine(png, cx + 14, cy + 4, cx + 6, cy + 16, 0xff, 0xaa, 0x00, 160, 2);

  // Engine exhaust flame (trailing)
  fillPolygon(png, [
    [cx - 10, cy + 28],
    [cx, cy + 42],
    [cx + 10, cy + 28],
  ], 0xff, 0xcc, 0x33, 200);
  fillPolygon(png, [
    [cx - 6, cy + 28],
    [cx, cy + 38],
    [cx + 6, cy + 28],
  ], 0xff, 0xee, 0x88, 160);

  // Panel rivets
  for (const [rx, ry] of [[-12, 0], [12, 0], [-8, 12], [8, 12]]) {
    fillCircle(png, cx + rx, cy + ry, 2, 0xdd, 0x44, 0x11);
  }

  savePNG(png, "enemy_kamikaze.png");
}

function generateJammer() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Jamming field rings (static representation)
  for (let i = 0; i < 3; i++) {
    const radius = 20 + i * 10;
    const alpha = 60 - i * 18;
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const rx = cx + Math.cos(angle) * radius;
      const ry = cy + Math.sin(angle) * radius;
      setPixel(png, Math.round(rx), Math.round(ry), 0xff, 0x3c, 0x3c, alpha);
    }
  }

  // Trapezoidal hull — #666644
  fillPolygon(png, [
    [cx - 26, cy - 8],
    [cx - 22, cy - 24],
    [cx + 22, cy - 24],
    [cx + 26, cy - 8],
    [cx + 26, cy + 16],
    [cx + 16, cy + 28],
    [cx - 16, cy + 28],
    [cx - 26, cy + 16],
  ], 0x66, 0x66, 0x44);

  // Inner plating
  fillPolygon(png, [
    [cx - 18, cy - 6],
    [cx - 16, cy - 18],
    [cx + 16, cy - 18],
    [cx + 18, cy - 6],
    [cx + 18, cy + 12],
    [cx + 12, cy + 22],
    [cx - 12, cy + 22],
    [cx - 18, cy + 12],
  ], 0x55, 0x55, 0x33);

  // Antenna masts on top
  drawLine(png, cx - 12, cy - 24, cx - 12, cy - 34, 0x88, 0x88, 0x66, 200, 2);
  drawLine(png, cx, cy - 24, cx, cy - 36, 0x88, 0x88, 0x66, 200, 2);
  drawLine(png, cx + 12, cy - 24, cx + 12, cy - 34, 0x88, 0x88, 0x66, 200, 2);

  // Antenna tips
  fillCircle(png, cx - 12, cy - 34, 2, 0xff, 0x3c, 0x3c, 200);
  fillCircle(png, cx, cy - 36, 3, 0xff, 0x3c, 0x3c, 220);
  fillCircle(png, cx + 12, cy - 34, 2, 0xff, 0x3c, 0x3c, 200);

  // Central jamming core
  fillCircle(png, cx, cy, 6, 0x88, 0x88, 0x66);
  fillCircle(png, cx, cy, 4, 0xff, 0x3c, 0x3c, 180);
  fillCircle(png, cx, cy, 2, 0xff, 0x88, 0x88);

  // Panel lines
  drawLine(png, cx - 16, cy + 4, cx + 16, cy + 4, 0x55, 0x55, 0x33, 100, 1);
  drawLine(png, cx, cy - 18, cx, cy + 20, 0x55, 0x55, 0x33, 100, 1);

  savePNG(png, "enemy_jammer.png");
}

// ═══════════════════════════════════════════════
// Generate all sprites
// ═══════════════════════════════════════════════

console.log("Generating Act 2 light enemy sprites...");
generateWasp();
generatePhantom();
generateNeedle();
generateLocust();
generateGlider();
generateSpark();

console.log("Generating Act 2 medium enemy sprites...");
generateSentinel();
generateLancer();
generateRavager();
generateWraith();
generateCorsair();
generateVulture();

console.log("Generating Act 2 heavy enemy sprites...");
generateTitan();
generateBastion();
generateSiegeEngine();
generateColossus();
generateWarden();
generateLeviathan();

console.log("Generating Act 2 special enemy sprites...");
generateSplitter();
generateSplitterMinor();
generateHealer();
generateTeleporter();
generateMimic();
generateKamikaze();
generateJammer();

console.log("Done! All 25 Act 2 enemy sprites generated.");
