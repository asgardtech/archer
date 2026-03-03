import { Vec2, ObstacleType } from "../types";

export class Obstacle {
  public pos: Vec2;
  public vel: Vec2;
  public radius: number;
  public alive = true;
  public obstacleType: ObstacleType;

  private time = 0;
  private baseY: number;
  private bobAmplitude = 30;
  private canvasWidth: number;
  private direction: 1 | -1;
  private maxY: number;

  constructor(
    obstacleType: ObstacleType,
    canvasWidth: number,
    canvasHeight: number,
    speed: number,
    direction: 1 | -1
  ) {
    this.obstacleType = obstacleType;
    this.canvasWidth = canvasWidth;
    this.direction = direction;
    this.maxY = canvasHeight * 0.7;

    switch (obstacleType) {
      case "bird":
        this.radius = 15;
        break;
      case "airplane":
        this.radius = 20;
        break;
      case "ufo":
        this.radius = 18;
        break;
    }

    const margin = this.radius + 5;
    const yRange = this.maxY - margin;
    const y = margin + Math.random() * yRange;
    this.baseY = y;

    const startX = direction === 1 ? -this.radius * 2 : canvasWidth + this.radius * 2;
    this.pos = { x: startX, y };
    this.vel = { x: speed * direction, y: 0 };
  }

  update(dt: number): void {
    if (!this.alive) return;

    this.time += dt;
    this.pos.x += this.vel.x * dt;

    if (this.obstacleType === "ufo") {
      const bobbed = this.baseY + Math.sin(this.time * 2.5) * this.bobAmplitude;
      this.pos.y = Math.min(bobbed, this.maxY);
    }

    if (this.direction === 1 && this.pos.x > this.canvasWidth + this.radius * 2) {
      this.alive = false;
    } else if (this.direction === -1 && this.pos.x < -this.radius * 2) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    switch (this.obstacleType) {
      case "bird":
        this.renderBird(ctx);
        break;
      case "airplane":
        this.renderAirplane(ctx);
        break;
      case "ufo":
        this.renderUFO(ctx);
        break;
    }

    ctx.restore();
  }

  private renderBird(ctx: CanvasRenderingContext2D): void {
    const wingAngle = Math.sin(this.time * 8) * 0.6;
    const facing = this.direction;

    ctx.fillStyle = "#5D4037";

    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4E342E";
    ctx.beginPath();
    ctx.arc(facing * 10, -2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#FF8F00";
    ctx.beginPath();
    ctx.moveTo(facing * 15, -2);
    ctx.lineTo(facing * 19, -1);
    ctx.lineTo(facing * 15, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#795548";
    ctx.save();
    ctx.translate(-facing * 2, -5);
    ctx.rotate(-wingAngle);
    ctx.beginPath();
    ctx.ellipse(0, -6, 14, 5, facing * -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(-facing * 2, -5);
    ctx.rotate(wingAngle * 0.7);
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 4, facing * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(facing * 12, -3, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderAirplane(ctx: CanvasRenderingContext2D): void {
    const facing = this.direction;

    ctx.fillStyle = "#CFD8DC";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#B0BEC5";
    ctx.beginPath();
    ctx.moveTo(facing * 22, 0);
    ctx.lineTo(facing * 16, -2);
    ctx.lineTo(facing * 16, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#90A4AE";
    ctx.beginPath();
    ctx.moveTo(-facing * 4, -5);
    ctx.lineTo(-facing * 2, -14);
    ctx.lineTo(facing * 6, -5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-facing * 16, -3);
    ctx.lineTo(-facing * 18, -10);
    ctx.lineTo(-facing * 10, -3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#78909C";
    ctx.beginPath();
    ctx.moveTo(-facing * 16, 2);
    ctx.lineTo(-facing * 22, 0);
    ctx.lineTo(-facing * 16, -2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#B3E5FC";
    ctx.beginPath();
    ctx.ellipse(facing * 8, -2, 4, 3, 0, Math.PI, 0);
    ctx.fill();
  }

  private renderUFO(ctx: CanvasRenderingContext2D): void {
    const glowPulse = 0.4 + Math.sin(this.time * 4) * 0.2;

    ctx.fillStyle = `rgba(76, 175, 80, ${glowPulse})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#A5D6A7";
    ctx.beginPath();
    ctx.ellipse(0, 2, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#66BB6A";
    ctx.beginPath();
    ctx.ellipse(0, -2, 12, 10, 0, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = `rgba(200, 230, 201, 0.7)`;
    ctx.beginPath();
    ctx.ellipse(0, -5, 8, 6, 0, Math.PI, 0);
    ctx.fill();

    const lightCount = 5;
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * Math.PI - Math.PI / 2;
      const lx = Math.cos(angle) * 18;
      const ly = 3 + Math.sin(angle) * 3;
      const lightOn = Math.sin(this.time * 6 + i * 1.2) > 0;
      ctx.fillStyle = lightOn ? "#FFEB3B" : "#558B2F";
      ctx.beginPath();
      ctx.arc(lx, ly, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
