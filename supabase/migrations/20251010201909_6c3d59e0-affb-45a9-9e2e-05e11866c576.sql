-- Remove gmail.com from allowed domains since dharris9928@gmail.com exception is handled in signup logic
DELETE FROM public.allowed_email_domains 
WHERE domain = 'gmail.com';