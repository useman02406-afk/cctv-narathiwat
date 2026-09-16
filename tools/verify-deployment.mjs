const site = (process.argv[2] || process.env.CCTV_SITE_URL || 'https://useman02406-afk.github.io/cctv-narathiwat/outputs').replace(/\/$/, '');
const supabase = 'https://rbahodbdbxfvftfxeipe.supabase.co';
const publishableKey = 'sb_publishable_s0s17pRAf8q75VOjl5TtZQ_tB1gd8b4';
const pages = [
  'login.html', 'home.html', 'camera-center.html', 'camera-categories.html', 'camera-locations-map.html',
  'station-overview.html',
  'investigations.html', 'critical-infrastructure.html', 'risk-areas.html',
  'risk-persons.html', 'vehicle-alerts.html', 'vehicle-sightings.html',
  'mission-planner.html', 'home-search.html', 'case-timeline.html', 'reports.html',
  'module-navigation.css?v=1', 'module-navigation.js?v=1',
  'global-module-menu.css?v=2', 'global-module-menu.js?v=2',
  'auth-guard.js?v=17', 'smart-alert.js?v=3', 'runtime-health.js?v=1'
];
const expectedContent = new Map([
  ['login.html', ["location.replace('home.html')"]],
  ['home.html', ['แผนที่สถานการณ์กลาง', 'command-map-frame', 'camera-locations-map.html?v=20260916-command-home', 'สืบสวนและภารกิจ']],
  ['camera-center.html', ['data-admin-only', 'enforceAdminTabs']],
  ['camera-categories.html', ["if(!admin())", "location.replace(target)"]],
  ['reports.html', ['dateFrom', 'reportData', "risk:'risk-areas.html'", "vehicle:'vehicle-alerts.html'"]],
  ['auth-guard.js?v=17', ['global-module-menu.js?v=2', '30 * 60 * 1000', 'login.html?error=idle', '!profile.active', 'hideMutationControls']],
  ['global-module-menu.js?v=2', ["['ศูนย์รายงาน','reports.html'"]],
  ['module-navigation.js?v=1', ["['ไทม์ไลน์สืบสวน','fa-timeline','case-timeline.html'"]],
  ['camera-locations-map.html', ['const markerLimit=visible.length']],
  ['home-search.html', ['loadMapOverview']]
]);

const failures = [];
const timeout = ms => AbortSignal.timeout(ms);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchReleaseResource(page) {
  let lastResponse;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    lastResponse = await fetch(`${site}/${page}`, {
      signal: timeout(20_000),
      redirect: 'follow',
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' }
    });
    const body = await lastResponse.text();
    const expected = expectedContent.get(page) || [];
    if (lastResponse.ok && body.length >= 100 && expected.every(marker => body.includes(marker))) return { response: lastResponse, body };
    if (attempt < 3) await wait(5_000 * attempt);
    else return { response: lastResponse, body };
  }
}

for (const page of pages) {
  try {
    const { response, body } = await fetchReleaseResource(page);
    if (!response.ok) failures.push(`${page}: HTTP ${response.status}`);
    if (body.length < 100) failures.push(`${page}: response is unexpectedly small`);
    if (/404: File not found|There isn't a GitHub Pages site here/i.test(body)) failures.push(`${page}: GitHub Pages error body`);
    const expected = expectedContent.get(page) || [];
    expected.filter(marker => !body.includes(marker)).forEach(marker => failures.push(`${page}: expected release marker is missing (${marker})`));
  } catch (error) {
    failures.push(`${page}: ${error.message}`);
  }
}

try {
  const home = await fetch(`${site}/home.html`, { signal: timeout(20_000), cache: 'no-store' }).then(response => response.text());
  const requiredModules = [
    'home.html', 'station-overview.html', 'camera-center.html', 'investigations.html',
    'critical-infrastructure.html', 'risk-areas.html', 'risk-persons.html',
    'vehicle-alerts.html', 'mission-planner.html', 'home-search.html',
    'case-timeline.html', 'reports.html'
  ];
  requiredModules.forEach(module => {
    if (!home.includes(`href="${module}"`)) failures.push(`home.html: missing primary module link ${module}`);
  });
  ['module-switcher', 'moduleTabs', 'moduleDetailTitle', 'module-navigation.js'].forEach(retired => {
    if (home.includes(retired)) failures.push(`home.html: duplicate module switcher remains (${retired})`);
  });
  if (!home.includes('auth-guard.js?v=17')) failures.push('home.html: stale auth guard cache version');
  if (home.includes('CCTV POLICE9')) failures.push('home.html: legacy product name remains');
} catch (error) {
  failures.push(`home release contract: ${error.message}`);
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

console.log(`PASS: ${pages.length} deployed resources, 12-module release contract, Supabase Auth, and ${protectedTables.length} anonymous RLS probes.`);
