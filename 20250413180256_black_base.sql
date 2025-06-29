/*
  # Fix votes table RLS policies

  1. Changes
    - Drop existing RLS policies for votes table
    - Create new, more permissive policies that still maintain security
    - Ensure users can only vote if they:
      - Are authenticated
      - Are voting on their own behalf (user_id matches auth.uid())
      - Are voting on a post that exists
      - Are not blocked from the community

  2. Security
    - Maintains RLS protection
    - Ensures users can only vote as themselves
    - Prevents blocked users from voting
    - Allows viewing of votes by all authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Members can vote" ON votes;
DROP POLICY IF EXISTS "Users can change their votes" ON votes;
DROP POLICY IF EXISTS "Users can view votes" ON votes;

-- Recreate policies with correct conditions
CREATE POLICY "Users can create votes"
ON votes
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only vote as themselves
  auth.uid() = user_id
  -- User must not be blocked from the community
  AND EXISTS (
    SELECT 1 
    FROM posts p
    LEFT JOIN community_members cm ON cm.community_id = p.community_id
    WHERE p.id = post_id 
    AND (
      -- Either user is a member and not blocked
      (cm.user_id = auth.uid() AND cm.status != 'blocked')
      -- Or user is not a member yet (which means they can vote)
      OR cm.user_id IS NULL
    )
  )
);

CREATE POLICY "Users can update their votes"
ON votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view votes"
ON votes
FOR SELECT
TO authenticated
USING (true);