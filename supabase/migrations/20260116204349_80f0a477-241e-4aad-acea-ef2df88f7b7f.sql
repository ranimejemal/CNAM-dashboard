-- Update existing document URLs to store only the file path (not full public URLs)
-- This prevents exposure of public URLs and enables proper signed URL generation

UPDATE documents 
SET file_url = split_part(file_url, '/documents/', 2)
WHERE file_url LIKE '%/storage/v1/object/public/documents/%';