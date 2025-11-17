-- Fix analytics_daily security issue: Remove user write access
-- Analytics should only be written by edge functions using service role
-- This prevents any user manipulation of analytics data

-- Drop the broken policies with 'OR true' that allow anyone to write
DROP POLICY IF EXISTS "Card owners can insert analytics" ON public.analytics_daily;
DROP POLICY IF EXISTS "Card owners can update analytics" ON public.analytics_daily;

-- The SELECT policy remains intact for card owners to view their analytics
-- Only service role (edge functions) can INSERT/UPDATE analytics_daily