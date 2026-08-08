-- Schedules the price refresh described in
-- docs/adr/0008-prices-arrive-by-cron-not-by-request.md.
--
-- THREE THINGS MUST ALREADY EXIST WHEN THIS RUNS. None of them can live in this
-- file: two are database settings, and the third is secret.
--
--   1. The `pg_cron` and `pg_net` extensions, enabled from Database > Extensions.
--   2. The refresh-stocks Edge Function, deployed with JWT verification OFF
--      (config.toml sets `verify_jwt = false` for it).
--   3. Three Vault secrets, created once from the SQL editor:
--
--        select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--        select vault.create_secret('<sb_secret_...>', 'project_secret_key');
--        select vault.create_secret('<openssl rand -hex 32>', 'cron_key');
--
--      They are read at execution time rather than written into the schedule
--      below, because cron.schedule stores its command as PLAIN TEXT in the
--      cron.job table, which is queryable.
--
--      `cron_key` is a DEDICATED random string -- not a Supabase key -- that
--      proves "the cron sent this", and its value must match the function's
--      CRON_KEY secret. It is deliberately not the project key: this header only
--      needs to prove provenance, and if it ever leaks through a log or a copied
--      snippet, a random token costs one rotation while the project key would
--      cost everything it can reach.
--
-- Why verification is off at the platform and on inside the function: Pulso uses
-- the new API keys (sb_publishable_... / sb_secret_...), and those are NOT JWTs --
-- Edge Function verify_jwt only understands the legacy anon/service_role JWTs.
-- With verification off the platform no longer gates the endpoint, so the function
-- does its own check of the caller. Both halves are required: turning verification
-- off WITHOUT the in-function check leaves the endpoint open to anyone who learns
-- the URL, which means anyone can burn the Finnhub quota at will.

-- Every 10 minutes, 13:00-21:59 UTC, Monday-Friday.
--
--   */10   13-21   *   *   1-5
--    |       |     |   |    +-- day of week: 1-5 = Mon-Fri (0 and 7 are Sunday)
--    |       |     |   +------ month: every
--    |       |     +---------- day of month: every
--    |       +---------------- hour, UTC
--    +------------------------ minute: every 10th
--
-- The window is the UNION of the two UTC windows the US session occupies, because
-- cron runs on UTC and New York observes DST:
--   summer (EDT, UTC-4)  09:30-16:00 ET  =  13:30-20:00 UTC
--   winter (EST, UTC-5)  09:30-16:00 ET  =  14:30-21:00 UTC
-- A tighter window would have to be adjusted twice a year, and would fail
-- silently -- quietly ceasing to update an hour before the close each November.
-- The runs that land outside the session cost nothing: Finnhub returns the same
-- price and the same market moment, and the row is rewritten identically.

select cron.schedule(
  'refresh-stocks',
  '*/10 13-21 * * 1-5',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/refresh-stocks',
    -- Two headers, two different jobs. `apikey` carries the project key so the
    -- request satisfies whatever check the platform gateway still applies with
    -- verify_jwt off; `x-cron-key` carries the dedicated token the function itself
    -- checks. Sending both means the call works regardless of how much gating the
    -- gateway does on its own -- which is worth not having to guess about.
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey',      (select decrypted_secret from vault.decrypted_secrets where name = 'project_secret_key'),
      'x-cron-key',  (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')
    ),
    -- The function paces its Finnhub calls about a second apart, so a run takes
    -- roughly one second per Stock. This timeout governs only how long pg_net
    -- waits to RECORD the response -- the function keeps running either way -- but
    -- a response that times out means net._http_response tells you nothing, and
    -- the function's own logs become the only account of what happened.
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);

-- Useful afterwards
--   select * from cron.job;                                    -- is it scheduled
--   select * from cron.job_run_details order by start_time desc limit 20;
--   select * from net._http_response order by created desc limit 20;
--   select cron.unschedule('refresh-stocks');                  -- remove it
