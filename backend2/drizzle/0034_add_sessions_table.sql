-- SCRUM-109: sessions table for JTI validation
-- Every access token gets a jti (UUID). JwtAuthGuard checks that jti exists
-- and is not revoked. Forged tokens (JWT_SECRET leak) have no session → 401.
CREATE TABLE `sessions` (
  `jti`          VARCHAR(36)   NOT NULL,
  `user_id`      BIGINT        NOT NULL,
  `role_id`      BIGINT        NOT NULL,
  `ip`           VARCHAR(100)  NULL,
  `user_agent`   TEXT          NULL,
  `created_at`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`   TIMESTAMP     NOT NULL,
  `revoked`      TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (`jti`),
  INDEX `idx_sessions_user` (`user_id`, `revoked`),
  INDEX `idx_sessions_expires` (`expires_at`)
);
