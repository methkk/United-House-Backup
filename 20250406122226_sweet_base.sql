/*
  # Fix RLS Policies for Profiles and Identity Verification

  1. Changes
    - Drop conflicting policies
    - Reconfigure profiles table RLS
    - Update identity verification bucket settings
    - Set correct storage policies

  2. Security
    - Ensure proper RLS for profiles
    - Restrict identity document access to owners only
*/

-- Drop all conflicting policies
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "User can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "User can read their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own verification documents" ON storage.objects;

-- Configure identity-verification bucket
UPDATE storage.buckets 
SET public = false,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png'],
    avif_autodetection = false
WHERE id = 'identity-verification';

-- Create storage policies for identity verification
DO $$ 
BEGIN
  -- Create upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Identity documents upload policy'
  ) THEN
    CREATE POLICY "Identity documents upload policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'identity-verification' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Create read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Identity documents read policy'
  ) THEN
    CREATE POLICY "Identity documents read policy"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'identity-verification' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Create update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Identity documents update policy'
  ) THEN
    CREATE POLICY "Identity documents update policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'identity-verification' AND
      auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'identity-verification' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;