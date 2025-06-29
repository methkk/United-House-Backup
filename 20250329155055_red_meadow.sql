/*
  # Add media support to posts table

  1. Changes
    - Add media_type column to posts table
    - Add media_url column to posts table
    - Create storage bucket for post media
    - Add storage policies for post media

  2. Security
    - Enable public access to post media
    - Allow authenticated users to upload media
*/

-- Add media columns to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS media_type text,
ADD COLUMN IF NOT EXISTS media_url text;

-- Create storage bucket for post media
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload post media
CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Allow public access to post media
CREATE POLICY "Post media is publicly accessible"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-media');