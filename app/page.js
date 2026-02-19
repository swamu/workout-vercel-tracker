import { readFile } from 'node:fs/promises';
import path from 'node:path';
import WorkoutTrackerClient from './WorkoutTrackerClient';

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  fields.push(current.trim());
  return fields;
}

async function loadPlanFromCsv() {
  const csvPath = path.join(process.cwd(), 'app', 'Weeks1_12_2026.csv');
  const csv = await readFile(csvPath, 'utf8');
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const [headerLine, ...rows] = lines;
  const headers = parseCsvLine(headerLine).map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  const indexByHeader = Object.fromEntries(
    headers.map((header, index) => [header, index])
  );

  const getField = (fields, key, fallbackIndex) =>
    fields[indexByHeader[key] ?? fallbackIndex] || '';

  return rows.map((row) => {
    const fields = parseCsvLine(row);
    const date = getField(fields, 'date', 0);
    const day = getField(fields, 'day', 1);
    const mainWorkout = getField(fields, 'mainworkout', 2);
    const absFocus = getField(fields, 'absfocus', 3);
    const plankFocus = getField(fields, 'plankfocus', 4);
    const lowerBack = getField(fields, 'lowerback', 5);

    return {
      date,
      day,
      mainWorkout,
      absFocus,
      plankFocus,
      lowerBack
    };
  });
}

export default async function Home() {
  const plan = await loadPlanFromCsv();
  return <WorkoutTrackerClient plan={plan} />;
}
