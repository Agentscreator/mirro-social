-- Create post_invite_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_invite_participants (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    invite_id INTEGER NOT NULL REFERENCES post_invites(id),
    user_id UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_invite_participants_invite_id ON post_invite_participants(invite_id);
CREATE INDEX IF NOT EXISTS idx_post_invite_participants_user_id ON post_invite_participants(user_id);

-- Add unique constraint to prevent duplicate participants
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_invite_participants_unique ON post_invite_participants(invite_id, user_id);

-- Add comments
COMMENT ON TABLE post_invite_participants IS 'Tracks who has accepted invites';