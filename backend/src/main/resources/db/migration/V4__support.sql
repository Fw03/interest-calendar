CREATE TABLE user_feedback (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_feedback_user_date ON user_feedback(user_id, created_at);
CREATE TABLE share_reports (
  share_record_id BIGINT NOT NULL,
  reason VARCHAR(16) NOT NULL,
  report_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (share_record_id,reason,report_date),
  FOREIGN KEY (share_record_id) REFERENCES share_records(id) ON DELETE CASCADE
);
