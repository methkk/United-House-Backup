/*
  # Update Identity Verification Storage Configuration
  
  1. Changes
    - Update storage bucket configuration
    - Set proper file size limits and MIME types
    - No policy changes since they already exist
  
  2. Security
    - Maintain existing security settings
    - Update bucket configuration only
*/

-- Configure identity-verification bucket with updated settings
UPDATE storage.buckets 
SET public = false,
    file_size_limit = 10485760, -- 10MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png'],
    avif_autodetection = false
WHERE id = 'identity-verification';