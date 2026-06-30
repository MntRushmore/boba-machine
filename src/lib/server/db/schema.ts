import { pgTable, serial, integer, text, boolean, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const task = pgTable('task', {
	id: serial('id').primaryKey(),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export const users = pgTable('users', {
	id: uuid('id')
		.primaryKey()
		.default(sql`gen_random_uuid()`),
	hcaId: text('hca_id').notNull().unique(),
	name: text('name'),
	nickname: text('nickname'),
	email: text('email'),
	emailVerified: boolean('email_verified'),
	slackId: text('slack_id'),
	slackAvatarUrl: text('slack_avatar_url'),
	slackDisplayName: text('slack_display_name'),
	verificationStatus: text('verification_status'),
	yswsEligible: boolean('ysws_eligible'),
	// Latest result from Hack Club Identity's /api/external/check, refreshed at login.
	yswsCheckResult: text('ysws_check_result'),
	birthday: text('birthday'),
	accessTokenCt: text('access_token_ct'),
	accessTokenIv: text('access_token_iv'),
	accessTokenTag: text('access_token_tag'),
	hackatimeUserId: text('hackatime_user_id'),
	hackatimeTokenCt: text('hackatime_token_ct'),
	hackatimeTokenIv: text('hackatime_token_iv'),
	hackatimeTokenTag: text('hackatime_token_tag'),
	// GitHub OAuth (Phase 4) — for pushing the user's site to a repo in their
	// own account + enabling Pages. Token encrypted (AES-256-GCM) like hackatime's.
	githubLogin: text('github_login'),
	githubTokenCt: text('github_token_ct'),
	githubTokenIv: text('github_token_iv'),
	githubTokenTag: text('github_token_tag'),
	streetAddress: text('street_address'),
	addressLine2: text('address_line_2'),
	locality: text('locality'),
	region: text('region'),
	postalCode: text('postal_code'),
	country: text('country'),
	keySfxEnabled: boolean('key_sfx_enabled').notNull().default(true),
	darkModeEnabled: boolean('dark_mode_enabled').notNull().default(false),
	// null = hasn't finished the onboarding flow yet; set once they complete it
	onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
	// null = hasn't claimed their one unverified-tier prize yet; set when they do.
	// Unverified users may claim exactly one prize (ever); verifying unlocks the full shop instead.
	prizeClaimedAt: timestamp('prize_claimed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const projects = pgTable('projects', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	screenshotUrl: text('screenshot_url'),
	repoUrl: text('repo_url'),
	// The published site, hosted on GitHub Pages (public repo). For Boba Drops this
	// is the deliverable; in the legacy onekey model it was a generic demo link.
	demoUrl: text('demo_url'),
	hackatimeProject: text('hackatime_project'),
	aiDeclaration: text('ai_declaration'),
	// Boba Drops track: 'individual' (US-only, cash to the teen) or 'workshop'
	// (worldwide, grant to the club leader). Set when the project is submitted.
	submissionType: text('submission_type'),
	// For workshop submissions, the workshop this project belongs to (Phase 3).
	// Nullable now; the workshops table + FK land with the leader system.
	workshopId: integer('workshop_id'),
	// Reviewer-set flag: project is under Fraud Squad investigation. Admin-only
	// toggle; surfaces a red tint + badge in the review queue and an internal-only
	// comment on the project timeline. Never exposed to the project's author.
	fraudCheck: boolean('fraud_check').notNull().default(false),
	// GitHub publishing (Phase 4). The repo we created/pushed in the user's
	// account and when it was last published. demoUrl holds the Pages URL.
	githubRepo: text('github_repo'), // "owner/repo"
	githubRepoUrl: text('github_repo_url'),
	publishedAt: timestamp('published_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

// The DB working copy of a site's files, edited in the in-browser Monaco editor.
// `path` is the repo-relative path (e.g. "index.html", "style.css"). On publish
// these are pushed to the user's GitHub repo. (path, projectId) is unique.
export const projectFiles = pgTable(
	'project_files',
	{
		id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
		projectId: integer('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		path: text('path').notNull(),
		content: text('content').notNull().default(''),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.default(sql`now()`)
	},
	(t) => [unique('project_files_project_path_unique').on(t.projectId, t.path)]
);

export const projectApprovals = pgTable('project_approvals', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	submittedById: uuid('submitted_by_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
	// Legacy onekey hours model — nullable now that Boba Drops approves a site
	// rather than crediting hours. Existing rows keep their values.
	submittedSeconds: integer('submitted_seconds'),
	approvedSeconds: integer('approved_seconds'),
	// Snapshot of the track this submission was made under.
	submissionType: text('submission_type'),
	status: text('status').notNull().default('pending'),
	// A workshop leader can endorse a member's submission (vouch it's complete);
	// this surfaces in the review queue. Endorsement does NOT approve — a Hack
	// Club reviewer still makes the call.
	endorsedAt: timestamp('endorsed_at', { withTimezone: true }),
	endorsedById: uuid('endorsed_by_id').references(() => users.id, { onDelete: 'set null' }),
	publicMessage: text('public_message'),
	internalNote: text('internal_note'),
	aiDeclaration: text('ai_declaration'),
	npsHeardAbout: text('nps_heard_about'),
	npsDoingWell: text('nps_doing_well'),
	npsImprove: text('nps_improve'),
	submittedAt: timestamp('submitted_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	reviewedAt: timestamp('reviewed_at', { withTimezone: true })
});

export const projectEvents = pgTable('project_events', {
	id: serial('id').primaryKey(),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	actorId: uuid('actor_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	action: text('action').notNull(), // 'submitted' | 'approved' | 'rejected' | 'comment' | 'fraud_check' | 'fraud_check_cleared'
	message: text('message'),
	internalNote: text('internal_note'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const projectExploreSnapshots = pgTable('project_explore_snapshots', {
	projectId: integer('project_id')
		.primaryKey()
		.references(() => projects.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	screenshotUrl: text('screenshot_url'),
	demoUrl: text('demo_url'),
	totalApprovedSeconds: integer('total_approved_seconds').notNull().default(0),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const shopCategories = pgTable('shop_categories', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const shopItems = pgTable('shop_items', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	categoryId: integer('category_id')
		.notNull()
		.references(() => shopCategories.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	priceSeconds: integer('price_seconds').notNull(),
	discountSeconds: integer('discount_seconds'), // null = no discount
	imageUrl: text('image_url'),
	stock: integer('stock').notNull().default(-1), // -1 = unlimited
	available: boolean('available').notNull().default(true),
	options: text('options').notNull().default('[]'), // JSON: Array<{label: string, choices: string[]}>
	imagePadding: integer('image_padding').notNull().default(0),
	fulfilledLocally: boolean('fulfilled_locally').notNull().default(false), // show "fulfilled locally" disclaimer in modal
	// true = hidden from the normal shop; only offered as one of the unverified-tier claimable prizes
	unverifiedPrize: boolean('unverified_prize').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const shopOrders = pgTable('shop_orders', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	itemId: integer('item_id')
		.notNull()
		.references(() => shopItems.id, { onDelete: 'restrict' }),
	priceSeconds: integer('price_seconds').notNull(),
	status: text('status').notNull().default('ordered'), // ordered | packed | shipped | delivered | refunded
	selectedOptions: text('selected_options').notNull().default('{}'), // JSON: Record<string, string>
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const siteSettings = pgTable('site_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export const balanceAdjustments = pgTable('balance_adjustments', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	adminId: uuid('admin_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	seconds: integer('seconds').notNull(),
	message: text('message').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const approvedSubmissions = pgTable('approved_submissions', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	approvalId: integer('approval_id')
		.notNull()
		.unique()
		.references(() => projectApprovals.id, { onDelete: 'cascade' }),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

	// author identity snapshot
	authorName: text('author_name'),
	authorHcaId: text('author_hca_id'),
	authorEmail: text('author_email'),

	// author address snapshot at approval time
	authorStreetAddress: text('author_street_address'),
	authorAddressLine2: text('author_address_line_2'),
	authorLocality: text('author_locality'),
	authorRegion: text('author_region'),
	authorPostalCode: text('author_postal_code'),
	authorCountry: text('author_country'),

	// project state snapshot at approval time
	projectName: text('project_name').notNull(),
	projectDescription: text('project_description'),
	projectRepoUrl: text('project_repo_url'),
	projectDemoUrl: text('project_demo_url'),
	projectScreenshotUrl: text('project_screenshot_url'),
	projectAiDeclaration: text('project_ai_declaration'),
	hackatimeProject: text('hackatime_project'),

	// author birthday snapshot
	authorBirthday: text('author_birthday'),

	// approval data
	submittedSeconds: integer('submitted_seconds').notNull(),
	approvedSeconds: integer('approved_seconds').notNull(),
	publicMessage: text('public_message'),
	internalNote: text('internal_note'),

	// NPS feedback collected at submission time
	npsHeardAbout: text('nps_heard_about'),
	npsDoingWell: text('nps_doing_well'),
	npsImprove: text('nps_improve'),

	submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
	approvedAt: timestamp('approved_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

// One row per approved submission: the $5 Boba Drops grant and its fulfillment
// state. payoutTarget records who the money goes to — the teen (individual,
// US-only, mailed cash) or the club leader (workshop, worldwide). Admins mark a
// grant 'sent' once it's been paid out; there's no payment API yet.
export const grants = pgTable('grants', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	approvalId: integer('approval_id')
		.notNull()
		.unique()
		.references(() => projectApprovals.id, { onDelete: 'cascade' }),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
	// 'individual' | 'workshop'
	submissionType: text('submission_type').notNull(),
	// 'teen' | 'leader' — who receives the payout
	payoutTarget: text('payout_target').notNull(),
	// Workshop this grant belongs to, if any (Phase 3).
	workshopId: integer('workshop_id'),
	amountCents: integer('amount_cents').notNull().default(500),
	currency: text('currency').notNull().default('USD'),
	// 'pending' | 'sent' | 'void'
	status: text('status').notNull().default('pending'),
	// recipient snapshot at approval time
	recipientName: text('recipient_name'),
	recipientEmail: text('recipient_email'),
	recipientCountry: text('recipient_country'),
	sentById: uuid('sent_by_id').references(() => users.id, { onDelete: 'set null' }),
	sentAt: timestamp('sent_at', { withTimezone: true }),
	note: text('note'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

export const reviewers = pgTable('reviewers', {
	id: uuid('id').primaryKey().defaultRandom(),
	hcaId: text('hca_id').notNull().unique(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

// A Boba Drops workshop run by a club leader. Created when an admin approves a
// workshop application. Members join with `joinCode`; their approved sites
// route the $5 grant to the leader.
export const workshops = pgTable('workshops', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	leaderId: uuid('leader_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	// School / club / location context, shown to admins and on the roster.
	organization: text('organization'),
	// Short, shareable, case-insensitive join code (stored uppercase). Unique.
	joinCode: text('join_code').notNull().unique(),
	// 'active' | 'closed'
	status: text('status').notNull().default('active'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

// Membership: a builder belongs to at most one workshop (enforced by the unique
// userId). Joining attaches them so their submissions default to the workshop track.
export const workshopMembers = pgTable('workshop_members', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	workshopId: integer('workshop_id')
		.notNull()
		.references(() => workshops.id, { onDelete: 'cascade' }),
	userId: uuid('user_id')
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: 'cascade' }),
	joinedAt: timestamp('joined_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});

// Application to run a workshop. Submitted in-app; an admin approves (which
// creates the workshop + makes the applicant a leader) or rejects.
export const workshopApplications = pgTable('workshop_applications', {
	id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
	applicantId: uuid('applicant_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	workshopName: text('workshop_name').notNull(),
	organization: text('organization'),
	// Where/when they plan to run it, expected size, etc. — free text for the admin.
	details: text('details'),
	// 'pending' | 'approved' | 'rejected'
	status: text('status').notNull().default('pending'),
	reviewerNote: text('reviewer_note'),
	// The workshop created on approval (null until approved).
	workshopId: integer('workshop_id').references(() => workshops.id, { onDelete: 'set null' }),
	decidedById: uuid('decided_by_id').references(() => users.id, { onDelete: 'set null' }),
	decidedAt: timestamp('decided_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.default(sql`now()`)
});
