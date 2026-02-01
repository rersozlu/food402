// remote/src/auth/crypto.ts - AES-256-GCM encryption utilities

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Convert Uint8Array to base64
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

// Convert base64 to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Import encryption key from hex string
async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedData {
  ciphertext: string;  // Base64 encoded
  iv: string;          // Base64 encoded
}

/**
 * Encrypt a string using AES-256-GCM
 */
export async function encrypt(
  plaintext: string,
  encryptionKeyHex: string
): Promise<EncryptedData> {
  const key = await importKey(encryptionKeyHex);
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

/**
 * Decrypt a string using AES-256-GCM
 */
export async function decrypt(
  encrypted: EncryptedData,
  encryptionKeyHex: string
): Promise<string> {
  const key = await importKey(encryptionKeyHex);
  const ciphertext = base64ToBytes(encrypted.ciphertext);
  const iv = base64ToBytes(encrypted.iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate a secure random hex string
 */
export function generateRandomHex(bytes: number): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToHex(randomBytes);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash a string using SHA-256
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64(new Uint8Array(hash));
}

/**
 * Verify PKCE code_verifier against code_challenge
 */
export async function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
  method: "plain" | "S256"
): Promise<boolean> {
  if (method === "plain") {
    return codeVerifier === codeChallenge;
  }

  // S256 method
  const expectedChallenge = await sha256(codeVerifier);
  // Convert to URL-safe base64
  const urlSafe = expectedChallenge
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return urlSafe === codeChallenge;
}
