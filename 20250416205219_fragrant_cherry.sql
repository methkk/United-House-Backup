/*
  # Update votes table RLS policies

  1. Changes
    - Update RLS policies for the votes table to allow proper voting functionality
    - Add policies for:
      - Inserting new votes
      - Updating existing votes
      - Deleting votes
      - Viewing votes

  2. Security
    - Ensure users can only vote once per post
    - Users can only modify their own votes
    - Anyone can view votes for transparency
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create votes" ON votes;
DROP POLICY IF EXISTS "Users can update their votes" ON votes;
DROP POLICY IF EXISTS "Users can view votes" ON votes;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON votes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

CREATE POLICY "Enable update for users on their votes" ON votes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users on their votes" ON votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);