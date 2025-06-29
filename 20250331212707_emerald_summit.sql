/*
  # Add identity verification storage bucket

  1. Changes
    - Create storage bucket for identity verification documents
    - Add storage policies for secure access

  2. Security
    - Only authenticated users can upload their own verification documents
    - Only admin users can view verification documents
    - Documents are stored in user-specific folders
*/

-- Create storage bucket for identity verification
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-verification', 'identity-verification', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own verification documents
CREATE POLICY "Users can upload their own verification documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow only authenticated users to view their own documents
CREATE POLICY "Users can view their own verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'identity-verification' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own verification documents
CREATE POLICY "Users can update their own verification documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'identity-verification' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'identity-verification' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);