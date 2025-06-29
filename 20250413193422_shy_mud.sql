/*
  # Add delete policy for posts

  1. Changes
    - Add RLS policy to allow users to delete their own posts

  2. Security
    - Only post creators can delete their posts
    - Cascading delete for related records (votes, comments) is handled by foreign key constraints
*/

-- Add policy for post deletion
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);