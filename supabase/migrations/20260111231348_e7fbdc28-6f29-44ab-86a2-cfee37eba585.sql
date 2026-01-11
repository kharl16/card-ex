-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the function to call the edge function via pg_net for email notifications
CREATE OR REPLACE FUNCTION public.notify_referrer_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  referrer_name TEXT;
  referred_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get referrer name
    SELECT full_name INTO referrer_name FROM public.profiles WHERE id = NEW.referrer_user_id;
    -- Get referred user name
    SELECT full_name INTO referred_name FROM public.profiles WHERE id = NEW.referred_user_id;
    
    -- Determine notification based on new status
    IF NEW.status = 'qualified' THEN
      notification_title := 'Referral Qualified! 🎉';
      notification_message := COALESCE(referred_name, 'Your referral') || ' has qualified! Your commission is being processed.';
    ELSIF NEW.status = 'paid_out' THEN
      notification_title := 'Commission Paid Out! 💰';
      notification_message := 'Your commission for referring ' || COALESCE(referred_name, 'a user') || ' has been paid out.';
    ELSE
      -- Don't notify for other status changes
      RETURN NEW;
    END IF;
    
    -- Insert in-app notification for the referrer
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.referrer_user_id,
      'referral_status_change',
      notification_title,
      notification_message,
      jsonb_build_object(
        'referral_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'referred_user_id', NEW.referred_user_id,
        'referred_user_name', referred_name
      )
    );
    
    -- Call edge function to send email notification via pg_net
    -- Get the Supabase URL from environment (this is set automatically)
    supabase_url := current_setting('supabase.project_ref', true);
    
    PERFORM extensions.http_post(
      url := 'https://lorowpouhpjjxembvwyi.supabase.co/functions/v1/send-referral-notification',
      body := jsonb_build_object(
        'referrer_user_id', NEW.referrer_user_id::text,
        'referred_user_name', COALESCE(referred_name, 'Unknown'),
        'old_status', OLD.status,
        'new_status', NEW.status
      )::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;