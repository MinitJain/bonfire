-- Character customization: what a signed-in person picked for their figure
-- around the fire. Guests keep theirs in the browser instead.
--
-- The client writes it through the existing "Users can update own profile"
-- policy (auth.uid() = id). The check constraint is the trust boundary: only
-- the known options and palette indices can be stored, so a profile can never
-- carry arbitrary JSON to the other people at a fire.

alter table public.profiles
  add column if not exists character jsonb;

-- Re-runnable: replaces the check if an earlier manual run already added it
alter table public.profiles
  drop constraint if exists profiles_character_valid;

alter table public.profiles
  add constraint profiles_character_valid check (
    character is null or (
      jsonb_typeof(character) = 'object'
      -- exactly these keys: all present, nothing else
      and character ?& array['build', 'skin', 'hairStyle', 'hairColor', 'outfit', 'outfitColor', 'accessory']
      and character - array['build', 'skin', 'hairStyle', 'hairColor', 'outfit', 'outfitColor', 'accessory'] = '{}'::jsonb
      and character->>'build' in ('neutral', 'feminine', 'masculine')
      and character->>'hairStyle' in ('short', 'long', 'bun', 'buzz', 'beanie')
      and character->>'outfit' in ('sweater', 'hoodie', 'jacket')
      and character->>'accessory' in ('none', 'scarf', 'headphones', 'glasses')
      and jsonb_typeof(character->'skin') = 'number'
      and jsonb_typeof(character->'hairColor') = 'number'
      and jsonb_typeof(character->'outfitColor') = 'number'
      and (character->>'skin')::numeric in (0, 1, 2, 3, 4, 5)
      and (character->>'hairColor')::numeric in (0, 1, 2, 3, 4, 5)
      and (character->>'outfitColor')::numeric in (0, 1, 2, 3, 4, 5, 6, 7)
    )
  );
