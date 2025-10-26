-- Phase 32 – Auth & Credits schema
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  balance integer DEFAULT 100,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id
  ON public.user_credits(user_id);

COMMENT ON TABLE public.user_profiles IS 'Supabase-auth linked user records';
COMMENT ON TABLE public.user_credits IS 'Credit balances per user';

NOTIFY pgrst, 'reload schema';
