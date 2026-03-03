import { Arrow } from "../entities/Arrow";
import { Balloon } from "../entities/Balloon";
import { UpgradeType } from "../types";

export interface CollisionEvent {
  arrow: Arrow;
  balloon: Balloon;
  grantedUpgrade?: UpgradeType;
  isBossKill?: boolean;
}

export class CollisionSystem {
  private piercingHits = new Set<string>();
  private arrowIdCounter = 0;
  private arrowIds = new WeakMap<Arrow, number>();

  private balloonIdCounter = 0;
  private balloonIds = new WeakMap<Balloon, number>();

  private getId(entity: Arrow | Balloon, map: WeakMap<object, number>, isArrow: boolean): number {
    let id = map.get(entity);
    if (id === undefined) {
      id = isArrow ? this.arrowIdCounter++ : this.balloonIdCounter++;
      map.set(entity, id);
    }
    return id;
  }

  check(arrows: Arrow[], balloons: Balloon[]): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    this.piercingHits.clear();

    for (const arrow of arrows) {
      if (!arrow.alive) continue;
      for (const balloon of balloons) {
        if (!balloon.alive) continue;

        if (arrow.piercing) {
          const aId = this.getId(arrow, this.arrowIds, true);
          const bId = this.getId(balloon, this.balloonIds, false);
          const pairKey = `${aId}:${bId}`;
          if (this.piercingHits.has(pairKey)) continue;
        }

        const dx = arrow.pos.x - balloon.pos.x;
        const dy = arrow.pos.y - balloon.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < balloon.radius) {
          const event: CollisionEvent = { arrow, balloon };

          if (balloon.variant === "boss") {
            const killed = balloon.hit();
            if (killed) {
              event.isBossKill = true;
            }
          } else {
            balloon.alive = false;
            if (balloon.variant === "upgrade" && balloon.upgradeType) {
              event.grantedUpgrade = balloon.upgradeType;
            }
          }
          events.push(event);

          if (arrow.piercing) {
            const aId = this.getId(arrow, this.arrowIds, true);
            const bId = this.getId(balloon, this.balloonIds, false);
            this.piercingHits.add(`${aId}:${bId}`);
          } else {
            arrow.alive = false;
            break;
          }
        }
      }
    }
    return events;
  }
}
