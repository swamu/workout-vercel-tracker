import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
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
    const { email, password, displayName } = await request.json();
    const safeEmail = normalizeEmail(email);
    const safePassword = String(password || '');
    const safeDisplayName = String(displayName || '').trim();

    if (!safeEmail || !safePassword) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (safePassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existingResponse = await supabaseRest(
      `app_users?select=id&email=eq.${encodeURIComponent(safeEmail)}&limit=1`
    );
    if (!existingResponse.ok) {
      return NextResponse.json(
        { error: 'Unable to check existing users' },
        { status: 500 }
      );
    }
    const existingUsers = await existingResponse.json();
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User already exists for this email' },
        { status: 409 }
      );
    }

    const passwordHash = await hash(safePassword, 10);
    const createUserResponse = await supabaseRest('app_users', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: [
        {
          email: safeEmail,
          password_hash: passwordHash,
          display_name: safeDisplayName
        }
      ]
    });

    if (!createUserResponse.ok) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const createdUsers = await createUserResponse.json();
    const user = createdUsers[0];
    if (!user) {
      return NextResponse.json({ error: 'User creation failed' }, { status: 500 });
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
