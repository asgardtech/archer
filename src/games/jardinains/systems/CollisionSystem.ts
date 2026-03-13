import { Ball } from "../entities/Ball";
import { Brick } from "../entities/Brick";
import { Paddle } from "../entities/Paddle";
import { Gnome } from "../entities/Gnome";
import { FlowerPot } from "../entities/FlowerPot";
import { PowerUp } from "../entities/PowerUp";

export class CollisionSystem {
  checkBallPaddle(ball: Ball, paddle: Paddle, stickyActive: boolean): boolean {
    if (ball.stuck || !ball.alive) return false;
    if (ball.vel.y <= 0) return false;

    if (
      ball.pos.x + ball.radius > paddle.left &&
      ball.pos.x - ball.radius < paddle.right &&
      ball.pos.y + ball.radius > paddle.top &&
      ball.pos.y - ball.radius < paddle.bottom
    ) {
      ball.pos.y = paddle.top - ball.radius;

      if (stickyActive) {
        ball.stuck = true;
        ball.stuckOffset = ball.pos.x - paddle.x;
        ball.vel.x = 0;
        ball.vel.y = 0;
        return true;
      }

      const hitOffset = (ball.pos.x - paddle.x) / (paddle.width / 2);
      const clampedOffset = Math.max(-1, Math.min(1, hitOffset));
      const maxAngle = Math.PI * 0.4;
      const angle = clampedOffset * maxAngle - Math.PI / 2;
      const speed = ball.getSpeed();
      ball.vel.x = Math.cos(angle) * speed;
      ball.vel.y = Math.sin(angle) * speed;
      ball.ensureMinVerticalSpeed();
      return true;
    }
    return false;
  }

  checkBallBricks(ball: Ball, bricks: Brick[]): Brick[] {
    if (ball.stuck || !ball.alive) return [];

    const hitBricks: Brick[] = [];
    for (const brick of bricks) {
      if (!brick.alive) continue;
      if (this.circleRectCollision(
        ball.pos.x, ball.pos.y, ball.radius,
        brick.x, brick.y, brick.width, brick.height
      )) {
        this.reflectBallOffRect(ball, brick.x, brick.y, brick.width, brick.height);
        hitBricks.push(brick);
        break;
      }
    }
    return hitBricks;
  }

  checkGnomePaddle(gnome: Gnome, paddle: Paddle): boolean {
    if (gnome.state !== "falling") return false;
    return (
      gnome.right > paddle.left &&
      gnome.left < paddle.right &&
      gnome.bottom > paddle.top &&
      gnome.top < paddle.bottom
    );
  }

  checkPotPaddle(pot: FlowerPot, paddle: Paddle): boolean {
    if (!pot.alive) return false;
    return (
      pot.right > paddle.left &&
      pot.left < paddle.right &&
      pot.bottom > paddle.top &&
      pot.top < paddle.bottom
    );
  }

  checkPotGnome(pot: FlowerPot, gnome: Gnome): boolean {
    if (!pot.alive || !pot.deflected) return false;
    if (gnome.state !== "sitting" && gnome.state !== "ducking") return false;
    return (
      pot.right > gnome.left &&
      pot.left < gnome.right &&
      pot.bottom > gnome.top &&
      pot.top < gnome.bottom
    );
  }

  checkPowerUpPaddle(powerUp: PowerUp, paddle: Paddle): boolean {
    if (!powerUp.alive) return false;
    return (
      powerUp.right > paddle.left &&
      powerUp.left < paddle.right &&
      powerUp.bottom > paddle.top &&
      powerUp.top < paddle.bottom
    );
  }

  private circleRectCollision(
    cx: number, cy: number, cr: number,
    rx: number, ry: number, rw: number, rh: number
  ): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) <= (cr * cr);
  }

  private reflectBallOffRect(
    ball: Ball,
    rx: number, ry: number, rw: number, rh: number
  ): void {
    const cx = ball.pos.x;
    const cy = ball.pos.y;

    const overlapLeft = (cx + ball.radius) - rx;
    const overlapRight = (rx + rw) - (cx - ball.radius);
    const overlapTop = (cy + ball.radius) - ry;
    const overlapBottom = (ry + rh) - (cy - ball.radius);

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      ball.vel.x = -ball.vel.x;
      if (overlapLeft < overlapRight) {
        ball.pos.x = rx - ball.radius;
      } else {
        ball.pos.x = rx + rw + ball.radius;
      }
    } else {
      ball.vel.y = -ball.vel.y;
      if (overlapTop < overlapBottom) {
        ball.pos.y = ry - ball.radius;
      } else {
        ball.pos.y = ry + rh + ball.radius;
      }
    }

    ball.ensureMinVerticalSpeed();
  }
}
