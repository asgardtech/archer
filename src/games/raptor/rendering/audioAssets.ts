export interface AudioAssetManifest {
  sfx: Record<string, string>;
  music: Record<string, string>;
}

export const AUDIO_MANIFEST: AudioAssetManifest = {
  sfx: {
    player_shoot:     "assets/raptor/audio/sfx/player_shoot.mp3",
    enemy_shoot:      "assets/raptor/audio/sfx/enemy_shoot.mp3",
    enemy_hit:        "assets/raptor/audio/sfx/enemy_hit.mp3",
    enemy_destroy:    "assets/raptor/audio/sfx/enemy_destroy.mp3",
    player_hit:       "assets/raptor/audio/sfx/player_hit.mp3",
    player_destroy:   "assets/raptor/audio/sfx/player_destroy.mp3",
    boss_hit:         "assets/raptor/audio/sfx/boss_hit.mp3",
    boss_destroy:     "assets/raptor/audio/sfx/boss_destroy.mp3",
    power_up_collect: "assets/raptor/audio/sfx/power_up_collect.mp3",
    level_complete:   "assets/raptor/audio/sfx/level_complete.mp3",
    game_over:        "assets/raptor/audio/sfx/game_over.mp3",
    victory:          "assets/raptor/audio/sfx/victory.mp3",
    menu_start:       "assets/raptor/audio/sfx/menu_start.mp3",
    missile_fire:     "assets/raptor/audio/sfx/missile_fire.mp3",
    missile_hit:      "assets/raptor/audio/sfx/missile_hit.mp3",
    laser_fire:       "assets/raptor/audio/sfx/laser_fire.mp3",
    laser_hit:        "assets/raptor/audio/sfx/laser_hit.mp3",
    weapon_switch:    "assets/raptor/audio/sfx/weapon_switch.mp3",
    enemy_missile_fire: "assets/raptor/audio/sfx/enemy_missile_fire.mp3",
    enemy_missile_hit:  "assets/raptor/audio/sfx/enemy_missile_hit.mp3",
    enemy_spread_fire:  "assets/raptor/audio/sfx/enemy_spread_fire.mp3",
  },
  music: {
    menu:    "assets/raptor/audio/music/menu.mp3",
    level_1: "assets/raptor/audio/music/level_1_coastal.mp3",
    level_2: "assets/raptor/audio/music/level_2_desert.mp3",
    level_3: "assets/raptor/audio/music/level_3_mountain.mp3",
    level_4: "assets/raptor/audio/music/level_4_arctic.mp3",
    level_5:  "assets/raptor/audio/music/level_5_fortress.mp3",
    level_6:  "assets/raptor/audio/music/level_6_shipyard.mp3",
    level_7:  "assets/raptor/audio/music/level_7_wasteland.mp3",
    level_8:  "assets/raptor/audio/music/level_8_industrial.mp3",
    level_9:  "assets/raptor/audio/music/level_9_orbital.mp3",
    level_10: "assets/raptor/audio/music/level_10_stronghold.mp3",
  },
};
