/*
  # Update RLS policies for user creation and document uploads

  1. Changes
    - Add RLS policy to allow new users to create their own profile
    - Add RLS policy to allow users to upload identity verification documents
    - Add RLS policy to allow users to read their own identity verification documents

  2. Security
    - Policies ensure users can only access their own data
    - Storage policies restrict uploads to user-specific paths
*/

-- Enable RLS for identity-verification storage bucket
CREATE POLICY "Users can upload their own identity documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'identity-verification' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own identity documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'identity-verification' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update profiles table policies
CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Ensure the profiles table has RLS enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;