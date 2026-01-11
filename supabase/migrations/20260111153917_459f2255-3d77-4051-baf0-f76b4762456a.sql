-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Create function to notify referrer on status change
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
    
    -- Insert notification for the referrer
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
        'referred_user_id', NEW.referred_user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on referrals table
CREATE TRIGGER trigger_notify_referrer_on_status_change
AFTER UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.notify_referrer_on_status_change();