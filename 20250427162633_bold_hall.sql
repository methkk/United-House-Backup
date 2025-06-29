/*
  # Add foreign key relationship between projects and profiles

  1. Changes
    - Add foreign key constraint from projects.user_id to profiles.id
    - This enables proper joining between projects and profiles tables

  2. Security
    - No changes to RLS policies needed
*/

-- Add foreign key constraint from projects to profiles
ALTER TABLE projects
ADD CONSTRAINT projects_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id);