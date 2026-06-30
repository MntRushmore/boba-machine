import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

// All-zero key used ONLY in local dev so the app runs without configuring a real
// key. Never reachable in a production build.
const DEV_ENCRYPTION_KEY = '0'.repeat(64);

/**
 * The AES-256-GCM key for stored OAuth tokens. Resolves TOKEN_ENCRYPTION_KEY,
 * falling back to a fixed dev key in dev only. In production a missing/invalid
 * key throws LOUDLY at the call site instead of silently producing a 0-length
 * key that crashes mid-OAuth with a cryptic error.
 */
export function encryptionKey(): Buffer {
	const hex = env.TOKEN_ENCRYPTION_KEY || (dev ? DEV_ENCRYPTION_KEY : '');
	if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
		throw new Error(
			'TOKEN_ENCRYPTION_KEY must be a 64-char hex string (generate with: openssl rand -hex 32)'
		);
	}
	return Buffer.from(hex, 'hex');
}

export function encryptToken(plaintext: string, key: Buffer): { ct: string; iv: string; tag: string } {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		ct: ct.toString('base64'),
		iv: iv.toString('base64'),
		tag: tag.toString('base64')
	};
}

export function decryptToken(ct: string, iv: string, tag: string, key: Buffer): string {
	const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
	decipher.setAuthTag(Buffer.from(tag, 'base64'));
	return Buffer.concat([
		decipher.update(Buffer.from(ct, 'base64')),
		decipher.final()
	]).toString('utf8');
}

export function generateSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}
