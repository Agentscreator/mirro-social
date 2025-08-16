-- Add missing columns to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS edited_video_data TEXT,
ADD COLUMN IF NOT EXISTS has_private_location INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS community_name VARCHAR(100);

-- Remove old columns if they exist
ALTER TABLE posts 
DROP COLUMN IF EXISTS auto_accept_invites,
DROP COLUMN IF EXISTS group_name;

-- Add comments for documentation
COMMENT ON COLUMN posts.duration IS 'Video duration in seconds (optional)';
COMMENT ON COLUMN posts.edited_video_data IS 'JSON data for video editor projects';
COMMENT ON COLUMN posts.has_private_location IS '0 = no, 1 = yes';
COMMENT ON COLUMN posts.community_name IS 'Name for auto-created community';