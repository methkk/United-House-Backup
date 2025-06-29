/*
  # Add delete policy for projects table

  1. Changes
    - Add RLS policy to allow users to delete their own projects
    - Mirror existing post deletion policy

  2. Security
    - Only project creators can delete their projects
    - Cascading delete for related records is handled by foreign key constraints
*/

-- Add policy for project deletion
CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);