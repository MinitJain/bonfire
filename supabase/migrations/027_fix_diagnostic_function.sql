-- Fix diagnostic function (invalid SQL%ROWCOUNT syntax)
CREATE OR REPLACE FUNCTION public.test_pomodoro_insert(
  p_bonfire_id text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result text;
  v_rows integer;
BEGIN
  BEGIN
    INSERT INTO public.pomodoro_logs (bonfire_id, user_id, duration_minutes, pomodoro_number)
    VALUES (p_bonfire_id, NULL, 30, 999);
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_result := 'INSERT succeeded, rows: ' || v_rows;
  EXCEPTION WHEN OTHERS THEN
    v_result := 'INSERT failed: ' || SQLERRM;
  END;
  RETURN v_result;
END;
$$;
