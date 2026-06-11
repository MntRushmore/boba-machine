import { db } from './db';
import { siteSettings } from './db/schema';
import { eq } from 'drizzle-orm';

export async function getLaunched(): Promise<boolean> {
	const [row] = await db
		.select()
		.from(siteSettings)
		.where(eq(siteSettings.key, 'launched'))
		.limit(1);
	return row?.value === 'true';
}

export async function setLaunched(value: boolean): Promise<void> {
	await db
		.insert(siteSettings)
		.values({ key: 'launched', value: String(value) })
		.onConflictDoUpdate({ target: siteSettings.key, set: { value: String(value) } });
}
