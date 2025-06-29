/*
  # Fix Posts RLS Policy

  1. Changes
    - Drop existing restrictive post creation policy
    - Create new policy that allows authenticated users to create posts
    - Maintain existing security while fixing the 403 error

  2. Security
    - Users must still be authenticated
    - Users can only create posts as themselves
*/

-- Drop existing post creation policy
DROP POLICY IF EXISTS "Members can create posts" ON posts;
DROP POLICY IF EXISTS "Members can create posts with verification check" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;

-- Create new post creation policy
CREATE POLICY "Authenticated users can create posts"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 
    FROM community_members cm
    JOIN communities c ON c.id = cm.community_id
    LEFT JOIN profiles p ON p.id = cm.user_id
    WHERE c.id = posts.community_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
    AND (
      NOT c.requires_verification 
      OR p.verification_status = 'verified'
      OR p.official = true
    )
  )
);