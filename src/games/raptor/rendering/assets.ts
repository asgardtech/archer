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

  // Level 6–10 Horizons
  horizon_shipyard:      `${TERRAIN}horizon_shipyard.svg`,
  horizon_wasteland:     `${TERRAIN}horizon_wasteland.svg`,
  horizon_industrial:    `${TERRAIN}horizon_industrial.svg`,
  horizon_orbital:       `${TERRAIN}horizon_orbital.svg`,
  horizon_stronghold:    `${TERRAIN}horizon_stronghold.svg`,

  // Level 6–10 Ground Textures
  ground_rust:           `${TERRAIN}ground_rust.svg`,
  ground_ash:            `${TERRAIN}ground_ash.svg`,
  ground_metal:          `${TERRAIN}ground_metal.svg`,
  ground_hull_plate:     `${TERRAIN}ground_hull_plate.svg`,
  ground_dark_metal:     `${TERRAIN}ground_dark_metal.svg`,

  // Level 6 Structures (Shipyard)
  struct_crane:          `${TERRAIN}struct_crane.svg`,
  struct_drydock:        `${TERRAIN}struct_drydock.svg`,
  struct_ship_hull:      `${TERRAIN}struct_ship_hull.svg`,
  struct_cargo_container: `${TERRAIN}struct_cargo_container.svg`,

  // Level 7 Structures (Wasteland)
  struct_ruin:           `${TERRAIN}struct_ruin.svg`,
  struct_dead_tree:      `${TERRAIN}struct_dead_tree.svg`,
  struct_wrecked_tank:   `${TERRAIN}struct_wrecked_tank.svg`,

  // Level 8 Structures (Industrial)
  struct_smokestack:     `${TERRAIN}struct_smokestack.svg`,
  struct_factory:        `${TERRAIN}struct_factory.svg`,
  struct_conveyor:       `${TERRAIN}struct_conveyor.svg`,
  struct_cooling_tower:  `${TERRAIN}struct_cooling_tower.svg`,
  struct_pipe_cluster:   `${TERRAIN}struct_pipe_cluster.svg`,

  // Level 9 Structures (Orbital)
  struct_satellite_dish: `${TERRAIN}struct_satellite_dish.svg`,
  struct_solar_panel:    `${TERRAIN}struct_solar_panel.svg`,
  struct_station_module: `${TERRAIN}struct_station_module.svg`,
  struct_antenna_array:  `${TERRAIN}struct_antenna_array.svg`,

  // Level 10 Structures (Stronghold)
  struct_cylon_tower:    `${TERRAIN}struct_cylon_tower.svg`,
  struct_turret_base:    `${TERRAIN}struct_turret_base.svg`,
  struct_heavy_gate:     `${TERRAIN}struct_heavy_gate.svg`,
  struct_reactor_core:   `${TERRAIN}struct_reactor_core.svg`,

  // Level 6 Props (Shipyard)
  prop_scrap_metal:      `${TERRAIN}prop_scrap_metal.svg`,
  prop_oil_drum:         `${TERRAIN}prop_oil_drum.svg`,
  prop_anchor:           `${TERRAIN}prop_anchor.svg`,

  // Level 7 Props (Wasteland)
  prop_bones:            `${TERRAIN}prop_bones.svg`,
  prop_radiation_sign:   `${TERRAIN}prop_radiation_sign.svg`,

  // Level 8 Props (Industrial)
  prop_grate:            `${TERRAIN}prop_grate.svg`,
  prop_steam_vent:       `${TERRAIN}prop_steam_vent.svg`,

  // Level 9 Props (Orbital)
  prop_space_debris:     `${TERRAIN}prop_space_debris.svg`,
  prop_hull_fragment:    `${TERRAIN}prop_hull_fragment.svg`,
  prop_wiring:           `${TERRAIN}prop_wiring.svg`,
  prop_panel_shard:      `${TERRAIN}prop_panel_shard.svg`,

  // Level 10 Props (Stronghold)
  prop_red_light:        `${TERRAIN}prop_red_light.svg`,
  prop_cable_cluster:    `${TERRAIN}prop_cable_cluster.svg`,
  prop_vent_grate:       `${TERRAIN}prop_vent_grate.svg`,
  prop_blast_mark:       `${TERRAIN}prop_blast_mark.svg`,
};
