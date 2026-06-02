# Syncing updates from prod (nestpro-connector)

This repo (dylan-harris-crm) is the sanitized demo. It pulls UI/logic updates
from the prod CRM repo on demand, while keeping its own backend untouched.

## Trigger a sync

1. GitHub → this repo → Actions tab
2. Select "Sync from prod" → Run workflow → branch main → Run
3. Wait for the job to finish. It opens a PR titled "Sync from prod YYYY-MM-DD".
4. Review the PR diff. Merge when happy.

Lovable's GitHub bi-directional sync will pick up the merge and update the
demo project automatically.

## Protected files (never overwritten from prod)

See `.github/sync-exclude.txt`:

- `.env` — demo's Supabase URL / publishable key
- `src/integrations/supabase/client.ts` — auto-generated per project
- `src/integrations/supabase/types.ts` — auto-generated per project
- `supabase/config.toml` — demo's project_id
- `supabase/migrations/` — schema changes applied to demo manually

## Post-merge checklist

- [ ] New migrations in prod since last sync? Apply the SQL to the demo backend manually.
- [ ] New edge functions? Add any required secrets in the demo Lovable Cloud settings.
- [ ] New VITE_* env vars referenced in frontend code? Add them to the demo .env via Lovable Cloud.
- [ ] New tables? Confirm RLS + GRANTs exist on the demo DB.
- [ ] Smoke-test the demo app: login, dashboard, a couple of pages.

## One-time setup

A repo secret named `PROD_REPO_TOKEN` must exist (Settings → Secrets and
variables → Actions). It's a GitHub PAT with read access on
`Dharris9928/nestpro-connector` (Contents: read, Metadata: read).