import { NextResponse } from 'next/server';
import { getSessionUser } from '../../../lib/session';
import { isSupabaseConfigured } from '../../../lib/supabaseAdmin';

export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, displayName: user.display_name || '' }
  });
}
