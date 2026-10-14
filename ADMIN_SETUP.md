# Israfil Electrical Works — Admin Panel Preview Setup

This bundle is prepared for a **separate development/preview branch only**. Do not copy changes directly to `main` or deploy to production without explicit approval.

## Contents
- `admin.html`, `admin.js`, `admin-config.js`: responsive single-admin dashboard UI and public Supabase login config placeholders.
- `api/admin.js`: authenticated CRUD for products, services, locations, banners, settings and enquiry status/notes.
- `api/admin-upload.js`: restricted image upload endpoint.
- `api/public-content.js`: server-backed published content endpoint.
- `public-content.js`: optional public-site renderer; add its script tag to `index.html` on the preview branch only.
- `api/submit-enquiry.js`: validate and save public enquiries; optionally forward to Google Sheets.
- `api/_lib/admin.js`: shared server-side authentication and database helper.
- `supabase/schema.sql`: initial database schema and RLS setup.
- `docs/GOOGLE_SHEETS_APPS_SCRIPT.js`: optional Google Sheets receiver.

## Important implementation notes
1. The GitHub connection rejected branch creation with HTTP 403 (`Resource not accessible by integration`). No repository files were changed. These files are a local implementation bundle, not a live deployment.
2. Edit `admin-config.js` in the preview branch and replace the URL/key placeholders with the Supabase preview project URL and anon/publishable key. These two values are public client configuration; never put the service-role key in the browser.
3. The shared helper uses `process.env.SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_EMAIL`. The service-role key must be server-only and never exposed to client JavaScript.
4. Create the Supabase Storage bucket `website-media`. Keep the bucket public only if product/banner images are meant to be publicly viewable; otherwise use signed URLs.
5. For dynamic product/service/location/banner rendering, add `<script type="module" src="/public-content.js"></script>` immediately before `</body>` in `index.html` on the preview branch. Review its interaction with the existing carousel/lightbox scripts before merging. `enquiry.html` still needs its existing submit handler replaced with a mapped POST to `/api/submit-enquiry`; this bundle deliberately does not rewrite the live form automatically. Until those integration changes are reviewed and applied on the preview branch, the existing public site remains unchanged and admin edits will not all appear publicly.
6. `api/submit-enquiry.js` stores the enquiry in Supabase first. Google Sheets forwarding is optional; this starter marks the row pending on forwarding failure. A scheduled retry worker should be added before production release so temporary Google failures are retried automatically.
7. Before production, add request rate limiting, spam protection, audit logs, a reliable retry queue for Sheets, a security review, end-to-end tests and a backup/rollback plan. Test against a fresh Supabase preview project only.

## Preview environment variables
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `ADMIN_EMAIL` (one authorized admin email)
- `SUPABASE_STORAGE_BUCKET=website-media`
- `GOOGLE_SHEETS_WEBHOOK_URL` (optional)
- `GOOGLE_SHEETS_WEBHOOK_SECRET` (optional; must match Apps Script property)

## Safe rollout checklist
- [ ] Create and verify a branch from the latest `main` commit.
- [ ] Create a separate Supabase project for preview; run `supabase/schema.sql` there only.
- [ ] Create the one admin user in Supabase Auth and set `ADMIN_EMAIL` to that exact email.
- [ ] Add preview-only environment variables; never paste secrets into GitHub files or chat.
- [ ] Set `IE_SUPABASE_URL` and `IE_SUPABASE_ANON_KEY` for the browser login client using a public config mechanism.
- [ ] Integrate `/api/public-content` into `index.html` and `/api/submit-enquiry` into `enquiry.html`.
- [ ] Test admin CRUD, unauthenticated API denial, form validation, image uploads, and Google Sheets duplicate prevention.
- [ ] Obtain explicit user approval before any production merge/deployment.
