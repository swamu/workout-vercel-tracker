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
  const csvPath = path.join(process.cwd(), 'app', 'Phase1_Weeks1_4_2026.csv');
  const csv = await readFile(csvPath, 'utf8');
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const [, ...rows] = lines;

  return rows.map((row) => {
    const [date, day, mainWorkout, plankFocus, absFocus] = parseCsvLine(row);
    return { date, day, mainWorkout, plankFocus, absFocus };
  });
}

export default async function Home() {
  const plan = await loadPlanFromCsv();
  return <WorkoutTrackerClient plan={plan} />;
}
