-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_notify_referrer_on_status_change ON public.referrals;
DROP FUNCTION IF EXISTS public.notify_referrer_on_status_change();

-- Create updated function that sends both in-app notification AND calls edge function for email
CREATE OR REPLACE FUNCTION public.notify_referrer_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  referrer_name TEXT;
  referred_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
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
        'referred_user_name', referred_name,
        'send_email', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_referrer_on_status_change
  AFTER UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_referrer_on_status_change();