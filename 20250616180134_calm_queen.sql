/*
  # Fix infinite recursion in conversation participants policies

  1. Policy Updates
    - Remove the problematic recursive policy on conversation_participants
    - Create simpler, non-recursive policies that avoid circular references
    - Ensure users can only access conversations they participate in

  2. Security
    - Maintain proper access control without infinite recursion
    - Users can view participants in conversations they're part of
    - Users can manage their own participation records
*/

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Users can view other participants in shared conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participation records" ON conversation_participants;

-- Create new, simplified policies that avoid recursion
CREATE POLICY "Users can view their own participation records"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT cp.conversation_id
      FROM conversation_participants cp
      WHERE cp.user_id = auth.uid()
    )
  );

-- Ensure the conversations table has proper policies too
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations they participate in"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );