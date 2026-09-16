# CCTV Narathiwat production readiness

## Automated gates

- `tools/verify-static-pages.ps1` validates all required modules, UTF-8, local asset links, external and inline JavaScript syntax, legacy routing, and runtime monitoring.
- `tools/verify-deployment.mjs` verifies deployed pages, Supabase Auth availability, and that anonymous users cannot read `profiles` or `cctv_locations`.
- `.github/workflows/quality.yml` runs static checks on every push and pull request, then checks the deployed system after pushes and once daily.

## Release checklist

1. Confirm both GitHub Actions workflows pass.
2. Sign in with ADMIN, OFFICER, and VIEWER test accounts.
3. For each writable module, create a clearly labelled test record, edit it, then delete it.
4. Confirm VIEWER cannot create, update, delete, upload, or call protected database functions.
5. Confirm ADMIN can approve/suspend accounts and read the audit timeline.
6. Confirm maps load on desktop and the lowest-spec operational mobile device.
7. Export one CSV and one PDF report and compare totals with the dashboard.
8. Confirm the latest Supabase backup and perform a restore drill in a non-production project.

## Role acceptance matrix

| Capability | ADMIN | OFFICER | VIEWER |
|---|---:|---:|---:|
| Read operational data | Yes | Yes | Yes |
| Create/update operational records | Yes | Yes | No |
| Delete operational records | Yes | According to module policy | No |
| Manage accounts and marker categories | Yes | No | No |
| View system audit timeline | Yes | No | No |

## Incident response

1. Record the time, affected module, user role, and browser.
2. Check the `Production quality checks` workflow and GitHub Pages deployment.
3. Check Supabase Auth, database, Storage, and recent audit records.
4. If data integrity is at risk, suspend writes through Supabase policy before changing the frontend.
5. Restore from the last verified backup only after preserving audit evidence.
