/*
  # Add INSERT policy for communities table

  1. Changes
    - Add RLS policy to allow authenticated users to create communities

  2. Security
    - Only authenticated users can create communities
    - No additional restrictions on community creation
*/

CREATE POLICY "Authenticated users can create communities"
  ON communities FOR INSERT
  TO authenticated
  WITH CHECK (true);