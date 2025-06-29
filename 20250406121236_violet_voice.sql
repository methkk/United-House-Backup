/*
  # Update storage policies to allow access to all verification documents

  1. Changes
    - Drop existing restrictive policies
    - Create new policies allowing access to all documents
    - Maintain upload restrictions for security

  2. Security
    - Users can still only upload to their own folders
    - All authenticated users can view any document
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "User can read their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own verification documents" ON storage.objects;

-- Create new policy allowing access to all verification documents
CREATE POLICY "Users can view all verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'identity-verification');

-- Keep existing upload policy to maintain security
DROP POLICY IF EXISTS "User can upload their own verification documents" ON storage.objects;
CREATE POLICY "User can upload their own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);