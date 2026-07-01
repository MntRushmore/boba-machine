import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// The client is created LAZILY on first use — never at module import time.
// SvelteKit's build-time route analysis (`vite build`) imports server modules
// to inspect them, and the build sandbox has no DATABASE_URL and no reachable
// database. Connecting at import time made the build crash with "Invalid URL".
// Defer construction so import is side-effect-free and the connection only
// opens at runtime, when DATABASE_URL is actually set.
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getDb() {
	if (!_db) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
		const client = postgres(env.DATABASE_URL, { max: 5 });
		_db = drizzle(client, { schema });
	}
	return _db;
}

// A transparent proxy so existing `db.select()...` call sites are unchanged;
// the real client is materialized on the first property access at runtime.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_target, prop, receiver) {
		return Reflect.get(getDb(), prop, receiver);
	}
});
