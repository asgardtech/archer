import { Vec2 } from "../types";
import { SpriteSheet } from "../rendering/SpriteSheet";
import { ShipRenderer, ShipRenderState } from "../rendering/ShipRenderer";

const MOVE_SPEED = 500;
const INVINCIBILITY_DURATION = 2.0;
const HITBOX_INSET_X = 4;
const HITBOX_INSET_Y = 5;
const MAX_BANK_ANGLE = 0.12;
const BANK_LERP_SPEED = 8;
const RUNNING_LIGHT_FREQ = 1.5;
const PANEL_LIGHT_BASE_INTERVAL = 0.5;
const SHIELD_REGEN_RATE = 2.5;
const SHIELD_REGEN_DELAY = 4.0;
const MAX_SHIELD = 100;
const DODGE_DURATION = 0.3;
const DODGE_COOLDOWN = 3.0;

export class Player {
  public pos: Vec2;
  public width = 56;
  public height = 64;
  public shield = 100;
  public lives = 3;
  public bombs = 0;
  public readonly maxBombs = 5;
  public alive = true;
  public invincibilityTimer = 0;
  public godMode = false;
  public dpr = 1;
  public dodgeTimer = 0;
  public dodgeCooldown = 0;

  private flashTimer = 0;
  /** @deprecated Retained for backward compatibility; procedural rendering is used instead. */
  private sprite: HTMLImageElement | null = null;
  /** @deprecated Retained for backward compatibility; dual thrust is now rendered by ShipRenderer. */
  private thrustSheet: SpriteSheet | null = null;
  private thrustFrame = 0;
  private thrustTimer = 0;

  private shieldRegenTimer = 0;

  private shipRenderer = new ShipRenderer();
  private bankAngle = 0;
  private runningLightPhase = 0;
  private lastDx = 0;
  private panelLightTimer = 0;
  private panelLightOn = true;
  private panelLightNextToggle = PANEL_LIGHT_BASE_INTERVAL;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.pos = { x: canvasWidth / 2, y: canvasHeight * 0.8 };
  }

  /** @deprecated Use procedural rendering instead. */
  setSprite(sprite: HTMLImageElement): void {
    this.sprite = sprite;
  }

  /** @deprecated Use procedural rendering instead. */
  setThrustSheet(sheet: SpriteSheet): void {
    this.thrustSheet = sheet;
  }

  get left(): number { return this.pos.x - this.width / 2 + HITBOX_INSET_X; }
  get right(): number { return this.pos.x + this.width / 2 - HITBOX_INSET_X; }
  get top(): number { return this.pos.y - this.height / 2 + HITBOX_INSET_Y; }
  get bottom(): number { return this.pos.y + this.height / 2 - HITBOX_INSET_Y; }
  get isDodging(): boolean { return this.dodgeTimer > 0; }
  get isInvincible(): boolean { return this.invincibilityTimer > 0 || this.dodgeTimer > 0; }

  get dodgeCooldownFraction(): number {
    return this.dodgeCooldown / DODGE_COOLDOWN;
  }

  get isShieldRegenerating(): boolean {
    return this.alive
      && !this.isInvincible
      && this.shield < MAX_SHIELD
      && this.shieldRegenTimer >= SHIELD_REGEN_DELAY;
  }

  update(dt: number, targetX: number, targetY: number, canvasWidth: number, canvasHeight: number): void {
    if (!this.alive) return;

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= dt;
      this.flashTimer += dt;
    }

    this.thrustTimer += dt;
    if (this.thrustTimer >= 0.08) {
      this.thrustTimer -= 0.08;
      this.thrustFrame = (this.thrustFrame + 1) % 4;
    }

    const dx = targetX - this.pos.x;
    const dy = targetY - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      const moveAmount = Math.min(MOVE_SPEED * dt, dist);
      this.pos.x += (dx / dist) * moveAmount;
      this.pos.y += (dy / dist) * moveAmount;
      this.lastDx = dx / dist;
    } else {
      this.lastDx = 0;
    }

    const targetBank = Math.sign(this.lastDx) * Math.min(Math.abs(this.lastDx), 1) * MAX_BANK_ANGLE;
    this.bankAngle += (targetBank - this.bankAngle) * Math.min(1, BANK_LERP_SPEED * dt);
    this.bankAngle = Math.max(-0.15, Math.min(0.15, this.bankAngle));

    this.runningLightPhase += dt * RUNNING_LIGHT_FREQ;
    if (this.runningLightPhase > 1000) this.runningLightPhase -= 1000;

    this.panelLightTimer += dt;
    if (this.panelLightTimer >= this.panelLightNextToggle) {
      this.panelLightTimer = 0;
      this.panelLightOn = !this.panelLightOn;
      this.panelLightNextToggle = PANEL_LIGHT_BASE_INTERVAL * (0.6 + Math.random() * 0.8);
    }

    const padding = this.width / 2;
    this.pos.x = Math.max(padding, Math.min(canvasWidth - padding, this.pos.x));

    const minY = canvasHeight * 0.6;
    const maxY = canvasHeight - this.height / 2 - 5;
    this.pos.y = Math.max(minY, Math.min(maxY, this.pos.y));
  }

  updateShieldRegen(dt: number): void {
    if (!this.alive || this.isInvincible || this.shield >= MAX_SHIELD) {
      return;
    }
    this.shieldRegenTimer += dt;
    if (this.shieldRegenTimer >= SHIELD_REGEN_DELAY) {
      this.shield = Math.min(MAX_SHIELD, this.shield + SHIELD_REGEN_RATE * dt);
    }
  }

  dodge(): boolean {
    if (!this.alive) return false;
    if (this.dodgeCooldown > 0) return false;
    if (this.dodgeTimer > 0) return false;
    if (this.invincibilityTimer > 0) return false;

    this.dodgeTimer = DODGE_DURATION;
    this.dodgeCooldown = DODGE_COOLDOWN;
    return true;
  }

  updateDodge(dt: number): void {
    if (this.dodgeTimer > 0) {
      this.dodgeTimer = Math.max(0, this.dodgeTimer - dt);
    }
    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown = Math.max(0, this.dodgeCooldown - dt);
    }
  }

  takeDamage(amount: number): boolean {
    if (this.godMode) return false;
    if (this.isInvincible || !this.alive) return false;

    this.shieldRegenTimer = 0;

    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - amount);
      return false;
    }

    this.lives--;
    this.shield = 100;
    this.invincibilityTimer = INVINCIBILITY_DURATION;
    this.flashTimer = 0;

    if (this.lives <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  reset(canvasWidth: number, canvasHeight: number, fullReset = true): void {
    this.pos = { x: canvasWidth / 2, y: canvasHeight * 0.8 };
    this.shield = 100;
    this.alive = true;
    this.invincibilityTimer = 0;
    this.flashTimer = 0;
    this.shieldRegenTimer = 0;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.bankAngle = 0;
    this.runningLightPhase = 0;
    this.lastDx = 0;
    this.panelLightTimer = 0;
    this.panelLightOn = true;
    this.panelLightNextToggle = PANEL_LIGHT_BASE_INTERVAL;
    if (fullReset) {
      this.lives = 3;
      this.bombs = 0;
      this.godMode = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    if (this.invincibilityTimer > 0 && !this.isDodging
        && Math.floor(this.flashTimer * 10) % 2 === 0) {
      return;
    }

    if (this.isDodging) {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.15 * Math.sin(this.dodgeTimer * 40);
    }

    if (this.godMode) {
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.07 * Math.sin(Date.now() / 300);
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.ellipse(this.pos.x, this.pos.y, this.width * 0.7, this.height * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const state: ShipRenderState = {
      thrustLevel: 0.6 + (this.thrustFrame / 3) * 0.4,
      bankAngle: this.bankAngle,
      runningLightPhase: this.runningLightPhase,
      panelLightFlicker: this.panelLightOn ? 0.3 : 0.8,
      heatShimmer: Math.sin(Date.now() * 0.01) * 0.5 + 0.5,
      damageLevel: 1 - this.shield / 100,
    };

    this.shipRenderer.render(
      ctx,
      this.pos.x,
      this.pos.y,
      this.width,
      this.height,
      state,
      this.dpr
    );

    if (this.isDodging) {
      ctx.restore();
    }
  }
}
