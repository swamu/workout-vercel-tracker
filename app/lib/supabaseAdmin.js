const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extraHeaders
  };
}

export async function supabaseRest(path, options = {}) {
  const { method = 'GET', body, headers = {}, cache = 'no-store' } = options;

  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: getSupabaseHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
    cache
  });
}
