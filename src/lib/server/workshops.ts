import { db } from '$lib/server/db';
import { workshops, workshopMembers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * The workshop a user leads, if any. A user is a "workshop leader" iff they own
 * a row in `workshops`. Returns the workshop or null.
 */
export async function getLedWorkshop(userId: string) {
	const [row] = await db
		.select()
		.from(workshops)
		.where(eq(workshops.leaderId, userId))
		.limit(1);
	return row ?? null;
}

/**
 * The workshop a user is a member of, if any (membership is 1-per-user).
 */
export async function getMembership(userId: string) {
	const [row] = await db
		.select({
			workshopId: workshopMembers.workshopId,
			joinedAt: workshopMembers.joinedAt,
			workshopName: workshops.name,
			workshopStatus: workshops.status
		})
		.from(workshopMembers)
		.innerJoin(workshops, eq(workshopMembers.workshopId, workshops.id))
		.where(eq(workshopMembers.userId, userId))
		.limit(1);
	return row ?? null;
}

// Unambiguous join-code alphabet (no 0/O/1/I) so codes are easy to read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a unique workshop join code. `rand` lets callers inject randomness
 * (the workflow/runtime forbids Math.random in some contexts); defaults to
 * crypto in normal request handling.
 */
export async function generateJoinCode(length = 6): Promise<string> {
	for (let attempt = 0; attempt < 20; attempt++) {
		const bytes = crypto.getRandomValues(new Uint8Array(length));
		let code = '';
		for (let i = 0; i < length; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
		const [existing] = await db
			.select({ id: workshops.id })
			.from(workshops)
			.where(eq(workshops.joinCode, code))
			.limit(1);
		if (!existing) return code;
	}
	throw new Error('could not generate a unique join code');
}
