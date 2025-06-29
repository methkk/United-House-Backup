/*
  # Add foreign key relationship between post_comments and profiles

  1. Changes
    - Add foreign key constraint from post_comments.user_id to profiles.id
    - This enables direct joins between comments and profiles

  2. Security
    - No changes to RLS policies needed
*/

-- Add foreign key constraint from post_comments to profiles
ALTER TABLE post_comments
ADD CONSTRAINT post_comments_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id);