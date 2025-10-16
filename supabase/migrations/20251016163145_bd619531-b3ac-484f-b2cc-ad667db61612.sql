-- Update the notification email function to use extensions schema for pg_net
CREATE OR REPLACE FUNCTION public.send_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  supabase_url text;
  supabase_anon_key text;
BEGIN
  -- Get Supabase configuration
  supabase_url := current_setting('app.supabase_url', true);
  supabase_anon_key := current_setting('app.supabase_anon_key', true);

  -- Only attempt to send if configuration is available
  IF supabase_url IS NOT NULL AND supabase_anon_key IS NOT NULL THEN
    -- Call the edge function asynchronously via pg_net (in extensions schema)
    SELECT extensions.net.http_post(
      url := supabase_url || '/functions/v1/send-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || supabase_anon_key
      ),
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'user_id', NEW.user_id,
        'type', NEW.type,
        'title', NEW.title,
        'message', NEW.message,
        'link_url', NEW.link_url
      )
    ) INTO request_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send notification email: %', SQLERRM;
    RETURN NEW;
END;
$$;
