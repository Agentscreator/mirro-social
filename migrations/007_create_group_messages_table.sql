-- Create group_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS group_messages (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    attachment_url TEXT,
    attachment_type VARCHAR(50),
    attachment_name VARCHAR(255),
    attachment_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);

-- Add comments
COMMENT ON TABLE group_messages IS 'Messages within group chats';
COMMENT ON COLUMN group_messages.message_type IS 'text, image, audio, file';