const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
class RequestError extends Error { constructor(message: string, readonly status: number) { super(message); } }
function bytesToHex(bytes: Uint8Array): string { return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''); }
async function hmac(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}
async function verifyTelegramData(initData: string, botToken: string) {
  const fields = new URLSearchParams(initData);
  const providedHash = fields.get('hash');
  if (!providedHash || !/^[a-f0-9]{64}$/i.test(providedHash)) throw new RequestError('Missing Telegram signature', 401);
  const authDate = Number(fields.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || authDate > now + 30 || now - authDate > 3600) throw new RequestError('Telegram login expired. Close and reopen TopTap.', 401);
  const checkString = Array.from(fields.entries()).filter(([key]) => key !== 'hash' && key !== 'signature').sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => key + '=' + value).join(String.fromCharCode(10));
  const secret = await hmac(new TextEncoder().encode('WebAppData'), botToken);
  const expectedHash = bytesToHex(await hmac(secret, checkString));
  const expectedBytes = new TextEncoder().encode(expectedHash.toLowerCase());
  const actualBytes = new TextEncoder().encode(providedHash.toLowerCase());
  let mismatch = expectedBytes.length ^ actualBytes.length;
  for (let i = 0; i < Math.min(expectedBytes.length, actualBytes.length); i++) mismatch |= expectedBytes[i] ^ actualBytes[i];
  if (mismatch !== 0) throw new RequestError('Invalid Telegram signature', 401);
  const rawUser = fields.get('user');
  if (!rawUser) throw new RequestError('Telegram user details are missing', 401);
  const user = JSON.parse(rawUser);
  if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new RequestError('Invalid Telegram user', 401);
  return user;
}
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  try {
    const { initData, action, tapCount = 0 } = await request.json();
    if (typeof initData !== 'string' || initData.length > 8192) return json({ error: 'Invalid launch data.' }, 400);
    if (action !== 'state' && action !== 'tap') return json({ error: 'Unknown action.' }, 400);
    const count = action === 'state' ? 0 : tapCount;
    if (!Number.isInteger(count) || count < 0 || count > 20) return json({ error: 'Invalid tap count.' }, 400);
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    let serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      try { serviceRoleKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default; }
      catch { serviceRoleKey = undefined; }
    }
    if (!botToken || !supabaseUrl || !serviceRoleKey) return json({ error: 'TopTap is not fully configured yet.' }, 503);
    const user = await verifyTelegramData(initData, botToken);
    const databaseResponse = await fetch(supabaseUrl + '/rest/v1/rpc/toptap_award', {
      method: 'POST',
      headers: { apikey: serviceRoleKey, Authorization: 'Bearer ' + serviceRoleKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_telegram_id: String(user.id), p_username: typeof user.username === 'string' ? user.username : null, p_first_name: typeof user.first_name === 'string' ? user.first_name : null, p_last_name: typeof user.last_name === 'string' ? user.last_name : null, p_photo_url: typeof user.photo_url === 'string' ? user.photo_url : null, p_tap_count: count }),
    });
    if (!databaseResponse.ok) {
      console.error('TopTap database request failed', databaseResponse.status);
      return json({ error: 'Could not save your points. Please try again.' }, 503);
    }
    const [player] = await databaseResponse.json();
    return json({ player: { balance: player.balance, energy: player.energy, max_energy: player.max_energy }, taps_awarded: player.taps_awarded });
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    console.error('TopTap request failed', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'TopTap could not process that request. Please try again.' }, 500);
  }
});
