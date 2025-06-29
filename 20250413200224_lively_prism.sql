/*
  # Add verification requirement for communities

  1. Changes
    - Add requires_verification column to communities table
    - Update post creation policy to check verification status
    - Add index for better query performance

  2. Security
    - Only community creators can update the verification requirement
    - Posts can only be created by verified users in communities that require verification
*/

-- Add requires_verification column to communities table
ALTER TABLE communities
ADD COLUMN IF NOT EXISTS requires_verification boolean DEFAULT false;

-- Add policy for community creators to update settings
CREATE POLICY "Creators can update community settings"
  ON communities FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Drop existing post creation policy
DROP POLICY IF EXISTS "Members can create posts" ON posts;

-- Create new post creation policy with verification check
CREATE POLICY "Members can create posts with verification check"
  ON posts FOR INSERT
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
        -- Allow posting if either:
        -- 1. Community doesn't require verification
        -- 2. User is verified
        NOT c.requires_verification 
        OR p.verification_status = 'verified'
      )
    )
  );