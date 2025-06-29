/*
  # Add location fields to profiles table

  1. Changes
    - Add location fields to profiles table if they don't exist
    - Add indexes for location-based queries

  2. Security
    - No changes to RLS policies needed as existing policies cover the new columns
*/

-- Add location fields if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location_country text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_town text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_location_country ON profiles(location_country);
CREATE INDEX IF NOT EXISTS idx_profiles_location_city ON profiles(location_city);
CREATE INDEX IF NOT EXISTS idx_profiles_location_town ON profiles(location_town);