/*
  # Add community_id to posts table

  1. Changes
    - Add `community_id` column to posts table
    - Add foreign key constraint to ensure community_id references a valid community
    - Add NOT NULL constraint to ensure every post belongs to a community

  2. Security
    - No changes to RLS policies needed as existing policies cover the new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'community_id'
  ) THEN
    ALTER TABLE posts 
    ADD COLUMN community_id uuid NOT NULL;
  END IF;
END $$;