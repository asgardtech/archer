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
  enemy_wasp:       `${BASE}enemy_wasp.png`,
  enemy_phantom:    `${BASE}enemy_phantom.png`,
  enemy_needle:     `${BASE}enemy_needle.png`,
  enemy_locust:     `${BASE}enemy_locust.png`,
  enemy_glider:     `${BASE}enemy_glider.png`,
  enemy_spark:      `${BASE}enemy_spark.png`,
  enemy_sentinel:   `${BASE}enemy_sentinel.png`,
  enemy_lancer:     `${BASE}enemy_lancer.png`,
  enemy_ravager:    `${BASE}enemy_ravager.png`,
  enemy_wraith:     `${BASE}enemy_wraith.png`,
  enemy_corsair:    `${BASE}enemy_corsair.png`,
  enemy_vulture:    `${BASE}enemy_vulture.png`,
  enemy_titan:      `${BASE}enemy_titan.png`,
  enemy_bastion:    `${BASE}enemy_bastion.png`,
  enemy_siege_engine: `${BASE}enemy_siege_engine.png`,
  enemy_colossus:   `${BASE}enemy_colossus.png`,
  enemy_warden:     `${BASE}enemy_warden.png`,
  enemy_leviathan:  `${BASE}enemy_leviathan.png`,
  enemy_boss_mothership: `${BASE}enemy_boss_mothership.png`,
  enemy_boss_hydra:     `${BASE}enemy_boss_hydra.png`,
  enemy_boss_shadow:    `${BASE}enemy_boss_shadow.png`,
  enemy_boss_behemoth:  `${BASE}enemy_boss_behemoth.png`,
  enemy_boss_architect: `${BASE}enemy_boss_architect.png`,
  enemy_boss_swarm_queen: `${BASE}enemy_boss_swarm_queen.png`,
  enemy_splitter:       `${BASE}enemy_splitter.png`,
  enemy_splitter_minor: `${BASE}enemy_splitter_minor.png`,
  enemy_healer:         `${BASE}enemy_healer.png`,
  enemy_teleporter:     `${BASE}enemy_teleporter.png`,
  enemy_mimic:          `${BASE}enemy_mimic.png`,
  enemy_kamikaze:       `${BASE}enemy_kamikaze.png`,
  enemy_jammer:         `${BASE}enemy_jammer.png`,
  bullet_player:    `${BASE}bullet_player.png`,
  bullet_enemy:     `${BASE}bullet_enemy.png`,
  bullet_enemy_spread: `${BASE}bullet_enemy_spread.png`,
  missile_player:   `${BASE}missile_player.png`,
  missile_enemy:    `${BASE}missile_enemy.png`,

  bullet_enemy_green:   `${BASE}bullet_enemy_green.png`,
  bullet_enemy_purple:  `${BASE}bullet_enemy_purple.png`,
  bullet_enemy_orange:  `${BASE}bullet_enemy_orange.png`,
  bullet_enemy_blue:    `${BASE}bullet_enemy_blue.png`,
  bullet_spread_orange: `${BASE}bullet_spread_orange.png`,
  bullet_spread_blue:   `${BASE}bullet_spread_blue.png`,
  missile_enemy_blue:   `${BASE}missile_enemy_blue.png`,
  missile_enemy_magenta: `${BASE}missile_enemy_magenta.png`,
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
  powerup_autoturret: `${BASE}powerup_autoturret.png`,
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
  prop_scrap_metal:      `${TERRAIN}prop_scrap_metal.png`,
  prop_oil_drum:         `${TERRAIN}prop_oil_drum.png`,
  prop_anchor:           `${TERRAIN}prop_anchor.png`,

  // Level 7 Props (Wasteland)
  prop_bones:            `${TERRAIN}prop_bones.png`,
  prop_radiation_sign:   `${TERRAIN}prop_radiation_sign.png`,

  // Level 8 Props (Industrial)
  prop_grate:            `${TERRAIN}prop_grate.png`,
  prop_steam_vent:       `${TERRAIN}prop_steam_vent.png`,

  // Level 9 Props (Orbital)
  prop_space_debris:     `${TERRAIN}prop_space_debris.png`,
  prop_hull_fragment:    `${TERRAIN}prop_hull_fragment.png`,
  prop_wiring:           `${TERRAIN}prop_wiring.png`,
  prop_panel_shard:      `${TERRAIN}prop_panel_shard.png`,

  // Level 10 Props (Stronghold)
  prop_red_light:        `${TERRAIN}prop_red_light.png`,
  prop_cable_cluster:    `${TERRAIN}prop_cable_cluster.png`,
  prop_vent_grate:       `${TERRAIN}prop_vent_grate.png`,
  prop_blast_mark:       `${TERRAIN}prop_blast_mark.png`,

  // Level 11–20 Horizons
  horizon_colony:          `${TERRAIN}horizon_colony.png`,
  horizon_asteroid:        `${TERRAIN}horizon_asteroid.png`,
  horizon_nebula:          `${TERRAIN}horizon_nebula.png`,
  horizon_jungle:          `${TERRAIN}horizon_jungle.png`,
  horizon_volcano:         `${TERRAIN}horizon_volcano.png`,
  horizon_ocean:           `${TERRAIN}horizon_ocean.png`,
  horizon_tundra:          `${TERRAIN}horizon_tundra.png`,
  horizon_ruins:           `${TERRAIN}horizon_ruins.png`,
  horizon_megacity:        `${TERRAIN}horizon_megacity.png`,
  horizon_dominion_base:   `${TERRAIN}horizon_dominion_base.png`,

  // Level 11–20 Ground Textures
  ground_rock:             `${TERRAIN}ground_rock.png`,
  ground_void:             `${TERRAIN}ground_void.png`,
  ground_moss:             `${TERRAIN}ground_moss.png`,
  ground_volcanic:         `${TERRAIN}ground_volcanic.png`,
  ground_water:            `${TERRAIN}ground_water.png`,
  ground_ice:              `${TERRAIN}ground_ice.png`,
  ground_ancient_stone:    `${TERRAIN}ground_ancient_stone.png`,
  ground_alien_metal:      `${TERRAIN}ground_alien_metal.png`,
  ground_dominion_hull:    `${TERRAIN}ground_dominion_hull.png`,

  // Level 11 Structures (Colony)
  struct_colony_tower:     `${TERRAIN}struct_colony_tower.png`,
  struct_landing_pad:      `${TERRAIN}struct_landing_pad.png`,
  struct_comm_relay:       `${TERRAIN}struct_comm_relay.png`,
  struct_habitat:          `${TERRAIN}struct_habitat.png`,

  // Level 12 Structures (Asteroid)
  struct_drill_rig:        `${TERRAIN}struct_drill_rig.png`, // shared with L15
  struct_ore_processor:    `${TERRAIN}struct_ore_processor.png`,
  struct_cargo_pod:        `${TERRAIN}struct_cargo_pod.png`,
  struct_beacon:           `${TERRAIN}struct_beacon.png`,

  // Level 13 Structures (Nebula)
  struct_gas_pocket:       `${TERRAIN}struct_gas_pocket.png`,
  struct_sensor_buoy:      `${TERRAIN}struct_sensor_buoy.png`,
  struct_debris_cluster:   `${TERRAIN}struct_debris_cluster.png`,

  // Level 14 Structures (Jungle)
  struct_giant_fern:       `${TERRAIN}struct_giant_fern.png`,
  struct_hive_mound:       `${TERRAIN}struct_hive_mound.png`,
  struct_spore_tower:      `${TERRAIN}struct_spore_tower.png`,
  struct_vine_arch:        `${TERRAIN}struct_vine_arch.png`,

  // Level 15 Structures (Volcano)
  struct_lava_pipe:        `${TERRAIN}struct_lava_pipe.png`,
  struct_rock_spire:       `${TERRAIN}struct_rock_spire.png`,
  struct_extraction_unit:  `${TERRAIN}struct_extraction_unit.png`,

  // Level 16 Structures (Ocean)
  struct_oil_platform:     `${TERRAIN}struct_oil_platform.png`,
  struct_dock_crane:       `${TERRAIN}struct_dock_crane.png`,
  struct_sea_wall:         `${TERRAIN}struct_sea_wall.png`,
  struct_radar_dome:       `${TERRAIN}struct_radar_dome.png`,

  // Level 17 Structures (Tundra)
  struct_ice_bunker:       `${TERRAIN}struct_ice_bunker.png`,
  struct_frozen_turret:    `${TERRAIN}struct_frozen_turret.png`,
  struct_supply_depot:     `${TERRAIN}struct_supply_depot.png`,
  struct_shield_generator: `${TERRAIN}struct_shield_generator.png`,

  // Level 18 Structures (Ruins)
  struct_obelisk:          `${TERRAIN}struct_obelisk.png`,
  struct_broken_arch:      `${TERRAIN}struct_broken_arch.png`,
  struct_alien_pillar:     `${TERRAIN}struct_alien_pillar.png`,
  struct_glyph_wall:       `${TERRAIN}struct_glyph_wall.png`,
  struct_excavation_site:  `${TERRAIN}struct_excavation_site.png`,

  // Level 19 Structures (Megacity)
  struct_alien_skyscraper: `${TERRAIN}struct_alien_skyscraper.png`,
  struct_shield_pylon:     `${TERRAIN}struct_shield_pylon.png`,
  struct_transit_tube:     `${TERRAIN}struct_transit_tube.png`,
  struct_defense_battery:  `${TERRAIN}struct_defense_battery.png`,
  struct_power_node:       `${TERRAIN}struct_power_node.png`,

  // Level 20 Structures (Dominion Base)
  struct_dominion_spire:   `${TERRAIN}struct_dominion_spire.png`,
  struct_command_nexus:    `${TERRAIN}struct_command_nexus.png`,
  struct_energy_core:      `${TERRAIN}struct_energy_core.png`,
  struct_weapon_array:     `${TERRAIN}struct_weapon_array.png`,
  struct_dominion_gate:    `${TERRAIN}struct_dominion_gate.png`,

  // Level 11 Props (Colony)
  prop_crate:              `${TERRAIN}prop_crate.png`,
  prop_antenna:            `${TERRAIN}prop_antenna.png`,
  prop_light_post:         `${TERRAIN}prop_light_post.png`,

  // Level 12 Props (Asteroid)
  prop_asteroid_chunk:     `${TERRAIN}prop_asteroid_chunk.png`,

  // Level 13 Props (Nebula)
  prop_nebula_wisp:        `${TERRAIN}prop_nebula_wisp.png`,

  // Level 14 Props (Jungle)
  prop_alien_flora:        `${TERRAIN}prop_alien_flora.png`,
  prop_bioluminescent_pool: `${TERRAIN}prop_bioluminescent_pool.png`,
  prop_fallen_log:         `${TERRAIN}prop_fallen_log.png`,
  prop_spore_cluster:      `${TERRAIN}prop_spore_cluster.png`,

  // Level 15 Props (Volcano)
  prop_lava_flow:          `${TERRAIN}prop_lava_flow.png`,
  prop_volcanic_rock:      `${TERRAIN}prop_volcanic_rock.png`,
  prop_ash_deposit:        `${TERRAIN}prop_ash_deposit.png`,

  // Level 16 Props (Ocean)
  prop_buoy:               `${TERRAIN}prop_buoy.png`,
  prop_wave_break:         `${TERRAIN}prop_wave_break.png`,
  prop_cargo_crate:        `${TERRAIN}prop_cargo_crate.png`,

  // Level 17 Props (Tundra)
  prop_ice_formation:      `${TERRAIN}prop_ice_formation.png`,
  prop_frozen_debris:      `${TERRAIN}prop_frozen_debris.png`,
  prop_cracked_ice:        `${TERRAIN}prop_cracked_ice.png`,

  // Level 18 Props (Ruins)
  prop_alien_artifact:     `${TERRAIN}prop_alien_artifact.png`,
  prop_dig_site:           `${TERRAIN}prop_dig_site.png`,
  prop_energy_conduit:     `${TERRAIN}prop_energy_conduit.png`, // shared with L19, L20

  // Level 19 Props (Megacity)
  prop_alien_signage:      `${TERRAIN}prop_alien_signage.png`,
  prop_structural_debris:  `${TERRAIN}prop_structural_debris.png`,

  // Level 20 Props (Dominion Base)
  prop_alien_cable:        `${TERRAIN}prop_alien_cable.png`,
};
