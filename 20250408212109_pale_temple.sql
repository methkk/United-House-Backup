/*
  # Add Projects Feature

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `title` (text)
      - `problem` (text)
      - `solution` (text)
      - `user_id` (uuid, references auth.users)
      - `community_id` (uuid, references communities)
      - `created_at` (timestamp)
      - `score` (integer)
    - `project_votes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `project_id` (uuid, references projects)
      - `value` (integer)
    - `project_replies`
      - `id` (uuid, primary key)
      - `content` (text)
      - `is_solution` (boolean)
      - `user_id` (uuid, references auth.users)
      - `project_id` (uuid, references projects)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  problem text NOT NULL,
  solution text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  community_id uuid REFERENCES communities ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  score integer DEFAULT 0,
  CONSTRAINT title_length CHECK (char_length(title) >= 3),
  CONSTRAINT problem_length CHECK (char_length(problem) >= 10),
  CONSTRAINT solution_length CHECK (char_length(solution) >= 10)
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read projects"
  ON projects FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Project votes table
CREATE TABLE IF NOT EXISTS project_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  value integer NOT NULL CHECK (value = 1 OR value = -1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE project_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view project votes"
  ON project_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can vote on projects"
  ON project_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their project votes"
  ON project_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Project replies table
CREATE TABLE IF NOT EXISTS project_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  is_solution boolean DEFAULT false,
  user_id uuid REFERENCES auth.users NOT NULL,
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT content_length CHECK (char_length(content) >= 1)
);

ALTER TABLE project_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read project replies"
  ON project_replies FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create replies"
  ON project_replies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON project_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);