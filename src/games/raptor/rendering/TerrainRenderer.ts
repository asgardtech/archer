import { TerrainLayerConfig, AmbientParticleConfig } from "../types";
import { AssetLoader } from "./AssetLoader";

const SEGMENT_HEIGHT = 150;
const SEGMENT_COUNT = 6;
const MAX_STRUCTURES_PER_SEGMENT = 4;
const MAX_PROPS_PER_SEGMENT = 8;
const MAX_AMBIENT_PARTICLES = 100;
const GROUND_SCROLL_SPEED = 60;

interface PlacedObject {
  asset: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mirrored: boolean;
}

interface WaterStrip {
  y: number;
  height: number;
  opacity: number;
}

interface RoadStrip {
  y: number;
  height: number;
}

interface TerrainSegment {
  y: number;
  structures: PlacedObject[];
  props: PlacedObject[];
  waterStrips: WaterStrip[];
  roadStrips: RoadStrip[];
}

interface AmbientParticle {
  x: number;
  y: number;
  speed: number;
  size: number;
  drift: number;
  alpha: number;
}

export class TerrainRenderer {
  private width: number;
  private height: number;
  private assets: AssetLoader;
  private config: TerrainLayerConfig | null = null;
  private segments: TerrainSegment[] = [];
  private ambientParticles: AmbientParticle[] = [];
  private scrollOffset = 0;

  constructor(width: number, height: number, assets: AssetLoader) {
    this.width = width;
    this.height = height;
    this.assets = assets;
  }

  configure(config: TerrainLayerConfig): void {
    this.config = config;
    this.reset();
    this.initSegments();
    this.initAmbientParticles();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (this.config) {
      this.reset();
      this.initSegments();
      this.initAmbientParticles();
    }
  }

  reset(): void {
    this.segments = [];
    this.ambientParticles = [];
    this.scrollOffset = 0;
  }

  private initSegments(): void {
    const startY = -SEGMENT_HEIGHT;
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const segment = this.createSegment(startY + i * SEGMENT_HEIGHT);
      this.segments.push(segment);
    }
  }

  private createSegment(y: number): TerrainSegment {
    const segment: TerrainSegment = {
      y,
      structures: [],
      props: [],
      waterStrips: [],
      roadStrips: [],
    };

    if (!this.config) return segment;

    if (this.config.hasWater && Math.random() < 0.3) {
      const stripY = Math.random() * (SEGMENT_HEIGHT - 30);
      segment.waterStrips.push({
        y: stripY,
        height: 15 + Math.random() * 20,
        opacity: 0.4 + Math.random() * 0.3,
      });
    }

    if (this.config.hasRoads && Math.random() < 0.25) {
      segment.roadStrips.push({
        y: Math.random() * (SEGMENT_HEIGHT - 20),
        height: 12 + Math.random() * 8,
      });
    }

    const occupiedRects: { x: number; y: number; w: number; h: number }[] = [];
    const structCount = Math.min(
      MAX_STRUCTURES_PER_SEGMENT,
      Math.floor(this.config.structureDensity * (0.5 + Math.random()))
    );

    for (let i = 0; i < structCount; i++) {
      if (this.config.structurePool.length === 0) break;
      const asset = this.config.structurePool[
        Math.floor(Math.random() * this.config.structurePool.length)
      ];
      const w = 32 + Math.random() * 32;
      const h = 32 + Math.random() * 32;
      const placed = this.tryPlace(w, h, occupiedRects);
      if (placed) {
        segment.structures.push({
          asset,
          x: placed.x,
          y: placed.y,
          width: w,
          height: h,
          mirrored: Math.random() < 0.5,
        });
      }
    }

    const propCount = Math.min(
      MAX_PROPS_PER_SEGMENT,
      Math.floor(this.config.propDensity * (0.5 + Math.random()))
    );
    for (let i = 0; i < propCount; i++) {
      if (this.config.propPool.length === 0) break;
      const asset = this.config.propPool[
        Math.floor(Math.random() * this.config.propPool.length)
      ];
      const w = 12 + Math.random() * 16;
      const h = 12 + Math.random() * 16;
      segment.props.push({
        asset,
        x: Math.random() * (this.width - w),
        y: Math.random() * (SEGMENT_HEIGHT - h),
        width: w,
        height: h,
        mirrored: Math.random() < 0.5,
      });
    }

    return segment;
  }

  private tryPlace(
    w: number,
    h: number,
    occupied: { x: number; y: number; w: number; h: number }[]
  ): { x: number; y: number } | null {
    const margin = 8;
    for (let attempt = 0; attempt < 15; attempt++) {
      const x = margin + Math.random() * (this.width - w - margin * 2);
      const y = margin + Math.random() * (SEGMENT_HEIGHT - h - margin * 2);

      let overlaps = false;
      for (const rect of occupied) {
        if (
          x < rect.x + rect.w + margin &&
          x + w + margin > rect.x &&
          y < rect.y + rect.h + margin &&
          y + h + margin > rect.y
        ) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        occupied.push({ x, y, w, h });
        return { x, y };
      }
    }
    return null;
  }

  private initAmbientParticles(): void {
    if (!this.config?.ambientParticles) return;
    const cfg = this.config.ambientParticles;
    const count = Math.min(cfg.count, MAX_AMBIENT_PARTICLES);
    for (let i = 0; i < count; i++) {
      this.ambientParticles.push(this.createParticle(cfg, true));
    }
  }

  private createParticle(cfg: AmbientParticleConfig, randomY: boolean): AmbientParticle {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -5,
      speed: cfg.speedRange[0] + Math.random() * (cfg.speedRange[1] - cfg.speedRange[0]),
      size: cfg.sizeRange[0] + Math.random() * (cfg.sizeRange[1] - cfg.sizeRange[0]),
      drift: (Math.random() - 0.5) * cfg.drift * 2,
      alpha: 0.3 + Math.random() * 0.7,
    };
  }

  update(dt: number): void {
    if (!this.config) return;

    this.scrollOffset += GROUND_SCROLL_SPEED * dt;

    for (const seg of this.segments) {
      seg.y += GROUND_SCROLL_SPEED * 0.6 * dt;
    }

    for (const seg of this.segments) {
      if (seg.y > this.height + SEGMENT_HEIGHT) {
        const topmost = this.segments.reduce(
          (min, s) => (s.y < min.y ? s : min),
          this.segments[0]
        );
        const newSeg = this.createSegment(topmost.y - SEGMENT_HEIGHT);
        seg.y = newSeg.y;
        seg.structures = newSeg.structures;
        seg.props = newSeg.props;
        seg.waterStrips = newSeg.waterStrips;
        seg.roadStrips = newSeg.roadStrips;
      }
    }

    if (this.config.ambientParticles) {
      const cfg = this.config.ambientParticles;
      for (const p of this.ambientParticles) {
        p.y += p.speed * dt;
        p.x += p.drift * dt;
        if (p.y > this.height + 10 || p.x < -10 || p.x > this.width + 10) {
          const fresh = this.createParticle(cfg, false);
          p.x = fresh.x;
          p.y = fresh.y;
          p.speed = fresh.speed;
          p.size = fresh.size;
          p.drift = fresh.drift;
          p.alpha = fresh.alpha;
        }
      }
      while (this.ambientParticles.length > MAX_AMBIENT_PARTICLES) {
        this.ambientParticles.pop();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;
    this.renderGround(ctx);
    this.renderStructures(ctx);
    this.renderAmbientParticles(ctx);
  }

  renderGround(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    const groundStartY = 0;
    ctx.save();
    ctx.fillStyle = this.config.groundColor;
    ctx.fillRect(0, groundStartY, this.width, this.height - groundStartY);
    ctx.restore();

    if (this.config.groundTexture) {
      const img = this.assets.getOptional(this.config.groundTexture);
      if (img) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        const tileH = 128;
        const tileW = 128;
        const offset = (this.scrollOffset * 0.6) % tileH;
        for (let ty = groundStartY - tileH + offset; ty < this.height; ty += tileH) {
          for (let tx = 0; tx < this.width; tx += tileW) {
            ctx.drawImage(img, tx, ty, tileW, tileH);
          }
        }
        ctx.restore();
      }
    }

    for (const seg of this.segments) {
      const segScreenY = seg.y;

      for (const water of seg.waterStrips) {
        const wy = segScreenY + water.y;
        if (wy + water.height < 0 || wy > this.height) continue;
        ctx.save();
        ctx.globalAlpha = water.opacity;
        ctx.fillStyle = "#3a7cb8";
        ctx.fillRect(0, wy, this.width, water.height);
        ctx.globalAlpha = water.opacity * 0.5;
        ctx.fillStyle = "#5aaae0";
        ctx.fillRect(0, wy + 2, this.width, water.height * 0.3);
        ctx.restore();
      }

      for (const road of seg.roadStrips) {
        const ry = segScreenY + road.y;
        if (ry + road.height < 0 || ry > this.height) continue;
        ctx.save();
        ctx.fillStyle = "#555555";
        ctx.fillRect(0, ry, this.width, road.height);
        ctx.strokeStyle = "#999933";
        ctx.lineWidth = 1;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.moveTo(0, ry + road.height / 2);
        ctx.lineTo(this.width, ry + road.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  renderStructures(ctx: CanvasRenderingContext2D): void {
    if (!this.config) return;

    for (const seg of this.segments) {
      const segScreenY = seg.y;
      if (segScreenY > this.height + 10 || segScreenY + SEGMENT_HEIGHT < -10) continue;

      for (const prop of seg.props) {
        const py = segScreenY + prop.y;
        if (py + prop.height < 0 || py > this.height) continue;
        const img = this.assets.getOptional(prop.asset);
        if (!img) continue;
        ctx.save();
        ctx.globalAlpha = 0.5;
        if (prop.mirrored) {
          ctx.translate(prop.x + prop.width, py);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, prop.width, prop.height);
        } else {
          ctx.drawImage(img, prop.x, py, prop.width, prop.height);
        }
        ctx.restore();
      }

      for (const struct of seg.structures) {
        const sy = segScreenY + struct.y;
        if (sy + struct.height < 0 || sy > this.height) continue;
        const img = this.assets.getOptional(struct.asset);
        if (!img) continue;
        ctx.save();
        if (struct.mirrored) {
          ctx.translate(struct.x + struct.width, sy);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, struct.width, struct.height);
        } else {
          ctx.drawImage(img, struct.x, sy, struct.width, struct.height);
        }
        ctx.restore();
      }
    }
  }

  renderAmbientParticles(ctx: CanvasRenderingContext2D): void {
    if (!this.config?.ambientParticles || this.ambientParticles.length === 0) return;

    const color = this.config.ambientParticles.color;
    ctx.save();
    for (const p of this.ambientParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
