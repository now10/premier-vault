

## Fix Build Errors & Complete Legacy Data Upload Setup

The build is failing because the legacy portal migration file exists in the repo but was never applied to the live database. The generated TypeScript types therefore don't know about `legacy_user_codes`, `legacy_data_uploads`, or the new `profiles` columns.

### What I'll do (once you approve and I switch to default mode)

**1. Apply the legacy portal database migration**

Run the pending migration to create:
- `legacy_user_codes` table — stores `(portal_username, code, account_balance, active)` rows
- `legacy_data_uploads` table — audit log of every migration attempt with `status`, `error_message`, `completed_at`, `uploaded_balance`, `transaction_count`
- New columns on `profiles`: `portal_username`, `legacy_data_uploaded`, `legacy_upload_date`
- RLS policies so users can only read/write their own upload records, and only read active legacy codes during verification
- Seed the test record: `User00571J1` / code `USER00571J1` / balance €374,105,567.00

Once applied, Supabase regenerates `src/integrations/supabase/types.ts` automatically and all 13 TypeScript errors disappear with no code edits needed.

**2. Verify the build passes** and the Settings page "Upload Old Logged Data From Previous Portal" button works end-to-end.

---

### About the User Code — how users get it

The User Code is a **pre-issued credential** that you (the admin) hand out to each legacy user. It is NOT self-service. The flow is:

1. **You generate/assign codes in the database.** Each legacy user gets one row in `legacy_user_codes`:
   - `portal_username` — their old portal login (e.g. `User00571J1`)
   - `code` — the secret code they must enter (e.g. `USER00571J1`)
   - `account_balance` — the legacy balance to credit on migration
   - `active = true`

2. **You distribute the code to the user out-of-band** — email, secure message, support ticket, etc. The user then types both values into the upload modal in Settings.

3. **One-time use** — after a successful upload, `profiles.legacy_data_uploaded` flips to `true` and the Settings button is disabled, preventing double-credits.

**Recommended ways for you to issue codes after the migration runs:**
- **Option A (manual, simplest):** I can build a small Admin page section under `/admin` where you paste a CSV (username, code, balance) and it bulk-inserts rows into `legacy_user_codes`.
- **Option B (already seeded):** The test record `User00571J1 / USER00571J1` is pre-loaded so `monica.bulleri@gmail.com` (or any signed-up user) can test immediately.
- **Option C (auto-generate):** I can add an admin button "Generate code for legacy user" that creates a random 12-char code and returns it for you to email.

After approving this plan, tell me which option (A, B, or C) you want for distributing codes and I'll include it in the implementation.

### Technical summary

- Apply migration: `20260423_add_legacy_portal_migration.sql`
- No code changes to `src/lib/api.ts` needed — types regenerate automatically
- No changes to `Settings.tsx` or `UploadLegacyDataModal.tsx` — they're already wired correctly
- Optionally add admin UI for code issuance (pending your choice A/B/C)

