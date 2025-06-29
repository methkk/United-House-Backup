/*
  # Add Community Management Features

  1. Changes
    - Add creator_id to communities table with proper handling of existing rows
    - Add status column to community_members table
    - Add policies for community creators
    - Update member management policies

  2. Security
    - Only creators can manage member status
    - Blocked members cannot rejoin
*/

-- First add creator_id as nullable
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users;

-- Update existing communities to set a default creator
DO $$ 
BEGIN
  -- For each community without a creator, set the first member as creator
  UPDATE communities c
  SET creator_id = (
    SELECT user_id 
    FROM community_members cm 
    WHERE cm.community_id = c.id 
    ORDER BY cm.joined_at ASC 
    LIMIT 1
  )
  WHERE creator_id IS NULL;

  -- If any communities still don't have a creator (no members),
  -- we'll use the first user in the system as a fallback
  UPDATE communities c
  SET creator_id = (
    SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
  )
  WHERE creator_id IS NULL;
END $$;

-- Now make creator_id NOT NULL
ALTER TABLE communities 
ALTER COLUMN creator_id SET NOT NULL;

-- Add status to community_members
ALTER TABLE community_members 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'restricted', 'blocked'));

-- Update community members policies
DROP POLICY IF EXISTS "Users can join communities" ON community_members;
CREATE POLICY "Users can join communities if not blocked"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = community_members.community_id
      AND user_id = auth.uid()
      AND status = 'blocked'
    )
  );

-- Add policy for community creators to manage members
CREATE POLICY "Creators can update member status"
  ON community_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_members.community_id
      AND creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM communities
      WHERE id = community_members.community_id
      AND creator_id = auth.uid()
    )
  );

-- Add index for better query performance on creator lookups
CREATE INDEX IF NOT EXISTS idx_communities_creator_id ON communities(creator_id);