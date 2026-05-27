CREATE TABLE IF NOT EXISTS t_p22480343_zg_corp_tag_game.friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p22480343_zg_corp_tag_game.users(id),
  friend_id INTEGER NOT NULL REFERENCES t_p22480343_zg_corp_tag_game.users(id),
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS t_p22480343_zg_corp_tag_game.rooms (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) NOT NULL UNIQUE,
  host_id INTEGER NOT NULL REFERENCES t_p22480343_zg_corp_tag_game.users(id),
  guest_id INTEGER REFERENCES t_p22480343_zg_corp_tag_game.users(id),
  mode VARCHAR(16) NOT NULL DEFAULT 'chase',
  status VARCHAR(16) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p22480343_zg_corp_tag_game.room_state (
  room_id INTEGER NOT NULL REFERENCES t_p22480343_zg_corp_tag_game.rooms(id),
  player_id INTEGER NOT NULL REFERENCES t_p22480343_zg_corp_tag_game.users(id),
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  extra JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(room_id, player_id)
);