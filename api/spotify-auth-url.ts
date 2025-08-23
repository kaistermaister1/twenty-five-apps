import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
	try {
		if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
		const clientId = process.env.SPOTIFY_CLIENT_ID || '';
		if (!clientId) { res.status(500).json({ error: 'Missing SPOTIFY_CLIENT_ID' }); return; }
		const { code_challenge, redirect_uri, scope } = req.body || {};
		if (!code_challenge || !redirect_uri) { res.status(400).json({ error: 'code_challenge and redirect_uri required' }); return; }
		const params = new URLSearchParams({
			client_id: clientId,
			response_type: 'code',
			redirect_uri,
			code_challenge_method: 'S256',
			code_challenge,
			scope: scope || 'user-read-email'
		});
		const url = 'https://accounts.spotify.com/authorize?' + params.toString();
		res.status(200).json({ url });
	} catch (e: any) {
		res.status(500).json({ error: e.message || 'Server error' });
	}
}


