-- Create post_invites table if it doesn't exist
CREATE TABLE IF NOT EXISTS post_invites (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    invite_description TEXT,
    participant_limit INTEGER NOT NULL DEFAULT 10,
    current_participants INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_invites_post_id ON post_invites(post_id);

-- Add comments
COMMENT ON TABLE post_invites IS 'Stores invite information for posts';
COMMENT ON COLUMN post_invites.invite_description IS 'What the user is inviting people to do';