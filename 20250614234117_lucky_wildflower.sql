/*
  # Fix Community Deletion

  1. Changes
    - Ensure all foreign key constraints have proper CASCADE deletion
    - Add proper RLS policies for community deletion
    - Fix any constraint issues that might prevent deletion

  2. Security
    - Only community creators can delete their communities
    - Ensure all related data is properly cleaned up
*/

-- Ensure community creators can delete their communities
DROP POLICY IF EXISTS "Creators can delete communities" ON communities;
CREATE POLICY "Creators can delete communities"
  ON communities FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid());

-- Ensure all foreign key constraints have proper CASCADE deletion
DO $$ 
BEGIN
  -- Update posts foreign key if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.referential_constraints 
    WHERE constraint_name = 'posts_community_id_fkey'
    AND delete_rule != 'CASCADE'
  ) THEN
    ALTER TABLE posts
      DROP CONSTRAINT IF EXISTS posts_community_id_fkey,
      ADD CONSTRAINT posts_community_id_fkey
        FOREIGN KEY (community_id)
        REFERENCES communities(id)
        ON DELETE CASCADE;
  END IF;

  -- Update community_members foreign key if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.referential_constraints 
    WHERE constraint_name = 'community_members_community_id_fkey'
    AND delete_rule != 'CASCADE'
  ) THEN
    ALTER TABLE community_members
      DROP CONSTRAINT IF EXISTS community_members_community_id_fkey,
      ADD CONSTRAINT community_members_community_id_fkey
        FOREIGN KEY (community_id)
        REFERENCES communities(id)
        ON DELETE CASCADE;
  END IF;

  -- Update projects foreign key if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.referential_constraints 
    WHERE constraint_name = 'projects_community_id_fkey'
    AND delete_rule != 'CASCADE'
  ) THEN
    ALTER TABLE projects
      DROP CONSTRAINT IF EXISTS projects_community_id_fkey,
      ADD CONSTRAINT projects_community_id_fkey
        FOREIGN KEY (community_id)
        REFERENCES communities(id)
        ON DELETE CASCADE;
  END IF;
END $$;