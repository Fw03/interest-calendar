CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(128) NOT NULL UNIQUE,
  account_id CHAR(36) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_preferences (
  user_id BIGINT PRIMARY KEY,
  theme_id VARCHAR(16) NOT NULL,
  zodiac_sign VARCHAR(16) NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE interest_modules (
  code VARCHAR(16) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description VARCHAR(160) NOT NULL,
  sort_order INT NOT NULL,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_interests (
  user_id BIGINT NOT NULL,
  module_code VARCHAR(16) NOT NULL,
  enabled BOOLEAN NOT NULL,
  sort_order INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, module_code),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_code) REFERENCES interest_modules(code)
);
CREATE TABLE daily_contents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_date DATE NOT NULL,
  module_code VARCHAR(16) NOT NULL,
  variant_key VARCHAR(24) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content_json TEXT NOT NULL,
  source_name VARCHAR(120) NOT NULL,
  source_url VARCHAR(512),
  license_note VARCHAR(200) NOT NULL,
  published BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (content_date, module_code, variant_key),
  FOREIGN KEY (module_code) REFERENCES interest_modules(code)
);
CREATE TABLE user_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  client_id VARCHAR(64) NOT NULL,
  event_date DATE NOT NULL,
  title VARCHAR(80) NOT NULL,
  content TEXT NOT NULL,
  kind VARCHAR(8) NOT NULL,
  completed BOOLEAN NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  last_mutation_id VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, client_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_event_user_date ON user_events(user_id, event_date);
CREATE TABLE share_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  creator_user_id BIGINT NOT NULL,
  share_date DATE NOT NULL,
  template_id VARCHAR(24) NOT NULL,
  public_payload_json TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_share_creator_created ON share_records(creator_user_id, created_at);
CREATE TABLE share_visits (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  share_record_id BIGINT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visitor_hash VARCHAR(64),
  referrer_type VARCHAR(16) NOT NULL,
  FOREIGN KEY (share_record_id) REFERENCES share_records(id) ON DELETE CASCADE
);
CREATE INDEX idx_share_visits_date ON share_visits(share_record_id, occurred_at);
CREATE TABLE user_sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_sessions_user_expiry ON user_sessions(user_id, expires_at);
