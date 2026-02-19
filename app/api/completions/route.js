import { NextResponse } from 'next/server';
import { getSessionUser } from '../../lib/session';
import { isSupabaseConfigured, supabaseRest } from '../../lib/supabaseAdmin';
const TABLE_NAME = 'workout_completions';
const LEGACY_DAY_ID_SEPARATOR = '::';

function mapRowsToCompletedDays(rows, userId) {
  const prefix = `${userId}${LEGACY_DAY_ID_SEPARATOR}`;

  return rows.reduce((acc, row) => {
    const dayId = String(row.day_id || '');
    if (!dayId) return acc;

    if (dayId.startsWith(prefix)) {
      acc[dayId.slice(prefix.length)] = Boolean(row.is_done);
      return acc;
    }

    if (!dayId.includes(LEGACY_DAY_ID_SEPARATOR)) {
      acc[dayId] = Boolean(row.is_done);
    }

    return acc;
  }, {});
}

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await supabaseRest(
      `${TABLE_NAME}?select=day_id,is_done&user_id=eq.${encodeURIComponent(user.id)}`,
      { cache: 'no-store' }
    );

    if (response.ok) {
      const rows = await response.json();
      return NextResponse.json({
        completedDays: mapRowsToCompletedDays(rows, user.id)
      });
    }

    // Backward compatibility: old table may not have user_id column.
    const legacyResponse = await supabaseRest(
      `${TABLE_NAME}?select=day_id,is_done&day_id=like.${encodeURIComponent(`${user.id}${LEGACY_DAY_ID_SEPARATOR}%`)}`,
      { cache: 'no-store' }
    );

    if (!legacyResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch completions' },
        { status: 500 }
      );
    }

    const legacyRows = await legacyResponse.json();
    return NextResponse.json({
      completedDays: mapRowsToCompletedDays(legacyRows, user.id)
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch completions' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { dayId, isDone } = await request.json();
    if (!dayId) {
      return NextResponse.json(
        { error: 'dayId is required' },
        { status: 400 }
      );
    }

    const response = await supabaseRest(TABLE_NAME, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates'
      },
      body: [{ user_id: user.id, day_id: dayId, is_done: Boolean(isDone) }]
    });

    if (response.ok) {
      return NextResponse.json({ ok: true });
    }

    // Backward compatibility: old table without user_id column.
    const legacyResponse = await supabaseRest(TABLE_NAME, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates'
      },
      body: [
        {
          day_id: `${user.id}${LEGACY_DAY_ID_SEPARATOR}${dayId}`,
          is_done: Boolean(isDone)
        }
      ]
    });

    if (!legacyResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to save completion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
