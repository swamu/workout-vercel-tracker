import { NextResponse } from 'next/server';
import { getSessionUser } from '../../lib/session';
import { isSupabaseConfigured, supabaseRest } from '../../lib/supabaseAdmin';

const TABLE_NAME = 'weekly_measurements';

const MEASUREMENT_KEYS = [
  'weight',
  'neck',
  'shoulders',
  'chestBust',
  'upperArmBiceps',
  'forearm',
  'midsection',
  'waist',
  'abdomen',
  'hips',
  'thighTop',
  'midThigh',
  'knee',
  'calf',
  'ankle'
];

function mapRows(rows) {
  return rows.reduce((acc, row) => {
    acc[row.week_index] = {
      weight: row.weight || '',
      neck: row.neck || '',
      shoulders: row.shoulders || '',
      chestBust: row.chest_bust || '',
      upperArmBiceps: row.upper_arm_biceps || '',
      forearm: row.forearm || '',
      midsection: row.midsection || '',
      waist: row.waist || '',
      abdomen: row.abdomen || '',
      hips: row.hips || '',
      thighTop: row.thigh_top || '',
      midThigh: row.mid_thigh || '',
      knee: row.knee || '',
      calf: row.calf || '',
      ankle: row.ankle || ''
    };
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

  const response = await supabaseRest(
    `${TABLE_NAME}?select=*&user_id=eq.${encodeURIComponent(user.id)}`
  );
  if (!response.ok) {
    return NextResponse.json(
      { error: 'Failed to fetch measurements' },
      { status: 500 }
    );
  }

  const rows = await response.json();
  return NextResponse.json({ measurementsByWeek: mapRows(rows) });
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
    const { weekIndex, metrics } = await request.json();
    const safeWeekIndex = Number(weekIndex);
    if (!Number.isInteger(safeWeekIndex) || safeWeekIndex < 1) {
      return NextResponse.json({ error: 'Invalid week index' }, { status: 400 });
    }

    const safeMetrics = metrics || {};
    const payload = {
      user_id: user.id,
      week_index: safeWeekIndex,
      weight: String(safeMetrics.weight || '').trim(),
      neck: String(safeMetrics.neck || '').trim(),
      shoulders: String(safeMetrics.shoulders || '').trim(),
      chest_bust: String(safeMetrics.chestBust || '').trim(),
      upper_arm_biceps: String(safeMetrics.upperArmBiceps || '').trim(),
      forearm: String(safeMetrics.forearm || '').trim(),
      midsection: String(safeMetrics.midsection || '').trim(),
      waist: String(safeMetrics.waist || '').trim(),
      abdomen: String(safeMetrics.abdomen || '').trim(),
      hips: String(safeMetrics.hips || '').trim(),
      thigh_top: String(safeMetrics.thighTop || '').trim(),
      mid_thigh: String(safeMetrics.midThigh || '').trim(),
      knee: String(safeMetrics.knee || '').trim(),
      calf: String(safeMetrics.calf || '').trim(),
      ankle: String(safeMetrics.ankle || '').trim()
    };

    for (const key of MEASUREMENT_KEYS) {
      if (safeMetrics[key] != null && typeof safeMetrics[key] !== 'string') {
        return NextResponse.json(
          { error: `Invalid measurement value for ${key}` },
          { status: 400 }
        );
      }
    }

    const response = await supabaseRest(TABLE_NAME, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: [payload]
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to save measurements' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
