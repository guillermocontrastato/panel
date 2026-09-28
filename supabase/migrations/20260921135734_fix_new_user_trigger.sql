/*
# Fix handle_new_user trigger function

The trigger that auto-creates a profile on signup was failing with
"Database error saving new user" because it lacked a secure search_path
and the SECURITY DEFINER function could fail in certain RLS contexts.

## Changes
- Recreate handle_new_user with explicit search_path
- Ensure it runs as SECURITY DEFINER with bypass RLS
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'operador')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();