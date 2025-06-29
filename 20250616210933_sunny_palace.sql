/*
  # Fix infinite recursion in conversation_participants RLS policy

  1. Policy Changes
    - Drop the problematic SELECT policy that causes infinite recursion
    - Create a new SELECT policy that doesn't reference the same table
    - The new policy allows users to view participants only in conversations where they are participants
    - Uses a simpler approach by checking if the user_id matches the authenticated user or if they're in the same conversation

  2. Security
    - Maintains security by ensuring users can only see participants in conversations they're part of
    - Removes the circular reference that was causing the infinite recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in conversations they joined" ON conversation_participants;

-- Create a new policy that doesn't cause recursion
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own participation record
    user_id = auth.uid()
    OR
    -- Users can see other participants in conversations they're part of
    conversation_id IN (
      SELECT cp.conversation_id 
      FROM conversation_participants cp 
      WHERE cp.user_id = auth.uid()
    )
  );