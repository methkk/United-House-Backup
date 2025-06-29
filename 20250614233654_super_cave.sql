/*
  # Auto-join community creator as member

  1. Changes
    - Create function to automatically add creator as member when community is created
    - Add trigger to execute this function on community creation
    - Update existing communities to add creators as members

  2. Security
    - Maintain existing RLS policies
    - Ensure creators are always active members
*/

-- Create function to auto-join creator as member
CREATE OR REPLACE FUNCTION auto_join_creator_to_community()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as an active member of the community
  INSERT INTO community_members (user_id, community_id, status)
  VALUES (NEW.creator_id, NEW.id, 'active')
  ON CONFLICT (user_id, community_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-join creator when community is created
CREATE TRIGGER auto_join_creator_trigger
  AFTER INSERT ON communities
  FOR EACH ROW
  EXECUTE FUNCTION auto_join_creator_to_community();

-- Update existing communities to add creators as members if they aren't already
INSERT INTO community_members (user_id, community_id, status)
SELECT c.creator_id, c.id, 'active'
FROM communities c
WHERE NOT EXISTS (
  SELECT 1 FROM community_members cm
  WHERE cm.user_id = c.creator_id AND cm.community_id = c.id
)
ON CONFLICT (user_id, community_id) DO NOTHING;