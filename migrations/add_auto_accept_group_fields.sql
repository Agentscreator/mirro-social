-- Add auto-accept group fields to posts table
ALTER TABLE posts 
ADD COLUMN auto_accept_invites INTEGER NOT NULL DEFAULT 0,
ADD COLUMN group_name VARCHAR(100);

-- Add comment for clarity
COMMENT ON COLUMN posts.auto_accept_invites IS '0 = no, 1 = yes - automatically accept people to group when they accept invite';
COMMENT ON COLUMN posts.group_name IS 'Name for auto-created group when auto_accept_invites is enabled';