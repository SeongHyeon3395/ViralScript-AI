CREATE TABLE IF NOT EXISTS public.generation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES public.user_generation_history(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  would_use_again BOOLEAN NOT NULL,
  comment TEXT NOT NULL CHECK (char_length(btrim(comment)) >= 30),
  credits_awarded INTEGER NOT NULL DEFAULT 8 CHECK (credits_awarded = 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, generation_id)
);

CREATE OR REPLACE FUNCTION public.submit_generation_feedback(
  p_user_id UUID, p_generation_id UUID, p_rating SMALLINT,
  p_would_use_again BOOLEAN, p_comment TEXT
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_credits INTEGER;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 OR char_length(btrim(coalesce(p_comment, ''))) < 30 THEN
    RAISE EXCEPTION 'INVALID_FEEDBACK';
  END IF;
  PERFORM 1 FROM public.user_generation_history WHERE id = p_generation_id AND user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GENERATION_NOT_FOUND'; END IF;
  INSERT INTO public.generation_feedback (user_id, generation_id, rating, would_use_again, comment)
  VALUES (p_user_id, p_generation_id, p_rating, p_would_use_again, btrim(p_comment));
  UPDATE public.profiles SET credits_remaining = credits_remaining + 8, updated_at = now() WHERE id = p_user_id
  RETURNING credits_remaining INTO v_credits;
  RETURN v_credits;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'FEEDBACK_ALREADY_SUBMITTED';
END;
$$;
REVOKE ALL ON FUNCTION public.submit_generation_feedback(UUID, UUID, SMALLINT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_generation_feedback(UUID, UUID, SMALLINT, BOOLEAN, TEXT) TO service_role;
