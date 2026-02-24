
-- Fix SECURITY DEFINER view by setting it to SECURITY INVOKER
ALTER VIEW public.user_payment_requests_safe SET (security_invoker = on);
