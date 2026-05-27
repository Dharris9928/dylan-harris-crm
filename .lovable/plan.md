# Plan: Portfolio Demo + Config-Driven CRM

Two independent tracks. **Track 1 (demo) first** — it's faster, lower-risk, and unblocks interviews. Track 2 (productize) is a larger refactor we can start in parallel or after.

---

## Track 1 — Portfolio Demo (priority)

**Goal:** A live, click-through CRM branded as your personal portfolio, with realistic fake data and no Google/Nest/Apollo/customer info anywhere.

### 1.1 Fork & isolate
- Create a **new Lovable project** (Remix this one). The new project gets its own Lovable Cloud backend, so real production data is never touched.
- Publish the demo on a separate domain (e.g. `crm-demo.yourname.com` or the default `*.lovable.app` URL).
- Keep the current production app running untouched.

### 1.2 Strip the proprietary layer
In the forked project only:
- Remove Apollo edge functions (`apollo-*`) and any Apollo UI (Apollo Email Import, Apollo CSV Import, External Contact Search, Apollo enrichment buttons).
- Remove the Gmail/Resend webhook integrations and email-content displays.
- Remove `enrich-company` (Deepseek + Perplexity) — replace with a stub that returns mock enrichment so the UI still demos.
- Remove all hard-coded Google/Nest references: rename "Nest Pro Connector", product catalog (`src/lib/products/productCatalog.ts`), industry types referencing builders/HVAC if you want neutrality (or keep — it's generic enough).
- Delete real edge-function secrets (Apollo key, Resend key, etc.) so nothing leaks if a button is clicked.
- Remove any user emails / domain allowlists tied to real customers; reset to your demo email only.

### 1.3 Rebrand
- App name → "**[Your Name] — Sales CRM**" (or "Sales Intelligence Platform").
- Replace logo, favicon, page title, login screen copy, footer.
- Neutralize the product catalog to generic SKUs ("Product A / B / C") so it's industry-agnostic.
- Add a small "Demo" banner on every page: *"Portfolio demo. All data is fictional."*

### 1.4 Seed realistic fake data
Write one seed script (`scripts/seed-demo-data.ts`) using `@faker-js/faker`:
- ~150 companies across all industries/segments/regions
- ~400 contacts with realistic titles, fake emails (`@example.com`)
- ~80 opportunities across all stages
- ~200 activities (calls, meetings, emails) with timestamps spread over 12 months
- ~50 communications (so the funnel/analytics charts populate)
- ~20 job quotes with line items, a couple with fake PO PDFs
- ~30 building permits
- Lead scores already calculated so dashboards look full
- 2-3 demo user accounts (admin, sales_manager, sales_rep) so interviewers can log in as each role and see RLS/perspective filtering in action

### 1.5 Demo-mode safety rails
- Disable destructive admin actions on the demo (user creation, deletion approvals run but no-op or restore on a cron).
- Optional: nightly cron edge function that resets the database back to the seeded state, so visitors can't ruin it.

### 1.6 Interview-ready extras
- Add a `/demo-guide` page (or README link) that lists:
  - Login credentials for each role
  - A 5-minute walkthrough script ("Try filtering by perspective", "Create an opportunity", "Run AI scoring")
  - Architecture overview + tech stack
- Loom video walkthrough embedded.

**Estimated effort:** 1 focused session for fork + strip + rebrand, 1 session for seed data + demo guide.

---

## Track 2 — Config-Driven Customizable CRM

**Goal:** Same codebase can be re-deployed for any sales org by editing config tables instead of code. One deploy per customer (no multi-tenant complexity).

### 2.1 Extract vertical-specific data into config tables
New tables (all admin-editable via a new **Settings → Tenant Configuration** page):

| Table | Replaces (currently hard-coded in) |
|---|---|
| `tenant_settings` (name, logo_url, primary_color, support_email) | `index.html`, sidebar, auth page |
| `product_catalog` (already partially exists — finish it) | `src/lib/products/productCatalog.ts` |
| `industry_types_config` | enums + `contractorFilteringLogic` memory |
| `segments_config` | `enrich-company/segmentLogic.ts` |
| `regions_config` (state → region mapping) | `src/lib/regions/regionConstants.ts` |
| `pipeline_stages_config` | hard-coded opportunity stages |
| `scoring_weights_config` (already exists as `scoring_configuration`) | builder/contractor scoring algorithms |
| `activity_types_config` | hard-coded activity outcomes |

### 2.2 Refactor code to read from config
- Replace every hard-coded `PRODUCT_CATALOG`, region map, industry enum, stage list with a `useTenantConfig()` hook that loads + caches from the config tables.
- Scoring engine reads weights from `scoring_weights_config` (already does for ranges — extend to all dimensions).
- Migrations rewrite enum columns to `text` + FK to config tables (or keep enums and provide a "Add new type" migration helper).

### 2.3 Make integrations optional/pluggable
- Apollo, Resend, Deepseek, Perplexity become **opt-in connectors**. If the key isn't set, the UI hides the related buttons/sections gracefully instead of erroring.
- Add a Settings → Integrations page where admins toggle each integration and paste their own API key.

### 2.4 White-label onboarding flow
- First-run wizard: tenant name, logo upload, primary color, choose industries/segments/regions, seed starter pipeline stages, create first admin user.
- Saves to `tenant_settings` and config tables — app is usable immediately.

### 2.5 Deployment story
Document a "**Deploy your own**" flow:
1. Remix this Lovable project
2. Enable Lovable Cloud
3. Run the onboarding wizard
4. Optionally add Apollo/Resend keys in Settings → Integrations

**Estimated effort:** 3-5 focused sessions. Largest piece is refactoring scoring + enrichment to be config-aware.

---

## Recommended sequencing

1. **This week:** Track 1 (demo) — interview-ready ASAP.
2. **After demo is live:** Start Track 2 (productize), one config domain at a time (start with `tenant_settings` + branding, then product catalog, then scoring).
3. Do **not** add multi-tenancy (single DB, many customers) — too much rework on RLS and not needed for "one deploy per customer".

---

## What I need from you to start Track 1

- Confirm: spin up the new Lovable project myself (you'll get an email invite), or do you want to Remix it from the Lovable dashboard and then point me at the new project?
- Your name / desired demo branding (so I can update the title, login page, and footer).
- Any features you want **hidden** from the demo (e.g. MFA, deletion approvals) to keep the click-through simple for interviewers?