ALTER TABLE public.impersonation_sessions ADD COLUMN IF NOT EXISTS session_token_hash text;
ALTER TABLE public.impersonation_sessions DROP COLUMN IF EXISTS session_token;
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_token_hash ON public.impersonation_sessions(session_token_hash);
COMMENT ON COLUMN public.impersonation_sessions.session_token_hash IS 'SHA-256 hash of the session token. Plaintext token is returned to the caller once and never stored.';