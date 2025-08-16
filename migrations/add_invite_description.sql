-- Add invite description column to post_invites table
ALTER TABLE post_invites 
ADD COLUMN invite_description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN post_invites.invite_description IS 'Description of what the user is inviting people to do';