-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES users(id),
    from_user_id UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Add comments
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON COLUMN notifications.type IS 'invite_accepted, invite_request, group_invite, etc.';
COMMENT ON COLUMN notifications.data IS 'JSON data for additional notification context';
COMMENT ON COLUMN notifications.is_read IS '0 = unread, 1 = read';