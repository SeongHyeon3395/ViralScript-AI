CREATE UNIQUE INDEX IF NOT EXISTS generation_feedback_one_per_user_idx
  ON public.generation_feedback (user_id);

CREATE OR REPLACE FUNCTION public.submit_generation_feedback(
  p_user_id UUID, p_generation_id UUID, p_rating SMALLINT,
  p_would_use_again BOOLEAN, p_comment TEXT
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_credits INTEGER; v_first_generation UUID;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 OR char_length(btrim(coalesce(p_comment, ''))) < 30 THEN
    RAISE EXCEPTION 'INVALID_FEEDBACK';
  END IF;
  SELECT id INTO v_first_generation FROM public.user_generation_history
    WHERE user_id = p_user_id ORDER BY created_at ASC, id ASC LIMIT 1;
  IF v_first_generation IS NULL OR p_generation_id <> v_first_generation THEN
    RAISE EXCEPTION 'FIRST_GENERATION_REQUIRED';
  END IF;
  INSERT INTO public.generation_feedback (user_id, generation_id, rating, would_use_again, comment)
  VALUES (p_user_id, p_generation_id, p_rating, p_would_use_again, btrim(p_comment));
  UPDATE public.profiles SET credits_remaining = credits_remaining + 8, updated_at = now() WHERE id = p_user_id
  RETURNING credits_remaining INTO v_credits;
  RETURN v_credits;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'FEEDBACK_ALREADY_SUBMITTED';
END;
$$;
