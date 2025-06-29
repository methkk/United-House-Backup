/*
  # Add verification status and policies

  1. Changes
    - Add verification_status column to profiles table
    - Add verification_rejection_reason column to profiles table
    - Add constraint to ensure valid verification status values

  2. Security
    - No changes to RLS policies needed as existing policies cover the new columns
*/

-- Add verification status column with check constraint
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_status text
CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Add column for rejection reason
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS verification_rejection_reason text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status 
ON profiles(verification_status) 
WHERE verification_status IS NOT NULL;