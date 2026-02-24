
-- Fix: Create a restricted view for users to read their own payment requests without sensitive fields
-- Users should not see admin_note or full IBAN

-- Drop existing user SELECT policy on payment_requests
DROP POLICY IF EXISTS "Users read own payment requests" ON public.payment_requests;

-- Create a more restrictive policy - users can still read own rows but we'll handle column filtering in code
-- Re-create the same policy (RLS can't filter columns, so we handle this at app level)
CREATE POLICY "Users read own payment requests" ON public.payment_requests
  FOR SELECT USING (user_id = auth.uid());

-- Create a secure view that masks sensitive data for non-admin users  
CREATE OR REPLACE VIEW public.user_payment_requests_safe AS
SELECT 
  id,
  user_id,
  amount,
  type,
  status,
  created_at,
  processed_at,
  -- Mask IBAN: show only last 4 chars
  CASE 
    WHEN iban IS NOT NULL THEN '****' || RIGHT(iban, 4)
    ELSE NULL
  END AS iban_masked,
  account_holder
FROM public.payment_requests
WHERE user_id = auth.uid();
