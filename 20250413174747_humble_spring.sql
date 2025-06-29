/*
  # Add foreign key relationship between community_members and profiles

  1. Changes
    - Add foreign key constraint from community_members.user_id to profiles.id
    - This enables joining community_members with profiles data

  2. Impact
    - Enables querying profile data for community members
    - Required for member management functionality
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'community_members_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE community_members
    ADD CONSTRAINT community_members_user_id_profiles_fkey
    FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;