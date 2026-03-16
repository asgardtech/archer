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
const ENERGY_REGEN_RATE = 2.5;
const ENERGY_REGEN_DELAY = 4.0;
const MAX_ARMOR = 200;
const MAX_ENERGY = 200;
const DODGE_DURATION = 0.3;
const DODGE_COOLDOWN = 3.0;
const EMP_COOLDOWN = 15.0;
const EMP_DURATION = 0.15;
const EMP_ENERGY_COST = 25;

export class Player {
  public pos: Vec2;
  public width = 56;
  public height = 64;
  public armor = 200;
  public readonly maxArmor = MAX_ARMOR;
  public energy = 200;
  public readonly maxEnergy = MAX_ENERGY;
  public lives = 3;
  public bombs = 0;
  public readonly maxBombs = 5;
  public alive = true;
  public invincibilityTimer = 0;
  public godMode = false;
  public dpr = 1;
  public dodgeTimer = 0;
  public dodgeCooldown = 0;
  public shieldBattery = 0;
  public readonly maxShieldBattery = 200;
  public empTimer = 0;
  public empCooldown = 0;
  public deflectorActive = false;

  private flashTimer = 0;
  /** @deprecated Retained for backward compatibility; procedural rendering is used instead. */
  private sprite: HTMLImageElement | null = null;
  /** @deprecated Retained for backward compatibility; dual thrust is now rendered by ShipRenderer. */
  private thrustSheet: SpriteSheet | null = null;
  private thrustFrame = 0;
  private thrustTimer = 0;

  private energyRegenTimer = 0;

  private shipRenderer = new ShipRenderer();
  private bankAngle = 0;
  private runningLightPhase = 0;
  private lastDx = 0;
  private panelLightTimer = 0;
  private panelLightOn = true;
  private panelLightNextToggle = PANEL_LIGHT_BASE_INTERVAL;

  constructor(canvasWidth: number, canvasHeight: number, offsetX = 0, offsetY = 0) {
    this.pos = { x: offsetX + canvasWidth / 2, y: offsetY + canvasHeight * 0.8 };
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

  get empCooldownFraction(): number {
    return this.empCooldown / EMP_COOLDOWN;
  }

  get isEnergyRegenerating(): boolean {
    return this.alive
      && !this.isInvincible
      && this.energy < MAX_ENERGY
      && this.energyRegenTimer >= ENERGY_REGEN_DELAY;
  }

  update(dt: number, targetX: number, targetY: number, canvasWidth: number, canvasHeight: number, offsetX = 0, offsetY = 0): void {
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
    this.pos.x = Math.max(offsetX + padding, Math.min(offsetX + canvasWidth - padding, this.pos.x));

    const minY = offsetY + canvasHeight * 0.6;
    const maxY = offsetY + canvasHeight - this.height / 2 - 5;
    this.pos.y = Math.max(minY, Math.min(maxY, this.pos.y));
  }

  updateEnergyRegen(dt: number): void {
    if (!this.alive || this.isInvincible || this.energy >= MAX_ENERGY) {
      return;
    }
    this.energyRegenTimer += dt;
    if (this.energyRegenTimer >= ENERGY_REGEN_DELAY) {
      this.energy = Math.min(MAX_ENERGY, this.energy + ENERGY_REGEN_RATE * dt);
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

  emp(): boolean {
    if (!this.alive) return false;
    if (this.empCooldown > 0) return false;
    if (this.energy <= 0) return false;
    this.energy = Math.max(0, this.energy - EMP_ENERGY_COST);
    this.energyRegenTimer = 0;
    this.empTimer = EMP_DURATION;
    this.empCooldown = EMP_COOLDOWN;
    return true;
  }

  updateEmp(dt: number): void {
    if (this.empTimer > 0) {
      this.empTimer = Math.max(0, this.empTimer - dt);
    }
    if (this.empCooldown > 0) {
      this.empCooldown = Math.max(0, this.empCooldown - dt);
    }
  }

  takeDamage(amount: number): boolean {
    if (this.godMode) return false;
    if (this.isInvincible || !this.alive) return false;

    // 1. Shield battery absorbs first
    if (this.shieldBattery > 0) {
      const absorbed = Math.min(this.shieldBattery, amount);
      this.shieldBattery -= absorbed;
      amount -= absorbed;
      if (amount <= 0) {
        this.energyRegenTimer = 0;
        return false;
      }
    }

    // 2. Energy shield absorbs proportionally to current energy level
    if (this.energy > 0) {
      const shieldPower = this.energy / this.maxEnergy;
      const shieldAbsorb = amount * shieldPower;
      const actualAbsorb = Math.min(shieldAbsorb, this.energy);
      this.energy -= actualAbsorb;
      amount -= actualAbsorb;
      if (amount <= 0) {
        this.energyRegenTimer = 0;
        return false;
      }
    }

    // 3. Remaining damage hits armor (hull HP)
    this.energyRegenTimer = 0;
    this.armor -= amount;
    if (this.armor <= 0) {
      this.armor = 0;
      this.lives--;
      if (this.lives <= 0) {
        this.alive = false;
        return true;
      }
      this.armor = this.maxArmor;
      this.energy = this.maxEnergy;
      this.invincibilityTimer = INVINCIBILITY_DURATION;
      this.flashTimer = 0;
    }
    return false;
  }

  reset(canvasWidth: number, canvasHeight: number, fullReset = true, offsetX = 0, offsetY = 0): void {
    this.pos = { x: offsetX + canvasWidth / 2, y: offsetY + canvasHeight * 0.8 };
    this.armor = this.maxArmor;
    this.energy = this.maxEnergy;
    this.alive = true;
    this.invincibilityTimer = 0;
    this.flashTimer = 0;
    this.energyRegenTimer = 0;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.empTimer = 0;
    this.empCooldown = 0;
    this.deflectorActive = false;
    this.bankAngle = 0;
    this.runningLightPhase = 0;
    this.lastDx = 0;
    this.panelLightTimer = 0;
    this.panelLightOn = true;
    this.panelLightNextToggle = PANEL_LIGHT_BASE_INTERVAL;
    if (fullReset) {
      this.lives = 3;
      this.bombs = 0;
      this.shieldBattery = 0;
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

    if (this.energy > 0) {
      const energyFrac = this.energy / this.maxEnergy;
      ctx.save();
      ctx.globalAlpha = (0.08 + 0.10 * energyFrac) + 0.04 * Math.sin(Date.now() / 400);
      ctx.fillStyle = "#3498db";
      const shieldScale = 0.55 + 0.15 * energyFrac;
      ctx.beginPath();
      ctx.ellipse(this.pos.x, this.pos.y, this.width * shieldScale, this.height * shieldScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.shieldBattery > 0) {
      ctx.save();
      ctx.globalAlpha = 0.14 + 0.06 * Math.sin(Date.now() / 350);
      ctx.fillStyle = "#ff9800";
      ctx.beginPath();
      ctx.ellipse(this.pos.x, this.pos.y, this.width * 0.72, this.height * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.deflectorActive) {
      ctx.save();
      const rotation = Date.now() / 1000;
      ctx.translate(this.pos.x, this.pos.y);
      ctx.rotate(rotation);
      ctx.strokeStyle = "#e91e63";
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(Date.now() / 250);
      ctx.beginPath();
      const sides = 6;
      const hexRadius = this.width * 0.6;
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const hx = Math.cos(angle) * hexRadius;
        const hy = Math.sin(angle) * hexRadius;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();
      ctx.restore();
    }

    const state: ShipRenderState = {
      thrustLevel: 0.6 + (this.thrustFrame / 3) * 0.4,
      bankAngle: this.bankAngle,
      runningLightPhase: this.runningLightPhase,
      panelLightFlicker: this.panelLightOn ? 0.3 : 0.8,
      heatShimmer: Math.sin(ShipRenderer.frameTime * 0.01) * 0.5 + 0.5,
      damageLevel: 1 - this.armor / this.maxArmor,
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
