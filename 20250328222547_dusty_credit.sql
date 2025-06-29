/*
  # Add communities table and fix relationships

  1. New Tables
    - `communities`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
      - `member_count` (integer)

  2. Changes
    - Insert initial communities data
    - Add foreign key constraint to posts.community_id
    - Add RLS policies for communities table

  3. Security
    - Enable RLS on communities table
    - Add policies for public read access
*/

-- Create communities table
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  member_count integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Communities are viewable by everyone"
  ON communities FOR SELECT
  TO public
  USING (true);

-- Insert initial communities
INSERT INTO communities (id, name, member_count) VALUES
  ('123e4567-e89b-12d3-a456-426614174000', 'Technology', 2500000),
  ('123e4567-e89b-12d3-a456-426614174001', 'Gaming', 1800000),
  ('123e4567-e89b-12d3-a456-426614174002', 'Science', 1200000),
  ('123e4567-e89b-12d3-a456-426614174003', 'Politics', 900000),
  ('123e4567-e89b-12d3-a456-426614174004', 'Education', 750000)
ON CONFLICT (id) DO NOTHING;

-- Update existing posts to have a valid community_id
UPDATE posts 
SET community_id = '123e4567-e89b-12d3-a456-426614174000'
WHERE community_id IS NULL;

-- Add foreign key to posts table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'posts_community_id_fkey'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_community_id_fkey
      FOREIGN KEY (community_id)
      REFERENCES communities (id)
      ON DELETE CASCADE;
  END IF;
END $$;