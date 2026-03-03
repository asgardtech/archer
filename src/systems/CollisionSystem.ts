import { Arrow } from "../entities/Arrow";
import { Balloon } from "../entities/Balloon";

export interface CollisionEvent {
  arrow: Arrow;
  balloon: Balloon;
}

export class CollisionSystem {
  check(arrows: Arrow[], balloons: Balloon[]): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    for (const arrow of arrows) {
      if (!arrow.alive) continue;
      for (const balloon of balloons) {
        if (!balloon.alive) continue;
        const dx = arrow.pos.x - balloon.pos.x;
        const dy = arrow.pos.y - balloon.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < balloon.radius) {
          arrow.alive = false;
          balloon.alive = false;
          events.push({ arrow, balloon });
          break;
        }
      }
    }
    return events;
  }
}
