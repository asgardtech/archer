import { Player } from "../src/games/raptor/entities/Player";

const CANVAS_W = 800;
const CANVAS_H = 600;
const EMP_ENERGY_COST = 25;
const EMP_COOLDOWN = 15.0;
const ENERGY_REGEN_DELAY = 4.0;

function createPlayer(): Player {
  return new Player(CANVAS_W, CANVAS_H);
}

describe("Issue #598: EMP depletes shield energy and destroys all enemy projectiles", () => {

  // ── Energy Cost ──────────────────────────────────────────────

  describe("EMP energy cost", () => {
    test("EMP deducts 25 energy from the player's shield", () => {
      const player = createPlayer();
      expect(player.energy).toBe(100);

      const fired = player.emp();

      expect(fired).toBe(true);
      expect(player.energy).toBe(100 - EMP_ENERGY_COST);
    });

    test("EMP can fire when player has less energy than the cost", () => {
      const player = createPlayer();
      player.energy = 10;

      const fired = player.emp();

      expect(fired).toBe(true);
      expect(player.energy).toBe(0);
    });

    test("EMP fires with exactly 1 energy remaining", () => {
      const player = createPlayer();
      player.energy = 1;

      const fired = player.emp();

      expect(fired).toBe(true);
      expect(player.energy).toBe(0);
    });

    test("EMP cannot fire when player has zero energy", () => {
      const player = createPlayer();
      player.energy = 0;

      const fired = player.emp();

      expect(fired).toBe(false);
      expect(player.energy).toBe(0);
    });

    test("energy never goes negative after EMP", () => {
      const player = createPlayer();
      player.energy = 5;

      player.emp();

      expect(player.energy).toBe(0);
      expect(player.energy).toBeGreaterThanOrEqual(0);
    });

    test("EMP with full energy leaves 75", () => {
      const player = createPlayer();
      expect(player.energy).toBe(100);

      player.emp();

      expect(player.energy).toBe(75);
    });
  });

  // ── Energy Regen Timer Reset ────────────────────────────────

  describe("EMP resets energy regeneration timer", () => {
    test("energy regen restarts after EMP fires", () => {
      const player = createPlayer();
      player.energy = 80;

      // Simulate regen timer past the delay threshold
      for (let t = 0; t < ENERGY_REGEN_DELAY + 1; t += 1 / 60) {
        player.updateEnergyRegen(1 / 60);
      }
      expect(player.isEnergyRegenerating).toBe(true);

      player.emp();

      // After EMP, regen timer should be reset — not yet regenerating
      expect(player.isEnergyRegenerating).toBe(false);
    });

    test("regen delay restarts from 0 after EMP", () => {
      const player = createPlayer();
      player.energy = 50;

      // Build up regen timer
      for (let t = 0; t < ENERGY_REGEN_DELAY + 0.5; t += 1 / 60) {
        player.updateEnergyRegen(1 / 60);
      }
      expect(player.isEnergyRegenerating).toBe(true);

      const energyBefore = player.energy;
      player.emp();
      const energyAfterEmp = player.energy;
      expect(energyAfterEmp).toBe(energyBefore - EMP_ENERGY_COST);

      // Tick a small amount — should NOT be regenerating yet (delay not met)
      player.updateEnergyRegen(1);
      expect(player.isEnergyRegenerating).toBe(false);
    });
  });

  // ── Shield Battery ──────────────────────────────────────────

  describe("EMP does not consume shield battery", () => {
    test("shield battery remains unchanged after EMP attempt with 0 energy", () => {
      const player = createPlayer();
      player.energy = 0;
      player.shieldBattery = 50;

      const fired = player.emp();

      expect(fired).toBe(false);
      expect(player.shieldBattery).toBe(50);
    });

    test("shield battery remains unchanged after successful EMP", () => {
      const player = createPlayer();
      player.shieldBattery = 50;

      const fired = player.emp();

      expect(fired).toBe(true);
      expect(player.shieldBattery).toBe(50);
    });
  });

  // ── Cooldown (regression) ───────────────────────────────────

  describe("EMP cooldown (regression)", () => {
    test("EMP cannot fire while on cooldown", () => {
      const player = createPlayer();
      player.empCooldown = 10;

      const fired = player.emp();

      expect(fired).toBe(false);
      expect(player.energy).toBe(100);
    });

    test("EMP sets the cooldown timer after firing", () => {
      const player = createPlayer();

      player.emp();

      expect(player.empCooldown).toBe(EMP_COOLDOWN);
    });
  });

  // ── Player state guards (regression) ────────────────────────

  describe("Player state guards (regression)", () => {
    test("EMP cannot fire when player is dead", () => {
      const player = createPlayer();
      player.alive = false;

      const fired = player.emp();

      expect(fired).toBe(false);
    });

    test("EMP can fire when player is invincible (respawn)", () => {
      const player = createPlayer();
      player.invincibilityTimer = 2.0;

      const fired = player.emp();

      expect(fired).toBe(true);
      expect(player.energy).toBe(75);
    });

    test("EMP can fire when god mode is active", () => {
      const player = createPlayer();
      player.godMode = true;

      const fired = player.emp();

      expect(fired).toBe(true);
      expect(player.energy).toBe(75);
    });
  });
});
