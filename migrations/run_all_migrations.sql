-- Master migration script to update database schema for community system
-- Run this script to add all missing tables and columns

-- 1. Add missing columns to posts table
\i 001_add_missing_post_columns.sql

-- 2. Create post_invites table
\i 002_create_post_invites_table.sql

-- 3. Create invite_requests table
\i 003_create_invite_requests_table.sql

-- 4. Create post_invite_participants table
\i 004_create_post_invite_participants_table.sql

-- 5. Create groups table
\i 005_create_groups_table.sql

-- 6. Create group_members table
\i 006_create_group_members_table.sql

-- 7. Create group_messages table
\i 007_create_group_messages_table.sql

-- 8. Create post_locations table
\i 008_create_post_locations_table.sql

-- 9. Create location_requests table
\i 009_create_location_requests_table.sql

-- 10. Create notifications table
\i 010_create_notifications_table.sql

-- 11. Enhance messages table
\i 011_enhance_messages_table.sql

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'post_invites',
    'invite_requests', 
    'post_invite_participants',
    'groups',
    'group_members',
    'group_messages',
    'post_locations',
    'location_requests',
    'notifications'
)
ORDER BY table_name;