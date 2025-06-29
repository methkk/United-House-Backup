/*
  # Fix project deletion policies and constraints

  1. Changes
    - Drop existing delete policy if it exists
    - Create new delete policy with proper checks
    - Add cascade delete for related records

  2. Security
    - Only project creators can delete their projects
    - Ensure all related records are properly cleaned up
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

-- Create new delete policy
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure all foreign key constraints have ON DELETE CASCADE
DO $$ 
BEGIN
  -- Update project_comments foreign key if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.referential_constraints 
    WHERE constraint_name = 'project_comments_project_id_fkey'
    AND delete_rule != 'CASCADE'
  ) THEN
    ALTER TABLE project_comments
      DROP CONSTRAINT IF EXISTS project_comments_project_id_fkey,
      ADD CONSTRAINT project_comments_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE;
  END IF;

  -- Update project_votes foreign key if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.referential_constraints 
    WHERE constraint_name = 'project_votes_project_id_fkey'
    AND delete_rule != 'CASCADE'
  ) THEN
    ALTER TABLE project_votes
      DROP CONSTRAINT IF EXISTS project_votes_project_id_fkey,
      ADD CONSTRAINT project_votes_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE;
  END IF;

  -- Update project_supporters foreign key if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.referential_constraints 
    WHERE constraint_name = 'project_supporters_project_id_fkey'
    AND delete_rule != 'CASCADE'
  ) THEN
    ALTER TABLE project_supporters
      DROP CONSTRAINT IF EXISTS project_supporters_project_id_fkey,
      ADD CONSTRAINT project_supporters_project_id_fkey
        FOREIGN KEY (project_id)
        REFERENCES projects(id)
        ON DELETE CASCADE;
  END IF;
END $$;