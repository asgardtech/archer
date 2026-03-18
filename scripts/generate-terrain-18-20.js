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
// LEVEL 18: ANCIENT RUINS ASSETS (Cyan/Teal palette)
// ═══════════════════════════════════════════════════════════════

function createHorizonRuins() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;
      const n1 = fbm(x, y, 4, 100, 500);
      const n2 = fbm(x + 300, y + 100, 3, 60, 501);

      let r = clamp(10 + t * 16 + n1 * 8);
      let g = clamp(10 + t * 22 + n1 * 12);
      let b = clamp(26 + t * 18 + n1 * 15);

      const mt1 = 130 + Math.sin(x * 0.006) * 20 + Math.sin(x * 0.025) * 10 + n1 * 15;
      const mt2 = 140 + Math.sin((x + 300) * 0.008) * 25 + n2 * 12;

      if (y > mt1 || y > mt2) {
        r = clamp(15 + n1 * 10);
        g = clamp(15 + n1 * 12);
        b = clamp(20 + n2 * 8);
      }

      // Obelisk silhouettes with cyan glow
      const obelisks = [120, 310, 520, 680];
      for (const ox of obelisks) {
        const oWidth = 6 + Math.sin(ox) * 2;
        const oHeight = 60 + noise(ox, 0, 502) * 40;
        const oTop = 140 - oHeight;
        if (Math.abs(x - ox) < oWidth && y > oTop && y < 160) {
          const taper = 1 - (160 - y) / (160 - oTop);
          const w = oWidth * (1 - taper * 0.4);
          if (Math.abs(x - ox) < w) {
            r = clamp(12 + n1 * 5);
            g = clamp(14 + n1 * 6);
            b = clamp(18 + n1 * 4);
          }
        }
        // Cyan glow at obelisk tips
        const tipDist = Math.sqrt((x - ox) * (x - ox) + (y - oTop) * (y - oTop));
        if (tipDist < 25) {
          const glow = (1 - tipDist / 25) * 0.5;
          r = clamp(r + glow * 20);
          g = clamp(g + glow * 180);
          b = clamp(b + glow * 160);
        }
      }

      // Ancient archway remnants
      for (const ax of [220, 450, 620]) {
        const archW = 30;
        const archH = 25;
        const archTop = 135;
        if (Math.abs(x - ax) < archW && y > archTop && y < archTop + archH) {
          const archDist = Math.abs(x - ax);
          const archInner = archW - 8;
          if (archDist > archInner || y > archTop + archH - 6) {
            r = clamp(18 + n1 * 8);
            g = clamp(18 + n1 * 6);
            b = clamp(22 + n2 * 5);
          }
        }
      }

      // Excavation equipment silhouettes (cranes)
      for (const eqx of [180, 570]) {
        if (Math.abs(x - eqx) < 2 && y > 110 && y < 155) {
          r = clamp(20);
          g = clamp(22);
          b = clamp(25);
        }
        if (y > 108 && y < 112 && x > eqx - 2 && x < eqx + 25) {
          r = clamp(20);
          g = clamp(22);
          b = clamp(25);
        }
      }

      // Cyan horizon glow
      if (y > 145 && y < 170) {
        const glowI = (1 - Math.abs(y - 155) / 12) * 0.15;
        r = clamp(r + glowI * 15);
        g = clamp(g + glowI * 100);
        b = clamp(b + glowI * 90);
      }

      // Green stars
      const star = noise(x * 7, y * 7, 503);
      if (star > 0.995 && y < 100) {
        r = clamp(r + 40);
        g = clamp(g + 180);
        b = clamp(b + 120);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_ruins.png');
}

function createGroundAncientStone() {
  const png = createPNG(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n1 = fbm(x, y, 4, 40, 510);
      const n2 = smoothNoise(x + 200, y + 150, 30, 511);
      const n3 = fbm(x * 2, y * 2, 3, 20, 512);

      let r = clamp(58 + n1 * 20 + n3 * 8);
      let g = clamp(58 + n1 * 18 + n2 * 10 + n3 * 6);
      let b = clamp(42 + n1 * 14 + n2 * 8 + n3 * 5);

      // Stone block pattern
      const blockX = Math.floor(x / 32);
      const blockY = Math.floor(y / 24);
      const bxOff = (blockY % 2) * 16;
      const localX = (x + bxOff) % 32;
      const localY = y % 24;
      if (localX < 2 || localY < 2) {
        r = clamp(r - 15);
        g = clamp(g - 15);
        b = clamp(b - 12);
      }

      // Cracks via FBM
      const crack = fbm(x * 3, y * 3, 3, 12, 513);
      if (crack > 0.62 && crack < 0.66) {
        r = clamp(r - 20);
        g = clamp(g - 18);
        b = clamp(b - 14);
      }

      // Glowing cyan glyphs
      const glyphNoise = noise(blockX * 7.3 + blockY * 13.7, blockY * 5.1, 514);
      if (glyphNoise > 0.75) {
        const gx = localX - 16;
        const gy = localY - 12;
        const glyphPattern = Math.sin(gx * 0.8) * Math.cos(gy * 0.6) + noise(gx + x, gy + y, 515) * 0.5;
        if (glyphPattern > 0.7 && Math.abs(gx) < 10 && Math.abs(gy) < 8) {
          const glyphI = (glyphPattern - 0.7) * 3.3;
          r = clamp(r + glyphI * 30);
          g = clamp(g + glyphI * 160);
          b = clamp(b + glyphI * 140);
        }
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  makeTileable(png);
  savePNG(png, 'ground_ancient_stone.png');
}

function createStructObelisk() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Tall tapered obelisk
  for (let y = 8; y < 120; y++) {
    const t = (y - 8) / 112;
    const width = Math.round(5 + t * 16 + noise(y, 0, 520) * 3);
    for (let dx = -width; dx <= width; dx++) {
      const edgeFade = 1 - Math.abs(dx) / (width + 1);
      const n = noise(cx + dx, y, 521) * 18;
      const shade = 35 + t * 15 + edgeFade * 12 + n;
      setPixel(png, cx + dx, y,
        clamp(shade + 5), clamp(shade + 5), clamp(shade * 0.8), 255);
    }
  }

  // Alien geometric carvings
  for (let i = 0; i < 8; i++) {
    const cy = 25 + i * 12;
    const localW = Math.round(6 + (cy - 8) / 112 * 14);
    for (let dx = -localW + 2; dx <= localW - 2; dx++) {
      const pattern = Math.sin(dx * 1.2 + i) * Math.cos(cy * 0.3) + noise(dx, i, 522) * 0.4;
      if (pattern > 0.5) {
        setPixel(png, cx + dx, cy, 50, 180, 165, 140);
        setPixel(png, cx + dx, cy + 1, 45, 160, 145, 100);
      }
    }
  }

  // Cyan energy core running vertically
  for (let y = 12; y < 118; y++) {
    const pulse = Math.sin(y * 0.15) * 0.3 + 0.7;
    const coreW = 2 + noise(y, 0, 523) * 1.5;
    for (let dx = -coreW; dx <= coreW; dx++) {
      const fade = 1 - Math.abs(dx) / (coreW + 1);
      setPixel(png, cx + dx, y,
        clamp(30 + fade * 50 * pulse),
        clamp(160 + fade * 60 * pulse),
        clamp(140 + fade * 60 * pulse),
        clamp(fade * 200 * pulse));
    }
  }

  // Bright apex glow (brightness > 150)
  drawFilledCircle(png, cx, 10, 8, 80, 220, 200, 200);
  drawFilledCircle(png, cx, 10, 4, 120, 255, 230, 255);

  savePNG(png, 'struct_obelisk.png');
}

function createStructBrokenArch() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Left column (intact)
  for (let y = 35; y < 115; y++) {
    const width = 10 + noise(y, 0, 530) * 3;
    for (let dx = -width; dx <= width; dx++) {
      const n = noise(cx - 30 + dx, y, 531) * 15;
      const shade = 45 + n;
      setPixel(png, cx - 30 + dx, y, clamp(shade + 5), clamp(shade + 3), clamp(shade * 0.8), 255);
    }
  }

  // Arch span (broken at right side)
  for (let a = 0; a < Math.PI * 0.65; a += 0.02) {
    const arcR = 30;
    const arcThickness = 7;
    for (let t = -arcThickness; t <= arcThickness; t++) {
      const px = cx - 30 + Math.cos(a) * (arcR + t);
      const py = cy - 15 - Math.sin(a) * (arcR + t);
      const n = noise(px, py, 532) * 12;
      setPixel(png, Math.round(px), Math.round(py),
        clamp(50 + n), clamp(48 + n), clamp(38 + n), 255);
    }
  }

  // Crumbled debris at break point
  for (let i = 0; i < 15; i++) {
    const dx = cx + 5 + noise(i, 0, 533) * 30;
    const dy = cy - 10 + noise(i, 1, 533) * 50;
    const size = 2 + noise(i, 2, 533) * 5;
    drawFilledCircle(png, Math.round(dx), Math.round(dy), Math.round(size),
      clamp(40 + noise(i, 3, 533) * 20),
      clamp(38 + noise(i, 4, 533) * 18),
      clamp(30 + noise(i, 5, 533) * 14), 220);
  }

  // Residual energy glow in intact sections
  for (let a = 0; a < Math.PI * 0.5; a += 0.05) {
    const px = cx - 30 + Math.cos(a) * 30;
    const py = cy - 15 - Math.sin(a) * 30;
    const pulse = Math.sin(a * 4) * 0.3 + 0.4;
    setPixel(png, Math.round(px), Math.round(py),
      clamp(40 + pulse * 40), clamp(120 + pulse * 80), clamp(110 + pulse * 70),
      clamp(pulse * 150));
  }

  savePNG(png, 'struct_broken_arch.png');
}

function createStructAlienPillar() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Hexagonal pillar - angular cross-section
  for (let y = 10; y < 118; y++) {
    const t = (y - 10) / 108;
    const baseW = 14 + Math.sin(y * 0.05) * 2;
    for (let dx = -baseW; dx <= baseW; dx++) {
      const edgeFade = 1 - Math.abs(dx) / (baseW + 1);
      // Faceted look via angular shading
      const facet = Math.abs((dx + baseW) % 8 - 4) / 4;
      const n = noise(cx + dx, y, 540) * 12;
      const shade = 40 + edgeFade * 20 + facet * 15 + n;
      setPixel(png, cx + dx, y,
        clamp(shade + 3), clamp(shade + 5), clamp(shade * 0.85), 255);
    }
  }

  // Energy conduit through center (cyan glow, brightness > 150)
  for (let y = 12; y < 116; y++) {
    const pulse = Math.sin(y * 0.12) * 0.3 + 0.7;
    for (let dx = -3; dx <= 3; dx++) {
      const fade = 1 - Math.abs(dx) / 4;
      setPixel(png, cx + dx, y,
        clamp(40 + fade * 40 * pulse),
        clamp(140 + fade * 80 * pulse),
        clamp(130 + fade * 70 * pulse),
        clamp(fade * 220 * pulse));
    }
  }

  // Bright energy nodes at intervals (brightness > 150)
  for (let i = 0; i < 5; i++) {
    const nodeY = 20 + i * 22;
    drawFilledCircle(png, cx, nodeY, 5, 70, 220, 200, 230);
    drawFilledCircle(png, cx, nodeY, 3, 100, 255, 230, 255);
  }

  // Fine alien patterns on surface
  for (let i = 0; i < 12; i++) {
    const py = 15 + i * 8;
    const w = 12 + (py - 10) / 108 * 3;
    for (let dx = -w; dx <= w; dx += 2) {
      const pattern = noise(dx * 3, py * 2, 541);
      if (pattern > 0.65) {
        setPixel(png, cx + dx, py, 55, 165, 150, 100);
      }
    }
  }

  savePNG(png, 'struct_alien_pillar.png');
}

function createStructGlyphWall() {
  const png = createPNG(128, 128);

  // Wide wall segment (horizontal emphasis)
  const wallTop = 35, wallBottom = 95;
  for (let y = wallTop; y < wallBottom; y++) {
    for (let x = 10; x < 118; x++) {
      const n = noise(x, y, 550) * 15;
      const shade = 42 + n;
      // Stone block pattern
      const bx = x % 20;
      const by = (y - wallTop) % 15;
      if (bx < 1 || by < 1) {
        setPixel(png, x, y, clamp(shade - 10), clamp(shade - 8), clamp(shade * 0.7 - 5), 255);
      } else {
        setPixel(png, x, y, clamp(shade + 5), clamp(shade + 3), clamp(shade * 0.8), 255);
      }
    }
  }

  // Dense alien glyphs covering the wall (brightness > 150 for lit)
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      const gcx = 20 + gx * 20;
      const gcy = wallTop + 8 + gy * 14;
      const brightness = noise(gx, gy, 551) * 0.6 + 0.4;

      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -7; dx <= 7; dx++) {
          const gPattern = Math.sin(dx * 0.9 + gx) * Math.cos(dy * 0.7 + gy)
            + noise(dx + gx * 20, dy + gy * 14, 552) * 0.6;
          if (gPattern > 0.4) {
            const gi = (gPattern - 0.4) * 1.6 * brightness;
            setPixel(png, gcx + dx, gcy + dy,
              clamp(40 + gi * 40),
              clamp(100 + gi * 120),
              clamp(90 + gi * 110),
              clamp(gi * 200));
          }
        }
      }
    }
  }

  // Cracks between blocks
  for (let i = 0; i < 6; i++) {
    const cx = 15 + noise(i, 0, 553) * 98;
    const cy = wallTop + 5 + noise(i, 1, 553) * (wallBottom - wallTop - 10);
    for (let j = 0; j < 10; j++) {
      const px = cx + (noise(i, j + 2, 553) - 0.5) * 6;
      const py = cy + j * 2;
      if (py < wallBottom) {
        setPixel(png, Math.round(px), Math.round(py), 30, 28, 22, 200);
      }
    }
  }

  savePNG(png, 'struct_glyph_wall.png');
}

function createStructExcavationSite() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Ancient stone base
  fillRect(png, 15, cy + 5, 98, 30, 50, 48, 38, 255);
  fillRect(png, 17, cy + 7, 94, 26, 55, 52, 42, 255);

  // Excavation pit
  fillRect(png, cx - 20, cy + 10, 40, 18, 30, 28, 22, 255);
  fillRect(png, cx - 18, cy + 12, 36, 14, 25, 23, 18, 255);

  // Crane/drill structure
  fillRect(png, cx - 3, cy - 35, 6, 45, 90, 85, 75, 255);
  fillRect(png, cx - 1, cy - 33, 2, 41, 100, 95, 85, 255);

  // Crane arm
  drawLine(png, cx, cy - 35, cx + 30, cy - 25, 85, 80, 72, 255, 2);
  drawLine(png, cx + 30, cy - 25, cx + 30, cy + 5, 80, 76, 68, 255, 1);

  // Drill bit hanging from crane
  fillRect(png, cx + 28, cy + 2, 5, 10, 70, 70, 75, 255);
  for (let dy = 0; dy < 6; dy++) {
    const w = 3 - dy * 0.4;
    fillRect(png, cx + 30 - w, cy + 12 + dy, w * 2, 1, 80, 80, 85, 255);
  }

  // Floodlights
  drawFilledCircle(png, cx - 20, cy - 10, 3, 255, 240, 180, 200);
  drawFilledCircle(png, cx + 35, cy - 10, 3, 255, 240, 180, 200);

  // Light poles
  fillRect(png, cx - 22, cy - 10, 2, 20, 70, 68, 62, 255);
  fillRect(png, cx + 35, cy - 10, 2, 20, 70, 68, 62, 255);

  // Equipment boxes
  fillRect(png, 20, cy + 8, 12, 8, 75, 72, 65, 255);
  fillRect(png, 90, cy + 8, 15, 10, 80, 75, 68, 255);

  // Glyph hints exposed in pit
  for (let i = 0; i < 4; i++) {
    const gx = cx - 15 + i * 8;
    const gy = cy + 18;
    setPixel(png, gx, gy, 50, 160, 140, 120);
    setPixel(png, gx + 1, gy, 45, 140, 125, 100);
  }

  // Surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 2, y * 2, 560) - 0.5) * 10;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_excavation_site.png');
}

function createPropAlienArtifact() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Geometric crystalline shape - diamond-like
  for (let dy = -16; dy <= 16; dy++) {
    const w = 12 - Math.abs(dy) * 0.7;
    if (w <= 0) continue;
    for (let dx = -w; dx <= w; dx++) {
      const edgeFade = 1 - Math.sqrt(dx * dx + dy * dy) / 18;
      if (edgeFade <= 0) continue;
      const n = noise(cx + dx, cy + dy, 570) * 15;
      const facet = Math.abs(dx * 0.5 + dy * 0.3) % 6 < 3 ? 1.1 : 0.9;
      const shade = 30 + edgeFade * 35 + n;
      setPixel(png, cx + dx, cy + dy,
        clamp(shade * facet),
        clamp(shade * facet + edgeFade * 10),
        clamp(shade * 0.8 * facet),
        clamp(edgeFade * 240));
    }
  }

  // Cyan inner glow
  drawFilledCircle(png, cx, cy, 6, 50, 180, 160, 150);
  drawFilledCircle(png, cx, cy, 3, 70, 220, 200, 200);

  // Energy veins radiating out
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 0.3;
    for (let d = 4; d < 12; d++) {
      const px = cx + Math.cos(angle) * d;
      const py = cy + Math.sin(angle) * d;
      const fade = 1 - d / 12;
      setPixel(png, Math.round(px), Math.round(py), 45, 160, 140, clamp(fade * 140));
    }
  }

  savePNG(png, 'prop_alien_artifact.png');
}

function createPropDigSite() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Excavation pit - layered earth tones
  for (let dy = -20; dy <= 20; dy++) {
    for (let dx = -24; dx <= 24; dx++) {
      const dist = (dx * dx) / (24 * 24) + (dy * dy) / (20 * 20);
      if (dist <= 1) {
        const depth = dist;
        const n = noise(cx + dx, cy + dy, 580) * 15;
        // Layered earth colors getting darker toward center
        const r = clamp(55 - depth * 25 + n);
        const g = clamp(48 - depth * 20 + n);
        const b = clamp(35 - depth * 15 + n);
        setPixel(png, cx + dx, cy + dy, r, g, b, clamp((1 - depth * 0.3) * 230));
      }
    }
  }

  // Exposed stone layers with glyph hints
  for (let i = 0; i < 5; i++) {
    const gx = cx - 12 + i * 6;
    const gy = cy + 2 + noise(i, 0, 581) * 4;
    setPixel(png, gx, Math.round(gy), 45, 140, 125, 120);
    setPixel(png, gx + 1, Math.round(gy), 40, 130, 115, 100);
  }

  // Small equipment markers
  for (let i = 0; i < 3; i++) {
    const px = cx + (noise(i, 0, 582) - 0.5) * 30;
    const py = cy + (noise(i, 1, 582) - 0.5) * 20;
    fillRect(png, Math.round(px), Math.round(py), 2, 3, 120, 110, 80, 180);
  }

  // Rim highlight
  for (let a = 0; a < Math.PI * 2; a += 0.05) {
    const rx = cx + Math.cos(a) * 23;
    const ry = cy + Math.sin(a) * 19;
    setPixel(png, Math.round(rx), Math.round(ry), 65, 60, 48, 160);
  }

  savePNG(png, 'prop_dig_site.png');
}

function createPropEnergyConduit() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Alien energy pipe segment - horizontal
  for (let dx = -24; dx <= 24; dx++) {
    for (let dy = -6; dy <= 6; dy++) {
      const edgeFade = 1 - Math.abs(dy) / 7;
      const n = noise(cx + dx, cy + dy, 590) * 10;
      // Metallic outer shell
      const shade = 50 + edgeFade * 30 + n;
      setPixel(png, cx + dx, cy + dy, clamp(shade), clamp(shade + 3), clamp(shade + 8), 255);
    }
  }

  // Translucent energy flowing inside
  for (let dx = -22; dx <= 22; dx++) {
    for (let dy = -3; dy <= 3; dy++) {
      const flow = Math.sin(dx * 0.3 + dy * 0.5) * 0.5 + 0.5;
      const fade = 1 - Math.abs(dy) / 4;
      // Neutral cyan-white glow (works with all level palettes)
      setPixel(png, cx + dx, cy + dy,
        clamp(60 + flow * 60 * fade),
        clamp(160 + flow * 60 * fade),
        clamp(150 + flow * 70 * fade),
        clamp(fade * flow * 180));
    }
  }

  // Metallic mounts at each end
  for (const ex of [-24, 22]) {
    fillRect(png, cx + ex - 1, cy - 8, 4, 16, 65, 70, 78, 255);
    fillRect(png, cx + ex, cy - 7, 2, 14, 75, 80, 88, 255);
  }

  savePNG(png, 'prop_energy_conduit.png');
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 19: MEGACITY ASSETS (Purple/Violet palette)
// ═══════════════════════════════════════════════════════════════

function createHorizonMegacity() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;
      const n1 = fbm(x, y, 4, 100, 600);
      const n2 = fbm(x + 200, y + 100, 3, 60, 601);

      // Deep purple-black sky
      let r = clamp(10 + t * 16 + n1 * 10);
      let g = clamp(5 + t * 8 + n1 * 5);
      let b = clamp(32 + t * 26 + n1 * 18);

      // Massive tower silhouettes of varying heights
      const towers = [
        { x: 50, w: 18, h: 140 }, { x: 100, w: 12, h: 100 },
        { x: 160, w: 22, h: 160 }, { x: 220, w: 10, h: 90 },
        { x: 270, w: 16, h: 130 }, { x: 330, w: 25, h: 170 },
        { x: 400, w: 14, h: 110 }, { x: 450, w: 20, h: 150 },
        { x: 510, w: 8, h: 80 }, { x: 550, w: 18, h: 135 },
        { x: 610, w: 24, h: 165 }, { x: 670, w: 12, h: 95 },
        { x: 720, w: 16, h: 120 }, { x: 770, w: 20, h: 145 }
      ];

      for (const tw of towers) {
        const tTop = 195 - tw.h;
        if (Math.abs(x - tw.x) < tw.w && y > tTop) {
          const taper = (y - tTop) / tw.h;
          const w = tw.w * (1 - (1 - taper) * 0.15);
          if (Math.abs(x - tw.x) < w) {
            r = clamp(12 + n1 * 6);
            g = clamp(8 + n1 * 4);
            b = clamp(20 + n2 * 8);

            // Purple lit windows
            const winY = (y - tTop) % 10;
            const winX = (x - tw.x + tw.w) % 8;
            if (winY > 2 && winY < 7 && winX > 1 && winX < 5 && noise(x * 3, y * 3, 602) > 0.4) {
              r = clamp(r + 80 + noise(x, y, 603) * 40);
              g = clamp(g + 40 + noise(x, y, 604) * 20);
              b = clamp(b + 140 + noise(x, y, 605) * 40);
            }
          }
        }

        // Spire at top of tall towers
        if (tw.h > 120 && Math.abs(x - tw.x) < 3 && y > tTop - 15 && y <= tTop) {
          r = clamp(15);
          g = clamp(10);
          b = clamp(25);
        }
      }

      // Energy shield domes (purple arcs)
      for (const sx of [200, 500]) {
        const shieldR = 80;
        const shieldY = 180;
        const dist = Math.sqrt((x - sx) * (x - sx) + (y - shieldY) * (y - shieldY));
        if (dist > shieldR - 3 && dist < shieldR + 3 && y < shieldY) {
          const edgeGlow = 1 - Math.abs(dist - shieldR) / 3;
          r = clamp(r + edgeGlow * 80);
          g = clamp(g + edgeGlow * 40);
          b = clamp(b + edgeGlow * 160);
        }
      }

      // Transit tube lines connecting towers
      for (const ty of [100, 140]) {
        if (Math.abs(y - ty) < 1) {
          const tubeN = noise(x, ty, 606);
          if (tubeN > 0.3) {
            r = clamp(r + 20);
            g = clamp(g + 10);
            b = clamp(b + 40);
          }
        }
      }

      // Weapon fire / explosions
      const explPositions = [{ x: 280, y: 90 }, { x: 520, y: 70 }, { x: 700, y: 110 }];
      for (const ep of explPositions) {
        const dist = Math.sqrt((x - ep.x) * (x - ep.x) + (y - ep.y) * (y - ep.y));
        if (dist < 20) {
          const glow = (1 - dist / 20) * 0.6;
          r = clamp(r + glow * 200);
          g = clamp(g + glow * 120);
          b = clamp(b + glow * 160);
        }
      }

      // Purple horizon glow
      if (y > 160) {
        const hGlow = (y - 160) / 40 * 0.2;
        r = clamp(r + hGlow * 60);
        g = clamp(g + hGlow * 20);
        b = clamp(b + hGlow * 120);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_megacity.png');
}

function createGroundAlienMetal() {
  const png = createPNG(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n1 = fbm(x, y, 4, 40, 610);
      const n2 = smoothNoise(x + 200, y + 150, 30, 611);
      const n3 = fbm(x * 2, y * 2, 3, 20, 612);

      // Dark blue-purple metallic surface
      let r = clamp(26 + n1 * 12 + n3 * 5);
      let g = clamp(26 + n1 * 10 + n2 * 6 + n3 * 4);
      let b = clamp(42 + n1 * 16 + n2 * 10 + n3 * 6);

      // Hexagonal panel pattern
      const hx = x / 32;
      const hy = y / 28;
      const hRow = Math.floor(hy);
      const hCol = Math.floor(hx + (hRow % 2) * 0.5);
      const hcx = hCol * 32 - (hRow % 2) * 16;
      const hcy = hRow * 28;
      const localX = x - hcx;
      const localY = y - hcy;
      const hexDist = Math.max(Math.abs(localX - 16), Math.abs(localY - 14) * 1.15);
      if (hexDist > 14 && hexDist < 16) {
        // Purple energy at seams
        r = clamp(r + 30);
        g = clamp(g + 15);
        b = clamp(b + 60);
      }

      // Metallic sheen highlights
      const sheen = Math.sin(x * 0.1 + n1 * 3) * Math.cos(y * 0.08 + n2 * 2);
      if (sheen > 0.6) {
        const si = (sheen - 0.6) * 2.5;
        r = clamp(r + si * 12);
        g = clamp(g + si * 10);
        b = clamp(b + si * 18);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  makeTileable(png);
  savePNG(png, 'ground_alien_metal.png');
}

function createStructAlienSkyscraper() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Towering alien building, tall angular
  for (let y = 5; y < 122; y++) {
    const t = (y - 5) / 117;
    const width = Math.round(8 + t * 18 + Math.sin(y * 0.04) * 3);
    for (let dx = -width; dx <= width; dx++) {
      const edgeFade = 1 - Math.abs(dx) / (width + 1);
      const n = noise(cx + dx, y, 620) * 14;
      const shade = 20 + edgeFade * 18 + n;
      setPixel(png, cx + dx, y,
        clamp(shade + 5), clamp(shade + 2), clamp(shade + 15), 255);
    }
  }

  // Multiple tiers with purple-lit windows (brightness > 150)
  for (let tier = 0; tier < 6; tier++) {
    const ty = 15 + tier * 18;
    const tierW = 8 + (ty - 5) / 117 * 16;
    // Tier divider line
    for (let dx = -tierW; dx <= tierW; dx++) {
      setPixel(png, cx + dx, ty, 30, 25, 45, 255);
    }
    // Windows in this tier
    for (let wx = -tierW + 3; wx < tierW - 3; wx += 6) {
      for (let wy = 2; wy < 12; wy += 1) {
        if (wy > 3 && wy < 10 && noise(wx + tier * 10, wy, 621) > 0.35) {
          setPixel(png, cx + wx, ty + wy,
            clamp(100 + noise(wx, wy + tier, 622) * 60),
            clamp(60 + noise(wx, wy + tier, 623) * 30),
            clamp(180 + noise(wx, wy + tier, 624) * 50), 230);
        }
      }
    }
  }

  // Alien antenna/spire at top
  for (let y = 2; y < 10; y++) {
    setPixel(png, cx, y, 35, 28, 55, 255);
    setPixel(png, cx + 1, y, 32, 25, 50, 200);
  }
  drawFilledCircle(png, cx, 3, 3, 140, 100, 220, 220);

  savePNG(png, 'struct_alien_skyscraper.png');
}

function createStructShieldPylon() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Wide base tapering to emitter
  for (let y = 25; y < 115; y++) {
    const t = (y - 25) / 90;
    const width = Math.round(6 + t * 20);
    for (let dx = -width; dx <= width; dx++) {
      const edgeFade = 1 - Math.abs(dx) / (width + 1);
      const n = noise(cx + dx, y, 630) * 12;
      const shade = 28 + edgeFade * 22 + n;
      setPixel(png, cx + dx, y,
        clamp(shade + 8), clamp(shade + 4), clamp(shade + 18), 255);
    }
  }

  // Power conduits running up sides
  for (const side of [-1, 1]) {
    for (let y = 30; y < 112; y++) {
      const t = (y - 30) / 82;
      const xOff = (6 + t * 18) * side;
      const pulse = Math.sin(y * 0.1) * 0.3 + 0.7;
      setPixel(png, cx + Math.round(xOff), y,
        clamp(80 * pulse), clamp(50 * pulse), clamp(160 * pulse), 200);
      setPixel(png, cx + Math.round(xOff) - side, y,
        clamp(60 * pulse), clamp(40 * pulse), clamp(130 * pulse), 150);
    }
  }

  // Energy emitter at top (brightness > 200)
  drawFilledCircle(png, cx, 25, 10, 120, 80, 200, 220);
  drawFilledCircle(png, cx, 25, 6, 160, 120, 240, 240);
  drawFilledCircle(png, cx, 25, 3, 200, 180, 255, 255);

  // Energy field arc above emitter
  for (let a = 0.2; a < Math.PI - 0.2; a += 0.03) {
    const arcR = 18;
    const px = cx + Math.cos(a) * arcR;
    const py = 25 - Math.sin(a) * arcR;
    const fade = Math.sin(a);
    setPixel(png, Math.round(px), Math.round(py),
      clamp(130 * fade), clamp(90 * fade), clamp(220 * fade),
      clamp(fade * 180));
    setPixel(png, Math.round(px), Math.round(py) - 1,
      clamp(100 * fade), clamp(70 * fade), clamp(180 * fade),
      clamp(fade * 100));
  }

  savePNG(png, 'struct_shield_pylon.png');
}

function createStructTransitTube() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 55;

  // Support pylons beneath
  for (const px of [30, 64, 98]) {
    fillRect(png, px - 4, cy + 8, 8, 50, 35, 30, 50, 255);
    fillRect(png, px - 3, cy + 10, 6, 46, 42, 36, 58, 255);
    // Pylon base
    fillRect(png, px - 6, cy + 55, 12, 5, 40, 35, 55, 255);
  }

  // Main tube body - horizontal emphasis
  for (let dx = -55; dx <= 55; dx++) {
    for (let dy = -10; dy <= 10; dy++) {
      const edgeFade = 1 - Math.abs(dy) / 11;
      const n = noise(cx + dx, cy + dy, 640) * 10;
      const shade = 30 + edgeFade * 25 + n;
      setPixel(png, cx + dx, cy + dy,
        clamp(shade + 5), clamp(shade + 2), clamp(shade + 15), 255);
    }
  }

  // Translucent section showing energy flow inside
  for (let dx = -20; dx <= 20; dx++) {
    for (let dy = -6; dy <= 6; dy++) {
      const flow = Math.sin((dx + cx) * 0.2) * 0.5 + 0.5;
      const fade = 1 - Math.abs(dy) / 7;
      setPixel(png, cx + dx, cy + dy,
        clamp(60 + flow * 50 * fade),
        clamp(35 + flow * 30 * fade),
        clamp(120 + flow * 80 * fade),
        clamp(fade * flow * 160));
    }
  }

  // Purple lighting along tube
  for (let dx = -50; dx <= 50; dx += 12) {
    setPixel(png, cx + dx, cy - 10, 100, 60, 180, 180);
    setPixel(png, cx + dx + 1, cy - 10, 90, 55, 160, 150);
  }

  // Damage/siege marks
  for (let i = 0; i < 3; i++) {
    const dmx = cx - 30 + noise(i, 0, 641) * 60;
    const dmy = cy + noise(i, 1, 641) * 10 - 5;
    drawFilledCircle(png, Math.round(dmx), Math.round(dmy), 3,
      15, 12, 22, 200);
  }

  savePNG(png, 'struct_transit_tube.png');
}

function createStructDefenseBattery() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Fixed base - armored platform
  drawEllipse(png, cx, cy + 20, 30, 12, 35, 30, 50, 255);
  drawEllipse(png, cx, cy + 18, 28, 10, 42, 36, 58, 255);

  // Rotating mount
  fillRect(png, cx - 15, cy - 5, 30, 25, 38, 32, 55, 255);
  fillRect(png, cx - 13, cy - 3, 26, 21, 45, 38, 62, 255);

  // Multiple barrels
  for (const bOff of [-8, 0, 8]) {
    fillRect(png, cx + bOff - 2, cy - 35, 5, 32, 40, 35, 58, 255);
    fillRect(png, cx + bOff - 1, cy - 33, 3, 28, 48, 42, 65, 255);
    // Barrel tip glow
    drawFilledCircle(png, cx + bOff, cy - 35, 3, 140, 100, 220, 200);
  }

  // Active firing indicators (brightness > 150)
  drawFilledCircle(png, cx, cy - 38, 5, 130, 90, 210, 220);
  drawFilledCircle(png, cx, cy - 38, 3, 170, 130, 240, 255);

  // Alien markings on armor
  for (let i = 0; i < 4; i++) {
    const mx = cx - 10 + i * 7;
    const my = cy + 5;
    setPixel(png, mx, my, 80, 55, 150, 120);
    setPixel(png, mx + 1, my, 75, 50, 140, 100);
  }

  // Surface noise
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const idx = (128 * y + x) * 4;
      if (png.data[idx + 3] > 0) {
        const n = (noise(x * 2, y * 2, 650) - 0.5) * 8;
        png.data[idx] = clamp(png.data[idx] + n);
        png.data[idx + 1] = clamp(png.data[idx + 1] + n);
        png.data[idx + 2] = clamp(png.data[idx + 2] + n);
      }
    }
  }

  savePNG(png, 'struct_defense_battery.png');
}

function createStructPowerNode() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Hexagonal base platform
  for (let dy = -15; dy <= 15; dy++) {
    const width = Math.round(32 - Math.abs(dy) * 1.4);
    for (let dx = -width; dx <= width; dx++) {
      const n = noise(cx + dx, cy + 20 + dy, 660) * 10;
      setPixel(png, cx + dx, cy + 20 + dy,
        clamp(32 + n), clamp(28 + n), clamp(48 + n), 255);
    }
  }

  // Central energy core (brightness > 200)
  drawFilledCircle(png, cx, cy, 14, 60, 40, 120, 255);
  drawFilledCircle(png, cx, cy, 10, 100, 70, 180, 240);
  drawFilledCircle(png, cx, cy, 6, 160, 130, 240, 255);
  drawFilledCircle(png, cx, cy, 3, 200, 180, 255, 255);

  // Branching conduits from center
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    for (let d = 14; d < 30; d++) {
      const px = cx + Math.cos(angle) * d;
      const py = cy + Math.sin(angle) * d * 0.7;
      const fade = 1 - (d - 14) / 16;
      const pulse = Math.sin(d * 0.3 + i) * 0.3 + 0.7;
      setPixel(png, Math.round(px), Math.round(py),
        clamp(80 * fade * pulse),
        clamp(50 * fade * pulse),
        clamp(160 * fade * pulse), clamp(fade * 200));
      setPixel(png, Math.round(px) + 1, Math.round(py),
        clamp(60 * fade * pulse),
        clamp(40 * fade * pulse),
        clamp(130 * fade * pulse), clamp(fade * 150));
    }
  }

  // Radiating power lines to edges
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const ex = cx + Math.cos(angle) * 38;
    const ey = cy + Math.sin(angle) * 28;
    drawLine(png, cx + Math.round(Math.cos(angle) * 15), cy + Math.round(Math.sin(angle) * 10),
      Math.round(ex), Math.round(ey), 70, 45, 140, 160, 1);
  }

  savePNG(png, 'struct_power_node.png');
}

function createPropAlienSignage() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 28;

  // Mounting post
  fillRect(png, cx - 1, cy + 8, 3, 20, 40, 35, 55, 255);

  // Sign panel (dark background)
  fillRect(png, cx - 18, cy - 10, 36, 20, 22, 18, 35, 255);
  fillRect(png, cx - 16, cy - 8, 32, 16, 18, 14, 30, 255);

  // Glowing alien characters
  for (let i = 0; i < 5; i++) {
    const gx = cx - 12 + i * 6;
    const gy = cy - 4;
    // Each "character" is a small procedural glyph
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const pattern = noise(dx + i * 5, dy + i * 3, 670) > 0.4;
        if (pattern) {
          const bi = noise(i, 0, 671) * 0.5 + 0.5;
          setPixel(png, gx + dx, gy + dy,
            clamp(100 * bi), clamp(60 * bi), clamp(200 * bi), 200);
        }
      }
    }
  }

  // Border glow
  for (let x = cx - 17; x <= cx + 17; x++) {
    setPixel(png, x, cy - 9, 80, 50, 150, 120);
    setPixel(png, x, cy + 7, 80, 50, 150, 120);
  }
  for (let y = cy - 9; y <= cy + 7; y++) {
    setPixel(png, cx - 17, y, 80, 50, 150, 120);
    setPixel(png, cx + 17, y, 80, 50, 150, 120);
  }

  savePNG(png, 'prop_alien_signage.png');
}

function createPropStructuralDebris() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Alien metal fragments
  for (let i = 0; i < 6; i++) {
    const px = cx + (noise(i, 0, 680) - 0.5) * 40;
    const py = cy + (noise(i, 1, 680) - 0.5) * 35;
    const w = 4 + noise(i, 2, 680) * 8;
    const h = 3 + noise(i, 3, 680) * 6;
    const angle = noise(i, 4, 680) * 0.5;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const rx = px + dx * Math.cos(angle) - dy * Math.sin(angle);
        const ry = py + dx * Math.sin(angle) + dy * Math.cos(angle);
        const n = noise(dx + i * 10, dy, 681) * 15;
        setPixel(png, Math.round(rx), Math.round(ry),
          clamp(30 + n), clamp(28 + n), clamp(45 + n), 220);
      }
    }
  }

  // Scorch marks
  for (let i = 0; i < 3; i++) {
    const sx = cx + (noise(i, 10, 682) - 0.5) * 30;
    const sy = cy + (noise(i, 11, 682) - 0.5) * 25;
    drawFilledCircle(png, Math.round(sx), Math.round(sy),
      3 + noise(i, 12, 682) * 3, 15, 12, 20, 150);
  }

  // Purple energy residue
  for (let i = 0; i < 4; i++) {
    const rx = cx + (noise(i, 20, 683) - 0.5) * 35;
    const ry = cy + (noise(i, 21, 683) - 0.5) * 30;
    drawFilledCircle(png, Math.round(rx), Math.round(ry), 2,
      80, 50, 140, 100);
  }

  savePNG(png, 'prop_structural_debris.png');
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 20: DOMINION CORE ASSETS (Red/Crimson palette)
// ═══════════════════════════════════════════════════════════════

function createHorizonDominionBase() {
  const png = createPNG(800, 200);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < 800; x++) {
      const t = y / 200;
      const n1 = fbm(x, y, 4, 100, 700);
      const n2 = fbm(x + 200, y + 100, 3, 60, 701);

      // Near-total darkness sky
      let r = clamp(5 + t * 11 + n1 * 8);
      let g = clamp(0 + t * 5 + n1 * 3);
      let b = clamp(5 + t * 8 + n1 * 5);

      // Massive central command core structure
      const coreX = 400;
      const coreW = 80;
      const coreTop = 40;
      if (Math.abs(x - coreX) < coreW && y > coreTop) {
        const taper = 1 - (y - coreTop) / (200 - coreTop);
        const w = coreW * (0.3 + taper * 0.7);
        if (Math.abs(x - coreX) < w) {
          r = clamp(10 + n1 * 5);
          g = clamp(3 + n1 * 2);
          b = clamp(8 + n2 * 4);

          // Red energy lines
          const eline = (y - coreTop) % 15;
          if (eline < 2) {
            r = clamp(r + 120);
            g = clamp(g + 15);
            b = clamp(b + 20);
          }
        }
      }

      // Energy beams shooting upward from core
      for (const bx of [coreX - 20, coreX, coreX + 20]) {
        if (Math.abs(x - bx) < 3 && y < coreTop + 30) {
          const beamI = (1 - Math.abs(x - bx) / 3) * (1 - y / (coreTop + 30));
          r = clamp(r + beamI * 200);
          g = clamp(g + beamI * 40);
          b = clamp(b + beamI * 30);
        }
        // Beam glow
        if (Math.abs(x - bx) < 12 && y < coreTop + 40) {
          const dist = Math.abs(x - bx);
          const glowI = (1 - dist / 12) * 0.15 * (1 - y / (coreTop + 40));
          r = clamp(r + glowI * 180);
          g = clamp(g + glowI * 30);
          b = clamp(b + glowI * 20);
        }
      }

      // Flanking weapon array silhouettes
      const weaponPositions = [
        { x: 150, w: 15, h: 80 }, { x: 250, w: 20, h: 100 },
        { x: 550, w: 20, h: 100 }, { x: 650, w: 15, h: 80 }
      ];
      for (const wp of weaponPositions) {
        const wpTop = 195 - wp.h;
        if (Math.abs(x - wp.x) < wp.w && y > wpTop) {
          r = clamp(8 + n1 * 4);
          g = clamp(3 + n1 * 2);
          b = clamp(6 + n2 * 3);
        }
        // Weapon glow at top
        const wpDist = Math.sqrt((x - wp.x) * (x - wp.x) + (y - wpTop) * (y - wpTop));
        if (wpDist < 15) {
          const glow = (1 - wpDist / 15) * 0.4;
          r = clamp(r + glow * 160);
          g = clamp(g + glow * 30);
          b = clamp(b + glow * 20);
        }
      }

      // Lightning-like energy arcs
      for (let arc = 0; arc < 4; arc++) {
        const arcX = 100 + arc * 200 + noise(arc, 0, 702) * 50;
        const arcY = 20 + noise(arc, 1, 702) * 80;
        const dist = Math.sqrt((x - arcX) * (x - arcX) + (y - arcY) * (y - arcY));
        if (dist < 5) {
          const ai = (1 - dist / 5);
          r = clamp(r + ai * 220);
          g = clamp(g + ai * 60);
          b = clamp(b + ai * 80);
        }
      }

      // Red/crimson sky glow
      if (y > 150) {
        const hGlow = (y - 150) / 50 * 0.2;
        r = clamp(r + hGlow * 100);
        g = clamp(g + hGlow * 10);
        b = clamp(b + hGlow * 15);
      }

      // Smoke/fire atmosphere
      const smoke = fbm(x, y, 3, 50, 703);
      if (smoke > 0.55) {
        const si = (smoke - 0.55) * 2.2;
        r = clamp(r + si * 40);
        g = clamp(g + si * 8);
        b = clamp(b + si * 5);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  savePNG(png, 'horizon_dominion_base.png');
}

function createGroundDominionHull() {
  const png = createPNG(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const n1 = fbm(x, y, 4, 40, 710);
      const n2 = smoothNoise(x + 200, y + 150, 30, 711);
      const n3 = fbm(x * 2, y * 2, 3, 20, 712);

      // Very dark alien hull plating
      let r = clamp(10 + n1 * 8 + n3 * 4);
      let g = clamp(10 + n1 * 6 + n2 * 4 + n3 * 3);
      let b = clamp(20 + n1 * 10 + n2 * 6 + n3 * 4);

      // Heavy geometric panel pattern
      const panelX = x % 40;
      const panelY = y % 40;
      if (panelX < 2 || panelY < 2) {
        // Red energy veins between panels
        r = clamp(r + 60 + n1 * 30);
        g = clamp(g + 5);
        b = clamp(b + 8);
      }

      // Secondary fine panel grid
      const fineX = x % 10;
      const fineY = y % 10;
      if ((fineX === 0 || fineY === 0) && panelX > 2 && panelY > 2) {
        r = clamp(r + 8);
        g = clamp(g + 3);
        b = clamp(b + 5);
      }

      setPixel(png, x, y, r, g, b, 255);
    }
  }
  makeTileable(png);
  savePNG(png, 'ground_dominion_hull.png');
}

function createStructDominionSpire() {
  const png = createPNG(128, 128);
  const cx = 64;

  // Tallest structure - dark angular architecture
  for (let y = 3; y < 124; y++) {
    const t = (y - 3) / 121;
    const width = Math.round(4 + t * 22 + Math.sin(y * 0.03) * 2);
    for (let dx = -width; dx <= width; dx++) {
      const edgeFade = 1 - Math.abs(dx) / (width + 1);
      const n = noise(cx + dx, y, 720) * 12;
      const shade = 12 + edgeFade * 16 + n;
      setPixel(png, cx + dx, y,
        clamp(shade + 5), clamp(shade), clamp(shade + 3), 255);
    }
  }

  // Red energy core running full height
  for (let y = 5; y < 122; y++) {
    const pulse = Math.sin(y * 0.1) * 0.3 + 0.7;
    for (let dx = -2; dx <= 2; dx++) {
      const fade = 1 - Math.abs(dx) / 3;
      setPixel(png, cx + dx, y,
        clamp(160 * fade * pulse),
        clamp(20 * fade * pulse),
        clamp(30 * fade * pulse),
        clamp(fade * 200 * pulse));
    }
  }

  // Bright crimson beacon at apex (brightness > 200)
  drawFilledCircle(png, cx, 5, 8, 200, 40, 60, 220);
  drawFilledCircle(png, cx, 5, 4, 255, 80, 50, 255);

  // Weapon mounts on the structure
  for (let i = 0; i < 3; i++) {
    const mountY = 30 + i * 30;
    const mountW = 4 + (mountY - 3) / 121 * 20;
    for (const side of [-1, 1]) {
      fillRect(png, cx + Math.round(mountW * side), mountY - 2,
        8 * side, 4, 18, 14, 18, 255);
      drawFilledCircle(png, cx + Math.round((mountW + 6) * side), mountY, 2,
        180, 40, 50, 180);
    }
  }

  savePNG(png, 'struct_dominion_spire.png');
}

function createStructCommandNexus() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Wide imposing building
  fillRect(png, cx - 45, cy - 20, 90, 55, 14, 10, 16, 255);
  fillRect(png, cx - 43, cy - 18, 86, 51, 18, 14, 20, 255);

  // Multiple levels with red-lit windows (brightness > 150)
  for (let level = 0; level < 4; level++) {
    const ly = cy - 15 + level * 12;
    // Level divider
    for (let dx = -42; dx <= 42; dx++) {
      setPixel(png, cx + dx, ly, 22, 16, 22, 255);
    }
    // Red windows
    for (let wx = -38; wx < 38; wx += 8) {
      if (noise(wx, level, 730) > 0.3) {
        for (let wy = 2; wy < 8; wy++) {
          for (let wdx = 0; wdx < 4; wdx++) {
            setPixel(png, cx + wx + wdx, ly + wy,
              clamp(150 + noise(wx, wy + level, 731) * 80),
              clamp(20 + noise(wx, wy, 732) * 15),
              clamp(30 + noise(wx, wy, 733) * 20), 230);
          }
        }
      }
    }
  }

  // Communication arrays on roof
  for (const ax of [-25, 0, 25]) {
    drawLine(png, cx + ax, cy - 20, cx + ax, cy - 35, 20, 16, 22, 255, 1);
    drawLine(png, cx + ax - 5, cy - 30, cx + ax + 5, cy - 30, 20, 16, 22, 255, 1);
    drawFilledCircle(png, cx + ax, cy - 35, 2, 200, 40, 50, 200);
  }

  // Heavy fortification walls
  fillRect(png, cx - 48, cy + 20, 6, 18, 16, 12, 18, 255);
  fillRect(png, cx + 42, cy + 20, 6, 18, 16, 12, 18, 255);

  // Red energy core visible (brightness > 150)
  drawFilledCircle(png, cx, cy + 5, 8, 160, 30, 45, 200);
  drawFilledCircle(png, cx, cy + 5, 4, 220, 50, 60, 240);

  savePNG(png, 'struct_command_nexus.png');
}

function createStructEnergyCore() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Containment rings around the core
  for (let ring = 0; ring < 4; ring++) {
    const ringR = 30 - ring * 5;
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const px = cx + Math.cos(a) * ringR;
      const py = cy + Math.sin(a) * ringR * 0.8;
      const n = noise(a * 10, ring, 740) * 8;
      setPixel(png, Math.round(px), Math.round(py),
        clamp(25 + n), clamp(18 + n), clamp(28 + n), 255);
      setPixel(png, Math.round(px) + 1, Math.round(py),
        clamp(22 + n), clamp(16 + n), clamp(25 + n), 200);
    }
  }

  // Containment vessel (cylindrical)
  for (let dy = -25; dy <= 25; dy++) {
    const width = Math.round(22 - Math.abs(dy) * 0.3);
    for (let dx = -width; dx <= width; dx++) {
      const edgeFade = 1 - Math.abs(dx) / (width + 1);
      const n = noise(cx + dx, cy + dy, 741) * 10;
      const shade = 15 + edgeFade * 12 + n;
      setPixel(png, cx + dx, cy + dy,
        clamp(shade + 4), clamp(shade), clamp(shade + 2), 255);
    }
  }

  // Visible energy plasma inside (red-orange glow, brightness > 220)
  for (let dy = -18; dy <= 18; dy++) {
    for (let dx = -15; dx <= 15; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy) / 18;
      if (dist <= 1) {
        const intensity = (1 - dist);
        const pulse = Math.sin(dx * 0.3 + dy * 0.2) * 0.2 + 0.8;
        const n = noise(cx + dx, cy + dy, 742) * 0.2;
        setPixel(png, cx + dx, cy + dy,
          clamp(80 + intensity * 175 * (pulse + n)),
          clamp(15 + intensity * 65 * (pulse + n)),
          clamp(10 + intensity * 30 * (pulse + n)),
          clamp(intensity * 240));
      }
    }
  }

  // Extremely bright center
  drawFilledCircle(png, cx, cy, 6, 255, 100, 40, 255);
  drawFilledCircle(png, cx, cy, 3, 255, 160, 80, 255);

  savePNG(png, 'struct_energy_core.png');
}

function createStructWeaponArray() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Massive alien geometric base
  for (let dy = 10; dy <= 40; dy++) {
    const width = 35 - (dy - 10) * 0.3;
    for (let dx = -width; dx <= width; dx++) {
      const n = noise(cx + dx, cy + dy, 750) * 10;
      const shade = 14 + n;
      setPixel(png, cx + dx, cy + dy,
        clamp(shade + 3), clamp(shade), clamp(shade + 2), 255);
    }
  }

  // Multiple upward-angled barrel/emitters
  const barrels = [
    { ox: -20, angle: -0.4 }, { ox: -8, angle: -0.2 },
    { ox: 4, angle: 0.1 }, { ox: 16, angle: 0.3 }
  ];
  for (const b of barrels) {
    for (let d = 0; d < 45; d++) {
      const bx = cx + b.ox + Math.sin(b.angle) * d;
      const by = cy + 10 - Math.cos(b.angle) * d;
      for (let w = -2; w <= 2; w++) {
        const n = noise(d, w + b.ox, 751) * 8;
        setPixel(png, Math.round(bx + w * Math.cos(b.angle)), Math.round(by + w * Math.sin(b.angle)),
          clamp(20 + n), clamp(15 + n), clamp(22 + n), 255);
      }
    }
    // Red energy charging at barrel tip (brightness > 150)
    const tipX = cx + b.ox + Math.sin(b.angle) * 45;
    const tipY = cy + 10 - Math.cos(b.angle) * 45;
    drawFilledCircle(png, Math.round(tipX), Math.round(tipY), 4,
      200, 50, 40, 220);
    drawFilledCircle(png, Math.round(tipX), Math.round(tipY), 2,
      255, 80, 50, 255);
  }

  // Central power junction
  drawFilledCircle(png, cx, cy + 15, 8, 18, 14, 20, 255);
  drawFilledCircle(png, cx, cy + 15, 5, 160, 35, 45, 200);
  drawFilledCircle(png, cx, cy + 15, 3, 220, 60, 50, 240);

  savePNG(png, 'struct_weapon_array.png');
}

function createStructDominionGate() {
  const png = createPNG(128, 128);
  const cx = 64, cy = 64;

  // Twin towers flanking gate
  for (const side of [-1, 1]) {
    const towerX = cx + side * 30;
    for (let y = 15; y < 115; y++) {
      const width = 12 + Math.sin(y * 0.04) * 2;
      for (let dx = -width; dx <= width; dx++) {
        const edgeFade = 1 - Math.abs(dx) / (width + 1);
        const n = noise(towerX + dx, y, 760) * 10;
        const shade = 14 + edgeFade * 14 + n;
        setPixel(png, towerX + dx, y,
          clamp(shade + 4), clamp(shade), clamp(shade + 2), 255);
      }
    }

    // Tower top beacon
    drawFilledCircle(png, towerX, 15, 4, 180, 35, 50, 210);
    drawFilledCircle(png, towerX, 15, 2, 230, 60, 50, 255);

    // Defensive weapon mounts on towers (brightness > 150)
    for (let i = 0; i < 2; i++) {
      const mountY = 35 + i * 30;
      fillRect(png, towerX + side * 10, mountY - 2, 8 * side, 4, 22, 16, 24, 255);
      drawFilledCircle(png, towerX + side * 16, mountY, 2, 170, 40, 50, 190);
    }
  }

  // Heavy gate between towers
  fillRect(png, cx - 18, cy - 5, 36, 50, 12, 8, 14, 255);
  fillRect(png, cx - 16, cy - 3, 32, 46, 16, 12, 18, 255);

  // Gate reinforcement bars
  for (let i = 0; i < 4; i++) {
    fillRect(png, cx - 16, cy + i * 10, 32, 2, 20, 15, 22, 255);
  }

  // Energy barrier between towers (red glow, brightness > 150)
  for (let dx = -16; dx <= 16; dx++) {
    for (let dy = -4; dy <= 45; dy++) {
      const fade = 1 - Math.abs(dx) / 17;
      const pulse = Math.sin(dy * 0.2 + dx * 0.1) * 0.3 + 0.5;
      if (noise(dx + cx, dy + cy, 761) > 0.5) {
        setPixel(png, cx + dx, cy + dy,
          clamp(150 * fade * pulse),
          clamp(15 * fade * pulse),
          clamp(25 * fade * pulse),
          clamp(fade * pulse * 80));
      }
    }
  }

  savePNG(png, 'struct_dominion_gate.png');
}

function createPropAlienCable() {
  const png = createPNG(64, 64);
  const cx = 32, cy = 32;

  // Organic-looking curved cable
  for (let t = 0; t < 1; t += 0.005) {
    const px = cx - 20 + t * 40;
    const py = cy + Math.sin(t * Math.PI * 2) * 12 + Math.cos(t * Math.PI * 3) * 5;

    // Cable thickness with ribbed/segmented texture
    const segI = Math.floor(t * 20);
    const segFade = (t * 20 - segI) > 0.8 ? 0.7 : 1.0;
    const cableW = 3 + Math.sin(t * Math.PI * 6) * 0.8;

    for (let w = -cableW; w <= cableW; w++) {
      const edgeFade = 1 - Math.abs(w) / (cableW + 1);
      const shade = 20 + edgeFade * 20;
      // Red energy pulsing
      const pulse = Math.sin(t * 15) * 0.3 + 0.5;
      setPixel(png, Math.round(px), Math.round(py + w),
        clamp(shade + edgeFade * 80 * pulse * segFade),
        clamp(shade * 0.5 + edgeFade * 10 * pulse),
        clamp(shade * 0.6 + edgeFade * 15 * pulse),
        clamp(edgeFade * 230));
    }
  }

  savePNG(png, 'prop_alien_cable.png');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

console.log('Generating Level 18-20 terrain assets...\n');

console.log('=== Level 18: Ancient Ruins ===');
createHorizonRuins();
createGroundAncientStone();
createStructObelisk();
createStructBrokenArch();
createStructAlienPillar();
createStructGlyphWall();
createStructExcavationSite();
createPropAlienArtifact();
createPropDigSite();
createPropEnergyConduit();

console.log('\n=== Level 19: Megacity Siege ===');
createHorizonMegacity();
createGroundAlienMetal();
createStructAlienSkyscraper();
createStructShieldPylon();
createStructTransitTube();
createStructDefenseBattery();
createStructPowerNode();
createPropAlienSignage();
createPropStructuralDebris();

console.log('\n=== Level 20: Dominion Core ===');
createHorizonDominionBase();
createGroundDominionHull();
createStructDominionSpire();
createStructCommandNexus();
createStructEnergyCore();
createStructWeaponArray();
createStructDominionGate();
createPropAlienCable();

console.log('\nDone! All 27 assets generated.');
