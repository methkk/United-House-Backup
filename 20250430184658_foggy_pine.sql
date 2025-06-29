/*
  # Add project_id to post_comments table

  1. Changes
    - Add `project_id` column to `post_comments` table
    - Add foreign key constraint to reference projects table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

-- Add project_id column
ALTER TABLE post_comments
ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_post_comments_project_id ON post_comments(project_id);

-- Add constraint to ensure either post_id or project_id is set, but not both
ALTER TABLE post_comments
ADD CONSTRAINT post_comments_entity_check 
CHECK (
  (post_id IS NOT NULL AND project_id IS NULL) OR 
  (post_id IS NULL AND project_id IS NOT NULL)
);