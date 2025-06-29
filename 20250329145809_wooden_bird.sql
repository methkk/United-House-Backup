/*
  # Add official column to profiles table

  1. Changes
    - Add `official` boolean column to profiles table with default false
    - Update existing profiles
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS official boolean DEFAULT false;

-- Create index for better performance when querying official profiles
CREATE INDEX IF NOT EXISTS idx_profiles_official ON profiles(official) WHERE official = true;

-- Update some existing profiles as official for demonstration
UPDATE profiles
SET official = true
WHERE id IN (
  SELECT id FROM profiles LIMIT 5
);