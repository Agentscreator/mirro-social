-- Add attachment support to messages table
ALTER TABLE messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text' NOT NULL;
ALTER TABLE messages ADD COLUMN attachment_url TEXT;
ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(50);
ALTER TABLE messages ADD COLUMN attachment_name VARCHAR(255);
ALTER TABLE messages ADD COLUMN attachment_size INTEGER;
ALTER TABLE messages ADD COLUMN duration INTEGER; -- For audio messages

-- Add index for better performance
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);

-- Update content to be nullable for attachment-only messages
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;