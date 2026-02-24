
-- Create a secure function to check if a username is taken
CREATE OR REPLACE FUNCTION public.is_username_taken(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE LOWER(display_name) = LOWER(p_username)
  )
$$;

-- Allow anonymous users to call this function
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_taken(text) TO authenticated;
