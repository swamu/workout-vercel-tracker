import { randomBytes } from 'node:crypto';
import { supabaseRest } from './supabaseAdmin';

export const SESSION_COOKIE = 'workout_session';
const SESSION_DAYS = 30;

function getExpiryIso() {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  return expires.toISOString();
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId) {
  const token = createSessionToken();
  const expiresAt = getExpiryIso();

  const response = await supabaseRest('app_sessions', {
    method: 'POST',
    body: [{ token, user_id: userId, expires_at: expiresAt }]
  });

  if (!response.ok) return null;
  return { token, expiresAt };
}

export async function getSessionUser(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sessionResponse = await supabaseRest(
    `app_sessions?select=token,user_id,expires_at&token=eq.${encodeURIComponent(token)}&limit=1`
  );
  if (!sessionResponse.ok) return null;

  const sessions = await sessionResponse.json();
  const session = sessions[0];
  if (!session) return null;

  const isExpired = new Date(session.expires_at).getTime() < Date.now();
  if (isExpired) {
    await supabaseRest(`app_sessions?token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE'
    });
    return null;
  }

  const userResponse = await supabaseRest(
    `app_users?select=id,email,display_name&id=eq.${encodeURIComponent(session.user_id)}&limit=1`
  );
  if (!userResponse.ok) return null;

  const users = await userResponse.json();
  return users[0] || null;
}
