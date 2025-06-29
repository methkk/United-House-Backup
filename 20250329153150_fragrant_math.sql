/*
  # Add avatar_url to profiles table

  1. Changes
    - Add `avatar_url` column to profiles table to store profile picture URLs
    - Add storage bucket for profile pictures

  2. Security
    - Enable storage bucket policies for authenticated users
*/

-- Add avatar_url column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload their own profile picture
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-pictures' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to profile pictures
CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-pictures');