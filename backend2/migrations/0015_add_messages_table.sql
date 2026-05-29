-- SCRUM-75: Add messages table for messaging application
CREATE TABLE IF NOT EXISTS messages (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body LONGTEXT,
  html_body LONGTEXT,
  status ENUM('draft', 'sent', 'received', 'read', 'unread', 'archived', 'trash') NOT NULL DEFAULT 'received',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  message_type ENUM('email', 'internal', 'system') NOT NULL DEFAULT 'email',
  related_type VARCHAR(50),
  related_id INT,
  attachment_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_user_status (user_id, status)
);
