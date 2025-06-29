/*
  # Separate Post and Project Comments

  1. New Tables
    - `project_comments`
      - `id` (uuid, primary key)
      - `content` (text)
      - `user_id` (uuid, references auth.users)
      - `project_id` (uuid, references projects)
      - `parent_id` (uuid, self-reference)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `score` (integer)

  2. Changes
    - Remove project_id from post_comments
    - Remove entity check constraint
    - Create project_comment_votes table
    - Add appropriate triggers and policies

  3. Security
    - Enable RLS on new tables
    - Mirror existing comment policies
*/

-- First, migrate any project comments to the new table
CREATE TABLE IF NOT EXISTS project_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES project_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  score integer DEFAULT 0,
  CONSTRAINT content_length CHECK (char_length(content) >= 1)
);

-- Enable RLS
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

-- Create project_comment_votes table
CREATE TABLE IF NOT EXISTS project_comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  comment_id uuid REFERENCES project_comments ON DELETE CASCADE NOT NULL,
  value integer NOT NULL CHECK (value = 1 OR value = -1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

-- Enable RLS
ALTER TABLE project_comment_votes ENABLE ROW LEVEL SECURITY;

-- Migrate existing project comments
INSERT INTO project_comments (id, content, user_id, project_id, parent_id, created_at, updated_at, score)
SELECT 
  pc.id,
  pc.content,
  pc.user_id,
  pc.project_id,
  pc.parent_id,
  pc.created_at,
  pc.updated_at,
  pc.score
FROM post_comments pc
WHERE pc.project_id IS NOT NULL;

-- Migrate existing votes for project comments
INSERT INTO project_comment_votes (user_id, comment_id, value, created_at)
SELECT 
  cv.user_id,
  cv.comment_id,
  cv.value,
  cv.created_at
FROM comment_votes cv
JOIN post_comments pc ON pc.id = cv.comment_id
WHERE pc.project_id IS NOT NULL;

-- Remove project comments and their votes from original tables
DELETE FROM comment_votes cv
USING post_comments pc
WHERE cv.comment_id = pc.id AND pc.project_id IS NOT NULL;

DELETE FROM post_comments
WHERE project_id IS NOT NULL;

-- Remove project_id column and constraint from post_comments
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_entity_check;
ALTER TABLE post_comments DROP COLUMN IF EXISTS project_id;

-- Add foreign key to profiles for project comments
ALTER TABLE project_comments
ADD CONSTRAINT project_comments_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id);

-- Create function to update project comment score
CREATE OR REPLACE FUNCTION update_project_comment_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE project_comments
    SET score = score + NEW.value
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE project_comments
    SET score = score - OLD.value
    WHERE id = OLD.comment_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE project_comments
    SET score = score - OLD.value + NEW.value
    WHERE id = NEW.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for project comment score updates
CREATE TRIGGER update_project_comment_score
  AFTER INSERT OR UPDATE OR DELETE ON project_comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_comment_score();

-- Create trigger for project comment updated_at
CREATE TRIGGER set_project_comment_updated_at
  BEFORE UPDATE ON project_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create policies for project comments
CREATE POLICY "Anyone can read project comments"
  ON project_comments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create project comments"
  ON project_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project comments"
  ON project_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project comments"
  ON project_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for project comment votes
CREATE POLICY "Anyone can view project comment votes"
  ON project_comment_votes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can vote on project comments"
  ON project_comment_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project comment votes"
  ON project_comment_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project comment votes"
  ON project_comment_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);