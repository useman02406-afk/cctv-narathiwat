# Vehicle alert import

1. Run `supabase/migrations/20260814120000_add_vehicle_alert_import_fields.sql` in the Supabase SQL Editor.
2. From the repository folder, run a dry check first (replace the two placeholder paths):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-vehicle-alert-import.ps1 `
  -XlsxPath "<path-to-vehicle-alert-xlsx>" `
  -PptxPath "<path-to-vehicle-alert-pptx>"
```

3. If the summary is correct, run the same command with `-Apply`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-vehicle-alert-import.ps1 `
  -XlsxPath "<path-to-vehicle-alert-xlsx>" `
  -PptxPath "<path-to-vehicle-alert-pptx>" `
  -Apply
```

After pressing Enter, paste the current Supabase `service_role` key only into the hidden prompt. It is used only for that process and is never written to source files or Git.

The importer keeps every spreadsheet row by using its original row sequence as `source_record_key`. It attaches only PowerPoint images whose slide text can be matched to a vehicle plate.
