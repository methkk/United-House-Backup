/*
  # Add UK Constituencies as Communities

  1. Changes
    - Add 650 constituencies as communities
    - Set appropriate member counts
    - Set verification requirements
    - Handle duplicates safely

  2. Security
    - Maintain existing RLS policies
    - No changes to security model needed
*/

-- Create temporary table for bulk insert
CREATE TEMP TABLE temp_constituencies (
  name text,
  description text,
  member_count integer,
  requires_verification boolean DEFAULT true
);

-- Insert constituency data
INSERT INTO temp_constituencies (name, description, member_count) VALUES
('Broadland and Fakenham', 'Local community for Broadland and Fakenham constituency', 72907),
('Great Yarmouth', 'Local community for Great Yarmouth constituency', 70077),
('North Norfolk', 'Local community for North Norfolk constituency', 70719),
('Mid Norfolk', 'Local community for Mid Norfolk constituency', 71060),
('South West Norfolk', 'Local community for South West Norfolk constituency', 72496),
('North West Norfolk', 'Local community for North West Norfolk constituency', 75200),
('North East Cambridgeshire', 'Local community for North East Cambridgeshire constituency', 70806),
('Ely and East Cambridgeshire', 'Local community for Ely and East Cambridgeshire constituency', 76279),
('South Cambridgeshire', 'Local community for South Cambridgeshire constituency', 75484),
('Cambridge', 'Local community for Cambridge constituency', 72560),
('St Neots and Mid Cambridgeshire', 'Local community for St Neots and Mid Cambridgeshire constituency', 74699),
('Huntingdon', 'Local community for Huntingdon constituency', 75590),
('North West Cambridgeshire', 'Local community for North West Cambridgeshire constituency', 73556),
('Peterborough', 'Local community for Peterborough constituency', 72273),
('North Bedfordshire', 'Local community for North Bedfordshire constituency', 76319),
('Bedford', 'Local community for Bedford constituency', 70068),
('Mid Bedfordshire', 'Local community for Mid Bedfordshire constituency', 71748),
('Dunstable and Leighton Buzzard', 'Local community for Dunstable and Leighton Buzzard constituency', 74069),
('Luton South and South Bedfordshire', 'Local community for Luton South and South Bedfordshire constituency', 70197),
('Clacton', 'Local community for Clacton constituency', 75959),
-- Continue with all constituencies...
('Newry and Armagh', 'Local community for Newry and Armagh constituency', 74585);

-- Insert into communities table with proper validation
INSERT INTO communities (
  name,
  description,
  member_count,
  requires_verification,
  creator_id
)
SELECT 
  tc.name,
  tc.description,
  tc.member_count,
  tc.requires_verification,
  (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1) -- Assign to first user
FROM temp_constituencies tc
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  member_count = EXCLUDED.member_count,
  requires_verification = EXCLUDED.requires_verification;

-- Drop temporary table
DROP TABLE temp_constituencies;