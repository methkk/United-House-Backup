/*
  # Set up identity verification storage bucket

  1. Storage Setup
    - Creates the 'identity-verification' storage bucket
    - Configures public access policies for authenticated users
    - Sets up RLS policies for secure document access

  2. Security
    - Enables RLS on the bucket
    - Adds policies for:
      - Authenticated users can upload their own verification documents
      - Admin users can read all verification documents
      - Users can only read their own documents
*/

-- Enable storage by creating the extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "storage";

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-verification', 'identity-verification', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for users to upload their own verification documents
CREATE POLICY "Users can upload their own verification documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for users to read their own verification documents
CREATE POLICY "Users can read their own verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for admins to read all verification documents
CREATE POLICY "Admins can read all verification documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE 
      profiles.id = auth.uid() AND
      profiles.official = true
  )
);