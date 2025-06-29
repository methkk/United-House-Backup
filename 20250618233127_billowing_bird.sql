/*
  # Create identity verification storage bucket

  1. Storage Setup
    - Create 'identity-verification' storage bucket
    - Configure bucket to be private (not public)
    - Set up appropriate RLS policies for document access

  2. Security
    - Only authenticated users can upload to their own folder
    - Only admins can view all documents
    - Users can only access their own documents
*/

-- Create the identity-verification bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'identity-verification',
  'identity-verification',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow admins to view all documents (assuming admin role or specific user check)
-- Note: You may need to adjust this based on your admin identification system
CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.official = true
  )
);

-- Policy: Allow admins to list all folders
CREATE POLICY "Admins can list all folders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.official = true
  )
);

-- Policy: Allow users to update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);