-- Complete schema update for community-based video upload system
-- This script adds all missing tables and columns

BEGIN;

-- 1. Update posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS edited_video_data TEXT,
ADD COLUMN IF NOT EXISTS has_private_location INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS community_name VARCHAR(100);

-- Remove old columns if they exist
ALTER TABLE posts 
DROP COLUMN IF EXISTS auto_accept_invites,
DROP COLUMN IF EXISTS group_name;

-- 2. Create post_invites table
CREATE TABLE IF NOT EXISTS post_invites (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    invite_description TEXT,
    participant_limit INTEGER NOT NULL DEFAULT 10,
    current_participants INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create invite_requests table
CREATE TABLE IF NOT EXISTS invite_requests (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    invite_id INTEGER NOT NULL REFERENCES post_invites(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
    responded_at TIMESTAMP
);

-- 4. Create post_invite_participants table
CREATE TABLE IF NOT EXISTS post_invite_participants (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    invite_id INTEGER NOT NULL REFERENCES post_invites(id),
    user_id UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. Create groups table
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

-- 6. Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 7. Create group_messages table
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

-- 8. Create post_locations table
CREATE TABLE IF NOT EXISTS post_locations (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    location_name VARCHAR(200) NOT NULL,
    location_address TEXT,
    latitude REAL,
    longitude REAL,
    is_private INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 9. Create location_requests table
CREATE TABLE IF NOT EXISTS location_requests (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    post_id INTEGER NOT NULL REFERENCES posts(id),
    requester_id UUID NOT NULL REFERENCES users(id),
    post_owner_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    location_name VARCHAR(200),
    location_address TEXT,
    latitude REAL,
    longitude REAL,
    requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
    responded_at TIMESTAMP
);

-- 10. Create notifications table
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

-- 11. Enhance messages table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_invites_post_id ON post_invites(post_id);
CREATE INDEX IF NOT EXISTS idx_invite_requests_post_id ON invite_requests(post_id);
CREATE INDEX IF NOT EXISTS idx_invite_requests_user_id ON invite_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_requests_invite_id ON invite_requests(invite_id);
CREATE INDEX IF NOT EXISTS idx_post_invite_participants_invite_id ON post_invite_participants(invite_id);
CREATE INDEX IF NOT EXISTS idx_post_invite_participants_user_id ON post_invite_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_post_id ON groups(post_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_post_locations_post_id ON post_locations(post_id);
CREATE INDEX IF NOT EXISTS idx_location_requests_post_id ON location_requests(post_id);
CREATE INDEX IF NOT EXISTS idx_location_requests_requester_id ON location_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_location_requests_post_owner_id ON location_requests(post_owner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_invite_participants_unique ON post_invite_participants(invite_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_unique ON group_members(group_id, user_id);

COMMIT;

-- Verify all tables exist
SELECT 'Tables created successfully. Verifying...' as status;

SELECT table_name, 
       CASE WHEN table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM (VALUES 
    ('posts'),
    ('post_invites'),
    ('invite_requests'), 
    ('post_invite_participants'),
    ('groups'),
    ('group_members'),
    ('group_messages'),
    ('post_locations'),
    ('location_requests'),
    ('notifications'),
    ('messages')
) AS expected_tables(table_name)
LEFT JOIN information_schema.tables t 
    ON t.table_name = expected_tables.table_name 
    AND t.table_schema = 'public'
ORDER BY expected_tables.table_name;