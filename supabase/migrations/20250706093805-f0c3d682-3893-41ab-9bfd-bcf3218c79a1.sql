-- Update cleanup function to handle PDF conversation retention (15 days)
CREATE OR REPLACE FUNCTION public.cleanup_pdf_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete PDF-related document interactions older than 15 days
  DELETE FROM public.document_interactions WHERE created_at < NOW() - INTERVAL '15 days';
  
  -- Keep general user history for 30 days (non-PDF conversations)
  DELETE FROM public.user_history 
  WHERE created_at < NOW() - INTERVAL '30 days' 
  AND (intent != 'document_processing' OR intent IS NULL);
END;
$function$;

-- Create scheduled cleanup trigger (this would need to be called periodically)
-- For now, we'll just have the function available to be called