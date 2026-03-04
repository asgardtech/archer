import { GnomeState, GnomeEntity } from "../types";

const GRAVITY = 400;
const GNOME_WIDTH = 20;
const GNOME_HEIGHT = 26;

export class Gnome {
  public x: number;
  public y: number;
  public state: GnomeState;
  public brickCol: number;
  public brickRow: number;
  public potCooldown: number;
  public animTimer = 0;
  public fallVelocity = 0;
  public duckTimer = 0;

  constructor(x: number, y: number, brickCol: number, brickRow: number, potCooldownInit: number) {
    this.x = x;
    this.y = y;
    this.brickCol = brickCol;
    this.brickRow = brickRow;
    this.state = "sitting";
    this.potCooldown = potCooldownInit;
  }

  get width(): number { return GNOME_WIDTH; }
  get height(): number { return GNOME_HEIGHT; }
  get left(): number { return this.x - GNOME_WIDTH / 2; }
  get right(): number { return this.x + GNOME_WIDTH / 2; }
  get top(): number { return this.y - GNOME_HEIGHT; }
  get bottom(): number { return this.y; }

  update(dt: number): void {
    this.animTimer += dt;

    switch (this.state) {
      case "sitting":
        break;
      case "ducking":
        this.duckTimer -= dt;
        if (this.duckTimer <= 0) {
          this.state = "sitting";
        }
        break;
      case "falling":
        this.fallVelocity += GRAVITY * dt;
        this.y += this.fallVelocity * dt;
        break;
      case "caught":
      case "gone":
        break;
    }
  }

  startFalling(): void {
    if (this.state === "sitting" || this.state === "ducking") {
      this.state = "falling";
      this.fallVelocity = 0;
    }
  }

  duck(): void {
    if (this.state === "sitting") {
      this.state = "ducking";
      this.duckTimer = 0.3;
    }
  }

  catch(): void {
    this.state = "caught";
    this.animTimer = 0;
  }

  isGone(canvasHeight: number): boolean {
    if (this.state === "falling" && this.y > canvasHeight + 50) {
      this.state = "gone";
      return true;
    }
    if (this.state === "caught" && this.animTimer > 0.5) {
      this.state = "gone";
      return true;
    }
    return this.state === "gone";
  }

  getEntity(): GnomeEntity {
    return {
      x: this.x,
      y: this.y,
      state: this.state,
      brickCol: this.brickCol,
      brickRow: this.brickRow,
      potCooldown: this.potCooldown,
      animTimer: this.animTimer,
      fallVelocity: this.fallVelocity,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.state === "gone") return;

    const x = this.x;
    const baseY = this.y;
    const isDucking = this.state === "ducking";
    const bob = this.state === "sitting" ? Math.sin(this.animTimer * 3) * 1.5 : 0;
    const squish = isDucking ? 0.6 : 1;
    const bodyY = baseY - 8 * squish + bob;

    ctx.save();

    // Body
    ctx.fillStyle = "#2E7D32";
    ctx.beginPath();
    ctx.ellipse(x, bodyY, 8, 8 * squish, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headY = bodyY - 10 * squish;
    ctx.fillStyle = "#FFCC80";
    ctx.beginPath();
    ctx.arc(x, headY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Hat (pointed red)
    ctx.fillStyle = "#D32F2F";
    ctx.beginPath();
    ctx.moveTo(x - 6, headY - 3);
    ctx.lineTo(x, headY - 18 * squish);
    ctx.lineTo(x + 6, headY - 3);
    ctx.closePath();
    ctx.fill();

    // Beard
    ctx.fillStyle = "#E0E0E0";
    ctx.beginPath();
    ctx.moveTo(x - 4, headY + 3);
    ctx.lineTo(x, headY + 10 * squish);
    ctx.lineTo(x + 4, headY + 3);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x - 2, headY - 1, 1, 0, Math.PI * 2);
    ctx.arc(x + 2, headY - 1, 1, 0, Math.PI * 2);
    ctx.fill();

    if (this.state === "caught") {
      // Star burst effect for catching
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2;
      const starCount = 6;
      const starR = 12 + this.animTimer * 20;
      for (let i = 0; i < starCount; i++) {
        const angle = (i / starCount) * Math.PI * 2 + this.animTimer * 5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 5, bodyY + Math.sin(angle) * 5);
        ctx.lineTo(x + Math.cos(angle) * starR, bodyY + Math.sin(angle) * starR);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
