export function load({ locals, url }) {
	return {
		user: locals.user,
		isLaunched: locals.isLaunched,
		needsAuth: url.searchParams.has('needs_auth'),
		locked: url.searchParams.has('locked')
	};
}
