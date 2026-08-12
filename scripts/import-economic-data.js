/* Import Narathiwat economic-location CSV files into Supabase.
 * Usage: node scripts/import-economic-data.js --apply
 */
import fs from 'node:fs';
import path from 'node:path';

const API_URL = 'https://rbahodbdbxfvftfxeipe.supabase.co';
const API_KEY = 'sb_publishable_s0s17pRAf8q75VOjl5TtZQ_tB1gd8b4';
const APPLY = process.argv.includes('--apply');
const JSON_OUTPUT = process.argv.includes('--json');
const clean = value => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
const isLat = value => Number.isFinite(Number(value)) && Number(value) >= 5 && Number(value) <= 8;
const isLng = value => Number.isFinite(Number(value)) && Number(value) >= 99 && Number(value) <= 103;

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some(value => clean(value))) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some(value => clean(value))) rows.push(row);
  return rows;
}

function coordinateIndex(fields, start) {
  return fields.findIndex((value, index) => index >= start && isLat(clean(value)) && isLng(clean(fields[index + 1])));
}

function repairedRows(rawRows, start) {
  const result = []; let record = null;
  for (const rawRow of rawRows.slice(1)) {
    if (/^POINT\s*\(/i.test(clean(rawRow[0]))) {
      if (record && coordinateIndex(record, start) >= 0) result.push(record);
      record = rawRow.slice();
    } else if (record) record.push(...rawRow);
  }
  if (record && coordinateIndex(record, start) >= 0) result.push(record);
  return result;
}

function typeFor(sourceType, sourceFile = '') {
  const value = clean(sourceType);
  if (/^ATM$/i.test(value) || /ATM/i.test(sourceFile)) return 'ATM';
  if (value.includes('\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23')) return '\u0e18\u0e19\u0e32\u0e04\u0e32\u0e23';
  if (value.includes('\u0e23\u0e49\u0e32\u0e19\u0e17\u0e2d\u0e07')) return '\u0e23\u0e49\u0e32\u0e19\u0e17\u0e2d\u0e07';
  if (value.includes('\u0e23\u0e49\u0e32\u0e19\u0e2a\u0e30\u0e14\u0e27\u0e01\u0e0b\u0e37\u0e49\u0e2d')) return '\u0e23\u0e49\u0e32\u0e19\u0e2a\u0e30\u0e14\u0e27\u0e01\u0e0b\u0e37\u0e49\u0e2d';
  if (value.includes('\u0e2a\u0e16\u0e32\u0e19\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e19\u0e49\u0e33\u0e21\u0e31\u0e19')) return '\u0e2a\u0e16\u0e32\u0e19\u0e35\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23\u0e19\u0e49\u0e33\u0e21\u0e31\u0e19';
  if (value.includes('\u0e2b\u0e49\u0e32\u0e07')) return '\u0e2b\u0e49\u0e32\u0e07\u0e2a\u0e23\u0e23\u0e1e\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32';
  return value || '\u0e2d\u0e37\u0e48\u0e19 \u0e46';
}

function stationForMall(lat) {
  return Number(lat) < 6.2
    ? '\u0e2a\u0e20.\u0e2a\u0e38\u0e44\u0e2b\u0e07\u0e42\u0e01-\u0e25\u0e01'
    : '\u0e2a\u0e20.\u0e40\u0e21\u0e37\u0e2d\u0e07\u0e19\u0e23\u0e32\u0e18\u0e34\u0e27\u0e32\u0e2a';
}

function findSourceDir() {
  const desktop = 'C:/Users/Meang-21/Desktop';
  for (const folder of fs.readdirSync(desktop, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const appRoot = path.join(desktop, folder.name, 'CODEX (WEBAPP3)');
    if (!fs.existsSync(appRoot)) continue;
    for (const child of fs.readdirSync(appRoot, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const candidate = path.join(appRoot, child.name);
      const files = fs.readdirSync(candidate);
      if (files.filter(file => file.toLowerCase().endsWith('.csv')).length >= 5 && files.some(file => /atm/i.test(file))) return candidate;
    }
  }
  throw new Error('Economic CSV directory was not found');
}

function findCanonicalNarathiwatFile() {
  const desktop = 'C:/Users/Meang-21/Desktop';
  for (const folder of fs.readdirSync(desktop, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const appRoot = path.join(desktop, folder.name, 'CODEX (WEBAPP3)');
    if (!fs.existsSync(appRoot)) continue;
    const file = path.join(appRoot, 'พื้นที่เศรษฐกิจ จังหวัดนราธิวาส - สภ.เมืองนราธิวาส.csv');
    if (fs.existsSync(file)) return file;
  }
  throw new Error('Canonical Narathiwat economic CSV was not found');
}

function canonicalRows(file) {
  const parsed = parseCsv(fs.readFileSync(file, 'utf8'));
  const header = (parsed[0] || []).map(clean);
  const index = label => header.findIndex(value => value === label);
  const typeIndex = index('ประเภทสถานที่');
  const nameIndex = index('ชื่อสถานที่');
  const latIndex = index('lat');
  const lngIndex = index('lng');
  const coverageIndex = index('cctv');
  if ([typeIndex, nameIndex, latIndex, lngIndex].some(value => value < 0)) {
    throw new Error('Canonical Narathiwat CSV has an unexpected header');
  }
  return parsed.slice(1).map(fields => {
    const name = clean(fields[nameIndex]);
    const sourceType = clean(fields[typeIndex]);
    const lat = Number(clean(fields[latIndex]));
    const lng = Number(clean(fields[lngIndex]));
    if (!name || !isLat(lat) || !isLng(lng)) return null;
    const coverage = clean(fields[coverageIndex]);
    return {
      name,
      type: typeFor(sourceType, path.basename(file)),
      lat,
      lng,
      risk_level: 'not specified',
      details: [
        'station: สภ.เมืองนราธิวาส',
        `source type: ${sourceType}`,
        coverage ? `cctv coverage: ${coverage}` : '',
        `source file: ${path.basename(file)}`
      ].filter(Boolean).join('\n')
    };
  }).filter(Boolean);
}

function recordsFromFile(file) {
  const parsed = parseCsv(fs.readFileSync(file, 'utf8'));
  const header = parsed[0] || [];
  if (clean(header[0]) !== 'WKT') return [];
  const hasStation = header.length >= 10;
  const start = hasStation ? 4 : 3;
  const stationAt = 2;
  const typeAt = hasStation ? 3 : 2;
  return repairedRows(parsed, start).map(fields => {
    const at = coordinateIndex(fields, start);
    const lat = Number(clean(fields[at])); const lng = Number(clean(fields[at + 1]));
    const station = hasStation ? clean(fields[stationAt]) : stationForMall(lat);
    const name = clean(fields.slice(start, at).join(', '));
    const sourceType = clean(fields[typeAt]);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const tail = fields.slice(at + 2).map(clean).filter(Boolean);
    return {
      name, type: typeFor(sourceType, path.basename(file)), lat, lng, risk_level: 'not specified',
      details: [`station: ${station || 'unknown'}`, `source type: ${sourceType}`, ...tail.map((value, index) => `source ${index + 1}: ${value}`), `source file: ${path.basename(file)}`].join('\n')
    };
  }).filter(Boolean);
}

async function api(endpoint, options = {}) {
  const response = await fetch(`${API_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: { apikey: API_KEY, Authorization: `Bearer ${API_KEY}`, ...options.headers }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const keyOf = row => `${row.type}|${row.name}|${Number(row.lat).toFixed(7)}|${Number(row.lng).toFixed(7)}`;

async function main() {
  const sourceDir = findSourceDir();
  const sourceFiles = fs.readdirSync(sourceDir).filter(file => file.toLowerCase().endsWith('.csv')).map(file => path.join(sourceDir, file));
  const canonicalFile = findCanonicalNarathiwatFile();
  // The latest Narathiwat station file is authoritative.  Older source rows for
  // that station are deliberately skipped, while every other station stays intact.
  const legacyRows = sourceFiles.flatMap(recordsFromFile).filter(row => !/^สภ\.เมืองนราธิวาส$/.test(/^station:\s*(.+)$/m.exec(row.details)?.[1] || ''));
  const records = [...legacyRows, ...canonicalRows(canonicalFile)];
  const unique = [...new Map(records.map(row => [keyOf(row), row])).values()];
  const byType = Object.fromEntries([...new Set(unique.map(row => row.type))].sort().map(type => [type, unique.filter(row => row.type === type).length]));
  const byStation = unique.reduce((result, row) => {
    const station = /^station:\s*(.+)$/m.exec(row.details)?.[1] || 'unknown';
    result[station] = (result[station] || 0) + 1; return result;
  }, {});
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(unique));
    return;
  }
  console.log(JSON.stringify({ sourceFiles: sourceFiles.length + 1, canonicalFile: path.basename(canonicalFile), prepared: unique.length, byType, byStation }, null, 2));
  if (!APPLY) return;
  const existing = await api('economic_data?select=name,type,lat,lng');
  const existingKeys = new Set((existing || []).map(keyOf));
  const inserts = unique.filter(row => !existingKeys.has(keyOf(row)));
  console.log(`Existing ${existing.length}; inserting ${inserts.length}.`);
  for (let i = 0; i < inserts.length; i += 100) {
    await api('economic_data', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(inserts.slice(i, i + 100)) });
    console.log(`Imported ${Math.min(i + 100, inserts.length)}/${inserts.length}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
