-- Add missing columns to messages table if they don't exist
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text',
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS is_read INTEGER DEFAULT 0;

-- Update existing records to have default message_type
UPDATE messages SET message_type = 'text' WHERE message_type IS NULL;

-- Make message_type NOT NULL after setting defaults
ALTER TABLE messages ALTER COLUMN message_type SET NOT NULL;

-- Add comments
COMMENT ON COLUMN messages.message_type IS 'text, image, audio, file';
COMMENT ON COLUMN messages.duration IS 'for audio messages in seconds';
COMMENT ON COLUMN messages.is_read IS '0 = unread, 1 = read';