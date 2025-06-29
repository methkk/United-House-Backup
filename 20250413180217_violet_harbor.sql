/*
  # Fix votes table RLS policy

  1. Changes
    - Drop existing votes policies
    - Create new policy that properly checks community membership
    - Ensure proper join conditions for membership verification

  2. Security
    - Only allow voting by active community members
    - Maintain existing vote value constraints
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Members can vote" ON votes;
DROP POLICY IF EXISTS "Users can vote" ON votes;

-- Create new voting policy with proper membership check
CREATE POLICY "Members can vote"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 
      FROM community_members cm
      JOIN posts p ON p.community_id = cm.community_id
      WHERE p.id = votes.post_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
    )
  );

-- Ensure update policy exists
DROP POLICY IF EXISTS "Users can change their votes" ON votes;
CREATE POLICY "Users can change their votes"
  ON votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure select policy exists
DROP POLICY IF EXISTS "Users can view votes" ON votes;
CREATE POLICY "Users can view votes"
  ON votes FOR SELECT
  TO authenticated
  USING (true);