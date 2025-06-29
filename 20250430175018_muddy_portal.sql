/*
  # Update post_comments RLS policies

  1. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy that allows authenticated users to create comments
    
  2. Security
    - Ensures users can only create comments with their own user_id
    - Maintains existing policies for SELECT, UPDATE, and DELETE
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;

-- Create new INSERT policy
CREATE POLICY "Authenticated users can create comments"
ON post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);