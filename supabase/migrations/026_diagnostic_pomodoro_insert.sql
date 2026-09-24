-- Diagnostic: test pomodoro_logs insert from SECURITY DEFINER context
-- This helps identify if the INSERT is failing silently.

CREATE OR REPLACE FUNCTION public.test_pomodoro_insert(
  p_bonfire_id text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result text;
BEGIN
  BEGIN
    INSERT INTO public.pomodoro_logs (bonfire_id, user_id, duration_minutes, pomodoro_number)
    VALUES (p_bonfire_id, NULL, 30, 999);
    v_result := 'INSERT succeeded, rows: ' || SQL%ROWCOUNT;
  EXCEPTION WHEN OTHERS THEN
    v_result := 'INSERT failed: ' || SQLERRM;
  END;
  RETURN v_result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.test_pomodoro_insert TO anon, authenticated;
