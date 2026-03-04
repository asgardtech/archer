import { Gnome } from "../entities/Gnome";
import { Ball } from "../entities/Ball";
import { FlowerPot } from "../entities/FlowerPot";

const DUCK_PROXIMITY = 80;

export class GnomeAI {
  update(
    gnomes: Gnome[],
    balls: Ball[],
    dt: number,
    potThrowMin: number,
    potThrowMax: number
  ): FlowerPot[] {
    const newPots: FlowerPot[] = [];

    for (const gnome of gnomes) {
      if (gnome.state !== "sitting" && gnome.state !== "ducking") continue;

      for (const ball of balls) {
        if (!ball.alive || ball.stuck) continue;
        const dx = ball.pos.x - gnome.x;
        const dy = ball.pos.y - gnome.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DUCK_PROXIMITY && ball.vel.y < 0 && dy < 0) {
          gnome.duck();
        }
      }

      if (gnome.state === "sitting") {
        gnome.potCooldown -= dt;
        if (gnome.potCooldown <= 0) {
          const pot = new FlowerPot(gnome.x, gnome.y);
          newPots.push(pot);
          gnome.potCooldown = potThrowMin + Math.random() * (potThrowMax - potThrowMin);
        }
      }
    }

    return newPots;
  }
}
