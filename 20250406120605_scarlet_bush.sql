/*
  # Add RLS policies for profiles and storage

  1. Security Changes
    - Add RLS policy for profiles table to allow users to insert their own profile
    - Add storage policies for identity verification documents
    - Configure storage bucket settings

  2. Changes
    - Enables RLS on profiles table
    - Creates storage bucket for identity verification
    - Adds necessary policies for secure file uploads
*/

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own profile
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can create their own profile'
  ) THEN
    CREATE POLICY "Users can create their own profile" 
    ON profiles 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

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

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "User can upload their own verification documents" ON storage.objects;
DROP POLICY IF EXISTS "User can read their own verification documents" ON storage.objects;

-- Create storage policies
CREATE POLICY "User can upload their own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "User can read their own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-verification' AND
  (storage.foldername(name))[1] = auth.uid()::text
);