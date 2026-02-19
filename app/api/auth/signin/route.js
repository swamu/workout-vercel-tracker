import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { createSession, SESSION_COOKIE } from '../../../lib/session';
import { isSupabaseConfigured, supabaseRest } from '../../../lib/supabaseAdmin';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  try {
    const { email, password } = await request.json();
    const safeEmail = normalizeEmail(email);
    const safePassword = String(password || '');

    if (!safeEmail || !safePassword) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const userResponse = await supabaseRest(
      `app_users?select=id,email,display_name,password_hash&email=eq.${encodeURIComponent(safeEmail)}&limit=1`
    );
    if (!userResponse.ok) {
      return NextResponse.json({ error: 'Failed to sign in' }, { status: 500 });
    }

    const users = await userResponse.json();
    const user = users[0];
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValidPassword = await compare(safePassword, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const session = await createSession(user.id);
    if (!session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.display_name || '' }
    });
    response.cookies.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
