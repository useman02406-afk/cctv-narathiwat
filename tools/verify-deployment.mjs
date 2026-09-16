const site = process.env.CCTV_SITE_URL || 'https://useman02406-afk.github.io/cctv-narathiwat/outputs';
const supabase = 'https://rbahodbdbxfvftfxeipe.supabase.co';
const publishableKey = 'sb_publishable_s0s17pRAf8q75VOjl5TtZQ_tB1gd8b4';
const pages = [
  'login.html', 'home.html', 'camera-center.html', 'camera-locations-map.html',
  'investigations.html', 'critical-infrastructure.html', 'risk-areas.html',
  'risk-persons.html', 'vehicle-alerts.html', 'vehicle-sightings.html',
  'mission-planner.html', 'home-search.html', 'reports.html', 'auth-guard.js?v=14'
];
const expectedContent = new Map([
  ['login.html', "location.replace('home.html')"],
  ['auth-guard.js?v=14', 'runtime-health.js?v=1'],
  ['camera-locations-map.html', 'const markerLimit=visible.length'],
  ['home-search.html', 'loadMapOverview']
]);

const failures = [];
const timeout = ms => AbortSignal.timeout(ms);

for (const page of pages) {
  try {
    const response = await fetch(`${site}/${page}`, { signal: timeout(20_000), redirect: 'follow' });
    const body = await response.text();
    if (!response.ok) failures.push(`${page}: HTTP ${response.status}`);
    if (body.length < 100) failures.push(`${page}: response is unexpectedly small`);
    if (/404: File not found|There isn't a GitHub Pages site here/i.test(body)) failures.push(`${page}: GitHub Pages error body`);
    const expected = expectedContent.get(page);
    if (expected && !body.includes(expected)) failures.push(`${page}: expected release marker is missing`);
  } catch (error) {
    failures.push(`${page}: ${error.message}`);
  }
}

const headers = { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` };
try {
  const auth = await fetch(`${supabase}/auth/v1/settings`, { headers, signal: timeout(20_000) });
  if (!auth.ok) failures.push(`Supabase Auth settings: HTTP ${auth.status}`);
} catch (error) {
  failures.push(`Supabase Auth settings: ${error.message}`);
}

const protectedTables = [
  'profiles', 'cctv_locations', 'incidents', 'risk_person_records',
  'vehicle_alerts', 'vehicle_sightings', 'home_search_records',
  'economic_data', 'risk_areas', 'case_timeline_entries',
  'camera_inspections', 'camera_maintenance_tickets'
];
for (const table of protectedTables) {
  try {
    const response = await fetch(`${supabase}/rest/v1/${table}?select=id&limit=1`, { headers, signal: timeout(20_000) });
    const body = await response.text();
    const explicitlyDenied = response.status === 401 || response.status === 403;
    if (!response.ok && !explicitlyDenied) failures.push(`${table} anonymous probe: HTTP ${response.status}`);
    else if (response.ok && body !== '[]') failures.push(`${table} anonymous probe exposed data`);
  } catch (error) {
    failures.push(`${table} anonymous probe: ${error.message}`);
  }
}

if (failures.length) {
  console.error('DEPLOYMENT CHECK FAILED');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS: ${pages.length} deployed resources, Supabase Auth, and ${protectedTables.length} anonymous RLS probes.`);
