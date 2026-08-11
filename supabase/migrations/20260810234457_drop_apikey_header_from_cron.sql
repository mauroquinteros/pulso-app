-- Re-schedules refresh-stocks without the `apikey` header.
--
-- The original schedule sent two headers because it was not known whether the
-- platform gateway still validates `apikey` once a function is deployed with
-- verify_jwt off. Sending both made the answer unnecessary. It is now known, and
-- it is no: a request carrying NO headers at all reached the function and was
-- turned away by the function's own check, returning 401 {"error":"unauthorized"}
-- with x-served-by: supabase-edge-runtime in the response. The gateway does not
-- gate this endpoint, so `apikey` was doing no work.
--
-- Dropping it removes the project secret key from the database entirely, and with
-- it one Vault secret that has to exist and be spelled correctly before a run can
-- succeed. `x-cron-key` remains, and is now visibly the only thing standing
-- between the public URL and the Finnhub quota.
--
-- cron.schedule replaces the job of the same name, so this supersedes the
-- schedule created in 20260808021728 rather than adding a second one. The
-- schedule itself is unchanged.
--
-- Still required, unchanged: the pg_cron and pg_net extensions, and two Vault
-- secrets --
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the CRON_KEY function secret>', 'cron_key');
-- `project_secret_key` is no longer read and can be dropped if it exists.

select cron.schedule(
  'refresh-stocks',
  '*/10 13-21 * * 1-5',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/refresh-stocks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-key',   (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')
    ),
    -- Governs only how long pg_net waits to RECORD the response. The function
    -- keeps running either way -- but a response that times out means
    -- net._http_response tells you nothing, and the function's own logs become
    -- the only account of what happened.
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
