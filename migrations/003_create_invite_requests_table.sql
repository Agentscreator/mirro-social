-- Create invite_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS invite_requests (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    invite_id INTEGER NOT NULL REFERENCES post_invites(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
    responded_at TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_requests_post_id ON invite_requests(post_id);
CREATE INDEX IF NOT EXISTS idx_invite_requests_user_id ON invite_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_requests_invite_id ON invite_requests(invite_id);

-- Add comments
COMMENT ON TABLE invite_requests IS 'Tracks invite requests from users';
COMMENT ON COLUMN invite_requests.status IS 'pending, accepted, or denied';