import { AssetManifest } from "../../../shared/AssetLoader";

const BASE = "assets/raptor/";
const TERRAIN = `${BASE}terrain/`;

export const ASSET_MANIFEST: AssetManifest = {
  player:           `${BASE}player.png`,
  enemy_scout:      `${BASE}enemy_scout.png`,
  enemy_fighter:    `${BASE}enemy_fighter.png`,
  enemy_bomber:     `${BASE}enemy_bomber.png`,
  enemy_boss:       `${BASE}enemy_boss.png`,
  bullet_player:    `${BASE}bullet_player.svg`,
  bullet_enemy:     `${BASE}bullet_enemy.svg`,
  missile_player:   `${BASE}missile_player.svg`,
  powerup_spread:   `${BASE}powerup_spread.svg`,
  powerup_rapid:    `${BASE}powerup_rapid.svg`,
  powerup_shield:   `${BASE}powerup_shield.svg`,
  powerup_life:     `${BASE}powerup_life.svg`,
  powerup_missile:  `${BASE}powerup_missile.svg`,
  powerup_laser:    `${BASE}powerup_laser.svg`,
  bg_nebula:        `${BASE}bg_nebula.svg`,
  planet_01:        `${BASE}planet_01.svg`,
  planet_02:        `${BASE}planet_02.svg`,

  horizon_coastal:     `${TERRAIN}horizon_coastal.svg`,
  horizon_desert:      `${TERRAIN}horizon_desert.svg`,
  horizon_mountain:    `${TERRAIN}horizon_mountain.svg`,
  horizon_arctic:      `${TERRAIN}horizon_arctic.svg`,
  horizon_fortress:    `${TERRAIN}horizon_fortress.svg`,

  ground_grass:        `${TERRAIN}ground_grass.svg`,
  ground_sand:         `${TERRAIN}ground_sand.svg`,
  ground_snow:         `${TERRAIN}ground_snow.svg`,
  ground_concrete:     `${TERRAIN}ground_concrete.svg`,

  struct_beach_hut:    `${TERRAIN}struct_beach_hut.svg`,
  struct_lighthouse:   `${TERRAIN}struct_lighthouse.svg`,
  struct_palm_tree:    `${TERRAIN}struct_palm_tree.svg`,
  struct_oil_rig:      `${TERRAIN}struct_oil_rig.svg`,
  struct_bunker:       `${TERRAIN}struct_bunker.svg`,
  struct_cactus:       `${TERRAIN}struct_cactus.svg`,
  struct_pine_tree:    `${TERRAIN}struct_pine_tree.svg`,
  struct_watchtower:   `${TERRAIN}struct_watchtower.svg`,
  struct_radar_dish:   `${TERRAIN}struct_radar_dish.svg`,
  struct_barracks:     `${TERRAIN}struct_barracks.svg`,
  struct_aa_gun:       `${TERRAIN}struct_aa_gun.svg`,
  struct_hangar:       `${TERRAIN}struct_hangar.svg`,
  struct_command_center: `${TERRAIN}struct_command_center.svg`,
  struct_wall_segment: `${TERRAIN}struct_wall_segment.svg`,

  prop_crater:         `${TERRAIN}prop_crater.svg`,
  prop_rocks:          `${TERRAIN}prop_rocks.svg`,
  prop_tire_tracks:    `${TERRAIN}prop_tire_tracks.svg`,
  prop_debris:         `${TERRAIN}prop_debris.svg`,
};
