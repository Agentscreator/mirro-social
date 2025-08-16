-- Create location_requests table if it doesn't exist
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_requests_post_id ON location_requests(post_id);
CREATE INDEX IF NOT EXISTS idx_location_requests_requester_id ON location_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_location_requests_post_owner_id ON location_requests(post_owner_id);

-- Add comments
COMMENT ON TABLE location_requests IS 'Requests for private location information';
COMMENT ON COLUMN location_requests.status IS 'pending, accepted, or denied';