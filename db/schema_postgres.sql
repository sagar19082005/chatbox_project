-- Run this to create the tables in Postgres (do not run CREATE DATABASE here if using managed DB)
CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  group_name VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  admin_token VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_name VARCHAR(191),
  message_text TEXT,
  timestamp TIMESTAMP NOT NULL
);
