-- Create groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image VARCHAR(500),
    created_by UUID NOT NULL REFERENCES users(id),
    post_id INTEGER REFERENCES posts(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    max_members INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_post_id ON groups(post_id);

-- Add comments
COMMENT ON TABLE groups IS 'Community groups created from posts';
COMMENT ON COLUMN groups.is_active IS '0 = inactive, 1 = active';