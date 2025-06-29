/*
  # Add Community Members Table and Update Posts Policies

  1. New Tables
    - `community_members`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `community_id` (uuid, references communities)
      - `joined_at` (timestamp)

  2. Changes
    - Update posts policies to require community membership
    - Update votes policies to require community membership
    - Add trigger to update member count

  3. Security
    - Enable RLS on community_members table
    - Add policies for membership management
*/

-- Create community_members table
CREATE TABLE IF NOT EXISTS community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  community_id uuid REFERENCES communities ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(user_id, community_id)
);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- Policies for community_members
CREATE POLICY "Anyone can view community members"
  ON community_members FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities
    SET member_count = member_count + 1
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities
    SET member_count = member_count - 1
    WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for member count updates
CREATE TRIGGER update_community_member_count
  AFTER INSERT OR DELETE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION update_community_member_count();

-- Update post creation policy to require membership
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
CREATE POLICY "Members can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = posts.community_id
      AND user_id = auth.uid()
    )
  );

-- Update voting policy to require membership
DROP POLICY IF EXISTS "Users can vote" ON votes;
CREATE POLICY "Members can vote"
  ON votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM community_members cm
      JOIN posts p ON p.community_id = cm.community_id
      WHERE p.id = votes.post_id
      AND cm.user_id = auth.uid()
    )
  );