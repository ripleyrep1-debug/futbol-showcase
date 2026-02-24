
-- Atomic bet placement function
CREATE OR REPLACE FUNCTION public.place_bet(
  p_selections jsonb,
  p_stake numeric,
  p_total_odds numeric,
  p_potential_win numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_bet_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the profile row to prevent race conditions
  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Insert the bet
  INSERT INTO public.bets (user_id, selections, stake, total_odds, potential_win, status)
  VALUES (v_user_id, p_selections, p_stake, p_total_odds, p_potential_win, 'pending')
  RETURNING id INTO v_bet_id;

  -- Deduct balance
  UPDATE public.profiles
  SET balance = balance - p_stake
  WHERE id = v_user_id;

  -- Create transaction record
  INSERT INTO public.transactions (user_id, amount, type, description)
  VALUES (v_user_id, -p_stake, 'bet', 'Bahis kuponu: ' || v_bet_id::text);

  RETURN v_bet_id;
END;
$$;
