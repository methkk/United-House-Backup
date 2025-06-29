/*
  # Add Comments Feature

  1. New Tables
    - `post_comments`
      - `id` (uuid, primary key)
      - `content` (text)
      - `user_id` (uuid, references auth.users)
      - `post_id` (uuid, references posts)
      - `parent_id` (uuid, self-reference for nested comments)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `score` (integer)

    - `comment_votes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `comment_id` (uuid, references post_comments)
      - `value` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for comment voting
*/

-- Drop existing policies and triggers if they exist
DO $$ 
BEGIN
  -- Drop policies
  DROP POLICY IF EXISTS "Anyone can read comments" ON post_comments;
  DROP POLICY IF EXISTS "Authenticated users can create comments" ON post_comments;
  DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
  DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
  DROP POLICY IF EXISTS "Anyone can view comment votes" ON comment_votes;
  DROP POLICY IF EXISTS "Authenticated users can vote on comments" ON comment_votes;
  DROP POLICY IF EXISTS "Users can update own comment votes" ON comment_votes;
  DROP POLICY IF EXISTS "Users can delete own comment votes" ON comment_votes;
  
  -- Drop triggers
  DROP TRIGGER IF EXISTS update_comment_score ON comment_votes;
  DROP TRIGGER IF EXISTS set_comment_updated_at ON post_comments;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create post_comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  post_id uuid REFERENCES posts ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  score integer DEFAULT 0,
  CONSTRAINT content_length CHECK (char_length(content) >= 1)
);

-- Enable RLS
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for post_comments
CREATE POLICY "Anyone can read comments"
  ON post_comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 
      FROM posts p
      LEFT JOIN community_members cm ON cm.community_id = p.community_id
      WHERE p.id = post_id 
      AND (
        (cm.user_id = auth.uid() AND cm.status != 'blocked')
        OR cm.user_id IS NULL
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create comment_votes table
CREATE TABLE IF NOT EXISTS comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  comment_id uuid REFERENCES post_comments ON DELETE CASCADE NOT NULL,
  value integer NOT NULL CHECK (value = 1 OR value = -1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

-- Enable RLS
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for comment_votes
CREATE POLICY "Anyone can view comment votes"
  ON comment_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can vote on comments"
  ON comment_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comment votes"
  ON comment_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment votes"
  ON comment_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create or replace function to update comment score
CREATE OR REPLACE FUNCTION update_comment_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE post_comments
    SET score = score + NEW.value
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_comments
    SET score = score - OLD.value
    WHERE id = OLD.comment_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE post_comments
    SET score = score - OLD.value + NEW.value
    WHERE id = NEW.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment score updates
CREATE TRIGGER update_comment_score
  AFTER INSERT OR UPDATE OR DELETE ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_score();

-- Create or replace function to set updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_comment_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();