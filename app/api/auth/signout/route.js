import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../../lib/session';
import { isSupabaseConfigured, supabaseRest } from '../../../lib/supabaseAdmin';

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await supabaseRest(`app_sessions?token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE'
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  });
  return response;
}
