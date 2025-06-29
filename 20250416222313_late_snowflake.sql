/*
  # Add Project Supporters Feature

  1. New Tables
    - `project_supporters`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `supporter_id` (uuid, references profiles)
      - `status` (text: pending, accepted, rejected)
      - `rejection_reason` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for supporter management
*/

-- Create project_supporters table
CREATE TABLE IF NOT EXISTS project_supporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE NOT NULL,
  supporter_id uuid REFERENCES profiles NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, supporter_id)
);

-- Enable RLS
ALTER TABLE project_supporters ENABLE ROW LEVEL SECURITY;

-- Create policies for project_supporters
CREATE POLICY "Anyone can view project supporters"
  ON project_supporters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Project creators can add supporters"
  ON project_supporters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Official profiles can update their support status"
  ON project_supporters FOR UPDATE
  TO authenticated
  USING (
    -- Must be the supporter and an official profile
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = supporter_id
      AND id = auth.uid()
      AND official = true
    )
  )
  WITH CHECK (
    -- Can only update status and rejection reason
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = supporter_id
      AND id = auth.uid()
      AND official = true
    )
  );