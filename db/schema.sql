-- Run this to create the DB and tables
CREATE DATABASE IF NOT EXISTS chatbox DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chatbox;

CREATE TABLE IF NOT EXISTS `groups` (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_name VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  admin_token VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS `messages` (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  group_id BIGINT NOT NULL,
  sender_name VARCHAR(191),
  message_text TEXT,
  timestamp DATETIME NOT NULL,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE
);
