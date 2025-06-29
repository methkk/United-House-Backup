/*
  # Add verification status to profiles table

  1. Changes
    - Add verification_status column to profiles table
    - Add check constraint for valid status values
    - Set default value to null

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verification_status text
CHECK (verification_status IN ('pending', 'verified'));