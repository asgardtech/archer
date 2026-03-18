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
        const alpha = clamp(a_ * (1 - dist * 0.3));
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

function fillRect(png, x, y, w, h, r, g, b, a) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setPixel(png, x + dx, y + dy, r, g, b, a);
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

function makeTileable(png) {
  const w = png.width, h = png.height;
  const blendWidth = 16;
  const copy = createPNG(w, h);
  for (let i = 0; i < png.data.length; i++) copy.data[i] = png.data[i];

  for (let y = 0; y < h; y++) {
    for (let bx = 0; bx < blendWidth; bx++) {
      const t = bx / blendWidth;
      const li = (w * y + bx) * 4;
      const ri = (w * y + (w - 1 - bx)) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = Math.round((copy.data[li + c] + copy.data[ri + c]) / 2);
        png.data[li + c] = clamp(copy.data[li + c] * (1 - t * 0.5) + avg * t * 0.5);
        png.data[ri + c] = clamp(copy.data[ri + c] * (1 - t * 0.5) + avg * t * 0.5);
      }
    }
  }
  for (let x = 0; x < w; x++) {
    for (let by = 0; by < blendWidth; by++) {
      const t = by / blendWidth;
      const ti = (w * by + x) * 4;
      const bi = (w * (h - 1 - by) + x) * 4;
      for (let c = 0; c < 3; c++) {
        const avg = Math.round((png.data[ti + c] + png.data[bi + c]) / 2);
        png.data[ti + c] = clamp(png.data[ti + c] * (1 - t * 0.5) + avg * t * 0.5);
        png.data[bi + c] = clamp(png.data[bi + c] * (1 - t * 0.5) + avg * t * 0.5);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 15: VOLCANO ASSETS
// ═══════════════════════════════════════════════════════════════

function createHorizonVolcano() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;
      const n1 = fbm(x, y, 4, 80, 150);
      const n2 = fbm(x + 300, y + 100, 3, 50, 151);

      // Dark orange-red sky gradient
      let r = clamp(26 + t * 32 + n1 * 20);
      let g = clamp(8 + t * 18 + n1 * 8);
      let b = clamp(0 + t * 10 + n2 * 5);

      // Volcanic mountain silhouettes
      const mt1 = 120 + Math.sin(x * 0.008) * 30 + Math.sin(x * 0.02) * 15 + n1 * 20;
      const mt2 = 130 + Math.sin((x + 200) * 0.006) * 40 + Math.sin(x * 0.03) * 10 + n2 * 15;
      const mt3 = 110 + Math.sin((x + 400) * 0.01) * 25 + n1 * 25;

      if (y > mt1 || y > mt2 || y > mt3) {
        r = clamp(20 + n1 * 15);
        g = clamp(8 + n1 * 5);
        b = clamp(5 + n2 * 3);

        // Lava glow cracks on mountain
        const lavaChance = fbm(x * 2, y * 3, 3, 20, 152);
        if (lavaChance > 0.7) {
          const intensity = (lavaChance - 0.7) * 3.3;
          r = clamp(r + intensity * 200);
          g = clamp(g + intensity * 80);
          b = clamp(b + intensity * 10);
        }
      }

      // Erupting crater glow
      const craterX1 = 200, craterX2 = 550;
      for (const cx of [craterX1, craterX2]) {
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - 100) * (y - 100));
        if (dist < 60) {
          const glow = (1 - dist / 60) * 0.6;
          r = clamp(r + glow * 180);
          g = clamp(g + glow * 60);
          b = clamp(b + glow * 10);
        }
      }

      // Ash clouds at top
      if (y < 80) {
        const cloud = fbm(x, y, 4, 40, 153);
        if (cloud > 0.45) {
          const ci = (cloud - 0.45) * 1.8;
          r = clamp(r + ci * 30);
          g = clamp(g + ci * 20);
          b = clamp(b + ci * 15);
        }
      }

      // Ember particles
      const ember = noise(x * 5, y * 5, 154);
      if (ember > 0.992) {
        r = clamp(255);
        g = clamp(120 + ember * 100);
        b = clamp(20);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_volcano.png');
}

function createGroundVolcanic() {
  const png = createPNG(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const n1 = fbm(x, y, 3, 30, 160);
      const n2 = smoothNoise(x + 200, y + 150, 25, 161);

      // Dark volcanic rock base
      let r = clamp(42 + n1 * 25);
      let g = clamp(26 + n1 * 14 + n2 * 5);
      let b = clamp(10 + n1 * 8);

      // Lava crack veins
      const vein = smoothNoise(x * 2, y * 2, 10, 163);
      if (vein > 0.58 && vein < 0.68) {
        const vi = 1 - Math.abs(vein - 0.63) / 0.05;
        r = clamp(r + vi * 180);
        g = clamp(g + vi * 65);
        b = clamp(b + vi * 5);
      }

      // Rock texture variation
      const rock = noise(x * 2, y * 2, 164);
      r = clamp(r + (rock - 0.5) * 10);
      g = clamp(g + (rock - 0.5) * 6);

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  makeTileable(png);
  savePNG(png, 'ground_volcanic.png');
}

function createStructLavaPipe() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Main pipe body - horizontal cylinder
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -50; dx <= 50; dx++) {
      const shade = 80 + Math.abs(dy) * 5;
      const nv = noise(cx + dx, cy + dy, 170) * 20;
      setPixel(png, cx + dx, cy + dy,
        clamp(shade * 0.5 + nv), clamp(shade * 0.4 + nv * 0.5), clamp(shade * 0.3), 255);
    }
  }

  // Pipe highlight (specular)
  for (let dx = -48; dx <= 48; dx++) {
    const h = noise(dx, 0, 171) * 3;
    setPixel(png, cx + dx, cy - 6 + h, clamp(130), clamp(100), clamp(70), 180);
  }

  // Support brackets
  for (const bx of [-30, 0, 30]) {
    fillRect(png, cx + bx - 4, cy - 18, 8, 8, 50, 40, 30, 255);
    fillRect(png, cx + bx - 3, cy + 10, 6, 14, 50, 40, 30, 255);
    fillRect(png, cx + bx - 5, cy + 22, 10, 4, 60, 45, 35, 255);
  }

  // Lava glow from joints
  for (const jx of [-25, 5, 35]) {
    drawFilledCircle(png, cx + jx, cy, 8, 255, 100, 20, 100);
    drawFilledCircle(png, cx + jx, cy, 4, 255, 160, 40, 150);
  }

  // Add surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 3, y * 3, 172) - 0.5) * 10;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_lava_pipe.png');
}

function createStructRockSpire() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Tall volcanic rock spire - tapered column
  for (let y = 10; y < 120; y++) {
    const t = (y - 10) / 110;
    const width = Math.round(6 + t * 22 + noise(y, 0, 180) * 8);
    for (let dx = -width; dx <= width; dx++) {
      const edgeFade = 1 - Math.abs(dx) / (width + 1);
      const n = noise(dx + cx, y, 181) * 25;
      const shade = 30 + t * 20 + edgeFade * 15 + n;
      setPixel(png, cx + dx, y,
        clamp(shade + 10), clamp(shade * 0.7), clamp(shade * 0.4), 255);
    }
  }

  // Jagged top
  for (let i = -3; i <= 3; i++) {
    const topY = 10 + Math.abs(i) * 3 + noise(i, 0, 182) * 5;
    for (let y = topY; y < topY + 8; y++) {
      setPixel(png, cx + i, y, 45, 30, 20, clamp(200 - (y - topY) * 20));
    }
  }

  // Lava glow cracks
  for (let i = 0; i < 5; i++) {
    const startY = 30 + i * 18;
    const startX = cx + (noise(i, 0, 183) - 0.5) * 20;
    for (let j = 0; j < 12; j++) {
      const px = startX + (noise(j, i, 184) - 0.5) * 8;
      const py = startY + j;
      setPixel(png, Math.round(px), py, 255, 120, 20, 180);
      setPixel(png, Math.round(px) + 1, py, 255, 80, 10, 120);
    }
  }

  savePNG(png, 'struct_rock_spire.png');
}

function createStructExtractionUnit() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Base platform
  fillRect(png, cx - 35, cy + 20, 70, 12, 55, 45, 35, 255);
  fillRect(png, cx - 33, cy + 22, 66, 8, 65, 50, 38, 255);

  // Main extraction tower
  fillRect(png, cx - 12, cy - 30, 24, 50, 70, 55, 40, 255);
  fillRect(png, cx - 10, cy - 28, 20, 46, 80, 60, 45, 255);

  // Windows/vents
  for (let wy = 0; wy < 4; wy++) {
    fillRect(png, cx - 8, cy - 24 + wy * 10, 6, 4, 180, 80, 20, 220);
    fillRect(png, cx + 2, cy - 24 + wy * 10, 6, 4, 180, 80, 20, 220);
  }

  // Chimney stacks
  fillRect(png, cx - 20, cy - 20, 6, 30, 60, 48, 36, 255);
  fillRect(png, cx + 14, cy - 25, 6, 35, 60, 48, 36, 255);

  // Smoke/heat from chimneys
  for (const sx of [cx - 17, cx + 17]) {
    for (let i = 0; i < 6; i++) {
      const sy = cy - 25 - i * 4;
      const spread = i * 2;
      drawFilledCircle(png, sx + (noise(i, sx, 190) - 0.5) * spread, sy, 3 + i, 80, 60, 50, clamp(100 - i * 15));
    }
  }

  // Glowing extraction beam at center
  for (let y = cy - 30; y < cy + 20; y++) {
    const beamWidth = 2 + noise(y, 0, 191) * 2;
    for (let dx = -beamWidth; dx <= beamWidth; dx++) {
      const fade = 1 - Math.abs(dx) / (beamWidth + 1);
      setPixel(png, cx + dx, y, 255, 140, 30, clamp(fade * 100));
    }
  }

  // Pipes on sides
  drawLine(png, cx - 35, cy + 15, cx - 20, cy, 50, 40, 30, 255, 2);
  drawLine(png, cx + 35, cy + 15, cx + 20, cy, 50, 40, 30, 255, 2);

  // Surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 2, y * 2, 192) - 0.5) * 12;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_extraction_unit.png');
}

function createPropLavaFlow() {
  const png = createPNG(64, 64);

  // Lava stream flowing diagonally
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const cx = 32, cy = 32;
      const n = fbm(x * 2, y * 2, 3, 15, 200);
      const flowDist = Math.abs((x - cx) + (y - cy) * 0.3 + n * 15);
      if (flowDist < 12) {
        const intensity = 1 - flowDist / 12;
        const r = clamp(180 + intensity * 75 + n * 30);
        const g = clamp(60 + intensity * 80 + n * 20);
        const b = clamp(5 + intensity * 15);
        const a = clamp(intensity * 255);
        setPixel(png, x, y, r, g, b, a);
      }
    }
  }

  // Bright core
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const flowDist = Math.abs((x - 32) + (y - 32) * 0.3 + fbm(x * 2, y * 2, 2, 12, 201) * 10);
      if (flowDist < 4) {
        const intensity = 1 - flowDist / 4;
        setPixel(png, x, y, 255, clamp(200 + intensity * 55), clamp(50 + intensity * 30), clamp(intensity * 220));
      }
    }
  }

  savePNG(png, 'prop_lava_flow.png');
}

function createPropVolcanicRock() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Irregular rock shape
  for (let y = 0; y < 64; y++) {
    for (let dx = -24; dx <= 24; dx++) {
      for (let dy = -20; dy <= 20; dy++) {
        const angle = Math.atan2(dy, dx);
        const maxR = 16 + Math.sin(angle * 3) * 4 + Math.cos(angle * 5) * 3 + noise(angle * 10, 0, 210) * 6;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= maxR) {
          const edgeFade = 1 - dist / (maxR + 1);
          const n = noise(cx + dx, cy + dy, 211) * 20;
          const shade = 35 + edgeFade * 20 + n;
          setPixel(png, cx + dx, cy + dy,
            clamp(shade + 8), clamp(shade * 0.6), clamp(shade * 0.35),
            clamp(180 + edgeFade * 75));
        }
      }
    }
  }

  // Highlights on top
  for (let dx = -10; dx <= 10; dx++) {
    for (let dy = -6; dy <= 0; dy++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10) {
        setPixel(png, cx + dx, cy + dy - 5, 70, 55, 35, clamp(80 * (1 - dist / 10)));
      }
    }
  }

  savePNG(png, 'prop_volcanic_rock.png');
}

function createPropAshDeposit() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 36;

  // Flat ash pile - wide elliptical mound
  for (let dy = -14; dy <= 14; dy++) {
    for (let dx = -26; dx <= 26; dx++) {
      const dist = (dx * dx) / (26 * 26) + (dy * dy) / (14 * 14);
      if (dist <= 1) {
        const fade = 1 - dist;
        const n = noise(cx + dx, cy + dy, 220) * 15;
        const shade = 45 + fade * 25 + n;
        const heightShade = dy < 0 ? 10 : 0;
        setPixel(png, cx + dx, cy + dy,
          clamp(shade + heightShade), clamp(shade * 0.85 + heightShade),
          clamp(shade * 0.7 + heightShade),
          clamp(fade * 230));
      }
    }
  }

  // Surface texture dots
  for (let i = 0; i < 30; i++) {
    const px = cx + (noise(i, 0, 221) - 0.5) * 40;
    const py = cy + (noise(i, 1, 221) - 0.5) * 20;
    const idx = (64 * Math.round(py) + Math.round(px)) * 4;
    if (idx >= 0 && idx < png.data.length && png.data[idx + 3] > 0) {
      const s = noise(i, 2, 221) * 15;
      setPixel(png, Math.round(px), Math.round(py), clamp(55 + s), clamp(45 + s), clamp(35 + s), 200);
    }
  }

  savePNG(png, 'prop_ash_deposit.png');
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 16: OCEAN ASSETS
// ═══════════════════════════════════════════════════════════════

function createHorizonOcean() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;
      const n1 = fbm(x, y, 4, 100, 300);
      const n2 = fbm(x + 200, y + 50, 3, 60, 301);

      // Steel blue-grey sky
      let r = clamp(42 + t * 48 + n1 * 12);
      let g = clamp(58 + t * 44 + n1 * 15);
      let b = clamp(90 + t * 48 + n1 * 20);

      // Horizon line transition to ocean
      const horizonY = 120;
      if (y > horizonY) {
        const oceanT = (y - horizonY) / (200 - horizonY);
        // Ocean water below horizon
        r = clamp(20 + oceanT * 15 + n1 * 10);
        g = clamp(40 + oceanT * 20 + n1 * 15 + n2 * 8);
        b = clamp(80 + oceanT * 30 + n1 * 20 + n2 * 10);

        // Wave crests
        const wave = Math.sin(x * 0.04 + n1 * 5 + y * 0.1) * 0.5 + 0.5;
        if (wave > 0.8) {
          const foamI = (wave - 0.8) * 5;
          r = clamp(r + foamI * 80);
          g = clamp(g + foamI * 90);
          b = clamp(b + foamI * 70);
        }
      }

      // Overcast clouds
      if (y < horizonY) {
        const cloud = fbm(x, y, 5, 50, 302);
        if (cloud > 0.5) {
          const ci = (cloud - 0.5) * 2;
          r = clamp(r + ci * 40);
          g = clamp(g + ci * 42);
          b = clamp(b + ci * 35);
        }
      }

      // Fog near horizon
      const fogDist = Math.abs(y - horizonY);
      if (fogDist < 30) {
        const fogI = (1 - fogDist / 30) * 0.3;
        r = clamp(r + fogI * 80);
        g = clamp(g + fogI * 85);
        b = clamp(b + fogI * 75);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_ocean.png');
}

function createGroundWater() {
  const png = createPNG(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n1 = fbm(x, y, 5, 50, 310);
      const n2 = fbm(x + 300, y + 200, 4, 30, 311);
      const n3 = fbm(x * 2, y * 2, 3, 20, 312);

      // Deep ocean blue
      let r = clamp(10 + n1 * 12 + n3 * 5);
      let g = clamp(26 + n1 * 18 + n2 * 10 + n3 * 5);
      let b = clamp(58 + n1 * 25 + n2 * 15 + n3 * 8);

      // Subtle wave patterns
      const wave = Math.sin(x * 0.08 + n1 * 4) * Math.cos(y * 0.06 + n2 * 3);
      r = clamp(r + wave * 8);
      g = clamp(g + wave * 12);
      b = clamp(b + wave * 15);

      // Foam flecks
      const foam = noise(x * 3, y * 3, 313);
      if (foam > 0.92) {
        const fi = (foam - 0.92) * 12;
        r = clamp(r + fi * 40);
        g = clamp(g + fi * 45);
        b = clamp(b + fi * 35);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  makeTileable(png);
  savePNG(png, 'ground_water.png');
}

function createStructOilPlatform() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Platform legs (4 pillars)
  for (const lx of [cx - 30, cx - 10, cx + 10, cx + 30]) {
    fillRect(png, lx - 3, cy, 6, 50, 70, 75, 80, 255);
    fillRect(png, lx - 2, cy + 2, 4, 46, 80, 85, 90, 255);
  }

  // Cross braces between legs
  drawLine(png, cx - 30, cy + 20, cx - 10, cy + 35, 65, 70, 75, 255, 2);
  drawLine(png, cx + 10, cy + 20, cx + 30, cy + 35, 65, 70, 75, 255, 2);
  drawLine(png, cx - 10, cy + 15, cx + 10, cy + 30, 65, 70, 75, 255, 2);

  // Main deck
  fillRect(png, cx - 38, cy - 5, 76, 10, 90, 95, 100, 255);
  fillRect(png, cx - 36, cy - 3, 72, 6, 100, 105, 110, 255);

  // Upper structure / derrick tower
  fillRect(png, cx - 6, cy - 40, 12, 35, 85, 90, 95, 255);
  fillRect(png, cx - 4, cy - 38, 8, 31, 95, 100, 105, 255);

  // Crane arm
  drawLine(png, cx + 6, cy - 35, cx + 35, cy - 20, 75, 80, 85, 255, 2);
  drawLine(png, cx + 35, cy - 20, cx + 35, cy - 5, 70, 75, 80, 255, 1);

  // Warning lights
  drawFilledCircle(png, cx, cy - 40, 3, 255, 60, 60, 220);
  drawFilledCircle(png, cx - 25, cy - 5, 2, 255, 200, 50, 180);
  drawFilledCircle(png, cx + 25, cy - 5, 2, 255, 200, 50, 180);

  // Helipad marking on deck
  drawEllipse(png, cx, cy - 1, 10, 3, 200, 200, 50, 120);

  // Surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 2, y * 2, 320) - 0.5) * 10;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_oil_platform.png');
}

function createStructDockCrane() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Base/pedestal
  fillRect(png, cx - 15, 90, 30, 20, 80, 85, 90, 255);
  fillRect(png, cx - 13, 92, 26, 16, 90, 95, 100, 255);

  // Tower
  fillRect(png, cx - 6, 25, 12, 65, 75, 80, 88, 255);
  fillRect(png, cx - 4, 27, 8, 61, 85, 90, 98, 255);

  // Jib arm (horizontal boom)
  fillRect(png, cx - 5, 22, 55, 5, 80, 85, 92, 255);
  fillRect(png, cx - 3, 23, 51, 3, 90, 95, 102, 255);

  // Counter-weight arm
  fillRect(png, cx - 30, 22, 25, 5, 80, 85, 92, 255);
  fillRect(png, cx - 32, 18, 10, 8, 100, 90, 85, 255);

  // Cables
  drawLine(png, cx, 20, cx + 45, 24, 120, 125, 130, 200, 1);
  drawLine(png, cx, 20, cx - 25, 24, 120, 125, 130, 200, 1);

  // Hook cable
  drawLine(png, cx + 35, 27, cx + 35, 55, 110, 115, 120, 220, 1);
  fillRect(png, cx + 32, 55, 6, 6, 100, 105, 110, 255);

  // Light on top
  drawFilledCircle(png, cx, 20, 3, 255, 50, 50, 200);

  // Surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 2, y * 2, 330) - 0.5) * 8;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_dock_crane.png');
}

function createStructSeaWall() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Main wall body - thick horizontal barrier
  fillRect(png, 5, cy - 12, 118, 30, 75, 80, 85, 255);
  fillRect(png, 7, cy - 10, 114, 26, 85, 90, 95, 255);

  // Concrete block pattern
  for (let by = 0; by < 3; by++) {
    for (let bx = 0; bx < 6; bx++) {
      const ox = 10 + bx * 19;
      const oy = cy - 9 + by * 8;
      const shade = 80 + noise(bx, by, 340) * 20;
      fillRect(png, ox, oy, 17, 6, clamp(shade), clamp(shade + 5), clamp(shade + 10), 255);
    }
  }

  // Top crenellation / wave breakers
  for (let i = 0; i < 8; i++) {
    const tx = 10 + i * 15;
    fillRect(png, tx, cy - 20, 8, 10, 90, 95, 100, 255);
  }

  // Water splash at base
  for (let i = 0; i < 12; i++) {
    const sx = 10 + noise(i, 0, 341) * 108;
    const sy = cy + 18 + noise(i, 1, 341) * 8;
    drawFilledCircle(png, sx, sy, 3 + noise(i, 2, 341) * 3, 160, 180, 200, clamp(100 + noise(i, 3, 341) * 80));
  }

  // Rust stains
  for (let i = 0; i < 5; i++) {
    const rx = 20 + noise(i, 0, 342) * 80;
    const ry = cy + noise(i, 1, 342) * 10;
    drawEllipse(png, rx, ry, 4, 6, 100, 70, 50, 80);
  }

  // Surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 2, y * 2, 343) - 0.5) * 10;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_sea_wall.png');
}

function createStructRadarDome() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Base pedestal
  fillRect(png, cx - 18, cy + 15, 36, 15, 70, 75, 80, 255);
  fillRect(png, cx - 16, cy + 17, 32, 11, 80, 85, 90, 255);

  // Dome shape (half sphere)
  for (let dy = -28; dy <= 0; dy++) {
    const r = Math.sqrt(28 * 28 - dy * dy);
    for (let dx = -r; dx <= r; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy) / 28;
      const shade = 100 + (1 - dist) * 60 + dy * 1.5;
      const n = noise(cx + dx, cy + dy, 350) * 12;
      setPixel(png, Math.round(cx + dx), cy + 15 + dy,
        clamp(shade + n), clamp(shade + 5 + n), clamp(shade + 15 + n), 255);
    }
  }

  // Dome grid lines (latitude/longitude)
  for (let lat = -24; lat <= 0; lat += 8) {
    const r = Math.sqrt(28 * 28 - lat * lat);
    for (let dx = -r; dx <= r; dx++) {
      setPixel(png, Math.round(cx + dx), cy + 15 + lat, 70, 75, 85, 180);
    }
  }
  for (let lon = -20; lon <= 20; lon += 10) {
    for (let dy = -26; dy <= 0; dy++) {
      const maxR = Math.sqrt(28 * 28 - dy * dy);
      const px = cx + lon * (maxR / 28);
      setPixel(png, Math.round(px), cy + 15 + dy, 70, 75, 85, 180);
    }
  }

  // Antenna on top
  drawLine(png, cx, cy - 15, cx, cy - 25, 90, 95, 100, 255, 2);
  drawFilledCircle(png, cx, cy - 25, 2, 200, 50, 50, 220);

  // Equipment boxes at base
  fillRect(png, cx - 25, cy + 22, 10, 8, 65, 70, 75, 255);
  fillRect(png, cx + 15, cy + 22, 10, 8, 65, 70, 75, 255);

  savePNG(png, 'struct_radar_dome.png');
}

function createPropBuoy() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 28;

  // Buoy body - cylindrical
  for (let dy = -14; dy <= 14; dy++) {
    const width = Math.round(8 - Math.abs(dy) * 0.2);
    for (let dx = -width; dx <= width; dx++) {
      const shade = dy < 0 ? 180 : 150;
      const stripe = Math.floor((cy + dy) / 5) % 2 === 0;
      if (stripe) {
        setPixel(png, cx + dx, cy + dy, clamp(shade + 20), clamp(shade * 0.3), clamp(shade * 0.2), 255);
      } else {
        setPixel(png, cx + dx, cy + dy, clamp(shade), clamp(shade), clamp(shade * 0.5), 255);
      }
    }
  }

  // Top light
  fillRect(png, cx - 2, cy - 18, 4, 4, 60, 60, 65, 255);
  drawFilledCircle(png, cx, cy - 20, 3, 255, 220, 50, 220);

  // Antenna
  drawLine(png, cx, cy - 18, cx, cy - 24, 80, 85, 90, 220, 1);

  // Water ring at base
  drawEllipse(png, cx, cy + 16, 14, 4, 120, 150, 190, 100);
  drawEllipse(png, cx, cy + 17, 16, 3, 160, 190, 220, 70);

  savePNG(png, 'prop_buoy.png');
}

function createPropWaveBreak() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 40;

  // Splash pattern - arcing water droplets
  for (let i = 0; i < 20; i++) {
    const angle = (noise(i, 0, 360) - 0.3) * Math.PI;
    const dist = 5 + noise(i, 1, 360) * 20;
    const px = cx + Math.cos(angle) * dist;
    const py = cy - Math.abs(Math.sin(angle)) * dist * 0.8;
    const size = 1 + noise(i, 2, 360) * 3;
    drawFilledCircle(png, Math.round(px), Math.round(py), Math.round(size),
      clamp(180 + noise(i, 3, 360) * 40),
      clamp(200 + noise(i, 4, 360) * 30),
      clamp(230 + noise(i, 5, 360) * 25),
      clamp(120 + noise(i, 6, 360) * 80));
  }

  // Base foam line
  for (let x = 10; x < 54; x++) {
    const foamY = cy + 2 + Math.sin(x * 0.3) * 3 + noise(x, 0, 361) * 4;
    for (let dy = 0; dy < 5; dy++) {
      const fade = 1 - dy / 5;
      setPixel(png, x, Math.round(foamY + dy),
        clamp(170 + fade * 50), clamp(190 + fade * 40), clamp(220 + fade * 30),
        clamp(fade * 160));
    }
  }

  // Mist above
  for (let i = 0; i < 8; i++) {
    const mx = 15 + noise(i, 0, 362) * 34;
    const my = cy - 10 - noise(i, 1, 362) * 15;
    drawFilledCircle(png, Math.round(mx), Math.round(my), Math.round(3 + noise(i, 2, 362) * 4),
      200, 215, 240, clamp(40 + noise(i, 3, 362) * 40));
  }

  savePNG(png, 'prop_wave_break.png');
}

function createPropCargoCrate() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Main crate body (3/4 top-down view)
  // Top face
  const topW = 20, topH = 14;
  fillRect(png, cx - topW / 2, cy - topH, topW, topH, 110, 95, 70, 255);
  fillRect(png, cx - topW / 2 + 1, cy - topH + 1, topW - 2, topH - 2, 120, 105, 80, 255);

  // Front face
  fillRect(png, cx - topW / 2, cy, topW, 12, 85, 75, 55, 255);
  fillRect(png, cx - topW / 2 + 1, cy + 1, topW - 2, 10, 95, 82, 62, 255);

  // Side face (right)
  for (let dy = 0; dy < 12; dy++) {
    for (let dx = 0; dx < 6; dx++) {
      const shade = 75 - dx * 3;
      setPixel(png, cx + topW / 2 + dx, cy + dy - topH / 2 + dx,
        clamp(shade + 10), clamp(shade), clamp(shade * 0.7), 255);
    }
  }

  // Metal bands
  fillRect(png, cx - topW / 2, cy - topH + 4, topW, 2, 80, 80, 85, 255);
  fillRect(png, cx - topW / 2, cy - 3, topW, 2, 80, 80, 85, 255);
  fillRect(png, cx - topW / 2, cy + 4, topW, 2, 70, 70, 75, 255);

  // Shipping label
  fillRect(png, cx - 5, cy - topH + 5, 10, 5, 180, 170, 130, 200);

  // Surface noise
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const idx = (64 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 3, y * 3, 370) - 0.5) * 12;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'prop_cargo_crate.png');
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 17: TUNDRA ASSETS
// ═══════════════════════════════════════════════════════════════

function createHorizonTundra() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;
      const n1 = fbm(x, y, 3, 100, 400);
      const n2 = smoothNoise(x + 300, y + 100, 60, 401);

      // Pale grey-blue sky
      let r = clamp(160 + t * 48 + n1 * 10);
      let g = clamp(176 + t * 40 + n1 * 12);
      let b = clamp(192 + t * 24 + n1 * 15);

      // Frozen wasteland below horizon
      const horizonY = 130;
      if (y > horizonY) {
        const iceT = (y - horizonY) / (200 - horizonY);
        r = clamp(190 + iceT * 10 + n1 * 15 + n2 * 8);
        g = clamp(200 + iceT * 8 + n1 * 12 + n2 * 6);
        b = clamp(210 + iceT * 5 + n1 * 10 + n2 * 5);

        // Ice formations on horizon
        const iceForm = Math.sin(x * 0.02 + n1 * 3) * 8;
        if (y < horizonY + 15 + iceForm) {
          r = clamp(r - 20);
          g = clamp(g - 15);
          b = clamp(b - 5);
        }
      }

      // Blizzard snow streaks
      const bliz = noise(x * 0.5 + y * 2, y * 0.3, 402);
      if (bliz > 0.85) {
        const bi = (bliz - 0.85) * 6.6;
        r = clamp(r + bi * 30);
        g = clamp(g + bi * 32);
        b = clamp(b + bi * 28);
      }

      // Heavy overcast clouds
      if (y < horizonY) {
        const cloud = fbm(x, y, 3, 60, 403);
        if (cloud > 0.45) {
          const ci = (cloud - 0.45) * 1.8;
          r = clamp(r + ci * 25);
          g = clamp(g + ci * 25);
          b = clamp(b + ci * 20);
        }
      }

      // Distant ice peaks
      const peak1 = horizonY - 15 + Math.sin(x * 0.015) * 12 + Math.sin(x * 0.04) * 6 + n1 * 10;
      const peak2 = horizonY - 10 + Math.sin((x + 200) * 0.01) * 20 + n2 * 8;
      if (y > peak1 && y < horizonY + 5) {
        r = clamp(170 + n1 * 20);
        g = clamp(180 + n1 * 18);
        b = clamp(195 + n1 * 15);
      }
      if (y > peak2 && y < horizonY + 5) {
        r = clamp(180 + n2 * 15);
        g = clamp(190 + n2 * 12);
        b = clamp(205 + n2 * 10);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_tundra.png');
}

function createGroundIce() {
  const png = createPNG(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n1 = fbm(x, y, 5, 50, 410);
      const n2 = fbm(x + 400, y + 300, 4, 30, 411);
      const n3 = fbm(x * 2, y * 2, 3, 20, 412);

      // Ice surface - pale blue-white
      let r = clamp(180 + n1 * 30 + n3 * 10);
      let g = clamp(195 + n1 * 25 + n2 * 12 + n3 * 8);
      let b = clamp(215 + n1 * 20 + n2 * 10 + n3 * 6);

      // Crack patterns
      const crack1 = fbm(x * 4, y * 4, 3, 10, 413);
      const crack2 = fbm(x * 3, y * 5, 2, 8, 414);
      if ((crack1 > 0.63 && crack1 < 0.67) || (crack2 > 0.65 && crack2 < 0.68)) {
        r = clamp(r - 35);
        g = clamp(g - 25);
        b = clamp(b - 10);
      }

      // Frost sparkle
      const sparkle = noise(x * 5, y * 5, 415);
      if (sparkle > 0.95) {
        r = clamp(r + 30);
        g = clamp(g + 32);
        b = clamp(b + 25);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  makeTileable(png);
  savePNG(png, 'ground_ice.png');
}

function createStructIceBunker() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 70;

  // Snow mound over bunker (partially buried)
  for (let dy = -20; dy <= 20; dy++) {
    for (let dx = -40; dx <= 40; dx++) {
      const dist = (dx * dx) / (40 * 40) + (dy * dy) / (20 * 20);
      if (dist <= 1) {
        const n = noise(cx + dx, cy + dy, 420) * 15;
        const shade = 200 + (1 - dist) * 30 + n;
        setPixel(png, cx + dx, cy + dy, clamp(shade - 5), clamp(shade), clamp(shade + 10), 255);
      }
    }
  }

  // Bunker entrance (dark opening)
  fillRect(png, cx - 12, cy - 5, 24, 14, 40, 45, 55, 255);
  fillRect(png, cx - 10, cy - 3, 20, 10, 30, 35, 45, 255);

  // Reinforced frame around entrance
  fillRect(png, cx - 14, cy - 7, 28, 3, 80, 85, 90, 255);
  fillRect(png, cx - 14, cy + 9, 28, 3, 75, 80, 85, 255);
  fillRect(png, cx - 14, cy - 7, 3, 19, 80, 85, 90, 255);
  fillRect(png, cx + 11, cy - 7, 3, 19, 80, 85, 90, 255);

  // Vent pipe sticking out
  fillRect(png, cx + 20, cy - 25, 5, 18, 70, 75, 80, 255);
  fillRect(png, cx + 19, cy - 27, 7, 4, 75, 80, 85, 255);

  // Antenna array
  drawLine(png, cx - 25, cy - 15, cx - 25, cy - 35, 65, 70, 78, 255, 1);
  drawLine(png, cx - 28, cy - 30, cx - 22, cy - 30, 65, 70, 78, 200, 1);
  drawFilledCircle(png, cx - 25, cy - 36, 2, 200, 50, 50, 200);

  // Snow drift details
  for (let i = 0; i < 15; i++) {
    const sx = cx - 35 + noise(i, 0, 421) * 70;
    const sy = cy + 15 + noise(i, 1, 421) * 10;
    drawFilledCircle(png, sx, sy, 2 + noise(i, 2, 421) * 3, 210, 215, 225, 120);
  }

  savePNG(png, 'struct_ice_bunker.png');
}

function createStructFrozenTurret() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Base platform (frozen over)
  drawEllipse(png, cx, cy + 20, 25, 10, 170, 180, 195, 255);
  drawEllipse(png, cx, cy + 20, 23, 8, 180, 190, 205, 255);

  // Turret body
  fillRect(png, cx - 14, cy - 10, 28, 30, 80, 85, 95, 255);
  fillRect(png, cx - 12, cy - 8, 24, 26, 90, 95, 105, 255);

  // Gun barrels (twin)
  fillRect(png, cx - 8, cy - 35, 5, 28, 70, 75, 82, 255);
  fillRect(png, cx + 3, cy - 35, 5, 28, 70, 75, 82, 255);

  // Barrel tips
  fillRect(png, cx - 9, cy - 37, 7, 4, 60, 65, 72, 255);
  fillRect(png, cx + 2, cy - 37, 7, 4, 60, 65, 72, 255);

  // Ice encasement on turret
  for (let i = 0; i < 12; i++) {
    const ix = cx + (noise(i, 0, 430) - 0.5) * 35;
    const iy = cy + (noise(i, 1, 430) - 0.5) * 40;
    const idx = (128 * Math.round(iy) + Math.round(ix)) * 4;
    if (idx >= 0 && idx < png.data.length && png.data[idx + 3] > 0) {
      drawFilledCircle(png, Math.round(ix), Math.round(iy),
        2 + noise(i, 2, 430) * 4, 180, 200, 230, 120);
    }
  }

  // Icicles hanging off barrel edges
  for (let i = 0; i < 5; i++) {
    const ix = cx - 10 + i * 5;
    const len = 3 + noise(i, 0, 431) * 6;
    for (let dy = 0; dy < len; dy++) {
      const fade = 1 - dy / len;
      setPixel(png, ix, cy - 8 + dy, 180, 200, 230, clamp(fade * 180));
    }
  }

  // Warning light
  drawFilledCircle(png, cx, cy - 12, 2, 255, 100, 100, 220);

  savePNG(png, 'struct_frozen_turret.png');
}

function createStructSupplyDepot() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Main building - flat-roofed depot
  fillRect(png, cx - 30, cy - 15, 60, 35, 75, 80, 70, 255);
  fillRect(png, cx - 28, cy - 13, 56, 31, 85, 90, 80, 255);

  // Roof edge
  fillRect(png, cx - 32, cy - 17, 64, 4, 70, 75, 68, 255);

  // Large doors (two bays)
  fillRect(png, cx - 24, cy - 5, 18, 20, 55, 60, 55, 255);
  fillRect(png, cx + 6, cy - 5, 18, 20, 55, 60, 55, 255);

  // Door handles
  fillRect(png, cx - 8, cy + 2, 2, 6, 100, 100, 90, 255);
  fillRect(png, cx + 22, cy + 2, 2, 6, 100, 100, 90, 255);

  // Camo paint pattern
  for (let i = 0; i < 20; i++) {
    const px = cx - 25 + noise(i, 0, 440) * 50;
    const py = cy - 12 + noise(i, 1, 440) * 26;
    drawEllipse(png, Math.round(px), Math.round(py), 5, 3,
      clamp(70 + noise(i, 2, 440) * 25),
      clamp(80 + noise(i, 3, 440) * 20),
      clamp(65 + noise(i, 4, 440) * 20), 80);
  }

  // Snow on roof
  for (let x = cx - 30; x <= cx + 30; x++) {
    const snowH = 3 + noise(x, 0, 441) * 5;
    for (let dy = 0; dy < snowH; dy++) {
      const fade = 1 - dy / snowH;
      setPixel(png, x, cy - 17 - dy, 210, 215, 225, clamp(fade * 230));
    }
  }

  // Antenna
  drawLine(png, cx + 25, cy - 17, cx + 25, cy - 35, 65, 70, 72, 255, 1);

  // Surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 2, y * 2, 442) - 0.5) * 8;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_supply_depot.png');
}

function createStructShieldGenerator() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Base hexagonal platform
  for (let dy = -12; dy <= 12; dy++) {
    const width = Math.round(28 - Math.abs(dy) * 1.2);
    for (let dx = -width; dx <= width; dx++) {
      const n = noise(cx + dx, cy + 20 + dy, 450) * 10;
      setPixel(png, cx + dx, cy + 20 + dy, clamp(70 + n), clamp(75 + n), clamp(80 + n), 255);
    }
  }

  // Central pylon
  fillRect(png, cx - 8, cy - 20, 16, 40, 80, 85, 100, 255);
  fillRect(png, cx - 6, cy - 18, 12, 36, 90, 95, 110, 255);

  // Energy coils (rings around pylon)
  for (let ring = 0; ring < 4; ring++) {
    const ry = cy - 15 + ring * 10;
    drawEllipse(png, cx, ry, 12, 3, 100, 180, 255, 200);
    drawEllipse(png, cx, ry, 10, 2, 150, 210, 255, 160);
  }

  // Shield energy dome (translucent)
  for (let dy = -30; dy <= 0; dy++) {
    const r = Math.sqrt(30 * 30 - dy * dy);
    for (let dx = -r; dx <= r; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy) / 30;
      const edgeGlow = dist > 0.85 ? (dist - 0.85) * 6.6 : 0;
      if (edgeGlow > 0) {
        setPixel(png, Math.round(cx + dx), cy + 5 + dy,
          clamp(80 + edgeGlow * 50), clamp(160 + edgeGlow * 60), clamp(255),
          clamp(edgeGlow * 120));
      }
    }
  }

  // Top emitter
  drawFilledCircle(png, cx, cy - 22, 5, 100, 180, 255, 230);
  drawFilledCircle(png, cx, cy - 22, 3, 150, 220, 255, 255);

  // Power cables from base
  for (const side of [-1, 1]) {
    drawLine(png, cx + side * 25, cy + 25, cx + side * 8, cy + 5, 60, 100, 150, 180, 2);
  }

  savePNG(png, 'struct_shield_generator.png');
}

function createPropIceFormation() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 38;

  // Crystal ice spires
  for (let i = 0; i < 5; i++) {
    const bx = cx + (i - 2) * 8 + (noise(i, 0, 460) - 0.5) * 6;
    const height = 15 + noise(i, 1, 460) * 20;
    const width = 3 + noise(i, 2, 460) * 3;

    for (let dy = 0; dy < height; dy++) {
      const t = dy / height;
      const w = width * (1 - t * 0.7);
      for (let dx = -w; dx <= w; dx++) {
        const edgeFade = 1 - Math.abs(dx) / (w + 1);
        const shade = 180 + edgeFade * 40 + t * 20;
        const n = noise(bx + dx, cy - dy, 461) * 15;
        setPixel(png, Math.round(bx + dx), Math.round(cy - dy),
          clamp(shade - 10 + n), clamp(shade + n), clamp(shade + 20 + n),
          clamp(200 + edgeFade * 55));
      }
    }
  }

  // Base snow
  drawEllipse(png, cx, cy + 5, 20, 6, 200, 210, 225, 150);

  savePNG(png, 'prop_ice_formation.png');
}

function createPropFrozenDebris() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Twisted metal piece
  for (let i = 0; i < 4; i++) {
    const px = cx + (noise(i, 0, 470) - 0.5) * 30;
    const py = cy + (noise(i, 1, 470) - 0.5) * 25;
    const angle = noise(i, 2, 470) * Math.PI;
    const len = 8 + noise(i, 3, 470) * 10;
    const ex = px + Math.cos(angle) * len;
    const ey = py + Math.sin(angle) * len;
    drawLine(png, Math.round(px), Math.round(py), Math.round(ex), Math.round(ey),
      clamp(80 + noise(i, 4, 470) * 30),
      clamp(85 + noise(i, 5, 470) * 25),
      clamp(90 + noise(i, 6, 470) * 20),
      230, 2);
  }

  // Panel fragments
  for (let i = 0; i < 3; i++) {
    const px = cx + (noise(i, 10, 471) - 0.5) * 35;
    const py = cy + (noise(i, 11, 471) - 0.5) * 30;
    const w = 5 + noise(i, 12, 471) * 6;
    const h = 4 + noise(i, 13, 471) * 5;
    fillRect(png, Math.round(px), Math.round(py), Math.round(w), Math.round(h),
      clamp(70 + noise(i, 14, 471) * 25),
      clamp(75 + noise(i, 15, 471) * 20),
      clamp(80 + noise(i, 16, 471) * 20), 210);
  }

  // Frost/ice coating on debris
  for (let i = 0; i < 10; i++) {
    const fx = cx + (noise(i, 20, 472) - 0.5) * 40;
    const fy = cy + (noise(i, 21, 472) - 0.5) * 35;
    const idx = (64 * Math.round(fy) + Math.round(fx)) * 4;
    if (idx >= 0 && idx < png.data.length && png.data[idx + 3] > 0) {
      drawFilledCircle(png, Math.round(fx), Math.round(fy), 2, 190, 210, 235, 100);
    }
  }

  savePNG(png, 'prop_frozen_debris.png');
}

function createPropCrackedIce() {
  const png = createPNG(64, 64);

  // Ice surface patch with crack pattern
  const cx = 32, cy = 32;

  // Ice base (oval patch)
  for (let dy = -24; dy <= 24; dy++) {
    for (let dx = -28; dx <= 28; dx++) {
      const dist = (dx * dx) / (28 * 28) + (dy * dy) / (24 * 24);
      if (dist <= 1) {
        const n = noise(cx + dx, cy + dy, 480) * 18;
        const shade = 185 + (1 - dist) * 30 + n;
        setPixel(png, cx + dx, cy + dy,
          clamp(shade - 10), clamp(shade), clamp(shade + 15),
          clamp((1 - dist * 0.5) * 220));
      }
    }
  }

  // Crack lines radiating from center
  for (let i = 0; i < 6; i++) {
    let px = cx, py = cy;
    const angle = (i / 6) * Math.PI * 2 + noise(i, 0, 481) * 0.5;
    const segments = 5 + Math.floor(noise(i, 1, 481) * 5);
    for (let s = 0; s < segments; s++) {
      const len = 3 + noise(i, s + 2, 481) * 4;
      const devAngle = angle + (noise(i, s + 10, 481) - 0.5) * 1.2;
      const nx = px + Math.cos(devAngle) * len;
      const ny = py + Math.sin(devAngle) * len;
      drawLine(png, Math.round(px), Math.round(py), Math.round(nx), Math.round(ny),
        clamp(120 + noise(i, s, 482) * 30),
        clamp(140 + noise(i, s + 1, 482) * 25),
        clamp(170 + noise(i, s + 2, 482) * 20),
        200, 1);
      px = nx;
      py = ny;

      // Branch cracks
      if (noise(i, s + 20, 481) > 0.6) {
        const bAngle = devAngle + (noise(i, s + 30, 481) > 0.5 ? 0.7 : -0.7);
        const bLen = 2 + noise(i, s + 40, 481) * 3;
        const bx = px + Math.cos(bAngle) * bLen;
        const by = py + Math.sin(bAngle) * bLen;
        drawLine(png, Math.round(px), Math.round(py), Math.round(bx), Math.round(by),
          130, 150, 180, 160, 1);
      }
    }
  }

  savePNG(png, 'prop_cracked_ice.png');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log('Generating Level 15-17 terrain assets...\n');

console.log('=== Level 15: Volcano ===');
createHorizonVolcano();
createGroundVolcanic();
createStructLavaPipe();
createStructRockSpire();
createStructExtractionUnit();
createPropLavaFlow();
createPropVolcanicRock();
createPropAshDeposit();

console.log('\n=== Level 16: Ocean ===');
createHorizonOcean();
createGroundWater();
createStructOilPlatform();
createStructDockCrane();
createStructSeaWall();
createStructRadarDome();
createPropBuoy();
createPropWaveBreak();
createPropCargoCrate();

console.log('\n=== Level 17: Tundra ===');
createHorizonTundra();
createGroundIce();
createStructIceBunker();
createStructFrozenTurret();
createStructSupplyDepot();
createStructShieldGenerator();
createPropIceFormation();
createPropFrozenDebris();
createPropCrackedIce();

console.log('\nDone! All 26 assets generated.');
