const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/raptor/terrain');

function setPixel(png, x, y, r, g, b, a) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
  const idx = (png.width * y + x) * 4;
  if (a < 255 && png.data[idx + 3] > 0) {
    const srcA = a / 255;
    const dstA = png.data[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);
    if (outA > 0) {
      png.data[idx] = Math.round((r * srcA + png.data[idx] * dstA * (1 - srcA)) / outA);
      png.data[idx + 1] = Math.round((g * srcA + png.data[idx + 1] * dstA * (1 - srcA)) / outA);
      png.data[idx + 2] = Math.round((b * srcA + png.data[idx + 2] * dstA * (1 - srcA)) / outA);
      png.data[idx + 3] = Math.round(outA * 255);
    }
  } else {
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
  }
}

function clamp(v, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function noise(x, y, seed = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, scale, seed = 0) {
  const sx = x / scale;
  const sy = y / scale;
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  const fx = sx - ix;
  const fy = sy - iy;
  const a = noise(ix, iy, seed);
  const b = noise(ix + 1, iy, seed);
  const c = noise(ix, iy + 1, seed);
  const d = noise(ix + 1, iy + 1, seed);
  const ab = a + (b - a) * fx;
  const cd = c + (d - c) * fx;
  return ab + (cd - ab) * fy;
}

function fbm(x, y, octaves, scale, seed = 0) {
  let val = 0, amp = 1, freq = 1, maxAmp = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, scale, seed + i * 100) * amp;
    maxAmp += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val / maxAmp;
}

function drawFilledCircle(png, cx, cy, r, r_, g_, b_, a_) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const dist = Math.sqrt(dx * dx + dy * dy) / r;
        const alpha = clamp(a_ * (1 - dist * dist));
        setPixel(png, cx + dx, cy + dy, r_, g_, b_, alpha);
      }
    }
  }
}

function drawEllipse(png, cx, cy, rx, ry, r_, g_, b_, a_) {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (dist <= 1) {
        const fade = 1 - dist;
        setPixel(png, cx + dx, cy + dy, r_, g_, b_, clamp(a_ * fade));
      }
    }
  }
}

function drawLine(png, x0, y0, x1, y1, r, g, b, a, thickness = 1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);
    for (let ty = -Math.floor(thickness / 2); ty <= Math.floor(thickness / 2); ty++) {
      for (let tx = -Math.floor(thickness / 2); tx <= Math.floor(thickness / 2); tx++) {
        setPixel(png, x + tx, y + ty, r, g, b, a);
      }
    }
  }
}

function savePNG(png, filename) {
  const filePath = path.join(OUTPUT_DIR, filename);
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`Created ${filename} (${buffer.length} bytes)`);
}

function createPNG(w, h) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 0;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 0;
  }
  return png;
}

// ═══════════════════════════════════════════════
// LEVEL 13: NEBULA ASSETS
// ═══════════════════════════════════════════════

function createHorizonNebula() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;
      const n1 = fbm(x, y, 5, 60, 1);
      const n2 = fbm(x + 200, y + 100, 4, 40, 2);
      const n3 = fbm(x * 0.5, y * 0.8, 3, 80, 3);

      let r = clamp(10 + n1 * 60 + n2 * 30);
      let g = clamp(5 + n1 * 20 + n3 * 40);
      let b = clamp(32 + n1 * 80 + n2 * 60 + n3 * 40);

      // Purple/blue cloud bands
      const band = Math.sin(y * 0.05 + n1 * 3) * 0.5 + 0.5;
      r = clamp(r + band * 40);
      g = clamp(g + band * 10);
      b = clamp(b + band * 50);

      // Stars
      const starChance = noise(x * 3, y * 3, 99);
      if (starChance > 0.985) {
        const brightness = 150 + starChance * 105;
        r = clamp(brightness);
        g = clamp(brightness * 0.9);
        b = clamp(brightness);
      }

      // Swirling gas at horizon line
      const horizonGlow = Math.exp(-((y - 150) * (y - 150)) / 800);
      r = clamp(r + horizonGlow * 50 * n2);
      g = clamp(g + horizonGlow * 20);
      b = clamp(b + horizonGlow * 70 * n1);

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_nebula.png');
}

function createGroundVoid() {
  const png = createPNG(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n1 = fbm(x, y, 4, 32, 10);
      const n2 = fbm(x + 500, y + 500, 3, 64, 11);
      const n3 = fbm(x * 2, y * 2, 2, 16, 12);

      let r = clamp(18 + n1 * 20 + n3 * 8);
      let g = clamp(8 + n1 * 12 + n2 * 8);
      let b = clamp(35 + n1 * 30 + n2 * 20 + n3 * 10);

      // Faint nebula glow patches
      const glowPatch = fbm(x * 0.3, y * 0.3, 2, 100, 13);
      if (glowPatch > 0.55) {
        const intensity = (glowPatch - 0.55) * 4;
        r = clamp(r + intensity * 25);
        g = clamp(g + intensity * 10);
        b = clamp(b + intensity * 35);
      }

      // Edge matching for tileability (blend at edges)
      setPixel(png, x, y, r, g, b, 255);
    }
  }

  // Ensure tileable by blending edges
  const blendWidth = 16;
  const copy = createPNG(256, 256);
  for (let i = 0; i < png.data.length; i++) copy.data[i] = png.data[i];

  for (let y = 0; y < 256; y++) {
    for (let bx = 0; bx < blendWidth; bx++) {
      const t = bx / blendWidth;
      const li = (256 * y + bx) * 4;
      const ri = (256 * y + (255 - bx)) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = Math.round((copy.data[li + c] + copy.data[ri + c]) / 2);
        png.data[li + c] = clamp(copy.data[li + c] * (1 - t * 0.5) + avg * t * 0.5);
        png.data[ri + c] = clamp(copy.data[ri + c] * (1 - t * 0.5) + avg * t * 0.5);
      }
    }
  }
  for (let x = 0; x < 256; x++) {
    for (let by = 0; by < blendWidth; by++) {
      const t = by / blendWidth;
      const ti = (256 * by + x) * 4;
      const bi = (256 * (255 - by) + x) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = Math.round((png.data[ti + c] + png.data[bi + c]) / 2);
        png.data[ti + c] = clamp(png.data[ti + c] * (1 - t * 0.5) + avg * t * 0.5);
        png.data[bi + c] = clamp(png.data[bi + c] * (1 - t * 0.5) + avg * t * 0.5);
      }
    }
  }

  savePNG(png, 'ground_void.png');
}

function createStructGasPocket() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Outer haze layer for better coverage - use higher alpha to ensure > 128 threshold
  drawEllipse(png, cx, cy, 58, 52, 50, 25, 100, 100);
  drawEllipse(png, cx - 8, cy + 5, 52, 48, 45, 22, 90, 80);
  drawEllipse(png, cx + 6, cy - 5, 50, 46, 55, 28, 95, 70);
  drawEllipse(png, cx, cy, 45, 40, 60, 30, 110, 120);

  // Main gas cloud - layered ellipses
  for (let layer = 0; layer < 7; layer++) {
    const rx = 50 - layer * 4 + noise(layer, 0, 20) * 10;
    const ry = 42 - layer * 3 + noise(layer, 1, 20) * 8;
    const ox = (noise(layer, 2, 20) - 0.5) * 12;
    const oy = (noise(layer, 3, 20) - 0.5) * 10;
    const intensity = 0.35 + layer * 0.1;
    drawEllipse(png, cx + ox, cy + oy, rx, ry,
      clamp(60 + layer * 18), clamp(30 + layer * 10), clamp(120 + layer * 20),
      clamp(intensity * 255));
  }

  // Brighter core
  drawEllipse(png, cx, cy, 20, 16, 100, 60, 180, 200);
  drawEllipse(png, cx, cy, 10, 8, 140, 90, 220, 180);

  // Wisps extending out with more thickness
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + noise(i, 0, 30) * 0.5;
    const length = 25 + noise(i, 1, 30) * 25;
    for (let t = 0; t < length; t++) {
      const wobble = Math.sin(t * 0.3 + i) * 4;
      const wx = cx + Math.cos(angle) * (18 + t) + Math.sin(angle) * wobble;
      const wy = cy + Math.sin(angle) * (14 + t) + Math.cos(angle) * wobble;
      const fade = 1 - t / length;
      for (let w = -2; w <= 2; w++) {
        const wFade = 1 - Math.abs(w) / 3;
        setPixel(png, Math.round(wx + Math.sin(angle) * w), Math.round(wy + Math.cos(angle) * w),
          clamp(80 + t * 2), clamp(40 + t), clamp(150 + t),
          clamp(fade * wFade * 140));
      }
    }
  }

  savePNG(png, 'struct_gas_pocket.png');
}

function createStructSensorBuoy() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 60;

  // Antenna mast
  drawLine(png, cx, 20, cx, 80, 80, 90, 110, 255, 2);
  drawLine(png, cx - 1, 20, cx - 1, 80, 60, 70, 90, 200, 1);

  // Main body - hexagonal-ish shape
  for (let dy = -12; dy <= 12; dy++) {
    const widthAtY = Math.round(16 - Math.abs(dy) * 0.8);
    for (let dx = -widthAtY; dx <= widthAtY; dx++) {
      const shade = 60 + Math.abs(dx) * 2 + Math.abs(dy);
      setPixel(png, cx + dx, cy + dy,
        clamp(shade * 0.6), clamp(shade * 0.7), clamp(shade * 1.1), 255);
    }
  }

  // Panel details
  for (let dy = -8; dy <= 8; dy += 4) {
    for (let dx = -10; dx <= 10; dx++) {
      const shade = 40 + Math.abs(dx) * 3;
      setPixel(png, cx + dx, cy + dy,
        clamp(shade * 0.5), clamp(shade * 0.6), clamp(shade), 255);
    }
  }

  // Blinking lights (bright spots) - must have brightness > 200
  for (const [lx, ly, lr, lg, lb] of [
    [cx - 6, cy - 4, 220, 180, 255],
    [cx + 6, cy - 4, 180, 220, 255],
    [cx, cy + 6, 255, 200, 240],
    [cx, 20, 255, 255, 255],
  ]) {
    drawFilledCircle(png, lx, ly, 3, lr, lg, lb, 255);
    drawFilledCircle(png, lx, ly, 5, lr, lg, lb, 80);
  }

  // Solar panel arms
  for (const side of [-1, 1]) {
    drawLine(png, cx + side * 16, cy - 2, cx + side * 35, cy - 8, 70, 80, 100, 255, 3);
    // Panel - larger
    for (let dy = -8; dy <= 8; dy++) {
      for (let dx = 0; dx < 22; dx++) {
        const panelShade = 50 + (dx % 4 === 0 ? 20 : 0) + (Math.abs(dy) < 2 ? 10 : 0);
        const px = side > 0 ? cx + 35 + dx : cx - 35 - dx;
        setPixel(png, px, cy - 8 + dy,
          clamp(panelShade * 0.4), clamp(panelShade * 0.5), clamp(panelShade * 0.9), 230);
      }
    }
  }

  // Lower antenna/base structure
  for (let dy = 0; dy < 25; dy++) {
    const baseWidth = 10 - dy * 0.2;
    for (let dx = -baseWidth; dx <= baseWidth; dx++) {
      const shade = 55 + Math.abs(dx) * 2;
      setPixel(png, Math.round(cx + dx), 80 + dy,
        clamp(shade * 0.5), clamp(shade * 0.6), clamp(shade * 0.9), 240);
    }
  }

  // Antenna dish at top
  for (let dy = -5; dy <= 0; dy++) {
    const w = Math.round(5 + dy * 0.8);
    for (let dx = -w; dx <= w; dx++) {
      setPixel(png, cx + dx, 18 + dy, 100, 110, 140, 230);
    }
  }

  // Glow around buoy
  for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
    for (let r = 20; r < 30; r++) {
      const gx = cx + Math.cos(angle) * r;
      const gy = cy + Math.sin(angle) * r;
      const fade = 1 - (r - 20) / 10;
      setPixel(png, Math.round(gx), Math.round(gy), 80, 60, 180, clamp(fade * 40));
    }
  }

  savePNG(png, 'struct_sensor_buoy.png');
}

function createStructDebrisCluster() {
  const png = createPNG(128, 128);

  // Multiple debris pieces - larger for better coverage
  const pieces = [
    { x: 40, y: 45, w: 35, h: 22, angle: 0.3, color: [90, 95, 110] },
    { x: 80, y: 55, w: 28, h: 24, angle: -0.2, color: [80, 85, 100] },
    { x: 55, y: 78, w: 36, h: 16, angle: 0.5, color: [70, 75, 95] },
    { x: 90, y: 35, w: 24, h: 18, angle: -0.4, color: [85, 90, 105] },
    { x: 45, y: 28, w: 22, h: 16, angle: 0.1, color: [75, 80, 100] },
    { x: 70, y: 90, w: 26, h: 14, angle: -0.6, color: [65, 70, 90] },
    { x: 30, y: 65, w: 20, h: 14, angle: 0.4, color: [82, 88, 108] },
    { x: 95, y: 70, w: 18, h: 12, angle: -0.3, color: [72, 78, 96] },
  ];

  for (const piece of pieces) {
    const cos = Math.cos(piece.angle);
    const sin = Math.sin(piece.angle);
    for (let dy = -piece.h / 2; dy <= piece.h / 2; dy++) {
      for (let dx = -piece.w / 2; dx <= piece.w / 2; dx++) {
        const rx = Math.round(piece.x + dx * cos - dy * sin);
        const ry = Math.round(piece.y + dx * sin + dy * cos);
        const edgeDist = Math.min(
          dx + piece.w / 2, piece.w / 2 - dx,
          dy + piece.h / 2, piece.h / 2 - dy
        );
        const edgeFade = Math.min(1, edgeDist / 2);
        const detailNoise = noise(dx * 3, dy * 3, piece.x) * 30 - 15;
        setPixel(png, rx, ry,
          clamp(piece.color[0] + detailNoise),
          clamp(piece.color[1] + detailNoise),
          clamp(piece.color[2] + detailNoise),
          clamp(edgeFade * 255));
      }
    }

    // Scorch marks / damage details
    for (let i = 0; i < 3; i++) {
      const sx = piece.x + (noise(i, piece.x, 40) - 0.5) * piece.w * 0.6;
      const sy = piece.y + (noise(i, piece.y, 40) - 0.5) * piece.h * 0.6;
      drawFilledCircle(png, Math.round(sx), Math.round(sy), 2,
        clamp(piece.color[0] * 0.5), clamp(piece.color[1] * 0.5), clamp(piece.color[2] * 0.5), 200);
    }

    // Bright highlights on edges (for lit structure requirement > 150)
    const hx = piece.x + piece.w / 3;
    const hy = piece.y - piece.h / 3;
    setPixel(png, Math.round(hx), Math.round(hy), 200, 190, 220, 255);
    setPixel(png, Math.round(hx) + 1, Math.round(hy), 180, 170, 210, 255);
  }

  // Bright sparks/glints (brightness > 150)
  for (let i = 0; i < 6; i++) {
    const sx = 30 + noise(i, 0, 50) * 70;
    const sy = 25 + noise(i, 1, 50) * 70;
    drawFilledCircle(png, Math.round(sx), Math.round(sy), 2, 200, 180, 240, 255);
    drawFilledCircle(png, Math.round(sx), Math.round(sy), 4, 160, 140, 210, 80);
  }

  // Floating particles around debris
  for (let i = 0; i < 15; i++) {
    const px = 15 + noise(i, 0, 60) * 98;
    const py = 15 + noise(i, 1, 60) * 98;
    setPixel(png, Math.round(px), Math.round(py), 100, 80, 160, 120);
  }

  savePNG(png, 'struct_debris_cluster.png');
}

function createPropNebulaWisp() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Background haze for coverage
  drawEllipse(png, cx, cy, 28, 26, 60, 35, 120, 25);

  // Main wisp tendril - curved path, wider
  for (let t = 0; t < 60; t++) {
    const progress = t / 60;
    const wx = cx + Math.sin(progress * Math.PI * 2) * 16 + Math.cos(progress * 3) * 5;
    const wy = 4 + t * 0.95;
    const width = 5 + Math.sin(progress * Math.PI) * 7;
    const fade = Math.sin(progress * Math.PI);

    for (let dx = -width; dx <= width; dx++) {
      const dist = Math.abs(dx) / width;
      const alpha = fade * (1 - dist * dist) * 200;
      setPixel(png, Math.round(wx + dx), Math.round(wy),
        clamp(90 + progress * 40), clamp(50 + progress * 30), clamp(170 + progress * 30),
        clamp(alpha));
    }
  }

  // Secondary wisp - wider
  for (let t = 0; t < 50; t++) {
    const progress = t / 50;
    const wx = cx + 6 + Math.cos(progress * Math.PI * 1.5) * 12;
    const wy = 10 + t * 0.9;
    const width = 4 + Math.sin(progress * Math.PI) * 5;
    const fade = Math.sin(progress * Math.PI);

    for (let dx = -width; dx <= width; dx++) {
      const dist = Math.abs(dx) / width;
      const alpha = fade * (1 - dist) * 140;
      setPixel(png, Math.round(wx + dx), Math.round(wy),
        clamp(70 + progress * 30), clamp(90 + progress * 50), clamp(190 + progress * 30),
        clamp(alpha));
    }
  }

  // Third wisp on the left
  for (let t = 0; t < 35; t++) {
    const progress = t / 35;
    const wx = cx - 8 + Math.sin(progress * Math.PI * 1.2) * 8;
    const wy = 14 + t * 0.95;
    const width = 3 + Math.sin(progress * Math.PI) * 4;
    const fade = Math.sin(progress * Math.PI);
    for (let dx = -width; dx <= width; dx++) {
      const dist = Math.abs(dx) / width;
      setPixel(png, Math.round(wx + dx), Math.round(wy),
        clamp(80 + progress * 25), clamp(60 + progress * 40), clamp(160 + progress * 35),
        clamp(fade * (1 - dist) * 130));
    }
  }

  // Bright core points
  for (const [bx, by] of [[cx - 2, 28], [cx + 5, 35], [cx, 42], [cx - 6, 20], [cx + 8, 46]]) {
    drawFilledCircle(png, bx, by, 3, 140, 100, 220, 200);
  }

  savePNG(png, 'prop_nebula_wisp.png');
}

// ═══════════════════════════════════════════════
// LEVEL 14: JUNGLE ASSETS
// ═══════════════════════════════════════════════

function createHorizonJungle() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;

      // Sky gradient - dark green
      let r = clamp(42 * (1 - t) + 20 * t);
      let g = clamp(74 * (1 - t) + 50 * t);
      let b = clamp(26 * (1 - t) + 15 * t);

      // Distant canopy silhouettes
      const canopyHeight = 80 + Math.sin(x * 0.02) * 20 + Math.sin(x * 0.05) * 15
        + Math.sin(x * 0.11) * 10 + fbm(x, 0, 3, 50, 5) * 30;

      if (y > canopyHeight) {
        const depth = (y - canopyHeight) / (200 - canopyHeight);
        const treeNoise = fbm(x, y, 3, 20, 6);
        r = clamp(15 + treeNoise * 20 + depth * 10);
        g = clamp(35 + treeNoise * 40 + depth * 15);
        b = clamp(10 + treeNoise * 12 + depth * 5);

        // Bioluminescent highlights in canopy
        const glowN = noise(x * 0.05, y * 0.05, 7);
        if (glowN > 0.8) {
          const intensity = (glowN - 0.8) * 5;
          g = clamp(g + intensity * 60);
          b = clamp(b + intensity * 30);
        }
      }

      // Canopy edge detail
      const edgeDist = Math.abs(y - canopyHeight);
      if (edgeDist < 8) {
        const edgeIntensity = 1 - edgeDist / 8;
        g = clamp(g + edgeIntensity * 30);
      }

      // Towering tree trunks in background
      for (let ti = 0; ti < 6; ti++) {
        const treeX = 80 + ti * 130 + noise(ti, 0, 8) * 40;
        const trunkWidth = 8 + noise(ti, 1, 8) * 6;
        if (Math.abs(x - treeX) < trunkWidth && y > 30) {
          const trunkShade = 0.7 + noise(x, y, 9 + ti) * 0.3;
          r = clamp(20 * trunkShade);
          g = clamp(40 * trunkShade);
          b = clamp(15 * trunkShade);
        }
      }

      // Atmospheric haze
      const haze = t * 0.15;
      r = clamp(r + haze * 20);
      g = clamp(g + haze * 50);
      b = clamp(b + haze * 20);

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_jungle.png');
}

function createGroundMoss() {
  const png = createPNG(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n1 = fbm(x, y, 4, 32, 20);
      const n2 = fbm(x + 300, y + 300, 3, 48, 21);
      const n3 = fbm(x * 2, y * 2, 2, 16, 22);

      let r = clamp(20 + n1 * 15 + n3 * 8);
      let g = clamp(45 + n1 * 35 + n2 * 20 + n3 * 10);
      let b = clamp(18 + n1 * 10 + n2 * 8);

      // Moss patches (brighter green areas)
      const mossPatch = fbm(x * 0.5, y * 0.5, 2, 60, 23);
      if (mossPatch > 0.5) {
        const intensity = (mossPatch - 0.5) * 3;
        r = clamp(r + intensity * 5);
        g = clamp(g + intensity * 25);
        b = clamp(b + intensity * 8);
      }

      // Tiny bioluminescent specks
      const speck = noise(x * 5, y * 5, 24);
      if (speck > 0.97) {
        g = clamp(g + 40);
        b = clamp(b + 25);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }

  // Tileable blending
  const blendWidth = 20;
  const copy = createPNG(256, 256);
  for (let i = 0; i < png.data.length; i++) copy.data[i] = png.data[i];

  for (let y = 0; y < 256; y++) {
    for (let bx = 0; bx < blendWidth; bx++) {
      const t = bx / blendWidth;
      const li = (256 * y + bx) * 4;
      const ri = (256 * y + (255 - bx)) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = Math.round((copy.data[li + c] + copy.data[ri + c]) / 2);
        png.data[li + c] = clamp(copy.data[li + c] * (1 - t * 0.5) + avg * t * 0.5);
        png.data[ri + c] = clamp(copy.data[ri + c] * (1 - t * 0.5) + avg * t * 0.5);
      }
    }
  }
  for (let x = 0; x < 256; x++) {
    for (let by = 0; by < blendWidth; by++) {
      const t = by / blendWidth;
      const ti = (256 * by + x) * 4;
      const bi = (256 * (255 - by) + x) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = Math.round((png.data[ti + c] + png.data[bi + c]) / 2);
        png.data[ti + c] = clamp(png.data[ti + c] * (1 - t * 0.5) + avg * t * 0.5);
        png.data[bi + c] = clamp(png.data[bi + c] * (1 - t * 0.5) + avg * t * 0.5);
      }
    }
  }

  savePNG(png, 'ground_moss.png');
}

function createStructGiantFern() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Main trunk/stipe - thick, organic
  for (let y = 120; y > 15; y--) {
    const progress = 1 - (y - 15) / 105;
    const trunkWidth = 5 - progress * 2.5;
    const sway = Math.sin(y * 0.08) * 3 * progress;
    for (let dx = -trunkWidth; dx <= trunkWidth; dx++) {
      const dist = Math.abs(dx) / trunkWidth;
      const shade = 0.8 + dist * 0.2;
      setPixel(png, Math.round(cx + sway + dx), y,
        clamp(25 * shade), clamp(55 * shade), clamp(20 * shade), 255);
    }
  }

  // Fronds - multiple large leaves radiating from top, wider for coverage
  const frondDefs = [
    { startY: 18, angle: -0.8, length: 52, side: -1 },
    { startY: 22, angle: -0.65, length: 55, side: 1 },
    { startY: 30, angle: -0.55, length: 50, side: -1 },
    { startY: 35, angle: -0.45, length: 54, side: 1 },
    { startY: 42, angle: -0.35, length: 45, side: -1 },
    { startY: 48, angle: -0.25, length: 48, side: 1 },
    { startY: 55, angle: -0.2, length: 40, side: -1 },
    { startY: 60, angle: -0.15, length: 38, side: 1 },
    { startY: 68, angle: -0.1, length: 32, side: -1 },
    { startY: 73, angle: -0.08, length: 28, side: 1 },
  ];

  for (const frond of frondDefs) {
    const baseX = cx + Math.sin(frond.startY * 0.08) * 3;
    for (let t = 0; t < frond.length; t++) {
      const progress = t / frond.length;
      const fx = baseX + frond.side * t * Math.cos(frond.angle) + Math.sin(t * 0.2) * 2;
      const fy = frond.startY + t * Math.sin(frond.angle) + t * 0.4;
      const leafWidth = (1 - progress) * 8 * Math.sin(progress * Math.PI);

      // Pinnae (individual leaflets)
      for (let dx = -leafWidth; dx <= leafWidth; dx++) {
        const dist = Math.abs(dx) / Math.max(leafWidth, 1);
        const biolum = noise(fx + dx, fy, 25) > 0.85 ? 30 : 0;
        setPixel(png, Math.round(fx + dx), Math.round(fy),
          clamp(20 + progress * 15), clamp(60 + progress * 30 + biolum - dist * 20),
          clamp(15 + progress * 10 + biolum * 0.5), clamp((1 - dist) * 250));
        // Thicken fronds vertically
        if (dist < 0.7) {
          setPixel(png, Math.round(fx + dx), Math.round(fy + 1),
            clamp(18 + progress * 12), clamp(55 + progress * 25 + biolum - dist * 15),
            clamp(13 + progress * 8), clamp((1 - dist) * 180));
        }
      }
    }
  }

  // Top crown fronds (curling upward)
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i - 2) * 0.35;
    for (let t = 0; t < 25; t++) {
      const curl = t * 0.03;
      const fx = cx + Math.cos(angle + curl) * t * 1.2;
      const fy = 18 + Math.sin(angle + curl) * t * 0.8;
      const w = (1 - t / 25) * 3;
      for (let dx = -w; dx <= w; dx++) {
        setPixel(png, Math.round(fx + dx), Math.round(fy),
          clamp(30 + t), clamp(75 + t * 2), clamp(25 + t), 220);
      }
    }
  }

  savePNG(png, 'struct_giant_fern.png');
}

function createStructHiveMound() {
  const png = createPNG(128, 128);
  const cx = 64, baseY = 115;

  // Main mound shape - organic dome
  for (let y = 25; y < baseY; y++) {
    const progress = (y - 25) / (baseY - 25);
    const moundWidth = Math.sin(progress * Math.PI) * 45 + 5;
    const wobble = Math.sin(y * 0.15) * 3 + Math.cos(y * 0.08) * 2;

    for (let dx = -moundWidth; dx <= moundWidth; dx++) {
      const dist = Math.abs(dx) / moundWidth;
      const n = noise(dx + cx, y, 30) * 20 - 10;
      const ridges = Math.sin(y * 0.3 + dx * 0.1) * 8;

      let r = clamp(55 + dist * 20 + n + ridges);
      let g = clamp(75 + dist * 15 + n + ridges * 0.5);
      let b = clamp(30 + dist * 10 + n);

      // Organic texture ridges
      if (Math.abs(Math.sin(y * 0.2 + dx * 0.05)) > 0.8) {
        r = clamp(r - 15);
        g = clamp(g - 10);
        b = clamp(b - 8);
      }

      setPixel(png, Math.round(cx + dx + wobble), y, r, g, b, 255);
    }
  }

  // Entrance holes
  const entrances = [
    { x: cx - 10, y: 70, rx: 6, ry: 8 },
    { x: cx + 12, y: 55, rx: 5, ry: 6 },
    { x: cx, y: 90, rx: 8, ry: 10 },
  ];
  for (const ent of entrances) {
    drawEllipse(png, ent.x, ent.y, ent.rx, ent.ry, 20, 25, 10, 240);
    // Glow around entrance (brightness > 150)
    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
      const gx = ent.x + Math.cos(angle) * (ent.rx + 2);
      const gy = ent.y + Math.sin(angle) * (ent.ry + 2);
      setPixel(png, Math.round(gx), Math.round(gy), 160, 200, 80, 200);
    }
  }

  // Veiny surface texture
  for (let i = 0; i < 12; i++) {
    let vx = cx + (noise(i, 0, 31) - 0.5) * 60;
    let vy = 30 + noise(i, 1, 31) * 70;
    for (let t = 0; t < 20; t++) {
      vx += (noise(t, i, 32) - 0.5) * 4;
      vy += noise(t, i + 10, 32) * 2;
      setPixel(png, Math.round(vx), Math.round(vy), 45, 65, 25, 180);
    }
  }

  // Bioluminescent spots (bright, for lit structure - brightness > 150 required)
  for (let i = 0; i < 15; i++) {
    const sx = cx + (noise(i, 0, 33) - 0.5) * 55;
    const sy = 35 + noise(i, 1, 33) * 65;
    drawFilledCircle(png, Math.round(sx), Math.round(sy), 3, 140, 255, 100, 255);
    drawFilledCircle(png, Math.round(sx), Math.round(sy), 5, 100, 200, 70, 100);
  }

  // Extra bright glow spots near entrances
  for (const ent of entrances) {
    drawFilledCircle(png, ent.x, ent.y, 3, 180, 255, 120, 255);
    for (let i = 0; i < 4; i++) {
      const gx = ent.x + (noise(i, ent.x, 34) - 0.5) * ent.rx * 3;
      const gy = ent.y + (noise(i, ent.y, 34) - 0.5) * ent.ry * 3;
      setPixel(png, Math.round(gx), Math.round(gy), 200, 255, 150, 255);
      setPixel(png, Math.round(gx) + 1, Math.round(gy), 180, 240, 130, 220);
    }
  }

  savePNG(png, 'struct_hive_mound.png');
}

function createStructSporeTower() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Main stalk - tall, organic
  for (let y = 120; y > 10; y--) {
    const progress = 1 - (y - 10) / 110;
    const stalkWidth = 6 - progress * 3 + Math.sin(y * 0.1) * 1.5;
    const sway = Math.sin(y * 0.04) * 4 * progress;

    for (let dx = -stalkWidth; dx <= stalkWidth; dx++) {
      const dist = Math.abs(dx) / stalkWidth;
      const n = noise(dx + cx, y, 35) * 15;
      setPixel(png, Math.round(cx + sway + dx), y,
        clamp(30 + dist * 15 + n), clamp(50 + dist * 20 + n),
        clamp(25 + dist * 10 + n), 255);
    }
  }

  // Spore cap at top - bulbous
  for (let dy = -18; dy <= 5; dy++) {
    const capProgress = (dy + 18) / 23;
    const capWidth = Math.sin(capProgress * Math.PI) * 20;
    for (let dx = -capWidth; dx <= capWidth; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy) / 20;
      const n = noise(dx + cx, dy + 15, 36) * 20;
      setPixel(png, Math.round(cx + dx), Math.round(12 + dy),
        clamp(40 + n + capProgress * 20), clamp(70 + n + capProgress * 25),
        clamp(30 + n + capProgress * 10), clamp((1 - dist * 0.5) * 255));
    }
  }

  // Spore emission - bright particles rising (brightness > 200 for lit structure)
  for (let i = 0; i < 15; i++) {
    const sx = cx + (noise(i, 0, 37) - 0.5) * 40;
    const sy = 2 + noise(i, 1, 37) * 20;
    drawFilledCircle(png, Math.round(sx), Math.round(sy), 3,
      180, 255, 100, 255);
    drawFilledCircle(png, Math.round(sx), Math.round(sy), 5,
      120, 200, 70, 80);
  }

  // Bright glow at cap top
  drawFilledCircle(png, cx, 8, 5, 200, 255, 120, 240);
  drawFilledCircle(png, cx - 3, 6, 3, 220, 255, 140, 255);
  drawFilledCircle(png, cx + 4, 10, 3, 210, 255, 130, 255);

  // Gill-like structures on stalk
  for (let y = 80; y > 25; y -= 12) {
    const sway = Math.sin(y * 0.04) * 4 * (1 - (y - 10) / 110);
    for (const side of [-1, 1]) {
      for (let t = 0; t < 10; t++) {
        const gx = cx + sway + side * (5 + t * 1.2);
        const gy = y + t * 0.5;
        const fade = 1 - t / 10;
        setPixel(png, Math.round(gx), Math.round(gy),
          35, clamp(65 + t * 5), 28, clamp(fade * 200));
        setPixel(png, Math.round(gx), Math.round(gy + 1),
          30, clamp(55 + t * 4), 25, clamp(fade * 150));
      }
    }
  }

  // Bioluminescent ring around cap
  for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
    const rx = 18 + Math.sin(angle * 3) * 2;
    const ry = 8 + Math.sin(angle * 3) * 1;
    const gx = cx + Math.cos(angle) * rx;
    const gy = 14 + Math.sin(angle) * ry;
    setPixel(png, Math.round(gx), Math.round(gy), 120, 255, 80, 200);
  }

  savePNG(png, 'struct_spore_tower.png');
}

function createStructVineArch() {
  const png = createPNG(128, 128);

  // Main arch shape - thicker vines
  for (let angle = 0; angle <= Math.PI; angle += 0.005) {
    const rx = 48;
    const ry = 50;
    const ax = 64 + Math.cos(angle) * rx;
    const ay = 100 - Math.sin(angle) * ry;

    const vineWidth = 7 + Math.sin(angle * 4) * 3;

    for (let w = -vineWidth; w <= vineWidth; w++) {
      const nx = ax + Math.sin(angle) * w;
      const ny = ay + Math.cos(angle) * w;
      const dist = Math.abs(w) / vineWidth;
      const n = noise(Math.round(nx), Math.round(ny), 40) * 15;
      setPixel(png, Math.round(nx), Math.round(ny),
        clamp(30 + dist * 15 + n), clamp(55 + dist * 20 + n),
        clamp(22 + dist * 10 + n), clamp((1 - dist * 0.2) * 255));
    }
  }

  // Secondary intertwined vine
  for (let angle = 0.1; angle <= Math.PI - 0.1; angle += 0.005) {
    const rx = 43;
    const ry = 45;
    const ax = 64 + Math.cos(angle) * rx + Math.sin(angle * 6) * 3;
    const ay = 102 - Math.sin(angle) * ry;
    const vineWidth = 4 + Math.sin(angle * 5) * 2;
    for (let w = -vineWidth; w <= vineWidth; w++) {
      const nx = ax + Math.sin(angle) * w;
      const ny = ay + Math.cos(angle) * w;
      const dist = Math.abs(w) / vineWidth;
      setPixel(png, Math.round(nx), Math.round(ny),
        clamp(25 + dist * 10), clamp(45 + dist * 15), clamp(18 + dist * 8),
        clamp((1 - dist * 0.3) * 220));
    }
  }

  // Vine tendrils hanging down - more and thicker
  for (let i = 0; i < 12; i++) {
    const startAngle = 0.2 + i * 0.22;
    const startX = 64 + Math.cos(startAngle) * 48;
    const startY = 100 - Math.sin(startAngle) * 50;
    const tendrilLength = 15 + noise(i, 0, 41) * 25;

    for (let t = 0; t < tendrilLength; t++) {
      const wobble = Math.sin(t * 0.3 + i) * 3;
      const tx = startX + wobble;
      const ty = startY + t;
      const fade = 1 - t / tendrilLength;
      for (let w = -1; w <= 1; w++) {
        setPixel(png, Math.round(tx) + w, Math.round(ty), 25, clamp(48 + t), 18, clamp(fade * 200));
      }
    }
  }

  // Larger leaves on the arch
  for (let i = 0; i < 20; i++) {
    const leafAngle = 0.15 + i * 0.14;
    const lx = 64 + Math.cos(leafAngle) * (46 + (i % 2 ? 6 : -6));
    const ly = 100 - Math.sin(leafAngle) * (48 + (i % 2 ? 6 : -6));
    const leafSize = 3 + noise(i, 5, 42) * 3;

    for (let dx = -leafSize; dx <= leafSize; dx++) {
      for (let dy = -leafSize; dy <= leafSize; dy++) {
        if (dx * dx + dy * dy <= leafSize * leafSize) {
          const biolum = noise(lx + dx, ly + dy, 42) > 0.6 ? 30 : 0;
          const dist = Math.sqrt(dx * dx + dy * dy) / leafSize;
          setPixel(png, Math.round(lx + dx), Math.round(ly + dy),
            25, clamp(75 + biolum), clamp(22 + biolum),
            clamp((1 - dist * 0.5) * 220));
        }
      }
    }
  }

  // Roots at base - thicker
  for (const baseX of [16, 112]) {
    for (let t = 0; t < 20; t++) {
      const rx = baseX + (baseX < 64 ? t * 0.8 : -t * 0.8);
      const ry = 100 + t;
      for (let w = -4; w <= 4; w++) {
        const fade = 1 - t / 20;
        const wFade = 1 - Math.abs(w) / 5;
        setPixel(png, Math.round(rx + w * fade), Math.round(ry),
          clamp(35 + t), clamp(58 + t), 22, clamp(fade * wFade * 240));
      }
    }
  }

  // Fill area inside arch with subtle moss/vine texture
  for (let y = 55; y < 100; y++) {
    for (let x = 20; x < 108; x++) {
      const normX = (x - 64) / 48;
      if (Math.abs(normX) < 1) {
        const archY = 100 - Math.sin(Math.acos(Math.abs(normX))) * 50;
        if (y > archY && y < 100) {
          const n = noise(x, y, 43);
          if (n > 0.3) {
            setPixel(png, x, y, 18, 38, 14, clamp(40 + n * 30));
          }
        }
      }
    }
  }

  savePNG(png, 'struct_vine_arch.png');
}

function createPropAlienFlora() {
  const png = createPNG(64, 64);

  // Base ground cluster
  drawEllipse(png, 32, 56, 22, 6, 22, 50, 20, 120);

  // Multiple alien plant clusters - more plants, bigger
  const plants = [
    { x: 15, y: 55, height: 20, color: [30, 80, 35] },
    { x: 24, y: 53, height: 28, color: [25, 90, 30] },
    { x: 32, y: 50, height: 33, color: [28, 95, 32] },
    { x: 40, y: 52, height: 26, color: [35, 85, 38] },
    { x: 48, y: 54, height: 22, color: [32, 78, 36] },
  ];

  for (const plant of plants) {
    // Stem - thicker
    for (let t = 0; t < plant.height; t++) {
      const progress = t / plant.height;
      const sway = Math.sin(t * 0.15) * 3 * progress;
      for (let w = -1; w <= 1; w++) {
        setPixel(png, Math.round(plant.x + sway) + w, plant.y - t,
          plant.color[0], plant.color[1], plant.color[2], clamp(240 - Math.abs(w) * 60));
      }
    }

    // Alien bulb/flower at top - bigger
    const topY = plant.y - plant.height;
    const topX = plant.x + Math.sin(plant.height * 0.15) * 3;
    const bulbSize = 4 + noise(plant.x, plant.y, 43) * 3;
    for (let dy = -bulbSize; dy <= bulbSize; dy++) {
      for (let dx = -bulbSize; dx <= bulbSize; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= bulbSize) {
          const glow = noise(dx + topX, dy + topY, 43) > 0.4 ? 25 : 0;
          setPixel(png, Math.round(topX + dx), Math.round(topY + dy),
            clamp(40 + glow), clamp(130 + glow), clamp(55 + glow * 2),
            clamp((1 - dist / (bulbSize + 1)) * 250));
        }
      }
    }

    // Larger leaves
    for (let i = 0; i < 4; i++) {
      const leafY = plant.y - plant.height * (0.25 + i * 0.18);
      const leafX = plant.x + Math.sin(leafY * 0.15) * 3;
      const side = i % 2 ? 1 : -1;
      for (let t = 0; t < 9; t++) {
        const lx = leafX + side * (t + 1);
        const ly = leafY + t * 0.4;
        const leafW = Math.max(1, 3 - Math.abs(t - 4));
        for (let dw = -leafW; dw <= leafW; dw++) {
          setPixel(png, Math.round(lx), Math.round(ly + dw),
            22, clamp(75 + t * 4), 28, clamp(210 - t * 15 - Math.abs(dw) * 30));
        }
      }
    }
  }

  savePNG(png, 'prop_alien_flora.png');
}

function createPropBioluminescentPool() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Outer glow
  drawEllipse(png, cx, cy, 28, 20, 40, 180, 100, 40);
  drawEllipse(png, cx, cy, 24, 17, 50, 200, 110, 60);

  // Pool edge (dark organic rim)
  for (let angle = 0; angle < Math.PI * 2; angle += 0.03) {
    const wobble = Math.sin(angle * 5) * 2;
    const rx = 20 + wobble;
    const ry = 14 + wobble * 0.7;
    const ex = cx + Math.cos(angle) * rx;
    const ey = cy + Math.sin(angle) * ry;
    for (let w = 0; w < 3; w++) {
      const nx = ex + Math.cos(angle) * w;
      const ny = ey + Math.sin(angle) * w;
      setPixel(png, Math.round(nx), Math.round(ny), 25, 50, 25, 220);
    }
  }

  // Pool interior - bright bioluminescent liquid
  for (let dy = -13; dy <= 13; dy++) {
    for (let dx = -19; dx <= 19; dx++) {
      const dist = (dx * dx) / (19 * 19) + (dy * dy) / (13 * 13);
      if (dist < 0.85) {
        const n = noise(dx + cx, dy + cy, 44) * 30;
        const brightness = (1 - dist);
        const r = clamp(50 + n * 0.3 + brightness * 80);
        const g = clamp(180 + n + brightness * 75);
        const b = clamp(120 + n * 0.5 + brightness * 70);
        setPixel(png, cx + dx, cy + dy, r, g, b, clamp(210 + brightness * 45));
      }
    }
  }

  // Bright center hotspot - larger
  drawEllipse(png, cx, cy - 1, 12, 8, 130, 255, 200, 240);
  drawEllipse(png, cx + 3, cy + 2, 8, 5, 110, 250, 180, 220);
  drawEllipse(png, cx - 4, cy - 2, 6, 4, 140, 255, 210, 230);

  // Ripple highlights - more of them, brighter
  for (let i = 0; i < 12; i++) {
    const rx = cx + (noise(i, 0, 45) - 0.5) * 30;
    const ry = cy + (noise(i, 1, 45) - 0.5) * 18;
    drawFilledCircle(png, Math.round(rx), Math.round(ry), 2, 160, 255, 210, 240);
  }

  savePNG(png, 'prop_bioluminescent_pool.png');
}

function createPropFallenLog() {
  const png = createPNG(64, 64);

  // Main log body - diagonal across the tile
  for (let t = 0; t < 55; t++) {
    const progress = t / 55;
    const lx = 6 + t;
    const ly = 40 - t * 0.25 + Math.sin(t * 0.1) * 2;
    const logRadius = 5 + Math.sin(progress * Math.PI) * 3;

    for (let dy = -logRadius; dy <= logRadius; dy++) {
      const dist = Math.abs(dy) / logRadius;
      const n = noise(lx, ly + dy, 46) * 20;
      const barkShade = 0.7 + dist * 0.3;
      // Alien wood tones - dark teal/green
      setPixel(png, Math.round(lx), Math.round(ly + dy),
        clamp(28 * barkShade + n), clamp(48 * barkShade + n),
        clamp(30 * barkShade + n), clamp((1 - dist * 0.2) * 250));
    }
  }

  // Ring/growth patterns on cut end
  const endX = 6, endY = 40;
  for (let ring = 1; ring < 5; ring++) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
      const rx = endX + Math.cos(angle) * ring * 1.2;
      const ry = endY + Math.sin(angle) * ring;
      setPixel(png, Math.round(rx), Math.round(ry), 35, 55, 35, 200);
    }
  }

  // Moss/fungus growing on log
  for (let i = 0; i < 6; i++) {
    const mx = 15 + noise(i, 0, 47) * 35;
    const my = 36 - mx * 0.25 + Math.sin(mx * 0.1) * 2 - 4;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 1; dy++) {
        if (noise(dx + mx, dy + my, 48) > 0.4) {
          setPixel(png, Math.round(mx + dx), Math.round(my + dy),
            35, clamp(90 + noise(mx, my, 49) * 40), 40, 200);
        }
      }
    }
  }

  // Bioluminescent spots on bark
  for (let i = 0; i < 4; i++) {
    const sx = 12 + noise(i, 0, 50) * 42;
    const sy = 38 - sx * 0.2 + 2;
    drawFilledCircle(png, Math.round(sx), Math.round(sy), 1, 80, 200, 100, 200);
  }

  savePNG(png, 'prop_fallen_log.png');
}

function createPropSporeCluster() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Multiple spore pods of varying sizes
  const pods = [
    { x: 25, y: 40, r: 7, color: [45, 80, 35] },
    { x: 38, y: 35, r: 9, color: [40, 85, 30] },
    { x: 30, y: 25, r: 6, color: [50, 75, 40] },
    { x: 42, y: 28, r: 5, color: [42, 82, 38] },
    { x: 22, y: 30, r: 5, color: [48, 78, 36] },
    { x: 35, y: 45, r: 6, color: [38, 88, 32] },
  ];

  // Connecting stems at base
  for (const pod of pods) {
    const stemLen = 55 - pod.y;
    for (let t = 0; t < stemLen; t++) {
      const progress = t / stemLen;
      const sx = pod.x + (cx - pod.x) * progress * 0.3;
      const sy = pod.y + pod.r + t;
      setPixel(png, Math.round(sx), Math.round(sy), 30, 55, 25, clamp(200 * (1 - progress * 0.5)));
    }
  }

  // Pod bodies
  for (const pod of pods) {
    for (let dy = -pod.r; dy <= pod.r; dy++) {
      for (let dx = -pod.r; dx <= pod.r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy) / pod.r;
        if (dist <= 1) {
          const n = noise(dx + pod.x, dy + pod.y, 51) * 15;
          const shade = 1 - dist * 0.4;
          setPixel(png, pod.x + dx, pod.y + dy,
            clamp(pod.color[0] * shade + n),
            clamp(pod.color[1] * shade + n),
            clamp(pod.color[2] * shade + n),
            clamp((1 - dist * dist) * 250));
        }
      }
    }

    // Bright tip on each pod
    drawFilledCircle(png, pod.x, pod.y - Math.floor(pod.r * 0.5), 2,
      clamp(pod.color[0] + 60), clamp(pod.color[1] + 80), clamp(pod.color[2] + 40), 230);
  }

  // Floating spore particles
  for (let i = 0; i < 8; i++) {
    const sx = 15 + noise(i, 0, 52) * 34;
    const sy = 10 + noise(i, 1, 52) * 20;
    setPixel(png, Math.round(sx), Math.round(sy), 100, 200, 80, 150);
  }

  savePNG(png, 'prop_spore_cluster.png');
}

// ═══════════════════════════════════════════════
// GENERATE ALL ASSETS
// ═══════════════════════════════════════════════

console.log('=== Generating Level 13: Nebula Assets ===');
createHorizonNebula();
createGroundVoid();
createStructGasPocket();
createStructSensorBuoy();
createStructDebrisCluster();
createPropNebulaWisp();

console.log('\n=== Generating Level 14: Jungle Assets ===');
createHorizonJungle();
createGroundMoss();
createStructGiantFern();
createStructHiveMound();
createStructSporeTower();
createStructVineArch();
createPropAlienFlora();
createPropBioluminescentPool();
createPropFallenLog();
createPropSporeCluster();

console.log('\nAll 16 terrain assets generated successfully!');
