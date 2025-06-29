/*
  # Fix RLS Policies for Profiles and Identity Verification

  1. Changes
    - Consolidate and fix RLS policies for profiles table
    - Set up identity verification storage bucket with correct permissions
    - Ensure proper file upload permissions for authenticated users

  2. Security
    - Enable RLS on profiles table
    - Configure storage bucket with size and type restrictions
    - Set up proper policies for document upload and access
*/

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "User can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "User can read their own verification documents" ON storage.objects;

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Create identity-verification storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-verification', 'identity-verification', false)
ON CONFLICT (id) DO NOTHING;

-- Configure storage bucket settings
UPDATE storage.buckets 
SET public = false,
    avif_autodetection = false,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png']
WHERE id = 'identity-verification';

-- Create storage policies for identity verification documents
CREATE POLICY "User can upload their own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "User can read their own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);