-- Migration: Add post scheduling fields
-- Created: 2025-08-20

-- Create post_status enum
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'live', 'expired');

-- Add scheduling fields to posts table
ALTER TABLE posts 
ADD COLUMN status post_status NOT NULL DEFAULT 'live',
ADD COLUMN publish_time TIMESTAMP,
ADD COLUMN expiry_time TIMESTAMP;

-- Create index for efficient querying of live posts
CREATE INDEX idx_posts_status_publish_time ON posts(status, publish_time);
CREATE INDEX idx_posts_status_created_at ON posts(status, created_at);

-- Update existing posts to be 'live' status (already the default, but explicit)
UPDATE posts SET status = 'live' WHERE status IS NULL;