import type { VercelRequest, VercelResponse } from '@vercel/node';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';

async function postForm(params: URLSearchParams) {
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: params
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error('Spotify token error ' + res.status + ': ' + text);
	}
	return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
	try {
		const clientId = process.env.SPOTIFY_CLIENT_ID || '';
		const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
		if (!clientId || !clientSecret) {
			res.status(500).json({ error: 'Missing SPOTIFY_CLIENT_ID/SECRET' });
			return;
		}

		if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
		const { grant_type } = req.body || {};
		if (grant_type === 'authorization_code') {
			const { code, redirect_uri, code_verifier } = req.body || {};
			const params = new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri,
				client_id: clientId,
				code_verifier
			});
			// Use basic auth when client secret available per Spotify guidance
			const res2 = await fetch(TOKEN_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
				},
				body: params
			});
			const data = await res2.json();
			if (!res2.ok) { res.status(res2.status).json(data); return; }
			res.status(200).json(data);
			return;
		}
		if (grant_type === 'refresh_token') {
			const { refresh_token } = req.body || {};
			const params = new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token,
				client_id: clientId
			});
			const res2 = await fetch(TOKEN_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
				},
				body: params
			});
			const data = await res2.json();
			if (!res2.ok) { res.status(res2.status).json(data); return; }
			res.status(200).json(data);
			return;
		}
		res.status(400).json({ error: 'Unsupported grant_type' });
	} catch (e: any) {
		res.status(500).json({ error: e.message || 'Server error' });
	}
}


