
-- Add new columns to registration_requests for verification workflow
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS cnam_number text,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS organization_type text,
  ADD COLUMN IF NOT EXISTS license_number text;

-- Create storage bucket for registration verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('registration-documents', 'registration-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload to registration-documents (for public registration)
CREATE POLICY "Anyone can upload registration documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'registration-documents');

-- Only admins can view registration documents
CREATE POLICY "Admins can view registration documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'registration-documents' AND (public.is_admin()));

-- Only admins can delete registration documents
CREATE POLICY "Admins can delete registration documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'registration-documents' AND public.is_admin());
