/*
  # Update verification status options and add rejection reason

  1. Changes
    - Add 'rejected' as a valid verification status
    - Add rejection_reason column for admin feedback
    - Update existing check constraint

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing verification_status column and its constraint
ALTER TABLE profiles DROP COLUMN IF EXISTS verification_status;

-- Add new verification_status column with updated check constraint
ALTER TABLE profiles 
ADD COLUMN verification_status text
CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Add column for rejection reason
ALTER TABLE profiles
ADD COLUMN verification_rejection_reason text;