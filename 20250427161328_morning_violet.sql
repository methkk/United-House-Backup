/*
  # Fix Project Supporters Migration

  1. Changes
    - Drop existing policies before recreating them
    - Ensure table and policies are created only if they don't exist
    - Maintain same functionality as before

  2. Security
    - Same RLS policies as before
    - Only drop policies if they exist
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view project supporters" ON project_supporters;
  DROP POLICY IF EXISTS "Project creators can add supporters" ON project_supporters;
  DROP POLICY IF EXISTS "Official profiles can update their support status" ON project_supporters;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create project_supporters table if it doesn't exist
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