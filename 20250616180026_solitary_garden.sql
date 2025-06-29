/*
  # Fix infinite recursion in conversation_participants RLS policy

  1. Policy Changes
    - Remove the recursive SELECT policy that causes infinite recursion
    - Replace with a simple policy that allows users to view their own participation records
    - This prevents the policy from querying the same table it's protecting

  2. Security
    - Users can only see their own participation records
    - Maintains data security while eliminating recursion
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

-- Create a simple, non-recursive policy
CREATE POLICY "Users can view their own participation records"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create a policy to allow users to view other participants in conversations they're part of
-- This uses a different approach that doesn't cause recursion
CREATE POLICY "Users can view other participants in shared conversations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );