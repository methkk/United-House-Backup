/*
  # Add location data to profiles table

  1. Changes
    - Add columns for storing user location data
    - Add columns for storing verification data
    
  2. Security
    - No additional security needed as existing RLS policies cover new columns
*/

-- Add location columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location_country text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS location_town text,
ADD COLUMN IF NOT EXISTS location_latitude numeric,
ADD COLUMN IF NOT EXISTS location_longitude numeric;