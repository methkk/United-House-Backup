/*
  # Fix Posts Table RLS Policy

  1. Changes
    - Drop and recreate the INSERT policy for posts table to properly handle community membership checks
    - Ensure users can only create posts in communities where they are active members
    - Add verification status check for communities that require verification

  2. Security
    - Maintains RLS enabled on posts table
    - Ensures users can only create posts if they:
      a) Are authenticated
      b) Are active members of the community
      c) Meet verification requirements if the community requires it
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;

-- Create new INSERT policy with proper community membership checks
CREATE POLICY "Authenticated users can create posts" ON posts
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the creator of the post
  (auth.uid() = user_id) 
  AND 
  -- User must be an active member of the community and meet verification requirements
  EXISTS (
    SELECT 1 
    FROM community_members cm
    JOIN communities c ON c.id = cm.community_id
    LEFT JOIN profiles p ON p.id = cm.user_id
    WHERE 
      c.id = posts.community_id 
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND (
        -- Either community doesn't require verification
        NOT c.requires_verification 
        -- Or user is verified/official
        OR p.verification_status = 'verified'
        OR p.official = true
      )
  )
);