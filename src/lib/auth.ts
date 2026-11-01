export const EXPECTED_EMAIL = "its.zulkarnaen@gmail.com";
export const EXPECTED_HASH = "e15e8787370ac5899e0fd2717a520f89b4b773aaa2331ebc3ebbb2912356d87c";
export const AUTH_COOKIE_NAME = "ninetally_session";
const SALT = "ninetally_secure_salt_2026";
const SECRET_KEY = "ninetally_super_secret_jwt_key_2026";

/**
 * Hash password with SHA-256 + salt using universal Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify email and hashed password
 */
export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  if (email.trim().toLowerCase() !== EXPECTED_EMAIL.toLowerCase()) return false;
  const computedHash = await hashPassword(password);
  return computedHash === EXPECTED_HASH;
}

/**
 * Create HMAC-SHA256 signature
 */
async function signMessage(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const sigArray = Array.from(new Uint8Array(signature));
  return sigArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a signed session token valid for 30 days
 */
export async function createSessionToken(email: string): Promise<string> {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `${email.toLowerCase()}|${expiresAt}`;
  const sig = await signMessage(payload);
  const token = `${payload}|${sig}`;
  return btoa(token);
}

/**
 * Verify signed session token
 */
export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const parts = decoded.split("|");
    if (parts.length !== 3) return false;
    const [email, expiresAtStr, sig] = parts;
    const expiresAt = Number(expiresAtStr);
    if (!expiresAt || Date.now() > expiresAt) return false;
    if (email !== EXPECTED_EMAIL.toLowerCase()) return false;

    const payload = `${email}|${expiresAtStr}`;
    const expectedSig = await signMessage(payload);
    return sig === expectedSig;
  } catch {
    return false;
  }
}

