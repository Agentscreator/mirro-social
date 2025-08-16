-- Create post_locations table if it doesn't exist
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_locations_post_id ON post_locations(post_id);

-- Add comments
COMMENT ON TABLE post_locations IS 'Stores private location data for posts';
COMMENT ON COLUMN post_locations.is_private IS '0 = public, 1 = private';