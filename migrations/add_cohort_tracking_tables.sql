-- Migration: Add cohort tracking tables
-- Created: 2025-08-30

-- User Activity Logs table for tracking all user activities
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  metadata TEXT,
  timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp ON user_activity_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_timestamp ON user_activity_logs(user_id, timestamp);

-- Retention Cohorts table for storing calculated cohort data
CREATE TABLE IF NOT EXISTS retention_cohorts (
  id SERIAL PRIMARY KEY,
  cohort_month VARCHAR(20) NOT NULL UNIQUE,
  cohort_size INTEGER NOT NULL,
  retention_data TEXT NOT NULL,
  calculated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for cohort queries
CREATE INDEX IF NOT EXISTS idx_retention_cohorts_month ON retention_cohorts(cohort_month);

-- Insert some sample activity types for reference
COMMENT ON COLUMN user_activity_logs.activity_type IS 'Activity types: login, post_created, post_liked, comment_made, message_sent, story_viewed, profile_visited, follow_made, app_opened, feed_scrolled, search_performed';
COMMENT ON COLUMN user_activity_logs.metadata IS 'JSON metadata for additional context about the activity';
COMMENT ON COLUMN retention_cohorts.cohort_month IS 'Format: YYYY-MM (e.g., 2025-01)';
COMMENT ON COLUMN retention_cohorts.retention_data IS 'JSON containing retention rates and active user counts by month';