
ALTER TABLE public.job_quotes ADD COLUMN IF NOT EXISTS po_file_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-quote-pos', 'job-quote-pos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can view PO files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-quote-pos');

CREATE POLICY "Authenticated users can upload PO files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-quote-pos');

CREATE POLICY "Authenticated users can update PO files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'job-quote-pos');

CREATE POLICY "Authenticated users can delete PO files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-quote-pos');
