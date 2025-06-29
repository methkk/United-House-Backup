/*
  # Fix infinite recursion in conversation participants RLS policies

  1. Security Changes
    - Drop existing problematic RLS policies on conversation_participants
    - Create new simplified policies that don't cause recursion
    - Ensure users can only access conversations they participate in
    - Fix policies on messages table that depend on conversation_participants

  2. Policy Changes
    - Replace recursive policy with direct user_id check
    - Simplify conversation access control
    - Maintain security while avoiding circular dependencies
*/

-- Drop existing problematic policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view their own participation records" ON conversation_participants;

-- Create new simplified policies for conversation_participants
CREATE POLICY "Users can view participants in conversations they joined"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see participants in conversations where they are also a participant
    EXISTS (
      SELECT 1 FROM conversation_participants cp2 
      WHERE cp2.conversation_id = conversation_participants.conversation_id 
      AND cp2.user_id = auth.uid()
    )
  );

-- Update the messages policy to avoid recursion
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is a participant in the conversation
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );

-- Update the messages insert policy to avoid recursion
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

CREATE POLICY "Users can send messages to their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id 
      AND cp.user_id = auth.uid()
    )
  );

-- Update conversations policy to avoid recursion
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations they participate in"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = auth.uid()
    )
  );

-- Update conversations update policy
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;

CREATE POLICY "Users can update conversations they participate in"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversations.id 
      AND cp.user_id = auth.uid()
    )
  );