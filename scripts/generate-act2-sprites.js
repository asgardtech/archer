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
// HEAVY ENEMIES (Act 2) — 6–15 HP, large warships
// ═══════════════════════════════════════════════

function generateTitan() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer glow
  fillCircle(png, cx, cy, 48, 0x44, 0x66, 0x88, 20);

  // Main hull — asymmetric warship polygon (points down)
  fillPolygon(png, [
    [cx - 28, cy - 44],
    [cx + 28, cy - 44],
    [cx + 44, cy - 16],
    [cx + 44, cy + 8],
    [cx + 24, cy + 28],
    [cx, cy + 44],
    [cx - 24, cy + 28],
    [cx - 44, cy + 8],
    [cx - 44, cy - 16],
  ], 0x55, 0x66, 0x77);

  // Inner hull panel
  fillPolygon(png, [
    [cx - 16, cy - 32],
    [cx + 16, cy - 32],
    [cx + 28, cy - 8],
    [cx + 24, cy + 16],
    [cx, cy + 30],
    [cx - 24, cy + 16],
    [cx - 28, cy - 8],
  ], 0x44, 0x55, 0x66);

  // Hull seam lines
  drawLine(png, cx, cy - 40, cx, cy + 40, 0x33, 0x44, 0x55, 120, 1);
  drawLine(png, cx - 40, cy - 10, cx + 40, cy - 10, 0x33, 0x44, 0x55, 100, 1);
  drawLine(png, cx - 30, cy + 14, cx + 30, cy + 14, 0x33, 0x44, 0x55, 100, 1);

  // Weapon ports (left and right — orange active color)
  fillRect(png, cx - 46, cy - 6, 8, 8, 0xff, 0x88, 0x44);
  fillRect(png, cx + 38, cy - 6, 8, 8, 0xff, 0x88, 0x44);
  fillCircle(png, cx - 42, cy - 2, 3, 0xff, 0xcc, 0x88);
  fillCircle(png, cx + 42, cy - 2, 3, 0xff, 0xcc, 0x88);

  // Engine exhausts (top)
  fillEllipse(png, cx - 14, cy - 44, 7, 5, 0x44, 0xaa, 0xff, 200);
  fillEllipse(png, cx + 14, cy - 44, 7, 5, 0x44, 0xaa, 0xff, 200);
  fillEllipse(png, cx, cy - 46, 5, 4, 0x88, 0xcc, 0xff, 160);

  // Bridge sensor dome
  fillCircle(png, cx, cy - 14, 7, 0x44, 0x55, 0x66);
  fillCircle(png, cx, cy - 14, 4, 0x88, 0xaa, 0xcc);

  // Engine thrust ports (bottom)
  fillRect(png, cx - 14, cy + 28, 10, 12, 0xcc, 0x44, 0x22);
  fillRect(png, cx + 4, cy + 28, 10, 12, 0xcc, 0x44, 0x22);

  savePNG(png, "enemy_titan.png");
}

function generateBastion() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer shadow ring
  fillCircle(png, cx, cy, 50, 0x33, 0x33, 0x33, 30);

  // Octagonal armored body
  const sides = 8;
  const r = 40;
  const octPoints = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    octPoints.push([cx + r * Math.cos(angle), cy + r * 0.85 * Math.sin(angle)]);
  }
  fillPolygon(png, octPoints, 0x55, 0x55, 0x55);

  // Inner ring
  const r2 = 26;
  const innerPoints = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    innerPoints.push([cx + r2 * Math.cos(angle), cy + r2 * 0.85 * Math.sin(angle)]);
  }
  fillPolygon(png, innerPoints, 0x44, 0x44, 0x44);

  // Armor bolt details on each octagon face
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
    const bx = cx + (r - 8) * Math.cos(angle);
    const by = cy + (r - 8) * 0.85 * Math.sin(angle);
    fillCircle(png, bx, by, 2, 0x77, 0x77, 0x77);
  }

  // Turret barrel (pointing down)
  fillRect(png, cx - 3, cy - 4, 6, 36, 0xaa, 0x66, 0x22);
  // Turret base
  fillCircle(png, cx, cy, 10, 0xaa, 0x66, 0x22);
  fillCircle(png, cx, cy, 6, 0xcc, 0x88, 0x33);

  // Corner armor plates
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI * 2 / 4) * i + Math.PI / 4;
    const px = cx + 34 * Math.cos(angle);
    const py = cy + 34 * 0.85 * Math.sin(angle);
    fillCircle(png, px, py, 5, 0x66, 0x66, 0x66);
    fillCircle(png, px, py, 3, 0x44, 0x44, 0x44);
  }

  savePNG(png, "enemy_bastion.png");
}

function generateSiegeEngine() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Body — angular green octagon (points down)
  fillPolygon(png, [
    [cx - 16, cy - 44],
    [cx + 16, cy - 44],
    [cx + 40, cy - 26],
    [cx + 44, cy + 6],
    [cx + 24, cy + 44],
    [cx - 24, cy + 44],
    [cx - 44, cy + 6],
    [cx - 40, cy - 26],
  ], 0x33, 0x66, 0x33);

  // Inner hull
  fillPolygon(png, [
    [cx - 10, cy - 30],
    [cx + 10, cy - 30],
    [cx + 26, cy - 16],
    [cx + 28, cy + 6],
    [cx + 14, cy + 30],
    [cx - 14, cy + 30],
    [cx - 28, cy + 6],
    [cx - 26, cy - 16],
  ], 0x22, 0x55, 0x22);

  // Long cannon barrel (pointing down)
  fillRect(png, cx - 4, cy - 26, 8, 54, 0x22, 0x44, 0x22);
  fillRect(png, cx - 5, cy + 18, 10, 28, 0x1a, 0x33, 0x1a);

  // Charging energy core at cannon tip
  fillCircle(png, cx, cy + 46, 8, 0x44, 0xcc, 0x44, 180);
  fillCircle(png, cx, cy + 46, 5, 0x88, 0xff, 0x88, 220);
  fillCircle(png, cx, cy + 46, 2, 0xcc, 0xff, 0xcc);

  // Hull panel lines
  drawLine(png, cx - 36, cy - 16, cx + 36, cy - 16, 0x22, 0x55, 0x22, 120, 1);
  drawLine(png, cx - 38, cy + 4, cx + 38, cy + 4, 0x22, 0x55, 0x22, 100, 1);
  drawLine(png, cx - 28, cy + 20, cx + 28, cy + 20, 0x22, 0x55, 0x22, 100, 1);

  // Side weapons
  fillRect(png, cx - 46, cy - 12, 10, 6, 0x44, 0x88, 0x44);
  fillRect(png, cx + 36, cy - 12, 10, 6, 0x44, 0x88, 0x44);

  // Engine glow (top)
  fillEllipse(png, cx - 10, cy - 44, 7, 5, 0x44, 0xcc, 0x44, 180);
  fillEllipse(png, cx + 10, cy - 44, 7, 5, 0x44, 0xcc, 0x44, 180);

  savePNG(png, "enemy_siege_engine.png");
}

function generateColossus() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer glow ring (massive)
  fillCircle(png, cx, cy, 54, 0x44, 0x44, 0x55, 20);

  // Massive hull — wide fortress
  fillPolygon(png, [
    [cx, cy + 46],
    [cx - 24, cy + 36],
    [cx - 46, cy + 12],
    [cx - 46, cy - 22],
    [cx - 28, cy - 46],
    [cx + 28, cy - 46],
    [cx + 46, cy - 22],
    [cx + 46, cy + 12],
    [cx + 24, cy + 36],
  ], 0x44, 0x44, 0x55);

  // Armor plating seams
  drawLine(png, cx - 42, cy - 8, cx + 42, cy - 8, 0x33, 0x33, 0x44, 110, 2);
  drawLine(png, cx - 38, cy + 12, cx + 38, cy + 12, 0x33, 0x33, 0x44, 110, 2);
  // Energy seam (center, glowing blue)
  drawLine(png, cx - 30, cy, cx + 30, cy, 0x66, 0x66, 0xcc, 120, 2);

  // Inner hull panel
  fillPolygon(png, [
    [cx, cy + 30],
    [cx - 14, cy + 22],
    [cx - 30, cy + 6],
    [cx - 30, cy - 16],
    [cx - 16, cy - 30],
    [cx + 16, cy - 30],
    [cx + 30, cy - 16],
    [cx + 30, cy + 6],
    [cx + 14, cy + 22],
  ], 0x33, 0x33, 0x44);

  // Central missile launcher core
  fillCircle(png, cx, cy - 8, 8, 0x33, 0x33, 0x44);
  fillCircle(png, cx, cy - 8, 5, 0x66, 0x66, 0x88);

  // Side heavy cannons
  fillRect(png, cx - 48, cy - 12, 12, 8, 0x55, 0x55, 0x66);
  fillRect(png, cx + 36, cy - 12, 12, 8, 0x55, 0x55, 0x66);
  fillCircle(png, cx - 42, cy - 8, 4, 0x33, 0x33, 0x44);
  fillCircle(png, cx + 42, cy - 8, 4, 0x33, 0x33, 0x44);

  // Engine exhausts (top)
  fillEllipse(png, cx - 18, cy - 46, 8, 6, 0x88, 0x88, 0xcc, 200);
  fillEllipse(png, cx + 18, cy - 46, 8, 6, 0x88, 0x88, 0xcc, 200);
  fillEllipse(png, cx, cy - 48, 6, 5, 0xaa, 0xaa, 0xdd, 160);

  // Exhaust ports (bottom)
  fillRect(png, cx - 18, cy + 30, 12, 14, 0xcc, 0x44, 0x22);
  fillRect(png, cx + 6, cy + 30, 12, 14, 0xcc, 0x44, 0x22);

  savePNG(png, "enemy_colossus.png");
}

function generateWarden() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Shield aura glow
  fillCircle(png, cx, cy, 52, 0x33, 0x66, 0xaa, 20);

  // Main body — diamond/octagon shape (blue)
  fillPolygon(png, [
    [cx, cy - 44],
    [cx + 26, cy - 26],
    [cx + 44, cy],
    [cx + 26, cy + 26],
    [cx, cy + 44],
    [cx - 26, cy + 26],
    [cx - 44, cy],
    [cx - 26, cy - 26],
  ], 0x33, 0x66, 0xaa);

  // Inner hull
  fillPolygon(png, [
    [cx, cy - 28],
    [cx + 16, cy - 16],
    [cx + 28, cy],
    [cx + 16, cy + 16],
    [cx, cy + 28],
    [cx - 16, cy + 16],
    [cx - 28, cy],
    [cx - 16, cy - 16],
  ], 0x22, 0x55, 0x88);

  // Barrier emitter nodes (left and right)
  fillRect(png, cx - 48, cy - 6, 10, 10, 0x55, 0xcc, 0xff);
  fillRect(png, cx + 38, cy - 6, 10, 10, 0x55, 0xcc, 0xff);
  fillCircle(png, cx - 43, cy - 1, 5, 0x88, 0xee, 0xff);
  fillCircle(png, cx + 43, cy - 1, 5, 0x88, 0xee, 0xff);

  // Barrier field lines (horizontal beam)
  for (let bx = cx - 48; bx <= cx + 48; bx += 3) {
    setPixel(png, bx, cy + 44, 0x55, 0xcc, 0xff, 180);
    setPixel(png, bx + 1, cy + 44, 0x55, 0xcc, 0xff, 180);
    setPixel(png, bx, cy + 43, 0x33, 0xaa, 0xdd, 100);
    setPixel(png, bx, cy + 45, 0x33, 0xaa, 0xdd, 100);
  }

  // Central core
  fillCircle(png, cx, cy, 8, 0x22, 0x44, 0x77);
  fillCircle(png, cx, cy, 5, 0x44, 0x88, 0xcc);
  fillCircle(png, cx, cy, 2, 0x88, 0xcc, 0xff);

  // Hull panel lines
  drawLine(png, cx - 36, cy, cx + 36, cy, 0x22, 0x55, 0x88, 100, 1);
  drawLine(png, cx, cy - 36, cx, cy + 36, 0x22, 0x55, 0x88, 100, 1);

  // Engine glow (top)
  fillEllipse(png, cx, cy - 44, 8, 5, 0x44, 0x88, 0xcc, 180);

  savePNG(png, "enemy_warden.png");
}

function generateLeviathan() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer glow
  fillCircle(png, cx, cy, 52, 0x44, 0x55, 0x33, 20);

  // Massive body — wide carrier shape (olive/dark green)
  fillPolygon(png, [
    [cx - 20, cy - 46],
    [cx + 20, cy - 46],
    [cx + 38, cy - 26],
    [cx + 46, cy - 6],
    [cx + 46, cy + 28],
    [cx + 28, cy + 46],
    [cx - 28, cy + 46],
    [cx - 46, cy + 28],
    [cx - 46, cy - 6],
    [cx - 38, cy - 26],
  ], 0x44, 0x55, 0x33);

  // Inner hull
  fillPolygon(png, [
    [cx - 12, cy - 30],
    [cx + 12, cy - 30],
    [cx + 26, cy - 14],
    [cx + 30, cy + 4],
    [cx + 28, cy + 26],
    [cx + 14, cy + 36],
    [cx - 14, cy + 36],
    [cx - 28, cy + 26],
    [cx - 30, cy + 4],
    [cx - 26, cy - 14],
  ], 0x33, 0x44, 0x22);

  // Drone bay doors (left and right)
  fillRect(png, cx - 48, cy + 4, 10, 14, 0x55, 0x66, 0x44);
  fillRect(png, cx + 38, cy + 4, 10, 14, 0x55, 0x66, 0x44);
  // Bay glow (deploying indicator)
  fillCircle(png, cx - 43, cy + 11, 4, 0xcc, 0xaa, 0x22, 200);
  fillCircle(png, cx + 43, cy + 11, 4, 0xcc, 0xaa, 0x22, 200);

  // Hull seam lines
  drawLine(png, cx - 42, cy - 4, cx + 42, cy - 4, 0x33, 0x44, 0x22, 100, 1);
  drawLine(png, cx - 40, cy + 16, cx + 40, cy + 16, 0x33, 0x44, 0x22, 100, 1);

  // Command sensor dome (center top)
  fillCircle(png, cx, cy - 14, 6, 0x55, 0x66, 0x44);
  fillCircle(png, cx, cy - 14, 3, 0x88, 0xaa, 0x66);

  // Engine exhausts (top)
  fillEllipse(png, cx - 14, cy - 46, 8, 5, 0x55, 0xaa, 0x55, 190);
  fillEllipse(png, cx + 14, cy - 46, 8, 5, 0x55, 0xaa, 0x55, 190);
  fillEllipse(png, cx, cy - 48, 5, 4, 0x77, 0xcc, 0x77, 150);

  // Exhaust ports (bottom)
  fillRect(png, cx - 22, cy + 36, 12, 10, 0xcc, 0x44, 0x11);
  fillRect(png, cx + 10, cy + 36, 12, 10, 0xcc, 0x44, 0x11);

  savePNG(png, "enemy_leviathan.png");
}

// ═══════════════════════════════════════════════
// SPECIAL ENEMIES (Act 2) — unique mechanics
// ═══════════════════════════════════════════════

function generateSplitter() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Crescent / split-form body (teal)
  // Left wing
  fillPolygon(png, [
    [cx, cy - 36],
    [cx - 36, cy - 8],
    [cx - 44, cy + 28],
    [cx - 16, cy + 36],
    [cx, cy + 16],
  ], 0x22, 0xcc, 0xaa);
  // Right wing
  fillPolygon(png, [
    [cx, cy - 36],
    [cx + 36, cy - 8],
    [cx + 44, cy + 28],
    [cx + 16, cy + 36],
    [cx, cy + 16],
  ], 0x22, 0xcc, 0xaa);

  // Center seam (split line)
  drawLine(png, cx, cy - 36, cx, cy + 36, 0x88, 0xff, 0xdd, 180, 2);
  // Diagonal seam cross
  drawLine(png, cx - 14, cy - 16, cx + 14, cy + 24, 0x88, 0xff, 0xdd, 140, 1);
  drawLine(png, cx + 14, cy - 16, cx - 14, cy + 24, 0x88, 0xff, 0xdd, 140, 1);

  // Inner highlight
  fillPolygon(png, [
    [cx - 14, cy - 22],
    [cx - 28, cy + 2],
    [cx - 18, cy + 22],
    [cx - 4, cy + 10],
  ], 0x44, 0xee, 0xcc, 160);
  fillPolygon(png, [
    [cx + 14, cy - 22],
    [cx + 28, cy + 2],
    [cx + 18, cy + 22],
    [cx + 4, cy + 10],
  ], 0x44, 0xee, 0xcc, 160);

  // Core energy node
  fillCircle(png, cx, cy - 4, 6, 0x11, 0x88, 0x66);
  fillCircle(png, cx, cy - 4, 3, 0x66, 0xff, 0xcc);

  // Wing tip glows
  fillCircle(png, cx - 38, cy + 30, 4, 0x33, 0xee, 0xbb);
  fillCircle(png, cx + 38, cy + 30, 4, 0x33, 0xee, 0xbb);

  savePNG(png, "enemy_splitter.png");
}

function generateSplitterMinor() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Small teal triangle (half of parent)
  fillPolygon(png, [
    [cx, cy - 22],
    [cx + 22, cy + 22],
    [cx - 22, cy + 22],
  ], 0x1a, 0x99, 0x80);

  // Inner triangle highlight
  fillPolygon(png, [
    [cx, cy - 12],
    [cx + 12, cy + 16],
    [cx - 12, cy + 16],
  ], 0x22, 0xbb, 0x99, 160);

  // Center core
  fillCircle(png, cx, cy + 4, 4, 0x11, 0x77, 0x66);
  fillCircle(png, cx, cy + 4, 2, 0x44, 0xcc, 0xaa);

  savePNG(png, "enemy_splitter_minor.png");
}

function generateHealer() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Outer pulse ring
  fillCircle(png, cx, cy, 46, 0x44, 0xcc, 0x66, 25);
  fillCircle(png, cx, cy, 38, 0x44, 0xcc, 0x66, 35);

  // Main body — green circle
  fillCircle(png, cx, cy, 32, 0x44, 0xcc, 0x66);

  // Rim highlight
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    const rx = cx + Math.cos(angle) * 30;
    const ry = cy + Math.sin(angle) * 30;
    setPixel(png, Math.round(rx), Math.round(ry), 0x66, 0xee, 0x88, 180);
  }

  // Medical cross (white)
  const cw = 10, ch = 22;
  fillRect(png, cx - cw / 2, cy - ch / 2, cw, ch, 0xff, 0xff, 0xff);
  fillRect(png, cx - ch / 2, cy - cw / 2, ch, cw, 0xff, 0xff, 0xff);

  // Cross inner highlight
  fillRect(png, cx - 3, cy - 8, 6, 16, 0xcc, 0xff, 0xdd);
  fillRect(png, cx - 8, cy - 3, 16, 6, 0xcc, 0xff, 0xdd);

  // Inner circle shadow
  fillCircle(png, cx, cy, 14, 0x33, 0xaa, 0x55);

  // Heal pulse arcs (decorative)
  for (let angle = Math.PI * 0.25; angle < Math.PI * 2; angle += Math.PI * 0.5) {
    const ax = cx + Math.cos(angle) * 24;
    const ay = cy + Math.sin(angle) * 24;
    fillCircle(png, ax, ay, 3, 0x88, 0xff, 0xaa, 160);
  }

  savePNG(png, "enemy_healer.png");
}

function generateTeleporter() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Portal aura rings
  for (let angle = 0; angle < Math.PI * 2; angle += 0.04) {
    setPixel(png, Math.round(cx + Math.cos(angle) * 44), Math.round(cy + Math.sin(angle) * 44), 0xaa, 0x44, 0xff, 60);
    setPixel(png, Math.round(cx + Math.cos(angle) * 36), Math.round(cy + Math.sin(angle) * 36), 0xaa, 0x44, 0xff, 50);
  }

  // Main body — purple diamond
  fillPolygon(png, [
    [cx, cy - 38],
    [cx + 32, cy],
    [cx + 22, cy + 32],
    [cx - 22, cy + 32],
    [cx - 32, cy],
  ], 0xaa, 0x44, 0xff);

  // Inner hull panel
  fillPolygon(png, [
    [cx, cy - 24],
    [cx + 20, cy],
    [cx + 14, cy + 20],
    [cx - 14, cy + 20],
    [cx - 20, cy],
  ], 0x88, 0x22, 0xdd, 180);

  // Portal ring (center)
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    const rx = cx + Math.cos(angle) * 14;
    const ry = cy + Math.sin(angle) * 14;
    setPixel(png, Math.round(rx), Math.round(ry), 0xdd, 0x88, 0xff, 200);
    setPixel(png, Math.round(rx + Math.cos(angle)), Math.round(ry + Math.sin(angle)), 0xdd, 0x88, 0xff, 100);
  }

  // Core node
  fillCircle(png, cx, cy, 5, 0xcc, 0x66, 0xff);
  fillCircle(png, cx, cy, 2, 0xff, 0xcc, 0xff);

  // Corner energy nodes
  for (const [dx, dy] of [[0, -36], [30, 0], [0, 30], [-30, 0]]) {
    fillCircle(png, cx + dx, cy + dy, 3, 0xcc, 0x88, 0xff);
  }

  savePNG(png, "enemy_teleporter.png");
}

function generateMimic() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Shimmer aura
  fillCircle(png, cx, cy, 42, 0xcc, 0xcc, 0xff, 20);

  // Body — pale silver/grey triangle (shapeshifter appearance)
  fillPolygon(png, [
    [cx - 36, cy - 36],
    [cx + 36, cy - 36],
    [cx, cy + 36],
  ], 0xcc, 0xcc, 0xdd);

  // Outline highlight
  drawLine(png, cx - 36, cy - 36, cx + 36, cy - 36, 0xdd, 0xdd, 0xef, 200, 2);
  drawLine(png, cx + 36, cy - 36, cx, cy + 36, 0xdd, 0xdd, 0xef, 200, 2);
  drawLine(png, cx, cy + 36, cx - 36, cy - 36, 0xdd, 0xdd, 0xef, 200, 2);

  // Distortion shimmer lines
  for (let i = 0; i < 4; i++) {
    const oy = -20 + i * 12;
    const alpha = 80 + i * 20;
    drawLine(png, cx - 22 + i * 2, cy + oy, cx + 22 - i * 2, cy + oy, 0xee, 0xee, 0xff, alpha, 1);
  }

  // Phase sensor eye
  fillCircle(png, cx, cy - 10, 4, 0xbb, 0xbb, 0xcc);
  fillCircle(png, cx, cy - 10, 2, 0xee, 0xee, 0xff);

  // Corner mimicry nodes
  fillCircle(png, cx - 30, cy - 30, 3, 0xcc, 0xcc, 0xee);
  fillCircle(png, cx + 30, cy - 30, 3, 0xcc, 0xcc, 0xee);
  fillCircle(png, cx, cy + 30, 3, 0xcc, 0xcc, 0xee);

  savePNG(png, "enemy_mimic.png");
}

function generateKamikaze() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // Engine fire glow (top — exhaust)
  fillCircle(png, cx, cy - 36, 16, 0xff, 0x88, 0x00, 50);
  fillCircle(png, cx, cy - 36, 10, 0xff, 0xaa, 0x44, 90);

  // Main warhead body — red pointed shape (pointing down)
  fillPolygon(png, [
    [cx, cy + 44],  // nose tip (pointing down)
    [cx + 28, cy + 16],
    [cx + 44, cy - 8],
    [cx + 36, cy - 26],
    [cx - 36, cy - 26],
    [cx - 44, cy - 8],
    [cx - 28, cy + 16],
  ], 0xcc, 0x33, 0x00);

  // Inner fuselage
  fillPolygon(png, [
    [cx, cy + 36],
    [cx + 18, cy + 12],
    [cx + 28, cy - 8],
    [cx + 22, cy - 20],
    [cx - 22, cy - 20],
    [cx - 28, cy - 8],
    [cx - 18, cy + 12],
  ], 0xaa, 0x22, 0x00);

  // Warhead nose highlight
  fillPolygon(png, [
    [cx, cy + 44],
    [cx + 10, cy + 22],
    [cx - 10, cy + 22],
  ], 0xff, 0xcc, 0x44);

  // Orange nose glow
  fillCircle(png, cx, cy + 42, 6, 0xff, 0x88, 0x00, 200);
  fillCircle(png, cx, cy + 42, 3, 0xff, 0xcc, 0x88);

  // Engine exhausts (top)
  fillEllipse(png, cx - 12, cy - 28, 7, 10, 0xff, 0x66, 0x00, 200);
  fillEllipse(png, cx + 12, cy - 28, 7, 10, 0xff, 0x66, 0x00, 200);
  fillEllipse(png, cx, cy - 30, 5, 8, 0xff, 0xaa, 0x44, 160);

  // Wing fins
  fillPolygon(png, [
    [cx - 28, cy + 16],
    [cx - 44, cy - 8],
    [cx - 42, cy - 22],
    [cx - 26, cy + 2],
  ], 0xdd, 0x44, 0x11);
  fillPolygon(png, [
    [cx + 28, cy + 16],
    [cx + 44, cy - 8],
    [cx + 42, cy - 22],
    [cx + 26, cy + 2],
  ], 0xdd, 0x44, 0x11);

  // Hull band lines
  drawLine(png, cx - 28, cy - 4, cx + 28, cy - 4, 0xaa, 0x22, 0x00, 140, 1);
  drawLine(png, cx - 22, cy + 8, cx + 22, cy + 8, 0xaa, 0x22, 0x00, 120, 1);

  savePNG(png, "enemy_kamikaze.png");
}

function generateJammer() {
  const png = createPNG();
  const cx = 64, cy = 64;

  // ECM field rings (red expanding)
  for (let r = 20; r <= 52; r += 16) {
    const alpha = Math.round(60 * (1 - (r - 20) / 36));
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      setPixel(png, Math.round(cx + Math.cos(angle) * r), Math.round(cy + Math.sin(angle) * r), 0xff, 0x3c, 0x3c, alpha);
    }
  }

  // Main body — olive/dark yellow, wide trapezoidal dish shape
  fillPolygon(png, [
    [cx - 44, cy - 16],
    [cx - 40, cy - 44],
    [cx + 40, cy - 44],
    [cx + 44, cy - 16],
    [cx + 44, cy + 24],
    [cx + 28, cy + 44],
    [cx - 28, cy + 44],
    [cx - 44, cy + 24],
  ], 0x66, 0x66, 0x44);

  // Inner hull
  fillPolygon(png, [
    [cx - 30, cy - 10],
    [cx - 28, cy - 32],
    [cx + 28, cy - 32],
    [cx + 30, cy - 10],
    [cx + 28, cy + 20],
    [cx + 16, cy + 32],
    [cx - 16, cy + 32],
    [cx - 28, cy + 20],
  ], 0x55, 0x55, 0x33);

  // Antenna array (top)
  drawLine(png, cx - 24, cy - 42, cx - 24, cy - 54, 0x88, 0x88, 0x66, 220, 2);
  drawLine(png, cx, cy - 44, cx, cy - 58, 0x88, 0x88, 0x66, 220, 2);
  drawLine(png, cx + 24, cy - 42, cx + 24, cy - 54, 0x88, 0x88, 0x66, 220, 2);
  // Antenna tips
  fillCircle(png, cx - 24, cy - 54, 3, 0xff, 0x3c, 0x3c, 200);
  fillCircle(png, cx, cy - 58, 3, 0xff, 0x3c, 0x3c, 200);
  fillCircle(png, cx + 24, cy - 54, 3, 0xff, 0x3c, 0x3c, 200);

  // ECM core emitter
  fillCircle(png, cx, cy, 8, 0x55, 0x55, 0x33);
  fillCircle(png, cx, cy, 4, 0xff, 0x3c, 0x3c, 200);

  // Hull panel lines
  drawLine(png, cx - 38, cy - 28, cx + 38, cy - 28, 0x44, 0x44, 0x22, 100, 1);
  drawLine(png, cx - 36, cy + 6, cx + 36, cy + 6, 0x44, 0x44, 0x22, 100, 1);

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
