import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE_NAME = 'workout_completions';

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabaseHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };
}

function mapRowsToCompletedDays(rows) {
  return rows.reduce((acc, row) => {
    acc[row.day_id] = Boolean(row.is_done);
    return acc;
  }, {});
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ enabled: false, completedDays: {} });
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE_NAME}?select=day_id,is_done`,
      { headers: getSupabaseHeaders(), cache: 'no-store' }
    );

    if (!response.ok) {
      return NextResponse.json(
        { enabled: false, completedDays: {} },
        { status: 200 }
      );
    }

    const rows = await response.json();
    return NextResponse.json({
      enabled: true,
      completedDays: mapRowsToCompletedDays(rows)
    });
  } catch {
    return NextResponse.json({ enabled: false, completedDays: {} });
  }
}

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ enabled: false }, { status: 200 });
  }

  try {
    const { dayId, isDone } = await request.json();
    if (!dayId) {
      return NextResponse.json(
        { error: 'dayId is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}`, {
      method: 'POST',
      headers: {
        ...getSupabaseHeaders(),
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify([{ day_id: dayId, is_done: Boolean(isDone) }])
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to save completion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, enabled: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
