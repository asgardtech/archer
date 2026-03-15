import { AssetManifest } from "../../../shared/AssetLoader";

const BASE = "assets/raptor/";
const TERRAIN = `${BASE}terrain/`;

export const ASSET_MANIFEST: AssetManifest = {
  // player.png is retained as optional legacy asset; the ship is now procedurally rendered via ShipRenderer.
  player:           `${BASE}player.png`,
  enemy_scout:      `${BASE}enemy_scout.png`,
  enemy_fighter:    `${BASE}enemy_fighter.png`,
  enemy_bomber:     `${BASE}enemy_bomber.png`,
  enemy_boss:       `${BASE}enemy_boss.png`,
  enemy_boss_gunship: `${BASE}enemy_boss_gunship.png`,
  enemy_boss_dreadnought: `${BASE}enemy_boss_dreadnought.png`,
  enemy_boss_fortress: `${BASE}enemy_boss_fortress.png`,
  enemy_boss_carrier: `${BASE}enemy_boss_carrier.png`,
  enemy_interceptor: `${BASE}enemy_interceptor.png`,
  enemy_dart:       `${BASE}enemy_dart.png`,
  enemy_drone:      `${BASE}enemy_drone.png`,
  enemy_swarmer:    `${BASE}enemy_swarmer.png`,
  enemy_gunship:    `${BASE}enemy_gunship.png`,
  enemy_cruiser:    `${BASE}enemy_cruiser.png`,
  enemy_destroyer:  `${BASE}enemy_destroyer.png`,
  enemy_juggernaut: `${BASE}enemy_juggernaut.png`,
  enemy_stealth:    `${BASE}enemy_stealth.png`,
  enemy_minelayer:  `${BASE}enemy_minelayer.png`,
  bullet_player:    `${BASE}bullet_player.png`,
  bullet_enemy:     `${BASE}bullet_enemy.png`,
  bullet_enemy_spread: `${BASE}bullet_enemy_spread.png`,
  missile_player:   `${BASE}missile_player.png`,
  missile_enemy:    `${BASE}missile_enemy.png`,
  powerup_spread:   `${BASE}powerup_spread.png`,
  powerup_rapid:    `${BASE}powerup_rapid.png`,
  powerup_shield:   `${BASE}powerup_shield.png`,
  powerup_life:     `${BASE}powerup_life.png`,
  powerup_missile:  `${BASE}powerup_missile.png`,
  powerup_laser:    `${BASE}powerup_laser.png`,
  bullet_plasma:    `${BASE}bullet_plasma.png`,
  powerup_plasma:   `${BASE}powerup_plasma.png`,
  bullet_ion:       `${BASE}bullet_ion.png`,
  powerup_ion:      `${BASE}powerup_ion.png`,
  bullet_autogun:   `${BASE}bullet_autogun.png`,
  powerup_autogun:  `${BASE}powerup_autogun.png`,
  bullet_rocket:    `${BASE}bullet_rocket.png`,
  powerup_rocket:   `${BASE}powerup_rocket.png`,
  powerup_bomb:     `${BASE}powerup_bomb.png`,
  powerup_battery:  `${BASE}powerup_battery.png`,
  powerup_deflector: `${BASE}powerup_deflector.png`,
  powerup_repair:   `${BASE}powerup_repair.png`,
  bg_nebula:        `${BASE}bg_nebula.png`,
  planet_01:        `${BASE}planet_01.png`,
  planet_02:        `${BASE}planet_02.png`,

  portrait_pilot:    `${BASE}portrait_pilot.png`,
  portrait_wingman:  `${BASE}portrait_wingman.png`,
  portrait_hq:       `${BASE}portrait_hq.png`,
  portrait_sensor:   `${BASE}portrait_sensor.png`,

  horizon_coastal:     `${TERRAIN}horizon_coastal.png`,
  horizon_desert:      `${TERRAIN}horizon_desert.png`,
  horizon_mountain:    `${TERRAIN}horizon_mountain.png`,
  horizon_arctic:      `${TERRAIN}horizon_arctic.png`,
  horizon_fortress:    `${TERRAIN}horizon_fortress.png`,

  ground_grass:        `${TERRAIN}ground_grass.png`,
  ground_sand:         `${TERRAIN}ground_sand.png`,
  ground_snow:         `${TERRAIN}ground_snow.png`,
  ground_concrete:     `${TERRAIN}ground_concrete.png`,

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
  horizon_shipyard:      `${TERRAIN}horizon_shipyard.png`,
  horizon_wasteland:     `${TERRAIN}horizon_wasteland.png`,
  horizon_industrial:    `${TERRAIN}horizon_industrial.png`,
  horizon_orbital:       `${TERRAIN}horizon_orbital.png`,
  horizon_stronghold:    `${TERRAIN}horizon_stronghold.png`,

  // Level 6–10 Ground Textures
  ground_rust:           `${TERRAIN}ground_rust.png`,
  ground_ash:            `${TERRAIN}ground_ash.png`,
  ground_metal:          `${TERRAIN}ground_metal.png`,
  ground_hull_plate:     `${TERRAIN}ground_hull_plate.png`,
  ground_dark_metal:     `${TERRAIN}ground_dark_metal.png`,

  // Level 6 Structures (Shipyard)
  struct_crane:          `${TERRAIN}struct_crane.png`,
  struct_drydock:        `${TERRAIN}struct_drydock.png`,
  struct_ship_hull:      `${TERRAIN}struct_ship_hull.png`,
  struct_cargo_container: `${TERRAIN}struct_cargo_container.png`,

  // Level 7 Structures (Wasteland)
  struct_ruin:           `${TERRAIN}struct_ruin.png`,
  struct_dead_tree:      `${TERRAIN}struct_dead_tree.png`,
  struct_wrecked_tank:   `${TERRAIN}struct_wrecked_tank.png`,

  // Level 8 Structures (Industrial)
  struct_smokestack:     `${TERRAIN}struct_smokestack.png`,
  struct_factory:        `${TERRAIN}struct_factory.png`,
  struct_conveyor:       `${TERRAIN}struct_conveyor.png`,
  struct_cooling_tower:  `${TERRAIN}struct_cooling_tower.png`,
  struct_pipe_cluster:   `${TERRAIN}struct_pipe_cluster.png`,

  // Level 9 Structures (Orbital)
  struct_satellite_dish: `${TERRAIN}struct_satellite_dish.png`,
  struct_solar_panel:    `${TERRAIN}struct_solar_panel.png`,
  struct_station_module: `${TERRAIN}struct_station_module.png`,
  struct_antenna_array:  `${TERRAIN}struct_antenna_array.png`,

  // Level 10 Structures (Stronghold)
  struct_vektran_tower:    `${TERRAIN}struct_vektran_tower.png`,
  struct_turret_base:    `${TERRAIN}struct_turret_base.png`,
  struct_heavy_gate:     `${TERRAIN}struct_heavy_gate.png`,
  struct_reactor_core:   `${TERRAIN}struct_reactor_core.png`,

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
