-- Allow admins to delete bets (needed for user deletion cleanup)
CREATE POLICY "Admins delete bets"
ON public.bets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete transactions
CREATE POLICY "Admins delete transactions"
ON public.transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete payment requests
CREATE POLICY "Admins delete payment requests"
ON public.payment_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete profiles (cascade cleanup)
CREATE POLICY "Admins delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
