import { env } from '$env/dynamic/private';

export async function sendSlackDM(slackUserId: string, text: string): Promise<void> {
	if (!env.SLACK_BOT_TOKEN) return;

	await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ channel: slackUserId, text, mrkdwn: true })
	});
}

export async function inviteToChannel(slackUserId: string, channelId: string): Promise<void> {
	if (!env.SLACK_BOT_TOKEN) return;

	await fetch('https://slack.com/api/conversations.invite', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ channel: channelId, users: slackUserId })
	});
}

/**
 * Send a DM as a specific user (using a user token, xoxp-…) so the message
 * appears to come from that person's own account rather than the bot.
 * Opens (or reuses) the IM channel with the recipient, then posts the message.
 * Returns { ok, error, retryAfter } — retryAfter (seconds) is set on rate limits.
 */
export async function sendUserDM(
	token: string,
	slackUserId: string,
	text: string
): Promise<{ ok: boolean; error?: string; retryAfter?: number }> {
	const open = await fetch('https://slack.com/api/conversations.open', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ users: slackUserId })
	});
	if (open.status === 429) {
		return { ok: false, error: 'ratelimited', retryAfter: Number(open.headers.get('retry-after')) || 5 };
	}
	const openData = await open.json();
	if (!openData.ok) return { ok: false, error: openData.error || 'conversations.open failed' };

	const channel = openData.channel?.id;
	if (!channel) return { ok: false, error: 'no_im_channel' };

	const post = await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ channel, text, mrkdwn: true })
	});
	if (post.status === 429) {
		return { ok: false, error: 'ratelimited', retryAfter: Number(post.headers.get('retry-after')) || 5 };
	}
	const postData = await post.json();
	if (!postData.ok) return { ok: false, error: postData.error || 'chat.postMessage failed' };

	return { ok: true };
}
