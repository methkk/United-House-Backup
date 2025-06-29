/*
  # Update verification status column type

  1. Changes
    - Drop existing verification_status column if it exists
    - Add new verification_status column as text with check constraint
    - Add check constraint to ensure only valid values ('pending', 'verified', or NULL)

  2. Security
    - No changes to RLS policies needed
*/

-- Drop existing column if it exists
ALTER TABLE profiles DROP COLUMN IF EXISTS verification_status;

-- Add new verification_status column as text with check constraint
ALTER TABLE profiles 
ADD COLUMN verification_status text
CHECK (verification_status IN ('pending', 'verified'));