-- Update posts table for community-based system
ALTER TABLE posts 
DROP COLUMN IF EXISTS auto_accept_invites,
ADD COLUMN community_name VARCHAR(100);

-- Update existing group_name to community_name if needed
UPDATE posts 
SET community_name = group_name 
WHERE group_name IS NOT NULL;

-- Drop the old group_name column
ALTER TABLE posts 
DROP COLUMN IF EXISTS group_name;

-- Add comments for documentation
COMMENT ON COLUMN posts.community_name IS 'Name for auto-created community when invites are enabled';