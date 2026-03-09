import { AssetManifest } from "../types";

const BASE = "assets/raptor/";
const TERRAIN = `${BASE}terrain/`;

export const ASSET_MANIFEST: AssetManifest = {
  player:           `${BASE}player.png`,
  enemy_scout:      `${BASE}enemy_scout.png`,
  enemy_fighter:    `${BASE}enemy_fighter.png`,
  enemy_bomber:     `${BASE}enemy_bomber.png`,
  enemy_boss:       `${BASE}enemy_boss.png`,
  bullet_player:    `${BASE}bullet_player.png`,
  bullet_enemy:     `${BASE}bullet_enemy.png`,
  missile_player:   `${BASE}missile_player.png`,
  powerup_spread:   `${BASE}powerup_spread.png`,
  powerup_rapid:    `${BASE}powerup_rapid.png`,
  powerup_shield:   `${BASE}powerup_shield.png`,
  powerup_life:     `${BASE}powerup_life.png`,
  powerup_missile:  `${BASE}powerup_missile.png`,
  powerup_laser:    `${BASE}powerup_laser.png`,
  bg_nebula:        `${BASE}bg_nebula.png`,
  planet_01:        `${BASE}planet_01.png`,
  planet_02:        `${BASE}planet_02.png`,

  horizon_coastal:     `${TERRAIN}horizon_coastal.png`,
  horizon_desert:      `${TERRAIN}horizon_desert.png`,
  horizon_mountain:    `${TERRAIN}horizon_mountain.png`,
  horizon_arctic:      `${TERRAIN}horizon_arctic.png`,
  horizon_fortress:    `${TERRAIN}horizon_fortress.png`,

  ground_grass:        `${TERRAIN}ground_grass.png`,
  ground_sand:         `${TERRAIN}ground_sand.png`,
  ground_snow:         `${TERRAIN}ground_snow.png`,
  ground_concrete:     `${TERRAIN}ground_concrete.png`,

  struct_beach_hut:    `${TERRAIN}struct_beach_hut.png`,
  struct_lighthouse:   `${TERRAIN}struct_lighthouse.png`,
  struct_palm_tree:    `${TERRAIN}struct_palm_tree.png`,
  struct_oil_rig:      `${TERRAIN}struct_oil_rig.png`,
  struct_bunker:       `${TERRAIN}struct_bunker.png`,
  struct_cactus:       `${TERRAIN}struct_cactus.png`,
  struct_pine_tree:    `${TERRAIN}struct_pine_tree.png`,
  struct_watchtower:   `${TERRAIN}struct_watchtower.png`,
  struct_radar_dish:   `${TERRAIN}struct_radar_dish.png`,
  struct_barracks:     `${TERRAIN}struct_barracks.png`,
  struct_aa_gun:       `${TERRAIN}struct_aa_gun.png`,
  struct_hangar:       `${TERRAIN}struct_hangar.png`,
  struct_command_center: `${TERRAIN}struct_command_center.png`,
  struct_wall_segment: `${TERRAIN}struct_wall_segment.png`,

  prop_crater:         `${TERRAIN}prop_crater.png`,
  prop_rocks:          `${TERRAIN}prop_rocks.png`,
  prop_tire_tracks:    `${TERRAIN}prop_tire_tracks.png`,
  prop_debris:         `${TERRAIN}prop_debris.png`,
};
