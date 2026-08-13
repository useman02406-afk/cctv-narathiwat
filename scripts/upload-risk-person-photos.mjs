/*
 * Safe, one-off importer for the supplied warrant-person photo bundle.
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY = '<temporary service-role key>'
 *   node scripts/upload-risk-person-photos.mjs <extracted-zip-folder> --apply
 *
 * The key is deliberately read only from the process environment. Never put it
 * in this file, an HTML page, Git, or a browser console.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const [extractDir] = process.argv.slice(2);
const APPLY = process.argv.includes('--apply');
const prefix = 'warrant-import-20260813';
const url = process.env.SUPABASE_URL || 'https://rbahodbdbxfvftfxeipe.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!extractDir) throw new Error('Usage: node scripts/upload-risk-person-photos.mjs <extracted-zip-folder> [--apply]');
if (!key) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY temporarily before running this importer.');

const clean = value => String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const request = async (path, options = {}) => {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...options.headers }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
};

const htmlFile = (await readdir(extractDir)).find(name => name.toLowerCase().endsWith('.html'));
if (!htmlFile) throw new Error('No exported HTML file was found in the extracted bundle.');
const html = await readFile(join(extractDir, htmlFile), 'utf8');
const pairs = new Map();
for (const row of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
  const image = row[1].match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png))["']/i)?.[1];
  const nationalId = clean(row[1]).match(/(?<!\d)(\d{13})(?!\d)/)?.[1];
  if (image && nationalId) pairs.set(nationalId, image.replace(/^resources[\\/]/i, ''));
}

const records = await request('/rest/v1/risk_person_records?select=id,national_id,photo_path&limit=1000');
const byNationalId = new Map();
for (const record of records || []) {
  if (record.national_id && !byNationalId.has(record.national_id)) byNationalId.set(record.national_id, record);
}
const matched = [...pairs].map(([nationalId, file]) => ({ nationalId, file, record: byNationalId.get(nationalId) })).filter(job => job.record);
const unmatched = pairs.size - matched.length;
console.log(JSON.stringify({ sourcePhotos: pairs.size, databaseRecords: records?.length || 0, matched: matched.length, unmatched, mode: APPLY ? 'apply' : 'dry-run' }));
if (!APPLY) process.exit(0);
if (!matched.length) throw new Error('No source photos match a database record. Nothing was uploaded.');

const jobs = [...matched];
const results = { uploaded: 0, linked: 0, failed: [] };
const worker = async () => {
  while (jobs.length) {
    const job = jobs.shift();
    try {
      const extension = job.file.split('.').pop().toLowerCase() === 'png' ? 'png' : 'jpg';
      const objectPath = `${prefix}/${job.record.id}.${extension}`;
      const bytes = await readFile(join(extractDir, 'resources', job.file));
      await request(`/storage/v1/object/risk-person-media/${objectPath}`, {
        method: 'POST',
        headers: { 'Content-Type': extension === 'png' ? 'image/png' : 'image/jpeg', 'x-upsert': 'true' },
        body: bytes
      });
      results.uploaded += 1;
      await request(`/rest/v1/risk_person_records?id=eq.${encodeURIComponent(job.record.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ photo_path: objectPath })
      });
      results.linked += 1;
    } catch (error) {
      results.failed.push(String(error.message || error));
    }
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
console.log(JSON.stringify({ uploaded: results.uploaded, linked: results.linked, failed: results.failed.length }));
if (results.failed.length) {
  console.error(`First failure: ${results.failed[0]}`);
  process.exitCode = 2;
}
