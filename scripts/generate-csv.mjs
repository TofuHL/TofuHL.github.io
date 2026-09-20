// Regenerates public/data/*.csv from src/data/*.json so downloadable chart
// data always matches the JSON that drives the on-page charts and tables.
// Runs automatically before every build (see package.json "prebuild").
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dataDir = path.join(root, 'src/data');
const outDir = path.join(root, 'public/data');
mkdirSync(outDir, { recursive: true });

function toCsv(rows) {
  return rows
    .map((row) => row.map((cell) => {
      const value = String(cell ?? '');
      return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(','))
    .join('\n');
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(dataDir, file), 'utf8'));
}

// 1. Cumulative funds raised over time
{
  const data = readJson('chart-funds-over-time.json');
  const rows = [['month', `cumulative_${data.currency}`], ...data.months.map((m) => [m.month, m.cumulative])];
  writeFileSync(path.join(outDir, 'funds-over-time.csv'), toCsv(rows));
}

// 2. Allocation of funds
{
  const data = readJson('chart-allocation.json');
  const rows = [['segment_key', 'percent'], ...data.segments.map((s) => [s.labelKey, s.percent])];
  writeFileSync(path.join(outDir, 'allocation.csv'), toCsv(rows));
}

// 3. Campaign progress
{
  const data = readJson('chart-campaign-progress.json');
  const rows = [
    ['campaign_key', `raised_${data.currency}`, `goal_${data.currency}`],
    ...data.campaigns.map((c) => [c.nameKey, c.raised, c.goal]),
  ];
  writeFileSync(path.join(outDir, 'campaign-progress.csv'), toCsv(rows));
}

// 4. Children reached by programme, by year
{
  const data = readJson('chart-children-reached.json');
  const header = ['year', ...data.programmes.map((p) => p.id)];
  const rows = [header, ...data.years.map((y) => [y.year, ...data.programmes.map((p) => y.values[p.id])])];
  writeFileSync(path.join(outDir, 'children-reached.csv'), toCsv(rows));
}

console.log('Generated CSV exports in public/data/');
