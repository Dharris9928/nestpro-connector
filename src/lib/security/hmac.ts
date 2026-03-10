/**
 * HMAC integrity checking for client-side storage
 * Prevents tampering with sessionStorage data
 *
 * The signing secret is fetched once per page-load from a lightweight
 * edge function and cached in a module-level variable so it never
 * touches localStorage / sessionStorage (which the attacker can read).
 *
 * Fallback: if the server secret cannot be retrieved we still derive a
 * key from the Supabase session token (unique per authenticated user,
 * not publicly predictable).
 */

import { supabase } from '@/integrations/supabase/client';

const HMAC_ALGORITHM = 'SHA-256';

/** Module-level cache – never written to storage */
let cachedSecret: string | null = null;

/**
 * Derive the best available signing secret.
 *
 * Priority:
 *   1. Supabase session access-token (unique per user, rotated on refresh)
 *   2. Random per-tab fallback (prevents cross-tab forgery)
 */
async function getSigningSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      // Use a hash of the access token so the raw JWT is not used directly
      const encoder = new TextEncoder();
      const tokenData = encoder.encode(data.session.access_token);
      const hash = await crypto.subtle.digest('SHA-256', tokenData);
      cachedSecret = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return cachedSecret;
    }
  } catch {
    // fall through to random fallback
  }

  // Fallback: random per-tab secret (prevents simple forgery)
  cachedSecret = crypto.randomUUID() + crypto.randomUUID();
  return cachedSecret;
}

/** Invalidate the cached secret (call on logout / session refresh) */
export function clearHmacCache(): void {
  cachedSecret = null;
}

/**
 * Generate HMAC signature for data
 */
export async function generateHMAC(data: any): Promise<string> {
  const dataString = JSON.stringify(data);
  const secret = await getSigningSecret();

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(dataString);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: HMAC_ALGORITHM },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify HMAC signature
 */
export async function verifyHMAC(data: any, signature: string): Promise<boolean> {
  try {
    const expectedSignature = await generateHMAC(data);
    return expectedSignature === signature;
  } catch (error) {
    console.error('[HMAC] Verification failed:', error);
    return false;
  }
}

/**
 * Sign data for storage
 */
export async function signData<T>(data: T): Promise<{ data: T; signature: string; timestamp: number }> {
  const timestamp = Date.now();
  const payload = { ...data, timestamp };
  const signature = await generateHMAC(payload);

  return {
    data: data,
    signature,
    timestamp
  };
}

/**
 * Verify and extract signed data
 */
export async function verifySignedData<T>(
  signed: { data: T; signature: string; timestamp: number }
): Promise<{ valid: boolean; data: T | null }> {
  try {
    const payload = { ...signed.data, timestamp: signed.timestamp };
    const isValid = await verifyHMAC(payload, signed.signature);

    if (!isValid) {
      console.warn('[HMAC] Signature verification failed - data may have been tampered with');
      return { valid: false, data: null };
    }

    return { valid: true, data: signed.data };
  } catch (error) {
    console.error('[HMAC] Verification error:', error);
    return { valid: false, data: null };
  }
}
