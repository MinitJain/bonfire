create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_initiator_token()
returns text
language plpgsql
as $$
begin
  return encode(extensions.gen_random_bytes(16), 'hex');
end;
$$;