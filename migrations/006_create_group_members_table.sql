-- Create group_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

-- Add unique constraint to prevent duplicate memberships
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group_id, user_id);

-- Add comments
COMMENT ON TABLE group_members IS 'Tracks group membership';
COMMENT ON COLUMN group_members.role IS 'admin or member';